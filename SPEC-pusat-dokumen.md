# SPEC: Pusat Dokumen Kampus (ITBMP)

Dokumen ini adalah spesifikasi untuk membangun aplikasi. Ikuti persis. Jika ada hal yang tidak tertulis, pilih opsi paling aman dan paling sederhana, lalu catat pilihanmu di `DECISIONS.md`. Jangan menambah fitur di luar dokumen ini.

Referensi tampilan: file `pusat-dokumen-mockup.html` (5 layar: Pencarian, Detail, Uploader, Verifikator, Administrator). Ikuti struktur dan teksnya. Data di mockup hanya contoh.

---

## 1. Tujuan

Website pencarian dokumen kampus. **File asli tetap di Google Drive.** Website hanya menyimpan metadata dan link Drive. Pengguna mencari dokumen, melihat detail, lalu membuka link Drive jika berhak.

Empat tipe akses dokumen: `PUBLIK`, `PRIVAT_DOSEN`, `PRIVAT_TENDIK`, `TOP_SECRET`.

## 2. Stack

| Bagian | Pilihan |
|---|---|
| Framework | Next.js (App Router) + TypeScript |
| Database | PostgreSQL (Supabase atau Neon) |
| ORM | Prisma |
| Login | Auth.js (credentials atau Google dengan email kampus) |
| Hosting prototipe | Vercel Hobby |
| Tugas terjadwal | Vercel Cron |
| Email | Resend atau SMTP (hanya untuk pengingat) |

Aturan teknis:
- Semua pemeriksaan hak akses dilakukan **di server** (Route Handler / Server Action). Tampilan hanya mengikuti hasil server.
- Jangan pernah mengirim `deskripsi`, `linkDrive`, atau `daftar berhak` ke klien jika pengguna tidak berhak.
- Rahasia (database URL, secret) hanya lewat environment variable.
- Tidak ada upload file ke website. Tidak ada OCR. Tidak ada Meilisearch. Tidak ada toleransi typo.

## 3. Enum

```ts
enum Peran { SUPER_ADMIN, ADMIN, UPLOADER, PENGGUNA, REKTOR, SPECIAL_GUEST }
enum JenisAkun { DOSEN, TENDIK, LAINNYA }
enum TipeAkses { PUBLIK, PRIVAT_DOSEN, PRIVAT_TENDIK, TOP_SECRET }
enum StatusDokumen { DRAFT, MENUNGGU, REVISI, TERBIT }
enum StatusLaporan { BARU, SEDANG_DIPERBAIKI, SELESAI, DITUTUP }
```

`ADMIN` = verifikator. Satu akun punya tepat satu `Peran` dan satu `JenisAkun`.

## 4. Model data (Prisma)

```prisma
model Pengguna {
  id            String     @id @default(cuid())
  nama          String
  email         String     @unique
  passwordHash  String?
  peran         Peran
  jenis         JenisAkun
  aktif         Boolean    @default(true)
  tanggalBerakhir DateTime?          // wajib untuk SPECIAL_GUEST
  dibuat        DateTime   @default(now())
  dokumen       Dokumen[]  @relation("Uploader")
  laporan       LaporanLink[]
  log           LogAktivitas[]
}

model Kategori {
  id       String     @id @default(cuid())
  nama     String
  indukId  String?
  induk    Kategori?  @relation("Pohon", fields: [indukId], references: [id])
  anak     Kategori[] @relation("Pohon")
  dokumen  Dokumen[]
}

model Dokumen {
  id             String        @id @default(cuid())
  judul          String
  linkDrive      String
  deskripsi      String
  kategoriId     String
  kategori       Kategori      @relation(fields: [kategoriId], references: [id])
  tahun          Int
  berlakuSampai  Int?                       // tahun; null = tidak kedaluwarsa
  kataKunci      String        @default("") // dipisah koma
  tipeAkses      TipeAkses                  // nilai final dari verifikator
  usulanAkses    TipeAkses                  // usulan uploader
  status         StatusDokumen @default(DRAFT)
  uploaderId     String
  uploader       Pengguna      @relation("Uploader", fields: [uploaderId], references: [id])
  diperiksaOleh  String?                    // id verifikator yang sedang memeriksa
  catatanRevisi  String?
  dibuat         DateTime      @default(now())
  diubah         DateTime      @updatedAt
  diterbitkan    DateTime?
  linkBermasalah Boolean       @default(false)
  pengingat60    Boolean       @default(false)
  pengingat14    Boolean       @default(false)
  akses          AksesTopSecret[]
  laporan        LaporanLink[]
  @@index([status, tipeAkses])
  @@index([kategoriId])
  @@index([tahun])
}

model AksesTopSecret {         // HANYA dibaca server. Jangan pernah dikirim ke klien.
  dokumenId  String
  penggunaId String
  dokumen    Dokumen @relation(fields: [dokumenId], references: [id])
  @@id([dokumenId, penggunaId])
}

model LaporanLink {
  id         String        @id @default(cuid())
  dokumenId  String
  dokumen    Dokumen       @relation(fields: [dokumenId], references: [id])
  pelaporId  String?       // null = dilaporkan sistem
  pelapor    Pengguna?     @relation(fields: [pelaporId], references: [id])
  status     StatusLaporan @default(BARU)
  dibuat     DateTime      @default(now())
  selesai    DateTime?
  @@unique([dokumenId, pelaporId, status]) // cegah laporan ganda yang masih terbuka
}

model LogAktivitas {            // hanya INSERT. Jangan ada update/delete.
  id         String   @id @default(cuid())
  waktu      DateTime @default(now())
  pelakuId   String?
  pelaku     Pengguna? @relation(fields: [pelakuId], references: [id])
  aksi       String
  dokumenId  String?
  rincian    String?
  @@index([dokumenId])
}

model Pengaturan {
  kunci String @id
  nilai String
}
```

