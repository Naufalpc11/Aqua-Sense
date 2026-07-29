# Penjelasan Framework AquaSense

## 📋 Overview Arsitektur

AquaSense adalah sistem **IoT (Internet of Things)** untuk monitoring kualitas air asam tambang pasca bio-filtrasi. Sistem ini menggabungkan **4 lapisan framework** yang bekerja secara terintegrasi:

```
┌─────────────────────────────────────────────────────────────┐
│                   4. REACT DASHBOARD                         │
│              (Frontend - Visualisasi)                        │
├─────────────────────────────────────────────────────────────┤
│                   3. NODE.JS API                             │
│              (Backend Bridge - Adapter Data)                 │
├─────────────────────────────────────────────────────────────┤
│                   2. THINGSBOARD                             │
│              (IoT Platform - Storage & Transport)            │
├─────────────────────────────────────────────────────────────┤
│                   1. ESP32 + ARDUINO FRAMEWORK               │
│              (Embedded - Sensor & Fuzzy Logic)               │
└─────────────────────────────────────────────────────────────┘
```

---

## 1️⃣ Lapisan 1: Embedded Framework (ESP32 + Arduino)

### Framework yang digunakan:
- **Arduino Framework** (C++ runtime untuk mikrokontroler)
- **PlatformIO** (Build system, dependency manager, uploader)

### Komponen Hardware:
| Komponen | Fungsi |
|----------|--------|
| ESP32 Dev Kit V4 | Mikrokontroler + WiFi |
| PH-4502C | Sensor pH (GPIO34) |
| TDS Meter V1.0 | Sensor TDS (GPIO35) |
| Turbidity AB147 | Sensor kekeruhan (GPIO32) |

### Alur Firmware:
```
Sensor Analog → ADC 12-bit (sampling 30x) → Konversi ke pH/TDS/NTU
→ Fuzzy Logic (33 rules) → JSON Telemetry → HTTP ke ThingsBoard
                                                      ↓
                                              MQTT (fallback)
```

### Kenapa Arduino Framework?
- **Mudah** untuk prototyping hardware
- **Library lengkap** (WiFi, HTTP, MQTT, JSON)
- **Ekosistem PlatformIO** memudahkan build & upload
- **Komunitas besar** → banyak referensi

### Fuzzy Logic Mamdani:
- **Fungsi keanggotaan**: Trapesium (4 himpunan per parameter)
- **Operator AND**: Min (minimum)
- **33 aturan fuzzy** dalam 4 kelompok (Layak, Perlu Treatment, Basa, Tidak Layak)
- **Defuzzifikasi**: Weighted Average (bukan centroid)
- **Output**: Score 0-100 + Status (LAYAK / PERLU_TREATMENT / TIDAK_LAYAK)

---

## 2️⃣ Lapisan 2: IoT Platform (ThingsBoard)

### Framework:
- **ThingsBoard** (Open-source IoT Platform)

### Fungsi dalam sistem:
- **Menerima telemetry** dari ESP32 via HTTP/MQTT
- **Menyimpan latest telemetry** (nilai terbaru)
- **Menyimpan time-series history** (riwayat data)
- **Menyediakan REST API** untuk dibaca backend

### Alur Data:
```
ESP32 → POST /api/v1/{TOKEN}/telemetry → ThingsBoard
                                              ↓
                              Node.js → GET /api/plugins/telemetry/...
```

### Kenapa ThingsBoard?
- **Platform IoT khusus** → tidak perlu build storage sendiri
- **REST API siap pakai** untuk latest & history telemetry
- **Dashboard ThingsBoard** bisa jadi alternatif
- **Skalabel** untuk banyak device

---

## 3️⃣ Lapisan 3: Backend Bridge (Node.js)

### Framework:
- **Node.js** (Runtime JavaScript)
- **Tanpa framework Express** → murni `node:http` module

### Struktur Backend:
```
server/
├── index.js              # Entry point, routing HTTP
├── config.js             # Load .env, validasi konfigurasi
├── thingsboard-client.js # Login tenant, JWT management
├── telemetry-service.js  # Logic ambil & normalisasi data
└── http-utils.js         # Helper response JSON & static file
```

### Endpoint API:
| Method | Endpoint | Fungsi |
|--------|----------|--------|
| GET | `/api/health` | Cek status server |
| GET | `/api/telemetry/latest` | Ambil data terbaru |
| GET | `/api/telemetry/history?limit=55&hours=6` | Ambil riwayat |

