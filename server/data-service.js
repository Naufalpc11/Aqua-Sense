import { readFileSync, writeFileSync, existsSync, mkdirSync, readdirSync } from 'node:fs';
import { join } from 'node:path';

const DATA_DIR = join(import.meta.dirname, '..', 'data');
const SAVE_INTERVAL_MS = 5000; // simpan setiap 5 detik
const MAX_POINTS_PER_FILE = 50000; // max 50rb titik per file

let pendingPoints = [];
let saveTimer = null;

function getTodayFile() {
  const date = new Date();
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return join(DATA_DIR, `telemetry-${y}-${m}-${d}.json`);
}

function loadExisting(filePath) {
  if (!existsSync(filePath)) return [];
  try {
    const raw = readFileSync(filePath, 'utf-8').trim();
    if (!raw) return [];
    return JSON.parse(raw);
  } catch {
    return [];
  }
}

function flushToDisk() {
  if (!pendingPoints.length) return;

  const points = pendingPoints.splice(0);
  const filePath = getTodayFile();

  if (!existsSync(DATA_DIR)) {
    mkdirSync(DATA_DIR, { recursive: true });
  }

  const existing = loadExisting(filePath);
  const merged = [...existing, ...points];

  // Batasi jumlah titik per file biar ga kegedean
  const trimmed = merged.slice(-MAX_POINTS_PER_FILE);

  writeFileSync(filePath, JSON.stringify(trimmed, null, 2), 'utf-8');
}

function scheduleFlush() {
  if (saveTimer) clearTimeout(saveTimer);
  saveTimer = setTimeout(() => {
    flushToDisk();
    saveTimer = null;
  }, SAVE_INTERVAL_MS);
}

/**
 * Tambah satu titik data ke buffer penyimpanan.
 * Akan otomatis di-flush ke file setiap 5 detik.
 */
function formatTime(ts) {
  const d = new Date(ts);
  const y = d.getFullYear();
  const mo = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  const h = String(d.getHours()).padStart(2, '0');
  const mi = String(d.getMinutes()).padStart(2, '0');
  const s = String(d.getSeconds()).padStart(2, '0');
  return `${y}-${mo}-${day} ${h}:${mi}:${s}`;
}

export function saveTelemetryPoint(point) {
  if (!point || !point.timestamp) return;

  pendingPoints.push({
    timestamp: point.timestamp,
    time: formatTime(point.timestamp),
    ph: point.ph,
    tds: point.tds,
    ntu: point.ntu,
    score: point.score,
    level: point.level,
    status: point.status,
    ss: point.ss,
    phCategory: point.phCategory,
    phOk: point.phOk,
    tdsOk: point.tdsOk,
    turbOk: point.turbOk,
    savedAt: Date.now(),
    savedAtTime: formatTime(Date.now()),
  });

  scheduleFlush();
}

/**
 * Flush paksa data pending ke disk (dipanggil sebelum export).
 */
export function flushPending() {
  if (saveTimer) {
    clearTimeout(saveTimer);
    saveTimer = null;
  }
  flushToDisk();
}

/**
 * Ambil semua data dari file tertentu (berdasarkan tanggal).
 * dateStr format: YYYY-MM-DD. Jika tidak ada, return array kosong.
 */
export function getStoredHistory(dateStr) {
  if (!existsSync(DATA_DIR)) {
    mkdirSync(DATA_DIR, { recursive: true });
    return [];
  }

  if (dateStr) {
    const filePath = join(DATA_DIR, `telemetry-${dateStr}.json`);
    return loadExisting(filePath);
  }

  // Baca file hari ini
  return loadExisting(getTodayFile());
}

/**
 * Gabung data dari SEMUA file JSON, urutkan berdasarkan timestamp.
 */
export function getAllStoredHistory() {
  if (!existsSync(DATA_DIR)) {
    mkdirSync(DATA_DIR, { recursive: true });
    return [];
  }

  const files = readdirSync(DATA_DIR)
    .filter((f) => f.startsWith('telemetry-') && f.endsWith('.json'))
    .sort();

  const allPoints = [];
  for (const file of files) {
    const filePath = join(DATA_DIR, file);
    const points = loadExisting(filePath);
    allPoints.push(...points);
  }

  // Urutkan dari lama ke baru
  allPoints.sort((a, b) => a.timestamp - b.timestamp);
  return allPoints;
}

/**
 * Daftar file data yang tersedia.
 */
export function listDataFiles() {
  if (!existsSync(DATA_DIR)) {
    mkdirSync(DATA_DIR, { recursive: true });
    return [];
  }

  const files = readdirSync(DATA_DIR);
  return files
    .filter((f) => f.startsWith('telemetry-') && f.endsWith('.json'))
    .map((f) => ({
      filename: f,
      date: f.replace('telemetry-', '').replace('.json', ''),
    }))
    .sort((a, b) => b.date.localeCompare(a.date));
}