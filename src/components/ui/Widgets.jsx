import { T } from '../../utils/theme';

export function ArcGauge({value,min,max,color,unit,id,decimals=1,size=170}){
  const R=size*.385, cx=size/2, cy=size/2;
  const C=2*Math.PI*R, arc=C*.75, val=arc*Math.max(0,Math.min(1,(value-min)/(max-min)));
  const frac=Math.max(0,Math.min(1,(value-min)/(max-min)));
  const ta=(135+frac*270)*Math.PI/180;
  const tx=cx+R*Math.cos(ta), ty=cy+R*Math.sin(ta);
  const d_id=id.replace(/[^a-z0-9]/gi,'');
  return (
    <svg viewBox={`0 0 ${size} ${size}`} style={{width:'100%',maxWidth:`${size}px`,overflow:'visible'}}>
      <defs>
        <filter id={`gf${d_id}`} x="-50%" y="-50%" width="200%" height="200%">
          <feGaussianBlur stdDeviation="5" result="b1"/>
          <feGaussianBlur stdDeviation="2.5" result="b2"/>
          <feMerge><feMergeNode in="b1"/><feMergeNode in="b2"/><feMergeNode in="SourceGraphic"/></feMerge>
        </filter>
        <filter id={`tf${d_id}`} x="-150%" y="-150%" width="400%" height="400%">
          <feGaussianBlur stdDeviation="6" result="b"/>
          <feMerge><feMergeNode in="b"/><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge>
        </filter>
      </defs>
      <circle cx={cx} cy={cy} r={R+14} fill="none" stroke="rgba(255,255,255,0.025)" strokeWidth="1"/>
      <circle cx={cx} cy={cy} r={R+7}  fill="none" stroke="rgba(255,255,255,0.045)" strokeWidth=".5"/>
      <circle cx={cx} cy={cy} r={R} fill="none" stroke="rgba(255,255,255,0.055)" strokeWidth="10" strokeLinecap="round" strokeDasharray={`${arc} ${C-arc}`} transform={`rotate(135,${cx},${cy})`}/>
      <circle cx={cx} cy={cy} r={R} fill="none" stroke={color} strokeWidth="10" strokeLinecap="round" strokeDasharray={`${val} ${C-val}`} transform={`rotate(135,${cx},${cy})`} filter={`url(#gf${d_id})`} style={{transition:'stroke-dasharray .6s ease-out'}}/>
      {frac>.03&&<circle cx={tx} cy={ty} r="5.5" fill={color} filter={`url(#tf${d_id})`} style={{transition:'cx .6s ease-out,cy .6s ease-out'}}/>}
      {[0,.25,.5,.75,1].map((f,i)=>{
        const a=(135+f*270)*Math.PI/180;
        return <line key={i} x1={cx+(R-15)*Math.cos(a)} y1={cy+(R-15)*Math.sin(a)} x2={cx+(R-8)*Math.cos(a)}  y2={cy+(R-8)*Math.sin(a)} stroke="rgba(255,255,255,0.13)" strokeWidth="1.5" strokeLinecap="round"/>;
      })}
      <text x={cx} y={cy-7} textAnchor="middle" fontSize={size*.14} fontWeight="700" fill={color} fontFamily="'IBM Plex Mono',monospace" style={{filter:`drop-shadow(0 0 8px ${color}80)`,transition:'fill .4s'}}>{value.toFixed(decimals)}</text>
      <text x={cx} y={cy+size*.1} textAnchor="middle" fontSize={size*.065} fill="rgba(200,232,245,0.3)" fontFamily="'Chakra Petch',sans-serif" letterSpacing="1">{unit}</text>
      <text x={cx-R*.7} y={cy+R*.88} textAnchor="middle" fontSize="8" fill="rgba(255,255,255,0.18)" fontFamily="'IBM Plex Mono',monospace">{min}</text>
      <text x={cx+R*.7} y={cy+R*.88} textAnchor="middle" fontSize="8" fill="rgba(255,255,255,0.18)" fontFamily="'IBM Plex Mono',monospace">{max}</text>
    </svg>
  );
}

