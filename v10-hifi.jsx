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

function HifiToast({ toast, accent, bottom = 22 }) {
  if (!toast) return null;
  return (
    <div style={{
      position: 'absolute',
      left: '50%', bottom, transform: 'translateX(-50%)',
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

// Slug estável da magia (nome em inglês) — usado no link e no handler ?spell=.
function hifiSpellSlug(s) {
  const name = (window.spellName ? window.spellName(s, 'en') : s?.en) || s?.en || '';
  return name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
}

function buildSpellLink(s, lang) {
  // URL real do próprio site (o ?spell= abre o detalhe ao carregar) — antes
  // apontava pro domínio-placeholder spellbook.app do protótipo (404 garantido).
  return `${window.location.origin}${window.location.pathname}?spell=${hifiSpellSlug(s) || 'magia'}`;
}

// URL que reproduz a visão atual (busca + filtros base + só-preparadas +
// versão). É o que o botão "compartilhar" do drawer copia — a location crua
// não carrega estado nenhum.
function hifiShareViewUrl({ query, filters, onlyPrepared, versionKey }) {
  const p = new URLSearchParams();
  if (query && query.trim()) p.set('q', query.trim());
  ['class', 'level', 'school'].forEach(key => {
    const set = filters[key];
    if (set && set.size) p.set('f.' + key, [...set].join('|'));
  });
  if (onlyPrepared) p.set('prep', '1');
  if (versionKey) p.set('v', versionKey);
  const qs = p.toString();
  return `${window.location.origin}${window.location.pathname}${qs ? '?' + qs : ''}`;
}

function hifiCopyLink(s, lang, show) {
  const url = buildSpellLink(s, lang);
  if (navigator.clipboard?.writeText) {
    navigator.clipboard.writeText(url).then(
      () => show(tt(lang, 'toast.linkCopied', { url })),
      () => show(tt(lang, 'toast.copyFailed'), 'err'),
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
      () => show(tt(lang, 'toast.shared')),
      () => {}, // user cancelled
    );
  } else {
    // fallback to copy
    hifiCopyLink(s, lang, show);
  }
}

function hifiPrint(s, lang, show, extras = {}) {
  show(tt(lang, 'print.preparing'));
  window.dispatchEvent(new CustomEvent('hifi-print-request', { detail: { spell: s, lang, ...extras } }));
}

function hifiPrintList(spells, lang, show, opts = {}) {
  show(tt(lang, 'print.preparing'));
  window.dispatchEvent(new CustomEvent('hifi-print-request', { detail: { spells, lang, ...opts } }));
}

// Print N spells in compact "pack" mode — multiple spells per A4 page,
// browser packs them naturally with break-inside: avoid. Spells are
// sorted by level (low → high) before packing.
function hifiPrintPrepared(spells, lang, show, opts = {}) {
  if (!spells || !spells.length) {
    show(tt(lang, 'print.noPrepared'), 'err');
    return;
  }
  const sorted = [...spells].sort((a, b) => (a.lvl - b.lvl) || (spellName(a, lang) || '').localeCompare(spellName(b, lang) || ''));
  show(tt(lang, 'print.printing', { n: spells.length, nounSpell: tt(lang, 'noun.spell.' + i18nPlural(spells.length)) }));
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
            <div className="hifi-print-tracker-title">{hifiCharName(character, lang)}</div>
            <div className="hifi-print-tracker-url">{window.location.host || 'grimório'}</div>
            <div className="hifi-print-tracker-row">
              <span className="hifi-print-tracker-label">{tt(lang, 'spell.class')}</span>
              <span className="hifi-print-tracker-box hifi-print-tracker-box-name"/>
            </div>
            <div className="hifi-print-tracker-row">
              <span className="hifi-print-tracker-label">{tt(lang, 'spell.level')}</span>
              <span className="hifi-print-tracker-box hifi-print-tracker-box-int"/>
              <span className="hifi-print-tracker-label">{tt(lang, 'print.dc')}</span>
              <span className="hifi-print-tracker-box hifi-print-tracker-box-int"/>
              <span className="hifi-print-tracker-label">{tt(lang, 'print.bonus')}</span>
              <span className="hifi-print-tracker-box hifi-print-tracker-box-int"/>
            </div>
          </div>
          <div className="hifi-print-tracker-slots">
            <div className="hifi-print-tracker-slots-title">{tt(lang, 'print.spellSlots')}</div>
            <div className="hifi-print-tracker-slots-grid">
              {[1,2,3,4,5,6,7,8,9].map(lvl => (
                <div className="hifi-print-tracker-slot-row" key={lvl}>
                  <span className="hifi-print-tracker-slot-label">{tt(lang, 'print.slotShort')} {lvl}</span>
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
            title={isCantrip ? (tt(lang, 'spell.cantrip')) : `${tt(lang, 'spell.level')} ${s.lvl}`}
          >
            {isCantrip ? (tt(lang, 'spell.cantripShort')) : s.lvl}
          </span>
          <div className="hifi-print-spell-name">{spellName(s, lang)}</div>
        </div>
        <div className="hifi-print-spell-meta">
          {schoolKey(s.school)}
          {s.conc && <> · <span>{tt(lang, 'spell.concentration')}</span></>}
          {s.rit && <> · <span>{tt(lang, 'spell.ritual')}</span></>}
        </div>
        {partTotal > 1 && (
          <div className="hifi-print-spell-continuation">
            {tt(lang, 'spell.part', { i: partIdx + 1, n: partTotal })}
          </div>
        )}
      </header>
      <dl className="hifi-print-spell-stats">
        <div><dt>{tt(lang, 'spell.cast')}</dt><dd>{s.time}</dd></div>
        <div><dt>{tt(lang, 'spell.range')}</dt><dd>{s.range}</dd></div>
        <div><dt>{tt(lang, 'spell.duration')}</dt><dd>{s.dur}</dd></div>
        <div><dt>{tt(lang, 'spell.components')}</dt><dd>{comps.join(' · ') || '—'}</dd></div>
      </dl>
      {(descHtml || desc) && (
        descHtml
          ? <div className="hifi-print-spell-desc hifi-rich" dangerouslySetInnerHTML={{ __html: descHtml }}/>
          : <p className="hifi-print-spell-desc">{desc}</p>
      )}
      {(upgradeHtml || upgrade) && (
        <div className="hifi-print-spell-upgrade">
          <strong>{tt(lang, 'spell.higherLevels')}</strong>{' '}
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

// Ícone clássico de "link" (corrente). Usa currentColor — herda a cor do pai.
function HifiLinkIcon({ size = 15, style }) {
  return (
    <svg
      width={size} height={size} viewBox="0 0 24 24" aria-hidden="true"
      fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
      style={{ display: 'block', ...style }}
    >
      <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/>
      <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/>
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
      aria-label={dark
        ? (tt(lang, 'theme.toLight'))
        : (tt(lang, 'theme.toDark'))}
      title={dark
        ? (tt(lang, 'theme.toLight'))
        : (tt(lang, 'theme.toDark'))}
      style={{ width: 25, height: 25, background: 'var(--surface1)', fontSize: 14, lineHeight: 1, ...style }}
    >
      <span aria-hidden="true">{dark ? '🌙' : '☀️'}</span>
    </button>
  );
}

// Seletor de idioma — dois textos clicáveis no rodapé (PT / EN), sempre
// visíveis. O idioma ativo fica em cor de texto normal; o inativo como link
// sublinhado clicável. Emoji de bandeirinha ao lado de cada um.
function HifiLangToggle({ lang = 'ptbr', versions = [], versionKey, onSwitch }) {
  const cur = versions.find(v => v.key === versionKey);
  const curLang = cur ? cur.lang : lang;
  const editionOf = (v) => (/2024/.test(v.key) ? '2024' : '2014');
  const curEdition = cur ? editionOf(cur) : '2024';

  // Versões disponíveis para a edição atual
  const pt = versions.find(v => v.lang === 'ptbr' && editionOf(v) === curEdition);
  const en = versions.find(v => v.lang === 'en' && editionOf(v) === curEdition);

  const itemStyle = (active) => ({
    ...hifiFooterLink,
    background: 'none',
    border: 'none',
    padding: 0,
    cursor: active ? 'default' : 'pointer',
    font: 'inherit',
    textTransform: 'uppercase',
    opacity: active ? 1 : undefined,
    textDecoration: active ? 'none' : hifiFooterLink.textDecoration,
    color: active ? 'var(--text)' : hifiFooterLink.color,
  });

  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}>
      <button
        onClick={() => { if (!pt || curLang === 'ptbr') return; onSwitch(pt.key); }}
        aria-label={curLang === 'ptbr' ? 'português (atual)' : 'mudar para português'}
        title={curLang === 'ptbr' ? 'português (atual)' : 'mudar para português'}
        style={itemStyle(curLang === 'ptbr')}
      >🇧🇷 PT</button>
      <span style={{ color: 'var(--overlay0)' }}>/</span>
      <button
        onClick={() => { if (!en || curLang === 'en') return; onSwitch(en.key); }}
        aria-label={curLang === 'en' ? 'english (current)' : 'switch to english'}
        title={curLang === 'en' ? 'english (current)' : 'switch to english'}
        style={itemStyle(curLang === 'en')}
      >🇺🇸 EN</button>
    </span>
  );
}

// Tema canônico: "Claro (carta)" (= 'daylight'), com modo claro/escuro.
// A troca claro/escuro é feita pelo HifiThemeToggle (☀️ / 🌙).

// ──────────────────────────────────────────────────────────────────
// SLOT TRACKER — espaços de magia do personagem ativo (desktop + mobile)
// Pip cheio = disponível; vazio = gasto. Clicar num pip gasta/restaura até ele.
// Totais são configurados no editor de personagem; sem totais → não renderiza.
// ──────────────────────────────────────────────────────────────────
function HifiSlotTracker({ character, update, lang, style }) {
  const slots = character?.slots || { total: {}, used: {} };
  const levels = [1,2,3,4,5,6,7,8,9].filter(l => (slots.total[l] || 0) > 0);
  if (!character || !levels.length) return null;
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 12, ...style }}>
      <span className="hifi-section-label" style={{ flexShrink: 0 }}>{tt(lang, 'print.spellSlots')}</span>
      {/* Só os pips rolam; label e "descanso longo" ficam sempre visíveis
          (antes o botão sumia no fim do scroll horizontal do mobile). */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, overflowX: 'auto', flex: 1, minWidth: 0 }}>
        {levels.map(lvl => {
          const total = slots.total[lvl];
          const used = slots.used[lvl] || 0;
          return (
            <span key={lvl} style={{ display: 'inline-flex', alignItems: 'center', gap: 3, flexShrink: 0 }}>
              <span className="hifi-mono" style={{ fontSize: 10, fontWeight: 600, color: `var(--level-${lvl})`, marginRight: 2 }}>{lvl}</span>
              {Array.from({ length: total }, (_, i) => {
                const spent = i < used;
                return (
                  <button
                    key={i}
                    onClick={() => setSlotUsedFor(character.id, lvl, spent ? i : i + 1, update)}
                    aria-pressed={spent}
                    aria-label={tt(lang, 'slots.slotAria', { lvl, i: i + 1, n: total })}
                    title={spent ? tt(lang, 'slots.restore') : tt(lang, 'slots.spend')}
                    // Botão 24px (alvo de toque decente) com o pip de 13px
                    // desenhado dentro — o visual não muda.
                    style={{
                      width: 24, height: 24, padding: 0, border: 'none', background: 'transparent',
                      display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                      cursor: 'pointer', flexShrink: 0,
                    }}
                  >
                    <span aria-hidden="true" style={{
                      width: 13, height: 13, borderRadius: '50%',
                      border: `1.5px solid ${spent ? 'var(--surface2)' : 'var(--accent)'}`,
                      background: spent ? 'transparent' : 'var(--accent)',
                      transition: 'background 120ms, border-color 120ms',
                    }}/>
                  </button>
                );
              })}
            </span>
          );
        })}
      </div>
      <button
        className="hifi-btn-ghost"
        onClick={() => {
          longRestFor(character.id, update);
          window.dispatchEvent(new CustomEvent('hifi-toast', { detail: { msg: tt(lang, 'slots.rested') } }));
        }}
        title={tt(lang, 'slots.longRestTitle')}
        style={{ fontSize: 11, color: 'var(--subtext0)', padding: '2px 8px', flexShrink: 0 }}
      >🌙 {tt(lang, 'slots.longRest')}</button>
    </div>
  );
}

// ──────────────────────────────────────────────────────────────────
// SPELL CARD (shared)
// ──────────────────────────────────────────────────────────────────
const HifiSpellCard = React.memo(function HifiSpellCard({ s, lang, prepared, bookmarked, selected, onClick, onTogglePrepared, compact }) {
  const tier = tierSymbol(s.lvl);
  const desc = window.v8Description ? window.v8Description(s, lang) : '';
  // HTML cru da fonte (preserva parágrafos); '' quando só há texto puro.
  const descHtml = window.v8DescriptionHtml ? window.v8DescriptionHtml(s, lang) : '';
  const comps = (s.comp || '').split(/\s+/).filter(Boolean);
  return (
    <div
      className={`hifi-card${selected ? ' selected' : ''}${compact ? ' compact' : ''}`}
      style={{
        position: 'relative',
        // visible (não hidden) pra o ribbon poder cobrir a borda do topo.
        // O texto/descrição têm seu próprio overflow:hidden, então nada vaza.
        overflow: 'visible',
        padding: compact
          ? 'calc(10px * var(--z, 1)) calc(12px * var(--z, 1))'
          : 'calc(12px * var(--z, 1)) calc(14px * var(--z, 1))',
        display: 'flex', flexDirection: 'column', gap: 'calc(4px * var(--z, 1))',
      }}
    >
      {/* Alvo de clique + foco de teclado do card inteiro: um <button>
          transparente que cobre o card (z-index:1, ABAIXO do ribbon z-index:3),
          tornando-o operável por teclado (Tab + Enter/Espaço). aria-label = nome
          da magia, pra o leitor de tela anunciar o que o card abre. */}
      <button
        type="button"
        className="hifi-card-open"
        onClick={onClick}
        aria-label={spellName(s, lang)}
      />
      {/* Ribbon = toggle de "preparada". Sempre clicável; o clique não abre o
          detalhe (stopPropagation). Preenchido quando preparada; fantasma sutil
          (clique pra marcar) quando não. */}
      <button
        type="button"
        onClick={(e) => { e.stopPropagation(); onTogglePrepared && onTogglePrepared(); }}
        className={`hifi-card-ribbon ${prepared ? 'on' : 'off'}`}
        aria-pressed={prepared}
        aria-label={prepared
          ? (tt(lang, 'spell.unprepare'))
          : (tt(lang, 'spell.prepare'))}
        title={prepared
          ? (tt(lang, 'spell.unprepare'))
          : (tt(lang, 'spell.prepare'))}
      >
        <svg viewBox="0 0 20 28" preserveAspectRatio="xMidYMin meet" aria-hidden="true" strokeLinejoin="round">
          {/* Path ABERTO (sem o segmento do topo): o stroke desenha só os lados
             e o V — sem o traço que sobreporia a borda do card. O fill (estado
             "preparada") fecha o contorno sozinho, então a fita cheia fica igual. */}
          <path d="M0 0 L0 27 L10 20 L20 27 L20 0"/>
        </svg>
        {/* Marca de "favorita": estrela centrada dentro do ribbon. É só
            indicador — o clique no ribbon continua sendo o toggle de preparada
            (pointer-events: none deixa o clique passar pro div pai).
            Preparada: cor do fundo do card (recorte na fita de acento).
            Só favoritada: amarela, visível sobre o ribbon fantasma. */}
        {bookmarked && (
          <span aria-hidden="true" style={{
            position: 'absolute', top: 'calc(4px * var(--z, 1))', left: 0, right: 0, textAlign: 'center',
            fontSize: 'calc(10px * var(--z, 1))', lineHeight: 1, pointerEvents: 'none',
            color: prepared ? 'var(--surface0)' : 'var(--yellow)',
          }}>★</span>
        )}
      </button>
      <div style={{ display: 'flex', alignItems: 'baseline', gap: 'calc(8px * var(--z, 1))', paddingRight: prepared ? 'calc(42px * var(--z, 1))' : 0, minWidth: 0, flexShrink: 0 }}>
        <HifiSpellName size={compact ? 'calc(16px * var(--z, 1))' : 'calc(17px * var(--z, 1))'} style={{
          display: '-webkit-box',
          WebkitLineClamp: 1,
          WebkitBoxOrient: 'vertical',
          overflow: 'hidden',
        }}>{spellName(s, lang)}</HifiSpellName>
      </div>
      <div style={{
        fontStyle: 'italic', fontSize: 'calc(12px * var(--z, 1))', color: 'var(--subtext0)',
        fontFamily: "'Marauder Text', Georgia, serif",
        display: 'flex', alignItems: 'center', gap: 'calc(6px * var(--z, 1))',
        whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
        flexShrink: 0,
      }}>
        <span>{schoolKey(s.school)}</span>
        <span style={{ color: 'var(--overlay0)' }}>·</span>
        <span
          title={s.lvl === 0 ? (tt(lang, 'spell.cantrip')) : `${tt(lang, 'spell.level')} ${s.lvl}`}
          style={{
            color: `var(--level-${s.lvl})`,
            fontFamily: "'JetBrains Mono', ui-monospace, monospace",
            fontStyle: 'normal',
            letterSpacing: '0.06em',
            fontSize: 'calc(11px * var(--z, 1))',
            fontWeight: 600,
          }}>{tier}</span>
      </div>
      {(descHtml || desc) && (
        // Preenche todo o espaço livre entre o meta e o rodapé; o texto que
        // ultrapassa é clipado e dissolvido pelo fade-out (::after no CSS).
        <div className="hifi-card-desc" style={{
          fontSize: compact ? 'calc(11.5px * var(--z, 1))' : 'calc(12.5px * var(--z, 1))',
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
                title={letter === 'V' ? (tt(lang, 'comp.verbal'))
                  : letter === 'S' ? (tt(lang, 'comp.somatic'))
                  : (tt(lang, 'comp.material'))}
              >{letter}</span>
            );
          })}
        </div>
        <span className="hifi-card-meta-sep">·</span>
        <span className="hifi-card-meta-text" title={tt(lang, 'spell.range')}>{s.range}</span>
        {s.src && <>
          <span className="hifi-card-meta-sep">·</span>
          <span className="hifi-card-meta-text" title={tt(lang, 'spell.source')}>{s.src}</span>
        </>}
        {(s.rit || s.conc) && <span style={{ flex: 1 }}/>}
        {s.conc && <span className="hifi-card-flag" style={{ color: 'var(--yellow)' }} title={tt(lang, 'spell.concentration')}>C</span>}
        {s.rit && <span className="hifi-card-flag" style={{ color: 'var(--peach)' }} title={tt(lang, 'spell.ritual')}>R</span>}
      </div>
    </div>
  );
}, (prev, next) =>
  // ponytail: compara só os props de dados — os callbacks são arrows recriadas
  // a cada render, então incluí-los anularia o memo. Eles só capturam valores
  // estáveis (índice via functional update, ids), então ignorar é seguro.
  prev.s === next.s && prev.lang === next.lang && prev.prepared === next.prepared &&
  prev.bookmarked === next.bookmarked && prev.selected === next.selected && prev.compact === next.compact
);

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

// Círculo máximo que o personagem alcança, a partir das classes/níveis.
// ponytail: heurística por tipo de conjurador (completo ceil(L/2), metade
// ceil(L/4), bruxo ceil(L/2) até 5). Multiclasse pega o maior valor — a regra
// oficial de combinar níveis fica pra quando alguém sentir falta.
const HIFI_FULL_CASTERS = ['bard', 'cleric', 'druid', 'sorcerer', 'wizard'];
const HIFI_HALF_CASTERS = ['paladin', 'ranger', 'artificer'];
function hifiMaxCircle(classLevels) {
  let max = 0;
  (classLevels || []).forEach(({ class: c, level: L }) => {
    let m = 0;
    if (HIFI_FULL_CASTERS.includes(c)) m = Math.min(9, Math.ceil(L / 2));
    else if (c === 'warlock') m = Math.min(5, Math.ceil(L / 2));
    else if (HIFI_HALF_CASTERS.includes(c)) m = Math.min(5, Math.ceil(L / 4));
    if (m > max) max = m;
  });
  return max;
}

// Config de filtros — fonte única usada pelo motor (accessor `get`) e pela UI
// (label + valores). `base: true` = sempre visível; o resto entra via "+ mais".
// `derive: true` = os valores selecionáveis vêm dos próprios dados (JSON).
function hifiFilterConfig(lang) {

  const bool = b => (b ? (tt(lang, 'value.yes')) : (tt(lang, 'value.no')));
  return {
    level:  { label: tt(lang, 'spell.level'),   base: true, get: s => [s.lvl === 0 ? 'truque' : String(s.lvl)], values: ['truque','1','2','3','4','5','6','7','8','9'] },
    school: { label: tt(lang, 'spell.school'),  base: true, get: s => [schoolKey(s.school)], values: ['evoc','conj','abjur','ench','ilus','div','necr','trans'] },
    class:  { label: tt(lang, 'spell.class'),   base: true, get: s => (s.classes || []) },
    comp:   { label: tt(lang, 'spell.component'), get: s => (s.comp || '').split(/\s+/).filter(Boolean), values: ['V', 'S', 'M'] },
    conc:   { label: tt(lang, 'spell.concentration'), get: s => [bool(s.conc)], values: [bool(true), bool(false)] },
    rit:    { label: tt(lang, 'spell.ritual'),  get: s => [bool(s.rit)], values: [bool(true), bool(false)] },
    time:   { label: tt(lang, 'spell.castTime'), derive: true, get: s => (s.time ? [s.time] : []) },
    dur:    { label: tt(lang, 'spell.duration'), derive: true, get: s => (s.dur ? [s.dur] : []) },
    range:  { label: tt(lang, 'spell.range'),  derive: true, get: s => (s.range ? [s.range] : []) },
    src:    { label: tt(lang, 'spell.source'),   derive: true, get: s => (s.src ? [s.src] : []) },
  };
}

function hifiFilterValues(key, allSpells, lang) {
  const cfg = hifiFilterConfig(lang);
  const def = cfg[key];
  if (!def) return [];
  if (def.values) return def.values;

  const values = new Set();
  (allSpells || []).forEach(s => {
    def.get(s).forEach(v => {
      if (v) values.add(v);
    });
  });

  return [...values].sort((a, b) =>
    String(a).localeCompare(String(b), lang === 'ptbr' ? 'pt' : 'en', { numeric: true })
  );
}

function hifiSchoolFilterLabel(value, lang) {
  const idx = SCHOOL_KEYS.indexOf(value);
  return idx >= 0 ? schoolName(idx, lang) : value;
}

function hifiTitleCaseFilterLabel(value) {
  const s = String(value || '');
  return s ? s.charAt(0).toUpperCase() + s.slice(1) : s;
}

function useHifiAppState(preparedKeys, initialFilters, character) {
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

  // Começa sem nenhum filtro aplicado (mostra todas as magias) — o usuário
  // refina a partir do conjunto completo. Exceção: um link compartilhado
  // (?q= / ?f.*= / ?prep=) restaura a visão de quem compartilhou.
  const urlView = React.useMemo(() => {
    try {
      const p = new URL(window.location.href).searchParams;
      const view = { q: p.get('q') || '', prep: p.get('prep') === '1', filters: {}, any: false };
      p.forEach((val, key) => {
        if (key.startsWith('f.')) { view.filters[key.slice(2)] = new Set(val.split('|').filter(Boolean)); view.any = true; }
      });
      view.any = view.any || !!view.q || view.prep;
      return view;
    } catch (e) { return { q: '', prep: false, filters: {}, any: false }; }
  }, []);
  const [filters, setFilters] = React.useState(() => ({
    class: new Set(),
    level: new Set(),
    school: new Set(),
    ...(initialFilters || {}),
    ...urlView.filters,
  }));
  const [query, setQuery] = React.useState(urlView.q);
  const [selectedIdx, setSelectedIdx] = React.useState(null);
  // Quando ligado, mostra só as magias preparadas do personagem ativo.
  const [onlyPrepared, setOnlyPrepared] = React.useState(urlView.prep);
  // Link com visão explícita: o auto-filtro do personagem não sobrescreve no boot.
  const skipCharFilterRef = React.useRef(urlView.any);

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

  // Auto-filtro pelo personagem: com classes definidas, pré-aplica os chips de
  // classe e de nível (truque + círculos que ele alcança). São filtros normais
  // e visíveis — o usuário pode limpar/ajustar; reaplicam quando o personagem
  // (ou as classes dele) muda. A assinatura ignora mudanças irrelevantes do
  // personagem (gastar slot, preparar magia) pra não brigar com o usuário.
  const charClassSig = JSON.stringify(character?.classes || []);
  React.useEffect(() => {
    // URL trouxe filtros/busca explícitos → essa visão vence o auto-filtro
    // (só neste boot; trocar de personagem depois reaplica normalmente).
    if (skipCharFilterRef.current) { skipCharFilterRef.current = false; return; }
    const cls = character?.classes || [];
    if (!cls.length) return;
    const dict = window.CLASS_PT || {};
    const classSet = new Set(cls.map(c => (versionLang === 'ptbr' ? (dict[c.class] || c.class) : c.class)));
    const maxC = hifiMaxCircle(cls);
    const levelSet = new Set(['truque']);
    for (let i = 1; i <= maxC; i++) levelSet.add(String(i));
    setFilters(prev => ({ ...prev, class: classSet, level: levelSet }));
    setSelectedIdx(null);
  }, [charClassSig]);

  // ?spell=<slug> (link de magia compartilhado): quando as magias carregarem,
  // zera busca/filtros (a magia precisa estar na lista pra ser selecionável),
  // seleciona o detalhe e tira o parâmetro da URL.
  const spellParamRef = React.useRef(null);
  if (spellParamRef.current === null) {
    try { spellParamRef.current = new URL(window.location.href).searchParams.get('spell') || ''; }
    catch (e) { spellParamRef.current = ''; }
  }
  React.useEffect(() => {
    const slug = spellParamRef.current;
    if (!slug || !allSpells.length) return;
    spellParamRef.current = '';
    const target = allSpells.find(s => hifiSpellSlug(s) === slug);
    try {
      const url = new URL(window.location.href);
      url.searchParams.delete('spell');
      history.replaceState(null, '', url.pathname + (url.searchParams.toString() ? '?' + url.searchParams.toString() : ''));
    } catch (e) {}
    if (!target) return;
    setQuery('');
    setOnlyPrepared(false);
    setFilters(prev => { const next = {}; Object.keys(prev).forEach(k => { next[k] = new Set(); }); return next; });
    // Replica a ordenação do `filtered` sem filtros pra achar o índice certo.
    const collator = versionLang === 'ptbr' ? 'pt' : 'en';
    const sorted = [...allSpells].sort((a, b) =>
      (a.lvl - b.lvl) || (spellName(a, versionLang) || '').localeCompare(spellName(b, versionLang) || '', collator)
    );
    setSelectedIdx(sorted.findIndex(s => hifiSpellSlug(s) === slug));
  }, [allSpells]);

  const filtered = React.useMemo(() => {
    let out = allSpells || [];
    if (query.trim()) {
      const q = hifiNorm(query.trim());
      out = out.filter(s =>
        hifiNorm(spellName(s, versionLang)).includes(q) || hifiNorm(s.en).includes(q)
      );
    }
    // Aplica todo filtro ativo genericamente: a magia passa se algum dos seus
    // valores (def.get) estiver na seleção. Cobre os filtros base (classe/nível/
    // escola) e quaisquer filtros extras adicionados via "+ mais".
    const cfg = hifiFilterConfig(versionLang);
    Object.keys(filters).forEach(key => {
      const sel = filters[key];
      const def = cfg[key];
      if (sel && sel.size && def) {
        out = out.filter(s => def.get(s).some(v => sel.has(v)));
      }
    });
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
// EMPTY STATE (shared) — mostrado quando busca + filtros não retornam nada.
// Composto (não só um vazio em branco) e indica como popular: limpar filtros.
// ──────────────────────────────────────────────────────────────────
function HifiEmptyState({ lang, onClear }) {
  return (
    <div style={{
      height: '100%', minHeight: 240,
      display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
      textAlign: 'center', gap: 12, padding: '40px 24px',
    }}>
      <div aria-hidden="true" style={{ fontSize: 32, lineHeight: 1, color: 'var(--overlay0)' }}>✦</div>
      <div className="hifi-display" style={{ fontSize: 22, color: 'var(--subtext1)' }}>
        {tt(lang, 'empty.title')}
      </div>
      <p style={{ margin: 0, fontSize: 14, maxWidth: '40ch', lineHeight: 1.5, color: 'var(--subtext0)' }}>
        {tt(lang, 'empty.body')}
      </p>
      {onClear && (
        <button className="hifi-btn-secondary" onClick={onClear}>
          {tt(lang, 'filter.clearAll')}
        </button>
      )}
    </div>
  );
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
        <HifiStat label={tt(lang, 'spell.cast')} value={s.time}/>
        <HifiStat label={tt(lang, 'spell.range')} value={s.range}/>
        <HifiStat label={tt(lang, 'spell.duration')} value={s.dur}/>
        <HifiStat label={tt(lang, 'spell.components')} value={s.comp}/>
      </div>

      {/* Description */}
      <div>
        <HifiSectionLabel>{tt(lang, 'spell.description')}</HifiSectionLabel>
        {descHtml
          ? <div className="hifi-rich" style={{ margin: '8px 0 0', fontSize: 15, lineHeight: 1.6, color: 'var(--text)' }} dangerouslySetInnerHTML={{ __html: descHtml }}/>
          : <p style={{ margin: '8px 0 0', fontSize: 15, lineHeight: 1.6, textWrap: 'pretty', color: 'var(--text)' }}>{desc}</p>}
      </div>

      {/* Upgrade — só aparece se a magia tiver essa info na fonte. */}
      {(upgradeHtml || (upgrade && upgrade.trim())) && (
        <div>
          <HifiSectionLabel>{tt(lang, 'spell.higherLevelsLabel')}</HifiSectionLabel>
          {upgradeHtml
            ? <div className="hifi-rich" style={{ margin: '8px 0 0', fontSize: 14, lineHeight: 1.6, color: 'var(--subtext1)', fontStyle: 'italic' }} dangerouslySetInnerHTML={{ __html: upgradeHtml }}/>
            : <p style={{ margin: '8px 0 0', fontSize: 14, lineHeight: 1.6, textWrap: 'pretty', color: 'var(--subtext1)', fontStyle: 'italic' }}>{upgrade}</p>}
        </div>
      )}

      {/* Classes */}
      <div>
        <HifiSectionLabel>{tt(lang, 'spell.classes')}</HifiSectionLabel>
        <p style={{ margin: '8px 0 0', fontSize: 15, lineHeight: 1.6, color: 'var(--text)' }}>
          {(s.classes || []).map(c => c ? c.charAt(0).toUpperCase() + c.slice(1) : c).join(', ')}
        </p>
      </div>

      {/* Source */}
      <div>
        <HifiSectionLabel>{tt(lang, 'spell.source')}</HifiSectionLabel>
        <div style={{ marginTop: 6, fontSize: 13, color: 'var(--subtext0)', fontStyle: 'italic' }}>
          {s.src} · {s.edition || '5e 2014'}
        </div>
      </div>
    </div>
  );
}

// ──────────────────────────────────────────────────────────────────
// COMPARADOR DE EDIÇÕES — vê a mesma magia na outra edição (2014 ↔ 2024),
// no mesmo idioma. Carrega a outra versão sob demanda (cache do loader) e
// casa a magia pelo nome em inglês (estável entre edições).
// ──────────────────────────────────────────────────────────────────
function useEditionCompare(sel, versionKey, versions, lang, showToast) {
  const [alt, setAlt] = React.useState(null); // { spell, version } quando ativo
  const [loading, setLoading] = React.useState(false);
  // Trocar de magia ou de versão desliga a comparação.
  React.useEffect(() => { setAlt(null); }, [sel, versionKey]);
  const cur = versions.find(v => v.key === versionKey) || null;
  const other = cur ? (versions.find(v => v.lang === cur.lang && v.key !== cur.key) || null) : null;
  const toggle = React.useCallback(async () => {
    if (alt) { setAlt(null); return; }
    if (!sel || !other || loading) return;
    setLoading(true);
    try {
      const spells = await window.loadSpellVersion(other.key);
      const spell = spells.find(s => hifiNorm(s.en) === hifiNorm(sel.en))
        || spells.find(s => hifiNorm(s.pt) === hifiNorm(sel.pt));
      if (spell) setAlt({ spell, version: other });
      else showToast(tt(lang, 'compare.notFound', { edition: other.short }), 'err');
    } finally {
      setLoading(false);
    }
  }, [alt, sel, other, loading, lang, showToast]);
  return { alt, cur, other, toggle, loading };
}

// Botão-link que alterna a comparação (usado no detalhe desktop e mobile).
function HifiCompareButton({ compare, lang, style }) {
  if (!compare.other) return null;
  return (
    <button
      className="hifi-btn-ghost"
      onClick={compare.toggle}
      disabled={compare.loading}
      style={{ fontSize: 12, color: 'var(--accent)', padding: '2px 0', alignSelf: 'flex-start', ...style }}
    >
      {compare.alt
        ? `↩ ${tt(lang, 'compare.back', { edition: compare.cur?.short || '' })}`
        : `⇄ ${tt(lang, 'compare.view', { edition: compare.other.short })}`}
    </button>
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
  const { bookmarks } = useBookmarks();
  // Pick the live character from the store (matched by id or name from prop fallback)
  const liveChar = React.useMemo(() => {
    if (!character) return chars[0];
    return chars.find(c => c.id === character.id)
        || chars.find(c => c.name === character.name)
        || chars[0];
  }, [chars, character]);
  const charWithAccent = hifiAccentsFor(liveChar, theme);
  const accent = dark ? charWithAccent.accent_dark : charWithAccent.accent;

  // Preparadas: por personagem (store-backed). Favoritas: lista GLOBAL,
  // independente do personagem ativo. Computados antes do hook pra alimentar o
  // filtro "só preparadas".
  const prepared = React.useMemo(() => new Set(liveChar?.prepared || []), [liveChar]);
  const bookmarked = React.useMemo(() => new Set(bookmarks), [bookmarks]);

  const state = useHifiAppState(prepared, undefined, liveChar);
  const { allSpells, filtered, filters, setFilters, query, setQuery,
    selectedIdx, setSelectedIdx, onlyPrepared, setOnlyPrepared,
    versionKey, switchVersion, versions, versionLang } = state;
  const { toast, show: showToast } = useHifiToast();

  const [charMenuOpen, setCharMenuOpen] = React.useState(false);
  // Editor state: null | { charId } where charId === null means create mode
  const [editor, setEditor] = React.useState(null);

  const charMenuTransition = window.useHifiTransition(charMenuOpen, 240);
  const editorTransition = window.useHifiTransition(!!editor, 240);

  // A11y do menu de personagem (modal): foco preso, Escape fecha, foco volta ao
  // botão que o abriu. window.useDialogA11y vem do v11 (carrega antes deste).
  const charMenuRef = React.useRef(null);
  window.useDialogA11y(charMenuRef, charMenuOpen, () => setCharMenuOpen(false));

  // Ref da grade de cards — usada pra medir quantas colunas há agora (grade
  // responsiva) e pra rolar o card selecionado pra dentro da vista na navegação.
  const gridRef = React.useRef(null);

  const sel = selectedIdx !== null ? filtered[selectedIdx] : null;
  const open = !!sel;
  const detailTransition = window.useHifiTransition(open, 240);
  const compare = useEditionCompare(sel, versionKey, versions, lang, showToast);
  // O que o painel exibe: a magia selecionada ou a versão dela na outra edição.
  // Retém a última magia durante a animação de saída (sel=null com o painel
  // ainda montado), senão spellName(null) crasheia — mesmo fix do mobile.
  const lastSelRef = React.useRef(null);
  if (sel) lastSelRef.current = sel;
  // actionSpell = magia da VERSÃO ATUAL (chaves de preparar/favoritar);
  // shownSpell pode ser a da outra edição (comparador), só pra exibição.
  const actionSpell = sel || lastSelRef.current;
  const shownSpell = compare.alt?.spell || actionSpell;

  React.useEffect(() => {
    if (selectedIdx !== null && selectedIdx >= filtered.length) setSelectedIdx(null);
  }, [filtered.length, selectedIdx, setSelectedIdx]);

  React.useEffect(() => {
    if (!open) return;
    const onKey = (e) => {
      // Não sequestrar o teclado enquanto o usuário digita (busca) nem atalhos
      // do navegador (Ctrl/Cmd/Alt + tecla).
      const t = e.target;
      if (t && (t.tagName === 'INPUT' || t.tagName === 'TEXTAREA' || t.isContentEditable)) return;
      if (e.ctrlKey || e.metaKey || e.altKey) return;
      const len = filtered.length;
      if (len === 0) return;
      // Quantas colunas a grade tem AGORA (responsiva via auto-fill) — pra cima/
      // baixo pularem uma LINHA inteira. Conta os tracks já resolvidos em px.
      const cols = () => {
        const g = gridRef.current;
        if (!g) return 1;
        return Math.max(1, getComputedStyle(g).gridTemplateColumns.split(' ').filter(Boolean).length);
      };
      switch (e.key) {
        case 'Escape': setSelectedIdx(null); break;
        case 'ArrowRight': e.preventDefault(); setSelectedIdx(i => ((i ?? -1) + 1) % len); break;
        case 'ArrowLeft':  e.preventDefault(); setSelectedIdx(i => ((i ?? 0) - 1 + len) % len); break;
        case 'ArrowDown':  e.preventDefault(); { const c = cols(); setSelectedIdx(i => Math.min((i ?? -c) + c, len - 1)); } break;
        case 'ArrowUp':    e.preventDefault(); { const c = cols(); setSelectedIdx(i => Math.max((i ?? c) - c, 0)); } break;
        case 'f': case 'F': if (sel) toggleBook(sel); break;  // F = favoritar
        case 'g': case 'G': if (sel) togglePrep(sel); break;  // G = preparar
        default: break;
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, filtered.length, sel, liveChar, update, setSelectedIdx]);

  // Mantém o card selecionado visível ao navegar pelo teclado (sem rolar se já
  // estiver à vista — block:'nearest').
  React.useEffect(() => {
    if (selectedIdx == null || !gridRef.current) return;
    const el = gridRef.current.children[selectedIdx];
    if (el && el.scrollIntoView) el.scrollIntoView({ block: 'nearest' });
  }, [selectedIdx]);

  function togglePrep(s) {
    if (!liveChar) return;
    togglePreparedFor(liveChar.id, hifiSpellKey(s), update);
  }
  function toggleBook(s) {
    // Favoritas são globais — não dependem do personagem ativo.
    toggleBookmark(hifiSpellKey(s));
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
  // Filtros extras (desktop): além de classe/nível/escola, o usuário adiciona
  // outros campos dos JSONs via "+ mais". `extraFilters` = chaves ativas (ordem).
  const [extraFilters, setExtraFilters] = React.useState([]);
  const filterCfg = React.useMemo(() => hifiFilterConfig(versionLang), [versionLang]);
  const filterCats = React.useMemo(() => ([
    { key: 'level',  label: tt(lang, 'spell.level'),  values: hifiFilterValues('level', allSpells, versionLang) },
    { key: 'school', label: tt(lang, 'spell.school'), values: hifiFilterValues('school', allSpells, versionLang), formatValue: v => hifiSchoolFilterLabel(v, versionLang) },
    { key: 'class',  label: tt(lang, 'spell.class'),  values: hifiFilterValues('class', allSpells, versionLang), formatValue: v => hifiTitleCaseFilterLabel(v) },
  ]), [lang, allSpells, versionLang]);
  // Valores selecionáveis de cada extra: estáticos (config) ou derivados
  // (distintos + ordenados) dos próprios dados quando `derive`.
  const extraValues = React.useMemo(() => {
    const out = {};
    Object.keys(filterCfg).forEach(key => {
      const def = filterCfg[key];
      if (def.base) return;
      if (def.values) out[key] = def.values;
      else if (def.derive) {
        const set = new Set();
        (allSpells || []).forEach(s => def.get(s).forEach(v => v && set.add(v)));
        out[key] = [...set].sort((a, b) => String(a).localeCompare(String(b), versionLang === 'ptbr' ? 'pt' : 'en', { numeric: true }));
      }
    });
    return out;
  }, [filterCfg, allSpells, versionLang]);
  const addExtraFilter = (key) => {
    setExtraFilters(list => list.includes(key) ? list : [...list, key]);
    setFilters(p => (p[key] ? p : { ...p, [key]: new Set() }));
  };
  const removeExtraFilter = (key) => {
    setExtraFilters(list => list.filter(k => k !== key));
    setFilters(p => { const n = { ...p }; delete n[key]; return n; });
  };
  const availableExtras = Object.keys(filterCfg).filter(k => !filterCfg[k].base && !extraFilters.includes(k));

  return (
    <div className={`hifi hifi-desktop ${themeClass}`} style={{ ...containerStyle, width, height, display: 'flex', flexDirection: 'column', position: 'relative' }}>
      {/* Header */}
      <header style={{ padding: '18px 28px', borderBottom: '1px solid var(--surface1)', display: 'flex', alignItems: 'center', gap: 10, flexShrink: 0 }}>
        {/* Identidade + seletor: "Grimório de <nome>" onde o nome (na accent) é
            clicável e abre o menu de trocar / editar / novo. O título continua
            sendo o herói — agora também é a navegação de personagem. */}
        <div style={{ position: 'relative', display: 'flex', alignItems: 'baseline', gap: 10 }}>
          {(() => {
            const heroWord = window.makeT(lang)('title.spellbook');
            const name = hifiCharName(liveChar, lang);
            const heroSpan = <span className="hifi-display" style={{ fontSize: 26, color: 'var(--text)' }}>{heroWord}</span>;
            const charBtn = liveChar?.name && (
              <button
                onClick={() => setCharMenuOpen(o => !o)}
                className="hifi-char-title hifi-display"
                title={window.makeT(lang)('char.switchEdit')}
                style={{
                  background: 'none', border: 'none', padding: 0, cursor: 'pointer',
                  fontSize: 26, color: accent, letterSpacing: '0.04em',
                }}
              >{lang === 'ptbr' ? <>de {name} </> : <>{name}'s </>}<span style={{ fontSize: 15 }}>▾</span></button>
            );
            // PT: "Grimório de <nome>" · EN: "<nome>'s Spellbook" (ordem inverte)
            return lang === 'ptbr' ? <>{heroSpan}{charBtn}</> : <>{charBtn}{heroSpan}</>;
          })()}
          {charMenuTransition.mounted && (
            <div onClick={() => setCharMenuOpen(false)} className={charMenuOpen ? 'hifi-fade-in' : charMenuTransition.cls} style={{
              position: 'fixed', inset: 0, zIndex: 70,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              background: 'rgba(0,0,0,0.4)',
            }}>
              <div
                ref={charMenuRef}
                role="dialog" aria-modal="true"
                aria-label={tt(lang, 'char.switch')}
                tabIndex={-1}
                onClick={(e) => e.stopPropagation()}
                className={charMenuOpen ? 'hifi-scale-in' : charMenuTransition.cls}
                style={{
                background: 'var(--mantle)', border: '1px solid var(--surface1)', borderRadius: 8,
                minWidth: 280, padding: '4px 0',
                boxShadow: '0 16px 48px rgba(0,0,0,0.3)',
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
                        <span style={{ flex: 1 }}>{hifiCharName(c, lang)}</span>
                        {isCurrent && <span style={{ color: accent, fontSize: 12 }}>✓</span>}
                      </button>
                      <button
                        onClick={() => { setCharMenuOpen(false); setEditor({ charId: c.id }); }}
                        className="hifi-btn-ghost"
                        title={tt(lang, 'char.edit')}
                        style={{ padding: '4px 10px', fontSize: 11, color: 'var(--subtext0)' }}>
                        {tt(lang, 'char.edit')}
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
                  <span>{tt(lang, 'char.new')}</span>
                </button>
              </div>
            </div>
          )}
        </div>
        <div style={{ flex: 1 }}/>
        {/* Ações do personagem ativo — texto puro (sem ícone, sem invólucro de
            botão), pra não competir com o título. */}
        <button
          onClick={() => {
            const preparedSet = new Set(liveChar?.prepared || []);
            const preparedSpells = allSpells.filter(s => preparedSet.has(hifiSpellKey(s)));
            hifiPrintPrepared(preparedSpells, lang, showToast, { character: liveChar });
          }}
          className="hifi-link-action"
          title={tt(lang, 'action.printPreparedTitle')}
        >{tt(lang, 'action.printPrepared')}</button>
        <button
          onClick={() => window.__shareBuild && window.__shareBuild()}
          className="hifi-link-action"
          title={tt(lang, 'action.shareBuildTitle')}
        >{tt(lang, 'action.shareBuild')}</button>
      </header>

      {/* Filter bar */}
      <div style={{ padding: '12px 28px', display: 'flex', gap: 10, alignItems: 'center', borderBottom: '1px solid var(--surface1)', flexShrink: 0 }}>
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder={tt(lang, 'filter.searchSpells')}
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
              formatValue={cat.formatValue}
              onToggle={(v) => toggleFilter(cat.key, v)}
              onClear={() => setFilters(p => ({ ...p, [cat.key]: new Set() }))}
              lang={lang}
            />
          </div>
        ))}
        {extraFilters.map(key => (
          <div key={key} style={{ position: 'relative' }}>
            <FilterChipDropdown
              label={filterCfg[key].label}
              count={filters[key]?.size || 0}
              values={extraValues[key] || []}
              selected={filters[key] || new Set()}
              onToggle={(v) => toggleFilter(key, v)}
              onClear={() => setFilters(p => ({ ...p, [key]: new Set() }))}
              onRemove={() => removeExtraFilter(key)}
              lang={lang}
            />
          </div>
        ))}
        {availableExtras.length > 0 && (
          <HifiAddFilter available={availableExtras} cfg={filterCfg} onAdd={addExtraFilter} lang={lang}/>
        )}
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
          className={`hifi-filter-chip icon-only${onlyPrepared ? ' active' : ''}`}
          style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}
          aria-pressed={onlyPrepared}
          aria-label={tt(lang, 'action.onlyPrepared')}
          title={tt(lang, 'action.onlyPrepared')}
        >
          <span style={{ color: onlyPrepared ? 'var(--accent)' : 'inherit', display: 'inline-flex' }}><HifiBookmarkIcon size={14}/></span>
        </button>
        <div style={{ flex: 1 }}/>
        <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 11, color: 'var(--subtext0)' }}>
          {filtered.length} {tt(lang, 'filter.results')}
        </span>
      </div>

      {/* Espaços de magia do personagem ativo (some quando não configurados) */}
      <HifiSlotTracker
        character={liveChar} update={update} lang={lang}
        style={{ padding: '8px 28px', borderBottom: '1px solid var(--surface1)', flexShrink: 0 }}
      />

      {/* Grid + panel */}
      <div style={{ flex: 1, display: 'flex', minHeight: 0, overflow: 'hidden' }}>
        <div style={{ flex: 1, overflow: 'auto', padding: '20px 28px' }}>
          {filtered.length === 0 ? (
            <HifiEmptyState lang={lang} onClear={() => {
              setQuery('');
              setOnlyPrepared(false);
              setFilters(prev => {
                const next = {};
                Object.keys(prev).forEach(k => { next[k] = new Set(); });
                return next;
              });
            }}/>
          ) : (
          <div ref={gridRef} style={{
            display: 'grid',
            // Escala de 20% via custom property `--z` + calc() (substitui o antigo
            // `zoom: 1.2`, que era CSS não-padrão). `--z` cascateia pros cards;
            // como largura (minmax) e altura (no CSS) escalam pelo mesmo fator,
            // o aspect ratio é preservado e as colunas refluem — igual ao zoom.
            // Valores-base em px: 253 / 307 (coluna), 12 (gap).
            '--z': 1.2,
            gridTemplateColumns: open
              ? 'repeat(auto-fill, minmax(calc(253px * var(--z)), 1fr))'
              : 'repeat(auto-fill, minmax(calc(307px * var(--z)), 1fr))',
            gap: 'calc(12px * var(--z))',
          }}>
            {filtered.map((s, i) => (
              <HifiSpellCard
                key={hifiSpellKey(s)} s={s} lang={lang}
                prepared={prepared.has(hifiSpellKey(s))}
                bookmarked={bookmarked.has(hifiSpellKey(s))}
                selected={i === selectedIdx}
                onClick={() => setSelectedIdx(prev => (prev === i ? null : i))}
                onTogglePrepared={() => togglePrep(s)}
              />
            ))}
          </div>
          )}
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
          {detailTransition.mounted && (
            <div className={open ? 'hifi-slide-in-right' : detailTransition.cls}>
              <>
                <div className="hifi-panel-header">
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <HifiSpellName size={26}>{spellName(shownSpell, lang)}</HifiSpellName>
                    <div style={{ flex: 1 }}/>
                    {/* Botões deslocados ~6px pra baixo: alinhamento óptico com o
                        título serifado (o centro matemático fica visualmente alto). */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0, marginTop: 6 }}>
                      <button
                        className="hifi-icon-btn"
                        onClick={() => toggleBook(actionSpell)}
                        aria-pressed={bookmarked.has(hifiSpellKey(actionSpell))}
                        aria-label={tt(lang, 'spell.bookmark')}
                        title={tt(lang, 'spell.bookmark')}
                        style={{ flexShrink: 0, fontSize: 16, color: bookmarked.has(hifiSpellKey(actionSpell)) ? 'var(--yellow)' : 'var(--subtext0)' }}
                      ><span aria-hidden="true">{bookmarked.has(hifiSpellKey(actionSpell)) ? '★' : '☆'}</span></button>
                      <button
                        className="hifi-icon-btn"
                        onClick={() => hifiCopyLink(actionSpell, lang, showToast)}
                        aria-label={tt(lang, 'spell.copyLink')}
                        title={tt(lang, 'spell.copyLink')}
                        style={{ flexShrink: 0, color: 'var(--subtext0)' }}
                      ><HifiLinkIcon size={15}/></button>
                      <button
                        className="hifi-icon-btn"
                        onClick={() => setSelectedIdx(null)}
                        aria-label={tt(lang, 'nav.close')}
                        title={tt(lang, 'nav.close')}
                        style={{ flexShrink: 0 }}
                      ><span aria-hidden="true">×</span></button>
                    </div>
                  </div>
                  <div style={{ marginTop: 4, fontSize: 13, color: 'var(--subtext0)', fontStyle: 'italic' }}>
                    {schoolName(shownSpell.school, lang)} · {shownSpell.lvl === 0 ? (tt(lang, 'spell.cantrip')) : `${tt(lang, 'spell.level')} ${shownSpell.lvl}`}
                    {shownSpell.conc && <span> · <span style={{ color: 'var(--yellow)' }}>{tt(lang, 'spell.concentration')}</span></span>}
                    {shownSpell.rit && <span> · <span style={{ color: 'var(--peach)' }}>ritual</span></span>}
                  </div>
                  <HifiCompareButton compare={compare} lang={lang} style={{ marginTop: 6 }}/>
                </div>
                <div style={{ flex: 1, overflow: 'auto' }}>
                  <HifiDetailContent s={shownSpell} lang={lang}/>
                </div>
                {/* Rodapé: marcador de posição da magia na lista filtrada. */}
                <div style={{
                  flexShrink: 0, padding: '8px 16px',
                  display: 'flex', justifyContent: 'flex-end',
                }}>
                  <HifiMono>{selectedIdx + 1} / {filtered.length}</HifiMono>
                </div>
              </>
            </div>
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
        <span>Spellbook — {tt(lang, 'title.designStudy')}</span>
        <span style={{ color: 'var(--overlay0)' }}>·</span>
        <span>{tt(lang, 'section.themes')}{' '}
          <a href="https://catppuccin.com/" target="_blank" rel="noopener" style={hifiFooterLink}>Catppuccin</a>,{' '}
          <a href="https://www.nordtheme.com/" target="_blank" rel="noopener" style={hifiFooterLink}>Nord</a>,{' '}
          <a href="https://monokai.pro/" target="_blank" rel="noopener" style={hifiFooterLink}>Monokai</a>,{' '}
          <a href="https://ethanschoonover.com/solarized/" target="_blank" rel="noopener" style={hifiFooterLink}>Solarized</a>
        </span>
        <span style={{ color: 'var(--overlay0)' }}>·</span>
        <span>{tt(lang, 'section.fonts')}{' '}
          <a href="https://github.com/indestructible-type/Marauder" target="_blank" rel="noopener" style={hifiFooterLink}>Marauder</a>,{' '}
          <a href="https://fonts.google.com/specimen/Texturina" target="_blank" rel="noopener" style={hifiFooterLink}>Texturina</a>,{' '}
          <a href="https://www.jetbrains.com/lp/mono/" target="_blank" rel="noopener" style={hifiFooterLink}>JetBrains Mono</a>
        </span>
        <div style={{ flex: 1, minWidth: 14 }}/>
        <HifiLangToggle lang={lang} versions={versions} versionKey={versionKey} onSwitch={switchVersion}/>
        <span style={{ color: 'var(--overlay0)', marginLeft: 4, marginRight: 4 }}>·</span>
        <HifiThemeToggle dark={dark} lang={lang} style={{ width: 30, height: 30, fontSize: 15 }}/>
      </footer>

      {/* Character editor — slide-in panel from the right */}
      {editorTransition.mounted && (
        <>
          <div
            onClick={() => setEditor(null)}
            className={editor ? 'hifi-fade-in' : editorTransition.cls}
            style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.35)', zIndex: 30 }}/>
          <div className={editor ? 'hifi-slide-in-right' : (editorTransition.mounted ? 'hifi-slide-out-right' : '')} style={{
            position: 'absolute', top: 0, right: 0, bottom: 0,
            width: 460, zIndex: 31,
            boxShadow: '-8px 0 24px rgba(0,0,0,0.18)',
          }}>
            <CharacterEditor
              lang={lang} dark={dark} theme={theme}
              charId={editor?.charId}
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

function FilterChipDropdown({ label, count, values, selected, formatValue = v => v, onToggle, onClear, onRemove, lang }) {
  const [open, setOpen] = React.useState(false);
  const dropdownTransition = window.useHifiTransition(open, 180);
  const active = count > 0;
  return (
    <>
      <button
        onClick={() => setOpen(o => !o)}
        className={`hifi-filter-chip${active ? ' active' : ''}`}
        aria-label={`${tt(lang, 'filter.byLabel', { label })}${count > 0 ? ` (${count})` : ''}`}
        aria-haspopup="true"
        aria-expanded={open}
      >
        <span>{label}</span>
        {/* Badge sempre presente pra reservar o espaço e manter o shape do botão
            estável. Com contagem: pílula cheia na accent. Sem contagem: mostra um
            "0" apagado (.empty), sem fundo e em cor mais clara que o texto. */}
        <span className={`hifi-filter-chip-count${count > 0 ? '' : ' empty'}`}>{count > 0 ? count : 0}</span>
        <span style={{ color: 'var(--subtext0)', fontSize: 10 }}>▾</span>
      </button>
      {dropdownTransition.mounted && (
        <>
          <div onClick={() => setOpen(false)} style={{ position: 'fixed', inset: 0, zIndex: 11 }}/>
          <div className={open ? 'hifi-slide-up' : dropdownTransition.cls} style={{
            position: 'absolute', top: '100%', left: 0, marginTop: 6,
            background: 'var(--mantle)', border: '1px solid var(--surface1)', borderRadius: 4,
            minWidth: 200, maxHeight: 360, overflowY: 'auto', padding: '6px 0', zIndex: 12,
            boxShadow: '0 8px 24px rgba(0,0,0,0.18)',
          }}>
            {count > 0 && (
              <button onClick={onClear} className="hifi-btn-ghost"
                style={{ display: 'block', width: '100%', textAlign: 'left', padding: '6px 12px', color: 'var(--subtext0)', fontSize: 12 }}>
                {tt(lang, 'filter.clear')}
              </button>
            )}
            {onRemove && (
              <button onClick={() => { onRemove(); setOpen(false); }} className="hifi-btn-ghost"
                style={{ display: 'block', width: '100%', textAlign: 'left', padding: '6px 12px', color: 'var(--red)', fontSize: 12 }}>
                {tt(lang, 'filter.removeFilter')}
              </button>
            )}
            {(count > 0 || onRemove) && <div style={{ height: 1, background: 'var(--surface1)', margin: '4px 0' }}/>}
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
                  <span style={{ color: 'var(--text)' }}>{formatValue(v)}</span>
                </button>
              );
            })}
          </div>
        </>
      )}
    </>
  );
}

// Botão tracejado "+ mais" — abre um menu dos campos filtráveis dos JSONs ainda
// não adicionados; clicar adiciona um novo chip de filtro à faixa.
function HifiAddFilter({ available, cfg, onAdd, lang }) {
  const [open, setOpen] = React.useState(false);
  const addMenuTransition = window.useHifiTransition(open, 180);
  return (
    <div style={{ position: 'relative' }}>
      <button
        onClick={() => setOpen(o => !o)}
        className="hifi-filter-chip"
        style={{ borderStyle: 'dashed', borderColor: 'var(--surface1)', color: 'var(--subtext0)', background: 'transparent' }}
        title={tt(lang, 'filter.addCustom')}
      >+ {tt(lang, 'filter.more')}</button>
      {addMenuTransition.mounted && (
        <>
          <div onClick={() => setOpen(false)} style={{ position: 'fixed', inset: 0, zIndex: 11 }}/>
          <div className={open ? 'hifi-slide-up' : addMenuTransition.cls} style={{
            position: 'absolute', top: '100%', left: 0, marginTop: 6,
            background: 'var(--mantle)', border: '1px solid var(--surface1)', borderRadius: 4,
            minWidth: 180, maxHeight: 360, overflowY: 'auto', padding: '6px 0', zIndex: 12,
            boxShadow: '0 8px 24px rgba(0,0,0,0.18)',
          }}>
            <div style={{ padding: '4px 12px 6px' }}>
              <span className="hifi-section-label">{tt(lang, 'filter.add')}</span>
            </div>
            {available.map(key => (
              <button key={key}
                onClick={() => { onAdd(key); setOpen(false); }}
                className="hifi-btn-ghost"
                style={{ display: 'block', width: '100%', textAlign: 'left', padding: '7px 12px', color: 'var(--text)', textTransform: 'capitalize' }}>
                {cfg[key].label}
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  );
}

// ──────────────────────────────────────────────────────────────────
// MODO SESSÃO (mobile) — stats + tracker compacto + preparadas + conjurar
// ──────────────────────────────────────────────────────────────────
const HIFI_SESSION_KEY = 'hifi_session_v1';
const HIFI_SESSION_VIEW_KEY = 'hifi_session_view_v1';

// Cor da fagulha por escola (mesma ordem de SCHOOL_KEYS) → var do tema.
const HIFI_SCHOOL_FX_VARS = ['--blue', '--yellow', '--teal', '--pink', '--peach', '--mauve', '--green', '--maroon'];

function hifiReducedMotion() {
  return typeof window.matchMedia === 'function' && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

// Estouro de fagulhas no PONTO DO TOQUE (DOM imperativo — cria, anima, remove).
// Fora do React de propósito: efeito descartável de 700ms, sem estado.
function hifiCastSpark(rootEl, ev, btnEl, schoolIdx) {
  if (!rootEl || hifiReducedMotion()) return;
  const pr = rootEl.getBoundingClientRect();
  let cx, cy;
  if (ev && (ev.clientX || ev.clientY)) { cx = ev.clientX; cy = ev.clientY; }
  else if (btnEl) { const br = btnEl.getBoundingClientRect(); cx = br.left + br.width / 2; cy = br.top + br.height / 2; }
  else return;
  const fx = document.createElement('div');
  fx.className = 'hifi-spark';
  fx.style.left = (cx - pr.left) + 'px';
  fx.style.top = (cy - pr.top) + 'px';
  fx.style.setProperty('--school', `var(${HIFI_SCHOOL_FX_VARS[schoolIdx] || '--accent'})`);
  const core = document.createElement('i');
  core.className = 'hifi-spark-core';
  fx.appendChild(core);
  for (let i = 0; i < 9; i++) {
    const p = document.createElement('i');
    const ang = (Math.PI * 2 * i / 9) + Math.random() * 0.5;
    const dist = 48 + Math.random() * 46;
    p.style.setProperty('--dx', Math.round(Math.cos(ang) * dist) + 'px');
    p.style.setProperty('--dy', Math.round(Math.sin(ang) * dist) + 'px');
    p.style.animationDelay = Math.round(Math.random() * 40) + 'ms';
    fx.appendChild(p);
  }
  rootEl.appendChild(fx);
  setTimeout(() => fx.remove(), 700);
}

function hifiCastPulse(btnEl) {
  if (!btnEl || hifiReducedMotion()) return;
  btnEl.classList.remove('hifi-cast-pulse');
  void btnEl.offsetWidth;
  btnEl.classList.add('hifi-cast-pulse');
}

const HIFI_ROMAN = [null, 'I', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII', 'IX'];
function hifiFmtMod(n) { return (n >= 0 ? '+' : '') + n; }

function HifiSessionMode({ character, update, lang, allSpells, onExit }) {
  const prepared = React.useMemo(() => new Set(character?.prepared || []), [character]);
  const spells = React.useMemo(() => {
    const list = allSpells.filter(s => prepared.has(hifiSpellKey(s)));
    return list.sort((a, b) => (a.lvl - b.lvl)
      || spellName(a, lang).localeCompare(spellName(b, lang), lang === 'ptbr' ? 'pt' : 'en'));
  }, [allSpells, prepared, lang]);

  const [view, setViewState] = React.useState(() => {
    try { return localStorage.getItem(HIFI_SESSION_VIEW_KEY) === 'list' ? 'list' : 'cards'; } catch (e) { return 'cards'; }
  });
  const setView = (v) => { setViewState(v); try { localStorage.setItem(HIFI_SESSION_VIEW_KEY, v); } catch (e) {} };

  const [detail, setDetail] = React.useState(null);       // magia aberta no detalhe
  const [upcastFor, setUpcastFor] = React.useState(null); // magia do sheet de upcast
  const [infoOpen, setInfoOpen] = React.useState(false);  // sheet de explicação dos stats
  const rootRef = React.useRef(null);
  const { toast, show: showToast } = useHifiToast();

  const stats = window.hifiCasterStats ? window.hifiCasterStats(character) : null;
  const slots = character?.slots || { total: {}, used: {} };
  const slotLevels = [1,2,3,4,5,6,7,8,9].filter(l => (slots.total[l] || 0) > 0);

  // Detalhe é uma TELA (como no grimório mobile); sheets são diálogos.
  const detailTransition = window.useHifiTransition(!!detail, 240);
  const sheetOpen = !!upcastFor || infoOpen;
  const sheetTransition = window.useHifiTransition(sheetOpen, 240);
  const sheetRef = React.useRef(null);
  const closeSheet = React.useCallback(() => { setUpcastFor(null); setInfoOpen(false); }, []);
  window.useDialogA11y(sheetRef, sheetOpen, closeSheet);

  // Mantém a última magia durante a animação de saída do detalhe.
  const lastDetailRef = React.useRef(null);
  if (detail) lastDetailRef.current = detail;
  const detailSpell = detail || lastDetailRef.current;

  function availFor(circle) { return Math.max(0, (slots.total[circle] || 0) - (slots.used[circle] || 0)); }

  function castSpell(s, circle, ev, btnEl) {
    const name = spellName(s, lang);
    if (circle > 0) {
      if (!availFor(circle)) { showToast(tt(lang, 'session.noSlots', { circle }), 'err'); return; }
      setSlotUsedFor(character.id, circle, (slots.used[circle] || 0) + 1, update);
      // "Drena" o quadradinho recém-gasto: classe imperativa pós-commit do React
      // (className do render limparia a classe se aplicada antes).
      requestAnimationFrame(() => requestAnimationFrame(() => {
        const sqs = rootRef.current ? rootRef.current.querySelectorAll(`.hifi-slot-sq[data-lvl="${circle}"].spent`) : [];
        const sq = sqs[sqs.length - 1];
        if (sq) { sq.classList.add('draining'); setTimeout(() => sq.classList.remove('draining'), 520); }
      }));
    }
    hifiCastPulse(btnEl);
    hifiCastSpark(rootRef.current, ev, btnEl, s.school);
    if (circle === 0) showToast(tt(lang, 'session.toastCast', { name }));
    else if (circle !== s.lvl) showToast(tt(lang, 'session.toastUpcast', { name, circle }));
    else showToast(tt(lang, 'session.toastSlot', { name, circle }));
  }

  const classLabel = (key) => {
    const pt = (window.CLASS_PT || {})[key] || key;
    const raw = lang === 'ptbr' ? pt : key;
    return raw.charAt(0).toUpperCase() + raw.slice(1);
  };
  const classesLabel = (character?.classes || []).map(cl => `${classLabel(cl.class)} ${cl.level}`).join(' / ');

  const statBox = (label, value, accented) => (
    <div style={{ flex: 1, background: 'var(--surface0)', border: '1px solid var(--surface1)', borderRadius: 12, padding: '8px 4px', textAlign: 'center', minWidth: 0 }}>
      <div className="hifi-mono" style={{ fontSize: 9.5, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--overlay1)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{label}</div>
      <div style={{ fontSize: 18, fontWeight: 700, marginTop: 1, color: accented ? 'var(--accent)' : 'var(--text)', fontVariantNumeric: 'tabular-nums' }}>{value}</div>
    </div>
  );

  const castRow = (s, mini) => {
    const name = spellName(s, lang);
    const isCantrip = s.lvl === 0;
    const primaryStyle = isCantrip ? { background: 'transparent', color: 'var(--accent)' } : {};
    return (
      <span onClick={(e) => e.stopPropagation()} style={mini
        ? { display: 'inline-flex', gap: 8, flexShrink: 0, alignItems: 'center' }
        : { display: 'flex', gap: 8, marginTop: 8 }}>
        <button
          type="button"
          className="hifi-btn-primary"
          onClick={(e) => castSpell(s, s.lvl, e, e.currentTarget)}
          aria-label={tt(lang, 'session.castAria', { name })}
          title={tt(lang, 'session.castAria', { name })}
          style={mini
            ? { width: 34, height: 34, borderRadius: '50%', padding: 0, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', ...primaryStyle }
            : { flex: 1, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 6, ...primaryStyle }}
        >✦{mini ? '' : ` ${isCantrip ? tt(lang, 'session.castCantrip') : tt(lang, 'session.cast')}`}</button>
        {!isCantrip && (
          <button
            type="button"
            className="hifi-icon-btn"
            onClick={() => setUpcastFor(s)}
            aria-label={tt(lang, 'session.upcastAria')}
            title={tt(lang, 'session.upcastAria')}
            style={{ width: mini ? 34 : 38, height: mini ? 34 : 38, borderRadius: '50%', color: 'var(--accent)', border: '1.5px solid color-mix(in srgb, var(--accent) 45%, transparent)', background: 'transparent', alignSelf: 'center', flexShrink: 0 }}
          ><span aria-hidden="true">▲</span></button>
        )}
      </span>
    );
  };

  // Lista agrupada por círculo (Truques, 1º, 2º…).
  const grouped = [];
  let lastLvl = null;
  spells.forEach(s => {
    if (s.lvl !== lastLvl) {
      lastLvl = s.lvl;
      grouped.push({ type: 'label', lvl: s.lvl });
    }
    grouped.push({ type: 'spell', s });
  });

  const comps = (s) => (s.comp || '').split(/\s+/).filter(Boolean);

  return (
    <div ref={rootRef} className="hifi-flat-icons" style={{ height: '100%', position: 'relative', overflow: 'hidden', display: 'flex', flexDirection: 'column', background: 'var(--base)', paddingTop: 24 }}>
      {/* Header: sair · título/personagem · toggle cards/lista */}
      <header style={{ padding: '10px 16px', borderBottom: '1px solid var(--surface1)', flexShrink: 0, display: 'flex', alignItems: 'center', gap: 10 }}>
        <button className="hifi-icon-btn" onClick={onExit} aria-label={tt(lang, 'session.exit')} title={tt(lang, 'session.exit')}><span aria-hidden="true">‹</span></button>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div className="hifi-section-label" style={{ fontSize: 10 }}>{tt(lang, 'session.title')}</div>
          <div className="hifi-display" style={{ fontSize: 19, color: 'var(--accent)', lineHeight: 1.15, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
            {hifiCharName(character, lang)}
            {classesLabel && <span style={{ fontSize: 12, color: 'var(--overlay1)' }}> · {classesLabel}</span>}
          </div>
        </div>
        {[['cards', '⊞', 'session.viewCards'], ['list', '≣', 'session.viewList']].map(([v, glyph, key]) => (
          <button
            key={v}
            className="hifi-icon-btn"
            onClick={() => setView(v)}
            aria-pressed={view === v}
            aria-label={tt(lang, key)}
            title={tt(lang, key)}
            style={view === v
              ? { color: 'var(--base)', background: 'var(--accent)', borderColor: 'var(--accent)' }
              : {}}
          ><span aria-hidden="true">{glyph}</span></button>
        ))}
      </header>

      {/* Stats: faixa inteira tocável abre o sheet de explicações; ⓘ é o affordance. */}
      <div
        role="button" tabIndex={0}
        onClick={() => setInfoOpen(true)}
        onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); setInfoOpen(true); } }}
        aria-label={tt(lang, 'session.statsAria')}
        title={tt(lang, 'session.statsAria')}
        style={{ position: 'relative', display: 'flex', alignItems: 'center', gap: 8, padding: '10px 30px 8px 16px', cursor: 'pointer', flexShrink: 0 }}
      >
        {statBox(tt(lang, 'stats.dc'), stats ? stats.dc : '—', true)}
        {statBox(tt(lang, 'stats.atk'), stats ? hifiFmtMod(stats.atk) : '—')}
        {statBox(tt(lang, 'stats.cast'), stats ? `${tt(lang, 'ability.' + stats.ability)} ${hifiFmtMod(stats.mod)}` : '—')}
        {statBox(tt(lang, 'stats.prof'), stats ? hifiFmtMod(stats.prof) : '—')}
        <span aria-hidden="true" style={{ position: 'absolute', top: '50%', right: 9, transform: 'translateY(-50%)', color: 'var(--overlay0)', fontSize: 13 }}>ⓘ</span>
      </div>

      {/* Tracker compacto (BG3): numeral romano + slots em bloco 2x2. */}
      {slotLevels.length > 0 && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 16, padding: '2px 16px 9px', borderBottom: '1px solid var(--surface1)', flexShrink: 0, overflowX: 'auto' }}>
          {slotLevels.map(lvl => {
            const total = slots.total[lvl];
            const used = slots.used[lvl] || 0;
            return (
              <span key={lvl} style={{ display: 'inline-flex', alignItems: 'center', gap: 6, flexShrink: 0 }}>
                <span className="hifi-mono" style={{ fontSize: 10.5, fontWeight: 700, color: `var(--level-${lvl})` }}>{HIFI_ROMAN[lvl]}</span>
                <span className="hifi-session-sqgrid">
                  {Array.from({ length: total }, (_, i) => {
                    const spent = i < used;
                    return (
                      <button
                        key={i}
                        type="button"
                        data-lvl={lvl}
                        className={`hifi-slot-sq${spent ? ' spent' : ''}`}
                        aria-pressed={spent}
                        aria-label={tt(lang, 'slots.slotAria', { lvl, i: i + 1, n: total })}
                        title={spent ? tt(lang, 'slots.restore') : tt(lang, 'slots.spend')}
                        onClick={() => setSlotUsedFor(character.id, lvl, spent ? i : i + 1, update)}
                      />
                    );
                  })}
                </span>
              </span>
            );
          })}
          <div style={{ flex: 1 }}/>
          <button
            className="hifi-btn-ghost"
            onClick={() => { longRestFor(character.id, update); showToast(tt(lang, 'slots.rested')); }}
            title={tt(lang, 'slots.longRestTitle')}
            style={{ fontSize: 11, color: 'var(--subtext0)', padding: '2px 8px', flexShrink: 0 }}
          >🌙 {tt(lang, 'slots.longRest')}</button>
        </div>
      )}

      {/* Lista das preparadas, agrupada por círculo. */}
      <div style={{ flex: 1, overflow: 'auto', padding: '12px 12px 24px', display: 'flex', flexDirection: 'column', gap: 10 }}>
        {spells.length === 0 ? (
          <div style={{ margin: 'auto', textAlign: 'center', padding: 24, maxWidth: 280 }}>
            <p style={{ fontSize: 13, color: 'var(--subtext0)', lineHeight: 1.5 }}>{tt(lang, 'session.empty')}</p>
            <button className="hifi-btn-secondary" style={{ marginTop: 14 }} onClick={onExit}>{tt(lang, 'session.exit')}</button>
          </div>
        ) : grouped.map((item, idx) => {
          if (item.type === 'label') {
            return (
              <div key={`g${item.lvl}`} className="hifi-section-label" style={{ display: 'flex', alignItems: 'center', gap: 8, margin: '4px 2px 0', flexShrink: 0 }}>
                <span style={{ color: `var(--level-${item.lvl})` }}>
                  {item.lvl === 0 ? tt(lang, 'session.groupCantrips') : tt(lang, 'session.groupCircle', { n: item.lvl })}
                </span>
                <span style={{ flex: 1, height: 1, background: 'var(--surface1)' }}/>
              </div>
            );
          }
          const s = item.s;
          const k = hifiSpellKey(s);
          if (view === 'list') {
            return (
              <div key={k} className="hifi-card compact" style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '9px 12px', cursor: 'pointer', flexShrink: 0 }} onClick={() => setDetail(s)}>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <HifiSpellName size={14} style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{spellName(s, lang)}</HifiSpellName>
                  <div style={{ fontSize: 11, color: 'var(--subtext0)', fontStyle: 'italic', fontFamily: "'Marauder Text', Georgia, serif" }}>
                    {schoolKey(s.school)} · {s.lvl === 0 ? tt(lang, 'spell.cantrip') : tt(lang, 'session.groupCircle', { n: s.lvl })}
                    {s.conc && <span style={{ color: 'var(--yellow)' }}> · C</span>}
                    {s.rit && <span style={{ color: 'var(--peach)' }}> · R</span>}
                  </div>
                </div>
                {castRow(s, true)}
              </div>
            );
          }
          const desc = window.v8Description ? window.v8Description(s, lang) : '';
          return (
            <div key={k} className="hifi-card compact" style={{ padding: '12px 13px', display: 'flex', flexDirection: 'column', gap: 4, cursor: 'pointer', flexShrink: 0, position: 'relative', overflow: 'hidden' }} onClick={() => setDetail(s)}>
              <div style={{ display: 'flex', alignItems: 'baseline', gap: 8, minWidth: 0 }}>
                <HifiSpellName size={16} style={{ display: '-webkit-box', WebkitLineClamp: 1, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>{spellName(s, lang)}</HifiSpellName>
              </div>
              <div style={{ fontStyle: 'italic', fontSize: 12, color: 'var(--subtext0)', fontFamily: "'Marauder Text', Georgia, serif", display: 'flex', alignItems: 'center', gap: 6 }}>
                <span>{schoolKey(s.school)}</span>
                <span style={{ color: 'var(--overlay0)' }}>·</span>
                <span style={{ color: `var(--level-${s.lvl})`, fontFamily: "'JetBrains Mono', ui-monospace, monospace", fontStyle: 'normal', letterSpacing: '0.06em', fontSize: 11, fontWeight: 600 }}>{tierSymbol(s.lvl)}</span>
              </div>
              {desc && (
                <p style={{ margin: 0, fontSize: 11.5, lineHeight: 1.4, color: 'var(--subtext1)', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>{desc}</p>
              )}
              <div className="hifi-card-footer">
                <div className="hifi-comp-chips">
                  {['V','S','M'].map(letter => (
                    <span key={letter} className={`hifi-comp-chip${comps(s).includes(letter) ? ' on' : ''}`}>{letter}</span>
                  ))}
                </div>
                <span className="hifi-card-meta-sep">·</span>
                <span className="hifi-card-meta-text">{s.range}</span>
                {(s.rit || s.conc) && <span style={{ flex: 1 }}/>}
                {s.conc && <span className="hifi-card-flag" style={{ color: 'var(--yellow)' }} title={tt(lang, 'spell.concentration')}>C</span>}
                {s.rit && <span className="hifi-card-flag" style={{ color: 'var(--peach)' }} title={tt(lang, 'spell.ritual')}>R</span>}
              </div>
              {castRow(s, false)}
            </div>
          );
        })}
      </div>

      {/* Detalhe da magia — tela deslizante (mesmo padrão do grimório mobile). */}
      {detailTransition.mounted && detailSpell && (
        <div className={detail ? 'hifi-slide-in-right' : 'hifi-slide-out-right'} style={{ position: 'absolute', inset: 0, zIndex: 10, display: 'flex', flexDirection: 'column', background: 'var(--base)', paddingTop: 24 }}>
          <header className="hifi-flat-icons" style={{ padding: '12px 16px', display: 'flex', alignItems: 'center', gap: 8, borderBottom: '1px solid var(--surface1)', flexShrink: 0 }}>
            <button className="hifi-icon-btn" onClick={() => setDetail(null)} aria-label={tt(lang, 'nav.back')} title={tt(lang, 'nav.back')}><span aria-hidden="true">‹</span></button>
          </header>
          <div style={{ flex: 1, overflow: 'auto' }}>
            <div style={{ padding: '20px 18px 14px' }}>
              <HifiSpellName size={32}>{spellName(detailSpell, lang)}</HifiSpellName>
              <div style={{ marginTop: 6, fontSize: 14, color: 'var(--subtext0)', fontStyle: 'italic' }}>
                {schoolName(detailSpell.school, lang)} · {detailSpell.lvl === 0 ? tt(lang, 'spell.cantrip') : `${tt(lang, 'spell.level')} ${detailSpell.lvl}`}
                {detailSpell.conc && <span> · <span style={{ color: 'var(--yellow)' }}>conc.</span></span>}
                {detailSpell.rit && <span> · <span style={{ color: 'var(--peach)' }}>ritual</span></span>}
              </div>
            </div>
            <HifiDetailContent s={detailSpell} lang={lang}/>
          </div>
          <div style={{ padding: '12px 16px', borderTop: '1px solid var(--surface1)' }}>
            {castRow(detailSpell, false)}
          </div>
        </div>
      )}

      {/* Sheet (upcast OU explicação dos stats) com scrim. */}
      {sheetTransition.mounted && (
        <>
          <div className={sheetOpen ? 'hifi-fade-in' : 'hifi-fade-out'} onClick={closeSheet} style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.45)', zIndex: 20 }}/>
          <div
            ref={sheetRef}
            role="dialog" aria-modal="true" tabIndex={-1}
            aria-label={upcastFor ? tt(lang, 'session.upcastAria') : tt(lang, 'session.statsAria')}
            className={sheetOpen ? 'hifi-slide-up' : 'hifi-fade-out'}
            style={{ position: 'absolute', left: 0, right: 0, bottom: 0, zIndex: 21, background: 'var(--mantle)', borderTop: '1px solid var(--surface1)', borderTopLeftRadius: 16, borderTopRightRadius: 16, padding: '16px 18px 24px', maxHeight: '70%', overflowY: 'auto', boxShadow: '0 -8px 20px rgba(0,0,0,0.2)' }}
          >
            {upcastFor ? (
              <>
                <div style={{ fontSize: 13, color: 'var(--subtext1)', marginBottom: 12 }}>{tt(lang, 'session.upcastTitle', { name: spellName(upcastFor, lang) })}</div>
                <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                  {[1,2,3,4,5,6,7,8,9].filter(c => c >= upcastFor.lvl && (slots.total[c] || 0) > 0).map(c => {
                    const avail = availFor(c);
                    return (
                      <button
                        key={c}
                        className="hifi-btn-secondary"
                        disabled={!avail}
                        style={{ opacity: avail ? 1 : 0.4, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2 }}
                        onClick={(e) => { const s = upcastFor; closeSheet(); castSpell(s, c, e, e.currentTarget); }}
                      >
                        <span style={{ color: `var(--level-${c})`, fontWeight: 700 }}>{tt(lang, 'session.groupCircle', { n: c })}</span>
                        <span style={{ color: 'var(--subtext0)', fontSize: 11 }}>{tt(lang, 'session.avail', { n: avail })}</span>
                      </button>
                    );
                  })}
                </div>
              </>
            ) : (
              <>
                {!stats && (
                  <p style={{ fontSize: 12.5, color: 'var(--peach)', lineHeight: 1.5, marginBottom: 14 }}>{tt(lang, 'stats.missing')}</p>
                )}
                {[
                  ['dc', stats ? stats.dc : null],
                  ['atk', stats ? hifiFmtMod(stats.atk) : null],
                  ['cast', stats ? `${tt(lang, 'ability.' + stats.ability)} ${hifiFmtMod(stats.mod)}` : null],
                  ['prof', stats ? hifiFmtMod(stats.prof) : null],
                ].map(([key, val]) => (
                  <div key={key} style={{ marginBottom: 14 }}>
                    <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text)' }}>
                      {tt(lang, `stats.${key}Title`)}{val != null && <span style={{ color: 'var(--accent)' }}> — {val}</span>}
                    </div>
                    <div className="hifi-mono" style={{ display: 'inline-block', fontSize: 11.5, color: 'var(--accent)', background: 'var(--surface0)', borderRadius: 8, padding: '4px 9px', margin: '6px 0' }}>{tt(lang, `stats.${key}Formula`)}</div>
                    <p style={{ margin: 0, fontSize: 12.5, color: 'var(--subtext0)', lineHeight: 1.5 }}>{tt(lang, `stats.${key}Text`)}</p>
                  </div>
                ))}
              </>
            )}
          </div>
        </>
      )}

      <HifiToast toast={toast} accent="var(--accent)"/>
    </div>
  );
}

// ──────────────────────────────────────────────────────────────────
// MOBILE
// ──────────────────────────────────────────────────────────────────
function HifiMobile({ lang = 'ptbr', dark = false, theme = 'catppuccin', character, drawerOpen: initialDrawerOpen = false, detailIdx = null }) {
  const { chars, update } = useCharacters();
  const { bookmarks } = useBookmarks();
  const liveChar = React.useMemo(() => {
    if (!character) return chars[0];
    return chars.find(c => c.id === character.id)
        || chars.find(c => c.name === character.name)
        || chars[0];
  }, [chars, character]);
  const charWithAccent = hifiAccentsFor(liveChar, theme);
  const accent = dark ? charWithAccent.accent_dark : charWithAccent.accent;
  const prepared = React.useMemo(() => new Set(liveChar?.prepared || []), [liveChar]);
  const bookmarked = React.useMemo(() => new Set(bookmarks), [bookmarks]); // favoritas globais
  const state = useHifiAppState(prepared, undefined, liveChar);
  const { allSpells, filtered, filters, setFilters, query, setQuery,
    selectedIdx, setSelectedIdx, onlyPrepared, setOnlyPrepared,
    versionKey, switchVersion, versions, versionLang } = state;
  const mobileFilterValues = React.useMemo(() => ({
    level: hifiFilterValues('level', allSpells, versionLang),
    school: hifiFilterValues('school', allSpells, versionLang),
    class: hifiFilterValues('class', allSpells, versionLang),
  }), [allSpells, versionLang]);
  const filterCfg = React.useMemo(() => hifiFilterConfig(versionLang), [versionLang]);
  const [extraFilters, setExtraFilters] = React.useState([]);
  const extraValues = React.useMemo(() => {
    const out = {};
    Object.keys(filterCfg).forEach(key => {
      const def = filterCfg[key];
      if (def.base) return;
      if (def.values) out[key] = def.values;
      else if (def.derive) {
        const set = new Set();
        (allSpells || []).forEach(s => def.get(s).forEach(v => v && set.add(v)));
        out[key] = [...set].sort((a, b) => String(a).localeCompare(String(b), versionLang === 'ptbr' ? 'pt' : 'en', { numeric: true }));
      }
    });
    return out;
  }, [filterCfg, allSpells, versionLang]);
  const addExtraFilter = (key) => {
    setExtraFilters(list => list.includes(key) ? list : [...list, key]);
    setFilters(p => (p[key] ? p : { ...p, [key]: new Set() }));
  };
  const removeExtraFilter = (key) => {
    setExtraFilters(list => list.filter(k => k !== key));
    setFilters(p => { const n = { ...p }; delete n[key]; return n; });
  };
  const availableExtras = Object.keys(filterCfg).filter(k => !filterCfg[k].base && !extraFilters.includes(k));
  const { toast, show: showToast } = useHifiToast();
  const [drawerOpen, setDrawerOpen] = React.useState(initialDrawerOpen);
  const [charSheetOpen, setCharSheetOpen] = React.useState(false);
  const [editor, setEditor] = React.useState(null);
  // Modo sessão: persistido — recarregar no meio da sessão volta direto pra ele.
  const [sessionOpen, setSessionOpen] = React.useState(() => {
    try { return localStorage.getItem(HIFI_SESSION_KEY) === '1'; } catch (e) { return false; }
  });
  const openSession = (v) => {
    setSessionOpen(v);
    try { localStorage.setItem(HIFI_SESSION_KEY, v ? '1' : '0'); } catch (e) {}
  };

  const charSheetTransition = window.useHifiTransition(charSheetOpen, 240);
  const mobileEditorTransition = window.useHifiTransition(!!editor, 240);
  const sessionTransition = window.useHifiTransition(sessionOpen, 240);

  // Swipe pra abrir/fechar o drawer. Fechado: arrastar pra cima abre. Aberto:
  // arrastar pra baixo fecha, mas só quando o gesto começa no topo (~64px, zona
  // do puxador/busca) — assim o scroll do conteúdo do drawer aberto não dispara
  // o fechamento por engano.
  const drawerRef = React.useRef(null);
  const drawerSwipe = React.useRef(null);

  // A11y de diálogo (modal): foco preso, Escape fecha, foco volta. Só age quando
  // o respectivo painel está aberto. window.useDialogA11y vem do v11.
  const charSheetRef = React.useRef(null);
  window.useDialogA11y(drawerRef, drawerOpen, () => setDrawerOpen(false));
  window.useDialogA11y(charSheetRef, charSheetOpen, () => setCharSheetOpen(false));

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
    // Favoritas são globais — não dependem do personagem ativo.
    toggleBookmark(hifiSpellKey(s));
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
    setExtraFilters([]);
    setQuery('');
  }

  const themeClass = `${dark ? 'hifi-dark' : 'hifi-light'}${theme && theme !== 'catppuccin' ? ' hifi-theme-' + theme : ''}`;
  const containerStyle = { '--accent': accent };
  const showDetail = !!sel;
  const detailScreenTransition = window.useHifiTransition(showDetail, 240);
  // Mantém a última magia renderizada durante a animação de saída (240ms),
  // senão o overlay tenta renderizar com sel=null e crasheia o app.
  const lastSelRef = React.useRef(null);
  if (sel) lastSelRef.current = sel;
  const detailSpell = sel || lastSelRef.current;
  const compare = useEditionCompare(sel, versionKey, versions, lang, showToast);
  const shownSpell = compare.alt?.spell || detailSpell;

  return (
    <div className={`hifi ${themeClass}`} style={{ ...containerStyle, height: '100%', position: 'relative', overflow: 'hidden', display: 'flex', flexDirection: 'column', paddingTop: 24, paddingBottom: 0 }}>
      {detailScreenTransition.mounted && (
        <div className={showDetail ? 'hifi-slide-in-right' : (detailScreenTransition.mounted ? 'hifi-slide-out-right' : '')} style={{ position: 'absolute', inset: 0, zIndex: 10, display: 'flex', flexDirection: 'column', background: 'var(--base)' }}>
          <header className="hifi-flat-icons" style={{ padding: '12px 16px', display: 'flex', alignItems: 'center', gap: 8, borderBottom: '1px solid var(--surface1)', flexShrink: 0 }}>
            <button className="hifi-icon-btn" onClick={() => setSelectedIdx(null)} aria-label={tt(lang, 'nav.back')} title={tt(lang, 'nav.back')}><span aria-hidden="true">‹</span></button>
            <div style={{ flex: 1 }}/>
            <button className="hifi-icon-btn"
              onClick={() => toggleBook(detailSpell)}
              aria-pressed={bookmarked.has(hifiSpellKey(detailSpell))}
              aria-label={tt(lang, 'spell.bookmark')}
              title={tt(lang, 'spell.bookmark')}
              style={{ fontSize: 16, color: bookmarked.has(hifiSpellKey(detailSpell)) ? 'var(--yellow)' : 'var(--subtext0)' }}>
              <span aria-hidden="true">{bookmarked.has(hifiSpellKey(detailSpell)) ? '★' : '☆'}</span>
            </button>
            <button className="hifi-icon-btn"
              onClick={() => hifiCopyLink(detailSpell, lang, showToast)}
              aria-label={tt(lang, 'spell.copyLink')}
              title={tt(lang, 'spell.copyLink')}
              style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', color: 'var(--subtext0)' }}><HifiLinkIcon size={15}/></button>
          </header>
          <div style={{ flex: 1, overflow: 'auto' }}>
            <div style={{ padding: '20px 18px 14px' }}>
              <HifiSpellName size={32}>{spellName(shownSpell, lang)}</HifiSpellName>
              <div style={{ marginTop: 6, fontSize: 14, color: 'var(--subtext0)', fontStyle: 'italic' }}>
                {schoolName(shownSpell.school, lang)} · {shownSpell.lvl === 0 ? (tt(lang, 'spell.cantrip')) : `${tt(lang, 'spell.level')} ${shownSpell.lvl}`}
                {shownSpell.conc && <span> · <span style={{ color: 'var(--yellow)' }}>conc.</span></span>}
                {shownSpell.rit && <span> · <span style={{ color: 'var(--peach)' }}>ritual</span></span>}
              </div>
              <HifiCompareButton compare={compare} lang={lang} style={{ marginTop: 8 }}/>
            </div>
            <HifiDetailContent s={shownSpell} lang={lang}/>
          </div>
          <div style={{ padding: '12px 16px', borderTop: '1px solid var(--surface1)', display: 'flex', gap: 8 }}>
            <button
              className="hifi-btn-primary"
              onClick={() => togglePrep(detailSpell)}
              style={{ flex: 1, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 6, ...(prepared.has(hifiSpellKey(detailSpell)) ? {} : { background: 'transparent', color: 'var(--accent)' }) }}
            >{prepared.has(hifiSpellKey(detailSpell))
              ? <><HifiBookmarkIcon size={13} filled/>{tt(lang, 'spell.prepared')}</>
              : (tt(lang, 'spell.prepareShort'))}</button>
          </div>
          <HifiToast toast={toast} accent={accent}/>
        </div>
      )}

      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minHeight: 0, zIndex: 1 }}>
        {/* Header: título + botão de preparadas */}
        <header style={{ padding: '10px 16px', borderBottom: '1px solid var(--surface1)', flexShrink: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10 }}>
          <div style={{ position: 'relative', display: 'flex', alignItems: 'center', gap: 8 }}>
            {(() => {
              const heroWord = window.makeT(lang)('title.spellbook');
              const name = hifiCharName(liveChar, lang);
              const heroSpan = <span className="hifi-display" style={{ fontSize: 22, color: 'var(--text)', lineHeight: 1 }}>{heroWord}</span>;
              const charBtn = liveChar?.name && (
                <button
                  onClick={() => setCharSheetOpen(true)}
                  className="hifi-char-title hifi-display"
                  title={window.makeT(lang)('char.switchEdit')}
                  style={{
                    background: 'none', border: 'none', padding: 0, cursor: 'pointer',
                    fontSize: 22, color: accent, letterSpacing: '0.04em', lineHeight: 1,
                  }}
                >{lang === 'ptbr' ? <>de {name} </> : <>{name}'s </>}<span style={{ fontSize: 13 }}>▾</span></button>
              );
              // PT: "Grimório de <nome>" · EN: "<nome>'s Spellbook" (ordem inverte)
              return lang === 'ptbr' ? <>{heroSpan}{charBtn}</> : <>{charBtn}{heroSpan}</>;
            })()}
          </div>
          <button
            onClick={() => setOnlyPrepared(v => !v)}
            className={`hifi-icon-btn${onlyPrepared ? ' active' : ''}`}
            title={tt(lang, 'action.onlyPreparedShort')}
            aria-label={tt(lang, 'action.onlyPreparedShort')}
            aria-pressed={onlyPrepared}
            style={{
              width: 25, height: 25, marginTop: 2,
              color: onlyPrepared ? 'var(--base)' : 'var(--text)',
              background: onlyPrepared ? 'var(--accent)' : 'var(--surface1)',
              borderColor: onlyPrepared ? 'var(--accent)' : undefined }}
          ><HifiBookmarkIcon size={14}/></button>
          <button
            onClick={() => openSession(true)}
            className="hifi-icon-btn"
            title={tt(lang, 'session.enter')}
            aria-label={tt(lang, 'session.enter')}
            style={{ width: 25, height: 25, marginTop: 2, background: 'var(--surface1)', fontSize: 13 }}
          ><span aria-hidden="true">🎲</span></button>
        </div>
      </header>

      {/* Espaços de magia — pips rolam; label e descanso longo ficam fixos */}
      <HifiSlotTracker
        character={liveChar} update={update} lang={lang}
        style={{ padding: '6px 16px', borderBottom: '1px solid var(--surface1)', flexShrink: 0 }}
      />

      <div style={{ flex: 1, overflow: 'auto', padding: '12px 12px 88px' }}>
        {filtered.length === 0 ? (
          <HifiEmptyState lang={lang} onClear={() => { clearAllFilters(); setOnlyPrepared(false); }}/>
        ) : (
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
        )}
      </div>
      </div>

      {/* Bottom drawer */}
      {drawerOpen && (
        <div onClick={() => setDrawerOpen(false)} style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.45)', zIndex: 4 }}/>
      )}
      <div
        ref={drawerRef}
        role={drawerOpen ? 'dialog' : undefined}
        aria-modal={drawerOpen ? 'true' : undefined}
        aria-label={drawerOpen ? (tt(lang, 'filter.searchFilterAria')) : undefined}
        tabIndex={drawerOpen ? -1 : undefined}
        onTouchStart={onDrawerTouchStart}
        onTouchEnd={onDrawerTouchEnd}
        style={{
        position: 'absolute', left: 0, right: 0, bottom: 0,
        // min(): em paisagem (~390px de altura) os 480 fixos estourariam a tela.
        height: drawerOpen ? 'min(480px, calc(100% - 60px))' : 56,
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
            <span style={{ color: 'var(--overlay1)', fontSize: 14 }}>{tt(lang, 'filter.searchFilterShort')}</span>
            <div style={{ flex: 1 }}/>
            <HifiMono>{filtered.length} {tt(lang, 'noun.spell.other')}</HifiMono>
          </div>
        ) : (
          <div style={{ flex: 1, overflow: 'auto', padding: '4px 16px 18px', display: 'flex', flexDirection: 'column', gap: 16 }}>
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder={tt(lang, 'filter.spellName')}
              className="hifi-input"
              style={{ fontSize: 16 }}
            />

            <div>
              <HifiSectionLabel style={{ marginBottom: 6 }}>{tt(lang, 'spell.level')}</HifiSectionLabel>
              <div style={{ display: 'flex', gap: 6, overflowX: 'auto', paddingBottom: 4 }}>
                {mobileFilterValues.level.map(v => (
                  <HifiPill key={v} active={filters.level?.has(v)} onClick={() => toggleFilter('level', v)}>{v === 'truque' ? (tt(lang, 'spell.cantrip')) : v}</HifiPill>
                ))}
              </div>
            </div>

            <div>
              <HifiSectionLabel style={{ marginBottom: 6 }}>{tt(lang, 'spell.school')}</HifiSectionLabel>
              <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                {mobileFilterValues.school.map(v => (
                  <HifiPill key={v} active={filters.school?.has(v)} onClick={() => toggleFilter('school', v)}>{hifiSchoolFilterLabel(v, versionLang)}</HifiPill>
                ))}
              </div>
            </div>

            <div>
              <HifiSectionLabel style={{ marginBottom: 6 }}>{tt(lang, 'spell.class')}</HifiSectionLabel>
              <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                {mobileFilterValues.class.map(v => (
                  <HifiPill key={v} active={filters.class?.has(v)} onClick={() => toggleFilter('class', v)}>{hifiTitleCaseFilterLabel(v)}</HifiPill>
                ))}
              </div>
            </div>

            {extraFilters.map(key => (
              <div key={key}>
                <HifiSectionLabel style={{ marginBottom: 6, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  {filterCfg[key].label}
                  <button
                    onClick={() => removeExtraFilter(key)}
                    className="hifi-btn-ghost"
                    style={{ fontSize: 11, color: 'var(--red)', padding: '2px 6px' }}
                  >{tt(lang, 'filter.removeFilter')}</button>
                </HifiSectionLabel>
                <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                  {(extraValues[key] || []).map(v => (
                    <HifiPill key={v} active={filters[key]?.has(v)} onClick={() => toggleFilter(key, v)}>{v}</HifiPill>
                  ))}
                </div>
              </div>
            ))}

            {availableExtras.length > 0 && (
              <div>
                <HifiSectionLabel style={{ marginBottom: 6 }}>{tt(lang, 'filter.add')}</HifiSectionLabel>
                <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                  {availableExtras.map(key => (
                    <HifiPill key={key} onClick={() => addExtraFilter(key)}>+ {filterCfg[key].label}</HifiPill>
                  ))}
                </div>
              </div>
            )}

            <div>
              <HifiSectionLabel style={{ marginBottom: 6 }}>{tt(lang, 'version.label')}</HifiSectionLabel>
              <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                {versions.map(v => (
                  <HifiPill
                    key={v.key}
                    active={versionKey === v.key}
                    onClick={() => {
                      switchVersion(v.key);
                      setDrawerOpen(false);
                      showToast(tt(lang, 'toast.versionShort', { short: v.short }));
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
              <HifiSectionLabel style={{ marginBottom: 6 }}>{tt(lang, 'section.tools')}</HifiSectionLabel>
              {/* Sem o toggle 🇧🇷/EN aqui: as pills de "versão" logo acima já
                  trocam idioma+edição — dois controles pro mesmo estado no
                  mesmo drawer só confundem. */}
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                <HifiThemeToggle dark={dark} lang={lang}/>
                <button
                  onClick={() => {
                    const preparedSet = new Set(liveChar?.prepared || []);
                    const preparedSpells = allSpells.filter(s => preparedSet.has(hifiSpellKey(s)));
                    hifiPrintPrepared(preparedSpells, lang, showToast, { character: liveChar });
                  }}
                  className="hifi-icon-btn"
                  title={tt(lang, 'action.printPrepared')}
                  style={{ fontSize: 13, background: 'var(--surface1)' }}
                >⎙</button>
                <button
                  onClick={() => window.__shareBuild && window.__shareBuild()}
                  className="hifi-icon-btn"
                  title={tt(lang, 'action.shareBuild')}
                  style={{ fontSize: 13, background: 'var(--surface1)' }}
                >↗</button>
              </div>
            </div>

            <div>
              <HifiSectionLabel style={{ marginBottom: 6 }}>{tt(lang, 'section.actions')}</HifiSectionLabel>
              {/* Um botão só: os antigos "copiar link" e "compartilhar filtro"
                  copiavam a MESMA location crua (que não carrega estado nenhum).
                  Este serializa busca + filtros + versão numa URL que restaura
                  a visão em quem abrir. */}
              <button className="hifi-btn-secondary" style={{ width: '100%' }}
                onClick={() => {
                  const url = hifiShareViewUrl({ query, filters, onlyPrepared, versionKey });
                  const title = tt(lang, 'title.myGrimoire');
                  if (navigator.share) {
                    navigator.share({ title, url }).catch(() => {});
                  } else if (navigator.clipboard?.writeText) {
                    navigator.clipboard.writeText(url).then(
                      () => showToast(tt(lang, 'toast.linkCopiedShort')),
                      () => showToast(tt(lang, 'toast.copyFailed'), 'err'),
                    );
                  } else { showToast(url); }
                }}>
                {tt(lang, 'action.shareView')}
              </button>
            </div>

            <button onClick={clearAllFilters} className="hifi-btn-ghost" style={{ alignSelf: 'flex-start' }}>{tt(lang, 'filter.clearAll')}</button>
          </div>
        )}
      </div>

      {/* Character sheet (switcher) */}
      {charSheetTransition.mounted && (
        <div onClick={() => setCharSheetOpen(false)}
          className={charSheetOpen ? 'hifi-fade-in' : charSheetTransition.cls}
          style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.45)', zIndex: 20, display: 'flex', alignItems: 'flex-end' }}>
          <div
            ref={charSheetRef}
            role="dialog" aria-modal="true"
            aria-label={tt(lang, 'char.switch')}
            tabIndex={-1}
            onClick={(e) => e.stopPropagation()}
            className={charSheetOpen ? 'hifi-slide-up' : (charSheetTransition.mounted ? 'hifi-fade-out' : '')}
            style={{
              width: '100%', background: 'var(--mantle)',
              borderTopLeftRadius: 16, borderTopRightRadius: 16,
              padding: '10px 0 12px',
            }}>
            <div style={{ display: 'flex', justifyContent: 'center', padding: '4px 0 8px' }}>
              <div style={{ width: 40, height: 4, borderRadius: 2, background: 'var(--surface2)' }}/>
            </div>
            <div className="hifi-section-label" style={{ padding: '4px 18px 8px' }}>
              {tt(lang, 'char.label')}
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
                    <span style={{ flex: 1, fontSize: 15 }}>{hifiCharName(c, lang)}</span>
                    {isCurrent && <span style={{ color: dark ? ca.accent_dark : ca.accent, fontSize: 13 }}>✓</span>}
                  </button>
                  <button
                    onClick={() => { setCharSheetOpen(false); setEditor({ charId: c.id }); }}
                    className="hifi-btn-ghost"
                    style={{ padding: '6px 12px', fontSize: 12, color: 'var(--subtext0)' }}>
                    {tt(lang, 'char.edit')}
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
              <span style={{ fontSize: 15 }}>{tt(lang, 'char.new')}</span>
            </button>
          </div>
        </div>
      )}

      {/* Modo sessão — tela cheia por cima do grimório (abaixo do editor). */}
      {sessionTransition.mounted && (
        <div className={sessionOpen ? 'hifi-slide-in-right' : 'hifi-slide-out-right'} style={{ position: 'absolute', inset: 0, zIndex: 25, background: 'var(--base)' }}>
          <HifiSessionMode
            character={liveChar} update={update} lang={lang}
            allSpells={allSpells}
            onExit={() => openSession(false)}
          />
        </div>
      )}

      {/* Character editor — full-screen on mobile */}
      {mobileEditorTransition.mounted && (
        <div className={editor ? 'hifi-fade-in' : mobileEditorTransition.cls} style={{ position: 'absolute', inset: 0, zIndex: 30 }}>
          <CharacterEditor
            lang={lang} dark={dark} theme={theme}
            charId={editor?.charId}
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

      {/* bottom 70: acima do handle do drawer (56px), senão o toast some atrás dele */}
      <HifiToast toast={toast} accent={accent} bottom={70}/>
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
