"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import type { JenisAkun, Peran } from "@prisma/client";

export interface AkunRow {
  id: string;
  username: string;
  nama: string;
  email: string;
  peran: Peran;
  jenis: JenisAkun;
  aktif: boolean;
}

const PERAN_LIST: Peran[] = [
  "SUPER_ADMIN",
  "ADMIN",
  "UPLOADER",
  "PENGGUNA",
  "REKTOR",
  "SPECIAL_GUEST",
];

const JENIS_LIST: JenisAkun[] = ["DOSEN", "TENDIK", "LAINNYA"];

export function AdminAkunClient({
  users,
  currentUserId,
}: {
  users: AkunRow[];
  currentUserId: string;
}) {
  const router = useRouter();
  const [username, setUsername] = useState("");
  const [nama, setNama] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("123");
  const [peran, setPeran] = useState<Peran>("PENGGUNA");
  const [jenis, setJenis] = useState<JenisAkun>("DOSEN");
  const [msg, setMsg] = useState<{ text: string; isError: boolean } | null>(null);
  const [busy, setBusy] = useState(false);

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    setMsg(null);
    setBusy(true);
    try {
      const res = await fetch("/api/admin/akun", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          username,
          nama,
          email,
          password,
          peran,
          jenis: peran === "SPECIAL_GUEST" ? "LAINNYA" : jenis,
          tanggalBerakhir: null,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setMsg({ text: data.error ?? "Gagal membuat akun", isError: true });
        return;
      }
      setUsername("");
      setNama("");
      setEmail("");
      setPassword("123");
      setMsg({ text: `Akun @${data.user.username} berhasil dibuat.`, isError: false });
      router.refresh();
    } finally {
      setBusy(false);
    }
  }

  async function patchAkun(payload: Record<string, unknown>, successText: string) {
    setMsg(null);
    setBusy(true);
    try {
      const res = await fetch("/api/admin/akun", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      setMsg({
        text: res.ok ? successText : data.error ?? "Gagal memperbarui akun",
        isError: !res.ok,
      });
      if (res.ok) router.refresh();
    } finally {
      setBusy(false);
    }
  }

  async function deleteAkun(u: AkunRow) {
    if (!window.confirm(`Hapus akun @${u.username} (${u.nama}) secara permanen?`)) {
      return;
    }
    setMsg(null);
    setBusy(true);
    try {
      const res = await fetch("/api/admin/akun", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: u.id }),
      });
      const data = await res.json();
      setMsg({
        text: res.ok
          ? `Akun @${u.username} berhasil dihapus.`
          : data.error ?? "Gagal menghapus akun",
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
          maxWidth: 560,
          background: "#FFFFFF",
          border: "1px solid #DDE3DE",
          borderRadius: 14,
          padding: 22,
          display: "flex",
          flexDirection: "column",
          gap: 14,
        }}
      >
        <h2 style={{ margin: 0, fontSize: 18, fontWeight: 700 }}>Buat akun baru</h2>

        <div>
          <label htmlFor="usernameAkun" style={{ display: "block", fontSize: 13, fontWeight: 600, marginBottom: 4 }}>
            Username (untuk login)
          </label>
          <input
            id="usernameAkun"
            required
            minLength={3}
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            placeholder="Contoh: dosen3"
            style={inputStyle}
          />
        </div>

        <div>
          <label htmlFor="namaAkun" style={{ display: "block", fontSize: 13, fontWeight: 600, marginBottom: 4 }}>
            Nama lengkap
          </label>
          <input
            id="namaAkun"
            required
            value={nama}
            onChange={(e) => setNama(e.target.value)}
            style={inputStyle}
          />
        </div>

        <div>
          <label htmlFor="emailAkun" style={{ display: "block", fontSize: 13, fontWeight: 600, marginBottom: 4 }}>
            Email (opsional, untuk pengingat)
          </label>
          <input
            id="emailAkun"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="Kosongkan -> otomatis username@itbmp.ac.id"
            style={inputStyle}
          />
        </div>

        <div>
          <label htmlFor="passAkun" style={{ display: "block", fontSize: 13, fontWeight: 600, marginBottom: 4 }}>
            Kata sandi awal (default: 123)
          </label>
          <input
            id="passAkun"
            type="text"
            required
            minLength={3}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            style={inputStyle}
          />
        </div>

        <div style={{ display: "flex", gap: 12 }}>
          <div style={{ flex: 1 }}>
            <label htmlFor="peranAkun" style={{ display: "block", fontSize: 13, fontWeight: 600, marginBottom: 4 }}>
              Peran
            </label>
            <select
              id="peranAkun"
              value={peran}
              onChange={(e) => {
                const p = e.target.value as Peran;
                setPeran(p);
                if (p === "SPECIAL_GUEST") setJenis("LAINNYA");
              }}
              style={inputStyle}
            >
              {PERAN_LIST.map((p) => (
                <option key={p} value={p}>
                  {p}
                </option>
              ))}
            </select>
          </div>
          <div style={{ flex: 1 }}>
            <label htmlFor="jenisAkun" style={{ display: "block", fontSize: 13, fontWeight: 600, marginBottom: 4 }}>
              Jenis akun
            </label>
            <select
              id="jenisAkun"
              disabled={peran === "SPECIAL_GUEST"}
              value={peran === "SPECIAL_GUEST" ? "LAINNYA" : jenis}
              onChange={(e) => setJenis(e.target.value as JenisAkun)}
              style={inputStyle}
            >
              {JENIS_LIST.map((j) => (
                <option key={j} value={j}>
                  {j}
                </option>
              ))}
            </select>
          </div>
        </div>

        {peran === "SPECIAL_GUEST" ? (
          <p
            style={{
              margin: 0,
              fontSize: 12,
              lineHeight: 1.5,
              color: "#4A3200",
              background: "#FFF7E5",
              padding: "10px 12px",
              borderRadius: 8,
            }}
          >
            Catatan operasional: izin Google Drive untuk asesor dari luar kampus
            perlu diberikan pengelola Drive dan dicabut setelah asesmen. Hapus
            atau nonaktifkan akun Special Guest secara manual setelah selesai.
          </p>
        ) : null}

        <button
          type="submit"
          disabled={busy}
          style={{
            minHeight: 44,
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
          Buat akun
        </button>
      </form>

      {/* Tabel daftar akun */}
      <section
        style={{
          background: "#FFFFFF",
          border: "1px solid #DDE3DE",
          borderRadius: 14,
          padding: 22,
          overflowX: "auto",
        }}
      >
        <h2 style={{ margin: "0 0 12px", fontSize: 18, fontWeight: 700 }}>
          Daftar akun ({users.length})
        </h2>
        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 14, minWidth: 740 }}>
          <thead>
            <tr style={{ color: "#55645B", fontSize: 12, textAlign: "left" }}>
              <th style={{ padding: "8px 8px 8px 0" }}>Nama &amp; Username</th>
              <th style={{ padding: 8 }}>Peran</th>
              <th style={{ padding: 8 }}>Jenis</th>
              <th style={{ padding: 8 }}>Status</th>
              <th style={{ padding: "8px 0 8px 8px" }}>Aksi</th>
            </tr>
          </thead>
          <tbody>
            {users.map((u) => (
              <tr key={u.id} style={{ borderTop: "1px solid #E6EBE7" }}>
                <td style={{ padding: "10px 8px 10px 0" }}>
                  <strong>{u.nama}</strong>{" "}
                  <span style={{ fontSize: 12, color: "#0E6B4D", fontWeight: 600 }}>
                    @{u.username}
                  </span>
                  <div style={{ fontSize: 12, color: "#55645B" }}>{u.email}</div>
                </td>
                <td style={{ padding: "10px 8px" }}>
                  <select
                    aria-label={`Peran ${u.username}`}
                    value={u.peran}
                    disabled={busy}
                    onChange={(e) =>
                      void patchAkun(
                        { id: u.id, peran: e.target.value },
                        `Peran @${u.username} diperbarui.`
                      )
                    }
                    style={{ ...inputStyle, minHeight: 36, fontSize: 13 }}
                  >
                    {PERAN_LIST.map((p) => (
                      <option key={p} value={p}>
                        {p}
                      </option>
                    ))}
                  </select>
                </td>
                <td style={{ padding: "10px 8px" }}>
                  <select
                    aria-label={`Jenis ${u.username}`}
                    value={u.jenis}
                    disabled={busy || u.peran === "SPECIAL_GUEST"}
                    onChange={(e) =>
                      void patchAkun(
                        { id: u.id, jenis: e.target.value },
                        `Jenis akun @${u.username} diperbarui.`
                      )
                    }
                    style={{ ...inputStyle, minHeight: 36, fontSize: 13 }}
                  >
                    {JENIS_LIST.map((j) => (
                      <option key={j} value={j}>
                        {j}
                      </option>
                    ))}
                  </select>
                </td>
                <td style={{ padding: "10px 8px" }}>
                  <span
                    style={{
                      background: u.aktif ? "#DDF1E5" : "#FCE9E6",
                      color: u.aktif ? "#0B5133" : "#7A1A10",
                      fontSize: 12,
                      fontWeight: 600,
                      padding: "3px 10px",
                      borderRadius: 999,
                    }}
                  >
                    {u.aktif ? "Aktif" : "Nonaktif"}
                  </span>
                </td>
                <td style={{ padding: "10px 0 10px 8px" }}>
                  <div style={{ display: "flex", gap: 8 }}>
                    <button
                      type="button"
                      disabled={busy || u.id === currentUserId}
                      onClick={() =>
                        void patchAkun(
                          { id: u.id, aktif: !u.aktif },
                          u.aktif
                            ? `Akun @${u.username} dinonaktifkan.`
                            : `Akun @${u.username} diaktifkan kembali.`
                        )
                      }
                      style={{
                        minHeight: 36,
                        padding: "0 12px",
                        border: "1.5px solid #9FB0A5",
                        borderRadius: 8,
                        background: "#FFFFFF",
                        font: "inherit",
                        fontSize: 12,
                        fontWeight: 600,
                        cursor: u.id === currentUserId ? "not-allowed" : "pointer",
                      }}
                    >
                      {u.aktif ? "Nonaktifkan" : "Aktifkan"}
                    </button>
                    {u.id !== currentUserId ? (
                      <button
                        type="button"
                        disabled={busy}
                        onClick={() => void deleteAkun(u)}
                        style={{
                          minHeight: 36,
                          padding: "0 12px",
                          border: "1px solid #DDE3DE",
                          borderRadius: 8,
                          background: "#FCE9E6",
                          color: "#7A1A10",
                          font: "inherit",
                          fontSize: 12,
                          fontWeight: 600,
                          cursor: "pointer",
                        }}
                      >
                        Hapus
                      </button>
                    ) : null}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>
    </div>
  );
}
