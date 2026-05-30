// V8 — Spell detail panel: 2 variações
// A · Painel lateral refinado (igual V4-C, mas com conteúdo completo)
// B · Página dedicada (full-screen, mais espaço pra notas, relacionadas, etc)
//
// Defaults: setas ←→ navegam · ações: preparar, bookmark, +personagem, copiar link, imprimir
// Conteúdo completo: stats, descrição, em níveis superiores, fonte, classes, tags, relacionadas, notas

const V8_TAGS_BY_SCHOOL = [
  ['proteção', 'controle'],     // abjur
  ['cura', 'utilidade'],        // conj
  ['informação', 'utilidade'],  // div
  ['controle', 'social'],       // ench
  ['dano', 'área'],             // evoc
  ['utilidade', 'social'],      // ilus
  ['dano', 'controle'],         // necr
  ['movimento', 'utilidade'],   // trans
];

function v8RelatedSpells(spell, all, max = 4) {
  // Same school OR same level (excluding self)
  return all
    .filter(s => s !== spell && (s.school === spell.school || s.lvl === spell.lvl))
    .slice(0, max);
}

// Lorem-ipsum-ish flavor text per school (placeholder, not from any IP)
const V8_DESCRIPTIONS_PT = [
  'Você ergue uma barreira invisível ao seu redor. Pelo tempo da duração, ataques contra você sofrem desvantagem e você ganha resistência a um tipo de dano à sua escolha.',
  'Você canaliza energia restauradora a uma criatura ao alcance. Ela recupera pontos de vida iguais ao dado da magia + seu modificador de habilidade de conjuração.',
  'Você projeta sua percepção além dos sentidos comuns. Por um instante você vê auras, aliados invisíveis, e marcas de magia recentes em até 9 metros.',
  'Você sussurra palavras que ressoam na mente do alvo. Se ele falhar num teste de Sabedoria, fica enfeitiçado por você até o fim da duração.',
  'Você libera uma onda de energia destrutiva a partir de um ponto. Criaturas na área devem fazer um teste de Destreza ou sofrer 6d6 de dano.',
  'Você cobre uma área com uma ilusão sensorial. Aqueles que a observem precisam fazer um teste de Inteligência (Investigação) para perceber o engano.',
  'Você drena a vitalidade de um inimigo próximo. Ele sofre dano necrótico e você recupera pontos de vida iguais à metade do dano causado.',
  'Você altera momentaneamente as leis físicas em volta de você. Ganha velocidade adicional e pode passar por espaços apertados.',
];

function v8Description(s, lang) {
  // Per-spell descriptions take precedence (used by long-form spells); fall
  // back to the school-keyed placeholder for the rest.
  if (s && s.desc) {
    if (typeof s.desc === 'string') return s.desc;
    return s.desc[lang] || s.desc.pt || s.desc.en || '';
  }
  return V8_DESCRIPTIONS_PT[s.school] || V8_DESCRIPTIONS_PT[0];
}

function v8Upgrade(s, lang) {
  if (s && s.upgrade) {
    if (typeof s.upgrade === 'string') return s.upgrade;
    return s.upgrade[lang] || s.upgrade.pt || s.upgrade.en || '';
  }
  if (s.lvl === 0) return lang === 'ptbr'
    ? 'O dado da magia aumenta para 2d6 no nível 5, 3d6 no nível 11, e 4d6 no nível 17.'
    : "The spell's damage increases by 1d6 at levels 5, 11, and 17.";
  return lang === 'ptbr'
    ? `Quando conjurada usando um espaço de magia de nível ${s.lvl + 1} ou superior, o efeito aumenta em proporção ao nível do espaço.`
    : `When cast using a spell slot of level ${s.lvl + 1} or higher, the effect scales with the slot level.`;
}

