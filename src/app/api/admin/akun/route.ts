import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { z } from "zod";
import { getCurrentUser } from "@/lib/auth";
import { can } from "@/lib/akses";
import { prisma } from "@/lib/prisma";
import { AKSI_LOG, tulisLog } from "@/lib/log";
import { createAkunSchema, JENIS_VALUES, PERAN_VALUES } from "@/lib/validasi";

const patchAkunSchema = z.object({
  id: z.string().trim().min(1),
  nama: z.string().trim().min(2).max(120).optional(),
  peran: z.enum(PERAN_VALUES).optional(),
  jenis: z.enum(JENIS_VALUES).optional(),
  aktif: z.boolean().optional(),
  tanggalBerakhir: z.string().nullable().optional(),
  passwordBaru: z.string().min(6).optional(),
});

/**
 * GET /api/admin/akun — Daftar akun (hanya SUPER_ADMIN). Tidak pernah mengembalikan passwordHash atau AksesTopSecret.
 */
export async function GET() {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!can(user, "KELOLA_AKUN")) {
    return NextResponse.json({ error: "Akses ditolak" }, { status: 403 });
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
      tanggalBerakhir: true,
      dibuat: true,
    },
    orderBy: { dibuat: "desc" },
  });

  return NextResponse.json({ users });
}

/**
 * POST /api/admin/akun — Buat akun baru termasuk SPECIAL_GUEST (hanya SUPER_ADMIN).
 */
export async function POST(req: Request) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!can(user, "KELOLA_AKUN")) {
    return NextResponse.json({ error: "Akses ditolak" }, { status: 403 });
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Format JSON tidak valid" }, { status: 400 });
  }

  const parsed = createAkunSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Data akun tidak valid", fieldErrors: parsed.error.flatten().fieldErrors },
      { status: 400 }
    );
  }

  const data = parsed.data;
  const username = data.username.toLowerCase();
  const email = (data.email?.trim() || `${username}@itbmp.ac.id`).toLowerCase();
  const exists = await prisma.pengguna.findFirst({
    where: { OR: [{ username }, { email }] },
    select: { id: true, username: true, email: true },
  });
  if (exists) {
    return NextResponse.json(
      {
        error:
          exists.username === username
            ? "Username sudah terdaftar"
            : "Email sudah terdaftar",
      },
      { status: 409 }
    );
  }

  const passwordHash = await bcrypt.hash(data.password || "123", 10);
  const isGuest = data.peran === "SPECIAL_GUEST";
  const jenis = isGuest ? "LAINNYA" : data.jenis;
  const tanggalBerakhir = data.tanggalBerakhir ? new Date(data.tanggalBerakhir) : null;

  const created = await prisma.$transaction(async (tx) => {
    const u = await tx.pengguna.create({
      data: {
        username,
        nama: data.nama,
        email,
        passwordHash,
        peran: data.peran,
        jenis,
        aktif: true,
        tanggalBerakhir,
      },
      select: {
        id: true,
        username: true,
        nama: true,
        email: true,
        peran: true,
        jenis: true,
        aktif: true,
        tanggalBerakhir: true,
        dibuat: true,
      },
    });

    await tulisLog(tx, {
      pelakuId: user.id,
      aksi: isGuest ? AKSI_LOG.GUEST_DIBUAT : AKSI_LOG.AKUN_DIBUAT,
      rincian: isGuest
        ? `Special Guest @${u.username} dibuat (dihapus manual oleh Super Admin)`
        : `Akun @${u.username} (${u.peran}/${u.jenis})`,
    });

    return u;
  });

  return NextResponse.json({ user: created }, { status: 201 });
}

/**
 * PATCH /api/admin/akun — Ubah peran, jenis, status aktif, atau reset password (hanya SUPER_ADMIN).
 */
