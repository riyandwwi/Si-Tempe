"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import type { StatusLaporan } from "@prisma/client";

export interface UploaderLaporanItem {
  id: string;
  status: StatusLaporan;
  dibuatLabel: string;
  dokumen: {
    id: string;
    judul: string;
    linkDrive: string;
  };
}

export function UploaderLaporanList({
  items,
}: {
  items: UploaderLaporanItem[];
}) {
  const router = useRouter();
  const [editingId, setEditingId] = useState<string | null>(null);
  const [linkInput, setLinkInput] = useState("");
  const [feedback, setFeedback] = useState<Record<string, { text: string; isError: boolean }>>({});
  const [busyId, setBusyId] = useState<string | null>(null);

  async function handleCek(id: string) {
    setBusyId(id);
    try {
      const res = await fetch(`/api/laporan/${id}/cek`, { method: "POST" });
      const data = await res.json();
      if (!res.ok) {
        setFeedback((prev) => ({
          ...prev,
          [id]: { text: data.error ?? "Gagal mengecek link", isError: true },
        }));
        return;
      }
      setFeedback((prev) => ({
        ...prev,
        [id]: { text: data.hasil.pesan, isError: !data.hasil.ok },
      }));
      router.refresh();
    } finally {
      setBusyId(null);
    }
  }

  async function handleSimpanLink(id: string, markDone: boolean) {
    setBusyId(id);
    try {
      const res = await fetch(`/api/laporan/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          linkDriveBaru: linkInput.trim() || undefined,
          status: markDone ? "SELESAI" : "SEDANG_DIPERBAIKI",
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setFeedback((prev) => ({
          ...prev,
          [id]: { text: data.error ?? "Gagal memperbarui link", isError: true },
        }));
        return;
      }
      setEditingId(null);
      setFeedback((prev) => ({
        ...prev,
        [id]: {
          text: markDone
            ? "Link diperbarui dan laporan ditandai selesai."
            : "Link diperbarui. Silakan cek link lalu tandai selesai.",
          isError: false,
        },
      }));
      router.refresh();
    } finally {
      setBusyId(null);
    }
  }

  if (items.length === 0) {
    return (
      <div
        style={{
          background: "#FFFFFF",
          border: "1px solid #DDE3DE",
          borderRadius: 12,
          padding: 16,
          fontSize: 14,
          color: "#55645B",
        }}
      >
        Tidak ada laporan link mati pada dokumen Anda.
      </div>
    );
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
      {items.map((lap) => {
        const isEditing = editingId === lap.id;
        const msg = feedback[lap.id];
        return (
          <article
            key={lap.id}
            style={{
              background: "#FFFFFF",
              border: "1px solid #DDE3DE",
              borderRadius: 12,
              padding: "14px 16px",
              display: "flex",
              flexDirection: "column",
              gap: 8,
            }}
          >
            <div style={{ display: "flex", justifyContent: "space-between", gap: 8 }}>
              <span
                style={{
                  background: lap.status === "BARU" ? "#FCE9E6" : "#E8EEF9",
                  color: lap.status === "BARU" ? "#7A1A10" : "#1B3D7A",
                  fontSize: 12,
                  fontWeight: 600,
                  padding: "3px 10px",
                  borderRadius: 999,
                }}
              >
                {lap.status === "BARU"
                  ? "Link dilaporkan mati"
                  : "Sedang diperbaiki"}
              </span>
              <span style={{ fontSize: 12, color: "#55645B" }}>{lap.dibuatLabel}</span>
            </div>

            <h3 style={{ margin: 0, fontSize: 15, fontWeight: 600 }}>
              {lap.dokumen.judul}
            </h3>

            {msg ? (
              <div
                style={{
                  background: msg.isError ? "#FCE9E6" : "#DDF1E5",
                  color: msg.isError ? "#7A1A10" : "#0B5133",
                  borderRadius: 8,
                  padding: "8px 10px",
                  fontSize: 13,
                }}
              >
                {msg.text}
              </div>
            ) : null}

            {isEditing ? (
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                <input
                  type="url"
                  value={linkInput}
                  onChange={(e) => setLinkInput(e.target.value)}
                  placeholder="https://drive.google.com/file/d/..."
                  style={{
                    width: "100%",
                    minHeight: 40,
                    border: "1.5px solid #9FB0A5",
                    borderRadius: 8,
                    padding: "0 10px",
                    font: "inherit",
                    fontSize: 13,
                  }}
                />
                <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
                  <button
                    type="button"
                    disabled={busyId === lap.id}
                    onClick={() => void handleSimpanLink(lap.id, true)}
                    style={{
                      minHeight: 38,
                      padding: "0 14px",
                      border: 0,
                      borderRadius: 8,
                      background: "#0E6B4D",
                      color: "#FFFFFF",
                      font: "inherit",
                      fontSize: 13,
                      fontWeight: 600,
                      cursor: "pointer",
                    }}
                  >
                    Simpan &amp; selesai
                  </button>
                  <button
                    type="button"
                    disabled={busyId === lap.id}
                    onClick={() => setEditingId(null)}
                    style={{
                      minHeight: 38,
                      padding: "0 12px",
                      border: "1px solid #9FB0A5",
                      borderRadius: 8,
                      background: "#FFFFFF",
                      font: "inherit",
                      fontSize: 13,
                      cursor: "pointer",
                    }}
                  >
                    Batal
                  </button>
                </div>
              </div>
            ) : (
              <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
                <button
                  type="button"
                  disabled={busyId === lap.id}
                  onClick={() => {
                    setEditingId(lap.id);
                    setLinkInput(lap.dokumen.linkDrive);
                  }}
                  style={{
                    minHeight: 38,
                    padding: "0 14px",
                    border: "1.5px solid #9FB0A5",
                    borderRadius: 8,
                    background: "#FFFFFF",
                    color: "#14221B",
                    font: "inherit",
                    fontSize: 13,
                    fontWeight: 600,
                    cursor: "pointer",
                  }}
                >
                  Perbaiki link
                </button>
                <button
                  type="button"
                  disabled={busyId === lap.id}
                  onClick={() => void handleCek(lap.id)}
                  style={{
                    minHeight: 38,
                    padding: "0 14px",
                    border: "1px solid #DDE3DE",
                    borderRadius: 8,
                    background: "#F4F6F3",
                    color: "#14221B",
                    font: "inherit",
                    fontSize: 13,
                    fontWeight: 600,
                    cursor: "pointer",
                  }}
                >
                  {busyId === lap.id ? "Mengecek..." : "Cek link"}
                </button>
              </div>
            )}
          </article>
        );
      })}
    </div>
  );
}
