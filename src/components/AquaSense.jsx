import { useState, useEffect } from "react";
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";

import { T } from '../utils/theme';
import { useTelemetry } from '../hooks/useTelemetry';

// Impor komponen UI
import { ArcGauge, ScoreRing, WaterSample, ParamBar, FlowDiagram, ChartTip } from './ui/Widgets';

// Impor Style
import '../styles/AquaSense.css';

export default function AquaSense() {
  const { data, hist, log, connection, pollMs } = useTelemetry();
  const [now, setNow] = useState(() => new Date());
  const [uptime, setUptime] = useState(0);

  useEffect(() => {
    const id = setInterval(() => {
      setNow(new Date());
      setUptime(u => u + 1);
    }, 1000);
    return () => clearInterval(id);
  }, []);

  const hasData = data.timestamp > 0;
  const sc = !hasData ? T.dim : data.level === 2 ? T.ok : data.level === 1 ? T.warn : T.err;
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

  return (
    <>
      {/* Backgrounds */}
      <div className="aqua-bg aqua-bg-pattern" style={{ position: 'fixed', inset: 0, pointerEvents: 'none', zIndex: 0, backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='58' height='50'%3E%3Cpolygon points='29,2 56,17 56,34 29,49 2,34 2,17' fill='none' stroke='rgba(0,245,228,.04)' stroke-width='1'/%3E%3C/svg%3E")`, backgroundSize: '58px 50px' }} />
      <div className="aqua-bg aqua-bg-scan" style={{ position: 'fixed', inset: 0, pointerEvents: 'none', zIndex: 9999, background: 'repeating-linear-gradient(180deg,transparent,transparent 2px,rgba(0,0,0,.04) 2px,rgba(0,0,0,.04) 4px)' }} />

      <div className="aqua-shell" style={{ minHeight: '100vh', background: T.bg, fontFamily: "'Chakra Petch',sans-serif", color: T.txt, position: 'relative', zIndex: 1 }}>
        
        {/* ━━━ HEADER ━━━ */}
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
              <div className="aqua-badges" style={{ display: 'flex', gap: '7px' }}>
                {[['KIC 2026', true], ['PROTOTYPE', false]].map(([b, hi]) => (
                  <div key={b} style={{ padding: '4px 11px', borderRadius: '20px', fontSize: '9px', letterSpacing: '1.5px', background: hi ? 'rgba(0,245,228,.1)' : 'rgba(255,255,255,.04)', color: hi ? T.accent : 'rgba(200,232,245,.38)', border: `1px solid ${hi ? 'rgba(0,245,228,.3)' : 'rgba(255,255,255,.08)'}` }}>{b}</div>
                ))}
              </div>
            </div>
          </div>
        </header>

        <main className="aqua-main" style={{ maxWidth: '1440px', margin: '0 auto', padding: '20px 22px' }}>
          
          {/* ── STATUS HERO ── */}
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
            <div className="aqua-hero-metrics" style={{ display: 'flex', gap: '30px', alignItems: 'center' }}>
              {[{ l: 'pH', v: data.ph.toFixed(2), u: '', c: T.ph, ok: data.phOk }, { l: 'TDS', v: `${data.tds}`, u: 'ppm', c: T.tds, ok: data.tdsOk }, { l: 'NTU', v: data.ntu.toFixed(1), u: '', c: T.ntu, ok: data.turbOk }].map(s => (
                <div key={s.l} className="aqua-hero-metric" style={{ textAlign: 'center' }}>
                  <div style={{ fontSize: '8.5px', color: 'rgba(200,232,245,.25)', letterSpacing: '2.5px', marginBottom: '5px', fontFamily: "'IBM Plex Mono',monospace" }}>{s.l}</div>
                  <div style={{ fontSize: '28px', fontWeight: '700', color: s.c, lineHeight: '1', fontFamily: "'IBM Plex Mono',monospace", textShadow: `0 0 14px ${s.c}60`, transition: 'color .3s' }}>{s.v}</div>
                  {s.u && <div style={{ fontSize: '9px', color: 'rgba(200,232,245,.28)', marginTop: '2px', fontFamily: "'IBM Plex Mono',monospace" }}>{s.u}</div>}
                  <div style={{ fontSize: '8px', color: s.ok ? T.ok : T.warn, marginTop: '5px', letterSpacing: '1.5px' }}>{s.ok ? '● OK' : '● WARN'}</div>
                </div>
              ))}
            </div>
          </div>

          {/* ── GAUGE ROW ── */}
          <div className="aqua-grid aqua-grid-gauges" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1.15fr', gap: '16px', marginBottom: '20px' }}>
            {[
              { v: data.ph, min: 0, max: 14, c: T.ph, unit: 'pH', id: 'ph', dec: 2, lbl: 'pH SENSOR · PH-4502C', ok: data.phOk, st: data.phCategory ? data.phCategory.replaceAll('_', ' ') : 'NO DATA' },
              { v: data.tds, min: 0, max: 2000, c: T.tds, unit: 'ppm', id: 'tds', dec: 0, lbl: 'TDS METER V1.0 · ppm', ok: data.tdsOk, st: data.tds < 500 ? 'BAIK' : data.tds < 1000 ? 'SEDANG' : 'TINGGI' },
              { v: data.ntu, min: 0, max: 1000, c: T.ntu, unit: 'NTU', id: 'ntu', dec: 1, lbl: 'TURBIDITY · KEKERUHAN AIR', ok: data.turbOk, st: data.ntu < 5 ? 'JERNIH' : data.ntu < 100 ? 'AGAK KERUH' : 'KERUH' },
            ].map((g, i) => (
              <div key={i} className="card aqua-gauge-card" style={{ padding: '15px 10px', display: 'flex', flexDirection: 'column', alignItems: 'center', borderTop: `2px solid ${g.c}` }}>
                <div style={{ fontSize: '8px', letterSpacing: '1.5px', color: 'rgba(200,232,245,.25)', marginBottom: '5px', alignSelf: 'flex-start', fontFamily: "'IBM Plex Mono',monospace" }}>{g.lbl}</div>
                <ArcGauge value={g.v} min={g.min} max={g.max} color={g.c} unit={g.unit} id={g.id} decimals={g.dec} />
                <div style={{ marginTop: '7px', padding: '4px 14px', borderRadius: '20px', fontSize: '9.5px', letterSpacing: '1.5px', background: `${g.ok ? T.ok : T.warn}18`, color: g.ok ? T.ok : T.warn, border: `1px solid ${g.ok ? T.ok : T.warn}30` }}>
                  {g.ok ? '✓' : g.v <= (g.max * .6) ? '⚠' : '✗'} {g.st}
                </div>
              </div>
            ))}
            {/* Fuzzy Score Card */}
            <div className="card aqua-gauge-card aqua-score-card" style={{ padding: '15px 10px', display: 'flex', flexDirection: 'column', alignItems: 'center', borderTop: `2px solid ${sc}`, boxShadow: `0 0 45px ${sc}18`, transition: 'box-shadow .5s,border-color .5s' }}>
              <div style={{ fontSize: '8px', letterSpacing: '1.5px', color: 'rgba(200,232,245,.25)', marginBottom: '5px', alignSelf: 'flex-start', fontFamily: "'IBM Plex Mono',monospace" }}>FUZZY LOGIC AI · MAMDANI · 33 RULES</div>
              <ScoreRing score={data.score} level={data.level} />
              <div style={{ marginTop: '7px', padding: '5px 16px', borderRadius: '20px', fontSize: '10px', fontWeight: '600', letterSpacing: '1.5px', background: `${sc}18`, color: sc, border: `1px solid ${sc}30`, textShadow: `0 0 12px ${sc}60` }}>{data.ss}</div>
            </div>
          </div>

          {/* ── CHART + VISUALIZER ROW ── */}
          <div className="aqua-grid aqua-grid-analysis" style={{ display: 'grid', gridTemplateColumns: '3fr 1fr', gap: '16px', marginBottom: '20px' }}>
            <div className="card aqua-card aqua-chart-card" style={{ padding: '20px' }}>
              <div className="aqua-card-head" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '18px' }}>
                <div>
                  <div style={{ fontSize: '14px', fontWeight: '600', color: 'rgba(200,232,245,.75)' }}>Tren Sensor Real-Time</div>
                  <div style={{ fontSize: '9px', color: 'rgba(200,232,245,.25)', letterSpacing: '1px', marginTop: '3px', fontFamily: "'IBM Plex Mono',monospace" }}>Auto-update {pollMs / 1000}s · {hist.length} titik data</div>
                </div>
                <div className="aqua-chart-legend" style={{ display: 'flex', gap: '12px', flexWrap: 'wrap', justifyContent: 'flex-end' }}>
                  {[{ c: T.ph, l: 'pH' }, { c: T.tds, l: 'TDS' }, { c: T.ntu, l: 'NTU' }, { c: T.ai, l: 'Fuzzy Score' }].map(i => (
                    <div key={i.l} style={{ display: 'flex', alignItems: 'center', gap: '5px', fontSize: '9.5px', color: 'rgba(200,232,245,.32)', fontFamily: "'IBM Plex Mono',monospace" }}>
                      <span style={{ width: '16px', height: '2px', background: i.c, display: 'inline-block', borderRadius: '1px', boxShadow: `0 0 5px ${i.c}` }} /> {i.l}
                    </div>
                  ))}
                </div>
              </div>
              <ResponsiveContainer width="100%" height={232}>
                <AreaChart data={hist} margin={{ top: 5, right: 4, bottom: 0, left: -28 }}>
                  <defs>
                    {[{ id: 'aph', c: T.ph }, { id: 'atd', c: T.tds }, { id: 'ant', c: T.ntu }, { id: 'aai', c: T.ai }].map(g => (
                      <linearGradient key={g.id} id={g.id} x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor={g.c} stopOpacity=".2" />
                        <stop offset="95%" stopColor={g.c} stopOpacity="0" />
                      </linearGradient>
                    ))}
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,.04)" vertical={false} />
                  <XAxis dataKey="t" tick={{ fontSize: 9, fill: 'rgba(200,232,245,.2)', fontFamily: "'IBM Plex Mono'" }} tickLine={false} axisLine={false} interval={13} />
                  <YAxis yAxisId="ph" domain={[0, 14]} tick={{ fontSize: 9, fill: 'rgba(200,232,245,.2)', fontFamily: "'IBM Plex Mono'" }} tickLine={false} axisLine={false} width={28} />
                  <YAxis yAxisId="tds" domain={[0, 5000]} hide />
                  <YAxis yAxisId="ntu" domain={[0, 1000]} hide />
                  <YAxis yAxisId="score" domain={[0, 100]} hide />
                  <Tooltip content={<ChartTip />} />
                  <Area yAxisId="ph" type="monotone" dataKey="ph" stroke={T.ph} strokeWidth={2} fill="url(#aph)" dot={false} isAnimationActive={false} />
                  <Area yAxisId="tds" type="monotone" dataKey="tds" stroke={T.tds} strokeWidth={2} fill="url(#atd)" dot={false} isAnimationActive={false} />
                  <Area yAxisId="ntu" type="monotone" dataKey="ntu" stroke={T.ntu} strokeWidth={2} fill="url(#ant)" dot={false} isAnimationActive={false} />
                  <Area yAxisId="score" type="monotone" dataKey="score" stroke={T.ai} strokeWidth={2.5} fill="url(#aai)" dot={false} isAnimationActive={false} />
                </AreaChart>
              </ResponsiveContainer>
            </div>

            <div className="card aqua-card aqua-side-card" style={{ padding: '16px', display: 'flex', flexDirection: 'column' }}>
              <div style={{ fontSize: '12px', fontWeight: '600', color: 'rgba(200,232,245,.6)', marginBottom: '6px', letterSpacing: '.5px' }}>Visualisasi Sampel Air</div>
              <WaterSample ph={data.ph} ntu={data.ntu} />
              <div>
                <ParamBar label="pH" value={data.ph} unit="" color={T.ph} max={14} okMin={6.5} okMax={8.5} warnMax={9.5} />
                <ParamBar label="TDS" value={data.tds} unit="ppm" color={T.tds} max={2000} okMin={0} okMax={500} warnMax={1000} />
                <ParamBar label="NTU" value={data.ntu} unit="" color={T.ntu} max={1000} okMin={0} okMax={5} warnMax={100} />
              </div>
            </div>
          </div>

          {/* ── FLOW + LOG ROW ── */}
          <div className="aqua-grid aqua-grid-flowlog" style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: '16px', marginBottom: '20px' }}>
            <div className="card aqua-card aqua-flow-card" style={{ padding: '18px' }}>
              <div style={{ fontSize: '8.5px', color: 'rgba(200,232,245,.25)', letterSpacing: '2px', marginBottom: '14px', fontFamily: "'IBM Plex Mono',monospace" }}>ALUR BIO-FILTRASI SISTEM</div>
              <FlowDiagram />
              <div className="aqua-flow-specs" style={{ marginTop: '16px', paddingTop: '14px', borderTop: '1px solid rgba(255,255,255,.05)', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                {[
                  { l: 'Mikrokontroler', v: 'ESP32 V4', c: T.accent }, { l: 'Algoritma AI', v: 'Fuzzy Logic', c: T.ai }, { l: 'IoT Platform', v: 'ThingsBoard', c: T.tds },
                  { l: 'Sensor pH', v: 'PH-4502C', c: T.ph }, { l: 'Sensor TDS', v: 'TDS V1.0', c: T.tds }, { l: 'Sensor Turb.', v: 'Turbidity', c: T.ntu }
                ].map(m => (
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
                          <td data-label="TDS (ppm)" style={{ padding: '7px 10px', color: T.tds, fontWeight: '600' }}>{row.tds}</td>
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
        </main>
      </div>
    </>
  );
}
