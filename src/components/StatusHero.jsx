import { T } from '../utils/theme';

export default function StatusHero({ data, connection, sc, hasData }) {
  const heroMetrics = [
    { l: 'pH', v: data.ph.toFixed(2), u: '', c: T.ph, ok: data.phOk },
    { l: 'TDS', v: data.tds.toFixed(1), u: 'ppm', c: T.tds, ok: data.tdsOk },
    { l: 'NTU', v: data.ntu.toFixed(1), u: '', c: T.ntu, ok: data.turbOk },
  ];

  return (
    <div className="aqua-hero" style={{ padding: '22px 28px', borderRadius: '14px', marginBottom: '20px', background: `linear-gradient(135deg,${sc}0e 0%,rgba(1,8,15,0) 65%)`, border: `1px solid ${sc}22`, boxShadow: `0 0 65px ${sc}0c`, display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '16px', transition: 'all .6s ease' }}>
      <div className="aqua-hero-copy">
        <div className="aqua-hero-kicker" style={{ fontSize: '8.5px', color: 'rgba(200,232,245,.25)', letterSpacing: '3px', marginBottom: '12px', fontFamily: "'IBM Plex Mono',monospace" }}>STATUS KUALITAS AIR · BIO-FILTRASI AAT · PT. KIDECO JAYA AGUNG</div>
        <div className="aqua-status-row" style={{ display: 'flex', alignItems: 'center', gap: '14px', marginBottom: '10px' }}>
          <div className={connection.state === 'live' ? 'pls' : ''} style={{ width: '11px', height: '11px', borderRadius: '50%', background: sc, boxShadow: `0 0 16px ${sc}`, flexShrink: 0 }} />
          <div className="aqua-status-title" style={{ fontSize: '32px', fontWeight: '700', color: sc, letterSpacing: '2.5px', textShadow: `0 0 28px ${sc}70`, transition: 'color .5s,text-shadow .5s' }}>{data.status}</div>
        </div>
        <div className="aqua-site-line" style={{ fontSize: '11px', color: 'rgba(200,232,245,.28)', letterSpacing: '1px', fontFamily: "'IBM Plex Mono',monospace" }}>📍 Bio-Filter Tank Unit #1 &nbsp;·&nbsp; ESP32 V4 + 3 Sensor + Fuzzy Logic AI (33 Rules)</div>
        <div className="aqua-message-line" style={{ fontSize: '10px', color: sc, marginTop: '7px', fontFamily: "'IBM Plex Mono',monospace" }}>{hasData ? data.recommendation : connection.message}</div>
      </div>
      <div className="aqua-hero-metrics" style={{ display: 'grid', gridTemplateColumns: 'repeat(3, minmax(0, 1fr))', gap: '16px', alignItems: 'center' }}>
        {heroMetrics.map(s => (
          <div key={s.l} className="aqua-hero-metric" style={{ textAlign: 'center' }}>
            <div style={{ fontSize: '8.5px', color: 'rgba(200,232,245,.25)', letterSpacing: '2.5px', marginBottom: '5px', fontFamily: "'IBM Plex Mono',monospace" }}>{s.l}</div>
            <div style={{ fontSize: '28px', fontWeight: '700', color: s.c, lineHeight: '1', fontFamily: "'IBM Plex Mono',monospace", fontVariantNumeric: 'tabular-nums', whiteSpace: 'nowrap', textShadow: `0 0 14px ${s.c}60`, transition: 'color .3s' }}>{s.v}</div>
            {s.u && <div style={{ fontSize: '9px', color: 'rgba(200,232,245,.28)', marginTop: '2px', fontFamily: "'IBM Plex Mono',monospace" }}>{s.u}</div>}
            <div style={{ fontSize: '8px', color: s.ok ? T.ok : T.warn, marginTop: '5px', letterSpacing: '1.5px' }}>{s.ok ? '● OK' : '● WARN'}</div>
          </div>
        ))}
      </div>
    </div>
  );
}