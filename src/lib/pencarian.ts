import type { TipeAkses } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import {
  akunMasihAktif,
  statusBerlaku,
  tampilanDokumen,
  toResponsDokumen,
  type PenggunaAkses,
  type ResponsDokumen,
  type StatusBerlaku,
} from "@/lib/akses";
import { buildKategoriHelpers, type KategoriNode } from "@/lib/kategori";

export type ModeTahun = "dibuat" | "expired";
export type UrutCari = "relevan" | "terbaru" | "judul";

export interface CariParams {
  q?: string;
  tahun?: number[];
  mode?: ModeTahun;
  status?: StatusBerlaku[];
  kategori?: string;
  urut?: UrutCari;
  hal?: number;
}

export interface KategoriCountNode {
  id: string;
  nama: string;
  indukId: string | null;
  jalur: string;
  count: number;
  depth: number;
}

export interface HasilCari {
  items: ResponsDokumen[];
  total: number;
  halaman: number;
  perHalaman: number;
  totalHalaman: number;
  facetTahun: { tahun: number; count: number }[];
  facetStatus: Record<StatusBerlaku, number>;
  kategoriTree: KategoriCountNode[];
}

export const PER_HALAMAN = 20;

export function pecahKataKunci(q: string | undefined): string[] {
  if (!q) return [];
  return q
    .trim()
    .toLowerCase()
    .split(/\s+/)
    .filter((w) => w.length > 0);
}

export interface RawDocForSearch {
  id: string;
  judul: string;
  linkDrive: string;
  deskripsi: string;
  kataKunci: string;
  kategoriId: string;
  tahun: number;
  berlakuSampai: number | null;
  tipeAkses: TipeAkses;
  status: "DRAFT" | "MENUNGGU" | "REVISI" | "TERBIT";
  uploaderId: string;
  diterbitkan: Date | null;
}

/**
 * Mesin pencarian dan perhitungan facet murni (dapat diuji unit test tanpa DB).
 * Menerapkan seluruh aturan keamanan F4 & Bagian 6:
 * - Hanya TERBIT; tamu hanya PUBLIK
 * - Kelompok LENGKAP mencocokkan judul, deskripsi, atau kataKunci
 * - Kelompok TERBATAS mencocokkan HANYA judul atau nama kategori
 * - Respons TERBATAS tidak pernah memuat deskripsi, linkDrive, tahun, berlakuSampai
 */
