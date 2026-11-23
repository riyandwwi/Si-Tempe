import type {
  Peran,
  JenisAkun,
  TipeAkses,
  StatusDokumen,
} from "@prisma/client";

export type Tampilan = "LENGKAP" | "TERBATAS" | "TIDAK_ADA";

export type StatusBerlaku = "BERLAKU" | "SEGERA_BERAKHIR" | "KEDALUWARSA";

export type Aksi =
  | "CARI_DOKUMEN"
  | "BUAT_DOKUMEN"
  | "EDIT_DOKUMEN"
  | "KIRIM_DOKUMEN"
  | "VERIFIKASI_DOKUMEN"
  | "LAPOR_LINK_MATI"
  | "LIHAT_LAPORAN_LINK"
  | "KELOLA_LAPORAN_LINK"
  | "LIHAT_LOG"
  | "LIHAT_DASHBOARD_ADMIN"
  | "AKSI_DASHBOARD_ADMIN"
  | "KELOLA_AKUN"
  | "KELOLA_KATEGORI"
  | "KELOLA_PENGATURAN"
  | "CEK_JUDUL_MIRIP"
  | "KUNCI_DOKUMEN";

export interface PenggunaAkses {
  id: string;
  peran: Peran;
  jenis: JenisAkun;
  aktif: boolean;
  tanggalBerakhir: Date | null;
}

export interface DokumenAkses {
  id: string;
  status: StatusDokumen;
  tipeAkses: TipeAkses;
  uploaderId: string;
  dikunci?: boolean;
}

export interface DokumenLengkapData extends DokumenAkses {
  judul: string;
  kategoriId: string;
  kategoriJalur: string;
  deskripsi: string;
  linkDrive: string;
  tahun: number;
  berlakuSampai: number | null;
  diterbitkan: Date | null;
  kataKunci?: string;
}

export interface ResponsDokumenLengkap {
  tampilan: "LENGKAP";
  id: string;
  judul: string;
  kategoriId: string;
  kategoriJalur: string;
  tipeAkses: TipeAkses;
  deskripsi: string;
  linkDrive: string;
  tahun: number;
  berlakuSampai: number | null;
  statusBerlaku: StatusBerlaku;
  diterbitkan: Date | null;
}

export interface ResponsDokumenTerbatas {
  tampilan: "TERBATAS";
  id: string;
  judul: string;
  kategoriId: string;
  kategoriJalur: string;
  tipeAkses: TipeAkses;
  pesan: "Anda tidak bisa mengakses dokumen ini";
}

export type ResponsDokumen = ResponsDokumenLengkap | ResponsDokumenTerbatas;

/**
 * Memeriksa apakah akun masih aktif dan (jika punya tanggalBerakhir) belum melewati waktu sekarang.
 */
export function akunMasihAktif(
  user: Pick<PenggunaAkses, "aktif" | "tanggalBerakhir"> | null | undefined,
  now: Date = new Date()
): boolean {
  if (!user) return false;
  if (!user.aktif) return false;
  if (user.tanggalBerakhir && user.tanggalBerakhir.getTime() <= now.getTime()) {
    return false;
  }
  return true;
}

/**
 * Fungsi pusat pemeriksaan izin aksi (Bagian 5 SPEC).
 * Semua endpoint dan Server Action wajib memakai fungsi ini.
 */
export function can(
  user: PenggunaAkses | null | undefined,
  aksi: Aksi,
  dokumen?: Pick<DokumenAkses, "status" | "uploaderId"> | null,
  now: Date = new Date()
): boolean {
  // Pencarian diperbolehkan untuk tamu (hanya PUBLIK) maupun pengguna aktif.
  if (aksi === "CARI_DOKUMEN") {
    if (!user) return true;
    return akunMasihAktif(user, now);
  }

  // Semua aksi lain wajib login dan akun aktif.
  if (!user || !akunMasihAktif(user, now)) {
    return false;
  }

  switch (aksi) {
    case "BUAT_DOKUMEN":
      return user.peran === "UPLOADER";

    case "EDIT_DOKUMEN":
    case "KIRIM_DOKUMEN":
      if (user.peran !== "UPLOADER") return false;
      if (!dokumen) return true;
      return (
        dokumen.uploaderId === user.id &&
        (dokumen.status === "DRAFT" || dokumen.status === "REVISI")
      );

    case "VERIFIKASI_DOKUMEN":
      return user.peran === "ADMIN";

    case "LAPOR_LINK_MATI":
      return true;

    case "LIHAT_LAPORAN_LINK":
      if (
        user.peran === "SUPER_ADMIN" ||
        user.peran === "ADMIN" ||
        user.peran === "REKTOR"
      ) {
        return true;
      }
      if (user.peran === "UPLOADER") {
        if (!dokumen) return true;
        return dokumen.uploaderId === user.id;
      }
      return false;

    case "KELOLA_LAPORAN_LINK":
      if (user.peran === "SUPER_ADMIN" || user.peran === "ADMIN") {
        return true;
      }
      if (user.peran === "UPLOADER") {
        if (!dokumen) return true;
        return dokumen.uploaderId === user.id;
      }
      return false;

    case "LIHAT_LOG":
      if (
        user.peran === "SUPER_ADMIN" ||
        user.peran === "ADMIN" ||
        user.peran === "REKTOR"
      ) {
        return true;
      }
      if (user.peran === "UPLOADER") {
        if (!dokumen) return true;
        return dokumen.uploaderId === user.id;
      }
      return false;

    case "LIHAT_DASHBOARD_ADMIN":
      return (
        user.peran === "SUPER_ADMIN" ||
        user.peran === "ADMIN" ||
        user.peran === "REKTOR"
      );

    case "AKSI_DASHBOARD_ADMIN":
      return user.peran === "SUPER_ADMIN" || user.peran === "ADMIN";

    case "KELOLA_AKUN":
    case "KELOLA_KATEGORI":
    case "KELOLA_PENGATURAN":
      return user.peran === "SUPER_ADMIN";

    case "CEK_JUDUL_MIRIP":
      return user.peran === "UPLOADER" || user.peran === "ADMIN";

    case "KUNCI_DOKUMEN":
      return user.peran === "REKTOR";

    default:
      return false;
  }
}