Pengaturan awal: `batas_segera_berakhir_hari = 60`.

## 5. Peran dan izin aksi

| Aksi | SUPER_ADMIN | ADMIN | UPLOADER | PENGGUNA | REKTOR | SPECIAL_GUEST |
|---|---|---|---|---|---|---|
| Cari dan lihat dokumen sesuai tipe akses | ya | ya | ya | ya | ya | ya |
| Buat dan kirim dokumen | tidak | tidak | ya | tidak | tidak | tidak |
| Edit dokumen sendiri (Draft/Revisi) | tidak | tidak | ya | tidak | tidak | tidak |
| ACC, kembalikan revisi, batal ACC, tentukan tipe akses | tidak | ya | tidak | tidak | tidak | tidak |
| Lapor link mati | ya | ya | ya | ya | ya | ya |
| Lihat laporan link mati | semua | semua | dokumen sendiri | tidak | semua | tidak |
| Lihat log aktivitas | semua | semua | dokumen sendiri | tidak | semua | tidak |
| Dashboard administrator | ya | ya | tidak | tidak | ya | tidak |
| Kelola akun, kategori, pengaturan | ya | tidak | tidak | tidak | tidak | tidak |

`ADMIN` dan `SUPER_ADMIN` sudah terhitung "administrator". `REKTOR` hanya melihat dashboard, tidak mengubah apa pun.

Satu fungsi pusat `can(user, aksi, dokumen?)` memeriksa tabel ini. Semua endpoint memakainya. Jangan menyalin logika ini ke banyak tempat.

## 6. Aturan akses dokumen (inti aplikasi)

### 6.1 Fungsi keputusan

```ts
type Tampilan = 'LENGKAP' | 'TERBATAS' | 'TIDAK_ADA';

function tampilanDokumen(user: Pengguna | null, d: Dokumen): Tampilan {
  if (d.status !== 'TERBIT') return 'TIDAK_ADA';            // kecuali alur kerja uploader/verifikator (bagian 7)
  if (d.tipeAkses === 'PUBLIK') return 'LENGKAP';
  if (!user || !akunMasihAktif(user)) return 'TIDAK_ADA';   // tamu tidak melihat dokumen non-publik
  switch (d.tipeAkses) {
    case 'PRIVAT_DOSEN':
      return (user.jenis === 'DOSEN' || user.peran === 'SPECIAL_GUEST') ? 'LENGKAP' : 'TERBATAS';
    case 'PRIVAT_TENDIK':
      return (user.jenis === 'TENDIK' || user.peran === 'SPECIAL_GUEST') ? 'LENGKAP' : 'TERBATAS';
    case 'TOP_SECRET':
      return adaDiDaftarBerhak(user.id, d.id) ? 'LENGKAP' : 'TERBATAS';
  }
}
```

`akunMasihAktif`: `aktif === true` dan (`tanggalBerakhir` null atau belum lewat).

### 6.2 Dua bentuk tampilan

| Data | LENGKAP | TERBATAS |
|---|---|---|
| judul | ya | ya |
| kategori (jalur) | ya | ya |
| tahun, berlakuSampai, status berlaku | ya | tidak |
| deskripsi | ya | **tidak dikirim** |
| linkDrive | ya | **tidak dikirim** |
| label tipe | nama tipe | nama tipe. Top Secret hanya "Top Secret", **jangan** menyebut siapa yang berhak |
| tombol | Lihat detail, Buka di Google Drive | tidak ada. Hanya pesan "Anda tidak bisa mengakses dokumen ini" |

Bentuk TERBATAS dibuat di server dengan mengambil hanya kolom `id, judul, kategoriId, tipeAkses`. Kolom lain tidak pernah dibaca ke respons.

### 6.3 Aturan khusus