export function jalankanPencarianInMemory(
  docs: RawDocForSearch[],
  kategoriList: KategoriNode[],
  user: PenggunaAkses | null,
  topSecretAllowedIds: Set<string>,
  params: CariParams,
  batasSegeraBerakhirHari: number = 60,
  now: Date = new Date()
): HasilCari {
  const words = pecahKataKunci(params.q);
  const mode: ModeTahun = params.mode === "expired" ? "expired" : "dibuat";
  const urut: UrutCari =
    params.urut === "terbaru" || params.urut === "judul"
      ? params.urut
      : words.length > 0
      ? "relevan"
      : "terbaru";
  const halaman = Math.max(1, Math.floor(params.hal ?? 1));

  const katHelpers = buildKategoriHelpers(kategoriList);
  const selectedKatIds = params.kategori
    ? new Set(katHelpers.getDescendantIds(params.kategori))
    : null;
  const activeUser = user && akunMasihAktif(user, now) ? user : null;

  // Langkah 1 & 2: saring dokumen TERBIT + hak akses + pencocokan kata kunci
  type MatchedEntry = {
    doc: RawDocForSearch;
    tampilan: "LENGKAP" | "TERBATAS";
    kategoriJalur: string;
    statusBerlakuVal: StatusBerlaku;
    judulMatchCount: number;
  };

  const keywordMatched: MatchedEntry[] = [];

  for (const doc of docs) {
    const hasTopSecret = topSecretAllowedIds.has(doc.id);
    const tampilan = tampilanDokumen(activeUser, doc, hasTopSecret, now);
    if (tampilan === "TIDAK_ADA") continue;

    const kategoriJalur = katHelpers.getPath(doc.kategoriId);
    const judulLower = doc.judul.toLowerCase();

    let cocok = true;
    let judulMatchCount = 0;

    if (words.length > 0) {
      if (tampilan === "LENGKAP") {
        const haystack = `${judulLower} ${doc.deskripsi.toLowerCase()} ${doc.kataKunci.toLowerCase()}`;
        for (const w of words) {
          if (!haystack.includes(w)) {
            cocok = false;
            break;
          }
          if (judulLower.includes(w)) judulMatchCount += 1;
        }
      } else {
        // TERBATAS: HANYA judul dan nama kategori (F4 poin 3)
        const katLower = kategoriJalur.toLowerCase();
        const restrictedHaystack = `${judulLower} ${katLower}`;
        for (const w of words) {
          if (!restrictedHaystack.includes(w)) {
            cocok = false;
            break;
          }
          if (judulLower.includes(w)) judulMatchCount += 1;
        }
      }
    }

    if (!cocok) continue;

    keywordMatched.push({
      doc,
      tampilan,
      kategoriJalur,
      statusBerlakuVal: statusBerlaku(
        doc.berlakuSampai,
        batasSegeraBerakhirHari,
        now
      ),
      judulMatchCount,
    });
  }

  // Filter helper
  const tahunSet =
    params.tahun && params.tahun.length > 0 ? new Set(params.tahun) : null;
  const statusSet =
    params.status && params.status.length > 0 ? new Set(params.status) : null;

  function matchesTahun(e: MatchedEntry): boolean {
    if (!tahunSet) return true;
    const val = mode === "expired" ? e.doc.berlakuSampai : e.doc.tahun;
    return val !== null && tahunSet.has(val);
  }

  function matchesStatus(e: MatchedEntry): boolean {
    if (!statusSet) return true;
    return statusSet.has(e.statusBerlakuVal);
  }

  function matchesKategori(e: MatchedEntry): boolean {
    if (!selectedKatIds) return true;
    return selectedKatIds.has(e.doc.kategoriId);
  }

  // Hitung facet Tahun (memakai syarat hak akses + q + status + kategori)
  const tahunCounts = new Map<number, number>();
  for (const e of keywordMatched) {
    if (!matchesStatus(e) || !matchesKategori(e)) continue;
    const val = mode === "expired" ? e.doc.berlakuSampai : e.doc.tahun;
    if (val !== null) {
      tahunCounts.set(val, (tahunCounts.get(val) ?? 0) + 1);
    }
  }
  const facetTahun = Array.from(tahunCounts.entries())
    .map(([tahun, count]) => ({ tahun, count }))
    .sort((a, b) => b.tahun - a.tahun);

  // Hitung facet Status (memakai syarat hak akses + q + tahun + kategori)
  const facetStatus: Record<StatusBerlaku, number> = {
    BERLAKU: 0,
    SEGERA_BERAKHIR: 0,
    KEDALUWARSA: 0,
  };
  for (const e of keywordMatched) {
    if (!matchesTahun(e) || !matchesKategori(e)) continue;
    facetStatus[e.statusBerlakuVal] += 1;
  }

  // Hitung angka kategori (termasuk turunan) memakai syarat hak akses + q + tahun + status
  const katBaseMatched = keywordMatched.filter(
    (e) => matchesTahun(e) && matchesStatus(e)
  );
  const directKatCount = new Map<string, number>();
  for (const e of katBaseMatched) {
    directKatCount.set(
      e.doc.kategoriId,
      (directKatCount.get(e.doc.kategoriId) ?? 0) + 1
    );
  }

  // Bangun pohon kategori berurut (DFS) dengan count mencakup seluruh turunan
  const roots = kategoriList
    .filter((k) => !k.indukId)
    .sort((a, b) => a.nama.localeCompare(b.nama, "id"));

  const kategoriTree: KategoriCountNode[] = [];
  function visit(node: KategoriNode, depth: number) {
    const descIds = katHelpers.getDescendantIds(node.id);
    let count = 0;
    for (const id of descIds) {
      count += directKatCount.get(id) ?? 0;
    }
    kategoriTree.push({
      id: node.id,
      nama: node.nama,
      indukId: node.indukId,
      jalur: katHelpers.getPath(node.id),
      count,
      depth,
    });
    const childIds = katHelpers.childrenMap.get(node.id) ?? [];
    const childNodes = childIds
      .map((id) => katHelpers.byId.get(id)!)
      .filter(Boolean)
      .sort((a, b) => a.nama.localeCompare(b.nama, "id"));
    for (const child of childNodes) {
      visit(child, depth + 1);
    }
  }
  for (const root of roots) {
    visit(root, 0);
  }

  // Hasil akhir setelah semua filter diterapkan
  const filtered = keywordMatched.filter(
    (e) => matchesTahun(e) && matchesStatus(e) && matchesKategori(e)
  );

  // Urutkan
  filtered.sort((a, b) => {
    if (urut === "judul") {
      return a.doc.judul.localeCompare(b.doc.judul, "id");
    }
    if (urut === "relevan" && words.length > 0) {
      if (b.judulMatchCount !== a.judulMatchCount) {
        return b.judulMatchCount - a.judulMatchCount;
      }
    }
    const tA = a.doc.diterbitkan?.getTime() ?? 0;
    const tB = b.doc.diterbitkan?.getTime() ?? 0;
    return tB - tA;
  });

  const total = filtered.length;
  const totalHalaman = Math.max(1, Math.ceil(total / PER_HALAMAN));
  const safeHal = Math.min(halaman, totalHalaman);
  const start = (safeHal - 1) * PER_HALAMAN;
  const pageSlice = filtered.slice(start, start + PER_HALAMAN);

  // Bangun respons aman: TERBATAS tidak pernah memuat deskripsi/linkDrive/tahun/berlakuSampai
  const items: ResponsDokumen[] = pageSlice.map((e) =>
    toResponsDokumen(
      {
        ...e.doc,
        kategoriJalur: e.kategoriJalur,
      },
      e.tampilan,
      batasSegeraBerakhirHari,
      now
    )
  );

  return {
    items,
    total,
    halaman: safeHal,
    perHalaman: PER_HALAMAN,
    totalHalaman,
    facetTahun,
    facetStatus,
    kategoriTree,
  };
}

