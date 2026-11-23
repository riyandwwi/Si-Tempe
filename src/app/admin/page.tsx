import { redirect } from "next/navigation";
import { AppHeader } from "@/components/AppHeader";
import { AdminDashboardClient } from "@/components/AdminDashboardClient";
import { getCurrentUser } from "@/lib/auth";
import { can, sisaHariBerlaku } from "@/lib/akses";
import { prisma } from "@/lib/prisma";

function formatWaktu(d: Date): string {
  return new Intl.DateTimeFormat("id-ID", {
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  }).format(d);
}

export default async function AdminDashboardPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/masuk?callbackUrl=/admin");
  if (!can(user, "LIHAT_DASHBOARD_ADMIN")) {
    return (
      <div style={{ minHeight: "100vh", background: "#F4F6F3" }}>
        <AppHeader activePath="/admin" />
        <main style={{ maxWidth: 960, margin: "0 auto", padding: "48px 24px" }}>
          <h1 style={{ margin: "0 0 8px", fontSize: 24 }}>Akses ditolak</h1>
          <p style={{ color: "#55645B" }}>
            Halaman ini hanya terlihat oleh Administrator dan Rektor.
          </p>
        </main>
      </div>
    );
  }

  const canAction = can(user, "AKSI_DASHBOARD_ADMIN");
  const canLock = can(user, "KUNCI_DOKUMEN");

  const [setting, docsTerbit, openReports, logs] = await Promise.all([
    prisma.pengaturan.findUnique({ where: { kunci: "batas_segera_berakhir_hari" } }),
    prisma.dokumen.findMany({
      where: { status: "TERBIT" },
      include: { uploader: { select: { nama: true } } },
      orderBy: { diterbitkan: "desc" },
    }),
    prisma.laporanLink.findMany({
      where: { status: { in: ["BARU", "SEDANG_DIPERBAIKI"] } },
      include: {
        dokumen: {
          select: {
            id: true,
            judul: true,
            uploader: { select: { nama: true } },
          },
        },
      },
      orderBy: { dibuat: "desc" },
    }),
    prisma.logAktivitas.findMany({
      include: { pelaku: { select: { id: true, nama: true } } },
      orderBy: { waktu: "desc" },
      take: 100,
    }),
  ]);

  const batasHari = Number(setting?.nilai ?? 60) || 60;
  const now = new Date();

  const segeraBerakhir = docsTerbit
    .filter((d) => d.berlakuSampai !== null)
    .map((d) => ({
      id: d.id,
      judul: d.judul,
      berlakuSampai: d.berlakuSampai!,
      sisaHari: sisaHariBerlaku(d.berlakuSampai!, now) ?? 9999,
      uploaderNama: d.uploader.nama,
    }))
    .filter((d) => d.sisaHari >= 0 && d.sisaHari <= batasHari)
    .sort((a, b) => a.sisaHari - b.sisaHari);

  // Hitung jumlah pelapor terbuka per dokumen
  const countByDok = new Map<string, number>();
  for (const r of openReports) {
    countByDok.set(r.dokumenId, (countByDok.get(r.dokumenId) ?? 0) + 1);
  }

  const laporanList = openReports.map((r) => ({
    id: r.id,
    dokumenId: r.dokumenId,
    judul: r.dokumen.judul,
    uploaderNama: r.dokumen.uploader.nama,
    jumlahPelapor: countByDok.get(r.dokumenId) ?? 1,
    status: r.status,
    dibuatLabel: formatWaktu(r.dibuat),
  }));

  const logItems = logs.map((l) => ({
    id: l.id,
    waktuLabel: formatWaktu(l.waktu),
    pelakuId: l.pelakuId,
    pelakuNama: l.pelaku?.nama ?? "Sistem",
    aksi: l.aksi,
    dokumenId: l.dokumenId,
    rincian: l.rincian,
  }));

  const dokumenTerbitForLock = canLock
    ? docsTerbit.slice(0, 50).map((d) => ({
        id: d.id,
        judul: d.judul,
        tipeAkses: d.tipeAkses,
        dikunci: d.dikunci,
        alasanKunci: d.alasanKunci,
      }))
    : [];

  return (
    <div style={{ minHeight: "100vh", background: "#F4F6F3" }}>
      <AppHeader activePath="/admin" subtitle="Administrator" />
      <main style={{ maxWidth: 1280, margin: "0 auto", padding: "32px 24px 56px" }}>
        <h1 style={{ margin: "0 0 6px", fontSize: 28, fontWeight: 700 }}>
          Pemantauan dokumen
        </h1>
        <p style={{ margin: "0 0 24px", fontSize: 15, color: "#55645B" }}>
          Hanya terlihat oleh administrator dan rektor.
        </p>

        <AdminDashboardClient
          canAction={canAction}
          canLock={canLock}
          segeraBerakhir={segeraBerakhir}
          laporanList={laporanList}
          logs={logItems}
          dokumenTerbit={dokumenTerbitForLock}
        />
      </main>
    </div>
  );
}
