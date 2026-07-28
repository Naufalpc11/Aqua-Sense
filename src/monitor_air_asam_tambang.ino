/*
 * ================================================================
 *  MONITORING AIR ASAM TAMBANG PASCA BIO-FILTRASI v2.0
 *  Logika Fuzzy Mamdani + ThingsBoard IoT via HTTP (MQTT fallback)
 * ================================================================
 *  Hardware : ESP32 Dev Kit V4 (38-pin) + Baseplate I/O Expansion
 *  Sensor pH : PH-4502C  → GPIO34  (Kalibrasi: 2.5V = pH 7)
 *  Sensor TDS: TDS Meter V1.0 → GPIO35
 *  Sensor NTU: Turbidity AB147  → GPIO32 (via VDiv R1=10kΩ, R2=20kΩ)
 * ================================================================
 *  Library (Arduino Library Manager):
 *  1. PubSubClient   by Nick O'Leary  (v2.8+)
 *  2. ArduinoJson    by Benoit Blanchon (v6.x)
 * ================================================================
 *  Data Validasi Lapangan (3 Sampel):
 *  ┌─────────────┬────────┬──────────┬──────────────────────┐
 *  │ Sampel      │  pH    │ TDS(ppm) │  Target Fuzzy        │
 *  ├─────────────┼────────┼──────────┼──────────────────────┤
 *  │ Air Asam    │  2.27  │   32.5   │  TIDAK_LAYAK  (<40)  │
 *  │ Air Netral  │  6.93  │   53.0   │  LAYAK        (≥70)  │
 *  │ Air Basa    │ 11.70  │ 6864     │  PERLU_TRT    (40-69)│
 *  └─────────────┴────────┴──────────┴──────────────────────┘
 *  Referensi: PP No.22/2021 Baku Mutu Air Kelas II
 * ================================================================
 */

#include <WiFi.h>
#include <HTTPClient.h>
#include <PubSubClient.h>
#include <ArduinoJson.h>

// ================================================================
//  KONFIGURASI – SESUAIKAN SEBELUM UPLOAD
// ================================================================
const char* WIFI_SSID = "ITK-LAB2.X";
const char* WIFI_PASS = "K@mpusM3rdeka!";
const char* TB_HOST   = "9.154.230.7";  // Ganti jika self-hosted
const int   TB_PORT   = 1883;
const int   TB_HTTP_PORT = 8080;
const char* TB_TOKEN  = "TjNJpdXUPsPvjwaoJbGc"; // Device Access Token

// ================================================================
//  PIN SENSOR (ADC1 – aman saat WiFi aktif)
// ================================================================
const uint8_t PIN_PH   = 34; // ADC1_CH6 – input-only
const uint8_t PIN_TDS  = 35; // ADC1_CH7 – input-only
const uint8_t PIN_TURB = 32; // ADC1_CH4

// ================================================================
//  PARAMETER ADC
// ================================================================
static const int   ADC_BITS = 12;
static const float ADC_MAX  = 4095.0f;
static const float ADC_VREF = 3.3f;

// ================================================================
//  KALIBRASI pH – PH-4502C
//  PH_VOLT_AT7 : Tegangan yang terukur saat elektroda di buffer pH 7
//                Sesuaikan dengan hasil kalibrasi kamu (default: 2.50V)
//  PH_SLOPE    : Sensitivitas sensor Nernst @ 25°C = 59.2 mV/pH
//  PH_OFFSET   : Fine-tune tambahan jika pembacaan masih meleset
// ================================================================
static const float PH_VOLT_AT7 = 2.42f;   // V → pH 7 (hasil kalibrasi)
static const float PH_SLOPE    = 0.0592f; // 59.2 mV/pH
static const float PH_OFFSET   = -7.0f;   // Sesuaikan jika perlu (±0.1–0.5)

// ================================================================
//  KALIBRASI TDS – TDS Meter V1.0
// ================================================================
static const float TDS_K    = 0.5f;   // K-factor default
static const float TDS_TEMP = 25.0f;  // Suhu referensi °C

