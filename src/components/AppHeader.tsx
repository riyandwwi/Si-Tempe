import Link from "next/link";
import { getCurrentUser, signOut } from "@/lib/auth";
import { can } from "@/lib/akses";

const LABEL_PERAN: Record<string, string> = {
  SUPER_ADMIN: "Super Admin",
  ADMIN: "Verifikator",
  UPLOADER: "Uploader",
  PENGGUNA: "Pengguna",
  REKTOR: "Rektor",
  SPECIAL_GUEST: "Special Guest",
};

const LABEL_JENIS: Record<string, string> = {
  DOSEN: "Dosen",
  TENDIK: "Tendik",
  LAINNYA: "Tamu Khusus",
};

function initials(nama: string): string {
  return nama
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase() ?? "")
    .join("");
}

export async function AppHeader({
  activePath = "/",
  subtitle,
}: {
  activePath?: string;
  subtitle?: string;
}) {
  const user = await getCurrentUser();

  const navItems: { href: string; label: string }[] = [
    { href: "/", label: "Beranda" },
    { href: "/cari", label: "Pencarian" },
  ];

  if (can(user, "BUAT_DOKUMEN")) {
    navItems.push({ href: "/uploader", label: "Dokumen saya" });
  }
  if (can(user, "VERIFIKASI_DOKUMEN")) {
    navItems.push({ href: "/verifikasi", label: "Verifikasi" });
  }
  if (can(user, "LIHAT_DASHBOARD_ADMIN")) {
    navItems.push({ href: "/admin", label: "Dashboard" });
  }
  if (can(user, "KELOLA_AKUN")) {
    navItems.push({ href: "/admin/akun", label: "Akun" });
    navItems.push({ href: "/admin/kategori", label: "Kategori" });
  }

  return (
    <header
      style={{
        background: "#FFFFFF",
        borderBottom: "1px solid #DDE3DE",
      }}
    >
      <div
        style={{
          maxWidth: 1280,
          margin: "0 auto",
          padding: "12px 24px",
          display: "flex",
          flexWrap: "wrap",
          alignItems: "center",
          justifyContent: "space-between",
          gap: 16,
        }}
      >
        <Link
          href="/"
          style={{
            display: "flex",
            alignItems: "center",
            gap: 12,
            textDecoration: "none",
            color: "#14221B",
          }}
        >
          <div
            style={{
              width: 38,
              height: 38,
              borderRadius: 9,
              background: "#0E6B4D",
              color: "#FFFFFF",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              flexShrink: 0,
            }}
          >
            <svg
              width="20"
              height="20"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden="true"
            >
              <path d="M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8z" />
              <path d="M14 3v5h5" />
              <path d="M9 13h6M9 17h4" />
            </svg>
          </div>
          <div style={{ lineHeight: 1.15 }}>
            <div style={{ fontWeight: 700, fontSize: 16 }}>
              Pusat Dokumen
              {subtitle ? (
                <span style={{ fontWeight: 500, color: "#55645B" }}>
                  {" "}
                  · {subtitle}
                </span>
              ) : null}
            </div>
            <div style={{ fontSize: 12, color: "#55645B" }}>
              Institut Teknologi dan Bisnis Muhammadiyah Purbalingga
            </div>
          </div>
        </Link>

        <nav
          aria-label="Navigasi utama"
          style={{ display: "flex", flexWrap: "wrap", gap: 4 }}
        >
          {navItems.map((item) => {
            const isActive =
              item.href === "/"
                ? activePath === "/"
                : activePath.startsWith(item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                aria-current={isActive ? "page" : undefined}
                style={{
                  textDecoration: "none",
                  color: isActive ? "#094A35" : "#14221B",
                  background: isActive ? "#E3F1EB" : "transparent",
                  fontSize: 14,
                  fontWeight: isActive ? 600 : 500,
                  padding: "10px 14px",
                  borderRadius: 8,
                }}
              >
                {item.label}
              </Link>
            );
          })}
        </nav>

        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          {user ? (
            <>
              <div style={{ textAlign: "right", lineHeight: 1.2 }}>
                <div style={{ fontSize: 14, fontWeight: 600 }}>{user.nama}</div>
                <div style={{ fontSize: 12, color: "#55645B" }}>
                  {user.peran === "PENGGUNA"
                    ? LABEL_JENIS[user.jenis]
                    : LABEL_PERAN[user.peran]}
                </div>
              </div>
              <div
                aria-hidden="true"
                style={{
                  width: 36,
                  height: 36,
                  borderRadius: "50%",
                  background: "#14221B",
                  color: "#FFFFFF",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontSize: 13,
                  fontWeight: 600,
                }}
              >
                {initials(user.nama)}
              </div>
              <form
                action={async () => {
                  "use server";
                  await signOut({ redirectTo: "/" });
                }}
              >
                <button
                  type="submit"
                  style={{
                    minHeight: 36,
                    padding: "0 12px",
                    border: "1px solid #DDE3DE",
                    borderRadius: 8,
                    background: "#FFFFFF",
                    color: "#55645B",
                    font: "inherit",
                    fontSize: 13,
                    fontWeight: 600,
                    cursor: "pointer",
                  }}
                >
                  Keluar
                </button>
              </form>
            </>
          ) : (
            <Link
              href="/masuk"
              style={{
                display: "inline-flex",
                alignItems: "center",
                minHeight: 40,
                padding: "0 18px",
                background: "#0E6B4D",
                color: "#FFFFFF",
                borderRadius: 10,
                fontSize: 14,
                fontWeight: 600,
                textDecoration: "none",
              }}
            >
              Masuk
            </Link>
          )}
        </div>
      </div>
    </header>
  );
}
