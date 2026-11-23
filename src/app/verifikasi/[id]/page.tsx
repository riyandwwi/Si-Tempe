import Link from "next/link";
import { redirect } from "next/navigation";
import { AppHeader } from "@/components/AppHeader";
import { StatusDokumenBadge, TipeAksesBadge } from "@/components/Badges";
import { VerifikasiPanel } from "@/components/VerifikasiPanel";
import { getCurrentUser } from "@/lib/auth";
import { can } from "@/lib/akses";
import { prisma } from "@/lib/prisma";
import { buildKategoriHelpers } from "@/lib/kategori";
import { checkVerifierLock } from "@/lib/state-machine";
import { cariJudulMiripInMemory, type HasilJudulMiripAdmin } from "@/lib/judul-mirip";

export default async function VerifikasiDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const user = await getCurrentUser();
  if (!user) redirect(`/masuk?callbackUrl=/verifikasi/${id}`);
  if (!can(user, "VERIFIKASI_DOKUMEN")) {
    redirect("/");
  }

  const doc = await prisma.dokumen.findUnique({
    where: { id },
    include: { uploader: { select: { nama: true, email: true } } },
  });

  if (!doc || (doc.status !== "MENUNGGU" && doc.status !== "TERBIT")) {
    return (
      <div style={{ minHeight: "100vh", background: "#F4F6F3" }}>
        <AppHeader activePath="/verifikasi" subtitle="Verifikator" />
        <main style={{ maxWidth: 960, margin: "0 auto", padding: "48px 24px" }}>
          <h1 style={{ margin: "0 0 8px", fontSize: 24 }}>
            Dokumen tidak ada di antrean verifikasi
          </h1>
          <Link href="/verifikasi">← Kembali ke antrean</Link>
        </main>
      </div>
    );
  }

  let lockedByName: string | null = null;
  if (doc.status === "MENUNGGU") {
    const lock = checkVerifierLock(
      doc.diperiksaOleh,
      doc.diperiksaSejak,
      user.id
    );
    if (lock.lockedByOther && doc.diperiksaOleh) {
      const locker = await prisma.pengguna.findUnique({
        where: { id: doc.diperiksaOleh },
        select: { nama: true },
      });
      lockedByName = locker?.nama ?? "verifikator lain";
    } else {
      // Ambil / perbarui lock pemeriksaan (timeout 30 menit)
      await prisma.dokumen.update({
        where: { id: doc.id },
        data: { diperiksaOleh: user.id, diperiksaSejak: new Date() },
      });
    }
  }

  const [allKat, otherDocs] = await Promise.all([
    prisma.kategori.findMany({ select: { id: true, nama: true, indukId: true } }),
    prisma.dokumen.findMany({
      where: {
        id: { not: doc.id },
        status: { in: ["TERBIT", "MENUNGGU"] },
      },
      select: { id: true, judul: true, tahun: true, tipeAkses: true, status: true },
    }),
  ]);
  const { getPath } = buildKategoriHelpers(allKat);
  const hasilMirip = cariJudulMiripInMemory(
    doc.judul,
    otherDocs,
    "ADMIN",
    doc.id
  ) as HasilJudulMiripAdmin;

  return (
    <div style={{ minHeight: "100vh", background: "#F4F6F3" }}>
      <AppHeader activePath="/verifikasi" subtitle="Verifikator" />

      <main style={{ maxWidth: 960, margin: "0 auto", padding: "32px 24px 56px" }}>
        <Link
          href={doc.status === "TERBIT" ? "/verifikasi?tab=terbit" : "/verifikasi"}
          style={{
            display: "inline-block",
            fontSize: 14,
            fontWeight: 500,
            textDecoration: "none",
            marginBottom: 16,
          }}
        >
          ← Kembali ke antrean verifikasi
        </Link>

        <article
          style={{
            background: "#FFFFFF",
            border: "1px solid #DDE3DE",
            borderRadius: 16,
            padding: 28,
            display: "flex",
            flexDirection: "column",
            gap: 20,
          }}
        >
          <div>
            <div
              style={{
                display: "flex",
                flexWrap: "wrap",
                alignItems: "center",
                justifyContent: "space-between",
                gap: 8,
              }}
            >
              <span style={{ fontSize: 13, color: "#55645B" }}>
                {getPath(doc.kategoriId)}
              </span>
              <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                <StatusDokumenBadge status={doc.status} />
                <TipeAksesBadge
                  tipe={doc.status === "TERBIT" ? doc.tipeAkses : doc.usulanAkses}
                />
              </div>
            </div>
            <h1 style={{ margin: "10px 0 6px", fontSize: 24, fontWeight: 700 }}>
              {doc.judul}
            </h1>
            <a
              href={doc.linkDrive}
              target="_blank"
              rel="noopener noreferrer"
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 6,
                fontSize: 14,
                fontWeight: 600,
                textDecoration: "none",
              }}
            >
              Buka file di Google Drive ↗
            </a>
          </div>

          <div
            style={{
              background: "#F4F6F3",
              borderRadius: 12,
              padding: 16,
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(170px, 1fr))",
              gap: 14,
              fontSize: 14,
            }}
          >
            <div>
              <div style={{ fontSize: 12, color: "#55645B" }}>Uploader</div>
              <strong>{doc.uploader.nama}</strong>
            </div>
            <div>
              <div style={{ fontSize: 12, color: "#55645B" }}>Tahun dokumen</div>
              <strong>{doc.tahun}</strong>
            </div>
            <div>
              <div style={{ fontSize: 12, color: "#55645B" }}>Berlaku sampai</div>
              <strong>{doc.berlakuSampai ?? "Tidak kedaluwarsa"}</strong>
            </div>
            <div>
              <div style={{ fontSize: 12, color: "#55645B" }}>Usulan akses</div>
              <strong>{doc.usulanAkses}</strong>
            </div>
          </div>

          <div>
            <h2 style={{ margin: "0 0 6px", fontSize: 14, color: "#55645B" }}>
              Deskripsi
            </h2>
            <p style={{ margin: 0, fontSize: 15, lineHeight: 1.6, color: "#27352D" }}>
              {doc.deskripsi}
            </p>
          </div>

          {doc.kataKunci ? (
            <div>
              <h2 style={{ margin: "0 0 6px", fontSize: 14, color: "#55645B" }}>
                Kata kunci
              </h2>
              <p style={{ margin: 0, fontSize: 14, color: "#27352D" }}>
                {doc.kataKunci}
              </p>
            </div>
          ) : null}

          {hasilMirip.mirip.length > 0 ? (
            <div
              role="status"
              style={{
                background: "#FFF7E5",
                border: "1px solid #F2D28B",
                borderRadius: 10,
                padding: "12px 14px",
                fontSize: 13,
                lineHeight: 1.55,
                color: "#4A3200",
              }}
            >
              <strong>Dokumen berjudul mirip (termasuk Top Secret):</strong>
              <ul style={{ margin: "6px 0 0", paddingLeft: 18 }}>
                {hasilMirip.mirip.map((m) => (
                  <li key={m.id}>
                    “{m.judul}” ({m.tahun}) — {m.tipeAkses} · {m.status}
                  </li>
                ))}
              </ul>
            </div>
          ) : null}

          <hr style={{ border: 0, borderTop: "1px solid #E6EBE7", margin: 0 }} />

          <VerifikasiPanel
            dokumenId={doc.id}
            status={doc.status}
            usulanAkses={doc.usulanAkses}
            tipeAksesSaatIni={doc.tipeAkses}
            lockedByName={lockedByName}
          />
        </article>
      </main>
    </div>
  );
}
