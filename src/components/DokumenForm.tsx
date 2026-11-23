"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import type { StatusDokumen, TipeAkses } from "@prisma/client";

export interface KategoriOption {
  id: string;
  jalur: string;
}

export interface DokumenFormInitial {
  id?: string;
  status?: StatusDokumen;
  catatanRevisi?: string | null;
  linkDrive: string;
  judul: string;
  deskripsi: string;
  kategoriId: string;
  tahun: string;
  berlakuSampai: string;
  kataKunci: string;
  usulanAkses: TipeAkses;
}

const AKSES_OPTIONS: { value: TipeAkses; label: string; ket: string }[] = [
  { value: "PUBLIK", label: "Publik", ket: "Bisa dilihat siapa saja, tanpa akun." },
  { value: "PRIVAT_DOSEN", label: "Privat Dosen", ket: "Semua dosen yang login." },
  {
    value: "PRIVAT_TENDIK",
    label: "Privat Tendik",
    ket: "Semua tenaga kependidikan yang login.",
  },
  {
    value: "TOP_SECRET",
    label: "Top Secret",
    ket: "Sangat terbatas. Pengguna lain hanya melihat judul.",
  },
];

export function DokumenForm({
  kategoriList,
  initial,
}: {
  kategoriList: KategoriOption[];
  initial?: DokumenFormInitial;
}) {
  const router = useRouter();
  const isRevisi = initial?.status === "REVISI";

  const [docId, setDocId] = useState<string | undefined>(initial?.id);
  const [linkDrive, setLinkDrive] = useState(initial?.linkDrive ?? "");
  const [judul, setJudul] = useState(initial?.judul ?? "");
  const [deskripsi, setDeskripsi] = useState(initial?.deskripsi ?? "");
  const [kategoriId, setKategoriId] = useState(
    initial?.kategoriId ?? kategoriList[0]?.id ?? ""
  );
  const [tahun, setTahun] = useState(
    initial?.tahun ?? String(new Date().getFullYear())
  );
  const [berlakuSampai, setBerlakuSampai] = useState(
    initial?.berlakuSampai ?? ""
  );
  const [kataKunci, setKataKunci] = useState(initial?.kataKunci ?? "");
  const [usulanAkses, setUsulanAkses] = useState<TipeAkses>(
    initial?.usulanAkses ?? "PUBLIK"
  );

  const [fieldErrors, setFieldErrors] = useState<Record<string, string[]>>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [infoMsg, setInfoMsg] = useState<string | null>(null);
  const [saving, setSaving] = useState<"draft" | "kirim" | null>(null);
  const [judulMirip, setJudulMirip] = useState<{
    mirip: { judul: string; tahun: number }[];
    jumlahTerbatas: number;
  }>({ mirip: [], jumlahTerbatas: 0 });

  useEffect(() => {
    const trimmed = judul.trim();
    if (trimmed.length < 5) {
      setJudulMirip({ mirip: [], jumlahTerbatas: 0 });
      return;
    }
    const timer = setTimeout(async () => {
      try {
        const sp = new URLSearchParams({ judul: trimmed });
        if (docId) sp.set("excludeId", docId);
        const res = await fetch(`/api/judul-mirip?${sp.toString()}`);
        if (res.ok) {
          const data = await res.json();
          setJudulMirip({
            mirip: data.mirip ?? [],
            jumlahTerbatas: data.jumlahTerbatas ?? 0,
          });
        }
      } catch {
        // Peringatan judul mirip bersifat opsional, tidak memblokir form
      }
    }, 500);

    return () => clearTimeout(timer);
  }, [judul, docId]);

  function buildPayload() {
    return {
      linkDrive,
      judul,
      deskripsi,
      kategoriId,
      tahun,
      berlakuSampai: berlakuSampai.trim() === "" ? null : berlakuSampai,
      kataKunci,
      usulanAkses,
    };
  }

  async function saveDraft(): Promise<string | null> {
    setFormError(null);
    setInfoMsg(null);
    setFieldErrors({});
    setSaving("draft");

    try {
      const url = docId ? `/api/dokumen/${docId}` : "/api/dokumen";
      const method = docId ? "PATCH" : "POST";
      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(buildPayload()),
      });
      const data = await res.json();

      if (!res.ok) {
        setFormError(data.error ?? "Gagal menyimpan draft");
        if (data.fieldErrors) setFieldErrors(data.fieldErrors);
        return null;
      }

      const savedId: string = data.dokumen.id;
      setDocId(savedId);
      setInfoMsg("Draft berhasil disimpan.");
      router.refresh();
      return savedId;
    } catch {
      setFormError("Terjadi kesalahan jaringan saat menyimpan draft.");
      return null;
    } finally {
      setSaving(null);
    }
  }

  async function handleKirim(e: React.FormEvent) {
    e.preventDefault();
    setFormError(null);
    setInfoMsg(null);
    setFieldErrors({});
    setSaving("kirim");

    try {
      let targetId = docId;
      if (!targetId) {
        const createRes = await fetch("/api/dokumen", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(buildPayload()),
        });
        const createData = await createRes.json();
        if (!createRes.ok) {
          setFormError(createData.error ?? "Gagal membuat dokumen");
          if (createData.fieldErrors) setFieldErrors(createData.fieldErrors);
          return;
        }
        targetId = createData.dokumen.id;
        setDocId(targetId);
      }

      const res = await fetch(`/api/dokumen/${targetId}/kirim`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(buildPayload()),
      });
      const data = await res.json();

      if (!res.ok) {
        setFormError(data.error ?? "Gagal mengirim dokumen ke verifikator");
        if (data.fieldErrors) setFieldErrors(data.fieldErrors);
        return;
      }

      router.push("/uploader");
      router.refresh();
    } catch {
      setFormError("Terjadi kesalahan jaringan saat mengirim dokumen.");
    } finally {
      setSaving(null);
    }
  }

  const inputStyle = {
    width: "100%",
    minHeight: 46,
    border: "1.5px solid #9FB0A5",
    borderRadius: 10,
    padding: "0 14px",
    font: "inherit",
    fontSize: 15,
    color: "#14221B",
    background: "#FFFFFF",
  } as const;

  const renderErr = (field: string) =>
    fieldErrors[field]?.length ? (
      <p style={{ margin: "6px 0 0", fontSize: 13, color: "#7A1A10", fontWeight: 500 }}>
        {fieldErrors[field][0]}
      </p>
    ) : null;

  return (
    <form
      onSubmit={handleKirim}
      style={{
        background: "#FFFFFF",
        border: "1px solid #DDE3DE",
        borderRadius: 14,
        padding: 26,
        display: "flex",
        flexDirection: "column",
        gap: 20,
      }}
    >
      {isRevisi && initial?.catatanRevisi ? (
        <div
          role="alert"
          style={{
            background: "#FFF7E5",
            border: "1px solid #F2D28B",
            borderRadius: 10,
            padding: "12px 14px",
            fontSize: 14,
            lineHeight: 1.5,
            color: "#4A3200",
          }}
        >
          <strong>Catatan verifikator:</strong> {initial.catatanRevisi}
        </div>
      ) : null}

      {formError ? (
        <div
          role="alert"
          style={{
            background: "#FCE9E6",
            color: "#7A1A10",
            borderRadius: 10,
            padding: "12px 14px",
            fontSize: 14,
            fontWeight: 500,
          }}
        >
          {formError}
        </div>
      ) : null}

      {infoMsg ? (
        <div
          role="status"
          style={{
            background: "#DDF1E5",
            color: "#0B5133",
            borderRadius: 10,
            padding: "12px 14px",
            fontSize: 14,
            fontWeight: 500,
          }}
        >
          {infoMsg}
        </div>
      ) : null}

      <div>
        <label htmlFor="linkDrive" style={{ display: "block", fontSize: 14, fontWeight: 600, marginBottom: 6 }}>
          Link Google Drive
        </label>
        <input
          id="linkDrive"
          type="url"
          value={linkDrive}
          onChange={(e) => setLinkDrive(e.target.value)}
          placeholder="https://drive.google.com/file/d/..."
          style={inputStyle}
        />
        <p style={{ margin: "6px 0 0", fontSize: 12, lineHeight: 1.5, color: "#55645B" }}>
          Pastikan izin file di Drive sudah sesuai tingkat akses yang diusulkan di bawah.
        </p>
        {renderErr("linkDrive")}
      </div>

      <div>
        <label htmlFor="judul" style={{ display: "block", fontSize: 14, fontWeight: 600, marginBottom: 6 }}>
          Judul dokumen
        </label>
        <input
          id="judul"
          type="text"
          value={judul}
          onChange={(e) => setJudul(e.target.value)}
          placeholder="Contoh: Penetapan Dosen Pembimbing Skripsi Angkatan 2025"
          style={inputStyle}
        />
        {judulMirip.mirip.length > 0 || judulMirip.jumlahTerbatas > 0 ? (
          <div
            role="status"
            style={{
              marginTop: 8,
              background: "#FFF7E5",
              borderRadius: 8,
              padding: "10px 12px",
              fontSize: 13,
              lineHeight: 1.55,
              color: "#4A3200",
            }}
          >
            {judulMirip.mirip.length > 0 ? (
              <>
                <strong style={{ fontWeight: 600 }}>
                  Judul mirip dokumen yang sudah ada:{" "}
                </strong>
                {judulMirip.mirip
                  .map((m) => `“${m.judul}” (${m.tahun})`)
                  .join(", ")}
                . Pastikan ini bukan dokumen ganda.{" "}
              </>
            ) : null}
            {judulMirip.jumlahTerbatas > 0 ? (
              <>
                Ada {judulMirip.jumlahTerbatas} dokumen lain yang mirip tetapi
                bersifat terbatas, judulnya tidak ditampilkan.
              </>
            ) : null}
          </div>
        ) : null}
        {renderErr("judul")}
      </div>

      <div>
        <label htmlFor="deskripsi" style={{ display: "block", fontSize: 14, fontWeight: 600, marginBottom: 6 }}>
          Deskripsi
        </label>
        <textarea
          id="deskripsi"
          rows={4}
          value={deskripsi}
          onChange={(e) => setDeskripsi(e.target.value)}
          style={{
            ...inputStyle,
            minHeight: 100,
            padding: "12px 14px",
            resize: "vertical",
            lineHeight: 1.5,
          }}
        />
        <p style={{ margin: "6px 0 0", fontSize: 12, lineHeight: 1.5, color: "#55645B" }}>
          Template:{" "}
          <em>[Jenis dokumen] tentang [isi utama], untuk [angkatan / periode / unit].</em>{" "}
          Tulis kata yang biasa diketik orang saat mencari, dan tulis tahun lengkap (2025, bukan 25).
        </p>
        {renderErr("deskripsi")}
      </div>

      <div style={{ display: "flex", flexWrap: "wrap", gap: 16 }}>
        <div style={{ flex: "1 1 240px" }}>
          <label htmlFor="kategoriId" style={{ display: "block", fontSize: 14, fontWeight: 600, marginBottom: 6 }}>
            Kategori
          </label>
          <select
            id="kategoriId"
            value={kategoriId}
            onChange={(e) => setKategoriId(e.target.value)}
            style={inputStyle}
          >
            {kategoriList.map((k) => (
              <option key={k.id} value={k.id}>
                {k.jalur}
              </option>
            ))}
          </select>
          {renderErr("kategoriId")}
        </div>

        <div style={{ flex: "1 1 140px" }}>
          <label htmlFor="tahun" style={{ display: "block", fontSize: 14, fontWeight: 600, marginBottom: 6 }}>
            Tahun dokumen
          </label>
          <input
            id="tahun"
            type="number"
            value={tahun}
            onChange={(e) => setTahun(e.target.value)}
            style={inputStyle}
          />
          {renderErr("tahun")}
        </div>

        <div style={{ flex: "1 1 160px" }}>
          <label htmlFor="berlakuSampai" style={{ display: "block", fontSize: 14, fontWeight: 600, marginBottom: 6 }}>
            Berlaku sampai (opsional)
          </label>
          <input
            id="berlakuSampai"
            type="number"
            value={berlakuSampai}
            onChange={(e) => setBerlakuSampai(e.target.value)}
            placeholder="Kosongkan jika tetap"
            style={inputStyle}
          />
          {renderErr("berlakuSampai")}
        </div>
      </div>

      <div>
        <label htmlFor="kataKunci" style={{ display: "block", fontSize: 14, fontWeight: 600, marginBottom: 6 }}>
          Kata kunci tambahan (opsional)
        </label>
        <input
          id="kataKunci"
          type="text"
          value={kataKunci}
          onChange={(e) => setKataKunci(e.target.value)}
          placeholder="dospem, TA, angkatan 2025"
          style={inputStyle}
        />
        {renderErr("kataKunci")}
      </div>

      <fieldset style={{ border: "1px solid #DDE3DE", borderRadius: 12, padding: "14px 18px 8px", margin: 0 }}>
        <legend style={{ fontSize: 14, fontWeight: 700, padding: "0 6px" }}>
          Usulan tingkat akses
        </legend>
        {AKSES_OPTIONS.map((opt) => (
          <label
            key={opt.value}
            style={{
              display: "flex",
              alignItems: "flex-start",
              gap: 12,
              padding: "8px 0",
              cursor: "pointer",
            }}
          >
            <input
              type="radio"
              name="usulanAkses"
              value={opt.value}
              checked={usulanAkses === opt.value}
              onChange={() => setUsulanAkses(opt.value)}
              style={{ width: 18, height: 18, margin: "2px 0 0", accentColor: "#0E6B4D" }}
            />
            <span>
              <strong style={{ fontSize: 14, fontWeight: 600 }}>{opt.label}</strong>
              <br />
              <span style={{ fontSize: 13, color: "#55645B" }}>{opt.ket}</span>
            </span>
          </label>
        ))}
        <p style={{ margin: "4px 0 8px", fontSize: 12, lineHeight: 1.5, color: "#55645B" }}>
          Ini hanya usulan. Verifikator yang memutuskan saat ACC.
        </p>
        {renderErr("usulanAkses")}
      </fieldset>

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
          type="submit"
          disabled={saving !== null}
          style={{
            minHeight: 48,
            padding: "0 26px",
            border: 0,
            borderRadius: 10,
            background: saving ? "#55645B" : "#0E6B4D",
            color: "#FFFFFF",
            font: "inherit",
            fontSize: 15,
            fontWeight: 600,
            cursor: saving ? "wait" : "pointer",
          }}
        >
          {saving === "kirim"
            ? "Mengirim..."
            : isRevisi
            ? "Kirim ulang"
            : "Kirim ke verifikator"}
        </button>

        {!isRevisi ? (
          <button
            type="button"
            disabled={saving !== null}
            onClick={() => void saveDraft()}
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
              cursor: saving ? "wait" : "pointer",
            }}
          >
            {saving === "draft" ? "Menyimpan..." : "Simpan draft"}
          </button>
        ) : null}
      </div>
    </form>
  );
}
