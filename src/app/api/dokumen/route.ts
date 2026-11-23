import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { can } from "@/lib/akses";
import { prisma } from "@/lib/prisma";
import { draftDokumenSchema } from "@/lib/validasi";
import { isLeafKategori } from "@/lib/kategori";

/**
 * POST /api/dokumen — Simpan draft dokumen baru (hanya UPLOADER).
 */
export async function POST(req: Request) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Silakan masuk terlebih dahulu" }, { status: 401 });
  }
  if (!can(user, "BUAT_DOKUMEN")) {
    return NextResponse.json({ error: "Anda tidak memiliki izin membuat dokumen" }, { status: 403 });
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Format JSON tidak valid" }, { status: 400 });
  }

  const parsed = draftDokumenSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Data draft tidak valid", fieldErrors: parsed.error.flatten().fieldErrors },
      { status: 400 }
    );
  }

  const data = parsed.data;
  const leaf = await isLeafKategori(data.kategoriId);
  if (!leaf) {
    return NextResponse.json(
      {
        error: "Kategori tidak valid",
        fieldErrors: {
          kategoriId: ["Pilih kategori paling bawah (tanpa sub-kategori)"],
        },
      },
      { status: 400 }
    );
  }

  const doc = await prisma.dokumen.create({
    data: {
      judul: data.judul,
      linkDrive: data.linkDrive,
      deskripsi: data.deskripsi,
      kategoriId: data.kategoriId,
      tahun: data.tahun,
      berlakuSampai: data.berlakuSampai,
      kataKunci: data.kataKunci,
      usulanAkses: data.usulanAkses,
      tipeAkses: data.usulanAkses,
      status: "DRAFT",
      uploaderId: user.id,
    },
  });

  return NextResponse.json({ dokumen: doc }, { status: 201 });
}
