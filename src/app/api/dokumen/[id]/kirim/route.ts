import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { can } from "@/lib/akses";
import { prisma } from "@/lib/prisma";
import { kirimDokumenSchema } from "@/lib/validasi";
import { isValidTransition } from "@/lib/state-machine";
import { isLeafKategori } from "@/lib/kategori";
import { AKSI_LOG, tulisLog } from "@/lib/log";

type RouteContext = { params: Promise<{ id: string }> };

/**
 * POST /api/dokumen/[id]/kirim — DRAFT/REVISI -> MENUNGGU (hanya UPLOADER pemilik).
 */
export async function POST(req: Request, context: RouteContext) {
  const { id } = await context.params;
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Silakan masuk terlebih dahulu" }, { status: 401 });
  }
  if (user.peran !== "UPLOADER") {
    return NextResponse.json({ error: "Hanya uploader yang dapat mengirim dokumen" }, { status: 403 });
  }

  const existing = await prisma.dokumen.findUnique({ where: { id } });
  if (!existing) {
    return NextResponse.json({ error: "Dokumen tidak ditemukan" }, { status: 404 });
  }

  if (existing.uploaderId !== user.id) {
    return NextResponse.json({ error: "Anda bukan pemilik dokumen ini" }, { status: 403 });
  }

  if (!isValidTransition(existing.status, "MENUNGGU")) {
    return NextResponse.json(
      { error: `Dokumen berstatus ${existing.status} tidak dapat dikirim ke verifikator` },
      { status: 409 }
    );
  }

  if (!can(user, "KIRIM_DOKUMEN", existing)) {
    return NextResponse.json({ error: "Aksi tidak diizinkan" }, { status: 403 });
  }

  // Izinkan payload terbaru ikut dikirim bersama aksi kirim, atau gunakan data tersimpan
  let rawBody: Record<string, unknown> = {};
  try {
    const text = await req.text();
    if (text.trim()) {
      rawBody = JSON.parse(text);
    }
  } catch {
    return NextResponse.json({ error: "Format JSON tidak valid" }, { status: 400 });
  }

  const candidate = {
    linkDrive: rawBody.linkDrive ?? existing.linkDrive,
    judul: rawBody.judul ?? existing.judul,
    deskripsi: rawBody.deskripsi ?? existing.deskripsi,
    kategoriId: rawBody.kategoriId ?? existing.kategoriId,
    tahun: rawBody.tahun ?? existing.tahun,
    berlakuSampai:
      rawBody.berlakuSampai !== undefined
        ? rawBody.berlakuSampai
        : existing.berlakuSampai,
    kataKunci: rawBody.kataKunci ?? existing.kataKunci,
    usulanAkses: rawBody.usulanAkses ?? existing.usulanAkses,
  };

  const parsed = kirimDokumenSchema.safeParse(candidate);
  if (!parsed.success) {
    return NextResponse.json(
      {
        error: "Periksa kembali isian formulir sebelum mengirim",
        fieldErrors: parsed.error.flatten().fieldErrors,
      },
      { status: 400 }
    );
  }

  const data = parsed.data;
  const leaf = await isLeafKategori(data.kategoriId);
  if (!leaf) {
    return NextResponse.json(
      {
        error: "Kategori harus kategori paling bawah (tanpa sub-kategori)",
        fieldErrors: {
          kategoriId: ["Pilih kategori paling bawah (tanpa sub-kategori)"],
        },
      },
      { status: 400 }
    );
  }

  const aksiLog =
    existing.status === "REVISI"
      ? AKSI_LOG.DOKUMEN_DIKIRIM_ULANG
      : AKSI_LOG.DOKUMEN_DIKIRIM;

  const updated = await prisma.$transaction(async (tx) => {
    const doc = await tx.dokumen.update({
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
        status: "MENUNGGU",
      },
    });

    await tulisLog(tx, {
      pelakuId: user.id,
      aksi: aksiLog,
      dokumenId: doc.id,
      rincian: `Judul: ${doc.judul} (usulan: ${doc.usulanAkses})`,
    });

    return doc;
  });

  return NextResponse.json({ dokumen: updated });
}