- Tamu hanya melihat dokumen `PUBLIK` (beranda, pencarian, detail).
- Verifikator boleh membuka dokumen apa pun yang ada di antrean verifikasinya, apa pun tipenya, hanya untuk memeriksa.
- Special Guest: boleh membuka `PUBLIK`, `PRIVAT_DOSEN`, `PRIVAT_TENDIK`. `TOP_SECRET` hanya jika ada di `AksesTopSecret`. Hanya baca.
- Halaman detail dokumen TERBATAS atau TIDAK_ADA hanya menampilkan pesan penolakan, tanpa metadata lain.
- **Pembukaan dokumen Top Secret tidak boleh dicatat di log mana pun.**
- Daftar `AksesTopSecret` tidak boleh punya halaman atau endpoint yang menampilkannya ke siapa pun. Pengaturannya lewat kode admin/seed atau operasi server khusus (lihat asumsi di bagian 17).

## 7. State machine dokumen

```
DRAFT --kirim--> MENUNGGU --ACC--> TERBIT
                    |                 |
                kembalikan          batal ACC
                    v                 v
                  REVISI <------------+
                    |
                  kirim ulang --> MENUNGGU
```

| Dari | Ke | Aktor | Syarat | Efek |
|---|---|---|---|---|
| DRAFT | MENUNGGU | uploader pemilik | validasi penuh lolos | dokumen terkunci untuk uploader; log `DOKUMEN_DIKIRIM` |
| MENUNGGU | TERBIT | ADMIN | semua poin daftar periksa dicentang; tipeAkses dipilih | set `diterbitkan = now`, kosongkan `catatanRevisi`; log `ACC_TERBIT` (dengan tipe akhir); jika tipeAkses != usulanAkses, log `TIPE_AKSES_DIUBAH` |
| MENUNGGU | REVISI | ADMIN | catatan wajib | simpan `catatanRevisi`; log `DIKEMBALIKAN` |
| REVISI | MENUNGGU | uploader pemilik | validasi penuh lolos | log `DOKUMEN_DIKIRIM_ULANG` |
| TERBIT | REVISI | ADMIN | alasan wajib | dokumen hilang dari pencarian; simpan alasan di `catatanRevisi`; log `BATAL_ACC` |

Aturan:
- Hanya DRAFT dan REVISI yang bisa diedit, dan hanya oleh uploader pemilik. Selain itu tolak dengan 403.
- Perpindahan di luar tabel ini ditolak dengan 409.
- Satu dokumen diperiksa satu verifikator pada satu waktu: saat verifikator membuka dokumen di antrean, set `diperiksaOleh`; verifikator lain melihat "sedang diperiksa oleh X" dan tidak bisa ACC. Lepaskan saat selesai atau setelah 30 menit tanpa aktivitas.
- Setiap perpindahan dan penulisan log berjalan dalam satu transaksi database.

---

## 8. Fitur

Setiap fitur memuat alur, validasi, dan kriteria penerimaan (**Terima jika**).

### F1. Login dan akun

Alur:
1. Pengguna login. Server membaca `peran`, `jenis`, `aktif`, `tanggalBerakhir`.
2. Akun nonaktif atau `tanggalBerakhir` sudah lewat: tolak login dan tolak sesi yang masih berjalan (cek di setiap permintaan, bukan hanya saat login).
3. Super admin membuat, menonaktifkan akun, dan mengubah peran di halaman Admin Akun. Perubahan berlaku pada permintaan berikutnya.

**Terima jika:** akun Special Guest yang `tanggalBerakhir`-nya kemarin ditolak walau sesi masih ada; perubahan peran langsung berlaku tanpa login ulang; semua aksi akun tercatat di log.

### F2. Unggah dokumen (uploader)

Halaman: `/uploader/baru`, `/uploader/dokumen/[id]/edit`, `/uploader` (daftar "Dokumen saya").

Isian:

| Isian | Wajib | Validasi |
|---|---|---|
| linkDrive | ya | URL berpola `https://drive.google.com/...` atau `https://docs.google.com/...`; simpan apa adanya |
| judul | ya | 5 sampai 200 karakter |
| deskripsi | ya | minimal 20 karakter; tampilkan petunjuk template "[Jenis dokumen] tentang [isi utama], untuk [angkatan / periode / unit]" |
| kategoriId | ya | harus kategori paling bawah (tanpa anak) |
| tahun | ya | integer 4 digit, 1990 sampai tahun sekarang + 1 |
| berlakuSampai | tidak | jika diisi, harus >= tahun |
| kataKunci | tidak | dipisah koma, disimpan dinormalkan (huruf kecil, spasi dirapikan) |
| usulanAkses | ya | salah satu `TipeAkses`. Saat dikirim, `tipeAkses` diisi sama dengan usulan; verifikator yang menentukan nilai final |

Alur:
1. "Simpan draft": simpan dengan status DRAFT. Validasi longgar (boleh sebagian kosong).
2. "Kirim ke verifikator": validasi penuh. Gagal → kembalikan error per kolom, status tetap. Lolos → MENUNGGU.
3. Dokumen REVISI: tampilkan `catatanRevisi` di atas form; tombol menjadi "Kirim ulang".
4. Daftar "Dokumen saya" menampilkan status: Draft, Menunggu verifikasi (tidak bisa diedit), Perlu revisi (ada catatan dan tombol edit), Terbit (tidak bisa diedit).

