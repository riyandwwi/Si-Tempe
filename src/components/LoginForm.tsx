"use client";

import { useState } from "react";
import { signIn } from "next-auth/react";
import { useRouter } from "next/navigation";

export function LoginForm({ callbackUrl = "/" }: { callbackUrl?: string }) {
  const router = useRouter();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const res = await signIn("credentials", {
        username: username.trim(),
        password,
        redirect: false,
      });

      if (res?.error) {
        setError(
          "Username atau kata sandi salah, atau akun Anda sudah nonaktif / kedaluwarsa."
        );
      } else {
        router.push(callbackUrl);
        router.refresh();
      }
    } catch {
      setError("Terjadi kesalahan saat masuk. Coba lagi.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <form
      onSubmit={handleSubmit}
      style={{
        background: "#FFFFFF",
        border: "1px solid #DDE3DE",
        borderRadius: 16,
        padding: 28,
        display: "flex",
        flexDirection: "column",
        gap: 18,
      }}
    >
      {error ? (
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
          {error}
        </div>
      ) : null}

      <div>
        <label
          htmlFor="username"
          style={{ display: "block", fontSize: 14, fontWeight: 600, marginBottom: 6 }}
        >
          Username
        </label>
        <input
          id="username"
          type="text"
          required
          autoComplete="username"
          value={username}
          onChange={(e) => setUsername(e.target.value)}
          placeholder="Contoh: rektor, dosen1, uploader1"
          style={{
            width: "100%",
            minHeight: 46,
            border: "1.5px solid #9FB0A5",
            borderRadius: 10,
            padding: "0 14px",
            font: "inherit",
            fontSize: 15,
          }}
        />
      </div>

      <div>
        <label
          htmlFor="password"
          style={{ display: "block", fontSize: 14, fontWeight: 600, marginBottom: 6 }}
        >
          Kata sandi
        </label>
        <input
          id="password"
          type="password"
          required
          autoComplete="current-password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          style={{
            width: "100%",
            minHeight: 46,
            border: "1.5px solid #9FB0A5",
            borderRadius: 10,
            padding: "0 14px",
            font: "inherit",
            fontSize: 15,
          }}
        />
      </div>

      <button
        type="submit"
        disabled={loading}
        style={{
          minHeight: 48,
          border: 0,
          borderRadius: 10,
          background: loading ? "#55645B" : "#0E6B4D",
          color: "#FFFFFF",
          font: "inherit",
          fontSize: 15,
          fontWeight: 600,
          cursor: loading ? "wait" : "pointer",
        }}
      >
        {loading ? "Memeriksa..." : "Masuk"}
      </button>

      <p style={{ margin: 0, fontSize: 12, color: "#55645B", lineHeight: 1.5 }}>
        Akun dibuat oleh Super Admin kampus. Hubungi pengelola jika belum
        memiliki akun atau lupa kata sandi.
      </p>
    </form>
  );
}
