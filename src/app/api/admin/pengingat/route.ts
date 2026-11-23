import { NextResponse } from "next/server";
import { z } from "zod";
import { getCurrentUser } from "@/lib/auth";
import { can, sisaHariBerlaku } from "@/lib/akses";
import { prisma } from "@/lib/prisma";
import { kirimEmailPengingat } from "@/lib/email";

const bodySchema = z.object({
  dokumenId: z.string().trim().min(1),
});

/**
 * POST /api/admin/pengingat — Kirim email pengingat manual ke uploader (ADMIN & SUPER_ADMIN; REKTOR 403).
 */
export async function POST(req: Request) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Silakan masuk terlebih dahulu" }, { status: 401 });
  }
  if (!can(user, "AKSI_DASHBOARD_ADMIN")) {
    return NextResponse.json({ error: "Akses ditolak" }, { status: 403 });
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Format JSON tidak valid" }, { status: 400 });
  }

  const parsed = bodySchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "dokumenId wajib diisi" }, { status: 400 });
  }

  const doc = await prisma.dokumen.findUnique({
    where: { id: parsed.data.dokumenId },
    include: { uploader: { select: { nama: true, email: true } } },
  });

  if (!doc || doc.status !== "TERBIT" || doc.berlakuSampai === null) {
    return NextResponse.json(
      { error: "Dokumen tidak ditemukan atau tidak memiliki masa berlaku" },
      { status: 404 }
    );
  }

  const sisaHari = sisaHariBerlaku(doc.berlakuSampai) ?? 0;
  const hasil = await kirimEmailPengingat({
    to: doc.uploader.email,
    namaUploader: doc.uploader.nama,
    judulDokumen: doc.judul,
    berlakuSampai: doc.berlakuSampai,
    sisaHari,
    dokumenId: doc.id,
  });

  if (!hasil.sent) {
    return NextResponse.json(
      { error: hasil.error ?? "Gagal mengirim email pengingat" },
      { status: 500 }
    );
  }

  return NextResponse.json({
    ok: true,
    simulated: hasil.simulated ?? false,
    pesan: `Pengingat berhasil dikirim ke ${doc.uploader.email}`,
  });
}
