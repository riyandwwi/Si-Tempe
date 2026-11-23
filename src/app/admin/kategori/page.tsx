import { redirect } from "next/navigation";
import { AppHeader } from "@/components/AppHeader";
import { AdminKategoriClient } from "@/components/AdminKategoriClient";
import { getCurrentUser } from "@/lib/auth";
import { can } from "@/lib/akses";
import { prisma } from "@/lib/prisma";
import { buildKategoriHelpers } from "@/lib/kategori";

export default async function AdminKategoriPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/masuk?callbackUrl=/admin/kategori");
  if (!can(user, "KELOLA_KATEGORI")) {
    return (
      <div style={{ minHeight: "100vh", background: "#F4F6F3" }}>
        <AppHeader activePath="/admin/kategori" />
        <main style={{ maxWidth: 960, margin: "0 auto", padding: "48px 24px" }}>
          <h1 style={{ margin: "0 0 8px", fontSize: 24 }}>Akses ditolak</h1>
          <p style={{ color: "#55645B" }}>Halaman ini hanya untuk Super Admin.</p>
        </main>
      </div>
    );
  }

  const all = await prisma.kategori.findMany({
    include: { _count: { select: { dokumen: true, anak: true } } },
  });
  const countMap = new Map(all.map((k) => [k.id, k._count]));
  const helpers = buildKategoriHelpers(
    all.map((k) => ({ id: k.id, nama: k.nama, indukId: k.indukId }))
  );

  const rows = helpers.withPath.map((k) => ({
    id: k.id,
    nama: k.nama,
    indukId: k.indukId,
    jalur: k.jalur,
    jumlahDokumen: countMap.get(k.id)?.dokumen ?? 0,
    jumlahAnak: countMap.get(k.id)?.anak ?? 0,
  }));

  return (
    <div style={{ minHeight: "100vh", background: "#F4F6F3" }}>
      <AppHeader activePath="/admin/kategori" subtitle="Super Admin" />
      <main style={{ maxWidth: 1120, margin: "0 auto", padding: "32px 24px 56px" }}>
        <h1 style={{ margin: "0 0 6px", fontSize: 28, fontWeight: 700 }}>
          Manajemen kategori
        </h1>
        <p style={{ margin: "0 0 24px", fontSize: 15, color: "#55645B" }}>
          Dokumen hanya dapat dipasang pada kategori paling bawah (tanpa sub-kategori).
        </p>
        <AdminKategoriClient kategoriList={rows} />
      </main>
    </div>
  );
}
