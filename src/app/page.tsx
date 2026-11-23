import Link from "next/link";
import { AppHeader } from "@/components/AppHeader";
import { DokumenCard } from "@/components/DokumenCard";
import { getCurrentUser } from "@/lib/auth";
import { can } from "@/lib/akses";
import { cariDokumenServer } from "@/lib/pencarian";

export default async function HomePage() {
  const user = await getCurrentUser();
  const hasil = await cariDokumenServer(user, { urut: "terbaru", hal: 1 });
  const terbaru10 = hasil.items.slice(0, 10);

  return (
    <div style={{ minHeight: "100vh", background: "#F4F6F3" }}>
      <AppHeader activePath="/" />

      <main style={{ maxWidth: 1120, margin: "0 auto", padding: "32px 24px 56px" }}>
        <section
          style={{
            background: "#FFFFFF",
            border: "1px solid #DDE3DE",
            borderRadius: 16,
            padding: "28px 28px 24px",
            marginBottom: 28,
          }}
        >
          <h1
            style={{
              margin: "0 0 8px",
              fontSize: 28,
              fontWeight: 700,
              letterSpacing: "-0.01em",
            }}
          >
            Pusat Dokumen Kampus
          </h1>
          <p style={{ margin: "0 0 18px", fontSize: 15, color: "#55645B" }}>
            Cari pedoman, SK, SOP, dan dokumen resmi ITBMP. File asli tersimpan di
            Google Drive kampus.
          </p>

          <form
            action="/cari"
            method="get"
            role="search"
            style={{ display: "flex", flexWrap: "wrap", gap: 12 }}
          >
            <input
              type="search"
              name="q"
              aria-label="Kata kunci pencarian"
              placeholder="Ketik judul atau kata kunci dokumen, mis. pembimbing skripsi 2025"
              style={{
                flex: "1 1 380px",
                minHeight: 52,
                border: "1.5px solid #9FB0A5",
                borderRadius: 12,
                padding: "0 16px",
                font: "inherit",
                fontSize: 16,
              }}
            />
            <button
              type="submit"
              style={{
                minHeight: 52,
                padding: "0 28px",
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

          <div
            style={{
              display: "flex",
              flexWrap: "wrap",
              gap: 10,
              marginTop: 16,
            }}
          >
            <Link
              href="/cari"
              style={{
                display: "inline-flex",
                alignItems: "center",
                minHeight: 40,
                padding: "0 16px",
                background: "#E3F1EB",
                color: "#094A35",
                borderRadius: 9,
                fontSize: 14,
                fontWeight: 600,
                textDecoration: "none",
              }}
            >
              Jelajahi semua dokumen &amp; kategori
            </Link>

            {can(user, "BUAT_DOKUMEN") ? (
              <Link
                href="/uploader"
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  minHeight: 40,
                  padding: "0 16px",
                  border: "1.5px solid #9FB0A5",
                  color: "#14221B",
                  borderRadius: 9,
                  fontSize: 14,
                  fontWeight: 600,
                  textDecoration: "none",
                }}
              >
                Dokumen saya (Uploader)
              </Link>
            ) : null}

            {can(user, "VERIFIKASI_DOKUMEN") ? (
              <Link
                href="/verifikasi"
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  minHeight: 40,
                  padding: "0 16px",
                  border: "1.5px solid #9FB0A5",
                  color: "#14221B",
                  borderRadius: 9,
                  fontSize: 14,
                  fontWeight: 600,
                  textDecoration: "none",
                }}
              >
                Antrean verifikasi
              </Link>
            ) : null}

            {can(user, "LIHAT_DASHBOARD_ADMIN") ? (
              <Link
                href="/admin"
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  minHeight: 40,
                  padding: "0 16px",
                  border: "1.5px solid #9FB0A5",
                  color: "#14221B",
                  borderRadius: 9,
                  fontSize: 14,
                  fontWeight: 600,
                  textDecoration: "none",
                }}
              >
                Dashboard administrator
              </Link>
            ) : null}
          </div>
        </section>

        <section aria-label="Dokumen terbaru">
          <div
            style={{
              display: "flex",
              flexWrap: "wrap",
              alignItems: "baseline",
              justifyContent: "space-between",
              gap: 8,
              marginBottom: 14,
            }}
          >
            <h2 style={{ margin: 0, fontSize: 20, fontWeight: 700 }}>
              Dokumen terbaru diterbitkan
            </h2>
            <Link
              href="/cari"
              style={{ fontSize: 14, fontWeight: 600, textDecoration: "none" }}
            >
              Lihat semua →
            </Link>
          </div>

          {terbaru10.length === 0 ? (
            <div
              style={{
                background: "#FFFFFF",
                border: "1px solid #DDE3DE",
                borderRadius: 14,
                padding: 24,
                color: "#55645B",
              }}
            >
              Belum ada dokumen yang diterbitkan.
            </div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
              {terbaru10.map((doc) => (
                <DokumenCard key={doc.id} doc={doc} />
              ))}
            </div>
          )}
        </section>
      </main>
    </div>
  );
}
