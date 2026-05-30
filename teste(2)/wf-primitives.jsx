// Wireframe primitives — sketchy, low-fi shapes used across all variations.
// Pulled into a single file so the variation files stay focused on layout.

const wfPalette = {
  inkLight: '#1f1d1b',
  inkDark:  '#e9e5dd',
  paperLight: '#f6f1e7',
  paperDark:  '#1c1a17',
  paperLight2: '#efe8da',
  paperDark2:  '#252220',
  rule: 'rgba(0,0,0,0.18)',
  ruleDark: 'rgba(255,255,255,0.18)',
  accent: 'oklch(0.65 0.13 55)',     // warm ochre
  accent2: 'oklch(0.65 0.13 200)',   // muted teal — for "ritual" / extras
  highlight: 'rgba(255, 215, 130, 0.45)',
  highlightDark: 'rgba(255, 200, 120, 0.20)',
};

function useWfTheme(dark) {
  return React.useMemo(() => ({
    ink: dark ? wfPalette.inkDark : wfPalette.inkLight,
    paper: dark ? wfPalette.paperDark : wfPalette.paperLight,
    paper2: dark ? wfPalette.paperDark2 : wfPalette.paperLight2,
    rule: dark ? wfPalette.ruleDark : wfPalette.rule,
    sub: dark ? 'rgba(233,229,221,0.65)' : 'rgba(31,29,27,0.55)',
    sub2: dark ? 'rgba(233,229,221,0.4)' : 'rgba(31,29,27,0.35)',
    accent: wfPalette.accent,
    accent2: wfPalette.accent2,
    highlight: dark ? wfPalette.highlightDark : wfPalette.highlight,
    dark,
  }), [dark]);
}

// Tiny seeded RNG so wobble is stable across renders
function mulberry32(a){return function(){a|=0;a=a+0x6D2B79F5|0;let t=Math.imul(a^a>>>15,1|a);t=t+Math.imul(t^t>>>7,61|t)^t;return ((t^t>>>14)>>>0)/4294967296}}

// ── Sketchy box ─────────────────────────────────────────────────────────────
// Hand-drawn rectangle. Has a subtle wobble using SVG path so corners don't
// look mechanical. Fills with the paper color.
function WfBox({ width, height, fill, stroke, strokeWidth = 1.4, seed = 1, dashed = false, children, style }) {
  const w = width, h = height;
  const r = mulberry32(seed * 9301 + 1);
  const wob = () => (r() - 0.5) * 1.6;
  const path = `
    M ${1+wob()} ${1+wob()}
    L ${w-1+wob()} ${1+wob()}
    L ${w-1+wob()} ${h-1+wob()}
    L ${1+wob()} ${h-1+wob()}
    Z
  `;
  return (
    <div style={{ position: 'relative', width: w, height: h, ...style }}>
      <svg width={w} height={h} style={{ position: 'absolute', inset: 0, pointerEvents: 'none' }}>
        <path d={path} fill={fill || 'transparent'} stroke={stroke} strokeWidth={strokeWidth}
              strokeDasharray={dashed ? '4 3' : 'none'} strokeLinejoin="round" strokeLinecap="round" />
      </svg>
      {children && <div style={{ position: 'relative', width: '100%', height: '100%' }}>{children}</div>}
    </div>
  );
}

// Sketchy line — single squiggly horizontal/vertical/diagonal
function WfLine({ x1, y1, x2, y2, stroke, strokeWidth = 1.2, dashed = false, seed = 2 }) {
  const r = mulberry32(seed * 137 + 11);
  const dx = x2 - x1, dy = y2 - y1;
  const len = Math.sqrt(dx*dx + dy*dy);
  const segs = Math.max(2, Math.round(len / 22));
  const pts = [];
  for (let i=0; i<=segs; i++){
    const t = i/segs;
    const px = x1 + dx*t + (i!==0 && i!==segs ? (r()-0.5)*1.8 : 0);
    const py = y1 + dy*t + (i!==0 && i!==segs ? (r()-0.5)*1.8 : 0);
    pts.push([px, py]);
  }
  const d = pts.map((p,i)=> (i===0?`M ${p[0]} ${p[1]}`:`L ${p[0]} ${p[1]}`)).join(' ');
  return <path d={d} stroke={stroke} strokeWidth={strokeWidth} fill="none"
               strokeDasharray={dashed ? '4 3' : 'none'} strokeLinecap="round" strokeLinejoin="round" />;
}

