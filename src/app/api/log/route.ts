import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { can } from "@/lib/akses";
import { prisma } from "@/lib/prisma";

/**
 * GET /api/log — Log aktivitas disaring sesuai peran (F8).
 * - ADMIN, SUPER_ADMIN, REKTOR: semua log (bisa filter ?dokumenId=...&pelakuId=...)
 * - UPLOADER: hanya log dokumen yang diunggah sendiri
 * - Peran lain: 403
 */
export async function GET(req: Request) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Silakan masuk terlebih dahulu" }, { status: 401 });
  }
  if (!can(user, "LIHAT_LOG")) {
    return NextResponse.json({ error: "Anda tidak memiliki izin melihat log" }, { status: 403 });
  }

  const { searchParams } = new URL(req.url);
  const dokumenId = searchParams.get("dokumenId") || undefined;
  const pelakuId = searchParams.get("pelakuId") || undefined;

  if (user.peran === "UPLOADER") {
    const ownDocs = await prisma.dokumen.findMany({
      where: { uploaderId: user.id },
      select: { id: true },
    });
    const ownIds = ownDocs.map((d) => d.id);
    if (ownIds.length === 0) {
      return NextResponse.json({ items: [] });
    }
    if (dokumenId && !ownIds.includes(dokumenId)) {
      return NextResponse.json({ error: "Anda tidak memiliki izin melihat log dokumen ini" }, { status: 403 });
    }

    const items = await prisma.logAktivitas.findMany({
      where: {
        dokumenId: dokumenId ? dokumenId : { in: ownIds },
      },
      include: {
        pelaku: { select: { id: true, nama: true, peran: true } },
      },
      orderBy: { waktu: "desc" },
      take: 100,
    });
    return NextResponse.json({ items });
  }

  const items = await prisma.logAktivitas.findMany({
    where: {
      ...(dokumenId ? { dokumenId } : {}),
      ...(pelakuId ? { pelakuId } : {}),
    },
    include: {
      pelaku: { select: { id: true, nama: true, peran: true } },
    },
    orderBy: { waktu: "desc" },
    take: 100,
  });

  return NextResponse.json({ items });
}