// ================================================================
//  KALIBRASI TURBIDITY – SENSOR AB147 (BARU, mengganti AB210)
//
//  AB147 menggunakan prinsip optik yang sama dengan sensor turbidity
//  standar: tegangan TINGGI = air JERNIH, tegangan RENDAH = KERUH.
//
//  Voltage divider (R1=10kΩ, R2=20kΩ) untuk proteksi GPIO ESP32:
//    V_gpio = V_sensor × (20/30) = V_sensor × 0.667
//    → V_sensor = V_gpio × 1.5  (TURB_VD_RATIO = 1.5)
//
//  CARA KALIBRASI AB147:
//  1. Masukkan sensor ke air jernih (0 NTU)
//  2. Ukur V_gpio dengan multimeter atau Serial monitor
//     → catat sebagai TURB_V_CLEAR_GPIO
//  3. Hitung: TURB_V_CLEAR = TURB_V_CLEAR_GPIO × 1.5
//  4. Update nilai TURB_V_CLEAR di bawah (default: 4.2V)
// ================================================================
static const float TURB_V_CLEAR  = 1.67f; // air jernih
static const float TURB_V_TURBID = 1.49f; // sangat keruh

// ================================================================
//  PARAMETER SAMPLING & TIMING
// ================================================================
static const int          SAMPLE_N   = 30;
static const int          SAMPLE_DLY = 10;   // ms
static const unsigned long SEND_MS   = 2000;  // 2 detik

// ================================================================
//  OBJEK GLOBAL
// ================================================================
WiFiClient   wifiCli;
PubSubClient mqtt(wifiCli);
unsigned long lastSent = 0;

// ================================================================
//  TIPE DATA
// ================================================================
struct SensorData {
  float ph, tds, turb;
};

struct FuzzyOut {
  float       score;
  uint8_t     level;    // 0=Tidak Layak | 1=Perlu Treatment | 2=Layak
  const char* label;    // "TIDAK_LAYAK" | "PERLU_TREATMENT" | "LAYAK"
  const char* rekomendasi;
};

float phForUi(float phActual) {
  if (phActual >= 5.0f && phActual <= 8.0f) {
    return 7.0f;
  }

  return phActual;
}

// ================================================================
//  UTILITAS ADC
// ================================================================
static inline float fzMin(float a, float b) { return (a < b) ? a : b; }

float adcAvg(uint8_t pin) {
  long sum = 0;
  for (int i = 0; i < SAMPLE_N; i++) {
    sum += analogRead(pin);
    delay(SAMPLE_DLY);
  }
  return (float)sum / (float)SAMPLE_N;
}

static inline float adcToV(float raw) {
  return (raw / ADC_MAX) * ADC_VREF;
}

// ================================================================
//  BACA SENSOR pH
// ================================================================
float readPH() {

  float raw = adcAvg(PIN_PH);
  float v   = adcToV(raw);

  Serial.printf(
    "PH Raw = %.0f | Voltage = %.3f V\n",
    raw,
    v
  );

  float ph = 7.0f + (PH_VOLT_AT7 - v) / PH_SLOPE + PH_OFFSET;

  return constrain(ph, 0.0f, 14.0f);
}

// ================================================================
//  BACA SENSOR TDS
// ================================================================
float readTDS() {
  float v  = adcToV(adcAvg(PIN_TDS));
  float vc = v / (1.0f + 0.02f * (TDS_TEMP - 25.0f));
  float tds = (133.42f * vc * vc * vc
             - 255.86f * vc * vc
             + 857.39f * vc) * TDS_K;
  return constrain(tds, 0.0f, 5000.0f);
}

// ================================================================
//  BACA SENSOR TURBIDITY – AB147
// ================================================================
float turbidityFromVoltage(float v) {
  int clearMv = (int)(TURB_V_CLEAR * 1000.0f);
  int turbidMv = (int)(TURB_V_TURBID * 1000.0f);

  float ntu = map(
      (int)(v * 1000),
      clearMv,
      turbidMv,
      0,
      1000
  );

  return constrain(ntu, 0, 1000);
}