export function ScoreRing({score,level}){
  const R=84,cx=105,cy=105;
  const C=2*Math.PI*R, arc=C*.75, val=arc*(score/100);
  const color=level===2?T.ok:level===1?T.warn:level===0?T.err:T.dim;
  const frac=score/100, ta=(135+frac*270)*Math.PI/180;
  const tx=cx+R*Math.cos(ta), ty=cy+R*Math.sin(ta);
  return (
    <svg viewBox="0 0 210 210" style={{width:'100%',maxWidth:'210px',overflow:'visible'}}>
      <defs>
        <filter id="sglow" x="-60%" y="-60%" width="220%" height="220%">
          <feGaussianBlur stdDeviation="9" result="b"/>
          <feMerge><feMergeNode in="b"/><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge>
        </filter>
        <filter id="stipglow" x="-250%" y="-250%" width="600%" height="600%">
          <feGaussianBlur stdDeviation="10" result="b"/>
          <feMerge><feMergeNode in="b"/><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge>
        </filter>
        <radialGradient id="cg" cx="50%" cy="50%" r="50%"><stop offset="0%" stopColor={color} stopOpacity=".14"/><stop offset="100%" stopColor={color} stopOpacity="0"/></radialGradient>
      </defs>
      <circle cx={cx} cy={cy} r={78} fill="url(#cg)"/>
      <circle cx={cx} cy={cy} r={R+16} fill="none" stroke="rgba(255,255,255,0.025)" strokeWidth="1"/>
      <circle cx={cx} cy={cy} r={R+8}  fill="none" stroke="rgba(255,255,255,0.045)" strokeWidth=".5"/>
      <circle cx={cx} cy={cy} r={R} fill="none" stroke="rgba(255,255,255,0.05)" strokeWidth="14" strokeLinecap="round" strokeDasharray={`${arc} ${C-arc}`} transform={`rotate(135,${cx},${cy})`}/>
      <circle cx={cx} cy={cy} r={R} fill="none" stroke={color} strokeWidth="14" strokeLinecap="round" strokeDasharray={`${val} ${C-val}`} transform={`rotate(135,${cx},${cy})`} filter="url(#sglow)" style={{transition:'stroke-dasharray .8s ease-out'}}/>
      {frac>.02&&<circle cx={tx} cy={ty} r="7" fill={color} filter="url(#stipglow)" style={{transition:'cx .8s ease-out,cy .8s ease-out'}}/>}
      <text x={cx} y={cy-13} textAnchor="middle" fontSize="50" fontWeight="700" fill={color} fontFamily="'Chakra Petch',sans-serif" style={{filter:`drop-shadow(0 0 14px ${color}90)`,transition:'fill .5s'}}>{score.toFixed(0)}</text>
      <text x={cx} y={cy+24} textAnchor="middle" fontSize="13" fill="rgba(200,232,245,0.28)" fontFamily="'IBM Plex Mono',monospace">/ 100</text>
      <text x={cx} y={cy+46} textAnchor="middle" fontSize="8.5" fill="rgba(200,232,245,0.18)" letterSpacing="4" fontFamily="'Chakra Petch',sans-serif">FUZZY SCORE</text>
    </svg>
  );
}

