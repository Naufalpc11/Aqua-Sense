# Setup Lengkap ThingsBoard AquaSense

Panduan ini mencakup:

1. Membuat device ThingsBoard.
2. Menyamakan Access Token dengan firmware.
3. Menguji device tanpa ESP32.
4. Upload firmware dan membaca Serial Monitor.
5. Memastikan telemetry masuk.
6. Membuat dashboard ThingsBoard widget demi widget.
7. Menghubungkan dashboard React.
8. Troubleshooting.

Konfigurasi project saat ini:

| Komponen | Nilai |
| --- | --- |
| ThingsBoard Web/REST | `http://9.154.230.7:8080` |
| ThingsBoard HTTP utama | `http://9.154.230.7:8080` |
| ThingsBoard MQTT fallback | `9.154.230.7:1883` |
| Nama device | `Monitor Air Asam Tambang` |
| Interval telemetry | 2 detik |
| Serial Monitor | 115200 baud |

> Nama menu dapat sedikit berbeda antar versi ThingsBoard. Misalnya
> **Entities > Devices** dapat tampil hanya sebagai **Devices**.

---

## A. Pemeriksaan Awal

Sebelum membuat dashboard, pastikan:

- Bisa login ke `http://9.154.230.7:8080`.
- Login menggunakan akun tenant, bukan akun system administrator.
- Device `Monitor Air Asam Tambang` belum dipakai oleh perangkat lain.
- ESP32 menggunakan WiFi 2.4 GHz yang memiliki akses ke `9.154.230.7`.
- Port HTTP `8080` dapat dijangkau. MQTT `1883` hanya digunakan sebagai
  fallback.

Project dashboard menggunakan dua jenis credential yang berbeda:

| Credential | Digunakan oleh | Lokasi |
| --- | --- | --- |
| Device Access Token | ESP32 untuk HTTP/MQTT | `TB_TOKEN` pada file `.ino` |
| Username/password tenant | Server dashboard React untuk REST API | File `.env` |

Jangan menggunakan password tenant sebagai Device Access Token.

---

## B. Membuat Device ThingsBoard

### B1. Tambah device

1. Login ke ThingsBoard.
2. Pada sidebar kiri buka **Entities**.
3. Pilih **Devices**.
4. Klik tombol **+** di kanan atas.
5. Pilih **Add new device** atau **Add device**.
6. Isi:

   | Field | Nilai |
   | --- | --- |
   | Name | `Monitor Air Asam Tambang` |
   | Label | `AquaSense Unit 1` |
   | Device profile | `default` |
   | Description | `ESP32 monitoring air asam tambang pasca bio-filtrasi` |
   | Is gateway | Tidak aktif |

7. Klik **Add**.

Nama device harus sama dengan `TB_DEVICE_NAME` pada `.env`, termasuk spasi dan
huruf besar-kecil.

### B2. Atur Access Token

1. Klik device **Monitor Air Asam Tambang**.
2. Klik **Manage credentials**. Pada versi lain, buka tab **Credentials**.
3. Pilih **Access token** sebagai credentials type.
4. Buka `src/monitor_air_asam_tambang.ino`.
5. Cari:

   ```cpp
   const char* TB_TOKEN = "...";
   ```

6. Masukkan nilai di antara tanda kutip ke field Access Token ThingsBoard.
7. Klik **Save** atau **Apply changes**.

Token di ThingsBoard dan `TB_TOKEN` di firmware harus sama persis. Jangan
menambahkan spasi, tanda kutip, atau titik koma.

### B3. Salin Device ID ke `.env`

Penggunaan Device ID lebih stabil daripada pencarian berdasarkan nama.

1. Buka detail device.
2. Cari **Device ID**, **Entity ID**, atau tombol **Copy device ID**.
3. Salin UUID, contohnya:

   ```text
   12345678-abcd-1234-abcd-1234567890ab
   ```

4. Isi `.env`:

   ```dotenv
   TB_DEVICE_ID=UUID_DEVICE_DARI_THINGSBOARD
   ```

Jika tidak menemukan Device ID, biarkan `TB_DEVICE_ID` kosong. Server masih
dapat mencari device menggunakan `TB_DEVICE_NAME`.

---

## C. Uji Device Tanpa ESP32

Langkah ini membuat semua telemetry key muncul sehingga dashboard dapat dibuat
meskipun ESP32 belum terdeteksi.

### C1. Buka PowerShell

Jalankan:

```powershell
$tbHost = "http://9.154.230.7:8080"
$token = Read-Host "Masukkan Device Access Token"
```

Kirim contoh data:

