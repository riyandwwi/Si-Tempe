import { describe, it, expect } from "vitest";
import {
  akunMasihAktif,
  can,
  tampilanDokumen,
  toResponsDokumen,
  statusBerlaku,
  type PenggunaAkses,
  type DokumenLengkapData,
} from "@/lib/akses";

const NOW = new Date("2026-11-21T05:00:00Z");

const makeUser = (overrides: Partial<PenggunaAkses> = {}): PenggunaAkses => ({
  id: "u-1",
  peran: "PENGGUNA",
  jenis: "DOSEN",
  aktif: true,
  tanggalBerakhir: null,
  ...overrides,
});

const makeDoc = (
  overrides: Partial<DokumenLengkapData> = {}
): DokumenLengkapData => ({
  id: "doc-1",
  judul: "Penetapan Dosen Pembimbing Skripsi Angkatan 2025",
  kategoriId: "kat-1",
  kategoriJalur: "Akademik › Perkuliahan › Mahasiswa",
  deskripsi: "SK penetapan dosen pembimbing skripsi angkatan 2025.",
  linkDrive: "https://drive.google.com/file/d/abc123/view",
  tahun: 2025,
  berlakuSampai: 2028,
  diterbitkan: new Date("2026-11-01T00:00:00Z"),
  status: "TERBIT",
  tipeAkses: "PUBLIK",
  uploaderId: "u-uploader",
  ...overrides,
});

describe("akunMasihAktif", () => {
  it("menolak null, akun nonaktif, dan Special Guest yang tanggalBerakhir-nya sudah lewat", () => {
    expect(akunMasihAktif(null, NOW)).toBe(false);
    expect(akunMasihAktif(makeUser({ aktif: false }), NOW)).toBe(false);

    const expiredGuest = makeUser({
      peran: "SPECIAL_GUEST",
      jenis: "LAINNYA",
      tanggalBerakhir: new Date("2026-11-20T00:00:00Z"),
    });
    expect(akunMasihAktif(expiredGuest, NOW)).toBe(false);

    const activeGuest = makeUser({
      peran: "SPECIAL_GUEST",
      jenis: "LAINNYA",
      tanggalBerakhir: new Date("2026-11-28T00:00:00Z"),
    });
    expect(akunMasihAktif(activeGuest, NOW)).toBe(true);
  });
});