**Terima jika:** uploader lain tidak bisa mengedit dokumen ini; dokumen MENUNGGU/TERBIT tidak bisa diedit (403); validasi mengembalikan pesan per kolom.

### F3. Verifikasi (admin)

Halaman: `/verifikasi` (antrean), `/verifikasi/[id]` (pemeriksaan).

Antrean: dokumen berstatus MENUNGGU, yang tertua di atas. Tab lain: "Sudah terbit".

Halaman pemeriksaan:
- Tampilkan semua data dokumen, link Drive, dan daftar dokumen berjudul mirip (termasuk yang Top Secret, lihat F9).
- Daftar periksa (semua harus dicentang sebelum ACC aktif):
  1. Judul, kategori, tahun, dan angkatan terisi benar
  2. Deskripsi sesuai template dan memuat kata yang biasa dicari
  3. Link Drive bisa dibuka
  4. Izin Google Drive sesuai tipe akses yang dipilih
- Pilih `tipeAkses` akhir (nilai awal = usulan uploader).
- Tombol: **ACC dan terbitkan**, **Kembalikan ke revisi** (wajib catatan), dan untuk dokumen TERBIT: **Batalkan ACC** (wajib alasan).
- Teks bantuan di samping pilihan tipe: "Publik: Drive Anyone with the link. Privat: Drive dibagikan ke akun/domain kampus. Top Secret: Drive hanya dibagikan ke email yang berhak."

**Terima jika:** ACC tidak bisa ditekan jika ada poin yang belum dicentang; catatan/alasan kosong ditolak; dua verifikator tidak bisa ACC dokumen yang sama bersamaan; semua perpindahan tercatat.

### F4. Pencarian, filter, kategori

Halaman: `/cari` dengan query string (`q`, `tahun`, `mode`, `status`, `kategori`, `urut`, `hal`).

Logika kata kunci:
1. Pecah `q` menjadi kata (spasi), huruf kecil, buang kata kosong.
2. Dokumen cocok jika **setiap kata** ada (ILIKE `%kata%`) di `judul`, `deskripsi`, atau `kataKunci`.
3. Untuk dokumen yang tampilannya TERBATAS bagi pengguna ini, **cocokkan hanya `judul` dan nama kategori**, bukan deskripsi dan kata kunci (supaya isi tidak bisa ditebak).
4. Hanya dokumen `status = TERBIT`. Tamu hanya `PUBLIK`.
5. `q` kosong: tampilkan semua yang boleh dilihat, urut terbaru.

Cara implementasi (Prisma, tanpa SQL mentah kecuali perlu; selalu berparameter, jangan menyambung string dari input pengguna):

1. Bangun syarat dasar: `status = TERBIT`, ditambah `tipeAkses = PUBLIK` untuk tamu, ditambah filter tahun, status berlaku, dan kategori.
2. Tentukan himpunan id dokumen yang boleh dilihat LENGKAP oleh pengguna ini:
   - tipe `PUBLIK`;
   - `PRIVAT_DOSEN` jika jenis akun DOSEN atau peran SPECIAL_GUEST;
   - `PRIVAT_TENDIK` jika jenis akun TENDIK atau peran SPECIAL_GUEST;
   - `TOP_SECRET` hanya yang id-nya ada di `AksesTopSecret` untuk pengguna ini.
3. Dua kelompok pencocokan kata, digabung dengan `OR`:
   - kelompok LENGKAP: dokumen dalam himpunan langkah 2, setiap kata ada di `judul` ATAU `deskripsi` ATAU `kataKunci`;
   - kelompok TERBATAS: dokumen di luar himpunan itu, setiap kata ada di `judul` ATAU nama kategori saja.
4. Ambil hasil. Untuk baris kelompok TERBATAS, ambil hanya `id, judul, kategoriId, tipeAkses` (jangan membaca `deskripsi` dan `linkDrive` sama sekali).
5. Hitung angka filter dan kategori dengan syarat yang sama.

Yang wajib: **kolom `deskripsi` dan `linkDrive` tidak pernah masuk respons untuk baris TERBATAS.**

Filter (bekerja bersamaan dengan kata kunci dan hak akses):

| Kontrol | Logika |
|---|---|
| Tahun (centang, boleh banyak) | `mode=dibuat` memfilter `tahun`; `mode=expired` memfilter `berlakuSampai` |
| Status | Berlaku: `berlakuSampai` null atau akhir tahun itu lebih dari batas hari ke depan. Segera berakhir: tinggal ≤ `batas_segera_berakhir_hari`. Kedaluwarsa: sudah lewat. Akhir masa berlaku = 31 Desember `berlakuSampai` |
| Kategori | Memilih induk menyertakan semua turunan (gunakan daftar id turunan) |
| Urut | `relevan` (judul cocok dulu, lalu terbaru), `terbaru` (`diterbitkan` turun), `judul` (A–Z) |