// ─────────────────────────────────────────────────────────
// Detail content (shared) — used inside both variants
// ─────────────────────────────────────────────────────────
function V8DetailContent({ s, t, lang, layout = 'panel' }) {
  const wide = layout === 'page';
  return (
    <>
      {/* Stats grid */}
      <div style={{ display: 'grid', gridTemplateColumns: wide ? 'repeat(4, 1fr)' : '1fr 1fr', gap: 10, padding: '14px 20px', borderBottom: `1px dashed ${t.rule}` }}>
        <V8Stat t={t} label={lang === 'ptbr' ? 'execução' : 'cast'} value={s.time}/>
        <V8Stat t={t} label={lang === 'ptbr' ? 'alcance' : 'range'} value={s.range}/>
        <V8Stat t={t} label={lang === 'ptbr' ? 'duração' : 'duration'} value={s.dur}/>
        <V8Stat t={t} label={lang === 'ptbr' ? 'componentes' : 'components'} value={s.comp}/>
      </div>

      {/* Tags */}
      <div style={{ padding: '10px 20px', display: 'flex', gap: 6, flexWrap: 'wrap', borderBottom: `1px dashed ${t.rule}` }}>
        {s.conc && <span style={pillStyle(t, t.accent2)}>{lang === 'ptbr' ? 'concentração' : 'concentration'}</span>}
        {s.rit && <span style={pillStyle(t, t.accent2)}>{lang === 'ptbr' ? 'ritual' : 'ritual'}</span>}
        {(V8_TAGS_BY_SCHOOL[s.school] || []).map(tag => <span key={tag} style={pillStyle(t)}>{tag}</span>)}
        <div style={{ flex: 1 }}/>
        <span style={{ fontSize: 12, color: t.sub, fontFamily: "'JetBrains Mono', monospace" }}>{s.src} · {s.edition || '5e 2014'}</span>
      </div>

      {/* Description */}
      <div style={{ padding: '14px 20px', borderBottom: `1px dashed ${t.rule}` }}>
        <V8SectionHeader t={t}>{lang === 'ptbr' ? 'descrição' : 'description'}</V8SectionHeader>
        <p style={{ margin: '6px 0 0', fontSize: 16, lineHeight: 1.5, textWrap: 'pretty' }}>{v8Description(s, lang)}</p>
      </div>

      {/* Upgrade */}
      <div style={{ padding: '14px 20px', borderBottom: `1px dashed ${t.rule}` }}>
        <V8SectionHeader t={t}>{lang === 'ptbr' ? 'em níveis superiores' : 'at higher levels'}</V8SectionHeader>
        <p style={{ margin: '6px 0 0', fontSize: 15, lineHeight: 1.5, color: t.sub, textWrap: 'pretty' }}>{v8Upgrade(s, lang)}</p>
      </div>

      {/* Classes */}
      <div style={{ padding: '14px 20px', borderBottom: `1px dashed ${t.rule}` }}>
        <V8SectionHeader t={t}>{lang === 'ptbr' ? 'classes' : 'classes'}</V8SectionHeader>
        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginTop: 6 }}>
          {(s.classes || []).map(c => <span key={c} style={pillStyle(t)}>{c}</span>)}
        </div>
      </div>

      {/* Notes (page only) */}
      {wide && (
        <div style={{ padding: '14px 20px', borderBottom: `1px dashed ${t.rule}` }}>
          <V8SectionHeader t={t}>{lang === 'ptbr' ? 'minhas notas' : 'my notes'}</V8SectionHeader>
          <textarea
            placeholder={lang === 'ptbr' ? 'anotações pessoais sobre essa magia…' : 'personal notes about this spell…'}
            style={{
              width: '100%', minHeight: 60, marginTop: 6,
              padding: 10, border: `1.2px dashed ${t.rule}`, borderRadius: 4,
              background: 'transparent', color: t.ink,
              fontFamily: "'Caveat', 'Patrick Hand', cursive", fontSize: 16, resize: 'vertical',
            }}
          />
        </div>
      )}
    </>
  );
}

function V8Stat({ t, label, value }) {
  return (
    <div>
      <div style={{ fontSize: 11, color: t.sub, textTransform: 'uppercase', letterSpacing: 0.6, fontFamily: "'JetBrains Mono', monospace" }}>{label}</div>
      <div style={{ fontSize: 16, marginTop: 2 }}>{value}</div>
    </div>
  );
}