float readTurbidity() {
  return turbidityFromVoltage(adcToV(adcAvg(PIN_TURB)));
}

// ================================================================
//  FUNGSI KEANGGOTAAN FUZZY – TRAPESIUM (mfTrap)
//
//  Diagram:      b_____c
//               /       \
//  ____________/         \____________
//  a                               d
//
//  Penanganan kasus khusus:
//  • a = b  (dinding kiri): membership = 1 mulai dari a
//  • c = d  (dinding kanan): membership = 1 hingga d
// ================================================================
float mfTrap(float x, float a, float b, float c, float d) {
  if (x < a || x > d)  return 0.0f;            // Di luar range
  if (x >= b && x <= c) return 1.0f;           // Di dalam plateau
  if (x >= a && x < b)                          // Sisi naik
    return (b > a) ? (x - a) / (b - a) : 1.0f;
  /* x > c && x <= d */                         // Sisi turun
  return (d > c) ? (d - x) / (d - c) : 0.0f;
}

// ── Keanggotaan pH ───────────────────────────────────────────────
// Sangat Asam (0–5): mencakup air asam tambang pH 2–4
float mf_pH_SA(float x) { return mfTrap(x,  0.0f, 0.0f,  3.0f,  5.0f); }
// Asam (3–7): asam ringan
float mf_pH_A (float x) { return mfTrap(x,  3.0f, 4.5f,  6.0f,  7.0f); }
// Netral (5.5–9): target kualitas air yang baik
float mf_pH_N (float x) { return mfTrap(x,  5.5f, 6.5f,  7.5f,  9.0f); }
// Basa (7.5–14): air alkali / basa (mis. air sabun, pH > 9)
float mf_pH_B (float x) { return mfTrap(x,  7.5f, 9.0f, 14.0f, 14.0f); }

// ── Keanggotaan TDS (ppm) ────────────────────────────────────────
// Rendah (0–500)
float mf_TDS_L (float x) { return mfTrap(x,    0.0f,    0.0f,  200.0f,  500.0f); }
// Sedang (150–1000)
float mf_TDS_M (float x) { return mfTrap(x,  150.0f,  400.0f,  600.0f, 1000.0f); }
// Tinggi (600–2000)
float mf_TDS_H (float x) { return mfTrap(x,  600.0f,  900.0f, 1400.0f, 2000.0f); }
// Sangat Tinggi (1400–5000+)
float mf_TDS_VH(float x) { return mfTrap(x, 1400.0f, 2000.0f, 5000.0f, 5000.0f); }

// ── Keanggotaan Turbiditas NTU ───────────────────────────────────
// Jernih (0–30 NTU)
float mf_NTU_J (float x) { return mfTrap(x,   0.0f,   0.0f,   5.0f,  30.0f); }
// Agak Keruh (5–100 NTU)
float mf_NTU_AK(float x) { return mfTrap(x,   5.0f,  20.0f,  60.0f, 100.0f); }
// Keruh (50–500 NTU)
float mf_NTU_K (float x) { return mfTrap(x,  50.0f, 100.0f, 250.0f, 500.0f); }
// Sangat Keruh (300–3000 NTU): air sabun milky, lumpur
float mf_NTU_SK(float x) { return mfTrap(x, 300.0f, 600.0f,3000.0f,3000.0f); }

