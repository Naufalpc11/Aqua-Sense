import { useEffect, useRef, useState } from 'react';

const API_URL =
  import.meta.env.VITE_TELEMETRY_API_URL || '/api/telemetry/latest';
const HISTORY_API_URL =
  import.meta.env.VITE_TELEMETRY_HISTORY_API_URL ||
  '/api/telemetry/history?limit=55&hours=6';
const POLL_MS = 1000;
const HIDDEN_POLL_MS = 10000;
const REQUEST_TIMEOUT_MS = 8000;

const EMPTY_DATA = {
  timestamp: 0,
  ph: 0,
  tds: 0,
  ntu: 0,
  score: 0,
  level: -1,
  status: 'MENUNGGU DATA',
  ss: 'NO DATA',
  recommendation: 'Menunggu telemetry dari ESP32',
  phCategory: '',
  phOk: false,
  tdsOk: false,
  turbOk: false,
};

export function useTelemetry() {
  const lastTimestamp = useRef(0);
  const [data, setData] = useState(EMPTY_DATA);
  const [hist, setHist] = useState([]);
  const [log, setLog] = useState([]);
  const [connection, setConnection] = useState({
    state: 'connecting',
    message: 'Menghubungkan ke ThingsBoard',
  });

  useEffect(() => {
    const controller = new AbortController();
    let timeoutId;
    let pollInFlight = false;

    const fetchJson = async (url) => {
      const timeoutController = new AbortController();
      const timeout = setTimeout(
        () => timeoutController.abort(),
        REQUEST_TIMEOUT_MS,
      );
      const abortRequest = () => timeoutController.abort();
      controller.signal.addEventListener('abort', abortRequest, { once: true });

      try {
        const response = await fetch(url, {
          signal: timeoutController.signal,
          cache: 'no-store',
        });
        const payload = await response.json();
        if (!response.ok) {
          throw new Error(payload.message || `API error ${response.status}`);
        }
        return payload;
      } finally {
        clearTimeout(timeout);
        controller.signal.removeEventListener('abort', abortRequest);
      }
    };

    const toChartPoint = (item) => ({
      timestamp: item.timestamp,
      t: new Date(item.timestamp).toLocaleTimeString('id-ID', {
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
      }),
      ph: item.ph,
      tds: item.tds,
      ntu: item.ntu,
      score: item.score,
    });

    const loadHistory = async () => {
      try {
        const payload = await fetchJson(HISTORY_API_URL);

        const history = payload.history || [];
        if (!history.length) return;

        lastTimestamp.current = history.at(-1).timestamp;
        setHist(history.map(toChartPoint));
        setLog(
          history
            .slice(-8)
            .reverse()
            .map((item) => ({
              ...item,
              ts: new Date(item.timestamp).toLocaleTimeString('id-ID'),
            })),
        );
      } catch (error) {
        if (error.name !== 'AbortError') {
          console.warn('Riwayat ThingsBoard belum tersedia:', error.message);
        }
      }
    };

    const poll = async () => {
      if (pollInFlight || controller.signal.aborted) return;
      pollInFlight = true;

      try {
        const payload = await fetchJson(API_URL);

        const next = payload.telemetry;
        setData(next);
        setConnection({
          state: payload.deviceOnline ? 'live' : 'stale',
          message: payload.deviceOnline
            ? 'Telemetry ESP32 aktif'
            : `Data terakhir ${new Date(next.timestamp).toLocaleString('id-ID')}`,
        });

        if (next.timestamp > lastTimestamp.current) {
          lastTimestamp.current = next.timestamp;
          const time = new Date(next.timestamp);
          const ts = time.toLocaleTimeString('id-ID');

          setHist((items) =>
            [...items, toChartPoint(next)].slice(-55),
          );
          setLog((items) =>
            [
              {
                ts,
                ph: next.ph,
                tds: next.tds,
                ntu: next.ntu,
                score: next.score,
                level: next.level,
                ss: next.ss,
              },
              ...items,
            ].slice(0, 8),
          );
        }
      } catch (error) {
        if (controller.signal.aborted) return;
        setConnection({
          state: 'offline',
          message: error.name === 'AbortError'
            ? 'Request telemetry timeout'
            : error.message || 'Telemetry tidak tersedia',
        });
      } finally {
        pollInFlight = false;
        if (!controller.signal.aborted) {
          const delay = document.hidden ? HIDDEN_POLL_MS : POLL_MS;
          timeoutId = setTimeout(poll, delay);
        }
      }
    };

    const handleVisibilityChange = () => {
      if (document.hidden || controller.signal.aborted) return;
      clearTimeout(timeoutId);
      poll();
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    loadHistory().finally(poll);
    return () => {
      controller.abort();
      clearTimeout(timeoutId);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, []);

  return { data, hist, log, connection, pollMs: POLL_MS };
}
