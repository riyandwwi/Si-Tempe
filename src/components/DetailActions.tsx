"use client";

import { useState } from "react";

export function DetailActions({
  dokumenId,
  linkDrive,
  isLoggedIn,
}: {
  dokumenId: string;
  linkDrive: string;
  isLoggedIn: boolean;
}) {
  const [copied, setCopied] = useState(false);
  const [reportState, setReportState] = useState<{
    loading: boolean;
    message: string | null;
    isError: boolean;
  }>({ loading: false, message: null, isError: false });

  async function handleCopyLink() {
    // F11: menyalin URL halaman detail (/dokumen/[id]), BUKAN linkDrive.
    const detailUrl = `${window.location.origin}/dokumen/${dokumenId}`;
    try {
      await navigator.clipboard.writeText(detailUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    } catch {
      window.prompt("Salin tautan dokumen:", detailUrl);
    }
  }

  async function handleLaporLinkMati() {
    setReportState({ loading: true, message: null, isError: false });
    try {
      const res = await fetch(`/api/dokumen/${dokumenId}/laporan`, {
        method: "POST",
      });
      const data = await res.json();
      if (!res.ok) {
        setReportState({
          loading: false,
          message: data.error ?? "Gagal mengirim laporan link mati",
          isError: true,
        });
        return;
      }
      setReportState({
        loading: false,
        message: "Laporan link mati telah dikirim ke uploader dan administrator.",
        isError: false,
      });
    } catch {
      setReportState({
        loading: false,
        message: "Terjadi kesalahan jaringan saat melapor.",
        isError: true,
      });
    }
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
      <div style={{ display: "flex", flexWrap: "wrap", gap: 12, alignItems: "center" }}>
        <a
          href={linkDrive}
          target="_blank"
          rel="noopener noreferrer"
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: 8,
            minHeight: 50,
            padding: "0 26px",
            background: "#0E6B4D",
            color: "#FFFFFF",
            borderRadius: 10,
            fontSize: 16,
            fontWeight: 600,
            textDecoration: "none",
          }}
        >
          Buka di Google Drive ↗
        </a>

        <button
          type="button"
          onClick={() => void handleCopyLink()}
          style={{
            minHeight: 50,
            padding: "0 20px",
            border: "1.5px solid #9FB0A5",
            borderRadius: 10,
            background: "#FFFFFF",
            color: "#14221B",
            font: "inherit",
            fontSize: 15,
            fontWeight: 600,
            cursor: "pointer",
          }}
        >
          {copied ? "Tautan disalin" : "Salin tautan"}
        </button>

        {isLoggedIn ? (
          <button
            type="button"
            disabled={reportState.loading}
            onClick={() => void handleLaporLinkMati()}
            style={{
              minHeight: 50,
              padding: "0 20px",
              border: "1.5px solid #9FB0A5",
              borderRadius: 10,
              background: "#FFFFFF",
              color: "#14221B",
              font: "inherit",
              fontSize: 15,
              fontWeight: 600,
              cursor: reportState.loading ? "wait" : "pointer",
            }}
          >
            {reportState.loading ? "Melaporkan..." : "Laporkan link mati"}
          </button>
        ) : null}
      </div>

      {reportState.message ? (
        <div
          role={reportState.isError ? "alert" : "status"}
          style={{
            background: reportState.isError ? "#FCE9E6" : "#DDF1E5",
            color: reportState.isError ? "#7A1A10" : "#0B5133",
            borderRadius: 10,
            padding: "10px 14px",
            fontSize: 14,
            fontWeight: 500,
          }}
        >
          {reportState.message}
        </div>
      ) : null}

      <span style={{ fontSize: 13, color: "#55645B" }}>
        Laporan hanya dilihat administrator dan uploader dokumen ini. Link hanya
        terlihat oleh pengguna yang berhak.
      </span>
    </div>
  );
}