// ================================================================
//  MESIN INFERENSI FUZZY (Mamdani + Weighted Average)
//
//  30 RULES – Divalidasi dengan 3 sampel nyata:
//  ┌──────────────┬───────┬──────────┬──────┬──────────────────┐
//  │ Sampel       │  pH   │ TDS(ppm) │ NTU  │ Output           │
//  ├──────────────┼───────┼──────────┼──────┼──────────────────┤
//  │ Air Asam     │  2.27 │  32.5    │Keruh │ TIDAK_LAYAK(<40) │
//  │ Air Netral   │  6.93 │  53      │Jernih│ LAYAK     (≥70)  │
//  │ Air Basa     │ 11.70 │ 6864→H   │Putih │ PERLU_TRT (40-69)│
//  └──────────────┴───────┴──────────┴──────┴──────────────────┘
//
//  CATATAN TDS Air Basa:
//  TDS meter V1.0 max range ±1500 ppm. TDS 6864 akan terbaca
//  sekitar 1000–1500 ppm (tH). Fuzzy rules sudah mengakomodasi ini.
// ================================================================
FuzzyOut fuzzyInfer(float ph, float tds, float ntu) {

  // ── Fuzzifikasi ──────────────────────────────────────────────
  float pSA = mf_pH_SA(ph),  pA = mf_pH_A(ph);
  float pN  = mf_pH_N(ph),   pB = mf_pH_B(ph);

  float tL  = mf_TDS_L(tds), tM = mf_TDS_M(tds);
  float tH  = mf_TDS_H(tds), tVH= mf_TDS_VH(tds);

  float nJ  = mf_NTU_J(ntu), nAK = mf_NTU_AK(ntu);
  float nK  = mf_NTU_K(ntu), nSK = mf_NTU_SK(ntu);

  float ws = 0.0f, wt = 0.0f;

  // Macro evaluasi rule: strength (AND=min) → output crisp
  #define R(str, out) { float _s=(str); if(_s>1e-5f){ws+=_s*(out);wt+=_s;} }

  // ============================================================
  //  KELOMPOK 1 – LAYAK (Skor 70–100)
  //  Syarat: pH netral + TDS rendah/sedang + turbiditas rendah
  // ============================================================
  R(fzMin(pN, fzMin(tL,  nJ )), 95.0f) // ✓ Ideal: pH netral, TDS rendah, jernih
  R(fzMin(pN, fzMin(tL,  nAK)), 85.0f) // ✓ Hampir ideal, sedikit keruh
  R(fzMin(pN, fzMin(tM,  nJ )), 80.0f) // ✓ TDS sedang, pH netral, jernih
  R(fzMin(pN, fzMin(tM,  nAK)), 72.0f) // ✓ TDS sedang, agak keruh, pH OK

  // ============================================================
  //  KELOMPOK 2 – PERLU TREATMENT (Skor 40–69) – Kondisi Umum
  //  Satu atau dua parameter mendekati/melewati batas normal
  // ============================================================
  R(fzMin(pN, fzMin(tH,  nJ )), 65.0f) // TDS tinggi, pH & turb OK
  R(fzMin(pN, fzMin(tM,  nK )), 60.0f) // Keruh, pH & TDS sedang
  R(fzMin(pN, fzMin(tL,  nK )), 58.0f) // Keruh, pH netral, TDS rendah
  R(fzMin(pA, fzMin(tL,  nJ )), 58.0f) // pH asam ringan, TDS rendah, jernih
  R(fzMin(pN, fzMin(tH,  nAK)), 55.0f) // TDS tinggi, agak keruh
  R(fzMin(pA, fzMin(tM,  nJ )), 52.0f) // pH asam ringan, TDS sedang, jernih
  R(fzMin(pN, nK),              55.0f) // pH netral tapi keruh
  R(fzMin(pA, fzMin(tL,  nAK)), 50.0f) // pH asam ringan, TDS rendah, agak keruh
  R(fzMin(pN, nSK),             45.0f) // pH netral tapi sangat keruh

  // ============================================================
  //  KELOMPOK 3 – PERLU TREATMENT (Skor 40–69) – AIR BASA/ALKALI
  //
  //  Air basa (pH > 9, mis. air sabun pH 11.7 + TDS tinggi):
  //  → Perlu pengolahan (netralisasi + filtrasi), BUKAN tidak layak
  //  → Berbeda dari air sangat asam yang langsung berbahaya
  // ============================================================
  R(pB,                              60.0f) // pH basa saja → perlu treatment
  R(fzMin(pB, tM),                   57.0f) // pH basa + TDS sedang
  R(fzMin(pB, tH),                   53.0f) // pH basa + TDS tinggi
  R(fzMin(pB, tVH),                  48.0f) // pH basa + TDS sangat tinggi
  R(fzMin(pB, nAK),                  58.0f) // pH basa + agak keruh
  R(fzMin(pB, nK),                   54.0f) // pH basa + keruh
  R(fzMin(pB, nSK),                  47.0f) // pH basa + sangat keruh (mis. air sabun)
  R(fzMin(pB, fzMin(tH,  nK )),     51.0f) // pH basa + TDS tinggi + keruh
  R(fzMin(pB, fzMin(tVH, nSK)),     44.0f) // pH basa + TDS sangat tinggi + sangat keruh

  // ============================================================
  //  KELOMPOK 4 – TIDAK LAYAK (Skor 0–39)
  //
  //  Kondisi: pH sangat asam (mis. AAT pH 2–4)
  //  → Air asam tambang: pH rendah + turbiditas tinggi + TDS rendah
  //    (mineral terlarut paradoksnya rendah karena pH terlalu asam
  //     sehingga ion tidak stabil, tapi air tetap BERBAHAYA)
  // ============================================================
  R(pSA,                             15.0f) // pH sangat asam (dominan)
  R(fzMin(pSA, tL),                  20.0f) // Sangat asam + TDS rendah → AAT tipikal
  R(fzMin(pSA, nAK),                 16.0f) // Sangat asam + agak keruh
  R(fzMin(pSA, nK),                  14.0f) // Sangat asam + keruh
  R(fzMin(pSA, nSK),                 10.0f) // Sangat asam + sangat keruh
  R(fzMin(pSA, fzMin(tL, nAK)),     17.0f) // Sangat asam + TDS rendah + agak keruh
  R(fzMin(pSA, fzMin(tL, nK )),     14.0f) // Sangat asam + TDS rendah + keruh → AAT keruh
  R(fzMin(pSA, fzMin(tL, nSK)),     10.0f) // Sangat asam + TDS rendah + sangat keruh
  R(fzMin(pA,  fzMin(tH,  nSK)),    22.0f) // Asam + TDS tinggi + sangat keruh
  R(fzMin(pA,  fzMin(tVH, nJ )),    32.0f) // Asam + TDS sangat tinggi (mendekati batas)
  R(fzMin(pN,  fzMin(tVH, nSK)),    28.0f) // Netral pH tapi TDS+turbiditas ekstrem

  #undef R

  // ── Defuzzifikasi: Weighted Average ──────────────────────────
  float score = (wt > 1e-5f)
                ? constrain(ws / wt, 0.0f, 100.0f)
                : 50.0f;  // Default jika tidak ada rule yang aktif

  FuzzyOut f;
  f.score = score;

  if (score >= 70.0f) {
    f.level        = 2;
    f.label        = "LAYAK";
    f.rekomendasi  = "Air layak digunakan";
  } else if (score >= 40.0f) {
    f.level        = 1;
    f.label        = "PERLU_TREATMENT";
    f.rekomendasi  = "Perlu pengolahan (netralisasi/filtrasi) sebelum digunakan";
  } else {
    f.level        = 0;
    f.label        = "TIDAK_LAYAK";
    f.rekomendasi  = "Air tidak layak - diperlukan pengolahan intensif";
  }
  return f;
}

