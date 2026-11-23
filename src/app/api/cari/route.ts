import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { can } from "@/lib/akses";
import { cariDokumenServer, parseCariSearchParams } from "@/lib/pencarian";
import { checkRateLimit, getClientIp } from "@/lib/rate-limit";

/**
 * GET /api/cari — Pencarian dokumen kampus dengan filter, kategori, dan aturan hak akses (F4).
 */
export async function GET(req: Request) {
  const ip = getClientIp(req);
  const rl = checkRateLimit(`cari:${ip}`, 60, 60_000);
  if (!rl.allowed) {
    return NextResponse.json(
      { error: "Terlalu banyak permintaan pencarian. Coba lagi sebentar." },
      { status: 429 }
    );
  }

  const user = await getCurrentUser();
  if (!can(user, "CARI_DOKUMEN")) {
    return NextResponse.json({ error: "Akun Anda tidak aktif" }, { status: 403 });
  }

  const url = new URL(req.url);
  const raw: Record<string, string | string[]> = {};
  for (const key of new Set(url.searchParams.keys())) {
    const vals = url.searchParams.getAll(key);
    raw[key] = vals.length > 1 ? vals : vals[0];
  }

  const params = parseCariSearchParams(raw);
  const hasil = await cariDokumenServer(user, params);

  return NextResponse.json(hasil);
}
