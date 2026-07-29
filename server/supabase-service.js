import { createClient } from '@supabase/supabase-js';

const TABLE_NAME = 'telemetry';

let supabase = null;

function getClient() {
  if (!supabase) {
    const url = process.env.SUPABASE_URL || '';
    const key = process.env.SUPABASE_KEY || '';
    if (!url || !key) {
      console.warn('⚠️  Supabase belum dikonfigurasi. Data hanya disimpan di file lokal.');
      return null;
    }
    supabase = createClient(url, key);
  }
  return supabase;
}

/**
 * Simpan satu titik telemetry ke Supabase.
 * Jika Supabase belum dikonfigurasi, skip (data tetap di file JSON lokal).
 */
export async function saveTelemetryToSupabase(point) {
  const client = getClient();
  if (!client) return;

  try {
    const { error } = await client.from(TABLE_NAME).insert({
      timestamp: point.timestamp,
      ph: point.ph,
      tds: point.tds,
      ntu: point.ntu,
      score: point.score,
      level: point.level,
      status: point.status,
      ss: point.ss,
      ph_category: point.phCategory,
      ph_ok: point.phOk,
      tds_ok: point.tdsOk,
      turb_ok: point.turbOk,
      created_at: new Date().toISOString(),
    });

    if (error) {
      console.error('❌ Gagal simpan ke Supabase:', error.message);
    }
  } catch (err) {
    console.error('❌ Error koneksi Supabase:', err.message);
  }
}

/**
 * Ambil data historis dari Supabase.
 * Bisa filter berdasarkan tanggal (format YYYY-MM-DD) dan batasan jumlah.
 */
export async function getHistoryFromSupabase({ date, limit = 50000 } = {}) {
  const client = getClient();
  if (!client) return [];

  try {
    let query = client
      .from(TABLE_NAME)
      .select('*')
      .order('timestamp', { ascending: true })
      .limit(limit);

    if (date) {
      // Filter berdasarkan tanggal (timestamp dalam milidetik)
      const startOfDay = new Date(date + 'T00:00:00+07:00').getTime();
      const endOfDay = new Date(date + 'T23:59:59+07:00').getTime();
      query = query.gte('timestamp', startOfDay).lte('timestamp', endOfDay);
    }

    const { data, error } = await query;

    if (error) {
      console.error('❌ Gagal baca dari Supabase:', error.message);
      return [];
    }

    // Format ulang ke struktur yang sama seperti JSON file
    return (data || []).map((row) => ({
      timestamp: row.timestamp,
      time: formatTimestamp(row.timestamp),
      ph: row.ph,
      tds: row.tds,
      ntu: row.ntu,
      score: row.score,
      level: row.level,
      status: row.status,
      ss: row.ss,
      phCategory: row.ph_category,
      phOk: row.ph_ok,
      tdsOk: row.tds_ok,
      turbOk: row.turb_ok,
      savedAt: row.created_at ? new Date(row.created_at).getTime() : 0,
      savedAtTime: row.created_at ? formatISO(row.created_at) : '',
    }));
  } catch (err) {
    console.error('❌ Error baca Supabase:', err.message);
    return [];
  }
}

function formatTimestamp(ts) {
  const d = new Date(ts);
  const y = d.getFullYear();
  const mo = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  const h = String(d.getHours()).padStart(2, '0');
  const mi = String(d.getMinutes()).padStart(2, '0');
  const s = String(d.getSeconds()).padStart(2, '0');
  return `${y}-${mo}-${day} ${h}:${mi}:${s}`;
}

function formatISO(iso) {
  if (!iso) return '';
  const d = new Date(iso);
  const y = d.getFullYear();
  const mo = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  const h = String(d.getHours()).padStart(2, '0');
  const mi = String(d.getMinutes()).padStart(2, '0');
  const s = String(d.getSeconds()).padStart(2, '0');
  return `${y}-${mo}-${day} ${h}:${mi}:${s}`;
}