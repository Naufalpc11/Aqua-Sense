import { assertThingsBoardConfigured, config } from './config.js';
import {
  getDeviceId,
  thingsBoardRequest,
} from './thingsboard-client.js';
import { saveTelemetryToSupabase } from './supabase-service.js';

const LATEST_CACHE_MS = 500;
const HISTORY_CACHE_MS = 5000;
const BURST_WINDOW_MS = 1500;

const TELEMETRY_KEYS = [
  'ph',
  'tds_ppm',
  'turbidity_ntu',
  'fuzzy_score',
  'water_status',
  'water_level',
  'rekomendasi',
  'is_usable',
  'need_treatment',
  'not_usable',
  'ph_ok',
  'tds_ok',
  'turb_ok',
  'ph_kategori',
];

const HISTORY_KEYS = [
  'ph',
  'tds_ppm',
  'turbidity_ntu',
  'fuzzy_score',
  'water_status',
  'water_level',
];

let latestCache = { expiresAt: 0, value: null };
const historyCache = new Map();
let lastSavedTimestamp = 0; // Track timestamp terakhir yang disimpan ke Supabase

function latestValue(series, key) {
  return series[key]?.[0]?.value;
}

function asNumber(value, fallback = 0) {
  const number = Number(value);
  return Number.isFinite(number) ? number : fallback;
}

function asBoolean(value) {
  return value === true || value === 1 || value === '1' || value === 'true';
}

function normalizeStatus(label, level) {
  if (label === 'LAYAK' || level === 2) return 'LAYAK DIGUNAKAN';
  if (label === 'PERLU_TREATMENT' || level === 1) {
    return 'PERLU TREATMENT';
  }
  if (label === 'TIDAK_LAYAK' || level === 0) return 'TIDAK LAYAK';
  return 'MENUNGGU DATA';
}

function shortStatus(label, level) {
  if (label === 'LAYAK' || level === 2) return 'LAYAK';
  if (label === 'PERLU_TREATMENT' || level === 1) return 'PERLU TRT.';
  if (label === 'TIDAK_LAYAK' || level === 0) return 'TDK LAYAK';
  return 'NO DATA';
}

function clampInteger(value, fallback, min, max) {
  const number = Number.parseInt(value, 10);
  if (!Number.isFinite(number)) return fallback;
  return Math.min(max, Math.max(min, number));
}

function normalizeHistory(series) {
  const pointsByTimestamp = new Map();

  for (const [key, items] of Object.entries(series)) {
    for (const item of items || []) {
      const timestamp = Number(item.ts);
      if (!Number.isFinite(timestamp)) continue;

      const point = pointsByTimestamp.get(timestamp) || { timestamp };
      point[key] = item.value;
      pointsByTimestamp.set(timestamp, point);
    }
  }

  return [...pointsByTimestamp.values()]
    .sort((a, b) => a.timestamp - b.timestamp)
    .map((point) => {
      const level = asNumber(point.water_level, -1);
      const label = point.water_status || '';

      return {
        timestamp: point.timestamp,
        ph: asNumber(point.ph),
        tds: asNumber(point.tds_ppm),
        ntu: asNumber(point.turbidity_ntu),
        score: asNumber(point.fuzzy_score),
        level,
        ss: shortStatus(label, level),
      };
    });
}

function deduplicateBursts(points) {
  const history = [];

  for (const point of points) {
    const previous = history.at(-1);
    if (previous && point.timestamp - previous.timestamp < BURST_WINDOW_MS) {
      history[history.length - 1] = point;
    } else {
      history.push(point);
    }
  }

  return history;
}

export async function getLatestTelemetry() {
  if (latestCache.value && Date.now() < latestCache.expiresAt) {
    return latestCache.value;
  }

  assertThingsBoardConfigured();
  const deviceId = await getDeviceId();
  const series = await thingsBoardRequest(
    `/api/plugins/telemetry/DEVICE/${encodeURIComponent(deviceId)}/values/timeseries?keys=${TELEMETRY_KEYS.join(',')}`,
  );
  const timestamps = Object.values(series)
    .flatMap((items) => items?.map((item) => Number(item.ts)) || [])
    .filter(Number.isFinite);
  const timestamp = timestamps.length ? Math.max(...timestamps) : 0;

  if (!timestamp) {
    throw new Error('Device belum memiliki telemetry');
  }

  const label = latestValue(series, 'water_status') || '';
  const level = asNumber(latestValue(series, 'water_level'), -1);
  const result = {
    source: 'thingsboard',
    connected: true,
    deviceOnline:
      Date.now() - timestamp <= config.thingsBoard.staleAfterMs,
    receivedAt: new Date(timestamp).toISOString(),
    telemetry: {
      timestamp,
      ph: asNumber(latestValue(series, 'ph')),
      tds: asNumber(latestValue(series, 'tds_ppm')),
      ntu: asNumber(latestValue(series, 'turbidity_ntu')),
      score: asNumber(latestValue(series, 'fuzzy_score')),
      level,
      status: normalizeStatus(label, level),
      ss: shortStatus(label, level),
      recommendation: latestValue(series, 'rekomendasi') || '',
      phCategory: latestValue(series, 'ph_kategori') || '',
      phOk: asBoolean(latestValue(series, 'ph_ok')),
      tdsOk: asBoolean(latestValue(series, 'tds_ok')),
      turbOk: asBoolean(latestValue(series, 'turb_ok')),
    },
  };

  // Auto-save ke Supabase hanya kalau timestamp baru (bukan duplikat)
  if (timestamp !== lastSavedTimestamp) {
    lastSavedTimestamp = timestamp;
    saveTelemetryToSupabase(result.telemetry);
  }

  latestCache = {
    value: result,
    expiresAt: Date.now() + LATEST_CACHE_MS,
  };
  return result;
}

export async function getTelemetryHistory(searchParams) {
  assertThingsBoardConfigured();
  const deviceId = await getDeviceId();
  const limit = clampInteger(searchParams.get('limit'), 55, 2, 500);
  const hours = clampInteger(searchParams.get('hours'), 6, 1, 168);
  const cacheKey = `${deviceId}:${limit}:${hours}`;
  const cached = historyCache.get(cacheKey);

  if (cached && Date.now() < cached.expiresAt) {
    return cached.value;
  }

  const endTs = Date.now();
  const startTs = endTs - hours * 60 * 60 * 1000;
  const path =
    `/api/plugins/telemetry/DEVICE/${encodeURIComponent(deviceId)}` +
    `/values/timeseries?keys=${HISTORY_KEYS.join(',')}` +
    `&startTs=${startTs}&endTs=${endTs}&limit=${limit}` +
    '&agg=NONE&orderBy=DESC';
  const series = await thingsBoardRequest(path);
  const history = deduplicateBursts(normalizeHistory(series)).slice(-limit);
  const result = {
    source: 'thingsboard',
    hours,
    history,
  };

  historyCache.set(cacheKey, {
    value: result,
    expiresAt: Date.now() + HISTORY_CACHE_MS,
  });
  return result;
}
