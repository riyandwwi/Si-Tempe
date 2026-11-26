# Panduan Deploy ke VPS (Coolify)

Panduan singkat deploy repo `riyandwwi/Si-Tempe` ke VPS Hostinger dengan **Coolify**.

## 1. Buat Database PostgreSQL di Coolify
1. Masuk ke dashboard Coolify → buka **Project** → klik **+ Add New Resource**.
2. Pilih **Database** → **PostgreSQL** (versi 16).
3. Klik **Start** untuk menyalakan database.
4. Salin **Postgres URL (Internal)** (contoh: `postgresql://postgres:xxxx@xxxx:5432/postgres`).

## 2. Tambah Aplikasi dari GitHub
1. Di Project yang sama → klik **+ Add New Resource**.
2. Pilih **Public Repository** (atau hubungkan GitHub App untuk repo privat) → masukkan `https://github.com/riyandwwi/Si-Tempe` (branch `main`).
3. Pada **Build Pack**, pilih **Dockerfile** (Coolify otomatis membaca `Dockerfile` di root repo).
4. Pastikan **Ports Exposes** diisi `3000`.

## 3. Isi Environment Variables
Buka tab **Environment Variables** pada aplikasi di Coolify, lalu tambahkan:

| Key | Contoh Nilai |
|---|---|
| `DATABASE_URL` | *(tempel Postgres URL Internal dari langkah 1)* |
| `AUTH_SECRET` | *(string acak minimal 32 karakter)* |
| `AUTH_TRUST_HOST` | `true` |
| `CRON_SECRET` | *(string acak untuk proteksi endpoint cron)* |
| `RESEND_API_KEY` | *(opsional — kosongkan dulu jika belum pakai email Resend)* |

## 4. Deploy & Isi Data Awal (Seed)
1. Klik **Deploy**. Saat container menyala, aplikasi otomatis menjalankan `prisma db push` untuk membuat seluruh tabel di PostgreSQL.
2. Setelah status **Running**, buka tab **Terminal** di halaman aplikasi Coolify, lalu jalankan **sekali saja**:
   ```bash
   npm run db:seed
   ```
3. Selesai! Akun awal sudah siap dipakai (password default semua: `123`, segera ubah/kelola lewat akun `superadmin`).

## 5. Pasang Domain / Subdomain & HTTPS
1. Arahkan DNS **A Record** domain/subdomain (mis. `dokumen.itbmp.ac.id`) ke **IP VPS** kamu.
2. Di Coolify → tab **General** → isi **Domains** dengan `https://dokumen.itbmp.ac.id` → klik **Save** & **Redeploy**. SSL/HTTPS aktif otomatis.

## 6. Jadwalkan Cron (Pengingat & Cek Link)
Di Coolify → tab **Scheduled Tasks** pada aplikasi, tambahkan 2 jadwal:
- **Harian** (`0 1 * * *` / 08:00 WIB):
  ```bash
  curl -s -H "Authorization: Bearer $CRON_SECRET" http://localhost:3000/api/cron/harian
  ```
- **Mingguan** (`0 2 * * 0` / Minggu 09:00 WIB):
  ```bash
  curl -s -H "Authorization: Bearer $CRON_SECRET" http://localhost:3000/api/cron/mingguan
  ```