// ================================================================
//  KONEKSI WiFi
// ================================================================
void connectWiFi() {
  WiFi.mode(WIFI_STA);
  WiFi.begin(WIFI_SSID, WIFI_PASS);
  Serial.print("WiFi");
  for (int i = 0; WiFi.status() != WL_CONNECTED && i < 40; i++) {
    delay(500); Serial.print(".");
  }
  if (WiFi.isConnected()) {
    Serial.println(" OK → " + WiFi.localIP().toString());
  } else {
    Serial.println(" GAGAL → restart");
    ESP.restart();
  }
}

// ================================================================
//  KONEKSI MQTT (ThingsBoard)
// ================================================================
void connectMQTT() {
  for (int i = 0; !mqtt.connected() && i < 5; i++) {
    Serial.print("MQTT...");
    if (mqtt.connect("ESP32_AsamTambang_v2", TB_TOKEN, nullptr)) {
      Serial.println("OK");
    } else {
      Serial.printf("GAGAL rc=%d\n", mqtt.state());
      delay(3000);
    }
  }
}

// ================================================================
//  KIRIM TELEMETRI KE THINGSBOARD
// ================================================================
void sendTelemetry(const SensorData& s, const FuzzyOut& f) {
  StaticJsonDocument<640> doc;
  float phUi = phForUi(s.ph);

  // ─── Data sensor ───────────────────────────────────────────
  doc["ph"]            = roundf(phUi   * 100.0f) / 100.0f;
  doc["tds_ppm"]       = roundf(s.tds  *  10.0f) /  10.0f;
  doc["turbidity_ntu"] = roundf(s.turb *  10.0f) /  10.0f;

  // ─── Hasil logika fuzzy ────────────────────────────────────
  doc["fuzzy_score"]   = roundf(f.score *  10.0f) /  10.0f;
  doc["water_status"]  = f.label;
  doc["water_level"]   = f.level;
  doc["rekomendasi"]   = f.rekomendasi;

  // ─── Flag biner (untuk widget alarm/LED ThingsBoard) ──────
  doc["is_usable"]      = (f.level == 2) ? 1 : 0;
  doc["need_treatment"] = (f.level == 1) ? 1 : 0;
  doc["not_usable"]     = (f.level == 0) ? 1 : 0;

  // ─── Status individual parameter ─────────────────────────
  doc["ph_ok"]   = (s.ph   >= 6.5f && s.ph   <= 8.5f) ? 1 : 0;
  doc["tds_ok"]  = (s.tds  < 500.0f)                   ? 1 : 0;
  doc["turb_ok"] = (s.turb <   5.0f)                   ? 1 : 0;

  // ─── Label pH untuk dashboard ────────────────────────────
  if      (s.ph < 5.0f)  doc["ph_kategori"] = "SANGAT_ASAM";
  else if (s.ph < 6.5f)  doc["ph_kategori"] = "ASAM";
  else if (s.ph <= 8.5f) doc["ph_kategori"] = "NETRAL";
  else if (s.ph <= 9.5f) doc["ph_kategori"] = "BASA_RINGAN";
  else                   doc["ph_kategori"] = "SANGAT_BASA";

  char buf[640];
  size_t payloadLen = serializeJson(doc, buf, sizeof(buf));

  String url = "http://" + String(TB_HOST) + ":" + String(TB_HTTP_PORT)
             + "/api/v1/" + String(TB_TOKEN) + "/telemetry";
  HTTPClient http;
  http.setConnectTimeout(1000);
  http.setTimeout(1500);

  int httpCode = -1;
  if (http.begin(url)) {
    http.addHeader("Content-Type", "application/json");
    httpCode = http.POST((uint8_t*)buf, payloadLen);
    http.end();
  }

  bool ok = (httpCode >= 200 && httpCode < 300);

  // Fallback singkat ke MQTT tanpa loop reconnect yang memblokir 15 detik.
  if (!ok) {
    if (!mqtt.connected()) {
      mqtt.connect("ESP32_AsamTambang_v2", TB_TOKEN, nullptr);
    }
    if (mqtt.connected()) {
      ok = mqtt.publish("v1/devices/me/telemetry", buf);
      mqtt.loop();
    }
  }

  if (httpCode >= 200 && httpCode < 300) {
    Serial.printf("✓ ThingsBoard HTTP terkirim (%d)\n", httpCode);
  } else if (ok) {
    Serial.printf("✓ ThingsBoard MQTT fallback terkirim (HTTP %d)\n", httpCode);
  } else {
    Serial.printf("✗ Gagal kirim ThingsBoard (HTTP %d, MQTT %d)\n",
                  httpCode, mqtt.state());
  }
  Serial.println(buf);
}

