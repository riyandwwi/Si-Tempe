import { describe, it, expect } from "vitest";
import {
  jalankanPencarianInMemory,
  type RawDocForSearch,
} from "@/lib/pencarian";
import type { PenggunaAkses } from "@/lib/akses";
import type { KategoriNode } from "@/lib/kategori";

const NOW = new Date("2026-11-21T05:00:00Z");

const KATEGORI: KategoriNode[] = [
  { id: "kat-akademik", nama: "Akademik", indukId: null },
  { id: "kat-perkuliahan", nama: "Perkuliahan", indukId: "kat-akademik" },
  { id: "kat-mahasiswa", nama: "Mahasiswa", indukId: "kat-perkuliahan" },
  { id: "kat-kepegawaian", nama: "Kepegawaian", indukId: null },
];

const DOCS: RawDocForSearch[] = [
  {
    id: "d-pub",
    judul: "Pedoman Penulisan Skripsi 2025",
    linkDrive: "https://drive.google.com/file/d/pub/view",
    deskripsi: "Panduan format skripsi mahasiswa angkatan 2025.",
    kataKunci: "pedoman, skripsi",
    kategoriId: "kat-mahasiswa",
    tahun: 2025,
    berlakuSampai: 2026,
    tipeAkses: "PUBLIK",
    status: "TERBIT",
    uploaderId: "up-1",
    diterbitkan: new Date("2026-11-05T00:00:00Z"),
  },
  {
    id: "d-dosen",
    judul: "SK Pembimbing Tugas Akhir",
    linkDrive: "https://drive.google.com/file/d/dosen/view",
    deskripsi: "Penetapan dosen pembimbing skripsi pada angkatan 2025.",
    kataKunci: "dospem, skripsi",
    kategoriId: "kat-mahasiswa",
    tahun: 2025,
    berlakuSampai: 2028,
    tipeAkses: "PRIVAT_DOSEN",
    status: "TERBIT",
    uploaderId: "up-1",
    diterbitkan: new Date("2026-11-06T00:00:00Z"),
  },
  {
    id: "d-tendik",
    judul: "Prosedur Administrasi Sidang Skripsi",
    linkDrive: "https://drive.google.com/file/d/tendik/view",
    deskripsi: "SOP rahasia internal tendik dengan kata unik XYLOPHONE.",
    kataKunci: "sop, tendik, xylophone",
    kategoriId: "kat-kepegawaian",
    tahun: 2024,
    berlakuSampai: 2027,
    tipeAkses: "PRIVAT_TENDIK",
    status: "TERBIT",
    uploaderId: "up-1",
    diterbitkan: new Date("2026-11-04T00:00:00Z"),
  },
  {
    id: "d-topsecret",
    judul: "Evaluasi Kinerja Dosen Pembimbing Skripsi 2025",
    linkDrive: "https://drive.google.com/file/d/topsecret/view",
    deskripsi: "Audit rahasia pimpinan dengan sandi KRAKEN99.",
    kataKunci: "kraken99, rahasia",
    kategoriId: "kat-kepegawaian",
    tahun: 2025,
    berlakuSampai: null,
    tipeAkses: "TOP_SECRET",
    status: "TERBIT",
    uploaderId: "up-1",
    diterbitkan: new Date("2026-11-07T00:00:00Z"),
  },
  {
    id: "d-draft",
    judul: "Draft Skripsi Rahasia",
    linkDrive: "https://drive.google.com/file/d/draft/view",
    deskripsi: "Belum terbit.",
    kataKunci: "",
    kategoriId: "kat-mahasiswa",
    tahun: 2026,
    berlakuSampai: null,
    tipeAkses: "PUBLIK",
    status: "DRAFT",
    uploaderId: "up-1",
    diterbitkan: null,
  },
];

const DOSEN: PenggunaAkses = {
  id: "u-dosen",
  peran: "PENGGUNA",
  jenis: "DOSEN",
  aktif: true,
  tanggalBerakhir: null,
};