### Kenapa Node.js tanpa Express?
- **Proyek sederhana** → hanya 3 endpoint
- **Modul bawaan `node:http`** sudah cukup
- **Lebih ringan** tanpa dependency tambahan
- **Lebih cepat** cold start
- **Edukatif** → memahami HTTP murni

### Fitur Backend:
- **Login tenant** ThingsBoard (JWT disimpan di memory)
- **Cache** (latest 500ms, history 5 detik)
- **Normalisasi data** (string → number/boolean)
- **Dedup burst** (gabung data dengan jarak < 1.5 detik)
- **Static file serving** untuk production mode

---

## 4️⃣ Lapisan 4: Frontend Dashboard (React)

### Framework & Library:
| Teknologi | Versi | Fungsi |
|-----------|-------|--------|
| React | 19.2.6 | UI framework |
| Vite | 8.0.12 | Build tool & dev server |
| Recharts | 3.8.1 | Grafik time-series |
| ESLint | 10.3.0 | Linting |

### Struktur Frontend:
```
src/
├── main.jsx                    # Entry point React
├── App.jsx                     # Root component
├── components/
│   ├── AquaSense.jsx           # Dashboard utama
│   └── ui/
│       └── Widgets.jsx         # Gauge, ring, visualisasi
├── hooks/
│   └── useTelemetry.js         # Custom hook polling data
├── styles/
│   └── AquaSense.css           # Styling dashboard
└── utils/
    └── theme.js                # Palet warna global
```

### Kenapa React?
- **Komponen reusable** (ArcGauge, ScoreRing, WaterSample, dll)
- **State management** mudah dengan hooks
- **Ekosistem kaya** (Recharts untuk grafik)
- **Vite** → fast refresh, build cepat

### Alur Data Frontend:
```
Halaman dibuka → GET /api/telemetry/history (55 titik)
               → GET /api/telemetry/latest (data real-time)
               → Polling setiap 1 detik (tab aktif)
               → Polling setiap 10 detik (tab hidden)
               → Update grafik hanya jika timestamp baru
```

### Komponen UI Kustom (SVG murni):
- **ArcGauge** → Gauge melingkar untuk pH, TDS, NTU
- **ScoreRing** → Ring progress untuk fuzzy score
- **WaterSample** → Visualisasi warna air
- **ParamBar** → Progress bar per parameter
- **FlowDiagram** → Diagram alur bio-filtrasi
- **ChartTip** → Tooltip kustom grafik

---

## 🔄 Alur Data End-to-End

```
Sensor (Analog)
    ↓
ESP32 (ADC → Konversi → Fuzzy Logic → JSON)
    ↓ HTTP (fallback MQTT)
ThingsBoard (Latest + Time-series)
    ↓ REST API
Node.js (Login → Fetch → Normalize → Cache)
    ↓ JSON Response
React Dashboard (Gauge + Grafik + Log)
```

## 🎯 Ringkasan Framework per Layer

| Layer | Framework | Bahasa | Fungsi Utama |
|-------|-----------|--------|--------------|
| **Embedded** | Arduino + PlatformIO | C++ | Baca sensor, fuzzy logic, kirim data |
| **IoT Platform** | ThingsBoard | - | Simpan telemetry, REST API |
| **Backend** | Node.js (native HTTP) | JavaScript | Bridge, normalisasi, cache |
| **Frontend** | React + Vite + Recharts | JavaScript/JSX | Visualisasi dashboard |

## 💡 Poin Penting untuk Dijelaskan ke Dosen

1. **Kenapa 4 layer?** Pemisahan concern: embedded untuk logika fuzzy, ThingsBoard untuk storage, Node.js untuk keamanan credential, React untuk visualisasi.

2. **Kenapa fuzzy di ESP32, bukan di server?** Keputusan kualitas air tetap di perangkat, dashboard hanya menampilkan. Jika koneksi terputus, ESP32 tetap bisa mengambil keputusan.

3. **Kenapa pakai ThingsBoard?** Tidak perlu build sistem time-series database sendiri. ThingsBoard sudah menyediakan REST API untuk latest & history telemetry.

4. **Kenapa Node.js tanpa Express?** Proyek sederhana (3 endpoint), modul bawaan cukup, lebih ringan, lebih cepat cold start.

5. **Kenapa React?** Komponen reusable, ekosistem grafik (Recharts), Vite untuk dev experience yang cepat.

6. **Arsitektur berlapis** memungkinkan pengembangan paralel: tim hardware bisa fokus di firmware, tim frontend bisa fokus di dashboard, tanpa saling mengganggu.