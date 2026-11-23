# DECISIONS.md — Pusat Dokumen Kampus (ITBMP)

Catatan keputusan teknis dan nilai bawaan yang diambil sesuai [SPEC-pusat-dokumen.md](./SPEC-pusat-dokumen.md).

## 1. Nilai Bawaan dari Spesifikasi (Bagian 17)

| Topik | Keputusan |
|---|---|
| Akses tamu | Tamu hanya melihat dokumen berstatus `TERBIT` dengan tipe `PUBLIK`. |
| Dokumen dibatalkan ACC | Kembali ke `REVISI` dan langsung hilang dari pencarian; tidak ada versi lama yang tetap tampil. |
| Pengelolaan `AksesTopSecret` | Disimpan di tabel `AksesTopSecret`, diisi lewat `prisma/seed.ts` atau skrip server CLI (`scripts/akses-top-secret.ts`). Tidak ada halaman atau API yang menampilkan daftar ini ke klien. |
| Verifikator dan `TOP_SECRET` | Verifikator (`ADMIN`) boleh membuka dokumen apa pun di antrean verifikasinya (termasuk `TOP_SECRET`) hanya untuk pemeriksaan. |
| `SPECIAL_GUEST` | Dapat membuka `PUBLIK`, `PRIVAT_DOSEN`, `PRIVAT_TENDIK`; `TOP_SECRET` hanya jika terdaftar di `AksesTopSecret`. Hanya baca. |
| Tanggal berakhir dokumen | 31 Desember pukul 23:59:59 WIB (akhir hari) dari tahun `berlakuSampai`. |
| Batas "segera berakhir" | Default `60` hari, disimpan di tabel `Pengaturan` (`kunci = 'batas_segera_berakhir_hari'`). |
| Kategori per dokumen | Satu kategori paling bawah (leaf category, tanpa anak). |
| Peran dan jenis akun | Satu akun memiliki tepat satu `Peran` dan satu `JenisAkun`. |
| Pembuatan akun | Hanya oleh `SUPER_ADMIN` (tanpa pendaftaran mandiri). |
| Cek link mati | Prototipe memakai permintaan HTTP `HEAD`/`GET` biasa; file privat di Drive mungkin tidak terdeteksi secara mendalam (tanpa Google Drive API). |
| Viewer dokumen & pinjam sementara | Ditunda / di luar cakupan sesuai Bagian 15 SPEC. |

## 2. Keputusan Teknis Implementasi

1. **Package manager & Runtime**: Menggunakan `npm` dengan Node.js 24, Next.js App Router + TypeScript, Prisma ORM (PostgreSQL), dan Vitest untuk pengujian otomatis.
2. **Timeout lock verifikator 30 menit (`Dokumen.diperiksaSejak`)**:
   - Menambahkan kolom `diperiksaSejak DateTime?` pada model `Dokumen` di samping `diperiksaOleh String?` agar batas 30 menit tanpa aktivitas dihitung akurat tanpa tercampur `@updatedAt` (`diubah`).
3. **Deduplikasi laporan link mati (`LaporanLink`)**:
   - Aturan bisnis F6 melarang pelapor yang sama memiliki lebih dari satu laporan **terbuka** (`BARU` atau `SEDANG_DIPERBAIKI`) untuk dokumen yang sama, sekaligus mencegah laporan ganda dari sistem (`pelaporId = null`).
   - Karena constraint `@@unique([dokumenId, pelaporId, status])` di PostgreSQL memperlakukan `NULL` sebagai berbeda dan akan bentrok ketika pelapor yang sama memiliki lebih dari satu laporan historis berstatus `SELESAI`/`DITUTUP`, validasi duplikasi laporan terbuka dijalankan secara eksplisit dalam transaksi database (didukung `@@index([dokumenId, pelaporId, status])`).
