"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export interface KategoriAdminRow {
  id: string;
  nama: string;
  indukId: string | null;
  jalur: string;
  jumlahDokumen: number;
  jumlahAnak: number;
}

export function AdminKategoriClient({
  kategoriList,
}: {
  kategoriList: KategoriAdminRow[];
}) {
  const router = useRouter();
  const [namaBaru, setNamaBaru] = useState("");
  const [indukBaru, setIndukBaru] = useState("");
  const [editId, setEditId] = useState<string | null>(null);
  const [editNama, setEditNama] = useState("");
  const [editInduk, setEditInduk] = useState("");
  const [msg, setMsg] = useState<{ text: string; isError: boolean } | null>(null);
  const [busy, setBusy] = useState(false);

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    setMsg(null);
    setBusy(true);
    try {
      const res = await fetch("/api/admin/kategori", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          nama: namaBaru.trim(),
          indukId: indukBaru || null,
        }),
      });
      const data = await res.json();
      setMsg({
        text: res.ok
          ? `Kategori "${data.kategori.nama}" berhasil ditambahkan.`
          : data.error ?? "Gagal menambah kategori",
        isError: !res.ok,
      });
      if (res.ok) {
        setNamaBaru("");
        setIndukBaru("");
        router.refresh();
      }
    } finally {
      setBusy(false);
    }
  }

  async function handleUpdate(id: string) {
    setMsg(null);
    setBusy(true);
    try {
      const res = await fetch("/api/admin/kategori", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id,
          nama: editNama.trim(),
          indukId: editInduk || null,
        }),
      });
      const data = await res.json();
      setMsg({
        text: res.ok
          ? "Kategori berhasil diperbarui."
          : data.error ?? "Gagal memperbarui kategori",
        isError: !res.ok,
      });
      if (res.ok) {
        setEditId(null);
        router.refresh();
      }
    } finally {
      setBusy(false);
    }
  }

  async function handleDelete(id: string) {
    setMsg(null);
    setBusy(true);
    try {
      const res = await fetch("/api/admin/kategori", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id }),
      });
      const data = await res.json();
      setMsg({
        text: res.ok
          ? "Kategori berhasil dihapus."
          : data.error ?? "Gagal menghapus kategori",
        isError: !res.ok,
      });
      if (res.ok) router.refresh();
    } finally {
      setBusy(false);
    }
  }

  const inputStyle = {
    width: "100%",
    minHeight: 42,
    border: "1.5px solid #9FB0A5",
    borderRadius: 8,
    padding: "0 12px",
    font: "inherit",
    fontSize: 14,
    background: "#FFFFFF",
  } as const;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
      {msg ? (
        <div
          role={msg.isError ? "alert" : "status"}
          style={{
            background: msg.isError ? "#FCE9E6" : "#DDF1E5",
            color: msg.isError ? "#7A1A10" : "#0B5133",
            borderRadius: 10,
            padding: "12px 16px",
            fontSize: 14,
          }}
        >
          {msg.text}
        </div>
      ) : null}

      <form
        onSubmit={handleCreate}
        style={{
          background: "#FFFFFF",
          border: "1px solid #DDE3DE",
          borderRadius: 14,
          padding: 22,
          display: "flex",
          flexWrap: "wrap",
          gap: 14,
          alignItems: "flex-end",
        }}
      >
        <div style={{ flex: "1 1 240px" }}>
          <label htmlFor="katNama" style={{ display: "block", fontSize: 13, fontWeight: 600, marginBottom: 4 }}>
            Nama kategori baru
          </label>
          <input
            id="katNama"
            required
            value={namaBaru}
            onChange={(e) => setNamaBaru(e.target.value)}
            placeholder="Contoh: Beasiswa"
            style={inputStyle}
          />
        </div>
        <div style={{ flex: "1 1 260px" }}>
          <label htmlFor="katInduk" style={{ display: "block", fontSize: 13, fontWeight: 600, marginBottom: 4 }}>
            Induk kategori (kosongkan untuk kategori utama)
          </label>
          <select
            id="katInduk"
            value={indukBaru}
            onChange={(e) => setIndukBaru(e.target.value)}
            style={inputStyle}
          >
            <option value="">(Kategori utama / tanpa induk)</option>
            {kategoriList
              .filter((k) => k.jumlahDokumen === 0)
              .map((k) => (
                <option key={k.id} value={k.id}>
                  {k.jalur}
                </option>
              ))}
          </select>
        </div>
        <button
          type="submit"
          disabled={busy}
          style={{
            minHeight: 42,
            padding: "0 20px",
            border: 0,
            borderRadius: 10,
            background: "#0E6B4D",
            color: "#FFFFFF",
            font: "inherit",
            fontSize: 14,
            fontWeight: 600,
            cursor: "pointer",
          }}
        >
          Tambah kategori
        </button>
      </form>

      <section
        style={{
          background: "#FFFFFF",
          border: "1px solid #DDE3DE",
          borderRadius: 14,
          padding: 22,
        }}
      >
        <h2 style={{ margin: "0 0 12px", fontSize: 18, fontWeight: 700 }}>
          Pohon kategori ({kategoriList.length})
        </h2>
        {kategoriList.map((k) => {
          const isEditing = editId === k.id;
          const canDelete = k.jumlahDokumen === 0 && k.jumlahAnak === 0;
          return (
            <div
              key={k.id}
              style={{
                borderTop: "1px solid #E6EBE7",
                padding: "12px 0",
                display: "flex",
                flexWrap: "wrap",
                alignItems: "center",
                justifyContent: "space-between",
                gap: 12,
              }}
            >
              {isEditing ? (
                <div style={{ display: "flex", flexWrap: "wrap", gap: 8, flex: 1 }}>
                  <input
                    value={editNama}
                    onChange={(e) => setEditNama(e.target.value)}
                    style={{ ...inputStyle, flex: "1 1 180px", minHeight: 38 }}
                  />
                  <select
                    value={editInduk}
                    onChange={(e) => setEditInduk(e.target.value)}
                    style={{ ...inputStyle, flex: "1 1 220px", minHeight: 38 }}
                  >
                    <option value="">(Kategori utama)</option>
                    {kategoriList
                      .filter((opt) => opt.id !== k.id && opt.jumlahDokumen === 0)
                      .map((opt) => (
                        <option key={opt.id} value={opt.id}>
                          {opt.jalur}
                        </option>
                      ))}
                  </select>
                  <button
                    type="button"
                    disabled={busy}
                    onClick={() => void handleUpdate(k.id)}
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
                    Simpan
                  </button>
                  <button
                    type="button"
                    onClick={() => setEditId(null)}
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
              ) : (
                <>
                  <div>
                    <div style={{ fontSize: 15, fontWeight: 600 }}>{k.jalur}</div>
                    <div style={{ fontSize: 12, color: "#55645B" }}>
                      {k.jumlahDokumen} dokumen · {k.jumlahAnak} sub-kategori
                    </div>
                  </div>
                  <div style={{ display: "flex", gap: 8 }}>
                    <button
                      type="button"
                      onClick={() => {
                        setEditId(k.id);
                        setEditNama(k.nama);
                        setEditInduk(k.indukId ?? "");
                      }}
                      style={{
                        minHeight: 36,
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
                      Ubah / Pindah
                    </button>
                    <button
                      type="button"
                      disabled={!canDelete || busy}
                      title={
                        canDelete
                          ? "Hapus kategori"
                          : "Tidak dapat dihapus karena masih memiliki sub-kategori atau dokumen"
                      }
                      onClick={() => void handleDelete(k.id)}
                      style={{
                        minHeight: 36,
                        padding: "0 12px",
                        border: "1px solid #DDE3DE",
                        borderRadius: 8,
                        background: canDelete ? "#FCE9E6" : "#F4F6F3",
                        color: canDelete ? "#7A1A10" : "#9FB0A5",
                        font: "inherit",
                        fontSize: 12,
                        fontWeight: 600,
                        cursor: canDelete ? "pointer" : "not-allowed",
                      }}
                    >
                      Hapus
                    </button>
                  </div>
                </>
              )}
            </div>
          );
        })}
      </section>
    </div>
  );
}
