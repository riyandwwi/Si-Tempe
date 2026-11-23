import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { can, tampilanDokumen } from "@/lib/akses";
import { prisma } from "@/lib/prisma";

type RouteContext = { params: Promise<{ id: string }> };

/**
 * POST /api/dokumen/[id]/laporan — Lapor link mati (pengguna login yang melihat dokumen LENGKAP).
 */
export async function POST(_req: Request, context: RouteContext) {
  const { id: dokumenId } = await context.params;
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Silakan masuk terlebih dahulu" }, { status: 401 });
  }
  if (!can(user, "LAPOR_LINK_MATI")) {
    return NextResponse.json({ error: "Akses ditolak" }, { status: 403 });
  }

  const doc = await prisma.dokumen.findUnique({
    where: { id: dokumenId },
    select: { id: true, status: true, tipeAkses: true, dikunci: true },
  });
  if (!doc) {
    return NextResponse.json({ error: "Dokumen tidak ditemukan" }, { status: 404 });
  }

  let adaDiDaftarBerhak = false;
  if (doc.tipeAkses === "TOP_SECRET" && doc.status === "TERBIT") {
    const akses = await prisma.aksesTopSecret.findUnique({
      where: {
        dokumenId_penggunaId: { dokumenId: doc.id, penggunaId: user.id },
      },
      select: { dokumenId: true },
    });
    adaDiDaftarBerhak = Boolean(akses);
  }

  if (tampilanDokumen(user, doc, adaDiDaftarBerhak) !== "LENGKAP") {
    return NextResponse.json(
      { error: "Anda tidak bisa mengakses dokumen ini" },
      { status: 403 }
    );
  }

  try {
    const laporan = await prisma.$transaction(async (tx) => {
      const existingOpen = await tx.laporanLink.findFirst({
        where: {
          dokumenId: doc.id,
          pelaporId: user.id,
          status: { in: ["BARU", "SEDANG_DIPERBAIKI"] },
        },
        select: { id: true },
      });

      if (existingOpen) {
        throw new Error("DUPLICATE_OPEN_REPORT");
      }

      return tx.laporanLink.create({
        data: {
          dokumenId: doc.id,
          pelaporId: user.id,
          status: "BARU",
        },
      });
    });

    return NextResponse.json({ laporan }, { status: 201 });
  } catch (err) {
    if (err instanceof Error && err.message === "DUPLICATE_OPEN_REPORT") {
      return NextResponse.json(
        { error: "Anda sudah melaporkan dokumen ini" },
        { status: 409 }
      );
    }
    throw err;
  }
}