describe("tampilanDokumen (Bagian 6.1)", () => {
  it("dokumen belum TERBIT selalu TIDAK_ADA", () => {
    const dosen = makeUser({ jenis: "DOSEN" });
    expect(
      tampilanDokumen(dosen, makeDoc({ status: "DRAFT", tipeAkses: "PUBLIK" }), false, NOW)
    ).toBe("TIDAK_ADA");
    expect(
      tampilanDokumen(dosen, makeDoc({ status: "MENUNGGU", tipeAkses: "PUBLIK" }), false, NOW)
    ).toBe("TIDAK_ADA");
    expect(
      tampilanDokumen(dosen, makeDoc({ status: "REVISI", tipeAkses: "PUBLIK" }), false, NOW)
    ).toBe("TIDAK_ADA");
  });

  it("tamu hanya melihat PUBLIK LENGKAP; non-publik TIDAK_ADA", () => {
    expect(tampilanDokumen(null, makeDoc({ tipeAkses: "PUBLIK" }), false, NOW)).toBe("LENGKAP");
    expect(tampilanDokumen(null, makeDoc({ tipeAkses: "PRIVAT_DOSEN" }), false, NOW)).toBe("TIDAK_ADA");
    expect(tampilanDokumen(null, makeDoc({ tipeAkses: "PRIVAT_TENDIK" }), false, NOW)).toBe("TIDAK_ADA");
    expect(tampilanDokumen(null, makeDoc({ tipeAkses: "TOP_SECRET" }), false, NOW)).toBe("TIDAK_ADA");
  });

  it("dosen melihat PUBLIK & PRIVAT_DOSEN LENGKAP; PRIVAT_TENDIK & TOP_SECRET (tanpa hak) TERBATAS", () => {
    const dosen = makeUser({ jenis: "DOSEN" });
    expect(tampilanDokumen(dosen, makeDoc({ tipeAkses: "PUBLIK" }), false, NOW)).toBe("LENGKAP");
    expect(tampilanDokumen(dosen, makeDoc({ tipeAkses: "PRIVAT_DOSEN" }), false, NOW)).toBe("LENGKAP");
    expect(tampilanDokumen(dosen, makeDoc({ tipeAkses: "PRIVAT_TENDIK" }), false, NOW)).toBe("TERBATAS");
    expect(tampilanDokumen(dosen, makeDoc({ tipeAkses: "TOP_SECRET" }), false, NOW)).toBe("TERBATAS");
    expect(tampilanDokumen(dosen, makeDoc({ tipeAkses: "TOP_SECRET" }), true, NOW)).toBe("LENGKAP");
  });

  it("tendik melihat PUBLIK & PRIVAT_TENDIK LENGKAP; PRIVAT_DOSEN & TOP_SECRET (tanpa hak) TERBATAS", () => {
    const tendik = makeUser({ jenis: "TENDIK" });
    expect(tampilanDokumen(tendik, makeDoc({ tipeAkses: "PUBLIK" }), false, NOW)).toBe("LENGKAP");
    expect(tampilanDokumen(tendik, makeDoc({ tipeAkses: "PRIVAT_TENDIK" }), false, NOW)).toBe("LENGKAP");
    expect(tampilanDokumen(tendik, makeDoc({ tipeAkses: "PRIVAT_DOSEN" }), false, NOW)).toBe("TERBATAS");
    expect(tampilanDokumen(tendik, makeDoc({ tipeAkses: "TOP_SECRET" }), false, NOW)).toBe("TERBATAS");
  });

  it("SPECIAL_GUEST aktif melihat PUBLIK, PRIVAT_DOSEN, PRIVAT_TENDIK LENGKAP; TOP_SECRET sesuai AksesTopSecret", () => {
    const guest = makeUser({
      peran: "SPECIAL_GUEST",
      jenis: "LAINNYA",
      tanggalBerakhir: new Date("2026-11-28T00:00:00Z"),
    });
    expect(tampilanDokumen(guest, makeDoc({ tipeAkses: "PRIVAT_DOSEN" }), false, NOW)).toBe("LENGKAP");
    expect(tampilanDokumen(guest, makeDoc({ tipeAkses: "PRIVAT_TENDIK" }), false, NOW)).toBe("LENGKAP");
    expect(tampilanDokumen(guest, makeDoc({ tipeAkses: "TOP_SECRET" }), false, NOW)).toBe("TERBATAS");
    expect(tampilanDokumen(guest, makeDoc({ tipeAkses: "TOP_SECRET" }), true, NOW)).toBe("LENGKAP");
  });

  it("SPECIAL_GUEST kedaluwarsa diperlakukan seperti tamu (non-publik TIDAK_ADA)", () => {
    const expiredGuest = makeUser({
      peran: "SPECIAL_GUEST",
      jenis: "LAINNYA",
      tanggalBerakhir: new Date("2026-11-20T00:00:00Z"),
    });
    expect(tampilanDokumen(expiredGuest, makeDoc({ tipeAkses: "PUBLIK" }), false, NOW)).toBe("LENGKAP");
    expect(tampilanDokumen(expiredGuest, makeDoc({ tipeAkses: "PRIVAT_DOSEN" }), false, NOW)).toBe("TIDAK_ADA");
    expect(tampilanDokumen(expiredGuest, makeDoc({ tipeAkses: "TOP_SECRET" }), true, NOW)).toBe("TIDAK_ADA");
  });
});

describe("toResponsDokumen (Keamanan anti-kebocoran TERBATAS)", () => {
  it("respons TERBATAS tidak pernah memuat deskripsi, linkDrive, tahun, atau berlakuSampai", () => {
    const doc = makeDoc({ tipeAkses: "TOP_SECRET" });
    const res = toResponsDokumen(doc, "TERBATAS", 60, NOW);
    const json = JSON.stringify(res);

    expect(res.tampilan).toBe("TERBATAS");
    expect(res.judul).toBe(doc.judul);
    expect("deskripsi" in res).toBe(false);
    expect("linkDrive" in res).toBe(false);
    expect("tahun" in res).toBe(false);
    expect("berlakuSampai" in res).toBe(false);
    expect(json).not.toContain(doc.deskripsi);
    expect(json).not.toContain(doc.linkDrive);
  });

  it("respons LENGKAP memuat seluruh metadata termasuk linkDrive dan statusBerlaku", () => {
    const doc = makeDoc({ tipeAkses: "PRIVAT_DOSEN", berlakuSampai: 2028 });
    const res = toResponsDokumen(doc, "LENGKAP", 60, NOW);
    expect(res.tampilan).toBe("LENGKAP");
    if (res.tampilan === "LENGKAP") {
      expect(res.deskripsi).toBe(doc.deskripsi);
      expect(res.linkDrive).toBe(doc.linkDrive);
      expect(res.statusBerlaku).toBe("BERLAKU");
    }
  });
});