describe("Pencarian F4 & Uji Penerimaan", () => {
  it("Uji #1 & #6: tamu hanya mendapat dokumen PUBLIK dan angka kategori hanya menghitung PUBLIK", () => {
    const res = jalankanPencarianInMemory(
      DOCS,
      KATEGORI,
      null,
      new Set(),
      { q: "skripsi" },
      60,
      NOW
    );

    expect(res.total).toBe(1);
    expect(res.items[0].id).toBe("d-pub");
    const json = JSON.stringify(res);
    expect(json).not.toContain("KRAKEN99");
    expect(json).not.toContain("XYLOPHONE");
    expect(json).not.toContain("drive.google.com/file/d/dosen");

    const katAkademik = res.kategoriTree.find((k) => k.id === "kat-akademik");
    const katKepeg = res.kategoriTree.find((k) => k.id === "kat-kepegawaian");
    expect(katAkademik?.count).toBe(1);
    expect(katKepeg?.count).toBe(0);
  });

  it("Uji #13: 'pembimbing skripsi 2025' menemukan dokumen contoh di deskripsi untuk dosen", () => {
    const res = jalankanPencarianInMemory(
      DOCS,
      KATEGORI,
      DOSEN,
      new Set(),
      { q: "pembimbing skripsi 2025" },
      60,
      NOW
    );

    const ids = res.items.map((i) => i.id);
    expect(ids).toContain("d-dosen");
    expect(ids).toContain("d-topsecret"); // cocok di judul saja, tampil TERBATAS
    const topItem = res.items.find((i) => i.id === "d-topsecret")!;
    expect(topItem.tampilan).toBe("TERBATAS");
    expect("deskripsi" in topItem).toBe(false);
    expect("linkDrive" in topItem).toBe(false);
  });

  it("Uji #5: dosen mencari kata yang hanya ada di deskripsi dokumen TERBATAS tidak mendapat dokumen itu", () => {
    const resTopSecret = jalankanPencarianInMemory(
      DOCS,
      KATEGORI,
      DOSEN,
      new Set(),
      { q: "kraken99" },
      60,
      NOW
    );
    expect(resTopSecret.total).toBe(0);

    const resTendik = jalankanPencarianInMemory(
      DOCS,
      KATEGORI,
      DOSEN,
      new Set(),
      { q: "xylophone" },
      60,
      NOW
    );
    expect(resTendik.total).toBe(0);

    // Jika dosen punya AksesTopSecret, baru ditemukan!
    const resAuthorized = jalankanPencarianInMemory(
      DOCS,
      KATEGORI,
      DOSEN,
      new Set(["d-topsecret"]),
      { q: "kraken99" },
      60,
      NOW
    );
    expect(resAuthorized.total).toBe(1);
    expect(resAuthorized.items[0].tampilan).toBe("LENGKAP");
  });

  it("Uji #14: filter tahun mode=dibuat vs mode=expired memberi hasil berbeda dan benar", () => {
    const dibuat2025 = jalankanPencarianInMemory(
      DOCS,
      KATEGORI,
      DOSEN,
      new Set(),
      { mode: "dibuat", tahun: [2025] },
      60,
      NOW
    );
    const expired2028 = jalankanPencarianInMemory(
      DOCS,
      KATEGORI,
      DOSEN,
      new Set(),
      { mode: "expired", tahun: [2028] },
      60,
      NOW
    );

    expect(dibuat2025.items.map((d) => d.id)).toContain("d-pub");
    expect(dibuat2025.items.map((d) => d.id)).toContain("d-dosen");
    expect(expired2028.items.map((d) => d.id)).toEqual(["d-dosen"]);
  });

  it("Uji #15: memilih kategori induk menyertakan dokumen sub-kategorinya", () => {
    const res = jalankanPencarianInMemory(
      DOCS,
      KATEGORI,
      DOSEN,
      new Set(),
      { kategori: "kat-akademik" },
      60,
      NOW
    );

    const ids = res.items.map((i) => i.id).sort();
    expect(ids).toEqual(["d-dosen", "d-pub"]);
  });
});
