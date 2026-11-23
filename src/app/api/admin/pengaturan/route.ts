import { NextResponse } from "next/server";
import { z } from "zod";
import { getCurrentUser } from "@/lib/auth";
import { can } from "@/lib/akses";
import { prisma } from "@/lib/prisma";

const patchSchema = z.object({
  batas_segera_berakhir_hari: z.coerce.number().int().min(1).max(365),
});

export async function GET() {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!can(user, "KELOLA_PENGATURAN")) {
    return NextResponse.json({ error: "Akses ditolak" }, { status: 403 });
  }

  const setting = await prisma.pengaturan.findUnique({
    where: { kunci: "batas_segera_berakhir_hari" },
  });
  return NextResponse.json({
    batas_segera_berakhir_hari: Number(setting?.nilai ?? 60) || 60,
  });
}

export async function PATCH(req: Request) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!can(user, "KELOLA_PENGATURAN")) {
    return NextResponse.json({ error: "Akses ditolak" }, { status: 403 });
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Format JSON tidak valid" }, { status: 400 });
  }

  const parsed = patchSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Nilai harus bilangan bulat antara 1 sampai 365 hari" },
      { status: 400 }
    );
  }

  await prisma.pengaturan.upsert({
    where: { kunci: "batas_segera_berakhir_hari" },
    update: { nilai: String(parsed.data.batas_segera_berakhir_hari) },
    create: {
      kunci: "batas_segera_berakhir_hari",
      nilai: String(parsed.data.batas_segera_berakhir_hari),
    },
  });

  return NextResponse.json({
    batas_segera_berakhir_hari: parsed.data.batas_segera_berakhir_hari,
  });
}