Angka di samping filter dan kategori (mis. "Akademik (24)") **dihitung dari hasil yang boleh dilihat pengguna ini**, memakai syarat hak akses yang sama.

Batas halaman: 20 hasil per halaman.

Konsekuensi yang diterima (jangan "diperbaiki"): salah ketik tidak ditemukan; "25" cocok juga dengan "125".

**Terima jika:** "pembimbing skripsi 2025" menemukan dokumen berdeskripsi "penetapan dosen pembimbing skripsi pada angkatan 2025"; dosen yang mencari kata yang hanya ada di deskripsi dokumen Top Secret tidak mendapat dokumen itu; angka kategori tidak menghitung dokumen yang tidak boleh dilihat; tamu hanya mendapat dokumen Publik.

### F5. Detail dokumen dan beranda

Detail `/dokumen/[id]`:
1. Server menghitung `tampilanDokumen`.
2. LENGKAP: tampilkan judul, label tipe, jalur kategori, deskripsi, tahun dokumen, berlaku sampai, status berlaku, tanggal terbit, tombol "Buka di Google Drive" (tab baru), "Laporkan link mati", "Salin tautan".
3. TERBATAS atau TIDAK_ADA: tampilkan hanya pesan "Anda tidak bisa mengakses dokumen ini" (tanpa metadata lain).

Beranda `/`:
- 10 dokumen terakhir diterbitkan, urut terbaru, dengan aturan tampilan yang sama (TERBATAS untuk yang tidak berhak). Tamu hanya melihat dokumen Publik.
- Pintasan ke pencarian; untuk uploader, ke "Dokumen saya"; untuk admin, ke antrean verifikasi.

**Terima jika:** membuka alamat detail dokumen yang tidak berhak tidak mengembalikan deskripsi atau link di HTML maupun JSON.

### F6. Laporan link mati dan cek link

Alur laporan:
1. Pengguna yang melihat dokumen LENGKAP menekan "Laporkan link mati".
2. Buat `LaporanLink` status BARU. Jika pengguna yang sama sudah punya laporan terbuka (BARU/SEDANG_DIPERBAIKI) untuk dokumen itu, tolak dengan pesan "Anda sudah melaporkan dokumen ini".
3. Uploader dokumen dan administrator melihat laporan di dashboard masing-masing.
4. "Cek link": server mencoba memeriksa link. Untuk prototipe: `HEAD`/`GET` ke linkDrive dan anggap mati jika status 404 atau halaman "tidak ditemukan". Tampilkan hasilnya. (Cek mendalam untuk file privat butuh Drive API, di luar cakupan.)
5. Mati: uploader memperbaiki `linkDrive` → status SEDANG_DIPERBAIKI → Selesai setelah cek ulang berhasil. Perubahan link pada dokumen TERBIT tidak perlu ACC ulang, tetapi dicatat di log `LINK_DIPERBAIKI`.
6. Ternyata baik: tutup laporan dengan status DITUTUP.
7. Tombol "Cek semua link" (administrator) dan tugas mingguan memeriksa semua dokumen TERBIT; yang gagal dibuatkan laporan dengan `pelaporId = null` dan `linkBermasalah = true`.

**Terima jika:** pelapor yang sama tidak bisa membuat laporan kedua untuk dokumen yang sama selagi masih terbuka; uploader hanya melihat laporan dokumennya sendiri.

### F7. Pengingat dokumen segera berakhir

Tugas harian (cron, 1 kali sehari):
1. Ambil dokumen TERBIT dengan `berlakuSampai` tidak null.
2. Hitung sisa hari ke 31 Desember tahun itu.
3. Sisa ≤ 60 dan `pengingat60 = false`: kirim email ke uploader, set `pengingat60 = true`.
4. Sisa ≤ 14 dan `pengingat14 = false`: kirim email ke uploader, set `pengingat14 = true`.
5. Dashboard administrator menampilkan daftar "Segera berakhir" (sisa ≤ 60 hari), diurut sisa terkecil.
6. Tombol manual "Kirim pengingat ke uploader" mengirim email untuk dokumen yang dipilih.
7. Dokumen kedaluwarsa tetap tampil di pencarian dengan label "Sudah kedaluwarsa". Tidak dihapus otomatis.
8. Memperbarui dokumen yang sudah terbit: verifikator membatalkan ACC → uploader mengedit → di-ACC ulang.

**Terima jika:** email 60 hari tidak terkirim dua kali untuk dokumen yang sama; status berlaku dihitung seragam di pencarian, detail, dan dashboard (satu fungsi `statusBerlaku(berlakuSampai)`).

### F8. Log aktivitas

Aksi yang ditulis ke `LogAktivitas`: `DOKUMEN_DIKIRIM`, `DOKUMEN_DIKIRIM_ULANG`, `DIKEMBALIKAN`, `ACC_TERBIT`, `BATAL_ACC`, `TIPE_AKSES_DIUBAH`, `LINK_DIPERBAIKI`, `AKUN_DIBUAT`, `AKUN_DINONAKTIFKAN`, `PERAN_DIUBAH`, `GUEST_DIBUAT`, `GUEST_KEDALUWARSA`.

