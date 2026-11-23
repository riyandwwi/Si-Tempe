"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import type { StatusLaporan } from "@prisma/client";

export interface SegeraBerakhirItem {
  id: string;
  judul: string;
  berlakuSampai: number;
  sisaHari: number;
  uploaderNama: string;
}

export interface LaporanAdminItem {
  id: string;
  dokumenId: string;
  judul: string;
  uploaderNama: string;
  jumlahPelapor: number;
  status: StatusLaporan;
  dibuatLabel: string;
}

export interface LogAdminItem {
  id: string;
  waktuLabel: string;
  pelakuId: string | null;
  pelakuNama: string;
  aksi: string;
  dokumenId: string | null;
  rincian: string | null;
}

export interface DokumenKunciItem {
  id: string;
  judul: string;
  tipeAkses: string;
  dikunci: boolean;
  alasanKunci: string | null;
}

export function AdminDashboardClient({
  canAction,
  canLock,
  segeraBerakhir,
  laporanList,
  logs,
  dokumenTerbit,
}: {
  canAction: boolean;
  canLock: boolean;
  segeraBerakhir: SegeraBerakhirItem[];
  laporanList: LaporanAdminItem[];
  logs: LogAdminItem[];
  dokumenTerbit: DokumenKunciItem[];
}) {
  const router = useRouter();
  const [busy, setBusy] = useState<string | null>(null);
  const [banner, setBanner] = useState<{ text: string; isError: boolean } | null>(
    null
  );
  const [filterPelaku, setFilterPelaku] = useState("");
  const [filterDokId, setFilterDokId] = useState("");
  const [lockTarget, setLockTarget] = useState<string | null>(null);
  const [alasanKunci, setAlasanKunci] = useState("");

  async function kirimPengingat(dokumenId: string) {
    setBusy(`remind:${dokumenId}`);
    setBanner(null);
    try {
      const res = await fetch("/api/admin/pengingat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ dokumenId }),
      });
      const data = await res.json();
      setBanner({
        text: res.ok ? data.pesan : data.error ?? "Gagal mengirim pengingat",
        isError: !res.ok,
      });
    } finally {
      setBusy(null);
    }
  }

  async function cekSemuaLink() {
    setBusy("cek-all");
    setBanner(null);
    try {
      const res = await fetch("/api/admin/cek-semua-link", { method: "POST" });
      const data = await res.json();
      setBanner({
        text: res.ok
          ? `Diperiksa ${data.diperiksa} dokumen: ${data.bermasalah} bermasalah, ${data.laporanBaru} laporan baru dibuat.`
          : data.error ?? "Gagal memeriksa semua link",
        isError: !res.ok,
      });
      if (res.ok) router.refresh();
    } finally {
      setBusy(null);
    }
  }

  async function cekSatuLink(laporanId: string) {
    setBusy(`cek:${laporanId}`);
    setBanner(null);
    try {
      const res = await fetch(`/api/laporan/${laporanId}/cek`, { method: "POST" });
      const data = await res.json();
      setBanner({
        text: res.ok ? data.hasil.pesan : data.error ?? "Gagal mengecek link",
        isError: !res.ok || !data.hasil?.ok,
      });
      if (res.ok) router.refresh();
    } finally {
      setBusy(null);
    }
  }

  async function ubahStatusLaporan(
    laporanId: string,
    status: "SELESAI" | "DITUTUP"
  ) {
    setBusy(`stat:${laporanId}`);
    setBanner(null);
    try {
      const res = await fetch(`/api/laporan/${laporanId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      });
      const data = await res.json();
      setBanner({
        text: res.ok
          ? `Laporan diperbarui menjadi ${status}.`
          : data.error ?? "Gagal memperbarui laporan",
        isError: !res.ok,
      });
      if (res.ok) router.refresh();
    } finally {
      setBusy(null);
    }
  }

  async function toggleKunciDokumen(dokumenId: string, dikunci: boolean) {
    if (dikunci && alasanKunci.trim().length < 3) {
      setBanner({
        text: "Isi alasan penguncian dokumen terlebih dahulu (minimal 3 karakter).",
        isError: true,
      });
      return;
    }
    setBusy(`lock:${dokumenId}`);
    setBanner(null);
    try {
      const res = await fetch(`/api/dokumen/${dokumenId}/kunci`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          dikunci,
          alasan: dikunci ? alasanKunci.trim() : undefined,
        }),
      });
      const data = await res.json();
      setBanner({
        text: res.ok
          ? dikunci
            ? "Dokumen berhasil dikunci dan disembunyikan dari seluruh pengguna."
            : "Kunci dokumen berhasil dibuka."
          : data.error ?? "Gagal mengubah status kunci dokumen",
        isError: !res.ok,
      });
      if (res.ok) {
        setLockTarget(null);
        setAlasanKunci("");
        router.refresh();
      }
    } finally {
      setBusy(null);
    }
  }

  const pelakuOptions = Array.from(
    new Map(
      logs
        .filter((l) => l.pelakuId)
        .map((l) => [l.pelakuId!, l.pelakuNama])
    ).entries()
  );

  const filteredLogs = logs.filter((l) => {
    if (filterPelaku && l.pelakuId !== filterPelaku) return false;
    if (
      filterDokId.trim() &&
      !(l.dokumenId ?? "").toLowerCase().includes(filterDokId.trim().toLowerCase())
    ) {
      return false;
    }
    return true;
  });

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
      {banner ? (
        <div
          role={banner.isError ? "alert" : "status"}
          style={{
            background: banner.isError ? "#FCE9E6" : "#DDF1E5",
            color: banner.isError ? "#7A1A10" : "#0B5133",
            borderRadius: 10,
            padding: "12px 16px",
            fontSize: 14,
            fontWeight: 500,
          }}
        >
          {banner.text}
        </div>
      ) : null}

      <div style={{ display: "flex", flexWrap: "wrap", gap: 24, alignItems: "flex-start" }}>
        <div style={{ flex: "1.2 1 560px", minWidth: 0, display: "flex", flexDirection: "column", gap: 24 }}>
          {/* Panel 1: Segera berakhir */}
          <section
            style={{
              background: "#FFFFFF",
              border: "1px solid #DDE3DE",
              borderRadius: 14,
              padding: 22,
            }}
          >
            <h2 style={{ margin: "0 0 12px", fontSize: 17, fontWeight: 700 }}>
              Segera berakhir
            </h2>
            {segeraBerakhir.length === 0 ? (
              <p style={{ margin: 0, fontSize: 14, color: "#55645B" }}>
                Tidak ada dokumen yang segera berakhir dalam batas hari saat ini.
              </p>
            ) : (
              <div style={{ overflowX: "auto" }}>
                <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 14, minWidth: 500 }}>
                  <thead>
                    <tr style={{ color: "#55645B", fontSize: 12, textAlign: "left" }}>
                      <th style={{ padding: "8px 8px 8px 0" }}>Dokumen</th>
                      <th style={{ padding: 8 }}>Berlaku s/d</th>
                      <th style={{ padding: 8 }}>Sisa</th>
                      <th style={{ padding: 8 }}>Uploader</th>
                      {canAction ? <th style={{ padding: "8px 0 8px 8px" }}>Aksi</th> : null}
                    </tr>
                  </thead>
                  <tbody>
                    {segeraBerakhir.map((item) => (
                      <tr key={item.id} style={{ borderTop: "1px solid #E6EBE7" }}>
                        <td style={{ padding: "12px 8px 12px 0", fontWeight: 600 }}>
                          {item.judul}
                        </td>
                        <td style={{ padding: "12px 8px" }}>Des {item.berlakuSampai}</td>
                        <td style={{ padding: "12px 8px" }}>
                          <span
                            style={{
                              background: "#FFEFCC",
                              color: "#6E4300",
                              fontSize: 12,
                              fontWeight: 600,
                              padding: "3px 10px",
                              borderRadius: 999,
                            }}
                          >
                            {item.sisaHari} hari
                          </span>
                        </td>
                        <td style={{ padding: "12px 8px" }}>{item.uploaderNama}</td>
                        {canAction ? (
                          <td style={{ padding: "12px 0 12px 8px" }}>
                            <button
                              type="button"
                              disabled={busy === `remind:${item.id}`}
                              onClick={() => void kirimPengingat(item.id)}
                              style={{
                                minHeight: 36,
                                padding: "0 12px",
                                border: "1.5px solid #9FB0A5",
                                borderRadius: 8,
                                background: "#FFFFFF",
                                color: "#14221B",
                                font: "inherit",
                                fontSize: 12,
                                fontWeight: 600,
                                cursor: "pointer",
                              }}
                            >
                              {busy === `remind:${item.id}`
                                ? "Mengirim..."
                                : "Kirim pengingat"}
                            </button>
                          </td>
                        ) : null}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>

          {/* Panel 2: Laporan link mati */}
          <section
            style={{
              background: "#FFFFFF",
              border: "1px solid #DDE3DE",
              borderRadius: 14,
              padding: 22,
            }}
          >
            <div
              style={{
                display: "flex",
                flexWrap: "wrap",
                alignItems: "center",
                justifyContent: "space-between",
                gap: 10,
                marginBottom: 12,
              }}
            >
              <h2 style={{ margin: 0, fontSize: 17, fontWeight: 700 }}>
                Laporan link mati
              </h2>
              {canAction ? (
                <button
                  type="button"
                  disabled={busy === "cek-all"}
                  onClick={() => void cekSemuaLink()}
                  style={{
                    minHeight: 40,
                    padding: "0 16px",
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
                  {busy === "cek-all" ? "Memeriksa..." : "Cek semua link"}
                </button>
              ) : null}
            </div>

            {laporanList.length === 0 ? (
              <p style={{ margin: 0, fontSize: 14, color: "#55645B" }}>
                Tidak ada laporan link mati yang terbuka.
              </p>
            ) : (
              laporanList.map((lap) => (
                <div
                  key={lap.id}
                  style={{
                    display: "flex",
                    flexWrap: "wrap",
                    alignItems: "center",
                    gap: 12,
                    padding: "14px 0",
                    borderTop: "1px solid #E6EBE7",
                  }}
                >
                  <div style={{ flex: "1 1 240px", minWidth: 0 }}>
                    <div style={{ fontSize: 15, fontWeight: 600 }}>{lap.judul}</div>
                    <div style={{ fontSize: 13, color: "#55645B", marginTop: 2 }}>
                      {lap.jumlahPelapor} laporan · {lap.dibuatLabel} · {lap.uploaderNama}
                    </div>
                  </div>
                  <span
                    style={{
                      background: lap.status === "BARU" ? "#FCE9E6" : "#E8EEF9",
                      color: lap.status === "BARU" ? "#7A1A10" : "#1B3D7A",
                      fontSize: 12,
                      fontWeight: 600,
                      padding: "4px 10px",
                      borderRadius: 999,
                    }}
                  >
                    {lap.status === "BARU" ? "Baru" : "Sedang diperbaiki"}
                  </span>
                  {canAction ? (
                    <div style={{ display: "flex", gap: 8 }}>
                      <button
                        type="button"
                        disabled={busy !== null}
                        onClick={() => void cekSatuLink(lap.id)}
                        style={{
                          minHeight: 38,
                          padding: "0 12px",
                          border: "1.5px solid #9FB0A5",
                          borderRadius: 8,
                          background: "#FFFFFF",
                          font: "inherit",
                          fontSize: 12,
                          fontWeight: 600,
                          cursor: "pointer",
                        }}
                      >
                        Cek link
                      </button>
                      <button
                        type="button"
                        disabled={busy !== null}
                        onClick={() => void ubahStatusLaporan(lap.id, "SELESAI")}
                        style={{
                          minHeight: 38,
                          padding: "0 12px",
                          border: 0,
                          borderRadius: 8,
                          background: "#0E6B4D",
                          color: "#FFFFFF",
                          font: "inherit",
                          fontSize: 12,
                          fontWeight: 600,
                          cursor: "pointer",
                        }}
                      >
                        Tandai selesai
                      </button>
                      <button
                        type="button"
                        disabled={busy !== null}
                        onClick={() => void ubahStatusLaporan(lap.id, "DITUTUP")}
                        style={{
                          minHeight: 38,
                          padding: "0 12px",
                          border: "1px solid #DDE3DE",
                          borderRadius: 8,
                          background: "#F4F6F3",
                          font: "inherit",
                          fontSize: 12,
                          cursor: "pointer",
                        }}
                      >
                        Tutup
                      </button>
                    </div>
                  ) : null}
                </div>
              ))
            )}
          </section>

          {/* Panel Khusus REKTOR: Kunci / Buka Kunci Dokumen */}
          {canLock ? (
            <section
              style={{
                background: "#FFFFFF",
                border: "1px solid #DDE3DE",
                borderRadius: 14,
                padding: 22,
              }}
            >
              <h2 style={{ margin: "0 0 6px", fontSize: 17, fontWeight: 700 }}>
                Kontrol kunci dokumen (Wewenang Rektor)
              </h2>
              <p style={{ margin: "0 0 14px", fontSize: 13, color: "#55645B" }}>
                Dokumen yang dikunci langsung disembunyikan dari pencarian,
                beranda, dan halaman detail untuk seluruh pengguna sampai kunci
                dibuka kembali.
              </p>

              {dokumenTerbit.map((doc) => (
                <div
                  key={doc.id}
                  style={{
                    borderTop: "1px solid #E6EBE7",
                    padding: "12px 0",
                    display: "flex",
                    flexDirection: "column",
                    gap: 8,
                  }}
                >
                  <div
                    style={{
                      display: "flex",
                      flexWrap: "wrap",
                      alignItems: "center",
                      justifyContent: "space-between",
                      gap: 10,
                    }}
                  >
                    <div>
                      <div style={{ fontSize: 15, fontWeight: 600 }}>{doc.judul}</div>
                      <div style={{ fontSize: 12, color: "#55645B" }}>
                        {doc.tipeAkses}
                        {doc.dikunci && doc.alasanKunci
                          ? ` · Alasan kunci: ${doc.alasanKunci}`
                          : ""}
                      </div>
                    </div>

                    {doc.dikunci ? (
                      <button
                        type="button"
                        disabled={busy !== null}
                        onClick={() => void toggleKunciDokumen(doc.id, false)}
                        style={{
                          minHeight: 38,
                          padding: "0 14px",
                          border: "1.5px solid #0E6B4D",
                          borderRadius: 8,
                          background: "#FFFFFF",
                          color: "#0E6B4D",
                          font: "inherit",
                          fontSize: 13,
                          fontWeight: 600,
                          cursor: "pointer",
                        }}
                      >
                        Buka kunci
                      </button>
                    ) : (
                      <button
                        type="button"
                        disabled={busy !== null}
                        onClick={() => {
                          setLockTarget(lockTarget === doc.id ? null : doc.id);
                          setAlasanKunci("");
                        }}
                        style={{
                          minHeight: 38,
                          padding: "0 14px",
                          border: 0,
                          borderRadius: 8,
                          background: "#7A1A10",
                          color: "#FFFFFF",
                          font: "inherit",
                          fontSize: 13,
                          fontWeight: 600,
                          cursor: "pointer",
                        }}
                      >
                        Kunci dokumen
                      </button>
                    )}
                  </div>

                  {lockTarget === doc.id ? (
                    <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
                      <input
                        type="text"
                        value={alasanKunci}
                        onChange={(e) => setAlasanKunci(e.target.value)}
                        placeholder="Alasan penguncian dokumen (wajib)"
                        style={{
                          flex: "1 1 240px",
                          minHeight: 38,
                          border: "1.5px solid #9FB0A5",
                          borderRadius: 8,
                          padding: "0 10px",
                          font: "inherit",
                          fontSize: 13,
                        }}
                      />
                      <button
                        type="button"
                        disabled={busy !== null}
                        onClick={() => void toggleKunciDokumen(doc.id, true)}
                        style={{
                          minHeight: 38,
                          padding: "0 14px",
                          border: 0,
                          borderRadius: 8,
                          background: "#7A1A10",
                          color: "#FFFFFF",
                          font: "inherit",
                          fontSize: 13,
                          fontWeight: 600,
                          cursor: "pointer",
                        }}
                      >
                        Konfirmasi kunci
                      </button>
                    </div>
                  ) : null}
                </div>
              ))}
            </section>
          ) : null}
        </div>

        {/* Panel 3: Log aktivitas */}
        <section
          style={{
            flex: "1 1 420px",
            minWidth: 0,
            background: "#FFFFFF",
            border: "1px solid #DDE3DE",
            borderRadius: 14,
            padding: 22,
          }}
        >
          <h2 style={{ margin: "0 0 12px", fontSize: 17, fontWeight: 700 }}>
            Log aktivitas
          </h2>

          <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginBottom: 12 }}>
            <select
              aria-label="Filter pelaku"
              value={filterPelaku}
              onChange={(e) => setFilterPelaku(e.target.value)}
              style={{
                flex: "1 1 160px",
                minHeight: 38,
                border: "1px solid #9FB0A5",
                borderRadius: 8,
                padding: "0 10px",
                font: "inherit",
                fontSize: 13,
                background: "#FFFFFF",
              }}
            >
              <option value="">Semua pelaku</option>
              {pelakuOptions.map(([id, nama]) => (
                <option key={id} value={id}>
                  {nama}
                </option>
              ))}
            </select>
            <input
              type="text"
              aria-label="Filter ID dokumen"
              value={filterDokId}
              onChange={(e) => setFilterDokId(e.target.value)}
              placeholder="Filter ID dokumen..."
              style={{
                flex: "1 1 160px",
                minHeight: 38,
                border: "1px solid #9FB0A5",
                borderRadius: 8,
                padding: "0 10px",
                font: "inherit",
                fontSize: 13,
              }}
            />
          </div>

          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13, minWidth: 360 }}>
              <thead>
                <tr style={{ color: "#55645B", fontSize: 12, textAlign: "left" }}>
                  <th style={{ padding: "8px 8px 8px 0" }}>Waktu</th>
                  <th style={{ padding: 8 }}>Pelaku</th>
                  <th style={{ padding: "8px 0 8px 8px" }}>Aksi</th>
                </tr>
              </thead>
              <tbody>
                {filteredLogs.length === 0 ? (
                  <tr>
                    <td colSpan={3} style={{ padding: "12px 0", color: "#55645B" }}>
                      Belum ada log aktivitas.
                    </td>
                  </tr>
                ) : (
                  filteredLogs.map((log) => (
                    <tr key={log.id} style={{ borderTop: "1px solid #E6EBE7" }}>
                      <td style={{ padding: "10px 8px 10px 0", color: "#55645B", whiteSpace: "nowrap" }}>
                        {log.waktuLabel}
                      </td>
                      <td style={{ padding: "10px 8px" }}>{log.pelakuNama}</td>
                      <td style={{ padding: "10px 0 10px 8px" }}>
                        <strong>{log.aksi}</strong>
                        {log.rincian ? ` — ${log.rincian}` : ""}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          <p style={{ margin: "14px 0 0", fontSize: 12, lineHeight: 1.5, color: "#55645B" }}>
            Pembukaan dokumen Top Secret tidak dicatat di log ini.
          </p>
        </section>
      </div>
    </div>
  );
}
