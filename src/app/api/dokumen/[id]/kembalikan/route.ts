import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { can } from "@/lib/akses";
import { prisma } from "@/lib/prisma";
import { kembalikanDokumenSchema } from "@/lib/validasi";
import { checkVerifierLock, isValidTransition } from "@/lib/state-machine";
import { AKSI_LOG, tulisLog } from "@/lib/log";

type RouteContext = { params: Promise<{ id: string }> };

/**
 * POST /api/dokumen/[id]/kembalikan — MENUNGGU -> REVISI (hanya ADMIN, wajib catatan).
 */
export async function POST(req: Request, context: RouteContext) {
  const { id } = await context.params;
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Silakan masuk terlebih dahulu" }, { status: 401 });
  }
  if (!can(user, "VERIFIKASI_DOKUMEN")) {
    return NextResponse.json(
      { error: "Hanya verifikator yang dapat mengembalikan dokumen" },
      { status: 403 }
    );
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Format JSON tidak valid" }, { status: 400 });
  }

  const parsed = kembalikanDokumenSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      {
        error: "Catatan revisi wajib diisi",
        fieldErrors: parsed.error.flatten().fieldErrors,
      },
      { status: 400 }
    );
  }

  const existing = await prisma.dokumen.findUnique({ where: { id } });
  if (!existing) {
    return NextResponse.json({ error: "Dokumen tidak ditemukan" }, { status: 404 });
  }

  if (!isValidTransition(existing.status, "REVISI") || existing.status !== "MENUNGGU") {
    return NextResponse.json(
      { error: `Dokumen berstatus ${existing.status} tidak dapat dikembalikan dari antrean` },
      { status: 409 }
    );
  }

  const lock = checkVerifierLock(
    existing.diperiksaOleh,
    existing.diperiksaSejak,
    user.id
  );
  if (lock.lockedByOther) {
    return NextResponse.json(
      { error: "Dokumen sedang diperiksa oleh verifikator lain" },
      { status: 409 }
    );
  }

  const updated = await prisma.$transaction(async (tx) => {
    const doc = await tx.dokumen.update({
      where: { id },
      data: {
        status: "REVISI",
        catatanRevisi: parsed.data.catatan,
        diperiksaOleh: null,
        diperiksaSejak: null,
      },
    });

    await tulisLog(tx, {
      pelakuId: user.id,
      aksi: AKSI_LOG.DIKEMBALIKAN,
      dokumenId: doc.id,
      rincian: parsed.data.catatan,
    });

    return doc;
  });

  return NextResponse.json({ dokumen: updated });
}
