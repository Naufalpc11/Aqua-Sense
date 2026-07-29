# Setup Supabase untuk AquaSense

Dokumen ini menjelaskan cara membuat akun Supabase, membuat database table, dan menghubungkannya ke AquaSense.

---

## 🎯 Kenapa Supabase?

- **Database online** → data historis aman walau server restart
- **Bisa di-deploy ke Vercel** → export CSV tetap jalan
- **Gratis** (500 MB, cocok untuk data sensor)
- **Auto API** → ga perlu bikin backend sendiri

---

## Langkah 1: Buat Akun Supabase

1. Buka https://supabase.com
2. Klik **Start your project**
3. Login pakai GitHub (recommended) atau email
4. Klik **New project**

![New Project](https://supabase.com/docs/img/supabase-project.png)

## Langkah 2: Buat Project Baru

Isi form berikut:

| Field | Isi |
|-------|-----|
| **Name** | `aquasense` (atau terserah) |
| **Database Password** | Klik **Generate a secure password** → **Copy & simpan** passwordnya |
| **Region** | Pilih **Southeast Asia** (Singapore) biar cepat |
| **Pricing Plan** | **Free** (sudah cukup) |

Klik **Create new project**. Tunggu ~2 menit sampai selesai.

## Langkah 3: Dapatkan URL & Key

Setelah project jadi:

1. Di sidebar kiri, klik **Project Settings** (ikon gear ⚙️)
2. Klik **API** di menu atas
3. Cari bagian **Project URL** dan **anon public key**:
   - **Project URL**: copy linknya (format `https://xxxxxxxxxxxx.supabase.co`)
   - **anon public**: copy key panjangnya (format `eyJhbGciOiJIUzI1NiIs...`)

![API Settings](https://supabase.com/docs/img/supabase-api-keys.png)

> ⚠️ **Simpan kedua nilai ini**, kita akan pakai di `.env`

## Langkah 4: Buat Table Database

1. Di sidebar kiri, klik **Table Editor**
2. Klik **Create a new table**
3. Isi seperti ini:

| Field | Value |
|-------|-------|
| **Name** | `telemetry` |
| **Enable Row Level Security (RLS)** | **Uncheck / matikan** dulu biar gampang |

4. Tambah kolom-kolom berikut (jangan lupa klik **Save** setiap selesai):

| # | Name | Type | Default | Note |
|---|------|------|---------|------|
| 1 | `id` | `int8` | auto increment | Primary key (otomatis) |
| 2 | `timestamp` | `int8` | - | Waktu sensor (ms) |
| 3 | `ph` | `float8` | - | Nilai pH |
| 4 | `tds` | `float8` | - | Nilai TDS |
| 5 | `ntu` | `float8` | - | Nilai turbiditas |
| 6 | `score` | `float8` | - | Fuzzy score |
| 7 | `level` | `int2` | - | Level kualitas (0/1/2) |
| 8 | `status` | `text` | - | Status lengkap |
| 9 | `ss` | `text` | - | Status singkat |
| 10 | `ph_category` | `text` | - | Kategori pH |
| 11 | `ph_ok` | `bool` | - | pH ok? |
| 12 | `tds_ok` | `bool` | - | TDS ok? |
| 13 | `turb_ok` | `bool` | - | Turbiditas ok? |
| 14 | `created_at` | `timestamptz` | `now()` | Waktu disimpan |

> 💡 **Tips**: Kolom `id` dan `created_at` bisa ditambahkan otomatis. Untuk `id`, centang **Is Primary Key** dan **Is Identity**. Untuk `created_at`, set default value ke `now()`.

Atau, kalau mau instant, copy SQL ini ke **SQL Editor**:

```sql
CREATE TABLE telemetry (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  timestamp BIGINT NOT NULL,
  ph DOUBLE PRECISION,
  tds DOUBLE PRECISION,
  ntu DOUBLE PRECISION,
  score DOUBLE PRECISION,
  level SMALLINT,
  status TEXT,
  ss TEXT,
  ph_category TEXT,
  ph_ok BOOLEAN,
  tds_ok BOOLEAN,
  turb_ok BOOLEAN,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Biar bisa filter per tanggal lebih cepat
CREATE INDEX idx_telemetry_timestamp ON telemetry (timestamp);
```

Cara pakai SQL Editor:
1. Klik **SQL Editor** di sidebar kiri
2. Paste SQL di atas
3. Klik **Run** (atau Ctrl+Enter)

## Langkah 5: Hubungkan ke AquaSense

1. Buka file `.env` di project AquaSense kamu
2. Tambahkan dua baris berikut:

```dotenv
SUPABASE_URL=https://xxxxxxxxxxxx.supabase.co
SUPABASE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

> Ganti `xxxxxxxxxxxx` dengan project ID kamu dan `eyJhbGci...` dengan anon key kamu.

## Langkah 6: Test Koneksi

Jalankan server:

```powershell
npm run server:dev
```

Kalau berhasil, di terminal akan muncul pesan:
```
AquaSense API listening on http://localhost:3001
```

Setelah ESP32 mengirim data, cek apakah data masuk ke Supabase:
1. Buka Supabase dashboard
2. Klik **Table Editor**
3. Klik table `telemetry`
4. Seharusnya sudah ada baris data

Coba export CSV:
```
http://localhost:3001/api/telemetry/export?format=csv
```

Kalau data muncul, berarti Supabase sudah terhubung! 🎉

## 🔄 Cara Kerja Dual Storage

Setelah setup, sistem akan menyimpan data ke **DUA tempat sekaligus**:

```
ESP32 → ThingsBoard → Node API
                           ↓
              ┌──────────────────────┐
              ↓                      ↓
        JSON File (lokal)      Supabase (online)
        folder data/           database cloud
```

- **JSON file** → backup lokal, tetap jalan walau tanpa Supabase
- **Supabase** → untuk export di Vercel / production

## 🌐 Deploy ke Vercel

Setelah Supabase terhubung, kamu bisa deploy ke Vercel dengan aman:

1. Push semua perubahan ke GitHub
2. Di Vercel, import project
3. Tambahkan **Environment Variables** di Vercel:
   - `SUPABASE_URL` = URL Supabase kamu
   - `SUPABASE_KEY` = anon key kamu
   - Jangan lupa juga `TB_BASE_URL`, `TB_USERNAME`, `TB_PASSWORD`, `TB_DEVICE_ID`
4. Deploy!

Export CSV sekarang akan mengambil data dari Supabase, jadi tetap berfungsi di Vercel.

---

## ❓ Troubleshooting

### "Supabase belum dikonfigurasi"
Arti: `.env` belum diisi `SUPABASE_URL` dan `SUPABASE_KEY`. Data tetap disimpan di file JSON lokal.

### "relation telemetry does not exist"
Arti: Table `telemetry` belum dibuat di Supabase. Ikuti **Langkah 4**.

### 401 Unauthorized
Arti: `SUPABASE_KEY` salah. Cek lagi di Project Settings > API > anon public key.

### Data tidak muncul di export
Coba akses: `http://localhost:3001/api/telemetry/export?format=json`
Kalau masih kosong, cek Table Editor Supabase apakah ada data.