Aturan:
- Tulis log dalam transaksi yang sama dengan aksinya. Aksi gagal tidak mencatat.
- Hanya INSERT. Tidak ada endpoint update/delete log.
- **Tidak ada log untuk pembukaan dokumen apa pun**, terutama Top Secret.
- Administrator dan rektor melihat seluruh log (filter per dokumen dan per pelaku). Uploader hanya melihat log dokumen yang ia unggah ("Riwayat aktivitas saya"). Pengguna lain tidak melihat log.

**Terima jika:** uploader tidak bisa melihat baris log dokumen uploader lain; tidak ada baris log saat dokumen Top Secret dibuka.

### F9. Peringatan judul mirip

Endpoint `GET /api/judul-mirip?judul=...` (hanya UPLOADER dan ADMIN):
1. Pecah judul menjadi kata (abaikan kata di bawah 3 huruf).
2. Cari dokumen lain yang judulnya memuat sedikitnya dua pertiga kata itu.
3. Respons untuk **uploader**: daftar `{judul, tahun}` untuk dokumen PUBLIK/PRIVAT; untuk dokumen TOP_SECRET hanya `jumlahTerbatas` (angka), tanpa judul. Tampilkan "Ada N dokumen lain yang mirip tetapi bersifat terbatas".
4. Respons untuk **admin** di halaman verifikasi: daftar lengkap termasuk Top Secret.
5. Panggil setelah pengguna berhenti mengetik sekitar 500 ms. Peringatan tidak memblokir pengiriman.
6. Hanya judul yang dibandingkan, bukan isi file.

**Terima jika:** respons untuk uploader tidak memuat judul dokumen Top Secret.

### F10. Special Guest

1. Super admin membuat akun dengan peran `SPECIAL_GUEST`, `jenis = LAINNYA`, dan `tanggalBerakhir` **wajib**.
2. Akun membuka dokumen sesuai bagian 6.3. Hanya baca.
3. Pada `tanggalBerakhir`, akun ditolak (lihat F1). Cron harian menulis log `GUEST_KEDALUWARSA` dan menandai `aktif = false`.
4. Super admin dapat menonaktifkan lebih awal.
5. Catatan operasional (ditulis di halaman pembuatan akun): izin Google Drive untuk asesor dari luar kampus perlu diberikan pengelola Drive dan dicabut setelah asesmen.

**Terima jika:** pembuatan akun tanpa `tanggalBerakhir` ditolak; akun tidak bisa mengunggah, memverifikasi, atau membuka dashboard.

### F11. Salin tautan

Tombol di halaman detail menyalin URL halaman detail (`/dokumen/[id]`), bukan linkDrive. Tampilkan konfirmasi "Tautan disalin". Penerima tetap melewati F5.

### F12. Dashboard administrator

Halaman `/admin` (ADMIN, SUPER_ADMIN, REKTOR). Tiga panel:
1. **Segera berakhir**: tabel dokumen, berlaku sampai, sisa hari, uploader, tombol "Kirim pengingat ke uploader".
2. **Laporan link mati**: daftar laporan, jumlah pelapor, status, tombol "Cek link", "Tandai selesai", dan "Cek semua link".
3. **Log aktivitas**: tabel waktu, pelaku, aksi. Catatan di bawah tabel: "Pembukaan dokumen Top Secret tidak dicatat di log ini."

REKTOR hanya melihat. Tombol aksi disembunyikan untuk REKTOR dan **ditolak server** jika dipanggil.

### F13. Manajemen akun dan kategori (super admin)

- `/admin/akun`: daftar, buat, nonaktifkan, ubah peran dan jenis. Tidak menampilkan daftar `AksesTopSecret`.
- `/admin/kategori`: pohon kategori (tambah, ubah nama, pindah induk, hapus jika tidak punya dokumen atau anak). Kedalaman bebas. Dokumen hanya boleh dipasang pada kategori tanpa anak.

---

## 9. Halaman (route)

| Route | Siapa | Isi |
|---|---|---|
| `/` | semua | Beranda: dokumen terbaru |
| `/cari` | semua | Pencarian + filter + pohon kategori |
| `/dokumen/[id]` | semua (hasil sesuai F5) | Detail dokumen |
| `/masuk` | tamu | Login |
| `/uploader`, `/uploader/baru`, `/uploader/dokumen/[id]/edit` | UPLOADER | Dokumen saya, form unggah/edit, laporan link mati dokumen sendiri, riwayat aktivitas sendiri |
| `/verifikasi`, `/verifikasi/[id]` | ADMIN | Antrean dan pemeriksaan |
| `/admin` | ADMIN, SUPER_ADMIN, REKTOR | Dashboard |
| `/admin/akun`, `/admin/kategori` | SUPER_ADMIN | Pengelolaan |