/**
 * Menjalankan pencarian dokumen langsung dari PostgreSQL dengan Prisma (parameterized).
 */
export async function cariDokumenServer(
  user: PenggunaAkses | null,
  params: CariParams
): Promise<HasilCari> {
  const activeUser = user && akunMasihAktif(user) ? user : null;

  const [allKat, setting, topSecretRows] = await Promise.all([
    prisma.kategori.findMany({ select: { id: true, nama: true, indukId: true } }),
    prisma.pengaturan.findUnique({ where: { kunci: "batas_segera_berakhir_hari" } }),
    activeUser
      ? prisma.aksesTopSecret.findMany({
          where: { penggunaId: activeUser.id },
          select: { dokumenId: true },
        })
      : Promise.resolve([]),
  ]);

  const batasHari = Number(setting?.nilai ?? 60) || 60;
  const topSecretAllowedIds = new Set(topSecretRows.map((r) => r.dokumenId));

  // Query dasar berparameter: status = TERBIT, tidak dikunci, dan untuk tamu hanya tipeAkses = PUBLIK
  const docs = await prisma.dokumen.findMany({
    where: {
      status: "TERBIT",
      dikunci: false,
      ...(activeUser ? {} : { tipeAkses: "PUBLIK" }),
    },
    select: {
      id: true,
      judul: true,
      linkDrive: true,
      deskripsi: true,
      kataKunci: true,
      kategoriId: true,
      tahun: true,
      berlakuSampai: true,
      tipeAkses: true,
      status: true,
      uploaderId: true,
      diterbitkan: true,
    },
  });

  return jalankanPencarianInMemory(
    docs,
    allKat,
    activeUser,
    topSecretAllowedIds,
    params,
    batasHari
  );
}

/**
 * Parse query string dari URL `/cari` atau `/api/cari`.
 */
export function parseCariSearchParams(
  raw: Record<string, string | string[] | undefined>
): CariParams {
  const getOne = (k: string): string | undefined => {
    const v = raw[k];
    return Array.isArray(v) ? v[0] : v;
  };
  const getMany = (k: string): string[] => {
    const v = raw[k];
    if (!v) return [];
    const arr = Array.isArray(v) ? v : [v];
    return arr
      .flatMap((s) => s.split(","))
      .map((s) => s.trim())
      .filter(Boolean);
  };

  const tahun = getMany("tahun")
    .map((s) => Number(s))
    .filter((n) => Number.isInteger(n) && n >= 1900 && n <= 3000);

  const validStatuses = new Set<StatusBerlaku>([
    "BERLAKU",
    "SEGERA_BERAKHIR",
    "KEDALUWARSA",
  ]);
  const status = getMany("status").filter((s): s is StatusBerlaku =>
    validStatuses.has(s as StatusBerlaku)
  );

  const modeRaw = getOne("mode");
  const mode: ModeTahun = modeRaw === "expired" ? "expired" : "dibuat";

  const urutRaw = getOne("urut");
  const urut: UrutCari | undefined =
    urutRaw === "relevan" || urutRaw === "terbaru" || urutRaw === "judul"
      ? urutRaw
      : undefined;

  const halNum = Number(getOne("hal") ?? "1");
  const hal = Number.isInteger(halNum) && halNum > 0 ? halNum : 1;

  return {
    q: getOne("q") ?? "",
    tahun,
    mode,
    status,
    kategori: getOne("kategori") || undefined,
    urut,
    hal,
  };
}