4. **Validasi sesi real-time (F1)**:
   - Auth.js memakai cookie sesi `httpOnly`, `secure` (di production), `sameSite=lax`.
   - Setiap permintaan server memanggil `getCurrentUser()` yang membaca status terbaru (`aktif`, `peran`, `jenis`, `tanggalBerakhir`) langsung dari PostgreSQL agar penonaktifan akun, perubahan peran, dan kedaluwarsa `SPECIAL_GUEST` langsung berlaku tanpa login ulang.
5. **Perbaikan `linkDrive` pada dokumen `TERBIT` (F6 vs Bagian 7)**:
   - `PATCH /api/dokumen/[id]` tetap menolak edit dokumen `MENUNGGU`/`TERBIT` (403).
   - Perbaikan `linkDrive` pada dokumen `TERBIT` yang memiliki laporan link mati terbuka dilakukan melalui jalur khusus pada endpoint laporan (`PATCH /api/laporan/[id]`) yang hanya mengizinkan perubahan `linkDrive` oleh uploader pemilik dan mencatat log `LINK_DIPERBAIKI`.
6. **Penyelarasan Mockup vs SPEC**:
   - Mengikuti Bagian 17 SPEC (bagian spesifik F1–F13 menang atas ringkasan/mockup):
     - Daftar periksa verifikator menggunakan **4 poin** sesuai F3.
     - Halaman detail menyertakan tombol **Salin tautan** sesuai F5 & F11.
     - Verifikator hanya memilih `tipeAkses` akhir saat ACC (metadata lain bersifat baca-saja; jika salah, dikembalikan ke revisi).
     - Menambahkan halaman `/admin/pengaturan` dan `/api/admin/pengaturan` khusus `SUPER_ADMIN` untuk mengelola `batas_segera_berakhir_hari`.
7. **Hashing password**: Menggunakan `bcryptjs` agar kompatibel lintas OS (Windows lokal & Vercel serverless) tanpa dependensi native.
8. **Rate limiting (Bagian 11.7)**: Menggunakan limiter in-memory sliding window untuk prototipe pada `/api/cari`, `/api/judul-mirip`, dan login (dapat ditingkatkan ke Redis/Upstash saat produksi skala besar).
9. **Wewenang khusus `REKTOR` mengunci dokumen (permintaan pengguna)**:
   - Menambahkan kolom `dikunci Boolean @default(false)` dan `alasanKunci String?` pada model `Dokumen`.
   - `REKTOR` tetap bersifat baca-saja untuk aksi operasional admin/verifikator, tetapi memiliki wewenang eksklusif (`KUNCI_DOKUMEN` via `POST /api/dokumen/[id]/kunci`) untuk mengunci atau membuka kunci dokumen `TERBIT`.
   - Dokumen dengan `dikunci = true` langsung mengembalikan `TIDAK_ADA` di `tampilanDokumen()`, hilang dari pencarian/beranda/detail, dan setiap aksi dicatat di `LogAktivitas` (`DOKUMEN_DIKUNCI` / `DOKUMEN_DIBUKA_KUNCI`).
10. **Login dengan `username` & password default `123` (permintaan pengguna)**:
    - Menambahkan kolom `username String @unique` pada `Pengguna`. Login menerima `username` (serta tetap mendukung `email` sebagai cadangan), dan seluruh akun seed menggunakan kata sandi default `123`.
11. **Hapus panel Pengaturan batas segera berakhir & hapus manual Special Guest (permintaan pengguna)**:
    - Panel UI pengaturan `batas_segera_berakhir_hari` dihapus dari `/admin/akun` (tetap memakai default 60 hari).
    - Akun `SPECIAL_GUEST` tidak lagi mewajibkan `tanggalBerakhir` dan tidak dinonaktifkan otomatis; Super Admin dapat menghapus/menonaktifkannya secara manual melalui tombol **Hapus** / **Nonaktifkan** di `/admin/akun` (`DELETE /api/admin/akun`).