export function WaterSample({ph,ntu}){
  const good=ph>=6.5&&ph<=8.5&&ntu<5, ok=ph>=5.5&&ntu<25;
  const [r,g,b]=good?[8,135,195]:ok?[55,105,145]:[125,72,28];
  const cl=good?.9:ok?.8:.93, pN=good?2:ok?7:16, pR=good?1.2:ok?2:2.8;
  const wc=`rgba(${r},${g},${b},${cl})`, wh=`rgba(${Math.min(255,r+55)},${Math.min(255,g+50)},${Math.min(255,b+40)},.65)`;
  return (
    <div style={{display:'flex',justifyContent:'center',padding:'6px 0'}}>
      <svg viewBox="0 0 120 180" style={{width:'100%',maxWidth:'112px'}}>
        <defs>
          <linearGradient id="wvg" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor={wh}/><stop offset="100%" stopColor={wc}/></linearGradient>
          <clipPath id="wcp"><rect x="16" y="26" width="88" height="145" rx="7"/></clipPath>
        </defs>
        <rect x="12" y="22" width="96" height="153" rx="9" fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth="1"/>
        <rect x="16" y="26" width="88" height="145" rx="7" fill="rgba(255,255,255,0.02)" stroke="rgba(255,255,255,0.1)" strokeWidth="1.5"/>
        <rect x="16" y="64" width="88" height="107" fill="url(#wvg)" clipPath="url(#wcp)"/>
        <path d="M16 67 Q36 60 60 67 Q84 74 104 67 L104 72 Q84 79 60 72 Q36 65 16 72 Z" fill={wh} clipPath="url(#wcp)" opacity=".7"/>
        <rect x="23" y="68" width="4" height="70" rx="2" fill="rgba(255,255,255,0.07)" clipPath="url(#wcp)"/>
        {[20,45,70].map((p,i)=>(<line key={i} x1="10" y1={64+p} x2="15" y2={64+p} stroke="rgba(255,255,255,0.1)" strokeWidth="1"/>))}
        {Array.from({length:pN},(_,i)=>(<circle key={i} cx={20+((i*11+7)%76)} cy={72+((i*17+5)%83)} r={pR} fill={`rgba(255,255,255,${good?'.15':'.28'})`}/>))}
        <text x="60" y="14" textAnchor="middle" fontSize="7.5" fill="rgba(200,232,245,0.28)" fontFamily="'Chakra Petch',sans-serif" letterSpacing="1">POST-BIOFILTER</text>
        <text x="60" y="105" textAnchor="middle" fontSize="11" fontWeight="600" fill="rgba(255,255,255,0.85)" fontFamily="'Chakra Petch',sans-serif">{good?'JERNIH ✓':ok?'SEDANG ⚡':'KERUH ✗'}</text>
        <text x="60" y="122" textAnchor="middle" fontSize="9" fill="rgba(255,255,255,0.45)" fontFamily="'IBM Plex Mono',monospace">pH {ph.toFixed(1)} · {ntu.toFixed(1)} NTU</text>
      </svg>
    </div>
  );
}

export function ParamBar({label,value,unit,color,max,okMin,okMax,warnMax}){
  const ok=value>=(okMin??0)&&value<=(okMax??Infinity);
  const warn=!ok&&value<=(warnMax??Infinity);
  const sc=ok?T.ok:warn?T.warn:T.err;
  return (
    <div style={{padding:'9px 0',borderBottom:'1px solid rgba(255,255,255,0.04)'}}>
      <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:'5px'}}>
        <div style={{display:'flex',alignItems:'center',gap:'7px'}}>
          <span style={{fontSize:'10.5px',color:T.dim,letterSpacing:'1px',fontFamily:"'Chakra Petch',sans-serif"}}>{label}</span>
          <span style={{fontSize:'8px',color:sc,letterSpacing:'1.5px',padding:'1px 6px', background:`${sc}18`,border:`1px solid ${sc}30`,borderRadius:'10px'}}>{ok?'OK':warn?'WARN':'HIGH'}</span>
        </div>
        <span style={{fontFamily:"'IBM Plex Mono',monospace",fontWeight:'700',fontSize:'13px', color,textShadow:`0 0 10px ${color}60`,transition:'color .3s'}}>{value} <span style={{fontSize:'9px',color:T.dim,fontWeight:'400'}}>{unit}</span></span>
      </div>
      <div style={{height:'4px',background:'rgba(255,255,255,0.05)',borderRadius:'2px',overflow:'hidden'}}>
        <div style={{height:'100%',width:`${Math.min(100,(value/max)*100)}%`,borderRadius:'2px', background:`linear-gradient(90deg,${color}70,${color})`, boxShadow:`0 0 8px ${color}80`,transition:'width .55s ease-out'}}/>
      </div>
    </div>
  );
}

