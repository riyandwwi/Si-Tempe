import Link from "next/link";
import { redirect } from "next/navigation";
import { AppHeader } from "@/components/AppHeader";
import { StatusDokumenBadge } from "@/components/Badges";
import { UploaderLaporanList } from "@/components/UploaderLaporanList";
import { getCurrentUser } from "@/lib/auth";
import { can } from "@/lib/akses";
import { prisma } from "@/lib/prisma";

function formatTanggal(d: Date): string {
  return new Intl.DateTimeFormat("id-ID", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(d);
}

export default async function UploaderPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/masuk?callbackUrl=/uploader");
  if (!can(user, "BUAT_DOKUMEN")) {
    return (
      <div style={{ minHeight: "100vh", background: "#F4F6F3" }}>
        <AppHeader activePath="/uploader" />
        <main style={{ maxWidth: 960, margin: "0 auto", padding: "48px 24px" }}>
          <h1 style={{ margin: "0 0 8px", fontSize: 24 }}>Akses ditolak</h1>
          <p style={{ color: "#55645B" }}>Halaman ini hanya untuk akun Uploader.</p>
        </main>
      </div>
    );
  }

  const docs = await prisma.dokumen.findMany({
    where: { uploaderId: user.id },
    orderBy: { diubah: "desc" },
  });

  const ownIds = docs.map((d) => d.id);

  const [laporanTerbuka, logs] = await Promise.all([
    ownIds.length > 0
      ? prisma.laporanLink.findMany({
          where: {
            dokumenId: { in: ownIds },
            status: { in: ["BARU", "SEDANG_DIPERBAIKI"] },
          },
          include: {
            dokumen: { select: { id: true, judul: true, linkDrive: true } },
          },
          orderBy: { dibuat: "desc" },
        })
      : Promise.resolve([]),
    ownIds.length > 0
      ? prisma.logAktivitas.findMany({
          where: { dokumenId: { in: ownIds } },
          include: { pelaku: { select: { nama: true } } },
          orderBy: { waktu: "desc" },
          take: 20,
        })
      : Promise.resolve([]),
  ]);

  return (
    <div style={{ minHeight: "100vh", background: "#F4F6F3" }}>
      <AppHeader activePath="/uploader" subtitle="Uploader" />

      <main style={{ maxWidth: 1280, margin: "0 auto", padding: "32px 24px 56px" }}>
        <div
          style={{
            display: "flex",
            flexWrap: "wrap",
            alignItems: "center",
            justifyContent: "space-between",
            gap: 16,
            marginBottom: 24,
          }}
        >
          <div>
            <h1 style={{ margin: "0 0 6px", fontSize: 28, fontWeight: 700 }}>
              Dokumen saya
            </h1>
            <p style={{ margin: 0, fontSize: 15, color: "#55645B" }}>
              Kelola draft, dokumen yang perlu revisi, laporan link mati, dan riwayat aktivitas Anda.
            </p>
          </div>
          <Link
            href="/uploader/baru"
            style={{
              display: "inline-flex",
              alignItems: "center",
              minHeight: 48,
              padding: "0 22px",
              background: "#0E6B4D",
              color: "#FFFFFF",
              borderRadius: 10,
              fontSize: 15,
              fontWeight: 600,
              textDecoration: "none",
            }}
          >
            + Unggah dokumen baru
          </Link>
        </div>

        <div style={{ display: "flex", flexWrap: "wrap", gap: 24, alignItems: "flex-start" }}>
          <section
            aria-label="Daftar dokumen saya"
            style={{
              flex: "1.3 1 520px",
              minWidth: 0,
              display: "flex",
              flexDirection: "column",
              gap: 12,
            }}
          >
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
                Belum ada dokumen. Klik &ldquo;Unggah dokumen baru&rdquo; untuk memulai.
              </div>
            ) : (
              docs.map((doc) => (
                <article
                  key={doc.id}
                  style={{
                    background: "#FFFFFF",
                    border: "1px solid #DDE3DE",
                    borderRadius: 12,
                    padding: "16px 18px",
                  }}
                >
                  <div
                    style={{
                      display: "flex",
                      flexWrap: "wrap",
                      alignItems: "center",
                      justifyContent: "space-between",
                      gap: 8,
                    }}
                  >
                    <StatusDokumenBadge status={doc.status} />
                    <span style={{ fontSize: 12, color: "#55645B" }}>
                      Diperbarui {formatTanggal(doc.diubah)}
                    </span>
                  </div>

                  <h2 style={{ margin: "8px 0 6px", fontSize: 16, fontWeight: 600 }}>
                    {doc.judul || "(Tanpa judul)"}
                  </h2>

                  {doc.status === "REVISI" && doc.catatanRevisi ? (
                    <div
                      style={{
                        background: "#FFF7E5",
                        borderRadius: 8,
                        padding: "10px 12px",
                        fontSize: 13,
                        lineHeight: 1.5,
                        color: "#4A3200",
                        marginBottom: 12,
                      }}
                    >
                      <strong>Catatan verifikator:</strong> {doc.catatanRevisi}
                    </div>
                  ) : null}

                  {doc.status === "MENUNGGU" ? (
                    <p style={{ margin: 0, fontSize: 13, color: "#55645B" }}>
                      Tidak bisa diedit selama diperiksa verifikator.
                    </p>
                  ) : null}

                  {doc.status === "TERBIT" ? (
                    <p style={{ margin: 0, fontSize: 13, color: "#55645B" }}>
                      Sudah disetujui. Perubahan hanya bisa dilakukan setelah verifikator membatalkan ACC.
                    </p>
                  ) : null}

                  {doc.status === "REVISI" || doc.status === "DRAFT" ? (
                    <div style={{ marginTop: 12 }}>
                      <Link
                        href={`/uploader/dokumen/${doc.id}/edit`}
                        style={{
                          display: "inline-flex",
                          alignItems: "center",
                          minHeight: 42,
                          padding: "0 18px",
                          background: doc.status === "REVISI" ? "#0E6B4D" : "#FFFFFF",
                          color: doc.status === "REVISI" ? "#FFFFFF" : "#14221B",
                          border:
                            doc.status === "REVISI" ? "0" : "1.5px solid #9FB0A5",
                          borderRadius: 10,
                          fontSize: 14,
                          fontWeight: 600,
                          textDecoration: "none",
                        }}
                      >
                        {doc.status === "REVISI"
                          ? "Edit dan kirim ulang"
                          : "Lanjutkan mengisi"}
                      </Link>
                    </div>
                  ) : null}
                </article>
              ))
            )}
          </section>

          <aside
            style={{
              flex: "1 1 360px",
              minWidth: 0,
              display: "flex",
              flexDirection: "column",
              gap: 16,
            }}
          >
            <div>
              <h2 style={{ margin: "0 0 10px", fontSize: 18, fontWeight: 700 }}>
                Laporan link mati
              </h2>
              <UploaderLaporanList
                items={laporanTerbuka.map((lap) => ({
                  id: lap.id,
                  status: lap.status,
                  dibuatLabel: formatTanggal(lap.dibuat),
                  dokumen: lap.dokumen,
                }))}
              />
            </div>

            <div>
              <h2 style={{ margin: "8px 0 10px", fontSize: 18, fontWeight: 700 }}>
                Riwayat aktivitas saya
              </h2>
              <div
                style={{
                  background: "#FFFFFF",
                  border: "1px solid #DDE3DE",
                  borderRadius: 12,
                  padding: "6px 18px",
                }}
              >
                {logs.length === 0 ? (
                  <p style={{ fontSize: 14, color: "#55645B" }}>
                    Belum ada riwayat aktivitas.
                  </p>
                ) : (
                  logs.map((log, i) => (
                    <div
                      key={log.id}
                      style={{
                        padding: "12px 0",
                        borderBottom:
                          i < logs.length - 1 ? "1px solid #E6EBE7" : "none",
                        fontSize: 14,
                        lineHeight: 1.5,
                      }}
                    >
                      <span style={{ color: "#55645B", fontSize: 12 }}>
                        {formatTanggal(log.waktu)} · {log.pelaku?.nama ?? "Sistem"}
                      </span>
                      <br />
                      <strong>{log.aksi}</strong>
                      {log.rincian ? ` — ${log.rincian}` : ""}
                    </div>
                  ))
                )}
              </div>
              <p style={{ margin: "8px 0 0", fontSize: 12, color: "#55645B" }}>
                Hanya memuat aktivitas pada dokumen yang Anda unggah.
              </p>
            </div>
          </aside>
        </div>
      </main>
    </div>
  );
}
