import { getHistoryFromSupabase } from '../../server/supabase-service.js';

function sendJson(response, status, data) {
  response.status(status).json(data);
}

function formatTimestamp(ts) {
  if (!ts) return '';
  const d = new Date(ts);
  const y = d.getFullYear();
  const mo = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  const h = String(d.getHours()).padStart(2, '0');
  const mi = String(d.getMinutes()).padStart(2, '0');
  const s = String(d.getSeconds()).padStart(2, '0');
  return `${y}-${mo}-${day} ${h}:${mi}:${s}`;
}

export default async function handler(request, response) {
  if (request.method !== 'GET') {
    sendJson(response, 405, { message: 'Method not allowed' });
    return;
  }

  const requestUrl = new URL(request.url, 'http://localhost');
  const date = requestUrl.searchParams.get('date') || '';
  const format = requestUrl.searchParams.get('format') || 'json';

  // Ambil data dari Supabase
  let dataPoints = [];
  try {
    dataPoints = await getHistoryFromSupabase({ date, limit: 50000 });
  } catch (err) {
    console.error('❌ Gagal ambil dari Supabase:', err.message);
  }

  if (format === 'csv') {
    const header = 'waktu,sensor_ph,tds_ppm,turbidity_ntu,fuzzy_score,level,status,phCategory,phOk,tdsOk,turbOk,tersimpan_pada';
    const rows = dataPoints.map((p) =>
      `"${p.time || ''}",${p.ph},${p.tds},${p.ntu},${p.score},${p.level},"${p.status || ''}","${p.phCategory || ''}",${p.phOk ? 1 : 0},${p.tdsOk ? 1 : 0},${p.turbOk ? 1 : 0},"${p.savedAtTime || ''}"`,
    );
    const csv = '\uFEFF' + [header, ...rows].join('\n');

    response.setHeader('Content-Type', 'text/csv; charset=utf-8');
    response.setHeader('Content-Disposition', `attachment; filename="aquasense-export${date ? '-' + date : ''}.csv"`);
    response.status(200).send(csv);
    return;
  }

  // JSON (default)
  response.setHeader('Content-Type', 'application/json; charset=utf-8');
  response.setHeader('Content-Disposition', `attachment; filename="aquasense-export${date ? '-' + date : ''}.json"`);
  response.status(200).json(dataPoints);
}