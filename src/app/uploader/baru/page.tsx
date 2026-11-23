import Link from "next/link";
import { redirect } from "next/navigation";
import { AppHeader } from "@/components/AppHeader";
import { DokumenForm } from "@/components/DokumenForm";
import { getCurrentUser } from "@/lib/auth";
import { can } from "@/lib/akses";
import { getAllKategoriWithPaths } from "@/lib/kategori";

export default async function UploaderBaruPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/masuk?callbackUrl=/uploader/baru");
  if (!can(user, "BUAT_DOKUMEN")) {
    redirect("/");
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
          Unggah dokumen
        </h1>
        <p style={{ margin: "0 0 24px", fontSize: 15, color: "#55645B", lineHeight: 1.55 }}>
          Tempel link Google Drive dan isi data dokumen. Setelah dikirim, dokumen
          diperiksa verifikator dan tidak bisa diedit sampai dikembalikan untuk revisi.
        </p>
        <DokumenForm kategoriList={leafKat} />
      </main>
    </div>
  );
}
