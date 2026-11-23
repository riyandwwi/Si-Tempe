"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import type { StatusDokumen, TipeAkses } from "@prisma/client";

export function VerifikasiPanel({
  dokumenId,
  status,
  usulanAkses,
  tipeAksesSaatIni,
  lockedByName,
}: {
  dokumenId: string;
  status: StatusDokumen;
  usulanAkses: TipeAkses;
  tipeAksesSaatIni: TipeAkses;
  lockedByName: string | null;
}) {
  const router = useRouter();
  const [tipeAkses, setTipeAkses] = useState<TipeAkses>(
    status === "TERBIT" ? tipeAksesSaatIni : usulanAkses
  );
  const [checklist, setChecklist] = useState({
    metadataBenar: false,
    deskripsiSesuai: false,
    linkBisaDibuka: false,
    izinDriveSesuai: false,
  });
  const [catatan, setCatatan] = useState("");
  const [alasanBatal, setAlasanBatal] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState<string | null>(null);

  const allChecked =
    checklist.metadataBenar &&
    checklist.deskripsiSesuai &&
    checklist.linkBisaDibuka &&
    checklist.izinDriveSesuai;

  const disabledByLock = Boolean(lockedByName);

  async function handleAcc() {
    setError(null);
    setLoading("acc");
    try {
      const res = await fetch(`/api/dokumen/${dokumenId}/acc`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tipeAkses, checklist }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Gagal ACC dokumen");
        return;
      }
      router.push("/verifikasi");
      router.refresh();
    } catch {
      setError("Terjadi kesalahan jaringan.");
    } finally {
      setLoading(null);
    }
  }

  async function handleKembalikan() {
    setError(null);
    if (catatan.trim().length < 3) {
      setError("Catatan untuk uploader wajib diisi sebelum mengembalikan ke revisi.");
      return;
    }
    setLoading("kembalikan");
    try {
      const res = await fetch(`/api/dokumen/${dokumenId}/kembalikan`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ catatan: catatan.trim() }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Gagal mengembalikan dokumen");
        return;
      }
      router.push("/verifikasi");
      router.refresh();
    } catch {
      setError("Terjadi kesalahan jaringan.");
    } finally {
      setLoading(null);
    }
  }

  async function handleBatalAcc() {
    setError(null);
    if (alasanBatal.trim().length < 3) {
      setError("Alasan pembatalan ACC wajib diisi.");
      return;
    }
    setLoading("batal");
    try {
      const res = await fetch(`/api/dokumen/${dokumenId}/batal-acc`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ alasan: alasanBatal.trim() }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Gagal membatalkan ACC");
        return;
      }
      router.push("/verifikasi?tab=terbit");
      router.refresh();
    } catch {
      setError("Terjadi kesalahan jaringan.");
    } finally {
      setLoading(null);
    }
  }

  if (status === "TERBIT") {
    return (
      <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
        {error ? (
          <div
            role="alert"
            style={{
              background: "#FCE9E6",
              color: "#7A1A10",
              borderRadius: 10,
              padding: "12px 14px",
              fontSize: 14,
            }}
          >
            {error}
          </div>
        ) : null}

        <div>
          <label
            htmlFor="alasanBatal"
            style={{ display: "block", fontSize: 14, fontWeight: 600, marginBottom: 6 }}
          >
            Alasan pembatalan ACC (wajib)
          </label>
          <textarea
            id="alasanBatal"
            rows={3}
            value={alasanBatal}
            onChange={(e) => setAlasanBatal(e.target.value)}
            placeholder="Contoh: perlu pembaruan isi dokumen atau revisi deskripsi"
            style={{
              width: "100%",
              border: "1.5px solid #9FB0A5",
              borderRadius: 10,
              padding: "10px 12px",
              font: "inherit",
              fontSize: 14,
            }}
          />
        </div>

        <div>
          <button
            type="button"
            disabled={loading !== null}
            onClick={() => void handleBatalAcc()}
            style={{
              minHeight: 48,
              padding: "0 22px",
              border: 0,
              borderRadius: 10,
              background: "#7A1A10",
              color: "#FFFFFF",
              font: "inherit",
              fontSize: 15,
              fontWeight: 600,
              cursor: loading ? "wait" : "pointer",
            }}
          >
            {loading === "batal" ? "Memproses..." : "Batalkan ACC"}
          </button>
        </div>

        <p style={{ margin: 0, fontSize: 12, lineHeight: 1.5, color: "#55645B" }}>
          Dokumen yang dibatalkan ACC-nya akan kembali ke status Revisi dan langsung
          hilang dari pencarian. Alasan dan pelakunya dicatat di log.
        </p>
      </div>
    );
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
      {disabledByLock ? (
        <div
          role="alert"
          style={{
            background: "#FFF7E5",
            border: "1px solid #F2D28B",
            color: "#4A3200",
            borderRadius: 10,
            padding: "12px 14px",
            fontSize: 14,
            fontWeight: 600,
          }}
        >
          Dokumen ini sedang diperiksa oleh {lockedByName}. Anda tidak dapat
          melakukan ACC sampai pemeriksaan selesai atau melewati batas 30 menit.
        </div>
      ) : null}

      {error ? (
        <div
          role="alert"
          style={{
            background: "#FCE9E6",
            color: "#7A1A10",
            borderRadius: 10,
            padding: "12px 14px",
            fontSize: 14,
          }}
        >
          {error}
        </div>
      ) : null}

      <fieldset style={{ border: "1px solid #DDE3DE", borderRadius: 10, padding: "14px 16px", margin: 0 }}>
        <legend style={{ fontSize: 14, fontWeight: 700, padding: "0 6px" }}>
          Daftar periksa (wajib dicentang semua)
        </legend>

        {[
          {
            key: "metadataBenar" as const,
            label: "Judul, kategori, tahun, dan angkatan terisi benar",
          },
          {
            key: "deskripsiSesuai" as const,
            label: "Deskripsi sesuai template dan memuat kata yang biasa dicari",
          },
          {
            key: "linkBisaDibuka" as const,
            label: "Link Drive bisa dibuka",
          },
          {
            key: "izinDriveSesuai" as const,
            label: "Izin Google Drive sesuai tipe akses yang dipilih",
          },
        ].map((item) => (
          <label
            key={item.key}
            style={{
              display: "flex",
              alignItems: "flex-start",
              gap: 10,
              minHeight: 38,
              fontSize: 14,
              lineHeight: 1.45,
              padding: "4px 0",
              cursor: disabledByLock ? "not-allowed" : "pointer",
            }}
          >
            <input
              type="checkbox"
              disabled={disabledByLock}
              checked={checklist[item.key]}
              onChange={(e) =>
                setChecklist((prev) => ({ ...prev, [item.key]: e.target.checked }))
              }
              style={{ width: 18, height: 18, margin: "1px 0 0", accentColor: "#0E6B4D" }}
            />
            <span>{item.label}</span>
          </label>
        ))}
      </fieldset>

      <div>
        <label
          htmlFor="tipeAksesFinal"
          style={{ display: "block", fontSize: 14, fontWeight: 600, marginBottom: 6 }}
        >
          Tingkat akses akhir
        </label>
        <select
          id="tipeAksesFinal"
          disabled={disabledByLock}
          value={tipeAkses}
          onChange={(e) => setTipeAkses(e.target.value as TipeAkses)}
          style={{
            width: "100%",
            minHeight: 46,
            border: "1.5px solid #9FB0A5",
            borderRadius: 10,
            padding: "0 12px",
            font: "inherit",
            fontSize: 15,
            background: "#FFFFFF",
          }}
        >
          <option value="PUBLIK">Publik (semua orang)</option>
          <option value="PRIVAT_DOSEN">Privat Dosen</option>
          <option value="PRIVAT_TENDIK">Privat Tendik</option>
          <option value="TOP_SECRET">Top Secret</option>
        </select>
        <p
          style={{
            margin: "10px 0 0",
            fontSize: 13,
            lineHeight: 1.55,
            color: "#55645B",
            background: "#F4F6F3",
            borderRadius: 10,
            padding: "12px 14px",
          }}
        >
          Publik: Drive Anyone with the link. Privat: Drive dibagikan ke
          akun/domain kampus. Top Secret: Drive hanya dibagikan ke email yang
          berhak. Website tidak bisa mengunci file Drive.
        </p>
      </div>

      <div>
        <label
          htmlFor="catatanRevisi"
          style={{ display: "block", fontSize: 14, fontWeight: 600, marginBottom: 6 }}
        >
          Catatan untuk uploader (wajib jika dikembalikan ke revisi)
        </label>
        <textarea
          id="catatanRevisi"
          rows={3}
          disabled={disabledByLock}
          value={catatan}
          onChange={(e) => setCatatan(e.target.value)}
          placeholder="Contoh: tambahkan angkatan pada deskripsi"
          style={{
            width: "100%",
            border: "1.5px solid #9FB0A5",
            borderRadius: 10,
            padding: "10px 12px",
            font: "inherit",
            fontSize: 14,
            resize: "vertical",
          }}
        />
      </div>

      <div
        style={{
          display: "flex",
          flexWrap: "wrap",
          gap: 12,
          paddingTop: 16,
          borderTop: "1px solid #E6EBE7",
        }}
      >
        <button
          type="button"
          disabled={disabledByLock || !allChecked || loading !== null}
          onClick={() => void handleAcc()}
          style={{
            minHeight: 48,
            padding: "0 26px",
            border: 0,
            borderRadius: 10,
            background:
              disabledByLock || !allChecked ? "#9FB0A5" : "#0E6B4D",
            color: "#FFFFFF",
            font: "inherit",
            fontSize: 15,
            fontWeight: 600,
            cursor: disabledByLock || !allChecked ? "not-allowed" : "pointer",
          }}
        >
          {loading === "acc" ? "Menerbitkan..." : "ACC dan terbitkan"}
        </button>

        <button
          type="button"
          disabled={disabledByLock || loading !== null}
          onClick={() => void handleKembalikan()}
          style={{
            minHeight: 48,
            padding: "0 22px",
            border: "1.5px solid #9FB0A5",
            borderRadius: 10,
            background: "#FFFFFF",
            color: "#14221B",
            font: "inherit",
            fontSize: 15,
            fontWeight: 600,
            cursor: disabledByLock ? "not-allowed" : "pointer",
          }}
        >
          {loading === "kembalikan" ? "Mengembalikan..." : "Kembalikan ke revisi"}
        </button>
      </div>
    </div>
  );
}
