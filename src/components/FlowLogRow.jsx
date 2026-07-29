import { T } from '../utils/theme';
import { FlowDiagram } from './ui/Widgets';

export default function FlowLogRow({ log, connection, pollMs }) {
  const connectionColor = connection.state === 'live'
    ? T.ok
    : connection.state === 'connecting'
      ? T.warn
      : T.err;

  const specs = [
    { l: 'Mikrokontroler', v: 'ESP32 V4', c: T.accent },
    { l: 'Algoritma AI', v: 'Fuzzy Logic', c: T.ai },
    { l: 'IoT Platform', v: 'ThingsBoard', c: T.tds },
    { l: 'Sensor pH', v: 'PH-4502C', c: T.ph },
    { l: 'Sensor TDS', v: 'TDS V1.0', c: T.tds },
    { l: 'Sensor Turb.', v: 'Turbidity', c: T.ntu },
  ];

  return (
    <div className="aqua-grid aqua-grid-flowlog" style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: '16px', marginBottom: '20px' }}>
      <div className="card aqua-card aqua-flow-card" style={{ padding: '18px' }}>
        <div style={{ fontSize: '8.5px', color: 'rgba(200,232,245,.25)', letterSpacing: '2px', marginBottom: '14px', fontFamily: "'IBM Plex Mono',monospace" }}>ALUR BIO-FILTRASI SISTEM</div>
        <FlowDiagram />
        <div className="aqua-flow-specs" style={{ marginTop: '16px', paddingTop: '14px', borderTop: '1px solid rgba(255,255,255,.05)', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
          {specs.map(m => (
            <div key={m.l} style={{ background: `${m.c}0a`, border: `1px solid ${m.c}1a`, borderRadius: '8px', padding: '7px 9px' }}>
              <div style={{ fontSize: '7.5px', color: 'rgba(200,232,245,.22)', letterSpacing: '1px', marginBottom: '2px', fontFamily: "'IBM Plex Mono',monospace" }}>{m.l}</div>
              <div style={{ fontSize: '11px', fontWeight: '600', color: m.c }}>{m.v}</div>
            </div>
          ))}
        </div>
      </div>

      <div className="card aqua-card aqua-log-card" style={{ padding: '18px' }}>
        <div className="aqua-card-head aqua-log-head" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '13px' }}>
          <div style={{ fontSize: '13px', fontWeight: '600', color: 'rgba(200,232,245,.7)' }}>Log Sensor Real-Time</div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '7px' }}>
            <div className={connection.state === 'live' ? 'pls' : ''} style={{ width: '6px', height: '6px', borderRadius: '50%', background: connectionColor, boxShadow: `0 0 8px ${connectionColor}` }} />
            <span style={{ fontSize: '8.5px', color: 'rgba(200,232,245,.28)', letterSpacing: '2px', fontFamily: "'IBM Plex Mono',monospace" }}>THINGSBOARD · {pollMs / 1000}s INTERVAL</span>
          </div>
        </div>
        <div className="aqua-log-table-wrap" style={{ overflowX: 'auto' }}>
          <table className="aqua-log-table" style={{ width: '100%', borderCollapse: 'collapse', fontSize: '11px', fontFamily: "'IBM Plex Mono',monospace" }}>
            <thead>
              <tr style={{ borderBottom: '1px solid rgba(255,255,255,.07)' }}>
                {['WAKTU', 'pH', 'TDS (ppm)', 'TURB (NTU)', 'FUZZY SCORE', 'STATUS'].map(h => (
                  <th key={h} style={{ padding: '6px 10px', textAlign: 'left', fontWeight: '400', fontSize: '8.5px', letterSpacing: '1.5px', color: 'rgba(200,232,245,.22)', fontFamily: "'Chakra Petch',sans-serif" }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {log.map((row, i) => {
                const rc = row.level === 2 ? T.ok : row.level === 1 ? T.warn : T.err;
                return (
                  <tr key={`r-${i}-${i === 0 ? row.ts : i}`} className={`trh aqua-log-row${i === 0 ? ' nw-anim' : ''}`} style={{ borderBottom: '1px solid rgba(255,255,255,.03)', opacity: .62 + Math.max(0, 7 - i) * .055 }}>
                    <td data-label="WAKTU" style={{ padding: '7px 10px', color: 'rgba(200,232,245,.32)' }}>{row.ts}</td>
                    <td data-label="pH" style={{ padding: '7px 10px', color: T.ph, fontWeight: '600' }}>{row.ph.toFixed(2)}</td>
                    <td data-label="TDS (ppm)" style={{ padding: '7px 10px', color: T.tds, fontWeight: '600' }}>{Number(row.tds).toFixed(1)}</td>
                    <td data-label="TURB (NTU)" style={{ padding: '7px 10px', color: T.ntu, fontWeight: '600' }}>{row.ntu.toFixed(1)}</td>
                    <td data-label="FUZZY SCORE" style={{ padding: '7px 10px', color: rc, fontWeight: '700' }}>{row.score.toFixed(1)}</td>
                    <td data-label="STATUS" style={{ padding: '7px 10px' }}>
                      <span style={{ padding: '3px 9px', borderRadius: '10px', fontSize: '9px', letterSpacing: '1px', background: `${rc}18`, color: rc, border: `1px solid ${rc}2e`, fontFamily: "'Chakra Petch',sans-serif" }}>{row.ss}</span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}