// Squiggly text-line (used as placeholder copy lines)
function WfTextLine({ width, stroke, strokeWidth = 1.1, seed = 3, length = 1 }) {
  const w = Math.round(width * length);
  const r = mulberry32(seed * 17 + 5);
  const segs = Math.max(3, Math.floor(w / 16));
  const pts = [];
  for (let i=0; i<=segs; i++){
    const x = (i/segs) * w;
    const y = 5 + Math.sin(i * 1.7 + r()*2) * 0.7;
    pts.push([x, y]);
  }
  const d = pts.map((p,i)=> (i===0?`M ${p[0]} ${p[1]}`:`L ${p[0]} ${p[1]}`)).join(' ');
  return (
    <svg width={w} height={10} style={{ display: 'block' }}>
      <path d={d} stroke={stroke} strokeWidth={strokeWidth} fill="none" strokeLinecap="round" />
    </svg>
  );
}

function WfTextBlock({ lines = 3, width = 180, theme, lengths, seed = 7, gap = 7 }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap }}>
      {Array.from({ length: lines }).map((_, i) => (
        <WfTextLine key={i} width={width} stroke={theme.sub}
                    seed={seed + i} length={(lengths && lengths[i]) ?? (0.6 + ((i*37)%41)/100)} />
      ))}
    </div>
  );
}

// Sketchy pill (used for filter chips, level badges, meta pills)
function WfPill({ children, theme, color, filled, seed = 4, style, onClick }) {
  const c = color || theme.ink;
  return (
    <span onClick={onClick} style={{
      display: 'inline-flex', alignItems: 'center', gap: 4,
      padding: '2px 9px',
      border: `1.2px solid ${c}`,
      borderRadius: 999,
      fontFamily: "'Caveat', 'Patrick Hand', cursive",
      fontSize: 13,
      lineHeight: 1.2,
      color: filled ? theme.paper : c,
      background: filled ? c : 'transparent',
      whiteSpace: 'nowrap',
      ...style,
    }}>{children}</span>
  );
}

// Sketchy checkbox + bookmark icons
function WfCheck({ checked, theme, size = 14 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 14 14" style={{ display: 'inline-block', verticalAlign: 'middle' }}>
      <rect x="1" y="1" width="12" height="12" rx="2" fill="none" stroke={theme.ink} strokeWidth="1.2"/>
      {checked && <path d="M3 7.5 L6 10.2 L11 4" stroke={theme.accent} strokeWidth="1.8" fill="none" strokeLinecap="round" strokeLinejoin="round"/>}
    </svg>
  );
}

function WfBookmark({ on, theme, size = 14 }) {
  return (
    <svg width={size} height={size+3} viewBox="0 0 14 17">
      <path d="M2.5 1.5 L11.5 1.5 L11.5 15 L7 11.5 L2.5 15 Z"
            fill={on ? theme.accent : 'none'}
            stroke={on ? theme.accent : theme.ink}
            strokeWidth="1.3" strokeLinejoin="round"/>
    </svg>
  );
}

function WfStar({ on, theme, size = 13 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 14 14">
      <path d="M7 1.4 L8.7 5.2 L12.7 5.6 L9.7 8.2 L10.5 12 L7 10 L3.5 12 L4.3 8.2 L1.3 5.6 L5.3 5.2 Z"
            fill={on ? theme.accent : 'none'} stroke={on ? theme.accent : theme.ink} strokeWidth="1.1" strokeLinejoin="round"/>
    </svg>
  );
}

