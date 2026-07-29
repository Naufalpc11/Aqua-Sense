import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { T } from '../utils/theme';
import { WaterSample, ParamBar, ChartTip } from './ui/Widgets';

export default function ChartRow({ data, hist, pollMs }) {
  return (
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
          <ParamBar label="TDS" value={data.tds} unit="ppm" color={T.tds} max={2000} okMin={0} okMax={500} warnMax={1000} decimals={1} />
          <ParamBar label="NTU" value={data.ntu} unit="" color={T.ntu} max={1000} okMin={0} okMax={5} warnMax={100} />
        </div>
      </div>
    </div>
  );
}