import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { can } from "@/lib/akses";
import { prisma } from "@/lib/prisma";
import { cekLinkDrive } from "@/lib/cek-link";

type RouteContext = { params: Promise<{ id: string }> };

/**
 * POST /api/laporan/[id]/cek — Cek link Drive secara langsung dari server (F6).
 */
export async function POST(_req: Request, context: RouteContext) {
  const { id } = await context.params;
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Silakan masuk terlebih dahulu" }, { status: 401 });
  }

  const laporan = await prisma.laporanLink.findUnique({
    where: { id },
    include: {
      dokumen: {
        select: { id: true, status: true, uploaderId: true, linkDrive: true },
      },
    },
  });

  if (!laporan) {
    return NextResponse.json({ error: "Laporan tidak ditemukan" }, { status: 404 });
  }

  if (!can(user, "KELOLA_LAPORAN_LINK", laporan.dokumen)) {
    return NextResponse.json({ error: "Akses ditolak" }, { status: 403 });
  }

  const hasil = await cekLinkDrive(laporan.dokumen.linkDrive);

  await prisma.dokumen.update({
    where: { id: laporan.dokumen.id },
    data: { linkBermasalah: !hasil.ok },
  });

  return NextResponse.json({ hasil });
}
