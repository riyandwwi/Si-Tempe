import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { can } from "@/lib/akses";
import { prisma } from "@/lib/prisma";
import { cariJudulMiripInMemory } from "@/lib/judul-mirip";
import { checkRateLimit, getClientIp } from "@/lib/rate-limit";

/**
 * GET /api/judul-mirip?judul=...&excludeId=... (F9)
 * Hanya UPLOADER dan ADMIN. Uploader tidak pernah menerima judul dokumen TOP_SECRET.
 */
export async function GET(req: Request) {
  const ip = getClientIp(req);
  const rl = checkRateLimit(`judul-mirip:${ip}`, 60, 60_000);
  if (!rl.allowed) {
    return NextResponse.json(
      { error: "Terlalu banyak permintaan. Coba lagi sebentar." },
      { status: 429 }
    );
  }

  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Silakan masuk terlebih dahulu" }, { status: 401 });
  }
  if (!can(user, "CEK_JUDUL_MIRIP")) {
    return NextResponse.json({ error: "Akses ditolak" }, { status: 403 });
  }

  const { searchParams } = new URL(req.url);
  const judul = (searchParams.get("judul") ?? "").trim();
  const excludeId = searchParams.get("excludeId") ?? undefined;

  if (judul.length < 3) {
    return NextResponse.json({ mirip: [], jumlahTerbatas: 0 });
  }

  const docs = await prisma.dokumen.findMany({
    where: { status: { in: ["TERBIT", "MENUNGGU"] } },
    select: {
      id: true,
      judul: true,
      tahun: true,
      tipeAkses: true,
      status: true,
    },
  });

  const peran = user.peran === "ADMIN" ? "ADMIN" : "UPLOADER";
  const hasil = cariJudulMiripInMemory(judul, docs, peran, excludeId);

  return NextResponse.json(hasil);
}