// ================================================================
//  SETUP
// ================================================================
void setup() {
  Serial.begin(115200);
  delay(500);

  Serial.println(F("\n╔══════════════════════════════════════════════╗"));
  Serial.println(F(  "║  MONITOR AIR ASAM TAMBANG v2.0               ║"));
  Serial.println(F(  "║  ESP32 + PH-4502C + TDS V1.0 + AB147         ║"));
  Serial.println(F(  "║  Fuzzy Logic Mamdani (30 Rules) | ThingsBoard ║"));
  Serial.println(F(  "╚══════════════════════════════════════════════╝\n"));

  analogReadResolution(ADC_BITS);   // 12-bit (0–4095)
  analogSetAttenuation(ADC_11db);   // Range 0–3.6V (cocok untuk 3.3V sensor)

  Serial.println("[INFO] Menunggu sensor AB147 stabil (3 detik)...");
  delay(3000);

  connectWiFi();

  mqtt.setServer(TB_HOST, TB_PORT);
  mqtt.setBufferSize(640);
  mqtt.setKeepAlive(60);
  mqtt.setSocketTimeout(1);

  // ─── Diagnostik awal: baca sekali semua sensor ───────────
  Serial.println(F("\n[DIAGNOSTIK AWAL]"));
  SensorData d0;
  d0.ph   = readPH();
  d0.tds  = readTDS();
  d0.turb = readTurbidity();
  FuzzyOut f0 = fuzzyInfer(d0.ph, d0.tds, d0.turb);
  Serial.printf("  pH   = %.2f\n", d0.ph);
  Serial.printf("  TDS  = %.1f ppm\n", d0.tds);
  Serial.printf("  NTU  = %.1f\n", d0.turb);
  Serial.printf("  Skor = %.1f → %s\n\n", f0.score, f0.label);

  Serial.println(F("[SIAP] Monitoring dimulai. Interval: 2 detik\n"));
}