/**
 * Fungsi keputusan tampilan dokumen (Bagian 6.1 SPEC).
 * `adaDiDaftarBerhak` diisi oleh server dari tabel `AksesTopSecret`.
 */
export function tampilanDokumen(
  user: PenggunaAkses | null | undefined,
  d: Pick<DokumenAkses, "status" | "tipeAkses" | "dikunci">,
  adaDiDaftarBerhak: boolean = false,
  now: Date = new Date()
): Tampilan {
  if (d.status !== "TERBIT" || d.dikunci) return "TIDAK_ADA";
  if (d.tipeAkses === "PUBLIK") return "LENGKAP";
  if (!user || !akunMasihAktif(user, now)) return "TIDAK_ADA";

  switch (d.tipeAkses) {
    case "PRIVAT_DOSEN":
      return user.jenis === "DOSEN" || user.peran === "SPECIAL_GUEST"
        ? "LENGKAP"
        : "TERBATAS";
    case "PRIVAT_TENDIK":
      return user.jenis === "TENDIK" || user.peran === "SPECIAL_GUEST"
        ? "LENGKAP"
        : "TERBATAS";
    case "TOP_SECRET":
      return adaDiDaftarBerhak ? "LENGKAP" : "TERBATAS";
  }
}

/**
 * Menghitung akhir masa berlaku (31 Desember pukul 23:59:59.999 UTC+7 / lokal)
 * dan sisa hari untuk satu tahun `berlakuSampai`.
 */
export function sisaHariBerlaku(
  berlakuSampai: number | null,
  now: Date = new Date()
): number | null {
  if (berlakuSampai === null) return null;
  const akhir = new Date(Date.UTC(berlakuSampai, 11, 31, 16, 59, 59, 999)); // 23:59:59 WIB
  const diffMs = akhir.getTime() - now.getTime();
  return Math.ceil(diffMs / (1000 * 60 * 60 * 24));
}

/**
 * Fungsi seragam status berlaku dokumen di pencarian, detail, dan dashboard (F7).
 */
export function statusBerlaku(
  berlakuSampai: number | null,
  batasSegeraBerakhirHari: number = 60,
  now: Date = new Date()
): StatusBerlaku {
  if (berlakuSampai === null) return "BERLAKU";
  const sisa = sisaHariBerlaku(berlakuSampai, now)!;
  if (sisa < 0) return "KEDALUWARSA";
  if (sisa <= batasSegeraBerakhirHari) return "SEGERA_BERAKHIR";
  return "BERLAKU";
}

/**
 * Membangun payload respons dokumen sesuai bentuk LENGKAP atau TERBATAS.
 * Menjamin kolom sensitif tidak pernah masuk respons untuk TERBATAS.
 */
export function toResponsDokumen(
  d: DokumenLengkapData,
  tampilan: Exclude<Tampilan, "TIDAK_ADA">,
  batasSegeraBerakhirHari: number = 60,
  now: Date = new Date()
): ResponsDokumen {
  if (tampilan === "TERBATAS") {
    return {
      tampilan: "TERBATAS",
      id: d.id,
      judul: d.judul,
      kategoriId: d.kategoriId,
      kategoriJalur: d.kategoriJalur,
      tipeAkses: d.tipeAkses,
      pesan: "Anda tidak bisa mengakses dokumen ini",
    };
  }

  return {
    tampilan: "LENGKAP",
    id: d.id,
    judul: d.judul,
    kategoriId: d.kategoriId,
    kategoriJalur: d.kategoriJalur,
    tipeAkses: d.tipeAkses,
    deskripsi: d.deskripsi,
    linkDrive: d.linkDrive,
    tahun: d.tahun,
    berlakuSampai: d.berlakuSampai,
    statusBerlaku: statusBerlaku(d.berlakuSampai, batasSegeraBerakhirHari, now),
    diterbitkan: d.diterbitkan,
  };
}
