import { NextResponse } from "next/server";
import { z } from "zod";
import { getCurrentUser } from "@/lib/auth";
import { can } from "@/lib/akses";
import { prisma } from "@/lib/prisma";
import { buildKategoriHelpers } from "@/lib/kategori";

const createKategoriSchema = z.object({
  nama: z.string().trim().min(2, "Nama kategori minimal 2 karakter").max(100),
  indukId: z.string().trim().nullable().optional(),
});

const patchKategoriSchema = z.object({
  id: z.string().trim().min(1),
  nama: z.string().trim().min(2).max(100).optional(),
  indukId: z.string().trim().nullable().optional(),
});

const deleteKategoriSchema = z.object({
  id: z.string().trim().min(1),
});

export async function GET() {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!can(user, "KELOLA_KATEGORI")) {
    return NextResponse.json({ error: "Akses ditolak" }, { status: 403 });
  }

  const all = await prisma.kategori.findMany({
    include: { _count: { select: { dokumen: true, anak: true } } },
  });
  return NextResponse.json({ kategori: all });
}

export async function POST(req: Request) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!can(user, "KELOLA_KATEGORI")) {
    return NextResponse.json({ error: "Akses ditolak" }, { status: 403 });
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Format JSON tidak valid" }, { status: 400 });
  }

  const parsed = createKategoriSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Data kategori tidak valid", fieldErrors: parsed.error.flatten().fieldErrors },
      { status: 400 }
    );
  }

  const indukId = parsed.data.indukId || null;
  if (indukId) {
    const induk = await prisma.kategori.findUnique({
      where: { id: indukId },
      include: { _count: { select: { dokumen: true } } },
    });
    if (!induk) {
      return NextResponse.json({ error: "Kategori induk tidak ditemukan" }, { status: 404 });
    }
    if (induk._count.dokumen > 0) {
      return NextResponse.json(
        {
          error:
            "Kategori induk sudah memiliki dokumen. Pindahkan dokumen terlebih dahulu sebelum menambah sub-kategori.",
        },
        { status: 409 }
      );
    }
  }

  const created = await prisma.kategori.create({
    data: { nama: parsed.data.nama, indukId },
  });

  return NextResponse.json({ kategori: created }, { status: 201 });
}

export async function PATCH(req: Request) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!can(user, "KELOLA_KATEGORI")) {
    return NextResponse.json({ error: "Akses ditolak" }, { status: 403 });
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Format JSON tidak valid" }, { status: 400 });
  }

  const parsed = patchKategoriSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Data tidak valid" }, { status: 400 });
  }

  const { id, nama, indukId } = parsed.data;
  const all = await prisma.kategori.findMany({
    select: { id: true, nama: true, indukId: true },
  });
  const helpers = buildKategoriHelpers(all);

  if (!helpers.byId.has(id)) {
    return NextResponse.json({ error: "Kategori tidak ditemukan" }, { status: 404 });
  }

  if (indukId !== undefined && indukId !== null) {
    const descendants = helpers.getDescendantIds(id);
    if (descendants.includes(indukId)) {
      return NextResponse.json(
        { error: "Tidak dapat memindahkan kategori ke dirinya sendiri atau turunannya" },
        { status: 409 }
      );
    }
    const targetInduk = await prisma.kategori.findUnique({
      where: { id: indukId },
      include: { _count: { select: { dokumen: true } } },
    });
    if (!targetInduk) {
      return NextResponse.json({ error: "Kategori induk tujuan tidak ditemukan" }, { status: 404 });
    }
    if (targetInduk._count.dokumen > 0) {
      return NextResponse.json(
        { error: "Kategori induk tujuan sudah memiliki dokumen" },
        { status: 409 }
      );
    }
  }

  const updated = await prisma.kategori.update({
    where: { id },
    data: {
      ...(nama !== undefined ? { nama } : {}),
      ...(indukId !== undefined ? { indukId } : {}),
    },
  });

  return NextResponse.json({ kategori: updated });
}

export async function DELETE(req: Request) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!can(user, "KELOLA_KATEGORI")) {
    return NextResponse.json({ error: "Akses ditolak" }, { status: 403 });
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Format JSON tidak valid" }, { status: 400 });
  }

  const parsed = deleteKategoriSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "id kategori wajib diisi" }, { status: 400 });
  }

  const kat = await prisma.kategori.findUnique({
    where: { id: parsed.data.id },
    include: { _count: { select: { dokumen: true, anak: true } } },
  });

  if (!kat) {
    return NextResponse.json({ error: "Kategori tidak ditemukan" }, { status: 404 });
  }

  if (kat._count.anak > 0 || kat._count.dokumen > 0) {
    return NextResponse.json(
      { error: "Kategori tidak dapat dihapus karena masih memiliki sub-kategori atau dokumen" },
      { status: 409 }
    );
  }

  await prisma.kategori.delete({ where: { id: kat.id } });
  return NextResponse.json({ ok: true });
}
