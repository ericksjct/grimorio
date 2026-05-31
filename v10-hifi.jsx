// V10 — hi-fi spellbook (desktop + mobile)
// Paleta Catppuccin (Latte light / Mocha Mocha dark)
// Tipografia: Texturina (display, nomes) + Marauder Text (body) + JetBrains Mono (labels)
// Cor de destaque = customização por personagem (paleta de 12 swatches, v11)
// Criação / edição de personagem em v11-character-editor.jsx
// Cards têm barra colorida à esquerda indicando nível (level-0 a level-9)
// Sem ícones — só tipografia + microelementos de cor

function hifiSpellKey(s) { return `${s.school}-${s.lvl}-${s.en}`; }

const hifiFooterLink = {
  color: 'var(--subtext1)',
  textDecoration: 'underline',
  textUnderlineOffset: 2,
  textDecorationColor: 'var(--surface2)',
};

// Iconografia de nível (truque → mestre).
const TIER_SYMBOLS = ['○','◆','◆◆','◆◆◆','◆◆◆◆','★','★★','★★★','✶','✶✶'];
function tierSymbol(lvl) { return TIER_SYMBOLS[lvl] || TIER_SYMBOLS[0]; }

// Helper: derive {accent, accent_dark} from a stored character {accentId}.
function hifiAccentsFor(c, theme = 'catppuccin') {
  if (!c) {
    const p = (window.paletteFor || (() => ({ light: '#8839ef', dark: '#cba6f7' })))(null, theme);
    return { accent: p.light, accent_dark: p.dark };
  }
  const p = (window.paletteFor || (() => ({ light: '#8839ef', dark: '#cba6f7' })))(c.accentId, theme);
  return { ...c, accent: p.light, accent_dark: p.dark };
}

// ──────────────────────────────────────────────────────────────────
// Toast + spell actions (print / copy link / share)
// ──────────────────────────────────────────────────────────────────
function useHifiToast() {
  const [toast, setToast] = React.useState(null);
  React.useEffect(() => {
    if (!toast) return;
    const id = setTimeout(() => setToast(t => (t?.id === toast.id ? null : t)), 2400);
    return () => clearTimeout(id);
  }, [toast]);
  const show = React.useCallback((msg, kind = 'ok') => setToast({ msg, kind, id: Date.now() + Math.random() }), []);
  React.useEffect(() => {
    function onGlobal(e) { show(e.detail?.msg || '', e.detail?.kind); }
    window.addEventListener('hifi-toast', onGlobal);
    return () => window.removeEventListener('hifi-toast', onGlobal);
  }, [show]);
  return { toast, show };
}

function HifiToast({ toast, accent }) {
  if (!toast) return null;
  return (
    <div style={{
      position: 'absolute',
      left: '50%', bottom: 22, transform: 'translateX(-50%)',
      padding: '8px 14px',
      background: 'var(--mantle)',
      color: 'var(--text)',
      border: `1px solid ${toast.kind === 'err' ? 'var(--red)' : (accent || 'var(--accent)')}`,
      borderRadius: 4,
      fontSize: 13,
      fontFamily: "'Marauder Text', Georgia, serif",
      boxShadow: '0 8px 24px rgba(0,0,0,0.25)',
      zIndex: 40,
      pointerEvents: 'none',
      animation: 'hifi-toast-in 200ms ease-out',
    }}>{toast.msg}</div>
  );
}

function buildSpellLink(s, lang) {
  const name = (window.spellName ? window.spellName(s, 'en') : s?.en) || s?.en || 'magia';
  const slug = name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
  return `https://spellbook.app/s/${slug || 'magia'}`;
}

function hifiCopyLink(s, lang, show) {
  const url = buildSpellLink(s, lang);
  if (navigator.clipboard?.writeText) {
    navigator.clipboard.writeText(url).then(
      () => show(lang === 'ptbr' ? `link copiado: ${url}` : `link copied: ${url}`),
      () => show(lang === 'ptbr' ? 'falha ao copiar' : 'copy failed', 'err'),
    );
  } else {
    show(url);
  }
}

function hifiShare(s, lang, show) {
  const url = buildSpellLink(s, lang);
  const title = window.spellName ? window.spellName(s, lang) : s?.en;
  if (navigator.share) {
    navigator.share({ title, url }).then(
      () => show(lang === 'ptbr' ? 'compartilhado' : 'shared'),
      () => {}, // user cancelled
    );
  } else {
    // fallback to copy
    hifiCopyLink(s, lang, show);
  }
}

function hifiPrint(s, lang, show, extras = {}) {
  show(lang === 'ptbr' ? '⎙ preparando impressão…' : '⎙ printing…');
  window.dispatchEvent(new CustomEvent('hifi-print-request', { detail: { spell: s, lang, ...extras } }));
}

function hifiPrintList(spells, lang, show, opts = {}) {
  show(lang === 'ptbr' ? '⎙ preparando impressão…' : '⎙ printing…');
  window.dispatchEvent(new CustomEvent('hifi-print-request', { detail: { spells, lang, ...opts } }));
}

// Print N spells in compact "pack" mode — multiple spells per A4 page,
// browser packs them naturally with break-inside: avoid. Spells are
// sorted by level (low → high) before packing.
function hifiPrintPrepared(spells, lang, show, opts = {}) {
  if (!spells || !spells.length) {
    show(lang === 'ptbr' ? 'nenhuma magia preparada' : 'no prepared spells', 'err');
    return;
  }
  const sorted = [...spells].sort((a, b) => (a.lvl - b.lvl) || (spellName(a, lang) || '').localeCompare(spellName(b, lang) || ''));
  show(lang === 'ptbr' ? `⎙ imprimindo ${spells.length} ${spells.length === 1 ? 'magia' : 'magias'}…` : `⎙ printing ${spells.length} spells…`);
  window.dispatchEvent(new CustomEvent('hifi-print-request', { detail: { spells: sorted, lang, mode: 'pack', ...opts } }));
}

