import { NextResponse } from "next/server";
import { z } from "zod";
import { getCurrentUser } from "@/lib/auth";
import { can } from "@/lib/akses";
import { prisma } from "@/lib/prisma";
import { isValidGoogleDriveUrl } from "@/lib/validasi";
import { AKSI_LOG, tulisLog } from "@/lib/log";

type RouteContext = { params: Promise<{ id: string }> };

const patchLaporanSchema = z.object({
  status: z.enum(["SEDANG_DIPERBAIKI", "SELESAI", "DITUTUP"]).optional(),
  linkDriveBaru: z
    .string()
    .trim()
    .refine(
      isValidGoogleDriveUrl,
      "Link harus berpola https://drive.google.com/... atau https://docs.google.com/..."
    )
    .optional(),
});

/**
 * PATCH /api/laporan/[id] — Ubah status laporan dan/atau perbaiki linkDrive dokumen TERBIT (F6).
 * Perubahan linkDrive pada dokumen TERBIT tidak perlu ACC ulang, tetapi dicatat di log LINK_DIPERBAIKI.
 */
export async function PATCH(req: Request, context: RouteContext) {
  const { id } = await context.params;
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Silakan masuk terlebih dahulu" }, { status: 401 });
  }

  const laporan = await prisma.laporanLink.findUnique({
    where: { id },
    include: {
      dokumen: {
        select: { id: true, judul: true, status: true, uploaderId: true, linkDrive: true },
      },
    },
  });

  if (!laporan) {
    return NextResponse.json({ error: "Laporan tidak ditemukan" }, { status: 404 });
  }

  if (!can(user, "KELOLA_LAPORAN_LINK", laporan.dokumen)) {
    return NextResponse.json({ error: "Akses ditolak" }, { status: 403 });
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Format JSON tidak valid" }, { status: 400 });
  }

  const parsed = patchLaporanSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Input tidak valid", fieldErrors: parsed.error.flatten().fieldErrors },
      { status: 400 }
    );
  }

  const { status, linkDriveBaru } = parsed.data;
  if (!status && !linkDriveBaru) {
    return NextResponse.json(
      { error: "Sertakan status baru atau linkDriveBaru" },
      { status: 400 }
    );
  }

  const nextStatus = status ?? (linkDriveBaru ? "SEDANG_DIPERBAIKI" : laporan.status);
  const isClosing = nextStatus === "SELESAI" || nextStatus === "DITUTUP";

  const updated = await prisma.$transaction(async (tx) => {
    if (linkDriveBaru && linkDriveBaru !== laporan.dokumen.linkDrive) {
      await tx.dokumen.update({
        where: { id: laporan.dokumen.id },
        data: { linkDrive: linkDriveBaru },
      });

      await tulisLog(tx, {
        pelakuId: user.id,
        aksi: AKSI_LOG.LINK_DIPERBAIKI,
        dokumenId: laporan.dokumen.id,
        rincian: `Link diperbarui untuk "${laporan.dokumen.judul}"`,
      });
    }

    const lap = await tx.laporanLink.update({
      where: { id: laporan.id },
      data: {
        status: nextStatus,
        selesai: isClosing ? new Date() : null,
      },
    });

    if (isClosing) {
      const remainingOpen = await tx.laporanLink.count({
        where: {
          dokumenId: laporan.dokumen.id,
          status: { in: ["BARU", "SEDANG_DIPERBAIKI"] },
        },
      });
      if (remainingOpen === 0) {
        await tx.dokumen.update({
          where: { id: laporan.dokumen.id },
          data: { linkBermasalah: false },
        });
      }
    }

    return lap;
  });

  return NextResponse.json({ laporan: updated });
}
