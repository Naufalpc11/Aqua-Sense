# AquaSense

AquaSense adalah dashboard monitoring air asam tambang berbasis ESP32,
ThingsBoard, Node.js, React, dan fuzzy Mamdani.

```text
Sensor -> ESP32 + Fuzzy -> HTTP/REST -> ThingsBoard -> Node API -> React Dashboard
```

Logika pembacaan sensor dan fuzzy berada di
`src/monitor_air_asam_tambang.ino`. Dashboard tidak menghitung ulang fuzzy,
tetapi menampilkan hasil yang dikirim ESP32.

## Kebutuhan

- ESP32 Dev Kit V4.
- Kabel USB data.
- VS Code dengan extension PlatformIO IDE.
- Node.js 22 atau lebih baru.
- Akun tenant ThingsBoard.
- Device ThingsBoard bernama `Monitor Air Asam Tambang`.

Panduan pembuatan device dan widget ThingsBoard tersedia di
`docs/THINGSBOARD_SETUP.md`.

Dokumentasi arsitektur, struktur file, alur data, firmware, 33 aturan fuzzy,
API, dan dashboard tersedia di `docs/PROJECT_DOCUMENTATION.md`.

## 1. Siapkan Firmware

Buka `src/monitor_air_asam_tambang.ino`, lalu periksa:

```cpp
const char* WIFI_SSID = "...";
const char* WIFI_PASS = "...";
const char* TB_HOST   = "9.154.230.7";
const int   TB_PORT   = 1883;
const char* TB_TOKEN  = "...";
```

Ketentuan:

- ESP32 hanya mendukung WiFi 2.4 GHz.
- `TB_TOKEN` harus sama dengan Access Token device ThingsBoard.
- Jangan memakai username atau password akun tenant sebagai `TB_TOKEN`.

## 2. Hubungkan ESP32

1. Sambungkan ESP32 menggunakan kabel USB data.
2. Buka **Device Manager > Ports (COM & LPT)**.
3. Pastikan muncul perangkat seperti:

   ```text
   Silicon Labs CP210x USB to UART Bridge (COM3)
   ```

4. Jika nomor port bukan `COM3`, ubah baris berikut di `platformio.ini`:

   ```ini
   upload_port = COM3
   monitor_port = COM3
   ```

Periksa dari terminal:

```powershell
& "$env:USERPROFILE\.platformio\penv\Scripts\platformio.exe" device list
```

## 3. Build Firmware

Melalui VS Code:

1. Buka sidebar **PlatformIO**.
2. Buka **PROJECT TASKS > esp32dev > General**.
3. Klik **Build**.
4. Pastikan terminal berakhir dengan `[SUCCESS]`.

Melalui terminal:

```powershell
& "$env:USERPROFILE\.platformio\penv\Scripts\platformio.exe" run
```

## 4. Upload Firmware

Pastikan Serial Monitor ditutup sebelum upload.

Melalui PlatformIO klik:

```text
PROJECT TASKS > esp32dev > General > Upload
```

Atau jalankan:

```powershell
& "$env:USERPROFILE\.platformio\penv\Scripts\platformio.exe" run --target upload
```

Jika muncul `Wrong boot mode detected (0x13)`:

1. Tekan dan tahan tombol **BOOT**.
2. Mulai Upload.
3. Saat terminal menampilkan `Connecting...`, tekan tombol **EN/RESET** sekali.
4. Tetap tahan BOOT sekitar 1-2 detik.
5. Lepaskan BOOT ketika muncul `Writing at 0x...`.

Setelah upload berhasil, tekan **EN/RESET** sekali agar firmware berjalan.

## 5. Buka Serial Monitor

Melalui PlatformIO klik:

```text
PROJECT TASKS > esp32dev > General > Monitor
```

Atau:

```powershell
& "$env:USERPROFILE\.platformio\penv\Scripts\platformio.exe" device monitor --port COM3 --baud 115200
```

Output normal:

```text
WiFi.... OK
[SIAP] Monitoring dimulai. Interval: 2 detik
ThingsBoard HTTP terkirim (200)
{"ph":...,"tds_ppm":...,"fuzzy_score":...}
```

Jika WiFi gagal, periksa SSID, password, hotspot aktif, dan band 2.4 GHz. Jika
HTTP gagal, periksa host, port `8080`, dan Access Token. MQTT port `1883`
digunakan sebagai fallback singkat jika HTTP gagal.

Keluar dari Serial Monitor dengan `Ctrl+C`.

## 6. Konfigurasi Dashboard

Buat `.env` jika belum ada:

```powershell
Copy-Item .env.example .env
```

Isi:

```dotenv
TB_BASE_URL=http://9.154.230.7:8080
TB_USERNAME=EMAIL_AKUN_TENANT
TB_PASSWORD=PASSWORD_AKUN_TENANT
TB_DEVICE_ID=UUID_DEVICE_THINGSBOARD
TB_DEVICE_NAME=Monitor Air Asam Tambang
API_PORT=3001
TB_STALE_AFTER_MS=30000
```

`TB_DEVICE_ID` disarankan karena tidak berubah. Jangan menambahkan `/api` pada
akhir `TB_BASE_URL`.

Instal dependency dashboard:

```powershell
npm install
```

