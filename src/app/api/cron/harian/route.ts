import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { sisaHariBerlaku } from "@/lib/akses";
import { kirimEmailPengingat, tentukanPengingat } from "@/lib/email";

function isAuthorizedCron(req: Request): boolean {
  const secret = process.env.CRON_SECRET;
  if (!secret) return false;
  return req.headers.get("authorization") === `Bearer ${secret}`;
}

/**
 * GET /api/cron/harian — Tugas harian Vercel Cron (F7):
 * Kirim pengingat 60 & 14 hari dokumen TERBIT yang segera berakhir (tidak dobel).
 * (Akun Special Guest dihapus/dinonaktifkan manual oleh Super Admin.)
 */
export async function GET(req: Request) {
  if (!isAuthorizedCron(req)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const now = new Date();
  let pengingatTerkirim = 0;

  // Pengingat dokumen segera berakhir
  const docs = await prisma.dokumen.findMany({
    where: {
      status: "TERBIT",
      berlakuSampai: { not: null },
    },
    include: { uploader: { select: { nama: true, email: true } } },
  });

  for (const doc of docs) {
    if (doc.berlakuSampai === null) continue;
    const sisaHari = sisaHariBerlaku(doc.berlakuSampai, now);
    if (sisaHari === null) continue;

    const { kirim60, kirim14 } = tentukanPengingat({
      sisaHari,
      pengingat60: doc.pengingat60,
      pengingat14: doc.pengingat14,
    });

    if (kirim60 || kirim14) {
      const res = await kirimEmailPengingat({
        to: doc.uploader.email,
        namaUploader: doc.uploader.nama,
        judulDokumen: doc.judul,
        berlakuSampai: doc.berlakuSampai,
        sisaHari,
        dokumenId: doc.id,
      });

      if (res.sent) {
        await prisma.dokumen.update({
          where: { id: doc.id },
          data: {
            ...(kirim60 ? { pengingat60: true } : {}),
            ...(kirim14 ? { pengingat14: true, pengingat60: true } : {}),
          },
        });
        pengingatTerkirim += 1;
      }
    }
  }

  return NextResponse.json({
    ok: true,
    pengingatTerkirim,
  });
}
