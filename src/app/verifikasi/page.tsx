import Link from "next/link";
import { redirect } from "next/navigation";
import { AppHeader } from "@/components/AppHeader";
import { TipeAksesBadge } from "@/components/Badges";
import { getCurrentUser } from "@/lib/auth";
import { can } from "@/lib/akses";
import { prisma } from "@/lib/prisma";
import { buildKategoriHelpers } from "@/lib/kategori";
import { checkVerifierLock } from "@/lib/state-machine";

export default async function VerifikasiPage({
  searchParams,
}: {
  searchParams: Promise<{ tab?: string }>;
}) {
  const user = await getCurrentUser();
  if (!user) redirect("/masuk?callbackUrl=/verifikasi");
  if (!can(user, "VERIFIKASI_DOKUMEN")) {
    return (
      <div style={{ minHeight: "100vh", background: "#F4F6F3" }}>
        <AppHeader activePath="/verifikasi" />
        <main style={{ maxWidth: 960, margin: "0 auto", padding: "48px 24px" }}>
          <h1 style={{ margin: "0 0 8px", fontSize: 24 }}>Akses ditolak</h1>
          <p style={{ color: "#55645B" }}>
            Halaman verifikasi hanya dapat diakses oleh Verifikator (ADMIN).
          </p>
        </main>
      </div>
    );
  }

  const sp = await searchParams;
  const tab = sp.tab === "terbit" ? "terbit" : "baru";

  const [menungguDocs, terbitDocs, allKat] = await Promise.all([
    prisma.dokumen.findMany({
      where: { status: "MENUNGGU" },
      include: { uploader: { select: { nama: true } } },
      orderBy: { diubah: "asc" }, // tertua di atas (F3)
    }),
    prisma.dokumen.findMany({
      where: { status: "TERBIT" },
      include: { uploader: { select: { nama: true } } },
      orderBy: { diterbitkan: "desc" },
      take: 50,
    }),
    prisma.kategori.findMany({ select: { id: true, nama: true, indukId: true } }),
  ]);

  const { getPath } = buildKategoriHelpers(allKat);
  const docs = tab === "terbit" ? terbitDocs : menungguDocs;

  // Muat nama verifikator yang sedang mengunci dokumen
  const lockerIds = Array.from(
    new Set(
      menungguDocs
        .map((d) => d.diperiksaOleh)
        .filter((id): id is string => Boolean(id))
    )
  );
  const lockers =
    lockerIds.length > 0
      ? await prisma.pengguna.findMany({
          where: { id: { in: lockerIds } },
          select: { id: true, nama: true },
        })
      : [];
  const lockerMap = new Map(lockers.map((l) => [l.id, l.nama]));

  return (
    <div style={{ minHeight: "100vh", background: "#F4F6F3" }}>
      <AppHeader activePath="/verifikasi" subtitle="Verifikator" />

      <main style={{ maxWidth: 1120, margin: "0 auto", padding: "32px 24px 48px" }}>
        <h1 style={{ margin: "0 0 18px", fontSize: 28, fontWeight: 700 }}>
          Antrean verifikasi
        </h1>

        <div
          role="tablist"
          aria-label="Jenis antrean"
          style={{
            display: "flex",
            flexWrap: "wrap",
            gap: 6,
            borderBottom: "1px solid #DDE3DE",
            marginBottom: 22,
          }}
        >
          <Link
            href="/verifikasi"
            role="tab"
            aria-selected={tab === "baru"}
            style={{
              textDecoration: "none",
              color: tab === "baru" ? "#094A35" : "#34433A",
              fontSize: 14,
              fontWeight: tab === "baru" ? 600 : 500,
              padding: "12px 16px",
              borderBottom: tab === "baru" ? "3px solid #0E6B4D" : "3px solid transparent",
              marginBottom: -1,
            }}
          >
            Dokumen baru{" "}
            <span
              style={{
                background: "#E3F1EB",
                padding: "2px 8px",
                borderRadius: 999,
                fontSize: 12,
                marginLeft: 4,
              }}
            >
              {menungguDocs.length}
            </span>
          </Link>

          <Link
            href="/verifikasi?tab=terbit"
            role="tab"
            aria-selected={tab === "terbit"}
            style={{
              textDecoration: "none",
              color: tab === "terbit" ? "#094A35" : "#34433A",
              fontSize: 14,
              fontWeight: tab === "terbit" ? 600 : 500,
              padding: "12px 16px",
              borderBottom:
                tab === "terbit" ? "3px solid #0E6B4D" : "3px solid transparent",
              marginBottom: -1,
            }}
          >
            Sudah terbit ({terbitDocs.length})
          </Link>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          {docs.length === 0 ? (
            <div
              style={{
                background: "#FFFFFF",
                border: "1px solid #DDE3DE",
                borderRadius: 12,
                padding: 24,
                color: "#55645B",
              }}
            >
              {tab === "baru"
                ? "Tidak ada dokumen yang menunggu verifikasi."
                : "Belum ada dokumen yang terbit."}
            </div>
          ) : (
            docs.map((doc) => {
              const lock = checkVerifierLock(
                doc.diperiksaOleh,
                doc.diperiksaSejak,
                user.id
              );
              const lockerName =
                lock.lockedByOther && doc.diperiksaOleh
                  ? lockerMap.get(doc.diperiksaOleh) ?? "verifikator lain"
                  : null;

              return (
                <article
                  key={doc.id}
                  style={{
                    background: "#FFFFFF",
                    border: "1px solid #DDE3DE",
                    borderRadius: 12,
                    padding: "16px 20px",
                    display: "flex",
                    flexWrap: "wrap",
                    alignItems: "center",
                    justifyContent: "space-between",
                    gap: 16,
                  }}
                >
                  <div style={{ flex: "1 1 360px", minWidth: 0 }}>
                    <div
                      style={{
                        display: "flex",
                        flexWrap: "wrap",
                        gap: 8,
                        fontSize: 12,
                        color: "#55645B",
                      }}
                    >
                      <span>{getPath(doc.kategoriId)}</span>
                      <span>·</span>
                      <span>Tahun {doc.tahun}</span>
                    </div>
                    <h2 style={{ margin: "6px 0 6px", fontSize: 17, fontWeight: 600 }}>
                      {doc.judul}
                    </h2>
                    <div
                      style={{
                        display: "flex",
                        flexWrap: "wrap",
                        gap: "8px 14px",
                        fontSize: 13,
                        color: "#55645B",
                        alignItems: "center",
                      }}
                    >
                      <span>
                        Uploader:{" "}
                        <strong style={{ color: "#14221B" }}>
                          {doc.uploader.nama}
                        </strong>
                      </span>
                      <TipeAksesBadge
                        tipe={tab === "terbit" ? doc.tipeAkses : doc.usulanAkses}
                      />
                      {lockerName ? (
                        <span
                          style={{
                            background: "#FFF7E5",
                            color: "#6E4300",
                            fontSize: 12,
                            fontWeight: 600,
                            padding: "3px 10px",
                            borderRadius: 999,
                          }}
                        >
                          Sedang diperiksa oleh {lockerName}
                        </span>
                      ) : null}
                    </div>
                  </div>

                  <Link
                    href={`/verifikasi/${doc.id}`}
                    style={{
                      display: "inline-flex",
                      alignItems: "center",
                      minHeight: 44,
                      padding: "0 18px",
                      background: tab === "terbit" ? "#FFFFFF" : "#0E6B4D",
                      color: tab === "terbit" ? "#14221B" : "#FFFFFF",
                      border: tab === "terbit" ? "1.5px solid #9FB0A5" : "0",
                      borderRadius: 10,
                      fontSize: 14,
                      fontWeight: 600,
                      textDecoration: "none",
                    }}
                  >
                    {tab === "terbit" ? "Kelola / Batal ACC" : "Periksa dokumen"}
                  </Link>
                </article>
              );
            })
          )}
        </div>
      </main>
    </div>
  );
}