## 7. Menjalankan Dashboard Manual

Dashboard development membutuhkan dua terminal.

### Terminal 1: Node API

```powershell
npm run server:dev
```

API tersedia di:

```text
http://localhost:3001
```

Uji API:

```powershell
Invoke-RestMethod http://localhost:3001/api/telemetry/latest |
  ConvertTo-Json -Depth 6
```

Uji histori grafik:

```powershell
Invoke-RestMethod "http://localhost:3001/api/telemetry/history?limit=55&hours=6" |
  ConvertTo-Json -Depth 6
```

### Terminal 2: React/Vite

```powershell
npm run dev -- --host 0.0.0.0
```

Buka:

```text
http://localhost:5173
```

Untuk membuka dari HP pada WiFi yang sama, cari IP laptop:

```powershell
ipconfig
```

Kemudian buka:

```text
http://IP-LAPTOP:5173
```

Contoh: `http://192.168.0.106:5173`.

Hentikan masing-masing proses menggunakan `Ctrl+C`.

## 8. Menjalankan Mode Produksi

Build frontend:

```powershell
npm run build
```

Jalankan server:

```powershell
npm start
```

Buka:

```text
http://localhost:3001
```

Pada mode produksi, satu proses Node menyajikan API dan folder `dist`.

## 9. Status Koneksi Dashboard

| Status | Arti |
| --- | --- |
| `CONNECTING` | Request pertama sedang berjalan |
| `LIVE` | Telemetry terbaru berumur kurang dari 30 detik |
| `STALE` | ThingsBoard dapat dibaca, tetapi ESP32 tidak mengirim data baru |
| `OFFLINE` | API, login, device, atau ThingsBoard bermasalah |

## 10. Interval dan Delay

Firmware memakai:

```cpp
SAMPLE_N = 30
SAMPLE_DLY = 10 ms
SEND_MS = 2000 ms
```

Satu `adcAvg()` memerlukan sekitar `30 x 10 ms = 300 ms`. Pada loop utama
terdapat tiga proses sampling:

1. Turbiditas untuk diagnostik dan nilai telemetry.
2. pH.
3. TDS.

Total waktu sampling sekitar `0,9 detik`, belum termasuk overhead HTTP.
Pengiriman dimulai setiap sekitar 2 detik karena `lastSent` dicatat sebelum
sampling.

Dashboard melakukan polling setiap 1 detik. Setelah ESP32 mengirim data,
perubahan normalnya terlihat di UI dalam 0-1 detik. Jadi:

- Interval data sensor: sekitar 2 detik.
- Waktu sampling per siklus: sekitar 0,9 detik.
- Tambahan keterlambatan UI: maksimal sekitar 1 detik.

Polling 1 detik tidak berarti sensor menghasilkan nilai baru setiap 1 detik.
Dashboard hanya memeriksa apakah ThingsBoard sudah menerima sampel baru.
Timestamp yang sama tidak ditambahkan ulang ke grafik.

Mengurangi `SEND_MS` di bawah 2 detik tidak disarankan dengan struktur sampling
sekarang karena tiga batch ADC sendiri memerlukan sekitar 0,9 detik.

## 11. Cara Kerja Grafik

Grafik menggunakan histori time-series asli dari ThingsBoard:

1. Saat halaman dibuka, API mengambil maksimal 55 titik dari 6 jam terakhir.
2. Dashboard kemudian mengecek telemetry terbaru setiap 1 detik.
3. Titik baru hanya ditambahkan jika timestamp ThingsBoard berubah.
4. Riwayat tetap muncul setelah browser di-refresh.
5. Burst data dengan jarak kurang dari 1,5 detik dinormalisasi menjadi satu
   titik agar restart atau reconnect tidak memenuhi grafik dengan duplikat.

Setiap seri memakai skala sendiri:

- pH: `0-14`
- TDS: `0-5000 ppm`
- Turbiditas: `0-1000 NTU`
- Fuzzy score: `0-100`

Skala terpisah mencegah NTU tinggi membuat garis pH dan fuzzy terlihat datar.
Tooltip tetap menampilkan nilai asli, bukan nilai hasil pembagian.

Optimasi request:

- Latest telemetry memiliki cache server 1 detik.
- History memiliki cache server 5 detik.
- Request browser memiliki timeout 8 detik.
- Tidak ada polling paralel jika request sebelumnya belum selesai.
- Saat tab browser tersembunyi, polling dikurangi menjadi 10 detik.
- Saat tab kembali aktif, dashboard langsung memeriksa data terbaru.

Jika grafik tidak bergerak:

1. Pastikan header menunjukkan `LIVE`.
2. Periksa timestamp pada ThingsBoard **Latest telemetry**.
3. Uji endpoint `/api/telemetry/history`.
4. Pastikan ESP32 mencetak `ThingsBoard HTTP terkirim (200)`.
5. Refresh browser setelah Node API direstart.

## 12. Verifikasi Project

```powershell
npm run lint
npm run build
& "$env:USERPROFILE\.platformio\penv\Scripts\platformio.exe" run
```

## Keamanan

- `.env` sudah diabaikan Git.
- Jangan membagikan password WiFi, password tenant, atau Device Access Token.
- Ganti token jika pernah dikirim ke repository publik atau screenshot.
