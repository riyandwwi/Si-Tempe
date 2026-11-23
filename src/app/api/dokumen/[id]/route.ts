import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { can, tampilanDokumen, toResponsDokumen } from "@/lib/akses";
import { prisma } from "@/lib/prisma";
import { draftDokumenSchema } from "@/lib/validasi";
import { buildKategoriHelpers, isLeafKategori } from "@/lib/kategori";

type RouteContext = { params: Promise<{ id: string }> };

/**
 * GET /api/dokumen/[id] — Detail dokumen sesuai aturan F5.
 * TIDAK mencatat log pembukaan dokumen apa pun (terutama Top Secret).
 */
export async function GET(_req: Request, context: RouteContext) {
  const { id } = await context.params;
  const user = await getCurrentUser();

  const doc = await prisma.dokumen.findUnique({
    where: { id },
    select: {
      id: true,
      judul: true,
      linkDrive: true,
      deskripsi: true,
      kategoriId: true,
      tahun: true,
      berlakuSampai: true,
      tipeAkses: true,
      status: true,
      dikunci: true,
      uploaderId: true,
      diterbitkan: true,
    },
  });

  if (!doc) {
    return NextResponse.json(
      { tampilan: "TIDAK_ADA", pesan: "Anda tidak bisa mengakses dokumen ini" },
      { status: 403 }
    );
  }

  let adaDiDaftarBerhak = false;
  if (user && doc.tipeAkses === "TOP_SECRET" && doc.status === "TERBIT") {
    const akses = await prisma.aksesTopSecret.findUnique({
      where: {
        dokumenId_penggunaId: { dokumenId: doc.id, penggunaId: user.id },
      },
      select: { dokumenId: true },
    });
    adaDiDaftarBerhak = Boolean(akses);
  }

  const tampilan = tampilanDokumen(user, doc, adaDiDaftarBerhak);

  // F5: TERBATAS atau TIDAK_ADA hanya mengembalikan pesan penolakan, tanpa metadata lain.
  if (tampilan !== "LENGKAP") {
    return NextResponse.json(
      { tampilan, pesan: "Anda tidak bisa mengakses dokumen ini" },
      { status: 403 }
    );
  }

  const [allKat, setting] = await Promise.all([
    prisma.kategori.findMany({ select: { id: true, nama: true, indukId: true } }),
    prisma.pengaturan.findUnique({ where: { kunci: "batas_segera_berakhir_hari" } }),
  ]);
  const batasHari = Number(setting?.nilai ?? 60) || 60;
  const { getPath } = buildKategoriHelpers(allKat);

  const respons = toResponsDokumen(
    {
      ...doc,
      kategoriJalur: getPath(doc.kategoriId),
    },
    "LENGKAP",
    batasHari
  );

  return NextResponse.json(respons);
}

/**
 * PATCH /api/dokumen/[id] — Edit dokumen DRAFT atau REVISI milik sendiri (hanya UPLOADER pemilik).
 */
export async function PATCH(req: Request, context: RouteContext) {
  const { id } = await context.params;
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Silakan masuk terlebih dahulu" }, { status: 401 });
  }

  const existing = await prisma.dokumen.findUnique({
    where: { id },
    select: { id: true, status: true, uploaderId: true },
  });
  if (!existing) {
    return NextResponse.json({ error: "Dokumen tidak ditemukan" }, { status: 404 });
  }

  // Bagian 7: hanya DRAFT dan REVISI oleh uploader pemilik; selain itu tolak 403.
  if (!can(user, "EDIT_DOKUMEN", existing)) {
    return NextResponse.json(
      { error: "Dokumen ini tidak dapat diedit" },
      { status: 403 }
    );
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
      { error: "Data dokumen tidak valid", fieldErrors: parsed.error.flatten().fieldErrors },
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

  const updated = await prisma.dokumen.update({
    where: { id },
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
    },
  });

  return NextResponse.json({ dokumen: updated });
}