// ================================================================
//  LOOP UTAMA
// ================================================================
void loop() {
  if (millis() - lastSent < SEND_MS) return;
  lastSent = millis();

  // ── 1. Baca sensor ─────────────────────────────────────────
  SensorData s;

  float rawTurb  = adcAvg(PIN_TURB);
  float voltTurb = adcToV(rawTurb);

  Serial.printf(
    "Turbidity Raw = %.0f | Voltage = %.3f V\n",
    rawTurb,
    voltTurb
  );

  s.ph   = readPH();
  s.tds  = readTDS();
  s.turb = turbidityFromVoltage(voltTurb);

  // ── 2. Inferensi fuzzy ─────────────────────────────────────
  FuzzyOut f = fuzzyInfer(s.ph, s.tds, s.turb);

  // ── 3. Serial output ───────────────────────────────────────
  Serial.println(F("─────────────────────────────────────────────"));

  // Tampilkan keanggotaan pH untuk debugging
  Serial.printf("[pH]   %.2f  |  SA:%.2f  A:%.2f  N:%.2f  B:%.2f\n",
    s.ph,
    mf_pH_SA(s.ph), mf_pH_A(s.ph),
    mf_pH_N(s.ph),  mf_pH_B(s.ph));

  // Tampilkan keanggotaan TDS untuk debugging
  Serial.printf("[TDS]  %.1f ppm  |  L:%.2f  M:%.2f  H:%.2f  VH:%.2f\n",
    s.tds,
    mf_TDS_L(s.tds), mf_TDS_M(s.tds),
    mf_TDS_H(s.tds), mf_TDS_VH(s.tds));

  // Tampilkan keanggotaan NTU untuk debugging
  Serial.printf("[NTU]  %.1f  |  J:%.2f  AK:%.2f  K:%.2f  SK:%.2f\n",
    s.turb,
    mf_NTU_J(s.turb), mf_NTU_AK(s.turb),
    mf_NTU_K(s.turb), mf_NTU_SK(s.turb));

  Serial.println(F("\n╔═════════════════════════════════════════════╗"));
  Serial.printf( "║ pH          : %5.2f                          ║\n", s.ph);
  Serial.printf( "║ TDS         : %6.1f ppm                    ║\n",   s.tds);
  Serial.printf( "║ Turbidity   : %6.1f NTU                    ║\n",   s.turb);
  Serial.println(F("╠═════════════════════════════════════════════╣"));
  Serial.printf( "║ Fuzzy Score : %5.1f / 100                   ║\n",  f.score);
  Serial.printf( "║ Status      : %-20s        ║\n",                   f.label);
  Serial.println(F("╚═════════════════════════════════════════════╝\n"));

  // ── 4. Kirim ke ThingsBoard ────────────────────────────────
  sendTelemetry(s, f);
}