export async function PATCH(req: Request) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!can(user, "KELOLA_AKUN")) {
    return NextResponse.json({ error: "Akses ditolak" }, { status: 403 });
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Format JSON tidak valid" }, { status: 400 });
  }

  const parsed = patchAkunSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Data tidak valid", fieldErrors: parsed.error.flatten().fieldErrors },
      { status: 400 }
    );
  }

  const data = parsed.data;
  const existing = await prisma.pengguna.findUnique({ where: { id: data.id } });
  if (!existing) {
    return NextResponse.json({ error: "Akun tidak ditemukan" }, { status: 404 });
  }

  const nextPeran = data.peran ?? existing.peran;
  const nextTanggalBerakhir =
    data.tanggalBerakhir !== undefined
      ? data.tanggalBerakhir
        ? new Date(data.tanggalBerakhir)
        : null
      : existing.tanggalBerakhir;

  const passwordHash = data.passwordBaru
    ? await bcrypt.hash(data.passwordBaru, 10)
    : undefined;

  const updated = await prisma.$transaction(async (tx) => {
    const u = await tx.pengguna.update({
      where: { id: existing.id },
      data: {
        ...(data.nama !== undefined ? { nama: data.nama } : {}),
        ...(data.peran !== undefined ? { peran: data.peran } : {}),
        ...(data.jenis !== undefined
          ? { jenis: nextPeran === "SPECIAL_GUEST" ? "LAINNYA" : data.jenis }
          : {}),
        ...(data.aktif !== undefined ? { aktif: data.aktif } : {}),
        tanggalBerakhir: nextTanggalBerakhir,
        ...(passwordHash ? { passwordHash } : {}),
      },
      select: {
        id: true,
        nama: true,
        email: true,
        peran: true,
        jenis: true,
        aktif: true,
        tanggalBerakhir: true,
        dibuat: true,
      },
    });

    if (data.aktif === false && existing.aktif) {
      await tulisLog(tx, {
        pelakuId: user.id,
        aksi: AKSI_LOG.AKUN_DINONAKTIFKAN,
        rincian: `Akun ${u.email} dinonaktifkan`,
      });
    }

    if (data.peran && data.peran !== existing.peran) {
      await tulisLog(tx, {
        pelakuId: user.id,
        aksi: AKSI_LOG.PERAN_DIUBAH,
        rincian: `Peran ${u.email} diubah dari ${existing.peran} ke ${data.peran}`,
      });
    }

    return u;
  });

  return NextResponse.json({ user: updated });
}

const deleteAkunSchema = z.object({
  id: z.string().trim().min(1),
});

/**
 * DELETE /api/admin/akun — Hapus akun secara manual (hanya SUPER_ADMIN).
 */
export async function DELETE(req: Request) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!can(user, "KELOLA_AKUN")) {
    return NextResponse.json({ error: "Akses ditolak" }, { status: 403 });
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Format JSON tidak valid" }, { status: 400 });
  }

  const parsed = deleteAkunSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "id akun wajib diisi" }, { status: 400 });
  }

  if (parsed.data.id === user.id) {
    return NextResponse.json(
      { error: "Tidak dapat menghapus akun Anda sendiri" },
      { status: 409 }
    );
  }

  const target = await prisma.pengguna.findUnique({
    where: { id: parsed.data.id },
    include: { _count: { select: { dokumen: true } } },
  });
  if (!target) {
    return NextResponse.json({ error: "Akun tidak ditemukan" }, { status: 404 });
  }

  if (target._count.dokumen > 0) {
    return NextResponse.json(
      {
        error:
          "Akun ini memiliki dokumen yang diunggah sehingga tidak bisa dihapus. Gunakan tombol Nonaktifkan.",
      },
      { status: 409 }
    );
  }

  await prisma.$transaction(async (tx) => {
    await tx.aksesTopSecret.deleteMany({ where: { penggunaId: target.id } });
    await tx.laporanLink.updateMany({
      where: { pelaporId: target.id },
      data: { pelaporId: null },
    });
    await tx.logAktivitas.updateMany({
      where: { pelakuId: target.id },
      data: { pelakuId: null },
    });
    await tx.pengguna.delete({ where: { id: target.id } });

    await tulisLog(tx, {
      pelakuId: user.id,
      aksi: AKSI_LOG.AKUN_DINONAKTIFKAN,
      rincian: `Akun @${target.username} (${target.peran}) dihapus manual`,
    });
  });

  return NextResponse.json({ ok: true });
}
