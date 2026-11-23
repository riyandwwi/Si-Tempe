import type { Peran, StatusDokumen, TipeAkses } from "@prisma/client";

export interface KandidatJudul {
  id: string;
  judul: string;
  tahun: number;
  tipeAkses: TipeAkses;
  status: StatusDokumen;
}

export interface HasilJudulMiripUploader {
  mirip: { judul: string; tahun: number }[];
  jumlahTerbatas: number;
}

export interface HasilJudulMiripAdmin {
  mirip: {
    id: string;
    judul: string;
    tahun: number;
    tipeAkses: TipeAkses;
    status: StatusDokumen;
  }[];
  jumlahTerbatas: number;
}

/**
 * Pecah judul menjadi kata unik lowercase dan abaikan kata di bawah 3 huruf (F9).
 */
export function ekstrakKataJudul(judul: string): string[] {
  const tokens = judul
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\s]/gu, " ")
    .split(/\s+/)
    .filter((w) => w.length >= 3);
  return Array.from(new Set(tokens));
}

/**
 * Cari dokumen lain yang judulnya memuat sedikitnya dua pertiga kata input (F9).
 * - Untuk UPLOADER: TOP_SECRET hanya dihitung di `jumlahTerbatas` tanpa judul.
 * - Untuk ADMIN: daftar lengkap termasuk TOP_SECRET.
 */
export function cariJudulMiripInMemory(
  judulInput: string,
  kandidat: KandidatJudul[],
  peran: Extract<Peran, "UPLOADER" | "ADMIN">,
  excludeDokumenId?: string
): HasilJudulMiripUploader | HasilJudulMiripAdmin {
  const words = ekstrakKataJudul(judulInput);
  if (words.length === 0) {
    return { mirip: [], jumlahTerbatas: 0 };
  }

  const minMatches = Math.ceil((words.length * 2) / 3);

  const matched = kandidat.filter((doc) => {
    if (excludeDokumenId && doc.id === excludeDokumenId) return false;
    const judulLower = doc.judul.toLowerCase();
    let count = 0;
    for (const w of words) {
      if (judulLower.includes(w)) count += 1;
    }
    return count >= minMatches;
  });

  if (peran === "ADMIN") {
    return {
      mirip: matched.map((d) => ({
        id: d.id,
        judul: d.judul,
        tahun: d.tahun,
        tipeAkses: d.tipeAkses,
        status: d.status,
      })),
      jumlahTerbatas: 0,
    };
  }

  // UPLOADER: jangan pernah membocorkan judul dokumen TOP_SECRET
  const publikAtauPrivat: { judul: string; tahun: number }[] = [];
  let jumlahTerbatas = 0;

  for (const d of matched) {
    if (d.tipeAkses === "TOP_SECRET") {
      jumlahTerbatas += 1;
    } else {
      publikAtauPrivat.push({ judul: d.judul, tahun: d.tahun });
    }
  }

  return {
    mirip: publikAtauPrivat,
    jumlahTerbatas,
  };
}
