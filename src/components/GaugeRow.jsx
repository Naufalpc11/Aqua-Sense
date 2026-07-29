import { T } from '../utils/theme';
import { ArcGauge, ScoreRing } from './ui/Widgets';

export default function GaugeRow({ data, sc }) {
  const gauges = [
    { v: data.ph, min: 0, max: 14, c: T.ph, unit: 'pH', id: 'ph', dec: 2, lbl: 'pH SENSOR · PH-4502C', ok: data.phOk, st: data.phCategory ? data.phCategory.replaceAll('_', ' ') : 'NO DATA' },
    { v: data.tds, min: 0, max: 2000, c: T.tds, unit: 'ppm', id: 'tds', dec: 0, lbl: 'TDS METER V1.0 · ppm', ok: data.tdsOk, st: data.tds < 500 ? 'BAIK' : data.tds < 1000 ? 'SEDANG' : 'TINGGI' },
    { v: data.ntu, min: 0, max: 1000, c: T.ntu, unit: 'NTU', id: 'ntu', dec: 1, lbl: 'TURBIDITY · KEKERUHAN AIR', ok: data.turbOk, st: data.ntu < 5 ? 'JERNIH' : data.ntu < 100 ? 'AGAK KERUH' : 'KERUH' },
  ];

  return (
    <div className="aqua-grid aqua-grid-gauges" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1.15fr', gap: '16px', marginBottom: '20px' }}>
      {gauges.map((g, i) => (
        <div key={i} className="card aqua-gauge-card" style={{ padding: '15px 10px', display: 'flex', flexDirection: 'column', alignItems: 'center', borderTop: `2px solid ${g.c}` }}>
          <div style={{ fontSize: '8px', letterSpacing: '1.5px', color: 'rgba(200,232,245,.25)', marginBottom: '5px', alignSelf: 'flex-start', fontFamily: "'IBM Plex Mono',monospace" }}>{g.lbl}</div>
          <ArcGauge value={g.v} min={g.min} max={g.max} color={g.c} unit={g.unit} id={g.id} decimals={g.dec} />
          <div style={{ marginTop: '7px', padding: '4px 14px', borderRadius: '20px', fontSize: '9.5px', letterSpacing: '1.5px', background: `${g.ok ? T.ok : T.warn}18`, color: g.ok ? T.ok : T.warn, border: `1px solid ${g.ok ? T.ok : T.warn}30` }}>
            {g.ok ? '✓' : g.v <= (g.max * .6) ? '⚠' : '✗'} {g.st}
          </div>
        </div>
      ))}
      <div className="card aqua-gauge-card aqua-score-card" style={{ padding: '15px 10px', display: 'flex', flexDirection: 'column', alignItems: 'center', borderTop: `2px solid ${sc}`, boxShadow: `0 0 45px ${sc}18`, transition: 'box-shadow .5s,border-color .5s' }}>
        <div style={{ fontSize: '8px', letterSpacing: '1.5px', color: 'rgba(200,232,245,.25)', marginBottom: '5px', alignSelf: 'flex-start', fontFamily: "'IBM Plex Mono',monospace" }}>FUZZY LOGIC AI · MAMDANI · 33 RULES</div>
        <ScoreRing score={data.score} level={data.level} />
        <div style={{ marginTop: '7px', padding: '5px 16px', borderRadius: '20px', fontSize: '10px', fontWeight: '600', letterSpacing: '1.5px', background: `${sc}18`, color: sc, border: `1px solid ${sc}30`, textShadow: `0 0 12px ${sc}60` }}>{data.ss}</div>
      </div>
    </div>
  );
}