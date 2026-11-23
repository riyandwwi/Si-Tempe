"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import type { StatusBerlaku } from "@/lib/akses";
import type {
  CariParams,
  HasilCari,
  ModeTahun,
  UrutCari,
} from "@/lib/pencarian";
import { DokumenCard } from "@/components/DokumenCard";

const STATUS_OPTIONS: { value: StatusBerlaku; label: string }[] = [
  { value: "BERLAKU", label: "Berlaku" },
  { value: "SEGERA_BERAKHIR", label: "Segera berakhir" },
  { value: "KEDALUWARSA", label: "Sudah kedaluwarsa" },
];

export function CariClient({
  initialParams,
  hasil,
}: {
  initialParams: CariParams;
  hasil: HasilCari;
}) {
  const router = useRouter();
  const [q, setQ] = useState(initialParams.q ?? "");

  const activeTahun = initialParams.tahun ?? [];
  const activeMode: ModeTahun = initialParams.mode ?? "dibuat";
  const activeStatus = initialParams.status ?? [];
  const activeKategori = initialParams.kategori;
  const activeUrut: UrutCari =
    initialParams.urut ?? (initialParams.q?.trim() ? "relevan" : "terbaru");

  function pushParams(next: Partial<CariParams>) {
    const merged: CariParams = {
      q: next.q !== undefined ? next.q : initialParams.q,
      tahun: next.tahun !== undefined ? next.tahun : activeTahun,
      mode: next.mode !== undefined ? next.mode : activeMode,
      status: next.status !== undefined ? next.status : activeStatus,
      kategori:
        "kategori" in next ? next.kategori : activeKategori,
      urut: next.urut !== undefined ? next.urut : initialParams.urut,
      hal: next.hal !== undefined ? next.hal : 1,
    };

    const sp = new URLSearchParams();
    if (merged.q?.trim()) sp.set("q", merged.q.trim());
    if (merged.mode && merged.mode !== "dibuat") sp.set("mode", merged.mode);
    for (const t of merged.tahun ?? []) sp.append("tahun", String(t));
    for (const s of merged.status ?? []) sp.append("status", s);
    if (merged.kategori) sp.set("kategori", merged.kategori);
    if (merged.urut) sp.set("urut", merged.urut);
    if (merged.hal && merged.hal > 1) sp.set("hal", String(merged.hal));

    const qs = sp.toString();
    router.push(qs ? `/cari?${qs}` : "/cari");
  }

  function toggleTahun(t: number) {
    const next = activeTahun.includes(t)
      ? activeTahun.filter((x) => x !== t)
      : [...activeTahun, t];
    pushParams({ tahun: next, hal: 1 });
  }

  function toggleStatus(s: StatusBerlaku) {
    const next = activeStatus.includes(s)
      ? activeStatus.filter((x) => x !== s)
      : [...activeStatus, s];
    pushParams({ status: next, hal: 1 });
  }

  const hasFilter =
    Boolean(initialParams.q?.trim()) ||
    activeTahun.length > 0 ||
    activeStatus.length > 0 ||
    Boolean(activeKategori);

  return (
    <>
      <form
        role="search"
        onSubmit={(e) => {
          e.preventDefault();
          pushParams({ q, hal: 1 });
        }}
        style={{ display: "flex", flexWrap: "wrap", gap: 12, margin: 0 }}
      >
        <div
          style={{
            flex: "1 1 420px",
            display: "flex",
            alignItems: "center",
            gap: 12,
            background: "#FFFFFF",
            border: "1.5px solid #9FB0A5",
            borderRadius: 12,
            padding: "0 16px",
            minHeight: 56,
            color: "#55645B",
          }}
        >
          <input
            type="search"
            aria-label="Kata kunci pencarian"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Ketik judul atau kata kunci dokumen"
            style={{
              flex: 1,
              border: 0,
              outline: 0,
              background: "transparent",
              font: "inherit",
              fontSize: 17,
              color: "#14221B",
              minWidth: 0,
            }}
          />
        </div>
        <button
          type="submit"
          style={{
            minHeight: 56,
            padding: "0 32px",
            border: 0,
            borderRadius: 12,
            background: "#0E6B4D",
            color: "#FFFFFF",
            font: "inherit",
            fontSize: 16,
            fontWeight: 600,
            cursor: "pointer",
          }}
        >
          Cari
        </button>
      </form>

      <p style={{ margin: "10px 2px 0", fontSize: 13, color: "#55645B" }}>
        Semua kata yang diketik harus cocok. Contoh:{" "}
        <strong style={{ fontWeight: 600, color: "#14221B" }}>
          pembimbing skripsi 2025
        </strong>
      </p>

      <div
        style={{
          display: "flex",
          flexWrap: "wrap",
          gap: 24,
          alignItems: "flex-start",
          marginTop: 28,
        }}
      >
        {/* Kolom Kiri: Filter */}
        <aside
          aria-label="Filter"
          style={{
            flex: "0 0 248px",
            background: "#FFFFFF",
            border: "1px solid #DDE3DE",
            borderRadius: 14,
            padding: 20,
          }}
        >
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              gap: 8,
              marginBottom: 6,
            }}
          >
            <h2 style={{ margin: 0, fontSize: 15, fontWeight: 700 }}>Tahun</h2>
            {hasFilter ? (
              <button
                type="button"
                onClick={() => {
                  setQ("");
                  router.push("/cari");
                }}
                style={{
                  border: 0,
                  background: "transparent",
                  color: "#0E6B4D",
                  font: "inherit",
                  fontSize: 12,
                  fontWeight: 600,
                  cursor: "pointer",
                }}
              >
                Reset
              </button>
            ) : null}
          </div>

          <div
            role="group"
            aria-label="Dasar tahun"
            style={{
              display: "flex",
              background: "#EEF2EF",
              borderRadius: 9,
              padding: 3,
              margin: "8px 0 10px",
            }}
          >
            {(["dibuat", "expired"] as const).map((m) => (
              <button
                key={m}
                type="button"
                aria-pressed={activeMode === m}
                onClick={() => pushParams({ mode: m, tahun: [], hal: 1 })}
                style={{
                  flex: 1,
                  border: 0,
                  borderRadius: 7,
                  minHeight: 34,
                  font: "inherit",
                  fontSize: 13,
                  cursor: "pointer",
                  background: activeMode === m ? "#FFFFFF" : "transparent",
                  color: activeMode === m ? "#14221B" : "#55645B",
                  fontWeight: activeMode === m ? 600 : 500,
                  boxShadow:
                    activeMode === m ? "0 1px 2px rgba(20,34,27,0.18)" : "none",
                }}
              >
                {m === "dibuat" ? "Dibuat" : "Expired"}
              </button>
            ))}
          </div>

          {hasil.facetTahun.length === 0 ? (
            <p style={{ fontSize: 13, color: "#55645B", margin: "6px 0" }}>
              Tidak ada data tahun.
            </p>
          ) : (
            hasil.facetTahun.map((item) => (
              <label
                key={item.tahun}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 10,
                  minHeight: 36,
                  fontSize: 14,
                  cursor: "pointer",
                }}
              >
                <input
                  type="checkbox"
                  checked={activeTahun.includes(item.tahun)}
                  onChange={() => toggleTahun(item.tahun)}
                  style={{ width: 18, height: 18, margin: 0, accentColor: "#0E6B4D" }}
                />
                <span style={{ flex: 1 }}>{item.tahun}</span>
                <span style={{ fontSize: 13, color: "#55645B" }}>
                  {item.count}
                </span>
              </label>
            ))
          )}

          <hr style={{ border: 0, borderTop: "1px solid #E6EBE7", margin: "16px 0" }} />

          <h2 style={{ margin: "0 0 6px", fontSize: 15, fontWeight: 700 }}>
            Status berlaku
          </h2>
          {STATUS_OPTIONS.map((opt) => (
            <label
              key={opt.value}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 10,
                minHeight: 36,
                fontSize: 14,
                cursor: "pointer",
              }}
            >
              <input
                type="checkbox"
                checked={activeStatus.includes(opt.value)}
                onChange={() => toggleStatus(opt.value)}
                style={{ width: 18, height: 18, margin: 0, accentColor: "#0E6B4D" }}
              />
              <span style={{ flex: 1 }}>{opt.label}</span>
              <span style={{ fontSize: 13, color: "#55645B" }}>
                {hasil.facetStatus[opt.value]}
              </span>
            </label>
          ))}

          <hr style={{ border: 0, borderTop: "1px solid #E6EBE7", margin: "16px 0" }} />

          <h2 style={{ margin: "0 0 6px", fontSize: 15, fontWeight: 700 }}>
            Urutkan
          </h2>
          {(
            [
              { value: "relevan", label: "Paling relevan" },
              { value: "terbaru", label: "Terbaru diterbitkan" },
              { value: "judul", label: "Judul A–Z" },
            ] as const
          ).map((opt) => (
            <label
              key={opt.value}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 10,
                minHeight: 36,
                fontSize: 14,
                cursor: "pointer",
              }}
            >
              <input
                type="radio"
                name="urut"
                checked={activeUrut === opt.value}
                onChange={() => pushParams({ urut: opt.value, hal: 1 })}
                style={{ width: 18, height: 18, margin: 0, accentColor: "#0E6B4D" }}
              />
              <span>{opt.label}</span>
            </label>
          ))}
        </aside>

        {/* Kolom Tengah: Hasil */}
        <section
          aria-label="Hasil pencarian"
          style={{
            flex: "999 1 460px",
            minWidth: 0,
            display: "flex",
            flexDirection: "column",
            gap: 14,
          }}
        >
          <div
            style={{
              display: "flex",
              flexWrap: "wrap",
              alignItems: "baseline",
              justifyContent: "space-between",
              gap: 8,
            }}
          >
            <h2 style={{ margin: 0, fontSize: 18, fontWeight: 700 }}>
              {hasil.total} dokumen
              {initialParams.q?.trim() ? ` untuk “${initialParams.q.trim()}”` : ""}
            </h2>
            <span style={{ fontSize: 13, color: "#55645B" }}>
              Halaman {hasil.halaman} dari {hasil.totalHalaman}
            </span>
          </div>

          {hasil.items.length === 0 ? (
            <div
              style={{
                background: "#FFFFFF",
                border: "1px solid #DDE3DE",
                borderRadius: 14,
                padding: 28,
                color: "#55645B",
              }}
            >
              Tidak ditemukan dokumen yang cocok dengan kata kunci atau filter
              yang dipilih.
            </div>
          ) : (
            hasil.items.map((doc) => <DokumenCard key={doc.id} doc={doc} />)
          )}

          {hasil.totalHalaman > 1 ? (
            <div
              style={{
                display: "flex",
                justifyContent: "center",
                gap: 10,
                marginTop: 12,
              }}
            >
              <button
                type="button"
                disabled={hasil.halaman <= 1}
                onClick={() => pushParams({ hal: hasil.halaman - 1 })}
                style={{
                  minHeight: 40,
                  padding: "0 16px",
                  border: "1px solid #9FB0A5",
                  borderRadius: 8,
                  background: "#FFFFFF",
                  cursor: hasil.halaman <= 1 ? "not-allowed" : "pointer",
                }}
              >
                ← Sebelumnya
              </button>
              <button
                type="button"
                disabled={hasil.halaman >= hasil.totalHalaman}
                onClick={() => pushParams({ hal: hasil.halaman + 1 })}
                style={{
                  minHeight: 40,
                  padding: "0 16px",
                  border: "1px solid #9FB0A5",
                  borderRadius: 8,
                  background: "#FFFFFF",
                  cursor:
                    hasil.halaman >= hasil.totalHalaman
                      ? "not-allowed"
                      : "pointer",
                }}
              >
                Berikutnya →
              </button>
            </div>
          ) : null}
        </section>

        {/* Kolom Kanan: Pohon Kategori */}
        <aside
          aria-label="Kategori"
          style={{
            flex: "0 0 264px",
            background: "#FFFFFF",
            border: "1px solid #DDE3DE",
            borderRadius: 14,
            padding: 20,
          }}
        >
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              marginBottom: 10,
            }}
          >
            <h2 style={{ margin: 0, fontSize: 15, fontWeight: 700 }}>
              Kategori
            </h2>
            {activeKategori ? (
              <button
                type="button"
                onClick={() => pushParams({ kategori: undefined, hal: 1 })}
                style={{
                  border: 0,
                  background: "transparent",
                  color: "#0E6B4D",
                  font: "inherit",
                  fontSize: 12,
                  fontWeight: 600,
                  cursor: "pointer",
                }}
              >
                Semua
              </button>
            ) : null}
          </div>

          {hasil.kategoriTree.map((kat) => {
            const selected = activeKategori === kat.id;
            return (
              <button
                key={kat.id}
                type="button"
                onClick={() =>
                  pushParams({
                    kategori: selected ? undefined : kat.id,
                    hal: 1,
                  })
                }
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 6,
                  width: "100%",
                  minHeight: 36,
                  border: 0,
                  borderRadius: 8,
                  background: selected ? "#E3F1EB" : "transparent",
                  font: "inherit",
                  fontSize: 14,
                  cursor: "pointer",
                  color: selected ? "#094A35" : "#14221B",
                  padding: `0 8px 0 ${8 + kat.depth * 16}px`,
                  fontWeight: kat.depth === 0 || selected ? 600 : 400,
                }}
              >
                <span style={{ flex: 1, textAlign: "left" }}>{kat.nama}</span>
                <span style={{ fontSize: 12, color: "#55645B", fontWeight: 400 }}>
                  {kat.count}
                </span>
              </button>
            );
          })}

          <p
            style={{
              margin: "14px 0 0",
              fontSize: 12,
              lineHeight: 1.5,
              color: "#55645B",
            }}
          >
            Klik kategori untuk menyempitkan hasil. Dokumen di sub-kategori ikut
            terhitung.
          </p>
        </aside>
      </div>
    </>
  );
}