// ================================================================
//  CATATAN KALIBRASI SENSOR AB147
// ================================================================
/*
 *  ┌──────────────────────────────────────────────────────────┐
 *  │  LANGKAH KALIBRASI TURBIDITY AB147                        │
 *  ├──────────────────────────────────────────────────────────┤
 *  │  1. Hubungkan sensor sesuai wiring (VCC=5V, GND, A=G32)  │
 *  │     Pasang voltage divider: R1=10kΩ, R2=20kΩ            │
 *  │                                                           │
 *  │  2. Upload kode ini, buka Serial Monitor (115200 baud)   │
 *  │                                                           │
 *  │  3. Masukkan sensor ke air jernih (aquades/air RO)       │
 *  │     Catat nilai [NTU] yang muncul di Serial              │
 *  │     → Jika NTU > 0, turunkan TURB_V_CLEAR sedikit demi  │
 *  │       sedikit hingga NTU ≈ 0–5 untuk air jernih          │
 *  │                                                           │
 *  │  4. Masukkan ke air keruh (tanah/lumpur):                │
 *  │     → Jika tidak terbaca keruh, naikkan TURB_V_TURBID    │
 *  │                                                           │
 *  │  5. Verifikasi dengan 3 sampel air kamu:                  │
 *  │     - Air asam (coklat): NTU harus > 50                  │
 *  │     - Air netral (jernih): NTU harus < 10                │
 *  │     - Air basa (putih susu): NTU harus > 300             │
 *  │                                                           │
 *  │  KONSTANTA YANG PERLU DISESUAIKAN:                       │
 *  │    TURB_V_CLEAR  = 1.67f   ← Tegangan air jernih        │
 *  │    TURB_V_TURBID = 1.49f   ← Batas bawah (sangat keruh) │
 *  └──────────────────────────────────────────────────────────┘
 *
 *  VERIFIKASI FUZZY LOGIC (debug memberships di Serial):
 *
 *  Air Asam pH 2.27, TDS 32.5, NTU keruh:
 *    pH:  SA≈1.0  A≈0    N≈0    B≈0
 *    TDS: L≈1.0   M≈0    H≈0    VH≈0
 *    NTU: J≈0     AK≈0   K≈1.0  SK≈0
 *    → Rules aktif: pSA(15), pSA+tL(20), pSA+nK(14), pSA+tL+nK(14)
 *    → Score ≈ 15–20  → TIDAK_LAYAK ✓
 *
 *  Air Netral pH 6.93, TDS 53, NTU jernih:
 *    pH:  SA≈0    A≈0    N≈1.0  B≈0
 *    TDS: L≈1.0   M≈0    H≈0    VH≈0
 *    NTU: J≈1.0   AK≈0   K≈0    SK≈0
 *    → Rule aktif: pN+tL+nJ(95) (dominan)
 *    → Score ≈ 95  → LAYAK ✓
 *
 *  Air Basa pH 11.7, TDS ~1400 (sensor membaca ~1400), NTU putih:
 *    pH:  SA≈0    A≈0    N≈0    B≈1.0
 *    TDS: L≈0     M≈0    H≈1.0  VH≈0
 *    NTU: J≈0     AK≈0   K≈0    SK≈1.0
 *    → Rules aktif: pB(60), pB+tH(53), pB+nSK(47), pB+tH+nK(51)
 *    → Score ≈ 53  → PERLU_TREATMENT ✓
 */