// "School" glyph — abstract shape, never hand-drawing the actual real schools.
// 8 schools cycle through 4 simple shapes (circle, square, triangle, diamond)
// with two stroke styles (solid/dashed). It's a wireframe — just a placeholder.
function WfSchoolMark({ idx = 0, theme, size = 18 }) {
  const shape = idx % 4;
  const dashed = idx >= 4;
  const s = size;
  const cx = s/2, cy = s/2;
  const stroke = theme.ink;
  const sw = 1.3;
  const dash = dashed ? '3 2' : 'none';
  return (
    <svg width={s} height={s} viewBox={`0 0 ${s} ${s}`}>
      {shape === 0 && <circle cx={cx} cy={cy} r={s/2 - 2} fill="none" stroke={stroke} strokeWidth={sw} strokeDasharray={dash}/>}
      {shape === 1 && <rect x="2" y="2" width={s-4} height={s-4} fill="none" stroke={stroke} strokeWidth={sw} strokeDasharray={dash}/>}
      {shape === 2 && <path d={`M ${cx} 2 L ${s-2} ${s-2} L 2 ${s-2} Z`} fill="none" stroke={stroke} strokeWidth={sw} strokeDasharray={dash} strokeLinejoin="round"/>}
      {shape === 3 && <path d={`M ${cx} 2 L ${s-2} ${cy} L ${cx} ${s-2} L 2 ${cy} Z`} fill="none" stroke={stroke} strokeWidth={sw} strokeDasharray={dash} strokeLinejoin="round"/>}
    </svg>
  );
}

// Annotation — yellow margin note with arrow pointing at something
function WfAnnotation({ x, y, w = 180, text, theme, arrowTo, side = 'right', visible }) {
  if (!visible) return null;
  const arrowFrom = side === 'right'
    ? [x, y + 14]
    : [x + w, y + 14];
  return (
    <>
      <div style={{
        position: 'absolute', left: x, top: y, width: w,
        background: theme.dark ? 'rgba(255, 220, 140, 0.12)' : 'rgba(255, 220, 140, 0.55)',
        border: `1px dashed ${theme.accent}`,
        color: theme.dark ? '#f0d8a0' : '#5a3f10',
        padding: '5px 8px',
        fontFamily: "'Caveat', 'Patrick Hand', cursive",
        fontSize: 13.5,
        lineHeight: 1.18,
        borderRadius: 4,
        zIndex: 5,
        pointerEvents: 'none',
      }}>{text}</div>
      {arrowTo && (
        <svg style={{ position: 'absolute', left: 0, top: 0, width: '100%', height: '100%', pointerEvents: 'none', zIndex: 5 }}>
          <WfLine x1={arrowFrom[0]} y1={arrowFrom[1]} x2={arrowTo[0]} y2={arrowTo[1]}
                  stroke={theme.accent} strokeWidth={1.1} dashed seed={x*y+1}/>
          <circle cx={arrowTo[0]} cy={arrowTo[1]} r="2.2" fill={theme.accent}/>
        </svg>
      )}
    </>
  );
}

// Hand-written heading
function WfHeading({ children, size = 22, theme, weight = 700, style }) {
  return (
    <span style={{
      fontFamily: "'Caveat', 'Patrick Hand', cursive",
      fontSize: size, fontWeight: weight, color: theme.ink, lineHeight: 1.05,
      letterSpacing: 0.2,
      ...style,
    }}>{children}</span>
  );
}

// Mono-ish label (used sparingly, e.g. for system/UI labels in wires)
function WfMono({ children, size = 10, theme, style }) {
  return (
    <span style={{
      fontFamily: "'JetBrains Mono', ui-monospace, monospace",
      fontSize: size, color: theme.sub, letterSpacing: 0.4,
      textTransform: 'uppercase',
      ...style,
    }}>{children}</span>
  );
}

// Underline scribble — for active links/tabs
function WfUnderline({ width, theme, seed = 9 }) {
  const r = mulberry32(seed * 53 + 17);
  const segs = 8;
  const pts = [];
  for (let i = 0; i <= segs; i++) {
    pts.push([(i/segs)*width, (r()-0.5)*1.2]);
  }
  const d = pts.map((p,i)=> i===0?`M ${p[0]} ${p[1]+4}`:`L ${p[0]} ${p[1]+4}`).join(' ');
  return (
    <svg width={width} height={8} style={{ display: 'block' }}>
      <path d={d} stroke={theme.accent} strokeWidth="2" fill="none" strokeLinecap="round"/>
    </svg>
  );
}

// Density helper — gives consistent spacing/size knob across variations
function densityScale(density) {
  return density === 'compact' ? 0.84 : density === 'spacious' ? 1.18 : 1;
}

Object.assign(window, {
  wfPalette, useWfTheme, WfBox, WfLine, WfTextLine, WfTextBlock,
  WfPill, WfCheck, WfBookmark, WfStar, WfSchoolMark, WfAnnotation,
  WfHeading, WfMono, WfUnderline, densityScale,
});
