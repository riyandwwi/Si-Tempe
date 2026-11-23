import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { can } from "@/lib/akses";
import { prisma } from "@/lib/prisma";
import { accDokumenSchema } from "@/lib/validasi";
import { checkVerifierLock, isValidTransition } from "@/lib/state-machine";
import { AKSI_LOG, tulisLog } from "@/lib/log";

type RouteContext = { params: Promise<{ id: string }> };

/**
 * POST /api/dokumen/[id]/acc — MENUNGGU -> TERBIT (hanya ADMIN / verifikator).
 */
export async function POST(req: Request, context: RouteContext) {
  const { id } = await context.params;
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Silakan masuk terlebih dahulu" }, { status: 401 });
  }
  if (!can(user, "VERIFIKASI_DOKUMEN")) {
    return NextResponse.json({ error: "Hanya verifikator yang dapat ACC dokumen" }, { status: 403 });
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Format JSON tidak valid" }, { status: 400 });
  }

  const parsed = accDokumenSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      {
        error: "Semua poin daftar periksa harus dicentang dan tipe akses wajib dipilih",
        fieldErrors: parsed.error.flatten().fieldErrors,
      },
      { status: 400 }
    );
  }

  const existing = await prisma.dokumen.findUnique({ where: { id } });
  if (!existing) {
    return NextResponse.json({ error: "Dokumen tidak ditemukan" }, { status: 404 });
  }

  if (!isValidTransition(existing.status, "TERBIT")) {
    return NextResponse.json(
      { error: `Dokumen berstatus ${existing.status} tidak dapat di-ACC` },
      { status: 409 }
    );
  }

  const lock = checkVerifierLock(
    existing.diperiksaOleh,
    existing.diperiksaSejak,
    user.id
  );
  if (lock.lockedByOther) {
    const locker = existing.diperiksaOleh
      ? await prisma.pengguna.findUnique({
          where: { id: existing.diperiksaOleh },
          select: { nama: true },
        })
      : null;
    return NextResponse.json(
      {
        error: `Dokumen sedang diperiksa oleh ${locker?.nama ?? "verifikator lain"}`,
      },
      { status: 409 }
    );
  }

  const finalAkses = parsed.data.tipeAkses;

  const updated = await prisma.$transaction(async (tx) => {
    const doc = await tx.dokumen.update({
      where: { id },
      data: {
        status: "TERBIT",
        tipeAkses: finalAkses,
        diterbitkan: new Date(),
        catatanRevisi: null,
        diperiksaOleh: null,
        diperiksaSejak: null,
      },
    });

    await tulisLog(tx, {
      pelakuId: user.id,
      aksi: AKSI_LOG.ACC_TERBIT,
      dokumenId: doc.id,
      rincian: `Diterbitkan dengan tipe akses ${finalAkses}`,
    });

    if (finalAkses !== existing.usulanAkses) {
      await tulisLog(tx, {
        pelakuId: user.id,
        aksi: AKSI_LOG.TIPE_AKSES_DIUBAH,
        dokumenId: doc.id,
        rincian: `Diubah dari ${existing.usulanAkses} ke ${finalAkses}`,
      });
    }

    return doc;
  });

  return NextResponse.json({ dokumen: updated });
}
