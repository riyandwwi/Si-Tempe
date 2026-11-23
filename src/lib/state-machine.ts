import type { StatusDokumen } from "@prisma/client";

export const LOCK_TIMEOUT_MS = 30 * 60 * 1000; // 30 menit (Bagian 7 SPEC)

const ALLOWED_TRANSITIONS: Record<StatusDokumen, StatusDokumen[]> = {
  DRAFT: ["MENUNGGU"],
  MENUNGGU: ["TERBIT", "REVISI"],
  REVISI: ["MENUNGGU"],
  TERBIT: ["REVISI"],
};

/**
 * Memeriksa apakah perpindahan status dokumen diizinkan oleh state machine (Bagian 7).
 * Perpindahan di luar tabel wajib ditolak dengan HTTP 409.
 */
export function isValidTransition(
  from: StatusDokumen,
  to: StatusDokumen
): boolean {
  return ALLOWED_TRANSITIONS[from].includes(to);
}

export interface LockCheckResult {
  lockedByOther: boolean;
  expired: boolean;
}

/**
 * Memeriksa apakah dokumen sedang dikunci oleh verifikator lain dalam jendela 30 menit.
 */
export function checkVerifierLock(
  diperiksaOleh: string | null,
  diperiksaSejak: Date | null,
  currentAdminId: string,
  now: Date = new Date()
): LockCheckResult {
  if (!diperiksaOleh || diperiksaOleh === currentAdminId) {
    return { lockedByOther: false, expired: false };
  }

  if (!diperiksaSejak) {
    return { lockedByOther: false, expired: true };
  }

  const elapsed = now.getTime() - diperiksaSejak.getTime();
  if (elapsed >= LOCK_TIMEOUT_MS) {
    return { lockedByOther: false, expired: true };
  }

  return { lockedByOther: true, expired: false };
}