Tata letak `/cari`: kotak cari di atas; kiri filter (Tahun dengan pilihan Dibuat/Expired, Status berlaku, Urutkan); tengah hasil; kanan pohon kategori dengan angka. Responsif: kolom menumpuk di layar sempit.

## 10. API (Route Handler)

| Method | Path | Fungsi | Peran |
|---|---|---|---|
| GET | `/api/cari` | Pencarian (F4) | semua |
| GET | `/api/dokumen/[id]` | Detail sesuai tampilan (F5) | semua |
| POST | `/api/dokumen` | Simpan draft | UPLOADER |
| PATCH | `/api/dokumen/[id]` | Edit (DRAFT/REVISI, pemilik) | UPLOADER |
| POST | `/api/dokumen/[id]/kirim` | DRAFT/REVISI → MENUNGGU | UPLOADER |
| POST | `/api/dokumen/[id]/acc` | MENUNGGU → TERBIT | ADMIN |
| POST | `/api/dokumen/[id]/kembalikan` | MENUNGGU → REVISI | ADMIN |
| POST | `/api/dokumen/[id]/batal-acc` | TERBIT → REVISI | ADMIN |
| POST | `/api/dokumen/[id]/laporan` | Lapor link mati | login |
| POST | `/api/laporan/[id]/cek` | Cek link | ADMIN, UPLOADER (dokumen sendiri) |
| PATCH | `/api/laporan/[id]` | Ubah status laporan | ADMIN, UPLOADER (dokumen sendiri) |
| GET | `/api/judul-mirip` | Peringatan judul mirip (F9) | UPLOADER, ADMIN |
| GET | `/api/log` | Log (disaring peran) | ADMIN, SUPER_ADMIN, REKTOR, UPLOADER (terbatas) |
| POST | `/api/admin/pengingat` | Kirim pengingat manual | ADMIN, SUPER_ADMIN |
| POST | `/api/admin/cek-semua-link` | Cek semua link | ADMIN, SUPER_ADMIN |
| CRUD | `/api/admin/akun`, `/api/admin/kategori` | Pengelolaan | SUPER_ADMIN |
| GET | `/api/cron/harian`, `/api/cron/mingguan` | Pengingat, Guest kedaluwarsa, cek link | hanya Vercel Cron (header rahasia) |

Setiap handler: (1) ambil sesi, (2) cek akun aktif, (3) cek `can(...)`, (4) validasi input (Zod), (5) jalankan dalam transaksi bila menulis, (6) tulis log bila perlu.

## 11. Keamanan (wajib)

1. Semua hak akses diperiksa di server. Menyembunyikan tombol di tampilan tidak dianggap pengamanan.
2. Respons untuk bentuk TERBATAS tidak boleh memuat `deskripsi`, `linkDrive`, `tahun`, `berlakuSampai`, atau data Top Secret lain. Tulis tes otomatis yang memeriksa ini pada JSON respons.
3. `AksesTopSecret` tidak pernah dikirim ke klien dan tidak punya halaman.
4. Tidak ada log pembukaan dokumen Top Secret.
5. Pencarian memakai query berparameter (tidak ada penyambungan string dari input pengguna).
6. Cron endpoint hanya menerima header rahasia dari Vercel.
7. Batasi laju (rate limit) `/api/cari`, `/api/judul-mirip`, dan login.
8. Cookie sesi `httpOnly`, `secure`, `sameSite=lax`.
9. Link Drive hanya dirender sebagai `<a href rel="noopener noreferrer" target="_blank">` pada tampilan LENGKAP.

Catatan operasional (tampilkan di halaman verifikasi, tidak diimplementasikan di kode): izin Google Drive harus sesuai tipe akses. Publik = Anyone with the link. Privat = dibagikan ke akun atau domain kampus. Top Secret = hanya ke email yang berhak. Website tidak bisa mengunci file Drive.

## 12. Tugas terjadwal

| Tugas | Jadwal | Isi |
|---|---|---|
| Harian | 1 kali/hari | Pengingat 60 dan 14 hari; tandai Special Guest kedaluwarsa dan tulis log |
| Mingguan | 1 kali/minggu | Cek semua link dokumen TERBIT; buat laporan sistem untuk yang gagal |

## 13. Data awal (seed)

- 1 akun SUPER_ADMIN, 2 ADMIN, 2 UPLOADER, 1 REKTOR, 2 DOSEN, 2 TENDIK, 1 SPECIAL_GUEST (berakhir 7 hari ke depan).
- Pohon kategori contoh: Akademik › Perkuliahan › (Mahasiswa, Dosen), Akademik › Kurikulum, Penelitian, Kepegawaian, Keuangan, Kemahasiswaan.
- 12 dokumen contoh di semua status dan keempat tipe akses, termasuk "Penetapan Dosen Pembimbing Skripsi Angkatan 2025" (PRIVAT_DOSEN, TERBIT) dan satu dokumen TOP_SECRET.
- Pengaturan: `batas_segera_berakhir_hari = 60`.

