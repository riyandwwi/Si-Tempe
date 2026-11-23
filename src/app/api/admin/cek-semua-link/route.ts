import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { can } from "@/lib/akses";
import { prisma } from "@/lib/prisma";
import { cekLinkDrive } from "@/lib/cek-link";

/**
 * POST /api/admin/cek-semua-link — Cek semua link dokumen TERBIT (ADMIN & SUPER_ADMIN; REKTOR 403).
 */
export async function POST() {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Silakan masuk terlebih dahulu" }, { status: 401 });
  }
  if (!can(user, "AKSI_DASHBOARD_ADMIN")) {
    return NextResponse.json({ error: "Akses ditolak" }, { status: 403 });
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
        const existingSystemReport = await tx.laporanLink.findFirst({
          where: {
            dokumenId: doc.id,
            pelaporId: null,
            status: { in: ["BARU", "SEDANG_DIPERBAIKI"] },
          },
          select: { id: true },
        });
        if (!existingSystemReport) {
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
    diperiksa: docs.length,
    bermasalah,
    laporanBaru,
  });
}
