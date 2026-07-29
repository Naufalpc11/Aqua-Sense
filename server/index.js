import { createServer } from 'node:http';
import {
  config,
  isThingsBoardConfigured,
} from './config.js';
import { sendJson, serveStatic } from './http-utils.js';
import {
  getLatestTelemetry,
  getTelemetryHistory,
} from './telemetry-service.js';
import {
  getStoredHistory,
  getAllStoredHistory,
  flushPending,
  listDataFiles,
} from './data-service.js';
import { getHistoryFromSupabase, resetTelemetryInSupabase } from './supabase-service.js';

function errorMessage(error, fallback) {
  return error instanceof Error ? error.message : fallback;
}

const server = createServer(async (request, response) => {
  const requestUrl = new URL(request.url, 'http://localhost');
  const { pathname } = requestUrl;

  if (request.method === 'GET' && pathname === '/api/health') {
    sendJson(response, 200, {
      ok: true,
      configured: isThingsBoardConfigured(),
    });
    return;
  }

  if (request.method === 'GET' && pathname === '/api/telemetry/latest') {
    try {
      sendJson(response, 200, await getLatestTelemetry());
    } catch (error) {
      sendJson(response, 503, {
        connected: false,
        message: errorMessage(error, 'Telemetry tidak tersedia'),
      });
    }
    return;
  }

  if (request.method === 'GET' && pathname === '/api/telemetry/export') {
    // Flush data pending dulu sebelum export
    flushPending();
    const date = requestUrl.searchParams.get('date') || '';
    const format = requestUrl.searchParams.get('format') || 'json';

    // Coba ambil dari Supabase dulu (online)
    let dataPoints = [];
    try {
      dataPoints = await getHistoryFromSupabase({ date, limit: 50000 });
    } catch {
      // ignore
    }

    // Fallback ke file JSON lokal jika Supabase belum dikonfigurasi
    if (!dataPoints.length) {
      dataPoints = date
        ? getStoredHistory(date)
        : getAllStoredHistory();
    }

    if (format === 'csv') {
      // Export sebagai CSV
      const header = 'waktu,sensor_ph,tds_ppm,turbidity_ntu,fuzzy_score,level,status,phCategory,phOk,tdsOk,turbOk,tersimpan_pada';
      const rows = dataPoints.map((p) =>
        `"${p.time || ''}",${p.ph},${p.tds},${p.ntu},${p.score},${p.level},"${p.status || ''}","${p.phCategory || ''}",${p.phOk ? 1 : 0},${p.tdsOk ? 1 : 0},${p.turbOk ? 1 : 0},"${p.savedAtTime || ''}"`,
      );
      const csv = '\uFEFF' + [header, ...rows].join('\n'); // BOM biar UTF-8 di Excel

      response.writeHead(200, {
        'Content-Type': 'text/csv; charset=utf-8',
        'Content-Disposition': `attachment; filename="aquasense-export${date ? '-' + date : ''}.csv"`,
      });
      response.end(csv);
      return;
    }

    // Export sebagai JSON (default)
    const json = JSON.stringify(dataPoints, null, 2);
    response.writeHead(200, {
      'Content-Type': 'application/json; charset=utf-8',
      'Content-Disposition': `attachment; filename="aquasense-export${date ? '-' + date : ''}.json"`,
    });
    response.end(json);
    return;
  }

  if (request.method === 'GET' && pathname === '/api/telemetry/history') {
    try {
      const history = await getTelemetryHistory(requestUrl.searchParams);
      sendJson(response, 200, history);
    } catch (error) {
      sendJson(response, 503, {
        connected: false,
        message: errorMessage(error, 'Riwayat telemetry tidak tersedia'),
      });
    }
    return;
  }

  if (request.method === 'POST' && pathname === '/api/telemetry/reset') {
    const token = requestUrl.searchParams.get('token') || '';
    const expectedToken = process.env.RESET_TOKEN || '';

    if (!expectedToken || token !== expectedToken) {
      sendJson(response, 403, { success: false, message: 'Token reset tidak valid' });
      return;
    }

    try {
      const result = await resetTelemetryInSupabase();
      sendJson(response, 200, result);
    } catch (error) {
      sendJson(response, 503, { success: false, message: errorMessage(error, 'Reset gagal') });
    }
    return;
  }

  if (request.method === 'GET' && pathname === '/api/telemetry/files') {
    const files = listDataFiles();
    sendJson(response, 200, { files });
    return;
  }

  if (request.method === 'GET' && serveStatic(request, response)) return;
  sendJson(response, 404, { message: 'Not found' });
});

server.listen(config.port, () => {
  console.log(`AquaSense API listening on http://localhost:${config.port}`);
});
