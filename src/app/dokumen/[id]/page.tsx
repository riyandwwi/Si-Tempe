import Link from "next/link";
import { AppHeader } from "@/components/AppHeader";
import { StatusBerlakuBadge, TipeAksesBadge } from "@/components/Badges";
import { DetailActions } from "@/components/DetailActions";
import { getCurrentUser } from "@/lib/auth";
import { tampilanDokumen, toResponsDokumen } from "@/lib/akses";
import { prisma } from "@/lib/prisma";
import { buildKategoriHelpers } from "@/lib/kategori";

function formatTanggal(d: Date | null): string {
  if (!d) return "-";
  return new Intl.DateTimeFormat("id-ID", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(d);
}

/**
 * Halaman Detail Dokumen (/dokumen/[id]) sesuai F5.
 * - Tidak mencatat log pembukaan dokumen apa pun (terutama Top Secret).
 * - Jika TERBATAS atau TIDAK_ADA, hanya menampilkan pesan penolakan tanpa metadata lain.
 */
export default async function DetailDokumenPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const user = await getCurrentUser();

  const doc = await prisma.dokumen.findUnique({
    where: { id },
    select: {
      id: true,
      judul: true,
      linkDrive: true,
      deskripsi: true,
      kategoriId: true,
      tahun: true,
      berlakuSampai: true,
      tipeAkses: true,
      status: true,
      dikunci: true,
      uploaderId: true,
      diterbitkan: true,
    },
  });

  let adaDiDaftarBerhak = false;
  if (doc && user && doc.tipeAkses === "TOP_SECRET" && doc.status === "TERBIT") {
    const akses = await prisma.aksesTopSecret.findUnique({
      where: {
        dokumenId_penggunaId: { dokumenId: doc.id, penggunaId: user.id },
      },
      select: { dokumenId: true },
    });
    adaDiDaftarBerhak = Boolean(akses);
  }

  const tampilan = doc
    ? tampilanDokumen(user, doc, adaDiDaftarBerhak)
    : "TIDAK_ADA";

  if (!doc || tampilan !== "LENGKAP") {
    return (
      <div style={{ minHeight: "100vh", background: "#F4F6F3" }}>
        <AppHeader activePath="/cari" />
        <main style={{ maxWidth: 960, margin: "0 auto", padding: "32px 24px 56px" }}>
          <Link
            href="/cari"
            style={{
              display: "inline-block",
              fontSize: 14,
              fontWeight: 500,
              textDecoration: "none",
              marginBottom: 16,
            }}
          >
            ← Kembali ke hasil pencarian
          </Link>
          <div
            style={{
              background: "#FFFFFF",
              border: "1px dashed #B9C5BD",
              borderRadius: 16,
              padding: 32,
            }}
          >
            <span
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 8,
                minHeight: 44,
                padding: "0 16px",
                fontSize: 15,
                fontWeight: 600,
                color: "#7A1A10",
                background: "#FCE9E6",
                borderRadius: 10,
              }}
            >
              Anda tidak bisa mengakses dokumen ini
            </span>
          </div>
        </main>
      </div>
    );
  }

  const [allKat, setting] = await Promise.all([
    prisma.kategori.findMany({ select: { id: true, nama: true, indukId: true } }),
    prisma.pengaturan.findUnique({ where: { kunci: "batas_segera_berakhir_hari" } }),
  ]);
  const batasHari = Number(setting?.nilai ?? 60) || 60;
  const { getPath } = buildKategoriHelpers(allKat);

  const detail = toResponsDokumen(
    {
      ...doc,
      kategoriJalur: getPath(doc.kategoriId),
    },
    "LENGKAP",
    batasHari
  );

  if (detail.tampilan !== "LENGKAP") return null;

  return (
    <div style={{ minHeight: "100vh", background: "#F4F6F3" }}>
      <AppHeader activePath="/cari" />
      <main style={{ maxWidth: 960, margin: "0 auto", padding: "32px 24px 56px" }}>
        <Link
          href="/cari"
          style={{
            display: "inline-block",
            fontSize: 14,
            fontWeight: 500,
            textDecoration: "none",
            marginBottom: 16,
          }}
        >
          ← Kembali ke hasil pencarian
        </Link>

        <article
          style={{
            background: "#FFFFFF",
            border: "1px solid #DDE3DE",
            borderRadius: 16,
            padding: 32,
            display: "flex",
            flexDirection: "column",
            gap: 22,
          }}
        >
          <div>
            <div
              style={{
                display: "flex",
                flexWrap: "wrap",
                alignItems: "center",
                justifyContent: "space-between",
                gap: 10,
              }}
            >
              <span style={{ fontSize: 14, color: "#55645B" }}>
                {detail.kategoriJalur}
              </span>
              <TipeAksesBadge tipe={detail.tipeAkses} />
            </div>
            <h1
              style={{
                margin: "10px 0 0",
                fontSize: 28,
                lineHeight: 1.25,
                fontWeight: 700,
                letterSpacing: "-0.01em",
              }}
            >
              {detail.judul}
            </h1>
          </div>

          <div>
            <h2 style={{ margin: "0 0 6px", fontSize: 14, fontWeight: 600, color: "#55645B" }}>
              Deskripsi
            </h2>
            <p style={{ margin: 0, fontSize: 16, lineHeight: 1.65, color: "#27352D" }}>
              {detail.deskripsi}
            </p>
          </div>

          <dl
            style={{
              margin: 0,
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
              gap: 16,
              padding: 18,
              background: "#F4F6F3",
              borderRadius: 12,
            }}
          >
            <div>
              <dt style={{ fontSize: 13, color: "#55645B" }}>Tahun dokumen</dt>
              <dd style={{ margin: "3px 0 0", fontSize: 16, fontWeight: 600 }}>
                {detail.tahun}
              </dd>
            </div>
            <div>
              <dt style={{ fontSize: 13, color: "#55645B" }}>Berlaku sampai</dt>
              <dd style={{ margin: "3px 0 0", fontSize: 16, fontWeight: 600 }}>
                {detail.berlakuSampai ?? "Tidak kedaluwarsa"}
              </dd>
            </div>
            <div>
              <dt style={{ fontSize: 13, color: "#55645B" }}>Status</dt>
              <dd style={{ margin: "5px 0 0" }}>
                <StatusBerlakuBadge status={detail.statusBerlaku} />
              </dd>
            </div>
            <div>
              <dt style={{ fontSize: 13, color: "#55645B" }}>Diterbitkan</dt>
              <dd style={{ margin: "3px 0 0", fontSize: 16, fontWeight: 600 }}>
                {formatTanggal(detail.diterbitkan)}
              </dd>
            </div>
          </dl>

          <DetailActions
            dokumenId={detail.id}
            linkDrive={detail.linkDrive}
            isLoggedIn={Boolean(user)}
          />
        </article>
      </main>
    </div>
  );
}