```powershell
$telemetry = @{
  ph             = 6.93
  tds_ppm        = 53.0
  turbidity_ntu  = 3.0
  fuzzy_score    = 95.0
  water_status   = "LAYAK"
  water_level    = 2
  rekomendasi    = "Air layak digunakan"
  is_usable      = 1
  need_treatment = 0
  not_usable     = 0
  ph_ok          = 1
  tds_ok         = 1
  turb_ok        = 1
  ph_kategori    = "NETRAL"
} | ConvertTo-Json

Invoke-RestMethod `
  -Method Post `
  -Uri "$tbHost/api/v1/$token/telemetry" `
  -ContentType "application/json" `
  -Body $telemetry
```

Jika berhasil, PowerShell biasanya tidak menampilkan isi respons.

### C2. Pastikan data muncul

1. Kembali ke ThingsBoard.
2. Buka **Entities > Devices**.
3. Buka **Monitor Air Asam Tambang**.
4. Buka tab **Latest telemetry** atau **Latest telemetry values**.
5. Tekan refresh jika diperlukan.

Harus muncul 14 key berikut:

| Key | Tipe | Contoh |
| --- | --- | --- |
| `ph` | Number | `6.93` |
| `tds_ppm` | Number | `53.0` |
| `turbidity_ntu` | Number | `3.0` |
| `fuzzy_score` | Number | `95.0` |
| `water_status` | String | `LAYAK` |
| `water_level` | Integer | `2` |
| `rekomendasi` | String | `Air layak digunakan` |
| `is_usable` | Integer | `1` |
| `need_treatment` | Integer | `0` |
| `not_usable` | Integer | `0` |
| `ph_ok` | Integer | `1` |
| `tds_ok` | Integer | `1` |
| `turb_ok` | Integer | `1` |
| `ph_kategori` | String | `NETRAL` |

Jika HTTP mengembalikan `401 Unauthorized`, Access Token salah. Jika
mengembalikan `404`, periksa host, port, dan URL endpoint.

---

## D. Upload Firmware ESP32

### D1. Pastikan COM port muncul

1. Hubungkan ESP32 memakai kabel USB data.
2. Tunggu Windows memasang driver.
3. Buka **Device Manager > Ports (COM & LPT)**.
4. Cari salah satu nama berikut:
   - `Silicon Labs CP210x USB to UART Bridge (COMx)`
   - `USB-SERIAL CH340 (COMx)`
5. Catat nomor COM, misalnya `COM3`.

Jika tidak muncul:

- Ganti kabel USB karena banyak kabel hanya mendukung charging.
- Coba port USB laptop lain.
- Hindari USB hub.
- Pastikan LED power ESP32 menyala.
- Instal driver CP210x atau CH340 sesuai chip USB board.

### D2. Build firmware

Pada PlatformIO:

1. Buka sidebar PlatformIO.
2. Buka **PROJECT TASKS > esp32dev > General**.
3. Klik **Build**.
4. Pastikan hasil akhirnya:

   ```text
   [SUCCESS]
   ```

Atau gunakan terminal:

```powershell
& "$env:USERPROFILE\.platformio\penv\Scripts\platformio.exe" run
```

### D3. Upload

1. Tutup Serial Monitor jika sedang terbuka.
2. Klik **Upload** pada PlatformIO.
3. Jika PlatformIO salah memilih port, tambahkan sementara ke `platformio.ini`:

   ```ini
   upload_port = COM3
   monitor_port = COM3
   ```

4. Jika muncul `Connecting...` terus-menerus:
   - Tahan tombol **BOOT**.
   - Mulai upload.
   - Lepaskan **BOOT** saat proses penulisan dimulai.

Terminal alternatif:

```powershell
& "$env:USERPROFILE\.platformio\penv\Scripts\platformio.exe" run --target upload
```

### D4. Buka Serial Monitor

PlatformIO:

1. Buka **PROJECT TASKS > esp32dev > General**.
2. Klik **Monitor**.

Terminal:

```powershell
& "$env:USERPROFILE\.platformio\penv\Scripts\platformio.exe" device monitor
```

Output normal:

```text
WiFi.... OK
[SIAP] Monitoring dimulai. Interval: 2 detik
ThingsBoard HTTP terkirim (200)
{"ph":...,"tds_ppm":...,"fuzzy_score":...}
```

### D5. Arti error pengiriman

| Output | Arti umum | Pemeriksaan |
| --- | --- | --- |
| HTTP `200` | Telemetry diterima ThingsBoard | Normal |
| HTTP negatif | HTTP gagal sebelum mendapat respons | Host, WiFi, port 8080 |
| `rc=-2` | MQTT fallback tidak dapat terhubung | Host, port 1883, jaringan |
| `rc=4` | Credential MQTT salah | Access Token tidak sama |
| `rc=5` | Tidak diizinkan | Token/device credential salah |
| `Gagal kirim MQTT` | Publish gagal | Koneksi broker terputus atau payload gagal |

