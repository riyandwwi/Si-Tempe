import { describe, it, expect } from "vitest";
import {
  cariJudulMiripInMemory,
  ekstrakKataJudul,
  type KandidatJudul,
} from "@/lib/judul-mirip";

const KANDIDAT: KandidatJudul[] = [
  {
    id: "d-1",
    judul: "Penetapan Dosen Pembimbing Skripsi Angkatan 2024",
    tahun: 2024,
    tipeAkses: "PRIVAT_DOSEN",
    status: "TERBIT",
  },
  {
    id: "d-2",
    judul: "Penetapan Dosen Pembimbing Skripsi Rahasia 2025",
    tahun: 2025,
    tipeAkses: "TOP_SECRET",
    status: "TERBIT",
  },
  {
    id: "d-3",
    judul: "Kalender Akademik Tahun Ajaran 2025",
    tahun: 2025,
    tipeAkses: "PUBLIK",
    status: "TERBIT",
  },
];

describe("Peringatan judul mirip (F9 & Uji #17)", () => {
  it("mengabaikan kata di bawah 3 huruf", () => {
    expect(ekstrakKataJudul("SK di UKM & ITBMP 2025")).toEqual([
      "ukm",
      "itbmp",
      "2025",
    ]);
  });

  it("Uji #17: respons untuk UPLOADER tidak pernah memuat judul dokumen TOP_SECRET", () => {
    const res = cariJudulMiripInMemory(
      "Penetapan Dosen Pembimbing Skripsi Angkatan 2025",
      KANDIDAT,
      "UPLOADER"
    );

    const json = JSON.stringify(res);
    expect(res.mirip).toHaveLength(1);
    expect(res.mirip[0].judul).toBe(
      "Penetapan Dosen Pembimbing Skripsi Angkatan 2024"
    );
    expect(res.jumlahTerbatas).toBe(1);
    expect(json).not.toContain("Rahasia 2025");
  });

  it("respons untuk ADMIN memuat daftar lengkap termasuk TOP_SECRET", () => {
    const res = cariJudulMiripInMemory(
      "Penetapan Dosen Pembimbing Skripsi Angkatan 2025",
      KANDIDAT,
      "ADMIN"
    );

    expect(res.mirip).toHaveLength(2);
    expect(res.jumlahTerbatas).toBe(0);
    expect(res.mirip.map((m) => m.judul)).toContain(
      "Penetapan Dosen Pembimbing Skripsi Rahasia 2025"
    );
  });
});
