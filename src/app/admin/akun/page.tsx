import { redirect } from "next/navigation";
import { AppHeader } from "@/components/AppHeader";
import { AdminAkunClient } from "@/components/AdminAkunClient";
import { getCurrentUser } from "@/lib/auth";
import { can } from "@/lib/akses";
import { prisma } from "@/lib/prisma";

export default async function AdminAkunPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/masuk?callbackUrl=/admin/akun");
  if (!can(user, "KELOLA_AKUN")) {
    return (
      <div style={{ minHeight: "100vh", background: "#F4F6F3" }}>
        <AppHeader activePath="/admin/akun" />
        <main style={{ maxWidth: 960, margin: "0 auto", padding: "48px 24px" }}>
          <h1 style={{ margin: "0 0 8px", fontSize: 24 }}>Akses ditolak</h1>
          <p style={{ color: "#55645B" }}>Halaman ini hanya untuk Super Admin.</p>
        </main>
      </div>
    );
  }

  const users = await prisma.pengguna.findMany({
    select: {
      id: true,
      username: true,
      nama: true,
      email: true,
      peran: true,
      jenis: true,
      aktif: true,
    },
    orderBy: { dibuat: "desc" },
  });

  return (
    <div style={{ minHeight: "100vh", background: "#F4F6F3" }}>
      <AppHeader activePath="/admin/akun" subtitle="Super Admin" />
      <main style={{ maxWidth: 1200, margin: "0 auto", padding: "32px 24px 56px" }}>
        <h1 style={{ margin: "0 0 6px", fontSize: 28, fontWeight: 700 }}>
          Manajemen akun
        </h1>
        <p style={{ margin: "0 0 24px", fontSize: 15, color: "#55645B" }}>
          Buat akun, ubah peran, nonaktifkan, atau hapus akun (termasuk Special Guest
          secara manual). Daftar AksesTopSecret tidak ditampilkan di halaman ini.
        </p>

        <AdminAkunClient users={users} currentUserId={user.id} />
      </main>
    </div>
  );
}