---

## E. Buat Dashboard ThingsBoard

### E1. Buat dashboard kosong

1. Buka menu **Dashboards**.
2. Klik tombol **+**.
3. Pilih **Create new dashboard** atau **Add dashboard**.
4. Isi:

   | Field | Nilai |
   | --- | --- |
   | Title | `AquaSense - Monitoring Air Asam Tambang` |
   | Description | `Dashboard kualitas air pasca bio-filtrasi` |

5. Klik **Add**.
6. Buka dashboard tersebut.
7. Klik ikon pensil atau **Enter edit mode**.

### E2. Aturan datasource untuk semua widget

Untuk setiap widget:

1. Klik **Add widget**.
2. Pilih jenis widget.
3. Pada bagian **Datasource** pilih:
   - Datasource type: **Device**
   - Device: **Monitor Air Asam Tambang**
4. Jika pilihan langsung `Entity alias`, buat alias:
   - Alias name: `AquaSense Unit 1`
   - Filter type: **Single entity**
   - Entity type: **Device**
   - Entity: **Monitor Air Asam Tambang**
5. Pilih telemetry key yang diminta.

Jangan memilih atribut dengan nama sama. Data firmware tersimpan sebagai
**Latest telemetry / Time series**.

---

## F. Widget Baris Pertama: Status Utama

### F1. Status kualitas air

1. Klik **Add widget**.
2. Pilih bundle **Cards**.
3. Pilih **Value card** atau **Simple value card**.
4. Datasource: device AquaSense.
5. Data key: `water_status`.
6. Atur:
   - Title: `Status Kualitas Air`
   - Decimals: tidak diperlukan
   - Show timestamp: aktif
   - Background: gelap atau transparan

Jika tersedia pengaturan warna berbasis function, gunakan:

```javascript
if (value === 'LAYAK') return '#00e676';
if (value === 'PERLU_TREATMENT') return '#ffab00';
return '#ff3d00';
```

### F2. Rekomendasi

1. Duplikasi widget status atau tambah Value card baru.
2. Data key: `rekomendasi`.
3. Title: `Rekomendasi Pengolahan`.
4. Aktifkan text wrapping bila tersedia.
5. Lebarkan widget agar kalimat tidak terpotong.

### F3. Fuzzy score

1. Tambahkan widget bundle **Gauges**.
2. Pilih **Radial gauge**, **Digital gauge**, atau **Value card**.
3. Data key: `fuzzy_score`.
4. Atur:
   - Title: `Fuzzy Score`
   - Min: `0`
   - Max: `100`
   - Decimals: `1`
   - Unit: `/ 100`
5. Atur warna range:
   - `0-39.9`: merah
   - `40-69.9`: oranye
   - `70-100`: hijau

---

## G. Widget Baris Kedua: Sensor

### G1. Gauge pH

1. Tambahkan **Gauges > Radial gauge**.
2. Data key: `ph`.
3. Atur:
   - Title: `pH Air`
   - Min: `0`
   - Max: `14`
   - Decimals: `2`
   - Unit: `pH`
4. Range yang disarankan:
   - `0-4.99`: merah
   - `5-6.49`: oranye
   - `6.5-8.5`: hijau
   - `8.51-9.5`: oranye
   - `9.51-14`: merah

### G2. Gauge TDS

1. Duplikasi gauge pH.
2. Ganti data key menjadi `tds_ppm`.
3. Atur:
   - Title: `TDS`
   - Min: `0`
   - Max: `5000`
   - Decimals: `1`
   - Unit: `ppm`
4. Range:
   - `0-499`: hijau
   - `500-999`: oranye
   - `1000-5000`: merah

### G3. Gauge turbiditas

1. Duplikasi gauge TDS.
2. Data key: `turbidity_ntu`.
3. Atur:
   - Title: `Turbiditas`
   - Min: `0`
   - Max: `1000`
   - Decimals: `1`
   - Unit: `NTU`
4. Range:
   - `0-4.99`: hijau
   - `5-99.99`: oranye
   - `100-1000`: merah

---

## H. Widget Baris Ketiga: Grafik

Sebaiknya gunakan dua grafik karena skala pH, TDS, NTU, dan fuzzy berbeda.

### H1. Grafik pH dan fuzzy score

