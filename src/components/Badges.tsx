import type { StatusDokumen, TipeAkses } from "@prisma/client";
import type { StatusBerlaku } from "@/lib/akses";

export const LABEL_TIPE_AKSES: Record<TipeAkses, string> = {
  PUBLIK: "Publik",
  PRIVAT_DOSEN: "Privat Dosen",
  PRIVAT_TENDIK: "Privat Tendik",
  TOP_SECRET: "Top Secret",
};

const STYLE_TIPE: Record<TipeAkses, { bg: string; fg: string }> = {
  PUBLIK: { bg: "#DDF1E5", fg: "#0B5133" },
  PRIVAT_DOSEN: { bg: "#E8EEF9", fg: "#1B3D7A" },
  PRIVAT_TENDIK: { bg: "#F3E8D6", fg: "#5A3A00" },
  TOP_SECRET: { bg: "#14221B", fg: "#FFFFFF" },
};

export function TipeAksesBadge({ tipe }: { tipe: TipeAkses }) {
  const s = STYLE_TIPE[tipe];
  return (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 6,
        background: s.bg,
        color: s.fg,
        fontSize: 12,
        fontWeight: 600,
        padding: "4px 10px",
        borderRadius: 999,
      }}
    >
      {LABEL_TIPE_AKSES[tipe]}
    </span>
  );
}

const STYLE_STATUS_DOK: Record<
  StatusDokumen,
  { label: string; bg: string; fg: string }
> = {
  DRAFT: { label: "Draft", bg: "#EEF2EF", fg: "#34433A" },
  MENUNGGU: { label: "Menunggu verifikasi", bg: "#E8EEF9", fg: "#1B3D7A" },
  REVISI: { label: "Perlu revisi", bg: "#FCE4B8", fg: "#5E3700" },
  TERBIT: { label: "Terbit", bg: "#DDF1E5", fg: "#0B5133" },
};

export function StatusDokumenBadge({ status }: { status: StatusDokumen }) {
  const s = STYLE_STATUS_DOK[status];
  return (
    <span
      style={{
        background: s.bg,
        color: s.fg,
        fontSize: 12,
        fontWeight: 600,
        padding: "3px 10px",
        borderRadius: 999,
      }}
    >
      {s.label}
    </span>
  );
}

const STYLE_BERLAKU: Record<
  StatusBerlaku,
  { label: string; bg: string; fg: string }
> = {
  BERLAKU: { label: "Berlaku", bg: "#DDF1E5", fg: "#0B5133" },
  SEGERA_BERAKHIR: { label: "Segera berakhir", bg: "#FFEFCC", fg: "#6E4300" },
  KEDALUWARSA: { label: "Sudah kedaluwarsa", bg: "#FCE9E6", fg: "#7A1A10" },
};

export function StatusBerlakuBadge({ status }: { status: StatusBerlaku }) {
  const s = STYLE_BERLAKU[status];
  return (
    <span
      style={{
        background: s.bg,
        color: s.fg,
        fontSize: 12,
        fontWeight: 600,
        padding: "3px 10px",
        borderRadius: 999,
      }}
    >
      {s.label}
    </span>
  );
}