function V8SectionHeader({ t, children }) {
  return <div style={{ fontSize: 11, color: t.sub, textTransform: 'uppercase', letterSpacing: 0.6, fontFamily: "'JetBrains Mono', monospace" }}>{children}</div>;
}

function pillStyle(t, color) {
  return {
    display: 'inline-block', padding: '2px 8px',
    border: `1.2px solid ${color || t.rule}`, borderRadius: 12,
    background: color ? 'transparent' : t.paper2,
    color: color || t.ink, fontSize: 12, fontFamily: "'JetBrains Mono', monospace",
  };
}

// ─────────────────────────────────────────────────────────
// VARIATION A · PAINEL LATERAL
// ─────────────────────────────────────────────────────────
function V8DetailPanel({ lang = 'ptbr', dark = false, width = 1280, height = 720 }) {
  const t = useWfTheme(dark);
  const allSpells = React.useMemo(() => v7BuildSpells(), []);
  const [idx, setIdx] = React.useState(3);
  const s = allSpells[idx];

  React.useEffect(() => {
    const onKey = (e) => {
      if (e.key === 'ArrowRight') setIdx(i => (i + 1) % allSpells.length);
      if (e.key === 'ArrowLeft')  setIdx(i => (i - 1 + allSpells.length) % allSpells.length);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [allSpells.length]);

  return (
    <div style={{ position: 'relative', width, height, background: t.paper, color: t.ink, fontFamily: "'Caveat', 'Patrick Hand', cursive", overflow: 'hidden', display: 'flex' }}>
      {/* Grid (background context) */}
      <div style={{ flex: 1, padding: 20, overflow: 'hidden' }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: 10 }}>
          {allSpells.slice(0, 18).map((sp, i) => (
            <div key={i}
              onClick={() => setIdx(i)}
              style={{
                padding: 10, border: `${i === idx ? 2 : 1.3}px solid ${i === idx ? t.accent : t.rule}`,
                borderRadius: 4, background: i === idx ? t.highlight : t.paper2,
                cursor: 'pointer', height: 100, overflow: 'hidden',
              }}>
              <div style={{ fontSize: 15, fontWeight: 600 }}>{spellName(sp, lang)}</div>
              <div style={{ fontSize: 11, color: t.sub, fontFamily: "'JetBrains Mono', monospace", marginTop: 4 }}>
                {schoolKey(sp.school)} · {sp.lvl === 0 ? 'truque' : `nv ${sp.lvl}`}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Panel */}
      <div style={{ width: 440, borderLeft: `1.6px solid ${t.rule}`, background: t.paper2, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        {/* Sticky header */}
        <div style={{ padding: '14px 20px 12px', borderBottom: `1px dashed ${t.rule}`, position: 'sticky', top: 0, background: t.paper2, zIndex: 1 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
            <button style={iconBtn(t)} onClick={() => setIdx((idx - 1 + allSpells.length) % allSpells.length)}>←</button>
            <button style={iconBtn(t)} onClick={() => setIdx((idx + 1) % allSpells.length)}>→</button>
            <span style={{ fontSize: 11, color: t.sub, fontFamily: "'JetBrains Mono', monospace" }}>{idx + 1} / {allSpells.length}</span>
            <div style={{ flex: 1 }}/>
            <button style={iconBtn(t)} title="fechar">✕</button>
          </div>
          <div style={{ fontSize: 22, fontWeight: 700, lineHeight: 1.1 }}>{spellName(s, lang)}</div>
          <div style={{ fontSize: 13, color: t.sub, fontFamily: "'JetBrains Mono', monospace", marginTop: 4 }}>
            {schoolKey(s.school)} · {s.lvl === 0 ? (lang === 'ptbr' ? 'truque' : 'cantrip') : `${lang === 'ptbr' ? 'nível' : 'level'} ${s.lvl}`}
          </div>
        </div>

        {/* Body — scroll */}
        <div style={{ flex: 1, overflow: 'auto' }}>
          <V8DetailContent s={s} t={t} lang={lang} layout="panel"/>
          {/* Related */}
          <div style={{ padding: '14px 20px' }}>
            <V8SectionHeader t={t}>{lang === 'ptbr' ? 'relacionadas' : 'related'}</V8SectionHeader>
            <div style={{ marginTop: 8, display: 'flex', flexDirection: 'column', gap: 6 }}>
              {v8RelatedSpells(s, allSpells).map((r, i) => (
                <button key={i} onClick={() => setIdx(allSpells.indexOf(r))}
                  style={{ padding: '6px 10px', border: `1.2px solid ${t.rule}`, borderRadius: 3, background: 'transparent', textAlign: 'left', cursor: 'pointer', fontFamily: 'inherit', color: t.ink, fontSize: 14, display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span style={{ flex: 1 }}>{spellName(r, lang)}</span>
                  <span style={{ fontSize: 11, color: t.sub, fontFamily: "'JetBrains Mono', monospace" }}>{schoolKey(r.school)} · nv {r.lvl}</span>
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Sticky action bar */}
        <div style={{ borderTop: `1.4px solid ${t.rule}`, background: t.paper, padding: '10px 14px', display: 'flex', gap: 6, flexWrap: 'wrap' }}>
          <button style={primaryBtn(t)}>{lang === 'ptbr' ? '✓ preparar' : '✓ prepare'}</button>
          <button style={secondaryBtn(t)} title={lang === 'ptbr' ? 'marcar como conhecida' : 'bookmark'}>☆</button>
          <button style={secondaryBtn(t)}>{lang === 'ptbr' ? '+ personagem' : '+ character'}</button>
          <div style={{ flex: 1 }}/>
          <button style={ghostBtn(t)} title={lang === 'ptbr' ? 'copiar link' : 'copy link'}>⎘</button>
          <button style={ghostBtn(t)} title={lang === 'ptbr' ? 'imprimir' : 'print'}>⎙</button>
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────
// VARIATION B · PÁGINA DEDICADA
// ─────────────────────────────────────────────────────────
function V8DetailPage({ lang = 'ptbr', dark = false, width = 1280, height = 820 }) {
  const t = useWfTheme(dark);
  const allSpells = React.useMemo(() => v7BuildSpells(), []);
  const [idx, setIdx] = React.useState(3);
  const s = allSpells[idx];

  React.useEffect(() => {
    const onKey = (e) => {
      if (e.key === 'ArrowRight') setIdx(i => (i + 1) % allSpells.length);
      if (e.key === 'ArrowLeft')  setIdx(i => (i - 1 + allSpells.length) % allSpells.length);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [allSpells.length]);

  return (
    <div style={{ position: 'relative', width, height, background: t.paper, color: t.ink, fontFamily: "'Caveat', 'Patrick Hand', cursive", overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
      {/* Top nav */}
      <div style={{ padding: '12px 28px', borderBottom: `1.4px solid ${t.rule}`, display: 'flex', alignItems: 'center', gap: 12 }}>
        <button style={ghostBtn(t)}>← {lang === 'ptbr' ? 'voltar à lista' : 'back to list'}</button>
        <span style={{ fontSize: 12, color: t.sub, fontFamily: "'JetBrains Mono', monospace" }}>
          {lang === 'ptbr' ? 'magia' : 'spell'} {idx + 1} / {allSpells.length}
        </span>
        <div style={{ flex: 1 }}/>
        <button style={iconBtn(t)} onClick={() => setIdx((idx - 1 + allSpells.length) % allSpells.length)}>←</button>
        <button style={iconBtn(t)} onClick={() => setIdx((idx + 1) % allSpells.length)}>→</button>
        <span style={{ width: 1, height: 22, background: t.rule, margin: '0 4px' }}/>
        <button style={primaryBtn(t)}>{lang === 'ptbr' ? '✓ preparar' : '✓ prepare'}</button>
        <button style={secondaryBtn(t)} title={lang === 'ptbr' ? 'bookmark' : 'bookmark'}>☆</button>
        <button style={secondaryBtn(t)}>{lang === 'ptbr' ? '+ personagem' : '+ character'}</button>
        <button style={ghostBtn(t)} title={lang === 'ptbr' ? 'copiar link' : 'copy link'}>⎘</button>
        <button style={ghostBtn(t)} title={lang === 'ptbr' ? 'imprimir' : 'print'}>⎙</button>
      </div>

      {/* Body — 2 columns */}
      <div style={{ flex: 1, display: 'grid', gridTemplateColumns: '1fr 320px', overflow: 'hidden' }}>
        {/* Main column */}
        <div style={{ overflow: 'auto', padding: '20px 32px' }}>
          <div style={{ marginBottom: 20 }}>
            <div style={{ display: 'flex', gap: 6, alignItems: 'center', flexWrap: 'wrap' }}>
              <span style={pillStyle(t)}>{schoolKey(s.school)}</span>
              <span style={pillStyle(t, t.accent)}>{s.lvl === 0 ? (lang === 'ptbr' ? 'truque' : 'cantrip') : `${lang === 'ptbr' ? 'nível' : 'level'} ${s.lvl}`}</span>
              {(V8_TAGS_BY_SCHOOL[s.school] || []).map(tag => <span key={tag} style={pillStyle(t)}>{tag}</span>)}
            </div>
            <h1 style={{ fontSize: 38, fontWeight: 700, margin: '12px 0 0', lineHeight: 1.05, fontFamily: "'Caveat', 'Patrick Hand', cursive" }}>{spellName(s, lang)}</h1>
          </div>

          {/* Stats */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12, padding: 16, border: `1.3px solid ${t.rule}`, borderRadius: 4, background: t.paper2, marginBottom: 20 }}>
            <V8Stat t={t} label={lang === 'ptbr' ? 'execução' : 'cast'} value={s.time}/>
            <V8Stat t={t} label={lang === 'ptbr' ? 'alcance' : 'range'} value={s.range}/>
            <V8Stat t={t} label={lang === 'ptbr' ? 'duração' : 'duration'} value={s.dur}/>
            <V8Stat t={t} label={lang === 'ptbr' ? 'componentes' : 'components'} value={s.comp}/>
          </div>

          {/* Description */}
          <div style={{ marginBottom: 20 }}>
            <V8SectionHeader t={t}>{lang === 'ptbr' ? 'descrição' : 'description'}</V8SectionHeader>
            <p style={{ margin: '8px 0 0', fontSize: 18, lineHeight: 1.55, textWrap: 'pretty', maxWidth: 680 }}>{v8Description(s, lang)}</p>
          </div>

          <div style={{ marginBottom: 20 }}>
            <V8SectionHeader t={t}>{lang === 'ptbr' ? 'em níveis superiores' : 'at higher levels'}</V8SectionHeader>
            <p style={{ margin: '8px 0 0', fontSize: 16, lineHeight: 1.5, color: t.sub, textWrap: 'pretty', maxWidth: 680 }}>{v8Upgrade(s, lang)}</p>
          </div>

          <div style={{ marginBottom: 20 }}>
            <V8SectionHeader t={t}>{lang === 'ptbr' ? 'classes' : 'classes'}</V8SectionHeader>
            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginTop: 8 }}>
              {(s.classes || []).map(c => <span key={c} style={pillStyle(t)}>{c}</span>)}
            </div>
          </div>

          {/* Notes */}
          <div style={{ marginBottom: 20 }}>
            <V8SectionHeader t={t}>{lang === 'ptbr' ? 'minhas notas' : 'my notes'}</V8SectionHeader>
            <textarea
              placeholder={lang === 'ptbr' ? 'anotações pessoais sobre essa magia…' : 'personal notes…'}
              style={{
                width: '100%', maxWidth: 680, minHeight: 80, marginTop: 8,
                padding: 12, border: `1.2px dashed ${t.rule}`, borderRadius: 4,
                background: t.paper2, color: t.ink,
                fontFamily: "'Caveat', 'Patrick Hand', cursive", fontSize: 18, resize: 'vertical',
              }}
            />
          </div>
        </div>

        {/* Side rail */}
        <div style={{ borderLeft: `1px dashed ${t.rule}`, padding: '20px 18px', overflow: 'auto', background: t.paper2 }}>
          <V8SectionHeader t={t}>{lang === 'ptbr' ? 'fonte' : 'source'}</V8SectionHeader>
          <div style={{ marginTop: 6, fontSize: 14 }}>{s.src} · {s.edition || '5e 2014'}</div>
          <div style={{ fontSize: 12, color: t.sub, fontFamily: "'JetBrains Mono', monospace", marginTop: 2 }}>
            {lang === 'ptbr' ? 'pág.' : 'p.'} {120 + (idx * 7) % 200}
          </div>

          <div style={{ height: 1, background: t.rule, margin: '16px 0', borderTop: `1px dashed ${t.rule}` }}/>

          <V8SectionHeader t={t}>{lang === 'ptbr' ? 'relacionadas' : 'related'}</V8SectionHeader>
          <div style={{ marginTop: 8, display: 'flex', flexDirection: 'column', gap: 6 }}>
            {v8RelatedSpells(s, allSpells, 6).map((r, i) => (
              <button key={i} onClick={() => setIdx(allSpells.indexOf(r))}
                style={{ padding: '8px 10px', border: `1.2px solid ${t.rule}`, borderRadius: 3, background: t.paper, textAlign: 'left', cursor: 'pointer', fontFamily: 'inherit', color: t.ink }}>
                <div style={{ fontSize: 14, fontWeight: 600 }}>{spellName(r, lang)}</div>
                <div style={{ fontSize: 11, color: t.sub, fontFamily: "'JetBrains Mono', monospace", marginTop: 2 }}>
                  {schoolKey(r.school)} · {r.lvl === 0 ? (lang === 'ptbr' ? 'truque' : 'cantrip') : `nv ${r.lvl}`} · {r.src}
                </div>
              </button>
            ))}
          </div>

          <div style={{ height: 1, background: t.rule, margin: '16px 0', borderTop: `1px dashed ${t.rule}` }}/>

          <V8SectionHeader t={t}>{lang === 'ptbr' ? 'histórico' : 'history'}</V8SectionHeader>
          <div style={{ marginTop: 8, fontSize: 13, color: t.sub, lineHeight: 1.5 }}>
            {lang === 'ptbr' ? (
              <>
                <div>· {lang === 'ptbr' ? 'usada na sessão 7' : 'used session 7'}</div>
                <div>· {lang === 'ptbr' ? 'preparada por Tharion' : 'prepared by Tharion'}</div>
                <div>· {lang === 'ptbr' ? '3 vezes este mês' : '3× this month'}</div>
              </>
            ) : (
              <>
                <div>· used session 7</div>
                <div>· prepared by Tharion</div>
                <div>· 3× this month</div>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────
// Button styles
// ─────────────────────────────────────────────────────────
function primaryBtn(t) {
  return {
    padding: '6px 14px', border: `1.4px solid ${t.accent}`, borderRadius: 4,
    background: t.accent, color: '#fff', fontFamily: 'inherit', fontSize: 14,
    cursor: 'pointer', fontWeight: 600,
  };
}
function secondaryBtn(t) {
  return {
    padding: '6px 12px', border: `1.3px solid ${t.rule}`, borderRadius: 4,
    background: t.paper, color: t.ink, fontFamily: 'inherit', fontSize: 14, cursor: 'pointer',
  };
}
function ghostBtn(t) {
  return {
    padding: '6px 10px', border: 'none', background: 'transparent',
    color: t.sub, fontFamily: 'inherit', fontSize: 14, cursor: 'pointer',
  };
}
function iconBtn(t) {
  return {
    width: 28, height: 28, padding: 0,
    border: `1.2px solid ${t.rule}`, borderRadius: 4,
    background: t.paper, color: t.ink, cursor: 'pointer', fontSize: 14,
    display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
  };
}

Object.assign(window, {
  V8DetailPanel, V8DetailPage,
  V8DetailContent, V8SectionHeader, V8Stat,
  v8RelatedSpells, v8Description, v8Upgrade, V8_TAGS_BY_SCHOOL,
  v8PrimaryBtn: primaryBtn, v8SecondaryBtn: secondaryBtn, v8GhostBtn: ghostBtn, v8IconBtn: iconBtn,
  v8PillStyle: pillStyle,
});