1. Klik **Add widget**.
2. Pilih bundle **Charts** atau **Time series charts**.
3. Pilih **Time series line chart**.
4. Tambahkan dua data key:
   - `ph`
   - `fuzzy_score`
5. Atur:
   - Title: `Tren pH dan Fuzzy Score`
   - Time window: **Realtime**
   - Last: `1 hour`
   - Aggregation: `None`
   - Update interval: `5 seconds` bila tersedia
   - Show legend: aktif
   - Show points: opsional

Warna:

- `ph`: biru
- `fuzzy_score`: ungu

### H2. Grafik TDS dan turbiditas

1. Duplikasi grafik sebelumnya.
2. Hapus `ph` dan `fuzzy_score`.
3. Tambahkan:
   - `tds_ppm`
   - `turbidity_ntu`
4. Title: `Tren TDS dan Turbiditas`.
5. Gunakan time window dan aggregation yang sama.

Warna:

- `tds_ppm`: hijau
- `turbidity_ntu`: kuning

### H3. Menghindari grafik kosong

Jika grafik kosong tetapi Latest telemetry berisi data:

1. Pastikan key type adalah **Timeseries**, bukan attribute.
2. Ubah time window menjadi **Last 24 hours**.
3. Atur aggregation ke **None**.
4. Pastikan jam komputer dan server ThingsBoard benar.

---

## I. Widget Baris Keempat: Indikator Kondisi

Buat enam indikator menggunakan Value card, LED, atau Signal card.

| Widget title | Data key | Aktif jika |
| --- | --- | --- |
| Air Layak | `is_usable` | `1` |
| Perlu Treatment | `need_treatment` | `1` |
| Tidak Layak | `not_usable` | `1` |
| pH Normal | `ph_ok` | `1` |
| TDS Normal | `tds_ok` | `1` |
| Turbiditas Normal | `turb_ok` | `1` |

Jika widget menyediakan value mapping:

| Nilai | Teks | Warna |
| --- | --- | --- |
| `0` | `TIDAK AKTIF` | Abu-abu |
| `1` | `AKTIF` atau `OK` | Hijau/oranye/merah sesuai fungsi |

Contoh fungsi warna untuk indikator `is_usable`:

```javascript
return Number(value) === 1 ? '#00e676' : '#455a64';
```

Untuk `need_treatment`:

```javascript
return Number(value) === 1 ? '#ffab00' : '#455a64';
```

Untuk `not_usable`:

```javascript
return Number(value) === 1 ? '#ff3d00' : '#455a64';
```

---

## J. Widget Log Telemetry

1. Klik **Add widget**.
2. Pilih **Tables > Time series table**.
3. Datasource: device AquaSense.
4. Tambahkan kolom:
   - `ph`
   - `tds_ppm`
   - `turbidity_ntu`
   - `fuzzy_score`
   - `water_status`
5. Atur:
   - Title: `Riwayat Pembacaan`
   - Time window: `Last 1 hour`
   - Aggregation: `None`
   - Sort: timestamp descending
   - Page size: `10` atau `20`

---

## K. Layout yang Disarankan

Susun dashboard:

```text
+-----------------------------------------------------------+
| STATUS KUALITAS AIR              | FUZZY SCORE             |
+-----------------------------------------------------------+
| pH GAUGE       | TDS GAUGE       | TURBIDITY GAUGE        |
+-----------------------------------------------------------+
| GRAFIK pH + FUZZY                | GRAFIK TDS + NTU       |
+-----------------------------------------------------------+
| LAYAK | TREATMENT | TIDAK LAYAK | pH OK | TDS OK | NTU OK|
+-----------------------------------------------------------+
| REKOMENDASI                                               |
+-----------------------------------------------------------+
| RIWAYAT PEMBACAAN                                         |
+-----------------------------------------------------------+
```

Setelah semua widget selesai:

1. Klik **Save** pada toolbar dashboard.
2. Keluar dari edit mode.
3. Atur global time window ke realtime 1 jam.
4. Restart ESP32 dan pastikan widget berubah setiap sekitar 2 detik.

---

## L. Alarm Opsional

Alarm tidak diperlukan untuk dashboard dasar, tetapi berguna untuk monitoring.

Pada versi ThingsBoard yang mendukung alarm rules:

1. Buka **Profiles > Device profiles**.
2. Buka profile `default`, atau buat profile khusus `AquaSense`.
3. Buka tab **Alarm rules**.
4. Tambahkan rule berikut:

| Alarm | Kondisi | Severity |
| --- | --- | --- |
| Air Tidak Layak | `fuzzy_score < 40` | Critical |
| Perlu Treatment | `fuzzy_score >= 40` dan `< 70` | Major |
| pH Tidak Normal | `ph < 6.5` atau `ph > 8.5` | Major |
| TDS Tinggi | `tds_ppm >= 500` | Warning |
| Turbiditas Tinggi | `turbidity_ntu >= 5` | Warning |

