import { describe, it, expect } from "vitest";
import { can, tampilanDokumen, type PenggunaAkses } from "@/lib/akses";
import { tentukanPengingat } from "@/lib/email";
import { createAkunSchema } from "@/lib/validasi";

const NOW = new Date("2026-11-22T05:00:00Z");

describe("Pengingat 60 & 14 hari (F7 & Uji #18)", () => {
  it("Uji #18: email pengingat 60 hari tidak terkirim dua kali untuk dokumen yang sama", () => {
    const first = tentukanPengingat({
      sisaHari: 45,
      pengingat60: false,
      pengingat14: false,
    });
    expect(first).toEqual({ kirim60: true, kirim14: false });

    const second = tentukanPengingat({
      sisaHari: 44,
      pengingat60: true,
      pengingat14: false,
    });
    expect(second).toEqual({ kirim60: false, kirim14: false });

    const onDay10 = tentukanPengingat({
      sisaHari: 10,
      pengingat60: true,
      pengingat14: false,
    });
    expect(onDay10).toEqual({ kirim60: false, kirim14: true });

    const afterDay10 = tentukanPengingat({
      sisaHari: 9,
      pengingat60: true,
      pengingat14: true,
    });
    expect(afterDay10).toEqual({ kirim60: false, kirim14: false });
  });
});

describe("Special Guest validasi (dihapus manual)", () => {
  it("mengizinkan pembuatan akun SPECIAL_GUEST tanpa tanggalBerakhir (dihapus manual)", () => {
    const res = createAkunSchema.safeParse({
      username: "asesor2",
      nama: "Asesor Luar",
      email: "asesor2@tamu.itbmp.ac.id",
      password: "123",
      peran: "SPECIAL_GUEST",
      jenis: "LAINNYA",
      tanggalBerakhir: null,
    });
    expect(res.success).toBe(true);
  });
});

describe("Wewenang khusus REKTOR (Kunci Dokumen & Uji #19)", () => {
  const rektor: PenggunaAkses = {
    id: "rek-1",
    peran: "REKTOR",
    jenis: "DOSEN",
    aktif: true,
    tanggalBerakhir: null,
  };
  const admin: PenggunaAkses = {
    id: "adm-1",
    peran: "ADMIN",
    jenis: "TENDIK",
    aktif: true,
    tanggalBerakhir: null,
  };

  it("hanya REKTOR yang boleh mengunci/membuka kunci dokumen; aksi admin lain tetap ditolak", () => {
    expect(can(rektor, "KUNCI_DOKUMEN", null, NOW)).toBe(true);
    expect(can(admin, "KUNCI_DOKUMEN", null, NOW)).toBe(false);
    expect(can(rektor, "AKSI_DASHBOARD_ADMIN", null, NOW)).toBe(false);
    expect(can(rektor, "KELOLA_AKUN", null, NOW)).toBe(false);
    expect(can(rektor, "VERIFIKASI_DOKUMEN", null, NOW)).toBe(false);
  });

  it("dokumen yang dikunci REKTOR mengembalikan TIDAK_ADA untuk semua pengguna termasuk pemilik AksesTopSecret", () => {
    expect(
      tampilanDokumen(
        rektor,
        { status: "TERBIT", tipeAkses: "PUBLIK", dikunci: true },
        true,
        NOW
      )
    ).toBe("TIDAK_ADA");
    expect(
      tampilanDokumen(
        null,
        { status: "TERBIT", tipeAkses: "PUBLIK", dikunci: true },
        false,
        NOW
      )
    ).toBe("TIDAK_ADA");
  });
});
