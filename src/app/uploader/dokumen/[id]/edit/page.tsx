import Link from "next/link";
import { redirect } from "next/navigation";
import { AppHeader } from "@/components/AppHeader";
import { DokumenForm } from "@/components/DokumenForm";
import { getCurrentUser } from "@/lib/auth";
import { can } from "@/lib/akses";
import { prisma } from "@/lib/prisma";
import { getAllKategoriWithPaths } from "@/lib/kategori";

export default async function EditDokumenPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const user = await getCurrentUser();
  if (!user) redirect(`/masuk?callbackUrl=/uploader/dokumen/${id}/edit`);

  const doc = await prisma.dokumen.findUnique({ where: { id } });
  if (!doc || !can(user, "EDIT_DOKUMEN", doc)) {
    return (
      <div style={{ minHeight: "100vh", background: "#F4F6F3" }}>
        <AppHeader activePath="/uploader" subtitle="Uploader" />
        <main style={{ maxWidth: 820, margin: "0 auto", padding: "48px 24px" }}>
          <h1 style={{ margin: "0 0 8px", fontSize: 24 }}>Tidak dapat mengedit dokumen</h1>
          <p style={{ color: "#55645B" }}>
            Hanya dokumen berstatus Draft atau Perlu revisi milik Anda sendiri yang bisa diedit.
          </p>
          <Link href="/uploader">Kembali ke Dokumen saya</Link>
        </main>
      </div>
    );
  }

  const allKat = await getAllKategoriWithPaths();
  const leafKat = allKat
    .filter((k) => k.isLeaf)
    .map((k) => ({ id: k.id, jalur: k.jalur }));

  return (
    <div style={{ minHeight: "100vh", background: "#F4F6F3" }}>
      <AppHeader activePath="/uploader" subtitle="Uploader" />
      <main style={{ maxWidth: 820, margin: "0 auto", padding: "32px 24px 56px" }}>
        <Link
          href="/uploader"
          style={{
            display: "inline-block",
            fontSize: 14,
            fontWeight: 500,
            textDecoration: "none",
            marginBottom: 14,
          }}
        >
          ← Kembali ke Dokumen saya
        </Link>
        <h1 style={{ margin: "0 0 6px", fontSize: 28, fontWeight: 700 }}>
          {doc.status === "REVISI" ? "Revisi dokumen" : "Edit draft dokumen"}
        </h1>
        <p style={{ margin: "0 0 24px", fontSize: 15, color: "#55645B" }}>
          Perbarui metadata dokumen lalu kirim ke verifikator.
        </p>
        <DokumenForm
          kategoriList={leafKat}
          initial={{
            id: doc.id,
            status: doc.status,
            catatanRevisi: doc.catatanRevisi,
            linkDrive: doc.linkDrive,
            judul: doc.judul,
            deskripsi: doc.deskripsi,
            kategoriId: doc.kategoriId,
            tahun: String(doc.tahun),
            berlakuSampai: doc.berlakuSampai ? String(doc.berlakuSampai) : "",
            kataKunci: doc.kataKunci,
            usulanAkses: doc.usulanAkses,
          }}
        />
      </main>
    </div>
  );
}