## 14. Uji penerimaan (harus lulus semua)

Hak akses:
1. Tamu mencari "skripsi": hanya dokumen PUBLIK, tidak ada deskripsi/link dokumen lain.
2. Dosen melihat PRIVAT_DOSEN lengkap; PRIVAT_TENDIK dan TOP_SECRET (tanpa hak) hanya judul + pesan penolakan; JSON respons tidak memuat deskripsi/link.
3. Tendik kebalikan dari dosen.
4. Pengguna yang ada di `AksesTopSecret` melihat dokumen Top Secret lengkap; lainnya tidak.
5. Dosen mencari kata yang hanya ada di deskripsi dokumen TERBATAS: tidak ditemukan.
6. Angka kategori hanya menghitung dokumen yang boleh dilihat.
7. Membuka dokumen Top Secret tidak menghasilkan baris log.
8. Akun Special Guest yang kedaluwarsa tidak bisa login dan sesinya ditolak.

Alur dokumen:
9. Uploader tidak bisa mengedit dokumen MENUNGGU atau TERBIT; uploader lain tidak bisa mengedit dokumen ini.
10. ACC ditolak jika daftar periksa belum lengkap; kembalikan/batal ACC ditolak tanpa catatan/alasan.
11. Batal ACC mengeluarkan dokumen dari pencarian seketika.
12. Perpindahan status di luar tabel bagian 7 ditolak (409).

Pencarian:
13. "pembimbing skripsi 2025" menemukan dokumen contoh bagian F4.
14. Filter tahun "Dibuat" dan "Expired" memberi hasil berbeda dan benar.
15. Memilih kategori induk menyertakan dokumen sub-kategorinya.

Fitur lain:
16. Laporan link mati ganda dari akun yang sama ditolak; uploader hanya melihat laporan dokumennya.
17. Peringatan judul mirip tidak mengungkap judul Top Secret ke uploader.
18. Email pengingat 60 hari tidak terkirim dua kali.
19. REKTOR tidak bisa memanggil endpoint ubah apa pun (403).
20. Uploader tidak melihat log dokumen uploader lain.

## 15. Di luar cakupan (jangan dibangun)

- Upload file ke website; viewer dokumen di website; watermark; fitur "pinjam dokumen"/akses sementara
- Sistem tier atau grup akses
- OCR, pencarian isi file, NLP, toleransi typo, Meilisearch
- Integrasi Google Drive API
- Versi dokumen dan penanda "menggantikan dokumen lama"
- Favorit, riwayat pencarian, statistik, notifikasi selain email

## 16. Urutan pengerjaan

1. Setup proyek, Prisma schema, seed, Auth.js, fungsi `can()` dan `tampilanDokumen()` beserta tesnya.
2. Form uploader dan state machine (F2, F3) dengan log (F8).
3. Pencarian, filter, kategori, detail, beranda (F4, F5).
4. Laporan link mati dan cek link (F6), peringatan judul mirip (F9), salin tautan (F11).
5. Dashboard administrator (F12), manajemen akun dan kategori (F13), Special Guest (F10).
6. Cron pengingat dan cek mingguan (F7).
7. Jalankan seluruh uji bagian 14 dan perbaiki.

## 17. Asumsi dan pertanyaan terbuka

Pakai nilai bawaan ini dulu, jangan berhenti untuk bertanya. Catat di `DECISIONS.md`.

| Hal | Nilai bawaan |
|---|---|
| Tamu melihat apa | Hanya dokumen PUBLIK |
| Dokumen dibatalkan ACC | Hilang total dari pencarian, tidak ada versi lama yang tetap tampil |
| Daftar yang berhak atas Top Secret per dokumen | Disimpan di `AksesTopSecret`, diisi lewat seed atau operasi server khusus, tanpa antarmuka. Siapa yang mengatur dan di mana antarmukanya belum diputuskan |
| Verifikator dan Top Secret | Verifikator boleh membuka dokumen apa pun di antreannya untuk memeriksa |
| Special Guest | Membuka PUBLIK, PRIVAT_DOSEN, PRIVAT_TENDIK; Top Secret hanya bila di `AksesTopSecret` |
| Tanggal berakhir dokumen | 31 Desember dari tahun `berlakuSampai` |
| Batas "segera berakhir" | 60 hari, bisa diubah di `Pengaturan` |
| Kategori per dokumen | Satu kategori utama (kasus SK dan RAB masih menunggu keputusan WR) |
| Peran ganda | Satu akun satu peran dan satu jenis |
| Akun | Dibuat super admin (tanpa pendaftaran sendiri) |
| Cek link | Prototipe hanya permintaan HTTP biasa; file privat mungkin tidak terdeteksi |

Jika menemukan konflik antar bagian dokumen ini, bagian yang lebih spesifik (fitur F1 sampai F13 dan bagian 6) menang atas ringkasan.