export function FlowDiagram(){
  const steps=[
    {e:'⚗️',n:'Air Asam\nTambang', d:'pH 2–4\nInput Raw',c:T.err},
    {e:'🦠',n:'Bio-\nReaktor',   d:'Aerasi\nMikroba',  c:'#ff7722'},
    {e:'🔬',n:'Filtrasi\nMedia',  d:'Zeolit\nArang',    c:T.warn},
    {e:'💧',n:'Air\nOlahan',      d:'pH 6–8\nTDS↓',    c:T.tds},
    {e:'📡',n:'Monitor\nAIoT',   d:'ESP32\nFuzzy AI',  c:T.accent},
  ];
  return (
    <div style={{display:'flex',alignItems:'center',gap:'4px',overflowX:'auto',padding:'4px 0'}}>
      {steps.map((s,i)=>(
        <div key={i} style={{display:'flex',alignItems:'center',gap:'4px',flexShrink:0}}>
          <div style={{textAlign:'center',width:'64px'}}>
            <div style={{width:'44px',height:'44px',margin:'0 auto 5px',borderRadius:'10px', background:`${s.c}14`,border:`1px solid ${s.c}35`, display:'flex',alignItems:'center',justifyContent:'center',fontSize:'19px', boxShadow:`0 0 14px ${s.c}1a`}}>{s.e}</div>
            <div style={{fontSize:'8.5px',color:'rgba(200,232,245,0.65)',lineHeight:'1.4', whiteSpace:'pre-line',fontFamily:"'Chakra Petch',sans-serif"}}>{s.n}</div>
            <div style={{fontSize:'7.5px',color:s.c,marginTop:'2px',lineHeight:'1.3', whiteSpace:'pre-line',fontFamily:"'IBM Plex Mono',monospace"}}>{s.d}</div>
          </div>
          {i<steps.length-1&&(
            <div style={{flexShrink:0,width:'16px',display:'flex',flexDirection:'column', alignItems:'center',marginBottom:'20px'}}>
              <div style={{width:'100%',height:'1.5px',background:`linear-gradient(90deg,${steps[i].c}50,${steps[i+1].c}50)`,borderRadius:'1px'}}/>
              <div style={{width:0,height:0,borderTop:'4px solid transparent', borderBottom:'4px solid transparent',borderLeft:`6px solid ${steps[i+1].c}70`, marginLeft:'10px',marginTop:'-3px'}}/>
            </div>
          )}
        </div>
      ))}
    </div>
  );
}

export const ChartTip=({active,payload,label})=>{
  if(!active||!payload?.length) return null;
  const colors={ph:T.ph,tds:T.tds,ntu:T.ntu,score:T.ai};
  const labs={ph:'pH',tds:'TDS (ppm)',ntu:'NTU',score:'Fuzzy Score'};
  return (
    <div style={{background:'#041525',border:'1px solid rgba(0,245,228,0.2)',borderRadius:'8px', padding:'10px 14px',fontSize:'11px',boxShadow:'0 0 24px rgba(0,0,0,.6)'}}>
      <div style={{color:'rgba(200,232,245,.4)',marginBottom:'6px',fontFamily:"'IBM Plex Mono',monospace"}}>{label}</div>
      {payload.map(p=>(
        <div key={p.dataKey} style={{display:'flex',gap:'10px',marginBottom:'2px', color:colors[p.dataKey]||'#fff',fontFamily:"'IBM Plex Mono',monospace"}}>
          <span style={{opacity:.7,minWidth:'70px'}}>{labs[p.dataKey]||p.dataKey}</span>
          <span style={{fontWeight:'700'}}>{(+p.value).toFixed(2)}</span>
        </div>
      ))}
    </div>
  );
};
