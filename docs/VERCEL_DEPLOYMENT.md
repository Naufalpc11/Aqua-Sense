# Vercel Deployment Checklist

Dokumen ini merangkum langkah migrasi AquaSense ke Vercel setelah backend lokal dan ThingsBoard sudah stabil.

## 1. Yang sudah disiapkan di repo

- Frontend React tetap memakai endpoint relatif `/api/...`.
- Backend data telemetry sudah disiapkan sebagai Vercel Serverless Functions di folder `api/`.
- Config lokal dan contoh env sudah memakai `https://thingsboard.cloud`.

## 2. Environment variables yang harus diisi di Vercel

Isi di **Project Settings > Environment Variables**:

- `TB_BASE_URL=https://thingsboard.cloud`
- `TB_USERNAME=almaru.zaim1506@gmail.com`
- `TB_PASSWORD=<password tenant>`
- `TB_DEVICE_ID=eb5a9bd0-8a1b-11f1-a3bc-95bc3f4b3917`
- `TB_DEVICE_NAME=Monitoring AAT`
- `TB_STALE_AFTER_MS=30000`
- `API_PORT=3001` (opsional, dipakai lokal)

Catatan:
- Jangan tambah `/api` di akhir `TB_BASE_URL`.
- Pakai `https`, bukan `http`.

## 3. Langkah deploy ke Vercel

1. Push repo ke GitHub.
2. Buka Vercel dan import repository `Aqua-Sense`.
3. Pastikan framework terdeteksi sebagai Vite.
4. Set environment variables di atas.
5. Deploy.

## 4. Verifikasi setelah deploy

Setelah deploy berhasil, cek:

- Buka halaman utama dashboard Vercel.
- Pastikan kartu sensor, chart, dan log muncul.
- Buka endpoint `https://domain-vercel-kamu/api/health`.
- Buka endpoint `https://domain-vercel-kamu/api/telemetry/latest`.
- Buka endpoint `https://domain-vercel-kamu/api/telemetry/history?limit=55&hours=6`.

Jika `api/health` sukses tapi telemetry gagal:

- Cek lagi `TB_USERNAME` dan `TB_PASSWORD`.
- Cek `TB_DEVICE_ID`.
- Cek telemetry terbaru memang ada di ThingsBoard.

## 5. Setelah dashboard online

- ESP32 tetap boleh hanya diberi catu daya.
- Tidak perlu colok ke laptop.
- Alur final tetap: ESP32 -> ThingsBoard -> Vercel dashboard.
