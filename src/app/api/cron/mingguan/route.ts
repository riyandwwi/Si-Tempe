import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { cekLinkDrive } from "@/lib/cek-link";

function isAuthorizedCron(req: Request): boolean {
  const secret = process.env.CRON_SECRET;
  if (!secret) return false;
  return req.headers.get("authorization") === `Bearer ${secret}`;
}

/**
 * GET /api/cron/mingguan — Tugas mingguan Vercel Cron (F6 & Bagian 12):
 * Memeriksa semua link dokumen TERBIT; yang gagal dibuatkan laporan sistem (pelaporId = null).
 */
export async function GET(req: Request) {
  if (!isAuthorizedCron(req)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const docs = await prisma.dokumen.findMany({
    where: { status: "TERBIT" },
    select: { id: true, linkDrive: true },
  });

  let bermasalah = 0;
  let laporanBaru = 0;

  for (const doc of docs) {
    const res = await cekLinkDrive(doc.linkDrive);
    if (!res.ok) {
      bermasalah += 1;
      await prisma.$transaction(async (tx) => {
        await tx.dokumen.update({
          where: { id: doc.id },
          data: { linkBermasalah: true },
        });
        const existingOpen = await tx.laporanLink.findFirst({
          where: {
            dokumenId: doc.id,
            pelaporId: null,
            status: { in: ["BARU", "SEDANG_DIPERBAIKI"] },
          },
          select: { id: true },
        });
        if (!existingOpen) {
          await tx.laporanLink.create({
            data: { dokumenId: doc.id, pelaporId: null, status: "BARU" },
          });
          laporanBaru += 1;
        }
      });
    } else {
      await prisma.dokumen.update({
        where: { id: doc.id },
        data: { linkBermasalah: false },
      });
    }
  }

  return NextResponse.json({
    ok: true,
    diperiksa: docs.length,
    bermasalah,
    laporanBaru,
  });
}
