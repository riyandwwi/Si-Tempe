import type { Prisma } from "@prisma/client";

export const AKSI_LOG = {
  DOKUMEN_DIKIRIM: "DOKUMEN_DIKIRIM",
  DOKUMEN_DIKIRIM_ULANG: "DOKUMEN_DIKIRIM_ULANG",
  DIKEMBALIKAN: "DIKEMBALIKAN",
  ACC_TERBIT: "ACC_TERBIT",
  BATAL_ACC: "BATAL_ACC",
  TIPE_AKSES_DIUBAH: "TIPE_AKSES_DIUBAH",
  LINK_DIPERBAIKI: "LINK_DIPERBAIKI",
  AKUN_DIBUAT: "AKUN_DIBUAT",
  AKUN_DINONAKTIFKAN: "AKUN_DINONAKTIFKAN",
  PERAN_DIUBAH: "PERAN_DIUBAH",
  GUEST_DIBUAT: "GUEST_DIBUAT",
  GUEST_KEDALUWARSA: "GUEST_KEDALUWARSA",
  DOKUMEN_DIKUNCI: "DOKUMEN_DIKUNCI",
  DOKUMEN_DIBUKA_KUNCI: "DOKUMEN_DIBUKA_KUNCI",
} as const;

export type AksiLog = (typeof AKSI_LOG)[keyof typeof AKSI_LOG];

/**
 * Hanya INSERT ke LogAktivitas (F8). Harus dipanggil dalam transaksi yang sama dengan aksinya.
 * Tidak boleh dipakai untuk pembukaan dokumen apa pun, terutama Top Secret.
 */
export async function tulisLog(
  tx: Prisma.TransactionClient,
  data: {
    pelakuId: string | null;
    aksi: AksiLog;
    dokumenId?: string | null;
    rincian?: string | null;
  }
) {
  return tx.logAktivitas.create({
    data: {
      pelakuId: data.pelakuId,
      aksi: data.aksi,
      dokumenId: data.dokumenId ?? null,
      rincian: data.rincian ?? null,
    },
  });
}
