import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import Google from "next-auth/providers/google";
import bcrypt from "bcryptjs";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { akunMasihAktif, type PenggunaAkses } from "@/lib/akses";

const loginSchema = z.object({
  username: z.string().trim().min(1),
  password: z.string().min(1),
});

const providers = [
  Credentials({
    name: "Akun Kampus",
    credentials: {
      username: { label: "Username", type: "text" },
      password: { label: "Kata sandi", type: "password" },
    },
    async authorize(credentials) {
      const parsed = loginSchema.safeParse(credentials);
      if (!parsed.success) return null;

      const identifier = parsed.data.username.trim().toLowerCase();
      const user = await prisma.pengguna.findFirst({
        where: {
          OR: [{ username: identifier }, { email: identifier }],
        },
      });
      if (!user || !user.passwordHash) return null;
      if (!akunMasihAktif(user)) return null;

      const valid = await bcrypt.compare(parsed.data.password, user.passwordHash);
      if (!valid) return null;

      return {
        id: user.id,
        name: user.nama,
        email: user.email,
      };
    },
  }),
  ...(process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET
    ? [
        Google({
          clientId: process.env.GOOGLE_CLIENT_ID,
          clientSecret: process.env.GOOGLE_CLIENT_SECRET,
        }),
      ]
    : []),
];

export const { handlers, auth, signIn, signOut } = NextAuth({
  session: {
    strategy: "jwt",
  },
  pages: {
    signIn: "/masuk",
  },
  cookies: {
    sessionToken: {
      options: {
        httpOnly: true,
        sameSite: "lax",
        path: "/",
        secure: process.env.NODE_ENV === "production",
      },
    },
  },
  providers,
  callbacks: {
    async signIn({ user, account }) {
      if (account?.provider === "google") {
        const email = user.email?.trim().toLowerCase();
        if (!email) return false;
        const allowedDomain = process.env.ALLOWED_GOOGLE_DOMAIN;
        if (allowedDomain && !email.endsWith(`@${allowedDomain}`)) {
          return false;
        }
        const existing = await prisma.pengguna.findUnique({ where: { email } });
        if (!existing || !akunMasihAktif(existing)) return false;
        user.id = existing.id;
      }
      return true;
    },
    async jwt({ token, user }) {
      if (user?.id) {
        token.sub = user.id;
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user && token.sub) {
        session.user.id = token.sub;
      }
      return session;
    },
  },
});

export interface CurrentUser extends PenggunaAkses {
  nama: string;
  email: string;
}

/**
 * Mengambil pengguna aktif dari database di setiap permintaan server (F1).
 * Menjamin perubahan peran, penonaktifan akun, dan kedaluwarsa Special Guest
 * langsung berlaku pada permintaan berikutnya tanpa login ulang.
 */
export async function getCurrentUser(): Promise<CurrentUser | null> {
  const session = await auth();
  const userId = session?.user?.id;
  if (!userId) return null;

  const user = await prisma.pengguna.findUnique({
    where: { id: userId },
    select: {
      id: true,
      nama: true,
      email: true,
      peran: true,
      jenis: true,
      aktif: true,
      tanggalBerakhir: true,
    },
  });

  if (!user || !akunMasihAktif(user)) {
    return null;
  }

  return user;
}
