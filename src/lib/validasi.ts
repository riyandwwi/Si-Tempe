import { z } from "zod";

export const TIPE_AKSES_VALUES = [
  "PUBLIK",
  "PRIVAT_DOSEN",
  "PRIVAT_TENDIK",
  "TOP_SECRET",
] as const;

export const tipeAksesSchema = z.enum(TIPE_AKSES_VALUES, {
  errorMap: () => ({ message: "Pilih tipe akses yang valid" }),
});

export function isValidGoogleDriveUrl(value: string): boolean {
  try {
    const u = new URL(value.trim());
    if (u.protocol !== "https:") return false;
    return (
      (u.hostname === "drive.google.com" || u.hostname === "docs.google.com") &&
      u.pathname.length > 1
    );
  } catch {
    return false;
  }
}

export function normalisasiKataKunci(input: string | undefined | null): string {
  if (!input) return "";
  return input
    .split(",")
    .map((part) => part.trim().replace(/\s+/g, " ").toLowerCase())
    .filter((part) => part.length > 0)
    .join(", ");
}

export function getMaxTahun(): number {
  return new Date().getFullYear() + 1;
}

/**
 * Validasi penuh saat mengirim dokumen ke verifikator (F2).
 */
export const kirimDokumenSchema = z
  .object({
    linkDrive: z
      .string()
      .trim()
      .min(1, "Link Google Drive wajib diisi")
      .refine(
        isValidGoogleDriveUrl,
        "Link harus berpola https://drive.google.com/... atau https://docs.google.com/..."
      ),
    judul: z
      .string()
      .trim()
      .min(5, "Judul minimal 5 karakter")
      .max(200, "Judul maksimal 200 karakter"),
    deskripsi: z
      .string()
      .trim()
      .min(20, "Deskripsi minimal 20 karakter"),
    kategoriId: z.string().trim().min(1, "Kategori wajib dipilih"),
    tahun: z.coerce
      .number({ invalid_type_error: "Tahun dokumen harus berupa angka 4 digit" })
      .int("Tahun dokumen harus bilangan bulat")
      .refine(
        (v) => v >= 1990 && v <= getMaxTahun(),
        () => ({ message: `Tahun dokumen harus antara 1990 sampai ${getMaxTahun()}` })
      ),
    berlakuSampai: z
      .union([z.literal(""), z.null(), z.undefined(), z.coerce.number().int()])
      .transform((v) => (v === "" || v === undefined ? null : v)),
    kataKunci: z
      .string()
      .optional()
      .default("")
      .transform((v) => normalisasiKataKunci(v)),
    usulanAkses: tipeAksesSchema,
  })
  .superRefine((data, ctx) => {
    if (data.berlakuSampai !== null && data.berlakuSampai < data.tahun) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["berlakuSampai"],
        message: "Tahun berlaku sampai harus lebih besar atau sama dengan tahun dokumen",
      });
    }
  });

/**
 * Validasi longgar saat menyimpan draft (F2).
 */
export const draftDokumenSchema = z.object({
  linkDrive: z.string().trim().optional().default(""),
  judul: z.string().trim().max(200, "Judul maksimal 200 karakter").optional().default(""),
  deskripsi: z.string().trim().optional().default(""),
  kategoriId: z.string().trim().min(1, "Pilih kategori terlebih dahulu"),
  tahun: z
    .union([z.literal(""), z.null(), z.undefined(), z.coerce.number().int()])
    .transform((v) =>
      v === "" || v === null || v === undefined ? new Date().getFullYear() : v
    ),
  berlakuSampai: z
    .union([z.literal(""), z.null(), z.undefined(), z.coerce.number().int()])
    .transform((v) => (v === "" || v === undefined ? null : v)),
  kataKunci: z
    .string()
    .optional()
    .default("")
    .transform((v) => normalisasiKataKunci(v)),
  usulanAkses: tipeAksesSchema.optional().default("PUBLIK"),
});

/**
 * Validasi ACC oleh verifikator (F3): semua 4 poin daftar periksa wajib dicentang.
 */
export const accDokumenSchema = z.object({
  tipeAkses: tipeAksesSchema,
  checklist: z.object({
    metadataBenar: z.literal(true, {
      errorMap: () => ({ message: "Centang verifikasi judul, kategori, tahun, dan angkatan" }),
    }),
    deskripsiSesuai: z.literal(true, {
      errorMap: () => ({ message: "Centang verifikasi deskripsi sesuai template" }),
    }),
    linkBisaDibuka: z.literal(true, {
      errorMap: () => ({ message: "Centang verifikasi link Drive bisa dibuka" }),
    }),
    izinDriveSesuai: z.literal(true, {
      errorMap: () => ({ message: "Centang verifikasi izin Google Drive" }),
    }),
  }),
});

export const kembalikanDokumenSchema = z.object({
  catatan: z
    .string()
    .trim()
    .min(3, "Catatan revisi wajib diisi (minimal 3 karakter)")
    .max(1000, "Catatan revisi maksimal 1000 karakter"),
});

export const batalAccSchema = z.object({
  alasan: z
    .string()
    .trim()
    .min(3, "Alasan pembatalan ACC wajib diisi (minimal 3 karakter)")
    .max(1000, "Alasan maksimal 1000 karakter"),
});

export const PERAN_VALUES = [
  "SUPER_ADMIN",
  "ADMIN",
  "UPLOADER",
  "PENGGUNA",
  "REKTOR",
  "SPECIAL_GUEST",
] as const;

export const JENIS_VALUES = ["DOSEN", "TENDIK", "LAINNYA"] as const;

export const createAkunSchema = z.object({
  username: z
    .string()
    .trim()
    .toLowerCase()
    .min(3, "Username minimal 3 karakter")
    .max(40, "Username maksimal 40 karakter")
    .regex(
      /^[a-z0-9._-]+$/,
      "Username hanya boleh huruf kecil, angka, titik, garis bawah, atau tanda hubung"
    ),
  nama: z.string().trim().min(2, "Nama minimal 2 karakter").max(120),
  email: z
    .string()
    .trim()
    .email("Format email tidak valid")
    .optional()
    .or(z.literal("")),
  password: z.string().min(3, "Kata sandi minimal 3 karakter").default("123"),
  peran: z.enum(PERAN_VALUES),
  jenis: z.enum(JENIS_VALUES),
  tanggalBerakhir: z.string().nullable().optional(),
});