describe("can() matriks RBAC (Bagian 5)", () => {
  const superAdmin = makeUser({ id: "sa", peran: "SUPER_ADMIN", jenis: "TENDIK" });
  const admin = makeUser({ id: "adm", peran: "ADMIN", jenis: "TENDIK" });
  const uploader = makeUser({ id: "up1", peran: "UPLOADER", jenis: "TENDIK" });
  const uploaderLain = makeUser({ id: "up2", peran: "UPLOADER", jenis: "TENDIK" });
  const rektor = makeUser({ id: "rek", peran: "REKTOR", jenis: "DOSEN" });
  const pengguna = makeUser({ id: "usr", peran: "PENGGUNA", jenis: "DOSEN" });
  const guest = makeUser({
    id: "gst",
    peran: "SPECIAL_GUEST",
    jenis: "LAINNYA",
    tanggalBerakhir: new Date("2026-11-28T00:00:00Z"),
  });

  it("hanya UPLOADER pemilik pada status DRAFT/REVISI yang boleh edit/kirim dokumen", () => {
    const draftOwn = { status: "DRAFT" as const, uploaderId: "up1" };
    const revisiOwn = { status: "REVISI" as const, uploaderId: "up1" };
    const menungguOwn = { status: "MENUNGGU" as const, uploaderId: "up1" };
    const terbitOwn = { status: "TERBIT" as const, uploaderId: "up1" };

    expect(can(uploader, "EDIT_DOKUMEN", draftOwn, NOW)).toBe(true);
    expect(can(uploader, "EDIT_DOKUMEN", revisiOwn, NOW)).toBe(true);
    expect(can(uploader, "EDIT_DOKUMEN", menungguOwn, NOW)).toBe(false);
    expect(can(uploader, "EDIT_DOKUMEN", terbitOwn, NOW)).toBe(false);
    expect(can(uploaderLain, "EDIT_DOKUMEN", draftOwn, NOW)).toBe(false);
    expect(can(admin, "EDIT_DOKUMEN", draftOwn, NOW)).toBe(false);
    expect(can(superAdmin, "EDIT_DOKUMEN", draftOwn, NOW)).toBe(false);
  });

  it("hanya ADMIN yang boleh verifikasi dokumen", () => {
    expect(can(admin, "VERIFIKASI_DOKUMEN", null, NOW)).toBe(true);
    expect(can(superAdmin, "VERIFIKASI_DOKUMEN", null, NOW)).toBe(false);
    expect(can(uploader, "VERIFIKASI_DOKUMEN", null, NOW)).toBe(false);
    expect(can(rektor, "VERIFIKASI_DOKUMEN", null, NOW)).toBe(false);
  });

  it("REKTOR hanya boleh melihat dashboard/log/laporan, ditolak untuk semua aksi ubah", () => {
    expect(can(rektor, "LIHAT_DASHBOARD_ADMIN", null, NOW)).toBe(true);
    expect(can(rektor, "LIHAT_LOG", null, NOW)).toBe(true);
    expect(can(rektor, "LIHAT_LAPORAN_LINK", null, NOW)).toBe(true);
    expect(can(rektor, "AKSI_DASHBOARD_ADMIN", null, NOW)).toBe(false);
    expect(can(rektor, "KELOLA_LAPORAN_LINK", null, NOW)).toBe(false);
    expect(can(rektor, "KELOLA_AKUN", null, NOW)).toBe(false);
    expect(can(rektor, "KELOLA_KATEGORI", null, NOW)).toBe(false);
    expect(can(rektor, "VERIFIKASI_DOKUMEN", null, NOW)).toBe(false);
  });

  it("hanya SUPER_ADMIN yang boleh kelola akun, kategori, dan pengaturan", () => {
    expect(can(superAdmin, "KELOLA_AKUN", null, NOW)).toBe(true);
    expect(can(superAdmin, "KELOLA_KATEGORI", null, NOW)).toBe(true);
    expect(can(superAdmin, "KELOLA_PENGATURAN", null, NOW)).toBe(true);
    expect(can(admin, "KELOLA_AKUN", null, NOW)).toBe(false);
    expect(can(admin, "KELOLA_KATEGORI", null, NOW)).toBe(false);
  });

  it("SPECIAL_GUEST hanya bisa cari dokumen dan lapor link mati", () => {
    expect(can(guest, "CARI_DOKUMEN", null, NOW)).toBe(true);
    expect(can(guest, "LAPOR_LINK_MATI", null, NOW)).toBe(true);
    expect(can(guest, "BUAT_DOKUMEN", null, NOW)).toBe(false);
    expect(can(guest, "LIHAT_DASHBOARD_ADMIN", null, NOW)).toBe(false);
    expect(can(guest, "LIHAT_LOG", null, NOW)).toBe(false);
  });

  it("PENGGUNA biasa tidak melihat log atau dashboard", () => {
    expect(can(pengguna, "LIHAT_LOG", null, NOW)).toBe(false);
    expect(can(pengguna, "LIHAT_DASHBOARD_ADMIN", null, NOW)).toBe(false);
    expect(can(pengguna, "LAPOR_LINK_MATI", null, NOW)).toBe(true);
  });
});

describe("statusBerlaku (F7)", () => {
  it("menghitung BERLAKU, SEGERA_BERAKHIR, dan KEDALUWARSA secara seragam", () => {
    // NOW = 21 Nov 2026 -> sisa ke 31 Des 2026 = 41 hari (<= 60)
    expect(statusBerlaku(null, 60, NOW)).toBe("BERLAKU");
    expect(statusBerlaku(2028, 60, NOW)).toBe("BERLAKU");
    expect(statusBerlaku(2026, 60, NOW)).toBe("SEGERA_BERAKHIR");
    expect(statusBerlaku(2025, 60, NOW)).toBe("KEDALUWARSA");
  });
});