Gunakan clear condition kebalikan dari create condition agar alarm dapat
tertutup otomatis saat kualitas air kembali normal.

---

## M. Hubungkan Dashboard React

Isi `.env`:

```dotenv
TB_BASE_URL=http://9.154.230.7:8080
TB_USERNAME=EMAIL_AKUN_TENANT
TB_PASSWORD=PASSWORD_AKUN_TENANT
TB_DEVICE_ID=UUID_DEVICE_DARI_THINGSBOARD
TB_DEVICE_NAME=Monitor Air Asam Tambang
API_PORT=3001
TB_STALE_AFTER_MS=30000
```

Jalankan server API:

```powershell
npm run server:dev
```

Uji endpoint:

```powershell
Invoke-RestMethod http://localhost:3001/api/telemetry/latest |
  ConvertTo-Json -Depth 5
```

Jika berhasil, akan muncul `source`, `deviceOnline`, dan object `telemetry`.

Pada terminal kedua:

```powershell
npm run dev
```

Buka URL Vite. Status di header:

| Status | Arti |
| --- | --- |
| `LIVE` | Telemetry terakhir masih baru |
| `STALE` | API terhubung, tetapi ESP32 tidak mengirim data baru |
| `OFFLINE` | API ThingsBoard gagal atau konfigurasi salah |
| `CONNECTING` | Dashboard sedang melakukan request pertama |

---

## N. Troubleshooting

### Device tidak ditemukan oleh dashboard React

Gejala:

```text
Requested item wasn't found
```

Solusi:

1. Pastikan device sudah dibuat.
2. Pastikan nama device sama persis.
3. Isi `TB_DEVICE_ID` dengan UUID device.
4. Restart `npm run server:dev` setelah mengubah `.env`.

### Login REST gagal

- Pastikan `TB_USERNAME` dan `TB_PASSWORD` adalah akun tenant.
- Pastikan `TB_BASE_URL` memakai `:8080`.
- Jangan menambahkan `/api` di akhir `TB_BASE_URL`.

### Telemetry tidak tersimpan

- `TB_HOST` pada firmware harus `9.154.230.7`.
- `TB_HTTP_PORT` harus `8080`.
- Access Token harus cocok.
- ESP32 dan server harus saling dapat dijangkau.

### Latest telemetry ada, widget kosong

- Pastikan datasource menggunakan device yang benar.
- Pastikan key dipilih sebagai telemetry/time series.
- Gunakan ejaan key yang sama persis.
- Ubah time window ke 24 jam.
- Matikan aggregation atau pilih `None`.

### Dashboard React `STALE`

Firmware mengirim setiap 2 detik dan batas stale dashboard adalah 30 detik.
Periksa apakah timestamp pada Latest telemetry terus berubah.

### Data sensor muncul nol atau tidak masuk akal

Masalah ini bukan pada ThingsBoard. Periksa wiring, tegangan ADC, kalibrasi
sensor, dan output Serial Monitor.

---

## O. Checklist Akhir

- [ ] Device `Monitor Air Asam Tambang` sudah dibuat.
- [ ] Access Token ThingsBoard sama dengan `TB_TOKEN`.
- [ ] Telemetry HTTP uji berhasil.
- [ ] Semua 14 telemetry key muncul.
- [ ] ESP32 terdeteksi sebagai COM port.
- [ ] PlatformIO build berhasil.
- [ ] Upload firmware berhasil.
- [ ] Serial Monitor menunjukkan WiFi OK.
- [ ] Serial Monitor menunjukkan ThingsBoard HTTP terkirim (200).
- [ ] Latest telemetry berubah setiap sekitar 2 detik.
- [ ] Dashboard ThingsBoard tersimpan.
- [ ] `.env` berisi Device ID yang benar.
- [ ] Endpoint dashboard React berhasil.
- [ ] UI React menunjukkan `LIVE`.

Inferensi fuzzy tetap dilakukan di ESP32. ThingsBoard dan React hanya
menampilkan nilai `fuzzy_score`, `water_status`, dan `rekomendasi` yang
dikirim firmware.

## Referensi Resmi

- https://thingsboard.io/docs/pe/user-guide/devices/
- https://thingsboard.io/docs/pe/reference/widgets/cards/value-card/
- https://thingsboard.io/docs/pe/user-guide/digital-twins/time-series-data/
- https://thingsboard.io/docs/pe/reference/widgets/tables/timeseries-table/
