import {
  PrismaClient,
  Peran,
  JenisAkun,
  TipeAkses,
  StatusDokumen,
} from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  const passwordHash = await bcrypt.hash("123", 10);

  // 1. Pengaturan awal
  await prisma.pengaturan.upsert({
    where: { kunci: "batas_segera_berakhir_hari" },
    update: {},
    create: { kunci: "batas_segera_berakhir_hari", nilai: "60" },
  });

  // 2. Akun contoh (Bagian 13)
  // 1 SUPER_ADMIN, 2 ADMIN, 2 UPLOADER, 1 REKTOR, 2 DOSEN, 2 TENDIK, 1 SPECIAL_GUEST (hapus manual)
  const usersData: Array<{
    username: string;
    email: string;
    nama: string;
    peran: Peran;
    jenis: JenisAkun;
    tanggalBerakhir?: Date | null;
  }> = [
    {
      username: "superadmin",
      email: "superadmin@itbmp.ac.id",
      nama: "Super Admin ITBMP",
      peran: Peran.SUPER_ADMIN,
      jenis: JenisAkun.TENDIK,
    },
    {
      username: "verifikator1",
      email: "verifikator1@itbmp.ac.id",
      nama: "Verifikator A",
      peran: Peran.ADMIN,
      jenis: JenisAkun.TENDIK,
    },
    {
      username: "verifikator2",
      email: "verifikator2@itbmp.ac.id",
      nama: "Verifikator B",
      peran: Peran.ADMIN,
      jenis: JenisAkun.DOSEN,
    },
    {
      username: "uploader1",
      email: "uploader1@itbmp.ac.id",
      nama: "Uploader 1",
      peran: Peran.UPLOADER,
      jenis: JenisAkun.TENDIK,
    },
    {
      username: "uploader2",
      email: "uploader2@itbmp.ac.id",
      nama: "Uploader 2",
      peran: Peran.UPLOADER,
      jenis: JenisAkun.TENDIK,
    },
    {
      username: "rektor",
      email: "rektor@itbmp.ac.id",
      nama: "Rektor ITBMP",
      peran: Peran.REKTOR,
      jenis: JenisAkun.DOSEN,
    },
    {
      username: "dosen1",
      email: "dosen1@itbmp.ac.id",
      nama: "Dr. Budi Santoso",
      peran: Peran.PENGGUNA,
      jenis: JenisAkun.DOSEN,
    },
    {
      username: "dosen2",
      email: "dosen2@itbmp.ac.id",
      nama: "Siti Aminah, M.Kom.",
      peran: Peran.PENGGUNA,
      jenis: JenisAkun.DOSEN,
    },
    {
      username: "tendik1",
      email: "tendik1@itbmp.ac.id",
      nama: "Ahmad Fauzi",
      peran: Peran.PENGGUNA,
      jenis: JenisAkun.TENDIK,
    },
    {
      username: "tendik2",
      email: "tendik2@itbmp.ac.id",
      nama: "Rina Wulandari",
      peran: Peran.PENGGUNA,
      jenis: JenisAkun.TENDIK,
    },
    {
      username: "asesor",
      email: "asesor@tamu.itbmp.ac.id",
      nama: "Asesor Akreditasi (Guest)",
      peran: Peran.SPECIAL_GUEST,
      jenis: JenisAkun.LAINNYA,
    },
  ];

  const users: Record<string, { id: string; email: string }> = {};
  for (const u of usersData) {
    const record = await prisma.pengguna.upsert({
      where: { email: u.email },
      update: {
        username: u.username,
        nama: u.nama,
        passwordHash,
        peran: u.peran,
        jenis: u.jenis,
        tanggalBerakhir: u.tanggalBerakhir ?? null,
      },
      create: {
        username: u.username,
        email: u.email,
        nama: u.nama,
        passwordHash,
        peran: u.peran,
        jenis: u.jenis,
        aktif: true,
        tanggalBerakhir: u.tanggalBerakhir ?? null,
      },
    });
    users[u.email] = record;
  }

  // 3. Pohon kategori (Bagian 13)
  async function ensureKategori(id: string, nama: string, indukId?: string) {
    return prisma.kategori.upsert({
      where: { id },
      update: { nama, indukId: indukId ?? null },
      create: { id, nama, indukId: indukId ?? null },
    });
  }

  const katAkademik = await ensureKategori("kat-akademik", "Akademik");
  const katPerkuliahan = await ensureKategori(
    "kat-perkuliahan",
    "Perkuliahan",
    katAkademik.id
  );
  const katMahasiswa = await ensureKategori(
    "kat-mahasiswa",
    "Mahasiswa",
    katPerkuliahan.id
  );
  const katDosen = await ensureKategori(
    "kat-dosen",
    "Dosen",
    katPerkuliahan.id
  );
  const katKurikulum = await ensureKategori(
    "kat-kurikulum",
    "Kurikulum",
    katAkademik.id
  );
  const katPenelitian = await ensureKategori("kat-penelitian", "Penelitian");
  const katKepegawaian = await ensureKategori("kat-kepegawaian", "Kepegawaian");
  const katKeuangan = await ensureKategori("kat-keuangan", "Keuangan");
  const katKemahasiswaan = await ensureKategori(
    "kat-kemahasiswaan",
    "Kemahasiswaan"
  );

  // 4. 12 dokumen contoh di semua status dan keempat tipe akses
  const uploader1 = users["uploader1@itbmp.ac.id"].id;
  const uploader2 = users["uploader2@itbmp.ac.id"].id;
  const now = new Date();
  const daysAgo = (n: number) => new Date(now.getTime() - n * 86400000);

  const docsData = [
    {
      id: "doc-01",
      judul: "Penetapan Dosen Pembimbing Skripsi Angkatan 2025",
      linkDrive: "https://drive.google.com/file/d/1exampleSkripsi2025/view",
      deskripsi:
        "SK penetapan dosen pembimbing skripsi pada angkatan 2025, seluruh program studi. Memuat daftar mahasiswa, pembimbing 1 dan 2.",
      kategoriId: katMahasiswa.id,
      tahun: 2025,
      berlakuSampai: 2028,
      kataKunci: "skripsi, dospem, pembimbing, angkatan 2025",
      tipeAkses: TipeAkses.PRIVAT_DOSEN,
      usulanAkses: TipeAkses.PRIVAT_DOSEN,
      status: StatusDokumen.TERBIT,
      uploaderId: uploader1,
      diterbitkan: daysAgo(1),
    },
    {
      id: "doc-02",
      judul: "Pedoman Penulisan Skripsi 2025",
      linkDrive: "https://drive.google.com/file/d/1examplePedomanSkripsi/view",
      deskripsi:
        "Panduan format, sistematika, dan tata cara penulisan skripsi untuk mahasiswa semua program studi angkatan 2025.",
      kategoriId: katMahasiswa.id,
      tahun: 2025,
      berlakuSampai: 2026,
      kataKunci: "pedoman, skripsi, tugas akhir, format",
      tipeAkses: TipeAkses.PUBLIK,
      usulanAkses: TipeAkses.PUBLIK,
      status: StatusDokumen.TERBIT,
      uploaderId: uploader1,
      diterbitkan: daysAgo(2),
    },
    {
      id: "doc-03",
      judul: "Kalender Akademik Tahun Ajaran 2025/2026",
      linkDrive: "https://drive.google.com/file/d/1exampleKalender2025/view",
      deskripsi:
        "Jadwal perkuliahan, ujian tengah semester, ujian akhir semester, dan libur akademik tahun ajaran 2025/2026 untuk sivitas akademika.",
      kategoriId: katKurikulum.id,
      tahun: 2025,
      berlakuSampai: 2026,
      kataKunci: "kalender, akademik, semester, jadwal",
      tipeAkses: TipeAkses.PUBLIK,
      usulanAkses: TipeAkses.PUBLIK,
      status: StatusDokumen.TERBIT,
      uploaderId: uploader2,
      diterbitkan: daysAgo(5),
    },
    {
      id: "doc-04",
      judul: "Prosedur Administrasi Sidang Skripsi",
      linkDrive: "https://drive.google.com/file/d/1exampleProsedurSidang/view",
      deskripsi:
        "SOP administrasi pendaftaran, pemberkasan, dan pencetakan berita acara sidang skripsi untuk tenaga kependidikan bagian akademik.",
      kategoriId: katKepegawaian.id,
      tahun: 2025,
      berlakuSampai: 2027,
      kataKunci: "sop, administrasi, sidang, skripsi, tendik",
      tipeAkses: TipeAkses.PRIVAT_TENDIK,
      usulanAkses: TipeAkses.PRIVAT_TENDIK,
      status: StatusDokumen.TERBIT,
      uploaderId: uploader1,
      diterbitkan: daysAgo(4),
    },
    {
      id: "doc-05",
      judul: "Evaluasi Kinerja Dosen Pembimbing Skripsi 2025",
      linkDrive: "https://drive.google.com/file/d/1exampleTopSecretEval/view",
      deskripsi:
        "Laporan rahasia hasil audit dan evaluasi kinerja dosen pembimbing skripsi semester ganjil 2025 beserta rekomendasi pimpinan.",
      kategoriId: katKepegawaian.id,
      tahun: 2025,
      berlakuSampai: null,
      kataKunci: "evaluasi, audit, kinerja, rahasia, pimpinan",
      tipeAkses: TipeAkses.TOP_SECRET,
      usulanAkses: TipeAkses.TOP_SECRET,
      status: StatusDokumen.TERBIT,
      uploaderId: uploader2,
      diterbitkan: daysAgo(3),
    },
    {
      id: "doc-06",
      judul: "Panduan Penelitian dan Pengabdian Masyarakat 2025",
      linkDrive: "https://drive.google.com/file/d/1examplePenelitian2025/view",
      deskripsi:
        "Pedoman pengajuan proposal hibah internal penelitian dan pengabdian masyarakat untuk dosen tetap ITBMP tahun 2025.",
      kategoriId: katPenelitian.id,
      tahun: 2025,
      berlakuSampai: 2027,
      kataKunci: "penelitian, hibah, lppm, pengabdian",
      tipeAkses: TipeAkses.PRIVAT_DOSEN,
      usulanAkses: TipeAkses.PRIVAT_DOSEN,
      status: StatusDokumen.TERBIT,
      uploaderId: uploader2,
      diterbitkan: daysAgo(6),
    },
    {
      id: "doc-07",
      judul: "Standar Biaya Operasional dan Perjalanan Dinas 2024",
      linkDrive: "https://drive.google.com/file/d/1exampleSBU2024/view",
      deskripsi:
        "Ketentuan standar biaya operasional, honorarium, dan perjalanan dinas untuk bagian keuangan dan tenaga kependidikan tahun 2024.",
      kategoriId: katKeuangan.id,
      tahun: 2024,
      berlakuSampai: 2025,
      kataKunci: "keuangan, sbu, perjalanan dinas, honor",
      tipeAkses: TipeAkses.PRIVAT_TENDIK,
      usulanAkses: TipeAkses.PRIVAT_TENDIK,
      status: StatusDokumen.TERBIT,
      uploaderId: uploader1,
      diterbitkan: daysAgo(120),
    },
    {
      id: "doc-08",
      judul: "Pedoman Organisasi Kemahasiswaan dan UKM",
      linkDrive: "https://drive.google.com/file/d/1exampleOrmawa/view",
      deskripsi:
        "Peraturan rektor tentang pembentukan, pendanaan, dan pelaporan kegiatan organisasi kemahasiswaan serta unit kegiatan mahasiswa.",
      kategoriId: katKemahasiswaan.id,
      tahun: 2024,
      berlakuSampai: null,
      kataKunci: "ormawa, ukm, kemahasiswaan, bem",
      tipeAkses: TipeAkses.PUBLIK,
      usulanAkses: TipeAkses.PUBLIK,
      status: StatusDokumen.TERBIT,
      uploaderId: uploader2,
      diterbitkan: daysAgo(15),
    },
    {
      id: "doc-09",
      judul: "SK Pengangkatan Dosen Tetap 2026",
      linkDrive: "https://drive.google.com/file/d/1exampleSKDosen2026/view",
      deskripsi:
        "Surat Keputusan pengangkatan dosen tetap yayasan untuk program studi Teknik Informatika dan Bisnis Digital tahun 2026.",
      kategoriId: katKepegawaian.id,
      tahun: 2026,
      berlakuSampai: null,
      kataKunci: "sk, pengangkatan, dosen tetap, kepegawaian",
      tipeAkses: TipeAkses.TOP_SECRET,
      usulanAkses: TipeAkses.TOP_SECRET,
      status: StatusDokumen.MENUNGGU,
      uploaderId: uploader2,
      diterbitkan: null,
    },
    {
      id: "doc-10",
      judul: "Jadwal Mengajar Dosen Semester Genap 2026",
      linkDrive: "https://drive.google.com/file/d/1exampleJadwalDosen2026/view",
      deskripsi:
        "Distribusi mata kuliah dan jadwal mengajar dosen tetap maupun tidak tetap semester genap tahun akademik 2025/2026.",
      kategoriId: katDosen.id,
      tahun: 2026,
      berlakuSampai: 2026,
      kataKunci: "jadwal, mengajar, dosen, semester genap",
      tipeAkses: TipeAkses.PRIVAT_DOSEN,
      usulanAkses: TipeAkses.PRIVAT_DOSEN,
      status: StatusDokumen.MENUNGGU,
      uploaderId: uploader1,
      diterbitkan: null,
    },
    {
      id: "doc-11",
      judul: "SK Kepanitiaan Dies Natalis",
      linkDrive: "https://drive.google.com/file/d/1exampleDiesNatalis/view",
      deskripsi:
        "SK pembentukan panitia pelaksana kegiatan Dies Natalis ITBMP untuk seluruh unit kerja dan perwakilan mahasiswa.",
      kategoriId: katKemahasiswaan.id,
      tahun: 2026,
      berlakuSampai: 2026,
      kataKunci: "sk, panitia, dies natalis",
      tipeAkses: TipeAkses.PUBLIK,
      usulanAkses: TipeAkses.PUBLIK,
      status: StatusDokumen.REVISI,
      catatanRevisi: "Tambahkan tahun kegiatan pada judul dan deskripsi.",
      uploaderId: uploader1,
      diterbitkan: null,
    },
    {
      id: "doc-12",
      judul: "Pedoman Magang Mahasiswa 2026",
      linkDrive: "https://drive.google.com/file/d/1exampleMagang2026/view",
      deskripsi:
        "Draft panduan pelaksanaan magang industri dan kerja praktik mahasiswa semester 6 semua program studi tahun 2026.",
      kategoriId: katMahasiswa.id,
      tahun: 2026,
      berlakuSampai: 2029,
      kataKunci: "magang, kerja praktik, mahasiswa",
      tipeAkses: TipeAkses.PUBLIK,
      usulanAkses: TipeAkses.PUBLIK,
      status: StatusDokumen.DRAFT,
      uploaderId: uploader1,
      diterbitkan: null,
    },
  ];

  for (const doc of docsData) {
    await prisma.dokumen.upsert({
      where: { id: doc.id },
      update: {
        judul: doc.judul,
        linkDrive: doc.linkDrive,
        deskripsi: doc.deskripsi,
        kategoriId: doc.kategoriId,
        tahun: doc.tahun,
        berlakuSampai: doc.berlakuSampai,
        kataKunci: doc.kataKunci,
        tipeAkses: doc.tipeAkses,
        usulanAkses: doc.usulanAkses,
        status: doc.status,
        catatanRevisi: doc.catatanRevisi ?? null,
        uploaderId: doc.uploaderId,
        diterbitkan: doc.diterbitkan,
      },
      create: doc,
    });
  }

  // 5. AksesTopSecret contoh: hanya Rektor yang berhak atas doc-05
  await prisma.aksesTopSecret.upsert({
    where: {
      dokumenId_penggunaId: {
        dokumenId: "doc-05",
        penggunaId: users["rektor@itbmp.ac.id"].id,
      },
    },
    update: {},
    create: {
      dokumenId: "doc-05",
      penggunaId: users["rektor@itbmp.ac.id"].id,
    },
  });

  console.log("Seed selesai: 11 akun, 9 kategori, 12 dokumen, 1 pengaturan.");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