// ──────────────────────────────────────────────────────────────────
// PRINT SHEET — renders into body via portal, only visible @media print
// ──────────────────────────────────────────────────────────────────
function HifiPrintRoot() {
  const [payload, setPayload] = React.useState(null);
  React.useEffect(() => {
    function onReq(e) {
      setPayload(e.detail);
      // Wait two RAFs so React commits before the print dialog blocks.
      requestAnimationFrame(() => requestAnimationFrame(() => {
        try { window.print(); } catch (err) {}
        // Clear after the dialog returns.
        setTimeout(() => setPayload(null), 200);
      }));
    }
    window.addEventListener('hifi-print-request', onReq);
    return () => window.removeEventListener('hifi-print-request', onReq);
  }, []);

  if (!payload) return null;
  const { spell, spells, lang, character, mode: explicitMode } = payload;
  const list = spells || (spell ? [spell] : []);
  const mode = explicitMode || (spells ? 'list' : 'single');
  if (!list.length) return null;

  // In single + pack modes, split a too-long description across multiple
  // self-contained "spell blocks" so each block fits inside a single page.
  const cards = [];
  if (mode === 'single' || mode === 'pack') {
    for (const s of list) {
      const chunks = chunkSpellForPrint(s, lang);
      chunks.forEach((chunk, i) => cards.push({ s, chunk, key: `${s.en}-${i}` }));
    }
  } else {
    list.forEach((s, i) => cards.push({ s, key: i }));
  }

  return ReactDOM.createPortal(
    <div id="hifi-print-sheet" data-mode={mode}>
      {character && (
        <div className="hifi-print-tracker">
          <div className="hifi-print-tracker-fields">
            <div className="hifi-print-tracker-title">{character.name}</div>
            <div className="hifi-print-tracker-url">spellbook.app</div>
            <div className="hifi-print-tracker-row">
              <span className="hifi-print-tracker-label">{lang==='ptbr'?'classe':'class'}</span>
              <span className="hifi-print-tracker-box hifi-print-tracker-box-name"/>
            </div>
            <div className="hifi-print-tracker-row">
              <span className="hifi-print-tracker-label">{lang==='ptbr'?'nível':'level'}</span>
              <span className="hifi-print-tracker-box hifi-print-tracker-box-int"/>
              <span className="hifi-print-tracker-label">{lang==='ptbr'?'CD':'DC'}</span>
              <span className="hifi-print-tracker-box hifi-print-tracker-box-int"/>
              <span className="hifi-print-tracker-label">{lang==='ptbr'?'bônus':'bonus'}</span>
              <span className="hifi-print-tracker-box hifi-print-tracker-box-int"/>
            </div>
          </div>
          <div className="hifi-print-tracker-slots">
            <div className="hifi-print-tracker-slots-title">{lang==='ptbr'?'espaços de magia':'spell slots'}</div>
            <div className="hifi-print-tracker-slots-grid">
              {[1,2,3,4,5,6,7,8,9].map(lvl => (
                <div className="hifi-print-tracker-slot-row" key={lvl}>
                  <span className="hifi-print-tracker-slot-label">{lang==='ptbr'?'nv':'lvl'} {lvl}</span>
                  <span className="hifi-print-tracker-boxes">◯ ◯ ◯ ◯</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
      <div className={`hifi-print-flow${mode === 'list' && cards.length > 1 ? ' is-two-col' : ''}`}>
        {cards.map((c, i) => <HifiPrintCard key={i} s={c.s} chunk={c.chunk} lang={lang}/>)}
      </div>
    </div>,
    document.body
  );
}

// Heuristic chunker: if a spell's description is too long to comfortably fit
// one A4 page, split it into multiple stat-blocks. Each chunk renders as its
// own self-contained spell block (name + stats + a portion of the desc),
// labeled "parte N de M". Threshold tuned for ~A4 with 11pt body text.
// In pack mode, each chunk is one card that flows in the page — so chunks
// only kick in when the *single* description is so long it can't fit a page
// alone. ~1800 chars at 8.5pt ≈ comfortable page height.
function chunkSpellForPrint(s, lang, charsPerChunk = 1800) {
  const desc = window.v8Description ? window.v8Description(s, lang) : '';
  const descHtml = window.v8DescriptionHtml ? window.v8DescriptionHtml(s, lang) : '';
  const upgrade = window.v8Upgrade ? window.v8Upgrade(s, lang) : '';
  const upgradeHtml = window.v8UpgradeHtml ? window.v8UpgradeHtml(s, lang) : '';

  // Short enough for one page → one self-contained block carrying the full
  // rich HTML (preserva parágrafos/listas), com o texto achatado de fallback.
  if (!desc || desc.length <= charsPerChunk) {
    return [{ desc, descHtml, upgrade, upgradeHtml, partIdx: 0, partTotal: 1 }];
  }

  // Too long for one page → split into page-sized chunks. Com HTML, quebra nos
  // limites de bloco de topo (mantém cada pedaço como marcação válida, nunca no
  // meio de uma tag); sem HTML, cai no split por frase do texto achatado.
  let chunks;
  if (descHtml) {
    const blocks = descHtml
      .split(/(?<=<\/(?:p|ul|ol|dl|table|h[1-6]|blockquote)>)\s*/i)
      .filter(b => b && b.trim());
    chunks = [];
    let cur = '', curLen = 0;
    for (const b of blocks) {
      const len = b.replace(/<[^>]+>/g, '').length;
      if (cur && curLen + len > charsPerChunk) {
        chunks.push({ descHtml: cur });
        cur = b; curLen = len;
      } else {
        cur += b; curLen += len;
      }
    }
    if (cur) chunks.push({ descHtml: cur });
  } else {
    const sentences = desc.split(/(?<=[.!?])\s+/);
    chunks = [];
    let cur = '';
    for (const sent of sentences) {
      if (cur && (cur.length + sent.length + 1) > charsPerChunk) {
        chunks.push({ desc: cur.trim() });
        cur = sent + ' ';
      } else {
        cur += sent + ' ';
      }
    }
    if (cur.trim()) chunks.push({ desc: cur.trim() });
  }
  const total = chunks.length;
  return chunks.map((c, i) => ({
    desc: c.desc || '',
    descHtml: c.descHtml || '',
    // The "at higher levels" block belongs on the last page only.
    upgrade: i === total - 1 ? upgrade : '',
    upgradeHtml: i === total - 1 ? upgradeHtml : '',
    partIdx: i, partTotal: total,
  }));
}

function HifiPrintCard({ s, lang, chunk }) {
  const fallback = {
    desc: window.v8Description ? window.v8Description(s, lang) : '',
    descHtml: window.v8DescriptionHtml ? window.v8DescriptionHtml(s, lang) : '',
    upgrade: window.v8Upgrade ? window.v8Upgrade(s, lang) : '',
    upgradeHtml: window.v8UpgradeHtml ? window.v8UpgradeHtml(s, lang) : '',
    partIdx: 0, partTotal: 1,
  };
  const { desc, descHtml, upgrade, upgradeHtml, partIdx, partTotal } = chunk || fallback;
  const comps = (s.comp || '').split(/\s+/).filter(Boolean);
  const isCantrip = s.lvl === 0;
  return (
    <article className="hifi-print-spell">
      <header className="hifi-print-spell-head">
        <div className="hifi-print-spell-headrow">
          <span
            className={`hifi-print-spell-level${isCantrip ? ' is-cantrip' : ''}`}
            title={isCantrip ? (lang==='ptbr'?'truque':'cantrip') : `${lang==='ptbr'?'nível':'level'} ${s.lvl}`}
          >
            {isCantrip ? (lang === 'ptbr' ? 'T' : 'C') : s.lvl}
          </span>
          <div className="hifi-print-spell-name">{spellName(s, lang)}</div>
        </div>
        <div className="hifi-print-spell-meta">
          {schoolKey(s.school)}
          {s.conc && <> · <span>{lang==='ptbr'?'concentração':'concentration'}</span></>}
          {s.rit && <> · <span>{lang==='ptbr'?'ritual':'ritual'}</span></>}
        </div>
        {partTotal > 1 && (
          <div className="hifi-print-spell-continuation">
            {lang === 'ptbr' ? `parte ${partIdx + 1} de ${partTotal}` : `part ${partIdx + 1} of ${partTotal}`}
          </div>
        )}
      </header>
      <dl className="hifi-print-spell-stats">
        <div><dt>{lang==='ptbr'?'execução':'cast'}</dt><dd>{s.time}</dd></div>
        <div><dt>{lang==='ptbr'?'alcance':'range'}</dt><dd>{s.range}</dd></div>
        <div><dt>{lang==='ptbr'?'duração':'duration'}</dt><dd>{s.dur}</dd></div>
        <div><dt>{lang==='ptbr'?'componentes':'components'}</dt><dd>{comps.join(' · ') || '—'}</dd></div>
      </dl>
      {(descHtml || desc) && (
        descHtml
          ? <div className="hifi-print-spell-desc hifi-rich" dangerouslySetInnerHTML={{ __html: descHtml }}/>
          : <p className="hifi-print-spell-desc">{desc}</p>
      )}
      {(upgradeHtml || upgrade) && (
        <div className="hifi-print-spell-upgrade">
          <strong>{lang==='ptbr'?'Em níveis superiores.':'At higher levels.'}</strong>{' '}
          {upgradeHtml
            ? <span className="hifi-rich" dangerouslySetInnerHTML={{ __html: upgradeHtml }}/>
            : upgrade}
        </div>
      )}
      <footer className="hifi-print-spell-foot">
        {s.src || '—'}{s.edition ? ` · ${s.edition}` : ''}
        {(s.classes || []).length > 0 && <> · {(s.classes || []).join(', ')}</>}
      </footer>
    </article>
  );
}

// ──────────────────────────────────────────────────────────────────
// Common primitives
// ──────────────────────────────────────────────────────────────────
function HifiPill({ children, active, color, onClick, title, style }) {
  return (
    <span
      onClick={onClick}
      title={title}
      className={`hifi-pill${active ? ' active' : ''}`}
      style={color ? { borderColor: color, color: active ? 'var(--base)' : color, ...style } : style}
    >{children}</span>
  );
}

function HifiMono({ children, style }) {
  return <span className="hifi-mono" style={style}>{children}</span>;
}

function HifiSectionLabel({ children, style }) {
  return <div className="hifi-section-label" style={style}>{children}</div>;
}

function HifiSpellName({ children, size = 17, style }) {
  return (
    <span
      className="hifi-display"
      style={{ fontSize: size, color: 'var(--text)', ...style }}
    >{children}</span>
  );
}

// Ícone de bookmark (marca de "preparada"). Usa currentColor, então herda a cor
// do elemento pai — basta setar `color` no contêiner.
function HifiBookmarkIcon({ size = 13, filled = true, style }) {
  return (
    <svg
      width={size} height={size} viewBox="0 0 24 24" aria-hidden="true"
      fill={filled ? 'currentColor' : 'none'}
      stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
      style={{ display: 'block', ...style }}
    >
      <path d="M6 3h12a1 1 0 0 1 1 1v17l-7-4-7 4V4a1 1 0 0 1 1-1z"/>
    </svg>
  );
}

// Toggle claro/escuro. Mostra o estado atual: ☀️ quando o tema claro está
// vigente, 🌙 quando o escuro está. Clicar alterna.
function HifiThemeToggle({ dark, lang = 'ptbr', style }) {
  return (
    <button
      onClick={() => window.__toggleDark && window.__toggleDark()}
      className="hifi-icon-btn"
      aria-pressed={!dark}
      title={dark
        ? (lang === 'ptbr' ? 'mudar para tema claro' : 'switch to light theme')
        : (lang === 'ptbr' ? 'mudar para tema escuro' : 'switch to dark theme')}
      style={{ width: 30, height: 30, background: 'var(--surface1)', fontSize: 15, lineHeight: 1, ...style }}
    >
      <span aria-hidden="true">{dark ? '🌙' : '☀️'}</span>
    </button>
  );
}

// Tema canônico: "Claro (carta)" (= 'daylight'), com modo claro/escuro.
// A troca claro/escuro é feita pelo HifiThemeToggle (☀️ / 🌙).

// ──────────────────────────────────────────────────────────────────
// SPELL CARD (shared)
// ──────────────────────────────────────────────────────────────────
function HifiSpellCard({ s, lang, prepared, bookmarked, selected, onClick, onTogglePrepared, compact }) {
  const tier = tierSymbol(s.lvl);
  const desc = window.v8Description ? window.v8Description(s, lang) : '';
  // HTML cru da fonte (preserva parágrafos); '' quando só há texto puro.
  const descHtml = window.v8DescriptionHtml ? window.v8DescriptionHtml(s, lang) : '';
  const comps = (s.comp || '').split(/\s+/).filter(Boolean);
  return (
    <div
      onClick={onClick}
      className={`hifi-card${selected ? ' selected' : ''}${compact ? ' compact' : ''}`}
      style={{
        cursor: 'pointer',
        position: 'relative',
        // visible (não hidden) pra o ribbon poder cobrir a borda do topo.
        // O texto/descrição têm seu próprio overflow:hidden, então nada vaza.
        overflow: 'visible',
        padding: compact ? '10px 12px' : '12px 14px',
        display: 'flex', flexDirection: 'column', gap: 4,
      }}
    >
      {/* Ribbon = toggle de "preparada". Sempre clicável; o clique não abre o
          detalhe (stopPropagation). Preenchido quando preparada; fantasma sutil
          (clique pra marcar) quando não. */}
      <div
        onClick={(e) => { e.stopPropagation(); onTogglePrepared && onTogglePrepared(); }}
        className={`hifi-card-ribbon ${prepared ? 'on' : 'off'}`}
        title={prepared
          ? (lang==='ptbr' ? 'desmarcar como preparada' : 'unprepare')
          : (lang==='ptbr' ? 'marcar como preparada' : 'prepare')}
      >
        <svg viewBox="0 0 20 28" preserveAspectRatio="xMidYMin meet" aria-hidden="true" strokeLinejoin="round">
          {/* Path ABERTO (sem o segmento do topo): o stroke desenha só os lados
             e o V — sem o traço que sobreporia a borda do card. O fill (estado
             "preparada") fecha o contorno sozinho, então a fita cheia fica igual. */}
          <path d="M0 0 L0 27 L10 20 L20 27 L20 0"/>
        </svg>
      </div>
      {bookmarked && (
        <div title={lang==='ptbr'?'favorita':'bookmarked'} style={{
          position: 'absolute', top: 7, right: prepared ? 42 : 12,
          color: 'var(--yellow)', fontSize: 13, lineHeight: 1, zIndex: 3,
        }}>★</div>
      )}
      <div style={{ display: 'flex', alignItems: 'baseline', gap: 8, paddingRight: prepared ? 42 : (bookmarked ? 22 : 0), minWidth: 0, flexShrink: 0 }}>
        <HifiSpellName size={compact ? 16 : 17} style={{
          display: '-webkit-box',
          WebkitLineClamp: 1,
          WebkitBoxOrient: 'vertical',
          overflow: 'hidden',
        }}>{spellName(s, lang)}</HifiSpellName>
      </div>
      <div style={{
        fontStyle: 'italic', fontSize: 12, color: 'var(--subtext0)',
        fontFamily: "'Marauder Text', Georgia, serif",
        display: 'flex', alignItems: 'center', gap: 6,
        whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
        flexShrink: 0,
      }}>
        <span>{schoolKey(s.school)}</span>
        <span style={{ color: 'var(--overlay0)' }}>·</span>
        <span
          title={s.lvl === 0 ? (lang === 'ptbr' ? 'truque' : 'cantrip') : `${lang === 'ptbr' ? 'nível' : 'level'} ${s.lvl}`}
          style={{
            color: `var(--level-${s.lvl})`,
            fontFamily: "'JetBrains Mono', ui-monospace, monospace",
            fontStyle: 'normal',
            letterSpacing: '0.06em',
            fontSize: 11,
            fontWeight: 600,
          }}>{tier}</span>
      </div>
      {(descHtml || desc) && (
        // Preenche todo o espaço livre entre o meta e o rodapé; o texto que
        // ultrapassa é clipado e dissolvido pelo fade-out (::after no CSS).
        <div className="hifi-card-desc" style={{
          fontSize: compact ? 11.5 : 12.5,
          lineHeight: 1.4,
          color: 'var(--subtext1)',
        }}>
          {descHtml
            ? <div className="hifi-rich" dangerouslySetInnerHTML={{ __html: descHtml }}/>
            : <p style={{ margin: 0, textWrap: 'pretty' }}>{desc}</p>}
        </div>
      )}
      <div className="hifi-card-footer">
        <div className="hifi-comp-chips">
          {['V','S','M'].map(letter => {
            const has = comps.includes(letter);
            return (
              <span
                key={letter}
                className={`hifi-comp-chip${has ? ' on' : ''}`}
                title={letter === 'V' ? (lang==='ptbr'?'verbal':'verbal')
                  : letter === 'S' ? (lang==='ptbr'?'somático':'somatic')
                  : (lang==='ptbr'?'material':'material')}
              >{letter}</span>
            );
          })}
        </div>
        <span className="hifi-card-meta-sep">·</span>
        <span className="hifi-card-meta-text" title={lang==='ptbr'?'alcance':'range'}>{s.range}</span>
        {s.src && <>
          <span className="hifi-card-meta-sep">·</span>
          <span className="hifi-card-meta-text" title={lang==='ptbr'?'fonte':'source'}>{s.src}</span>
        </>}
        {(s.rit || s.conc) && <span style={{ flex: 1 }}/>}
        {s.conc && <span className="hifi-card-flag" style={{ color: 'var(--yellow)' }} title={lang==='ptbr'?'concentração':'concentration'}>C</span>}
        {s.rit && <span className="hifi-card-flag" style={{ color: 'var(--peach)' }} title={lang==='ptbr'?'ritual':'ritual'}>R</span>}
      </div>
    </div>
  );
}

// ──────────────────────────────────────────────────────────────────
// FILTER ENGINE (reuses parsing/filtering from v7)
// ──────────────────────────────────────────────────────────────────

// Remapeia o filtro de classe entre idiomas (PT↔EN) preservando a seleção do
// usuário ao trocar de versão. Usa os mapas expostos pelo spells-data-loader;
// valores sem correspondência são mantidos como estão.
function remapClassFilter(set, fromLang, toLang) {
  if (!set || !set.size || fromLang === toLang) return set;
  const enToPt = window.CLASS_PT || {}; // bard → bardo
  const ptToEn = window.CLASS_EN || {}; // bardo → bard
  const dict = toLang === 'ptbr' ? enToPt : ptToEn;
  const out = new Set();
  set.forEach(c => out.add(dict[String(c).toLowerCase()] || c));
  return out;
}

function useHifiAppState(preparedKeys, initialFilters) {
  const spellVersions = window.useSpellVersions ? window.useSpellVersions() : null;
  const allSpells = spellVersions?.spells || [];
  const versionKey = spellVersions?.current || '';
  const switchVersion = spellVersions?.switchVersion || (() => {});
  const versions = spellVersions?.versions || [];
  const loaded = spellVersions?.loaded || false;

  const versionLang = React.useMemo(() => {
    const v = versions.find(v => v.key === versionKey);
    return v?.lang || 'ptbr';
  }, [versionKey, versions]);

  const [filters, setFilters] = React.useState(initialFilters || ({
    class: new Set(['mago']),
    level: new Set(['truque', '1', '2', '3']),
    school: new Set(),
  }));
  const [query, setQuery] = React.useState('');
  const [selectedIdx, setSelectedIdx] = React.useState(null);
  // Quando ligado, mostra só as magias preparadas do personagem ativo.
  const [onlyPrepared, setOnlyPrepared] = React.useState(false);

  // Persist filters when version changes. Nível e escola usam valores canônicos
  // (independentes de idioma), então sobrevivem a qualquer troca. A classe usa
  // rótulos do idioma ('mago' vs 'wizard'), então só precisa de remapeamento
  // quando a versão troca de idioma (PT↔EN); trocar só de edição mantém tudo.
  const prevVersionKeyRef = React.useRef(versionKey);
  React.useEffect(() => {
    const prevKey = prevVersionKeyRef.current;
    if (prevKey !== versionKey) {
      prevVersionKeyRef.current = versionKey;
      const prevLang = versions.find(v => v.key === prevKey)?.lang || versionLang;
      if (prevLang !== versionLang) {
        setFilters(prev => ({ ...prev, class: remapClassFilter(prev.class, prevLang, versionLang) }));
      }
      // A seleção é por índice numa lista que mudou — fecha o detalhe pra não apontar pra magia errada.
      setSelectedIdx(null);
    }
  }, [versionKey]);

  const filtered = React.useMemo(() => {
    let out = allSpells || [];
    if (query.trim()) {
      const q = query.trim().toLowerCase();
      out = out.filter(s => {
        const name = spellName(s, versionLang) || '';
        const en = s.en || '';
        return name.toLowerCase().includes(q) || en.toLowerCase().includes(q);
      });
    }
    if (filters.class && filters.class.size) {
      out = out.filter(s => (s.classes || []).some(c => filters.class.has(c)));
    }
    if (filters.level && filters.level.size) {
      out = out.filter(s => filters.level.has(s.lvl === 0 ? 'truque' : String(s.lvl)));
    }
    if (filters.school && filters.school.size) {
      out = out.filter(s => filters.school.has(schoolKey(s.school)));
    }
    if (onlyPrepared && preparedKeys) {
      out = out.filter(s => preparedKeys.has(hifiSpellKey(s)));
    }
    // Ordena por nível (truque→9) e, dentro do nível, por nome. Cópia antes de
    // ordenar pra não mutar o array de magias em cache (allSpells).
    const collator = versionLang === 'ptbr' ? 'pt' : 'en';
    out = [...out].sort((a, b) =>
      (a.lvl - b.lvl) || (spellName(a, versionLang) || '').localeCompare(spellName(b, versionLang) || '', collator)
    );
    return out;
  }, [allSpells, query, filters, versionLang, onlyPrepared, preparedKeys]);

  return {
    allSpells, filtered, filters, setFilters, query, setQuery,
    selectedIdx, setSelectedIdx, onlyPrepared, setOnlyPrepared,
    versionKey, switchVersion, versions, loaded, versionLang,
  };
}

// ──────────────────────────────────────────────────────────────────
// DETAIL PANEL CONTENT (shared)
// ──────────────────────────────────────────────────────────────────
function HifiDetailContent({ s, lang }) {
  const desc = window.v8Description ? window.v8Description(s, lang) : '';
  const upgrade = window.v8Upgrade ? window.v8Upgrade(s, lang) : '';
  // HTML cru da fonte (preserva parágrafos/listas); '' quando só há texto puro.
  const descHtml = window.v8DescriptionHtml ? window.v8DescriptionHtml(s, lang) : '';
  const upgradeHtml = window.v8UpgradeHtml ? window.v8UpgradeHtml(s, lang) : '';

  return (
    <div style={{ padding: '16px 20px', display: 'flex', flexDirection: 'column', gap: 20 }}>
      {/* Stats grid */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
        <HifiStat label={lang === 'ptbr' ? 'execução' : 'cast'} value={s.time}/>
        <HifiStat label={lang === 'ptbr' ? 'alcance' : 'range'} value={s.range}/>
        <HifiStat label={lang === 'ptbr' ? 'duração' : 'duration'} value={s.dur}/>
        <HifiStat label={lang === 'ptbr' ? 'componentes' : 'components'} value={s.comp}/>
      </div>

      {/* Description */}
      <div>
        <HifiSectionLabel>{lang === 'ptbr' ? 'descrição' : 'description'}</HifiSectionLabel>
        {descHtml
          ? <div className="hifi-rich" style={{ margin: '8px 0 0', fontSize: 15, lineHeight: 1.6, color: 'var(--text)' }} dangerouslySetInnerHTML={{ __html: descHtml }}/>
          : <p style={{ margin: '8px 0 0', fontSize: 15, lineHeight: 1.6, textWrap: 'pretty', color: 'var(--text)' }}>{desc}</p>}
      </div>

      {/* Upgrade — só aparece se a magia tiver essa info na fonte. */}
      {(upgradeHtml || (upgrade && upgrade.trim())) && (
        <div>
          <HifiSectionLabel>{lang === 'ptbr' ? 'em níveis superiores' : 'at higher levels'}</HifiSectionLabel>
          {upgradeHtml
            ? <div className="hifi-rich" style={{ margin: '8px 0 0', fontSize: 14, lineHeight: 1.6, color: 'var(--subtext1)', fontStyle: 'italic' }} dangerouslySetInnerHTML={{ __html: upgradeHtml }}/>
            : <p style={{ margin: '8px 0 0', fontSize: 14, lineHeight: 1.6, textWrap: 'pretty', color: 'var(--subtext1)', fontStyle: 'italic' }}>{upgrade}</p>}
        </div>
      )}

      {/* Classes */}
      <div>
        <HifiSectionLabel>{lang === 'ptbr' ? 'classes' : 'classes'}</HifiSectionLabel>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginTop: 8 }}>
          {(s.classes || []).map(c => <HifiPill key={c}>{c}</HifiPill>)}
        </div>
      </div>

      {/* Source */}
      <div>
        <HifiSectionLabel>{lang === 'ptbr' ? 'fonte' : 'source'}</HifiSectionLabel>
        <div style={{ marginTop: 6, fontSize: 13, color: 'var(--subtext0)', fontStyle: 'italic' }}>
          {s.src} · {s.edition || '5e 2014'}
        </div>
      </div>
    </div>
  );
}

function HifiStat({ label, value }) {
  return (
    <div>
      <HifiSectionLabel>{label}</HifiSectionLabel>
      <div style={{ fontSize: 15, color: 'var(--text)', marginTop: 4 }}>{value}</div>
    </div>
  );
}

// ──────────────────────────────────────────────────────────────────
// DESKTOP
// ──────────────────────────────────────────────────────────────────
function HifiDesktop({ lang = 'ptbr', dark = false, theme = 'catppuccin', character, width = 1280, height = 820 }) {
  const { chars, update } = useCharacters();
  // Pick the live character from the store (matched by id or name from prop fallback)
  const liveChar = React.useMemo(() => {
    if (!character) return chars[0];
    return chars.find(c => c.id === character.id)
        || chars.find(c => c.name === character.name)
        || chars[0];
  }, [chars, character]);
  const charWithAccent = hifiAccentsFor(liveChar, theme);
  const accent = dark ? charWithAccent.accent_dark : charWithAccent.accent;

  // Prepared / bookmarked come from the active character (store-backed).
  // Computados antes do hook pra alimentar o filtro "só preparadas".
  const prepared = React.useMemo(() => new Set(liveChar?.prepared || []), [liveChar]);
  const bookmarked = React.useMemo(() => new Set(liveChar?.bookmarked || []), [liveChar]);

  const state = useHifiAppState(prepared);
  const { allSpells, filtered, filters, setFilters, query, setQuery,
    selectedIdx, setSelectedIdx, onlyPrepared, setOnlyPrepared,
    versionKey, switchVersion, versions, versionLang } = state;
  const { toast, show: showToast } = useHifiToast();

  const [charMenuOpen, setCharMenuOpen] = React.useState(false);
  const [charPickerOpen, setCharPickerOpen] = React.useState(false);
  // Editor state: null | { charId } where charId === null means create mode
  const [editor, setEditor] = React.useState(null);

  const sel = selectedIdx !== null ? filtered[selectedIdx] : null;
  const open = !!sel;

  React.useEffect(() => {
    if (selectedIdx !== null && selectedIdx >= filtered.length) setSelectedIdx(null);
  }, [filtered.length, selectedIdx, setSelectedIdx]);

  React.useEffect(() => {
    if (!open) return;
    const onKey = (e) => {
      if (e.key === 'Escape') { setSelectedIdx(null); return; }
      if (e.key === 'ArrowRight') setSelectedIdx(i => (i + 1) % filtered.length);
      if (e.key === 'ArrowLeft')  setSelectedIdx(i => (i - 1 + filtered.length) % filtered.length);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, filtered.length, setSelectedIdx]);

  function togglePrep(s) {
    if (!liveChar) return;
    togglePreparedFor(liveChar.id, hifiSpellKey(s), update);
  }
  function toggleBook(s) {
    if (!liveChar) return;
    toggleBookmarkedFor(liveChar.id, hifiSpellKey(s), update);
  }
  function toggleFilter(category, value) {
    setFilters(prev => {
      const next = { ...prev };
      const s = new Set(next[category] || []);
      s.has(value) ? s.delete(value) : s.add(value);
      next[category] = s;
      return next;
    });
  }

  const themeClass = `${dark ? 'hifi-dark' : 'hifi-light'}${theme && theme !== 'catppuccin' ? ' hifi-theme-' + theme : ''}`;
  const containerStyle = { '--accent': accent };
  const filterCats = [
    { key: 'level',  label: lang === 'ptbr' ? 'nível'  : 'level',  values: ['truque','1','2','3','4','5','6','7','8','9'] },
    { key: 'school', label: lang === 'ptbr' ? 'escola' : 'school', values: ['evoc','conj','abjur','ench','ilus','div','necr','trans'] },
    { key: 'class',  label: lang === 'ptbr' ? 'classe' : 'class',  values: ['mago','clérigo','druida','bardo','feiticeiro','bruxo'] },
  ];

  return (
    <div className={`hifi ${themeClass}`} style={{ ...containerStyle, width, height, display: 'flex', flexDirection: 'column', position: 'relative' }}>
      {/* Header */}
      <header style={{ padding: '18px 28px', borderBottom: '1px solid var(--surface1)', display: 'flex', alignItems: 'center', gap: 10, flexShrink: 0 }}>
        <div style={{ display: 'flex', alignItems: 'baseline', gap: 10 }}>
          <span className="hifi-display" style={{ fontSize: 26, color: 'var(--text)' }}>Grimório</span>
          {liveChar?.name && (
            <span className="hifi-display" style={{
              fontSize: 26, color: accent,
              letterSpacing: '0.04em',
            }}>de {liveChar.name}</span>
          )}
        </div>
        <div style={{ flex: 1 }}/>
        <button
          onClick={() => {
            const preparedSet = new Set(liveChar?.prepared || []);
            const preparedSpells = allSpells.filter(s => preparedSet.has(hifiSpellKey(s)));
            hifiPrintPrepared(preparedSpells, lang, showToast, { character: liveChar });
          }}
          className="hifi-btn-secondary"
          title={lang === 'ptbr' ? 'imprimir magias preparadas' : 'print prepared spells'}
          style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}
        >
          <span style={{ fontSize: 13 }}>⎙</span>
          <span>{lang === 'ptbr' ? 'imprimir preparadas' : 'print prepared'}</span>
        </button>
        <button
          onClick={() => window.__shareBuild && window.__shareBuild()}
          className="hifi-btn-secondary"
          title={lang === 'ptbr' ? 'compartilhar build do personagem' : 'share character build'}
          style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}
        >
          <span style={{ fontSize: 13 }}>↗</span>
          <span>{lang === 'ptbr' ? 'compartilhar build' : 'share build'}</span>
        </button>
        <div style={{ position: 'relative', display: 'flex', alignItems: 'center', gap: 4 }}>
          <button
            onClick={() => setCharMenuOpen(o => !o)}
            className="hifi-btn-secondary"
            style={{ display: 'flex', alignItems: 'center', gap: 8 }}
          >
            <span style={{ width: 10, height: 10, borderRadius: '50%', background: accent }}/>
            {liveChar?.name}
            <span style={{ color: 'var(--subtext0)', fontSize: 11 }}>▾</span>
          </button>
          <button
            onClick={() => setEditor({ charId: liveChar?.id })}
            className="hifi-btn-ghost"
            title={lang === 'ptbr' ? 'editar personagem' : 'edit character'}
            style={{ padding: '6px 8px', fontSize: 13 }}
          >{lang === 'ptbr' ? 'editar' : 'edit'}</button>
          {charMenuOpen && (
            <>
              <div onClick={() => setCharMenuOpen(false)} style={{ position: 'absolute', inset: -1000, zIndex: 9 }}/>
              <div style={{
                position: 'absolute', right: 0, top: '100%', marginTop: 6,
                background: 'var(--mantle)', border: '1px solid var(--surface1)', borderRadius: 4,
                minWidth: 240, padding: '4px 0', zIndex: 10,
                boxShadow: '0 8px 24px rgba(0,0,0,0.18)',
              }}>
                {chars.map(c => {
                  const ca = hifiAccentsFor(c, theme);
                  const isCurrent = c.id === liveChar?.id;
                  return (
                    <div key={c.id} style={{ display: 'flex', alignItems: 'center' }}>
                      <button
                        onClick={() => { window.__setCharacterByName && window.__setCharacterByName(c.name); setCharMenuOpen(false); }}
                        className="hifi-btn-ghost"
                        style={{ display: 'flex', flex: 1, alignItems: 'center', gap: 10, padding: '8px 12px', textAlign: 'left' }}>
                        <span style={{ width: 10, height: 10, borderRadius: '50%', background: dark ? ca.accent_dark : ca.accent }}/>
                        <span style={{ flex: 1 }}>{c.name}</span>
                        {isCurrent && <span style={{ color: accent, fontSize: 12 }}>✓</span>}
                      </button>
                      <button
                        onClick={() => { setCharMenuOpen(false); setEditor({ charId: c.id }); }}
                        className="hifi-btn-ghost"
                        title={lang === 'ptbr' ? 'editar' : 'edit'}
                        style={{ padding: '4px 10px', fontSize: 11, color: 'var(--subtext0)' }}>
                        {lang === 'ptbr' ? 'editar' : 'edit'}
                      </button>
                    </div>
                  );
                })}
                <div style={{ height: 1, background: 'var(--surface1)', margin: '4px 0' }}/>
                <button
                  onClick={() => { setCharMenuOpen(false); setEditor({ charId: null }); }}
                  className="hifi-btn-ghost"
                  style={{ display: 'flex', width: '100%', alignItems: 'center', gap: 10, padding: '8px 12px', textAlign: 'left', color: 'var(--accent)' }}>
                  <span style={{
                    width: 14, height: 14, borderRadius: '50%',
                    border: '1px dashed var(--accent)',
                    display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: 11, color: 'var(--accent)',
                  }}>+</span>
                  <span>{lang === 'ptbr' ? 'novo personagem' : 'new character'}</span>
                </button>
              </div>
            </>
          )}
        </div>
      </header>

      {/* Filter bar */}
      <div style={{ padding: '12px 28px', display: 'flex', gap: 10, alignItems: 'center', borderBottom: '1px solid var(--surface1)', flexShrink: 0 }}>
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder={lang === 'ptbr' ? 'buscar magias…' : 'search spells…'}
          className="hifi-input"
          style={{ width: 240 }}
        />
        <span style={{ width: 1, height: 22, background: 'var(--surface1)' }}/>
        {filterCats.map(cat => (
          <div key={cat.key} style={{ position: 'relative' }}>
            <FilterChipDropdown
              label={cat.label}
              count={filters[cat.key]?.size || 0}
              values={cat.values}
              selected={filters[cat.key] || new Set()}
              onToggle={(v) => toggleFilter(cat.key, v)}
              onClear={() => setFilters(p => ({ ...p, [cat.key]: new Set() }))}
              lang={lang}
            />
          </div>
        ))}
        <span style={{ width: 1, height: 22, background: 'var(--surface1)' }}/>
        {window.VersionSelector && (
          <window.VersionSelector
            current={versionKey}
            versions={versions}
            onChange={switchVersion}
            lang={versionLang}
            dark={dark}
          />
        )}
        <span style={{ width: 1, height: 22, background: 'var(--surface1)' }}/>
        <button
          onClick={() => setOnlyPrepared(v => !v)}
          className={`hifi-filter-chip${onlyPrepared ? ' active' : ''}`}
          style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}
          title={lang === 'ptbr' ? 'mostrar só as magias preparadas' : 'show only prepared spells'}
        >
          <span style={{ color: onlyPrepared ? 'var(--accent)' : 'inherit', display: 'inline-flex' }}><HifiBookmarkIcon size={12}/></span>
          <span>{lang === 'ptbr' ? 'preparadas' : 'prepared'}</span>
        </button>
        <div style={{ flex: 1 }}/>
        <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 11, color: 'var(--subtext0)' }}>
          {filtered.length} {lang === 'ptbr' ? 'resultados' : 'results'}
        </span>
      </div>

      {/* Grid + panel */}
      <div style={{ flex: 1, display: 'flex', minHeight: 0, overflow: 'hidden' }}>
        <div style={{ flex: 1, overflow: 'auto', padding: '20px 28px' }}>
          <div style={{
            display: 'grid',
            gridTemplateColumns: open ? 'repeat(auto-fill, minmax(253px, 1fr))' : 'repeat(auto-fill, minmax(307px, 1fr))',
            gap: 12,
            // Zoom de 20% só nos tokens: escala fontes, paddings, barra de nível
            // e tamanho dos cards de forma uniforme, refluindo as colunas.
            zoom: 1.2,
          }}>
            {filtered.map((s, i) => (
              <HifiSpellCard
                key={hifiSpellKey(s)} s={s} lang={lang}
                prepared={prepared.has(hifiSpellKey(s))}
                bookmarked={bookmarked.has(hifiSpellKey(s))}
                selected={i === selectedIdx}
                onClick={() => setSelectedIdx(i === selectedIdx ? null : i)}
                onTogglePrepared={() => togglePrep(s)}
              />
            ))}
          </div>
        </div>

        {/* Side panel */}
        <div style={{
          width: open ? 420 : 0, flexShrink: 0,
          borderLeft: open ? '1px solid var(--surface1)' : 'none',
          background: 'var(--mantle)',
          transition: 'width 320ms cubic-bezier(.2,.7,.3,1)',
          overflow: 'hidden',
          display: 'flex', flexDirection: 'column',
          position: 'relative',
        }}>
          {open && (
            <>
              <div className="hifi-panel-header">
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
                  <button className="hifi-icon-btn" onClick={() => setSelectedIdx(i => (i - 1 + filtered.length) % filtered.length)} title={lang==='ptbr'?'anterior (←)':'previous (←)'}>‹</button>
                  <button className="hifi-icon-btn" onClick={() => setSelectedIdx(i => (i + 1) % filtered.length)} title={lang==='ptbr'?'próxima (→)':'next (→)'}>›</button>
                  <HifiMono style={{ marginLeft: 4 }}>{selectedIdx + 1} / {filtered.length}</HifiMono>
                  <div style={{ flex: 1 }}/>
                  <button className="hifi-icon-btn" onClick={() => setSelectedIdx(null)} title={lang==='ptbr'?'fechar (esc)':'close (esc)'}>×</button>
                </div>
                <div style={{ display: 'flex', alignItems: 'baseline', gap: 8 }}>
                  <span className={`hifi-level-bar hifi-level-${sel.lvl}`} style={{ width: 4, height: 30 }}/>
                  <HifiSpellName size={26}>{spellName(sel, lang)}</HifiSpellName>
                </div>
                <div style={{ marginTop: 4, fontSize: 13, color: 'var(--subtext0)', fontStyle: 'italic' }}>
                  {schoolKey(sel.school)} · {sel.lvl === 0 ? (lang === 'ptbr' ? 'truque' : 'cantrip') : `${lang === 'ptbr' ? 'nível' : 'level'} ${sel.lvl}`}
                  {sel.conc && <span> · <span style={{ color: 'var(--yellow)' }}>concentração</span></span>}
                  {sel.rit && <span> · <span style={{ color: 'var(--peach)' }}>ritual</span></span>}
                </div>
              </div>
              <div style={{ flex: 1, overflow: 'auto' }}>
                <HifiDetailContent s={sel} lang={lang}/>
              </div>
              <div className="hifi-panel-action-bar" style={{ display: 'flex', gap: 6 }}>
                <button
                  className="hifi-btn-primary"
                  onClick={() => togglePrep(sel)}
                  style={prepared.has(hifiSpellKey(sel))
                    ? {}
                    : { background: 'transparent', color: 'var(--accent)' }}
                >{prepared.has(hifiSpellKey(sel))
                  ? <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}><HifiBookmarkIcon size={13}/>{lang==='ptbr'?'preparada':'prepared'}</span>
                  : (lang==='ptbr'?'preparar':'prepare')}</button>
                <button
                  className="hifi-icon-btn"
                  onClick={() => toggleBook(sel)}
                  style={{ width: 'auto', padding: '0 12px', color: bookmarked.has(hifiSpellKey(sel)) ? 'var(--yellow)' : 'var(--text)' }}
                  title={lang === 'ptbr' ? 'favorita' : 'bookmark'}
                >{bookmarked.has(hifiSpellKey(sel)) ? '★' : '☆'}</button>
                <button className="hifi-btn-secondary" onClick={() => setCharPickerOpen(true)}>+ {lang === 'ptbr' ? 'personagem' : 'character'}</button>
                <div style={{ flex: 1 }}/>
                <button className="hifi-btn-ghost"
                  onClick={() => hifiCopyLink(sel, lang, showToast)}
                  title={lang === 'ptbr' ? 'copiar link' : 'copy link'}>{lang === 'ptbr' ? 'link' : 'link'}</button>
              </div>

              {charPickerOpen && (
                <div onClick={() => setCharPickerOpen(false)}
                  style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.35)', zIndex: 20, display: 'flex', alignItems: 'flex-end', justifyContent: 'center', padding: 20 }}>
                  <div onClick={(e) => e.stopPropagation()}
                    style={{ width: '100%', maxWidth: 320, background: 'var(--mantle)', border: '1px solid var(--surface1)', borderRadius: 6, padding: '8px 0' }}>
                    <div className="hifi-section-label" style={{ padding: '6px 14px 8px', borderBottom: '1px solid var(--surface1)' }}>
                      {lang === 'ptbr' ? 'adicionar a' : 'add to'}
                    </div>
                    {chars.map(c => {
                      const ca = hifiAccentsFor(c, theme);
                      const k = hifiSpellKey(sel);
                      const has = (c.prepared || []).includes(k);
                      return (
                        <button key={c.id}
                          onClick={() => {
                            togglePreparedFor(c.id, k, update);
                            setCharPickerOpen(false);
                          }}
                          className="hifi-btn-ghost"
                          style={{ width: '100%', display: 'flex', alignItems: 'center', gap: 10, padding: '10px 14px', textAlign: 'left' }}>
                          <span style={{ width: 10, height: 10, borderRadius: '50%', background: dark ? ca.accent_dark : ca.accent }}/>
                          <span style={{ flex: 1 }}>{c.name}</span>
                          {has && <span style={{ color: dark ? ca.accent_dark : ca.accent, fontSize: 12 }}>✓</span>}
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </div>

      {/* Site footer — credits */}
      <footer style={{
        padding: '10px 28px',
        borderTop: '1px solid var(--surface1)',
        background: 'var(--mantle)',
        display: 'flex',
        alignItems: 'center',
        gap: 14,
        flexWrap: 'wrap',
        fontFamily: "'JetBrains Mono', ui-monospace, monospace",
        fontSize: 10,
        letterSpacing: '0.06em',
        color: 'var(--subtext0)',
        textTransform: 'uppercase',
        flexShrink: 0,
      }}>
        <span>Spellbook — {lang === 'ptbr' ? 'estudo de design' : 'design study'}</span>
        <span style={{ color: 'var(--overlay0)' }}>·</span>
        <span>{lang === 'ptbr' ? 'temas' : 'themes'}{' '}
          <a href="https://catppuccin.com/" target="_blank" rel="noopener" style={hifiFooterLink}>Catppuccin</a>,{' '}
          <a href="https://www.nordtheme.com/" target="_blank" rel="noopener" style={hifiFooterLink}>Nord</a>,{' '}
          <a href="https://monokai.pro/" target="_blank" rel="noopener" style={hifiFooterLink}>Monokai</a>,{' '}
          <a href="https://ethanschoonover.com/solarized/" target="_blank" rel="noopener" style={hifiFooterLink}>Solarized</a>
        </span>
        <span style={{ color: 'var(--overlay0)' }}>·</span>
        <span>{lang === 'ptbr' ? 'fontes' : 'fonts'}{' '}
          <a href="https://github.com/indestructible-type/Marauder" target="_blank" rel="noopener" style={hifiFooterLink}>Marauder</a>,{' '}
          <a href="https://fonts.google.com/specimen/Texturina" target="_blank" rel="noopener" style={hifiFooterLink}>Texturina</a>,{' '}
          <a href="https://www.jetbrains.com/lp/mono/" target="_blank" rel="noopener" style={hifiFooterLink}>JetBrains Mono</a>
        </span>
        <div style={{ flex: 1, minWidth: 14 }}/>
        <HifiThemeToggle dark={dark} lang={lang} style={{ width: 26, height: 26, fontSize: 13 }}/>
      </footer>

      {/* Character editor — slide-in panel from the right */}
      {editor && (
        <>
          <div
            onClick={() => setEditor(null)}
            style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.35)', zIndex: 30 }}/>
          <div style={{
            position: 'absolute', top: 0, right: 0, bottom: 0,
            width: 460, zIndex: 31,
            boxShadow: '-8px 0 24px rgba(0,0,0,0.18)',
            animation: 'hifi-slide-in 240ms cubic-bezier(.2,.7,.3,1)',
          }}>
            <CharacterEditor
              lang={lang} dark={dark} theme={theme}
              charId={editor.charId}
              mode="panel"
              onClose={(result) => {
                setEditor(null);
                if (result?.action === 'created' && window.__setCharacterByName) {
                  window.__setCharacterByName(result.character.name);
                } else if (result?.action === 'deleted' && window.__setCharacterByName) {
                  // Fall back to the first remaining character
                  const remaining = loadCharacters();
                  if (remaining[0]) window.__setCharacterByName(remaining[0].name);
                } else if (result?.action === 'updated' && window.__setCharacterByName) {
                  window.__setCharacterByName(result.character.name);
                }
              }}/>
          </div>
        </>
      )}

      <HifiToast toast={toast} accent={accent}/>
    </div>
  );
}

function FilterChipDropdown({ label, count, values, selected, onToggle, onClear, lang }) {
  const [open, setOpen] = React.useState(false);
  const active = count > 0;
  return (
    <>
      <button onClick={() => setOpen(o => !o)} className={`hifi-filter-chip${active ? ' active' : ''}`}>
        <span>{label}</span>
        {count > 0 && <span className="hifi-filter-chip-count">{count}</span>}
        <span style={{ color: 'var(--subtext0)', fontSize: 10 }}>▾</span>
      </button>
      {open && (
        <>
          <div onClick={() => setOpen(false)} style={{ position: 'fixed', inset: 0, zIndex: 11 }}/>
          <div style={{
            position: 'absolute', top: '100%', left: 0, marginTop: 6,
            background: 'var(--mantle)', border: '1px solid var(--surface1)', borderRadius: 4,
            minWidth: 200, padding: '6px 0', zIndex: 12,
            boxShadow: '0 8px 24px rgba(0,0,0,0.18)',
          }}>
            {count > 0 && (
              <button onClick={onClear} className="hifi-btn-ghost"
                style={{ display: 'block', width: '100%', textAlign: 'left', padding: '6px 12px', color: 'var(--subtext0)', fontSize: 12 }}>
                {lang === 'ptbr' ? 'limpar' : 'clear'}
              </button>
            )}
            {values.map(v => {
              const sel = selected.has(v);
              return (
                <button key={v}
                  onClick={() => onToggle(v)}
                  className="hifi-btn-ghost"
                  style={{ display: 'flex', width: '100%', alignItems: 'center', gap: 10, padding: '7px 12px', textAlign: 'left' }}>
                  <span style={{
                    width: 14, height: 14, border: '1px solid var(--surface2)', borderRadius: 3,
                    display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                    background: sel ? 'var(--accent)' : 'transparent', color: 'var(--base)', fontSize: 10,
                  }}>{sel ? '✓' : ''}</span>
                  <span style={{ color: 'var(--text)' }}>{v}</span>
                </button>
              );
            })}
          </div>
        </>
      )}
    </>
  );
}

// ──────────────────────────────────────────────────────────────────
// MOBILE
// ──────────────────────────────────────────────────────────────────
function HifiMobile({ lang = 'ptbr', dark = false, theme = 'catppuccin', character, drawerOpen: initialDrawerOpen = false, detailIdx = null }) {
  const { chars, update } = useCharacters();
  const liveChar = React.useMemo(() => {
    if (!character) return chars[0];
    return chars.find(c => c.id === character.id)
        || chars.find(c => c.name === character.name)
        || chars[0];
  }, [chars, character]);
  const charWithAccent = hifiAccentsFor(liveChar, theme);
  const accent = dark ? charWithAccent.accent_dark : charWithAccent.accent;
  const prepared = React.useMemo(() => new Set(liveChar?.prepared || []), [liveChar]);
  const bookmarked = React.useMemo(() => new Set(liveChar?.bookmarked || []), [liveChar]);
  const state = useHifiAppState(prepared);
  const { allSpells, filtered, filters, setFilters, query, setQuery,
    selectedIdx, setSelectedIdx, onlyPrepared, setOnlyPrepared,
    versionKey, switchVersion, versions, versionLang } = state;
  const { toast, show: showToast } = useHifiToast();
  const [drawerOpen, setDrawerOpen] = React.useState(initialDrawerOpen);
  const [charSheetOpen, setCharSheetOpen] = React.useState(false);
  const [editor, setEditor] = React.useState(null);

  // Swipe pra abrir/fechar o drawer. Fechado: arrastar pra cima abre. Aberto:
  // arrastar pra baixo fecha, mas só quando o gesto começa no topo (~64px, zona
  // do puxador/busca) — assim o scroll do conteúdo do drawer aberto não dispara
  // o fechamento por engano.
  const drawerRef = React.useRef(null);
  const drawerSwipe = React.useRef(null);
  function onDrawerTouchStart(e) {
    const y = e.touches[0].clientY;
    const top = drawerRef.current ? drawerRef.current.getBoundingClientRect().top : 0;
    drawerSwipe.current = { y, fromHandle: (y - top) < 64 };
  }
  function onDrawerTouchEnd(e) {
    const s = drawerSwipe.current;
    drawerSwipe.current = null;
    if (!s) return;
    const dy = e.changedTouches[0].clientY - s.y;
    if (!drawerOpen && dy < -40) setDrawerOpen(true);
    else if (drawerOpen && dy > 50 && s.fromHandle) setDrawerOpen(false);
  }

  React.useEffect(() => {
    if (detailIdx !== null) setSelectedIdx(detailIdx);
  }, [detailIdx, setSelectedIdx]);

  const sel = selectedIdx !== null ? filtered[selectedIdx] : null;
  function togglePrep(s) {
    if (!liveChar) return;
    togglePreparedFor(liveChar.id, hifiSpellKey(s), update);
  }
  function toggleBook(s) {
    if (!liveChar) return;
    toggleBookmarkedFor(liveChar.id, hifiSpellKey(s), update);
  }
  function toggleFilter(category, value) {
    setFilters(prev => {
      const next = { ...prev };
      const set = new Set(next[category] || []);
      set.has(value) ? set.delete(value) : set.add(value);
      next[category] = set;
      return next;
    });
  }
  function clearAllFilters() {
    setFilters({ class: new Set(), level: new Set(), school: new Set() });
    setQuery('');
  }

  const themeClass = `${dark ? 'hifi-dark' : 'hifi-light'}${theme && theme !== 'catppuccin' ? ' hifi-theme-' + theme : ''}`;
  const containerStyle = { '--accent': accent };

  // Detail screen
  if (sel) {
    return (
      <div className={`hifi ${themeClass}`} style={{ ...containerStyle, height: '100%', display: 'flex', flexDirection: 'column', paddingTop: 52, paddingBottom: 34 }}>
        <header style={{ padding: '12px 16px', display: 'flex', alignItems: 'center', gap: 8, borderBottom: '1px solid var(--surface1)', flexShrink: 0 }}>
          <button className="hifi-icon-btn" onClick={() => setSelectedIdx(null)}>‹</button>
          <div style={{ flex: 1 }}/>
          <button className="hifi-icon-btn"
            onClick={() => hifiCopyLink(sel, lang, showToast)}
            title={lang === 'ptbr' ? 'copiar link' : 'copy link'}>⎘</button>
          <button className="hifi-icon-btn"
            onClick={() => toggleBook(sel)}
            style={{ color: bookmarked.has(hifiSpellKey(sel)) ? 'var(--yellow)' : 'var(--text)' }}>
            {bookmarked.has(hifiSpellKey(sel)) ? '★' : '☆'}
          </button>
        </header>
        <div style={{ flex: 1, overflow: 'auto' }}>
          <div style={{ padding: '20px 18px 14px' }}>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: 8 }}>
              <span className={`hifi-level-bar hifi-level-${sel.lvl}`} style={{ width: 4, height: 36 }}/>
              <HifiSpellName size={32}>{spellName(sel, lang)}</HifiSpellName>
            </div>
            <div style={{ marginTop: 6, fontSize: 14, color: 'var(--subtext0)', fontStyle: 'italic' }}>
              {schoolKey(sel.school)} · {sel.lvl === 0 ? (lang === 'ptbr' ? 'truque' : 'cantrip') : `${lang === 'ptbr' ? 'nível' : 'level'} ${sel.lvl}`}
              {sel.conc && <span> · <span style={{ color: 'var(--yellow)' }}>conc.</span></span>}
              {sel.rit && <span> · <span style={{ color: 'var(--peach)' }}>ritual</span></span>}
            </div>
          </div>
          <HifiDetailContent s={sel} lang={lang}/>
        </div>
        <div style={{ padding: '12px 16px', borderTop: '1px solid var(--surface1)', display: 'flex', gap: 8 }}>
          <button
            className="hifi-btn-primary"
            onClick={() => togglePrep(sel)}
            style={{ flex: 1, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 6, ...(prepared.has(hifiSpellKey(sel)) ? {} : { background: 'transparent', color: 'var(--accent)' }) }}
          >{prepared.has(hifiSpellKey(sel))
            ? <><HifiBookmarkIcon size={13}/>{lang==='ptbr'?'preparada':'prepared'}</>
            : (lang==='ptbr'?'preparar':'prepare')}</button>
          <button
            className="hifi-btn-secondary"
            onClick={() => setCharSheetOpen(true)}
            title={lang === 'ptbr' ? 'adicionar a personagem' : 'add to character'}
          >+ char</button>
        </div>
        <HifiToast toast={toast} accent={accent}/>
      </div>
    );
  }

  return (
    <div className={`hifi ${themeClass}`} style={{ ...containerStyle, height: '100%', position: 'relative', overflow: 'hidden', display: 'flex', flexDirection: 'column', paddingTop: 52, paddingBottom: 0 }}>
      <header style={{ padding: '12px 16px', borderBottom: '1px solid var(--surface1)', flexShrink: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span className="hifi-display" style={{ fontSize: 22, color: 'var(--text)' }}>Grimório</span>
          <div style={{ flex: 1 }}/>
          <HifiThemeToggle dark={dark} lang={lang}/>
          <button
            onClick={() => setOnlyPrepared(v => !v)}
            className="hifi-icon-btn"
            title={lang === 'ptbr' ? 'mostrar só as preparadas' : 'show only prepared'}
            aria-pressed={onlyPrepared}
            style={{ width: 30, height: 30, display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
              color: onlyPrepared ? 'var(--base)' : 'var(--text)',
              background: onlyPrepared ? 'var(--accent)' : 'var(--surface1)',
              borderColor: onlyPrepared ? 'var(--accent)' : undefined }}
          ><HifiBookmarkIcon size={14}/></button>
          <button
            onClick={() => {
              const preparedSet = new Set(liveChar?.prepared || []);
              const preparedSpells = allSpells.filter(s => preparedSet.has(hifiSpellKey(s)));
              hifiPrintPrepared(preparedSpells, lang, showToast, { character: liveChar });
            }}
            className="hifi-icon-btn"
            title={lang === 'ptbr' ? 'imprimir preparadas' : 'print prepared'}
            style={{ width: 30, height: 30, fontSize: 13, background: 'var(--surface1)' }}
          >⎙</button>
          <button
            onClick={() => window.__shareBuild && window.__shareBuild()}
            className="hifi-icon-btn"
            title={lang === 'ptbr' ? 'compartilhar build' : 'share build'}
            style={{ width: 30, height: 30, fontSize: 13, background: 'var(--surface1)' }}
          >↗</button>
          <button
            onClick={() => setCharSheetOpen(true)}
            className="hifi-filter-chip"
            style={{ height: 30, background: 'var(--surface1)', padding: '0 10px', cursor: 'pointer' }}
            title={lang === 'ptbr' ? 'trocar / editar personagem' : 'switch / edit character'}
          >
            <span style={{ width: 8, height: 8, borderRadius: '50%', background: accent }}/>
            <span style={{ fontSize: 12 }}>{liveChar?.name}</span>
            <span style={{ color: 'var(--subtext0)', fontSize: 10 }}>▾</span>
          </button>
        </div>
      </header>

      <div style={{ flex: 1, overflow: 'auto', padding: '12px 12px 88px' }}>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: 8 }}>
          {filtered.map((s, i) => (
            <HifiSpellCard
              key={hifiSpellKey(s)} s={s} lang={lang}
              prepared={prepared.has(hifiSpellKey(s))}
              bookmarked={bookmarked.has(hifiSpellKey(s))}
              onClick={() => setSelectedIdx(i)}
              onTogglePrepared={() => togglePrep(s)}
              compact
            />
          ))}
        </div>
      </div>

      {/* Bottom drawer */}
      {drawerOpen && (
        <div onClick={() => setDrawerOpen(false)} style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.45)', zIndex: 4 }}/>
      )}
      <div
        ref={drawerRef}
        onTouchStart={onDrawerTouchStart}
        onTouchEnd={onDrawerTouchEnd}
        style={{
        position: 'absolute', left: 0, right: 0, bottom: 0,
        height: drawerOpen ? 480 : 56,
        background: 'var(--mantle)',
        borderTop: '1px solid var(--surface1)',
        borderTopLeftRadius: 16, borderTopRightRadius: 16,
        boxShadow: '0 -8px 20px rgba(0,0,0,0.2)',
        zIndex: 5,
        transition: 'height 280ms cubic-bezier(.2,.7,.3,1)',
        display: 'flex', flexDirection: 'column', overflow: 'hidden',
      }}>
        <button onClick={() => setDrawerOpen(o => !o)} style={{
          padding: '5px 16px 4px', background: 'transparent', border: 'none', cursor: 'pointer',
          display: 'flex', flexDirection: 'column', alignItems: 'center',
        }}>
          <div style={{ width: 28, height: 3, borderRadius: 2, background: 'var(--surface2)' }}/>
        </button>
        {!drawerOpen ? (
          <div style={{ padding: '0 16px', display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ color: 'var(--overlay1)', fontSize: 14 }}>{lang === 'ptbr' ? 'buscar, filtrar…' : 'search, filter…'}</span>
            <div style={{ flex: 1 }}/>
            <HifiMono>{filtered.length} {lang === 'ptbr' ? 'magias' : 'spells'}</HifiMono>
          </div>
        ) : (
          <div style={{ flex: 1, overflow: 'auto', padding: '4px 16px 18px', display: 'flex', flexDirection: 'column', gap: 16 }}>
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder={lang === 'ptbr' ? 'nome da magia…' : 'spell name…'}
              className="hifi-input"
              style={{ fontSize: 16 }}
            />

            <div>
              <HifiSectionLabel style={{ marginBottom: 6 }}>{lang === 'ptbr' ? 'nível' : 'level'}</HifiSectionLabel>
              <div style={{ display: 'flex', gap: 6, overflowX: 'auto', paddingBottom: 4 }}>
                {['truque','1','2','3','4','5','6','7','8','9'].map(v => (
                  <HifiPill key={v} active={filters.level?.has(v)} onClick={() => toggleFilter('level', v)}>{v === 'truque' ? (lang==='ptbr'?'truque':'cantrip') : v}</HifiPill>
                ))}
              </div>
            </div>

            <div>
              <HifiSectionLabel style={{ marginBottom: 6 }}>{lang === 'ptbr' ? 'escola' : 'school'}</HifiSectionLabel>
              <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                {['evoc','conj','abjur','ench','ilus','div','necr','trans'].map(v => (
                  <HifiPill key={v} active={filters.school?.has(v)} onClick={() => toggleFilter('school', v)}>{v}</HifiPill>
                ))}
              </div>
            </div>

            <div>
              <HifiSectionLabel style={{ marginBottom: 6 }}>{lang === 'ptbr' ? 'classe' : 'class'}</HifiSectionLabel>
              <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                {['mago','clérigo','druida','bardo','feiticeiro','bruxo'].map(v => (
                  <HifiPill key={v} active={filters.class?.has(v)} onClick={() => toggleFilter('class', v)}>{v}</HifiPill>
                ))}
              </div>
            </div>

            <div>
              <HifiSectionLabel style={{ marginBottom: 6 }}>{lang === 'ptbr' ? 'versão' : 'version'}</HifiSectionLabel>
              <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                {versions.map(v => (
                  <HifiPill
                    key={v.key}
                    active={versionKey === v.key}
                    onClick={() => {
                      switchVersion(v.key);
                      setDrawerOpen(false);
                      showToast(lang === 'ptbr' ? `versão: ${v.short}` : `version: ${v.short}`);
                    }}
                  >
                    <span style={{
                      display: 'inline-block',
                      width: 7, height: 7, borderRadius: '50%',
                      background: v.lang === 'ptbr' ? 'var(--green)' : 'var(--blue)',
                      marginRight: 5,
                      verticalAlign: 'middle',
                    }}/>
                    {v.short}
                  </HifiPill>
                ))}
              </div>
            </div>

            <div>
              <HifiSectionLabel style={{ marginBottom: 6 }}>{lang === 'ptbr' ? 'ações' : 'actions'}</HifiSectionLabel>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6 }}>
                <button className="hifi-btn-secondary"
                  onClick={() => {
                    const url = window.location.href;
                    if (navigator.clipboard?.writeText) {
                      navigator.clipboard.writeText(url).then(
                        () => showToast(lang === 'ptbr' ? 'link copiado' : 'link copied'),
                        () => showToast(lang === 'ptbr' ? 'falha ao copiar' : 'copy failed', 'err'),
                      );
                    } else { showToast(url); }
                  }}>
                  {lang === 'ptbr' ? 'copiar link' : 'copy link'}
                </button>
                <button className="hifi-btn-secondary"
                  onClick={() => {
                    const url = window.location.href;
                    const title = lang === 'ptbr' ? 'meu grimório' : 'my spellbook';
                    if (navigator.share) {
                      navigator.share({ title, url }).catch(() => {});
                    } else if (navigator.clipboard?.writeText) {
                      navigator.clipboard.writeText(url).then(
                        () => showToast(lang === 'ptbr' ? 'link copiado' : 'link copied'),
                        () => {},
                      );
                    } else { showToast(url); }
                  }}>
                  {lang === 'ptbr' ? 'compartilhar filtro' : 'share filter'}
                </button>
              </div>
            </div>

            <button onClick={clearAllFilters} className="hifi-btn-ghost" style={{ alignSelf: 'flex-start' }}>{lang === 'ptbr' ? 'limpar filtros' : 'clear filters'}</button>
          </div>
        )}
      </div>

      {/* Character sheet (switcher) */}
      {charSheetOpen && (
        <div onClick={() => setCharSheetOpen(false)}
          style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.45)', zIndex: 20, display: 'flex', alignItems: 'flex-end' }}>
          <div onClick={(e) => e.stopPropagation()}
            style={{
              width: '100%', background: 'var(--mantle)',
              borderTopLeftRadius: 16, borderTopRightRadius: 16,
              padding: '10px 0 12px',
            }}>
            <div style={{ display: 'flex', justifyContent: 'center', padding: '4px 0 8px' }}>
              <div style={{ width: 40, height: 4, borderRadius: 2, background: 'var(--surface2)' }}/>
            </div>
            <div className="hifi-section-label" style={{ padding: '4px 18px 8px' }}>
              {lang === 'ptbr' ? 'personagem' : 'character'}
            </div>
            {chars.map(c => {
              const ca = hifiAccentsFor(c, theme);
              const isCurrent = c.id === liveChar?.id;
              return (
                <div key={c.id} style={{ display: 'flex', alignItems: 'center', padding: '0 8px 0 0' }}>
                  <button
                    onClick={() => {
                      window.__setCharacterByName && window.__setCharacterByName(c.name);
                      setCharSheetOpen(false);
                    }}
                    className="hifi-btn-ghost"
                    style={{ display: 'flex', flex: 1, alignItems: 'center', gap: 12, padding: '12px 18px', textAlign: 'left' }}>
                    <span style={{ width: 12, height: 12, borderRadius: '50%', background: dark ? ca.accent_dark : ca.accent }}/>
                    <span style={{ flex: 1, fontSize: 15 }}>{c.name}</span>
                    {isCurrent && <span style={{ color: dark ? ca.accent_dark : ca.accent, fontSize: 13 }}>✓</span>}
                  </button>
                  <button
                    onClick={() => { setCharSheetOpen(false); setEditor({ charId: c.id }); }}
                    className="hifi-btn-ghost"
                    style={{ padding: '6px 12px', fontSize: 12, color: 'var(--subtext0)' }}>
                    {lang === 'ptbr' ? 'editar' : 'edit'}
                  </button>
                </div>
              );
            })}
            <div style={{ height: 1, background: 'var(--surface1)', margin: '6px 0' }}/>
            <button
              onClick={() => { setCharSheetOpen(false); setEditor({ charId: null }); }}
              className="hifi-btn-ghost"
              style={{ display: 'flex', width: '100%', alignItems: 'center', gap: 12, padding: '12px 18px', textAlign: 'left', color: 'var(--accent)' }}>
              <span style={{
                width: 16, height: 16, borderRadius: '50%',
                border: '1px dashed var(--accent)',
                display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                fontSize: 12, color: 'var(--accent)',
              }}>+</span>
              <span style={{ fontSize: 15 }}>{lang === 'ptbr' ? 'novo personagem' : 'new character'}</span>
            </button>
          </div>
        </div>
      )}

      {/* Character editor — full-screen on mobile */}
      {editor && (
        <div style={{ position: 'absolute', inset: 0, zIndex: 30 }}>
          <CharacterEditor
            lang={lang} dark={dark} theme={theme}
            charId={editor.charId}
            mode="fullscreen"
            onClose={(result) => {
              setEditor(null);
              if (result?.action === 'created' && window.__setCharacterByName) {
                window.__setCharacterByName(result.character.name);
              } else if (result?.action === 'deleted' && window.__setCharacterByName) {
                const remaining = loadCharacters();
                if (remaining[0]) window.__setCharacterByName(remaining[0].name);
              } else if (result?.action === 'updated' && window.__setCharacterByName) {
                window.__setCharacterByName(result.character.name);
              }
            }}/>
        </div>
      )}

      <HifiToast toast={toast} accent={accent}/>
    </div>
  );
}

// Wrappers for the canvas: each artboard renders one phone via IOSDevice
function HifiMobilePhone({ lang, dark, theme, character, drawerOpen, detailIdx }) {
  return (
    <IOSDevice width={390} height={760} dark={dark}>
      <HifiMobile lang={lang} dark={dark} theme={theme} character={character} drawerOpen={drawerOpen} detailIdx={detailIdx}/>
    </IOSDevice>
  );
}

Object.assign(window, { HifiDesktop, HifiMobile, HifiMobilePhone, HifiPrintRoot, hifiAccentsFor, hifiSpellKey });
