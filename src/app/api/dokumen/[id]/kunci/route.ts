import { NextResponse } from "next/server";
import { z } from "zod";
import { getCurrentUser } from "@/lib/auth";
import { can } from "@/lib/akses";
import { prisma } from "@/lib/prisma";
import { AKSI_LOG, tulisLog } from "@/lib/log";

type RouteContext = { params: Promise<{ id: string }> };

const kunciSchema = z
  .object({
    dikunci: z.boolean(),
    alasan: z.string().trim().max(500).optional(),
  })
  .superRefine((data, ctx) => {
    if (data.dikunci && (!data.alasan || data.alasan.length < 3)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["alasan"],
        message: "Alasan penguncian dokumen wajib diisi (minimal 3 karakter)",
      });
    }
  });

/**
 * POST /api/dokumen/[id]/kunci — Wewenang khusus REKTOR untuk mengunci / membuka kunci dokumen TERBIT.
 */
export async function POST(req: Request, context: RouteContext) {
  const { id } = await context.params;
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Silakan masuk terlebih dahulu" }, { status: 401 });
  }
  if (!can(user, "KUNCI_DOKUMEN")) {
    return NextResponse.json(
      { error: "Hanya Rektor yang dapat mengunci atau membuka kunci dokumen" },
      { status: 403 }
    );
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Format JSON tidak valid" }, { status: 400 });
  }

  const parsed = kunciSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Input tidak valid", fieldErrors: parsed.error.flatten().fieldErrors },
      { status: 400 }
    );
  }

  const existing = await prisma.dokumen.findUnique({
    where: { id },
    select: { id: true, judul: true, status: true, dikunci: true },
  });
  if (!existing) {
    return NextResponse.json({ error: "Dokumen tidak ditemukan" }, { status: 404 });
  }
  if (existing.status !== "TERBIT") {
    return NextResponse.json(
      { error: "Hanya dokumen berstatus TERBIT yang dapat dikunci" },
      { status: 409 }
    );
  }

  const { dikunci, alasan } = parsed.data;

  const updated = await prisma.$transaction(async (tx) => {
    const doc = await tx.dokumen.update({
      where: { id },
      data: {
        dikunci,
        alasanKunci: dikunci ? (alasan ?? null) : null,
      },
    });

    await tulisLog(tx, {
      pelakuId: user.id,
      aksi: dikunci ? AKSI_LOG.DOKUMEN_DIKUNCI : AKSI_LOG.DOKUMEN_DIBUKA_KUNCI,
      dokumenId: doc.id,
      rincian: dikunci
        ? `Dikunci oleh Rektor: ${alasan}`
        : `Kunci dibuka oleh Rektor untuk "${existing.judul}"`,
    });

    return doc;
  });

  return NextResponse.json({ dokumen: updated });
}
