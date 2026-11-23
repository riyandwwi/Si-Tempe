import { describe, it, expect } from "vitest";
import {
  isValidTransition,
  checkVerifierLock,
  LOCK_TIMEOUT_MS,
} from "@/lib/state-machine";
import {
  kirimDokumenSchema,
  accDokumenSchema,
  kembalikanDokumenSchema,
  batalAccSchema,
  normalisasiKataKunci,
} from "@/lib/validasi";

describe("State machine dokumen (Bagian 7)", () => {
  it("mengizinkan tepat 5 transisi sesuai spesifikasi", () => {
    expect(isValidTransition("DRAFT", "MENUNGGU")).toBe(true);
    expect(isValidTransition("MENUNGGU", "TERBIT")).toBe(true);
    expect(isValidTransition("MENUNGGU", "REVISI")).toBe(true);
    expect(isValidTransition("REVISI", "MENUNGGU")).toBe(true);
    expect(isValidTransition("TERBIT", "REVISI")).toBe(true);
  });

  it("menolak semua transisi di luar tabel (akan menghasilkan 409)", () => {
    expect(isValidTransition("DRAFT", "TERBIT")).toBe(false);
    expect(isValidTransition("DRAFT", "REVISI")).toBe(false);
    expect(isValidTransition("REVISI", "TERBIT")).toBe(false);
    expect(isValidTransition("REVISI", "DRAFT")).toBe(false);
    expect(isValidTransition("TERBIT", "MENUNGGU")).toBe(false);
    expect(isValidTransition("TERBIT", "DRAFT")).toBe(false);
    expect(isValidTransition("MENUNGGU", "DRAFT")).toBe(false);
  });

  it("mengunci dokumen untuk verifikator lain selama 30 menit lalu melepas setelah timeout", () => {
    const start = new Date("2026-11-22T10:00:00Z");
    const after10m = new Date(start.getTime() + 10 * 60 * 1000);
    const after31m = new Date(start.getTime() + LOCK_TIMEOUT_MS + 60 * 1000);

    expect(checkVerifierLock("admin-1", start, "admin-1", after10m).lockedByOther).toBe(false);
    expect(checkVerifierLock("admin-1", start, "admin-2", after10m).lockedByOther).toBe(true);
    expect(checkVerifierLock("admin-1", start, "admin-2", after31m).lockedByOther).toBe(false);
  });
});

describe("Validasi F2 & F3", () => {
  it("validasi penuh menerima dokumen valid dan menormalkan kata kunci", () => {
    const res = kirimDokumenSchema.safeParse({
      linkDrive: "https://drive.google.com/file/d/abc123/view",
      judul: "Penetapan Dosen Pembimbing Skripsi Angkatan 2025",
      deskripsi: "SK penetapan dosen pembimbing skripsi untuk angkatan 2025 semua prodi.",
      kategoriId: "kat-mahasiswa",
      tahun: 2025,
      berlakuSampai: 2028,
      kataKunci: " Dospem ,  TA  2025 , , SKRIPSI ",
      usulanAkses: "PRIVAT_DOSEN",
    });
    expect(res.success).toBe(true);
    if (res.success) {
      expect(res.data.kataKunci).toBe("dospem, ta 2025, skripsi");
    }
  });

  it("menolak link non-Google Drive, deskripsi terlalu pendek, dan berlakuSampai < tahun", () => {
    const res = kirimDokumenSchema.safeParse({
      linkDrive: "https://example.com/file.pdf",
      judul: "abc",
      deskripsi: "pendek",
      kategoriId: "kat-1",
      tahun: 2025,
      berlakuSampai: 2024,
      usulanAkses: "PUBLIK",
    });
    expect(res.success).toBe(false);
    if (!res.success) {
      const errs = res.error.flatten().fieldErrors;
      expect(errs.linkDrive).toBeDefined();
      expect(errs.judul).toBeDefined();
      expect(errs.deskripsi).toBeDefined();
      expect(errs.berlakuSampai).toBeDefined();
    }
  });

  it("menolak ACC jika salah satu dari 4 poin daftar periksa belum dicentang", () => {
    const incomplete = accDokumenSchema.safeParse({
      tipeAkses: "PUBLIK",
      checklist: {
        metadataBenar: true,
        deskripsiSesuai: true,
        linkBisaDibuka: false,
        izinDriveSesuai: true,
      },
    });
    expect(incomplete.success).toBe(false);

    const complete = accDokumenSchema.safeParse({
      tipeAkses: "PRIVAT_DOSEN",
      checklist: {
        metadataBenar: true,
        deskripsiSesuai: true,
        linkBisaDibuka: true,
        izinDriveSesuai: true,
      },
    });
    expect(complete.success).toBe(true);
  });

  it("menolak kembalikan revisi atau batal ACC tanpa catatan/alasan", () => {
    expect(kembalikanDokumenSchema.safeParse({ catatan: "  " }).success).toBe(false);
    expect(batalAccSchema.safeParse({ alasan: "" }).success).toBe(false);
    expect(normalisasiKataKunci("  A ,  B  ")).toBe("a, b");
  });
});
