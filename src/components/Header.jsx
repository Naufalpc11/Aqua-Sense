import { useState } from 'react';
import { T } from '../utils/theme';

export default function Header({ connection, now, uptime }) {
  const [exporting, setExporting] = useState(false);
  const [resetting, setResetting] = useState(false);

  const connectionColor = connection.state === 'live'
    ? T.ok
    : connection.state === 'connecting'
      ? T.warn
      : T.err;
  const connectionLabel = connection.state === 'live'
    ? 'LIVE'
    : connection.state === 'stale'
      ? 'STALE'
      : connection.state === 'connecting'
        ? 'CONNECTING'
        : 'OFFLINE';
  const upFmt = `${String(Math.floor(uptime / 3600)).padStart(2, '0')}:${String(Math.floor((uptime % 3600) / 60)).padStart(2, '0')}:${String(uptime % 60).padStart(2, '0')}`;

  const handleExport = async (format) => {
    setExporting(true);
    try {
      const res = await fetch(`/api/telemetry/export?format=${format}`, { cache: 'no-store' });
      if (!res.ok) throw new Error('Export gagal');
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `aquasense-${new Date().toISOString().slice(0, 10)}.${format}`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (err) {
      alert('Gagal mengexport data: ' + err.message);
    } finally {
      setExporting(false);
    }
  };

  const handleReset = async () => {
    const token = prompt('Masukkan token reset data:');
    if (!token) return;
    if (!confirm('Yakin mau hapus SEMUA data telemetry di Supabase? Data tidak bisa dikembalikan!')) return;
    setResetting(true);
    try {
      const res = await fetch(`/api/telemetry/reset?token=${encodeURIComponent(token)}`, { method: 'POST' });
      const result = await res.json();
      if (!res.ok) throw new Error(result.message || 'Reset gagal');
      alert('✅ ' + result.message);
      window.location.reload();
    } catch (err) {
      alert('❌ Gagal reset: ' + err.message);
    } finally {
      setResetting(false);
    }
  };

  return (
    <header className="aqua-header" style={{ position: 'sticky', top: 0, zIndex: 200, background: 'rgba(1,8,15,.97)', backdropFilter: 'blur(16px)', borderBottom: '1px solid rgba(0,245,228,.1)', boxShadow: '0 2px 28px rgba(0,0,0,.7)' }}>
      <div className="aqua-header-inner" style={{ maxWidth: '1440px', margin: '0 auto', padding: '0 22px', height: '62px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div className="aqua-brand" style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          <div className="flt aqua-brand-icon" style={{ width: '46px', height: '46px', borderRadius: '12px', flexShrink: 0, background: 'linear-gradient(135deg,rgba(0,245,228,.18),rgba(0,100,255,.13))', border: '1px solid rgba(0,245,228,.3)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '24px', boxShadow: '0 0 22px rgba(0,245,228,.18)' }}>💧</div>
          <div className="aqua-brand-text">
            <div className="aqua-brand-title" style={{ fontSize: '19px', fontWeight: '700', color: T.accent, letterSpacing: '2px', textShadow: `0 0 18px ${T.accent}55`, lineHeight: '1' }}>AQUA·SENSE</div>
            <div className="aqua-brand-subtitle" style={{ fontSize: '9px', color: 'rgba(200,232,245,.22)', letterSpacing: '2.5px', marginTop: '3px', fontFamily: "'IBM Plex Mono',monospace" }}>
              MONITOR AIR ASAM TAMBANG · AIoT + FUZZY LOGIC · KIC 2026
            </div>
          </div>
        </div>

        <div className="aqua-header-meta" style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
          <div className="aqua-connection-pill" style={{ display: 'flex', alignItems: 'center', gap: '7px' }}>
            <div className={connection.state === 'live' ? 'pls' : ''} style={{ width: '8px', height: '8px', borderRadius: '50%', background: connectionColor, boxShadow: `0 0 12px ${connectionColor}` }} />
            <span title={connection.message} style={{ fontSize: '10px', color: connectionColor, letterSpacing: '2px', fontFamily: "'IBM Plex Mono',monospace" }}>{connectionLabel}</span>
          </div>
          <div className="aqua-separator" style={{ height: '18px', width: '1px', background: 'rgba(255,255,255,.06)' }} />
          <div className="aqua-uptime" style={{ fontSize: '11px', color: 'rgba(200,232,245,.35)', fontFamily: "'IBM Plex Mono',monospace" }}>⏱ {upFmt}</div>
          <div className="aqua-separator" style={{ height: '18px', width: '1px', background: 'rgba(255,255,255,.06)' }} />
          <div className="aqua-clock" style={{ fontSize: '12px', color: 'rgba(200,232,245,.45)', fontFamily: "'IBM Plex Mono',monospace" }}>{now.toLocaleTimeString('id-ID')}</div>
          <div className="aqua-separator" style={{ height: '18px', width: '1px', background: 'rgba(255,255,255,.06)' }} />
          <div className="aqua-badges" style={{ display: 'flex', gap: '7px', alignItems: 'center' }}>
            {[['KIC 2026', true], ['PROTOTYPE', false]].map(([b, hi]) => (
              <div key={b} style={{ padding: '4px 11px', borderRadius: '20px', fontSize: '9px', letterSpacing: '1.5px', background: hi ? 'rgba(0,245,228,.1)' : 'rgba(255,255,255,.04)', color: hi ? T.accent : 'rgba(200,232,245,.38)', border: `1px solid ${hi ? 'rgba(0,245,228,.3)' : 'rgba(255,255,255,.08)'}` }}>{b}</div>
            ))}
            <div className="aqua-separator" style={{ height: '18px', width: '1px', background: 'rgba(255,255,255,.06)' }} />
            <button onClick={() => handleExport('csv')} disabled={exporting} title="Download data historis sebagai CSV (bisa dibuka Excel)" style={{ padding: '4px 12px', borderRadius: '20px', fontSize: '9px', letterSpacing: '1.5px', background: exporting ? 'rgba(0,245,228,.05)' : 'rgba(0,245,228,.1)', color: exporting ? 'rgba(200,232,245,.3)' : T.accent, border: `1px solid ${exporting ? 'rgba(0,245,228,.1)' : 'rgba(0,245,228,.3)'}`, cursor: exporting ? 'not-allowed' : 'pointer', fontFamily: "'Chakra Petch',sans-serif", transition: 'all .2s', display: 'flex', alignItems: 'center', gap: '5px' }}>
              {exporting ? '⏳' : '⬇'} EXPORT CSV
            </button>
            <button onClick={handleReset} disabled={resetting} title="Hapus semua data telemetry di Supabase" style={{ padding: '4px 12px', borderRadius: '20px', fontSize: '9px', letterSpacing: '1.5px', background: resetting ? 'rgba(255,80,80,.05)' : 'rgba(255,80,80,.1)', color: resetting ? 'rgba(200,232,245,.3)' : '#ff5050', border: `1px solid ${resetting ? 'rgba(255,80,80,.1)' : 'rgba(255,80,80,.3)'}`, cursor: resetting ? 'not-allowed' : 'pointer', fontFamily: "'Chakra Petch',sans-serif", transition: 'all .2s', display: 'flex', alignItems: 'center', gap: '5px' }}>
              {resetting ? '⏳' : '🗑'} RESET
            </button>
          </div>
        </div>
      </div>
    </header>
  );
}