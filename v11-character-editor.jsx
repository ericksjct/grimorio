// V11 — Character store + create/edit panel
// Store persists to localStorage and broadcasts changes via a custom event,
// so every artboard on the design canvas stays in sync.

// Cor de destaque por personagem.
// Slots compartilhados entre temas — o id semântico do personagem mantém
// o "significado" da cor quando o tema muda; cada tema entrega seu próprio
// par (light/dark) para aquele slot.
const ACCENT_SLOTS = ['red', 'orange', 'yellow', 'green', 'teal', 'blue', 'purple', 'pink'];

const THEME_PALETTES = {
  catppuccin: {
    red:    { light: '#d20f39', dark: '#f38ba8' },
    orange: { light: '#fe640b', dark: '#fab387' },
    yellow: { light: '#df8e1d', dark: '#f9e2af' },
    green:  { light: '#40a02b', dark: '#a6e3a1' },
    teal:   { light: '#179299', dark: '#94e2d5' },
    blue:   { light: '#1e66f5', dark: '#89b4fa' },
    purple: { light: '#8839ef', dark: '#cba6f7' },
    pink:   { light: '#ea76cb', dark: '#f5c2e7' },
  },
  nord: {
    red:    { light: '#bf616a', dark: '#bf616a' },
    orange: { light: '#d08770', dark: '#d08770' },
    yellow: { light: '#ebcb8b', dark: '#ebcb8b' },
    green:  { light: '#a3be8c', dark: '#a3be8c' },
    teal:   { light: '#8fbcbb', dark: '#8fbcbb' },
    blue:   { light: '#5e81ac', dark: '#81a1c1' },
    purple: { light: '#b48ead', dark: '#b48ead' },
    pink:   { light: '#88c0d0', dark: '#88c0d0' }, // frost light blue como surrogate
  },
  monokai: {
    red:    { light: '#d31760', dark: '#f92672' },
    orange: { light: '#d65f00', dark: '#fd971f' },
    yellow: { light: '#a18800', dark: '#e6db74' },
    green:  { light: '#6f9a14', dark: '#a6e22e' },
    teal:   { light: '#1c9ab0', dark: '#66d9ef' },
    blue:   { light: '#1979a0', dark: '#66d9ef' },
    purple: { light: '#8e63d6', dark: '#ae81ff' },
    pink:   { light: '#d31760', dark: '#f92672' },
  },
  solarized: {
    red:    { light: '#dc322f', dark: '#dc322f' },
    orange: { light: '#cb4b16', dark: '#cb4b16' },
    yellow: { light: '#b58900', dark: '#b58900' },
    green:  { light: '#859900', dark: '#859900' },
    teal:   { light: '#2aa198', dark: '#2aa198' },
    blue:   { light: '#268bd2', dark: '#268bd2' },
    purple: { light: '#6c71c4', dark: '#6c71c4' },
    pink:   { light: '#d33682', dark: '#d33682' },
  },
  // Tons joia legíveis sobre pergaminho (tema só-claro: light = dark).
  parchment: {
    red:    { light: '#a02020', dark: '#a02020' },
    orange: { light: '#c2600f', dark: '#c2600f' },
    yellow: { light: '#9c7a10', dark: '#9c7a10' },
    green:  { light: '#4a7a22', dark: '#4a7a22' },
    teal:   { light: '#1c8a8a', dark: '#1c8a8a' },
    blue:   { light: '#2b5fa0', dark: '#2b5fa0' },
    purple: { light: '#6e3fa0', dark: '#6e3fa0' },
    pink:   { light: '#a83a78', dark: '#a83a78' },
  },
  // Claro (carta): acentos vivos no claro, versões luminosas à luz de vela (escuro).
  daylight: {
    red:    { light: '#dc2626', dark: '#f06a6a' },
    orange: { light: '#ea580c', dark: '#f0944e' },
    yellow: { light: '#ca8a04', dark: '#e0b84a' },
    green:  { light: '#16a34a', dark: '#7bc96f' },
    teal:   { light: '#0d9488', dark: '#4fc4c0' },
    blue:   { light: '#2563eb', dark: '#6aa0f0' },
    purple: { light: '#7c3aed', dark: '#b48af0' },
    pink:   { light: '#db2777', dark: '#ee82c0' },
  },
};

// Compat: nomes antigos (Catppuccin) → slots semânticos atuais.
const LEGACY_ACCENT_MAP = {
  mauve: 'purple', peach: 'orange', sky: 'blue',
  maroon: 'red', lavender: 'purple', rosewater: 'pink',
};

function normalizeAccentId(accentId) {
  if (!accentId) return ACCENT_SLOTS[0];
  if (LEGACY_ACCENT_MAP[accentId]) return LEGACY_ACCENT_MAP[accentId];
  if (ACCENT_SLOTS.includes(accentId)) return accentId;
  return ACCENT_SLOTS[0];
}

function paletteFor(accentId, theme = 'catppuccin') {
  const id = normalizeAccentId(accentId);
  const palette = THEME_PALETTES[theme] || THEME_PALETTES.catppuccin;
  return { id, name: id, ...(palette[id] || palette[ACCENT_SLOTS[0]]) };
}

function paletteForTheme(theme = 'catppuccin') {
  const palette = THEME_PALETTES[theme] || THEME_PALETTES.catppuccin;
  return ACCENT_SLOTS.map(id => ({ id, name: id, ...palette[id] }));
}

function accentOf(c, dark, theme = 'catppuccin') {
  const p = paletteFor(c.accentId, theme);
  return dark ? p.dark : p.light;
}

// Legado — alguns componentes ainda importam HIFI_PALETTE; mantém o Catppuccin.
const HIFI_PALETTE = paletteForTheme('catppuccin');

// Único personagem padrão: genérico, pra convidar o usuário a clicar no título
// ("Grimório de Aventureiro Desconhecido") e personalizar/criar o seu.
const HIFI_DEFAULT_CHARS = [
  { id: 'aventureiro', name: 'Aventureiro Desconhecido', accentId: 'blue', prepared: [], bookmarked: [] },
];

const HIFI_CHARS_KEY = 'hifi_chars_v1';
const HIFI_CHARS_EVENT = 'hifi-chars-changed';

// Nome de EXIBIÇÃO do personagem. O default ('aventureiro') é genérico e
// localizado (PT/EN) — "Aventureiro Desconhecido" / "Unknown Adventurer".
// Personagens criados pelo usuário mantêm o nome literal digitado, em qualquer
// idioma. O nome ARMAZENADO nunca muda (é chave de lookup/persistência/share);
// só a exibição é traduzida.
function hifiCharName(char, lang) {
  if (!char) return '';
  if (char.id === 'aventureiro' && typeof window.makeT === 'function') {
    return window.makeT(lang)('char.default.name');
  }
  return char.name;
}
if (typeof window !== 'undefined') window.hifiCharName = hifiCharName;

// Classes conjuradoras (chaves canônicas em inglês — os mapas CLASS_PT/CLASS_EN
// do loader traduzem pro rótulo do idioma ativo). Nível 1..20 por classe.
const CASTER_CLASSES = ['artificer', 'bard', 'cleric', 'druid', 'paladin', 'ranger', 'sorcerer', 'warlock', 'wizard'];

function _normClassLevels(list) {
  if (!Array.isArray(list)) return [];
  const seen = new Set();
  const out = [];
  for (const cl of list) {
    const key = String(cl?.class || '').toLowerCase();
    const level = Math.max(1, Math.min(20, parseInt(cl?.level, 10) || 1));
    if (!CASTER_CLASSES.includes(key) || seen.has(key)) continue;
    seen.add(key);
    out.push({ class: key, level });
  }
  return out;
}

// Espaços de magia: totais e gastos por nível (1..9). Guardados como objetos
// { "1": 4, "3": 2 } — só níveis com valor > 0. `used` nunca excede `total`.
function _normSlots(slots) {
  const clean = (obj, cap) => {
    const out = {};
    for (let lvl = 1; lvl <= 9; lvl++) {
      const n = Math.max(0, Math.min(9, parseInt(obj?.[lvl], 10) || 0));
      const c = cap ? Math.min(n, cap[lvl] || 0) : n;
      if (c > 0) out[lvl] = c;
    }
    return out;
  };
  const total = clean(slots?.total);
  return { total, used: clean(slots?.used, total) };
}

function _normChar(c) {
  return {
    id: c.id || `char-${Date.now().toString(36)}-${Math.random().toString(36).slice(2,6)}`,
    name: c.name || 'Unnamed',
    accentId: c.accentId || 'mauve',
    prepared: Array.isArray(c.prepared) ? c.prepared : [],
    bookmarked: Array.isArray(c.bookmarked) ? c.bookmarked : [],
    slots: _normSlots(c.slots),
    classes: _normClassLevels(c.classes),
  };
}

function loadCharacters() {
  try {
    const s = localStorage.getItem(HIFI_CHARS_KEY);
    if (s) {
      const parsed = JSON.parse(s);
      if (Array.isArray(parsed) && parsed.length) return parsed.map(_normChar);
    }
  } catch (e) {}
  return HIFI_DEFAULT_CHARS.map(_normChar);
}

function persistCharacters(chars) {
  try { localStorage.setItem(HIFI_CHARS_KEY, JSON.stringify(chars)); } catch (e) {}
  window.dispatchEvent(new CustomEvent(HIFI_CHARS_EVENT, { detail: chars }));
}

// Each component subscribes to the custom event, so cross-artboard updates
// (e.g. create in one, see it in the next) feel instant.
function useCharacters() {
  const [chars, setChars] = React.useState(loadCharacters);
  React.useEffect(() => {
    const onChange = (e) => setChars(e.detail);
    window.addEventListener(HIFI_CHARS_EVENT, onChange);
    return () => window.removeEventListener(HIFI_CHARS_EVENT, onChange);
  }, []);
  const update = React.useCallback((updater) => {
    const prev = loadCharacters();
    const next = (typeof updater === 'function' ? updater(prev) : updater).map(_normChar);
    persistCharacters(next);
  }, []);
  return { chars, update };
}

// Convenience helpers used by spell list (read/write a char's spell sets).
function charHasPrepared(c, key) { return c && (c.prepared || []).includes(key); }
function charHasBookmarked(c, key) { return c && (c.bookmarked || []).includes(key); }

function togglePreparedFor(charId, key, update) {
  update(prev => prev.map(c => {
    if (c.id !== charId) return c;
    const s = new Set(c.prepared || []);
    s.has(key) ? s.delete(key) : s.add(key);
    return { ...c, prepared: [...s] };
  }));
}
function toggleBookmarkedFor(charId, key, update) {
  update(prev => prev.map(c => {
    if (c.id !== charId) return c;
    const s = new Set(c.bookmarked || []);
    s.has(key) ? s.delete(key) : s.add(key);
    return { ...c, bookmarked: [...s] };
  }));
}

// ── Espaços de magia (tracker) ─────────────────────────────────────
function setSlotUsedFor(charId, lvl, used, update) {
  update(prev => prev.map(c => {
    if (c.id !== charId) return c;
    const slots = _normSlots(c.slots);
    const next = { ...slots.used };
    const clamped = Math.max(0, Math.min(slots.total[lvl] || 0, used));
    if (clamped > 0) next[lvl] = clamped; else delete next[lvl];
    return { ...c, slots: { ...slots, used: next } };
  }));
}

// Descanso longo: restaura todos os espaços (used = 0 em todos os níveis).
function longRestFor(charId, update) {
  update(prev => prev.map(c => (c.id === charId ? { ...c, slots: { ..._normSlots(c.slots), used: {} } } : c)));
}

// ── Favoritas GLOBAIS ───────────────────────────────────────────────
// Favoritas não pertencem a um personagem: é uma lista única, compartilhada,
// independente de quem está selecionado. Store próprio em localStorage + evento
// (mesmo padrão do useCharacters), pra todos os componentes ficarem em sincronia.
const HIFI_BOOKMARKS_KEY = 'hifi_bookmarks_v1';
const HIFI_BOOKMARKS_EVENT = 'hifi-bookmarks-changed';

function loadBookmarks() {
  try {
    const s = localStorage.getItem(HIFI_BOOKMARKS_KEY);
    if (s !== null) {
      const parsed = JSON.parse(s);
      if (Array.isArray(parsed)) return parsed;
    } else {
      // Migração única: junta as favoritas que estavam salvas por personagem
      // (modelo antigo) numa lista global, pra ninguém perder o que marcou.
      const migrated = new Set();
      try {
        const cs = JSON.parse(localStorage.getItem(HIFI_CHARS_KEY) || '[]');
        if (Array.isArray(cs)) cs.forEach(c => (c.bookmarked || []).forEach(k => migrated.add(k)));
      } catch (e) {}
      const arr = [...migrated];
      try { localStorage.setItem(HIFI_BOOKMARKS_KEY, JSON.stringify(arr)); } catch (e) {}
      return arr;
    }
  } catch (e) {}
  return [];
}

function persistBookmarks(keys) {
  try { localStorage.setItem(HIFI_BOOKMARKS_KEY, JSON.stringify(keys)); } catch (e) {}
  window.dispatchEvent(new CustomEvent(HIFI_BOOKMARKS_EVENT, { detail: keys }));
}

function toggleBookmark(key) {
  const s = new Set(loadBookmarks());
  s.has(key) ? s.delete(key) : s.add(key);
  persistBookmarks([...s]);
}

function useBookmarks() {
  const [keys, setKeys] = React.useState(loadBookmarks);
  React.useEffect(() => {
    const onChange = (e) => setKeys(e.detail);
    window.addEventListener(HIFI_BOOKMARKS_EVENT, onChange);
    return () => window.removeEventListener(HIFI_BOOKMARKS_EVENT, onChange);
  }, []);
  return { bookmarks: keys, toggleBookmark };
}

// ──────────────────────────────────────────────────────────────────
// CHARACTER EDITOR
// ──────────────────────────────────────────────────────────────────
// Lives inside HifiDesktop / HifiMobile and overlays the artboard.
// `mode`: 'panel' (desktop slide-in) or 'fullscreen' (mobile).
// ──────────────────────────────────────────────────────────────────
// useDialogA11y — acessibilidade de modal/diálogo, reutilizável.
// Definido aqui (este arquivo carrega antes do v10) e exposto em window pra
// os modais do v10 (menu de personagem, drawer, ficha) usarem o MESMO código.
//
// Quando `open` vira true: move o foco pra dentro do diálogo (no contêiner com
// tabIndex -1), prende o Tab dentro dele (focus trap), fecha no Escape, e
// devolve o foco ao elemento que estava ativo quando o diálogo fechar.
// `ref` deve ser anexado ao contêiner do diálogo (que tem role="dialog").
// ──────────────────────────────────────────────────────────────────
function useDialogA11y(ref, open, onClose) {
  const restoreRef = React.useRef(null);
  const onCloseRef = React.useRef(onClose);
  onCloseRef.current = onClose; // sempre o handler mais recente, sem re-rodar o efeito
  React.useEffect(() => {
    if (!open) return;
    const node = ref.current;
    if (!node) return;
    restoreRef.current = document.activeElement;
    // Move o foco pra dentro do diálogo (leitor de tela "entra" no modal) — mas
    // SÓ se o foco ainda não estiver dentro. Um autoFocus já aplicado (ex.: o
    // campo "nome" em personagem novo) coloca o foco dentro do diálogo antes
    // deste efeito passivo rodar; sem essa guarda, o node.focus() roubaria o
    // foco do campo e o usuário começaria a digitar no vazio.
    if (!node.contains(document.activeElement)) {
      try { node.focus({ preventScroll: true }); } catch (e) { node.focus(); }
    }
    const SELECTOR = 'a[href],button:not([disabled]),input:not([disabled]),select:not([disabled]),textarea:not([disabled]),[tabindex]:not([tabindex="-1"])';
    const onKey = (e) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        e.stopPropagation();
        onCloseRef.current && onCloseRef.current();
        return;
      }
      if (e.key !== 'Tab') return;
      const items = Array.from(node.querySelectorAll(SELECTOR))
        .filter(el => el.offsetParent !== null || el === document.activeElement);
      if (items.length === 0) { e.preventDefault(); node.focus(); return; }
      const first = items[0];
      const last = items[items.length - 1];
      const active = document.activeElement;
      if (e.shiftKey) {
        if (active === first || active === node || !node.contains(active)) { e.preventDefault(); last.focus(); }
      } else {
        if (active === last || !node.contains(active)) { e.preventDefault(); first.focus(); }
      }
    };
    node.addEventListener('keydown', onKey);
    return () => {
      node.removeEventListener('keydown', onKey);
      const r = restoreRef.current;
      if (r && typeof r.focus === 'function') { try { r.focus(); } catch (e) {} }
    };
  }, [open]);
}
if (typeof window !== 'undefined') window.useDialogA11y = useDialogA11y;

function useHifiTransition(open, duration = 180) {
  const [state, setState] = React.useState({ mounted: open, cls: open ? 'hifi-fade-in' : '' });
  const timerRef = React.useRef(null);

  React.useEffect(() => {
    if (open) {
      if (timerRef.current) clearTimeout(timerRef.current);
      setState({ mounted: true, cls: 'hifi-fade-in' });
    } else {
      setState(prev => ({ ...prev, cls: 'hifi-fade-out' }));
      timerRef.current = setTimeout(() => {
        setState({ mounted: false, cls: '' });
      }, duration);
    }
    return () => { if (timerRef.current) clearTimeout(timerRef.current); };
  }, [open, duration]);

  return state;
}
if (typeof window !== 'undefined') window.useHifiTransition = useHifiTransition;

function CharacterEditor({ lang = 'ptbr', dark = false, theme = 'catppuccin', charId = null, mode = 'panel', onClose }) {
  const { chars, update } = useCharacters();
  const isNew = !charId;
  const existing = chars.find(c => c.id === charId);

  // Acessibilidade de diálogo: foco preso, Escape fecha, foco volta ao fechar.
  // O editor é modal enquanto montado, então open = true.
  const dialogRef = React.useRef(null);
  useDialogA11y(dialogRef, true, () => onClose?.(null));

  const [name, setName] = React.useState(existing?.name || '');
  const [accentId, setAccentId] = React.useState(normalizeAccentId(existing?.accentId) || 'purple');
  const [prepared, setPrepared] = React.useState(() => new Set(existing?.prepared || []));
  // Totais de espaços de magia por nível (1..9). '' = nível sem espaços.
  const [slotTotals, setSlotTotals] = React.useState(() => _normSlots(existing?.slots).total);
  // Classes e níveis do personagem (multiclasse suportada).
  const [classLevels, setClassLevels] = React.useState(() => _normClassLevels(existing?.classes));
  // Favoritas são globais (independentes do personagem) — vêm do store global.
  const { bookmarks } = useBookmarks();
  const bookmarked = React.useMemo(() => new Set(bookmarks), [bookmarks]);
  const [query, setQuery] = React.useState('');
  const [tab, setTab] = React.useState('all'); // all | prepared | bookmarked
  const [confirmDelete, setConfirmDelete] = React.useState(false);

  const [spellVersion, setSpellVersion] = React.useState(0);
  React.useEffect(() => {
    const onChange = () => setSpellVersion(v => v + 1);
    window.addEventListener('hifi-spells-source-changed', onChange);
    return () => window.removeEventListener('hifi-spells-source-changed', onChange);
  }, []);
  const allSpells = React.useMemo(
    () => (window.v7BuildSpells ? window.v7BuildSpells() : []),
    [spellVersion]
  );

  const filteredSpells = React.useMemo(() => {
    let out = allSpells;
    if (tab === 'prepared') out = out.filter(s => prepared.has(hifiSpellKey(s)));
    else if (tab === 'bookmarked') out = out.filter(s => bookmarked.has(hifiSpellKey(s)));
    if (query.trim()) {
      const q = hifiNorm(query.trim());
      out = out.filter(s =>
        hifiNorm(spellName(s, lang)).includes(q) || hifiNorm(s.en).includes(q)
      );
    }
    return out;
  }, [allSpells, query, tab, prepared, bookmarked]);

  // Helper bilíngue (pt, en) — mecanismo centralizado no i18n (window.bilingual).
  const T = window.bilingual ? window.bilingual(lang) : (pt, en) => (lang === 'ptbr' ? pt : en);

  const trimmed = name.trim();
  const nameError =
    !trimmed
      ? T('nome obrigatório', 'name is required')
      : chars.some(c => c.id !== charId && c.name.trim().toLowerCase() === trimmed.toLowerCase())
        ? T('já existe um personagem com esse nome', 'name already in use')
        : null;

  const canSave = !nameError;
  const previewAccent = paletteFor(accentId, theme)[dark ? 'dark' : 'light'];

  function togglePrep(s) {
    const k = hifiSpellKey(s);
    setPrepared(prev => { const n = new Set(prev); n.has(k) ? n.delete(k) : n.add(k); return n; });
  }
  function toggleBook(s) {
    // Favoritar afeta a lista global na hora (não depende de salvar o personagem).
    toggleBookmark(hifiSpellKey(s));
  }

  function save() {
    if (!canSave) return;
    const id = charId || `char-${Date.now().toString(36)}-${Math.random().toString(36).slice(2,6)}`;
    const next = {
      id, name: trimmed, accentId,
      prepared: [...prepared],
      // Mantém os gastos atuais; _normSlots (no _normChar) recorta used > total.
      slots: { total: slotTotals, used: _normSlots(existing?.slots).used },
      classes: classLevels,
    };
    update(prev => isNew ? [...prev, next] : prev.map(c => c.id === charId ? next : c));
    onClose?.({ action: isNew ? 'created' : 'updated', character: next });
  }

  function remove() {
    if (chars.length <= 1) return;
    update(prev => prev.filter(c => c.id !== charId));
    onClose?.({ action: 'deleted', character: existing });
  }

  const themeClass = `${dark ? 'hifi-dark' : 'hifi-light'}${theme && theme !== 'catppuccin' ? ' hifi-theme-' + theme : ''}`;

  // Wrapper shell — sliding panel on desktop, full-bleed on mobile.
  const shellStyle = {
    '--accent': previewAccent,
    background: 'var(--base)',
    color: 'var(--text)',
    display: 'flex', flexDirection: 'column',
    height: '100%', width: '100%',
    overflow: 'hidden',
  };

  return (
    <div
      ref={dialogRef}
      role="dialog"
      aria-modal="true"
      aria-label={isNew ? T('Novo personagem', 'New character') : T('Editar personagem', 'Edit character')}
      tabIndex={-1}
      className={`hifi ${themeClass}`}
      style={shellStyle}
    >
      {/* Header */}
      <div style={{
        padding: mode === 'fullscreen' ? '14px 16px' : '16px 20px 14px',
        borderBottom: '1px solid var(--surface1)',
        display: 'flex', alignItems: 'flex-start', gap: 12,
        flexShrink: 0,
      }}>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div className="hifi-section-label">{T('personagem', 'character')}</div>
          <div className="hifi-display" style={{
            fontSize: mode === 'fullscreen' ? 22 : 22,
            marginTop: 4, color: 'var(--text)',
            display: 'flex', alignItems: 'center', gap: 10,
          }}>
            <span style={{
              width: 12, height: 12, borderRadius: '50%',
              background: previewAccent,
              boxShadow: 'inset 0 0 0 1px rgba(0,0,0,0.08)',
              flexShrink: 0,
            }}/>
            <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {isNew ? T('Novo personagem', 'New character')
                : T(`Editar ${existing?.name}`, `Edit ${existing?.name}`)}
            </span>
          </div>
        </div>
        <button className="hifi-icon-btn" onClick={() => onClose?.(null)} aria-label={T('fechar', 'close')} title={T('fechar', 'close')}><span aria-hidden="true">×</span></button>
      </div>

      {/* Body */}
      <div style={{
        flex: 1, overflow: 'auto',
        padding: mode === 'fullscreen' ? '16px 16px 12px' : '18px 20px 12px',
        display: 'flex', flexDirection: 'column', gap: 22,
      }}>
        {/* Name */}
        <div>
          <HifiSectionLabel>{T('nome', 'name')}</HifiSectionLabel>
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder={T('ex: Aelwyn', 'e.g. Aelwyn')}
            aria-label={T('nome do personagem', 'character name')}
            className="hifi-input"
            autoFocus={isNew}
            maxLength={32}
            style={{ marginTop: 6, width: '100%', fontSize: 16 }}
          />
          {name.length > 0 && nameError && (
            <div style={{ marginTop: 6, fontSize: 12, color: 'var(--red)' }}>{nameError}</div>
          )}
        </div>

        {/* Classes e níveis — pré-filtram a lista (classe + círculo máximo). */}
        <div>
          <HifiSectionLabel>{T('classes e níveis', 'classes & levels')}</HifiSectionLabel>
          <p style={{ margin: '4px 0 0', fontSize: 12, color: 'var(--subtext0)', lineHeight: 1.4 }}>
            {T('a lista de magias abre já filtrada pelas classes e pelo círculo que o personagem alcança',
               'the spell list opens pre-filtered by class and by the highest circle the character can cast')}
          </p>
          <div style={{ marginTop: 10, display: 'flex', flexDirection: 'column', gap: 6 }}>
            {classLevels.map((cl, idx) => {
              const label = (key) => {
                const pt = (window.CLASS_PT || {})[key] || key;
                const raw = lang === 'ptbr' ? pt : key;
                return raw.charAt(0).toUpperCase() + raw.slice(1);
              };
              const free = CASTER_CLASSES.filter(k => k === cl.class || !classLevels.some(o => o.class === k));
              return (
                <div key={cl.class} style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                  <select
                    value={cl.class}
                    onChange={(e) => setClassLevels(prev => prev.map((o, i) => i === idx ? { ...o, class: e.target.value } : o))}
                    aria-label={T('classe', 'class')}
                    className="hifi-input"
                    style={{ flex: 1, height: 34 }}
                  >
                    {free.map(k => <option key={k} value={k}>{label(k)}</option>)}
                  </select>
                  <input
                    type="number" min={1} max={20} inputMode="numeric"
                    value={cl.level}
                    onChange={(e) => {
                      const n = Math.max(1, Math.min(20, parseInt(e.target.value, 10) || 1));
                      setClassLevels(prev => prev.map((o, i) => i === idx ? { ...o, level: n } : o));
                    }}
                    aria-label={T(`nível de ${label(cl.class)}`, `${label(cl.class)} level`)}
                    className="hifi-input"
                    style={{ width: 62, textAlign: 'center' }}
                  />
                  <button
                    className="hifi-icon-btn"
                    onClick={() => setClassLevels(prev => prev.filter((_, i) => i !== idx))}
                    aria-label={T('remover classe', 'remove class')}
                    title={T('remover classe', 'remove class')}
                  ><span aria-hidden="true">×</span></button>
                </div>
              );
            })}
            {classLevels.length < CASTER_CLASSES.length && (
              <button
                className="hifi-btn-ghost"
                onClick={() => {
                  const next = CASTER_CLASSES.find(k => !classLevels.some(o => o.class === k));
                  if (next) setClassLevels(prev => [...prev, { class: next, level: 1 }]);
                }}
                style={{ alignSelf: 'flex-start', color: 'var(--accent)' }}
              >+ {T('adicionar classe', 'add class')}</button>
            )}
          </div>
        </div>

        {/* Color */}
        <div>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: 10 }}>
            <HifiSectionLabel>{T('cor de destaque', 'accent color')}</HifiSectionLabel>
            <div style={{ flex: 1 }}/>
            <HifiMono style={{ textTransform: 'lowercase' }}>{paletteFor(accentId, theme).name}</HifiMono>
          </div>
          <div style={{
            marginTop: 10, display: 'grid',
            gridTemplateColumns: 'repeat(8, 1fr)',
            gap: 10,
          }}>
            {paletteForTheme(theme).map(p => {
              const c = dark ? p.dark : p.light;
              const sel = p.id === accentId;
              return (
                <button key={p.id}
                  onClick={() => setAccentId(p.id)}
                  title={p.name}
                  aria-label={p.name}
                  style={{
                    cursor: 'pointer',
                    aspectRatio: '1', borderRadius: '50%',
                    background: c,
                    border: sel ? '3px solid var(--text)' : '3px solid transparent',
                    boxShadow: sel
                      ? '0 0 0 1px var(--surface1), inset 0 0 0 1px rgba(0,0,0,0.06)'
                      : 'inset 0 0 0 1px rgba(0,0,0,0.06)',
                    padding: 0,
                    transition: 'transform 100ms',
                    transform: sel ? 'scale(1.04)' : 'scale(1)',
                  }}/>
              );
            })}
          </div>
        </div>

        {/* Spell slots — totais por nível; o tracker na tela principal usa isso. */}
        <div>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: 10 }}>
            <HifiSectionLabel>{T('espaços de magia', 'spell slots')}</HifiSectionLabel>
            <div style={{ flex: 1 }}/>
            <HifiMono style={{ color: 'var(--subtext0)' }}>
              {Object.values(slotTotals).reduce((a, b) => a + b, 0) || '—'}
            </HifiMono>
          </div>
          <p style={{ margin: '4px 0 0', fontSize: 12, color: 'var(--subtext0)', lineHeight: 1.4 }}>
            {T('quantos espaços por nível (deixe 0 pra ocultar o nível)',
               'how many slots per level (leave 0 to hide the level)')}
          </p>
          <div style={{
            marginTop: 10, display: 'grid',
            gridTemplateColumns: 'repeat(9, 1fr)', gap: 6,
          }}>
            {[1,2,3,4,5,6,7,8,9].map(lvl => (
              <label key={lvl} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}>
                <span className="hifi-mono" style={{ fontSize: 10, color: `var(--level-${lvl})` }}>{lvl}</span>
                <input
                  type="number" min={0} max={9} inputMode="numeric"
                  value={slotTotals[lvl] || 0}
                  onChange={(e) => {
                    const n = Math.max(0, Math.min(9, parseInt(e.target.value, 10) || 0));
                    setSlotTotals(prev => {
                      const next = { ...prev };
                      if (n > 0) next[lvl] = n; else delete next[lvl];
                      return next;
                    });
                  }}
                  aria-label={T(`espaços de nível ${lvl}`, `level ${lvl} slots`)}
                  className="hifi-input"
                  style={{ width: '100%', textAlign: 'center', padding: '4px 2px', fontSize: 13 }}
                />
              </label>
            ))}
          </div>
        </div>

        {/* Spells */}
        <div style={{ display: 'flex', flexDirection: 'column', minHeight: 0 }}>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: 10 }}>
            <HifiSectionLabel>{T('magias', 'spells')}</HifiSectionLabel>
            <div style={{ flex: 1 }}/>
            <HifiMono>
              <span style={{ color: 'var(--accent)', display: 'inline-flex', alignItems: 'center', gap: 4 }}><HifiBookmarkIcon size={11}/>{prepared.size}</span>
              <span style={{ color: 'var(--overlay0)', margin: '0 6px' }}>·</span>
              <span style={{ color: 'var(--yellow)' }}>★ {bookmarked.size}</span>
            </HifiMono>
          </div>

          {/* Tab switcher */}
          <div style={{ marginTop: 8, display: 'flex', gap: 4 }}>
            {[
              { id: 'all',        label: T('todas', 'all') },
              { id: 'prepared',   label: T('preparadas', 'prepared') },
              { id: 'bookmarked', label: T('favoritas', 'bookmarks') },
            ].map(t => (
              <button key={t.id} type="button"
                onClick={() => setTab(t.id)}
                aria-pressed={tab === t.id}
                className={`hifi-pill${tab === t.id ? ' active' : ''}`}
                style={{ cursor: 'pointer' }}>{t.label}</button>
            ))}
          </div>

          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={T('buscar magia…', 'search spell…')}
            aria-label={T('buscar magia', 'search spell')}
            className="hifi-input"
            style={{ marginTop: 8, width: '100%' }}
          />

          <div style={{
            marginTop: 8,
            border: '1px solid var(--surface1)',
            borderRadius: 4,
            background: 'var(--mantle)',
            maxHeight: mode === 'fullscreen' ? 340 : 320,
            overflow: 'auto',
          }}>
            {filteredSpells.map((s, i) => {
              const k = hifiSpellKey(s);
              const isPrep = prepared.has(k);
              const isBook = bookmarked.has(k);
              return (
                <div key={k} style={{
                  display: 'flex', alignItems: 'stretch',
                  borderBottom: i < filteredSpells.length - 1 ? '1px solid var(--surface1)' : 'none',
                }}>
                  <div className={`hifi-level-bar hifi-level-${s.lvl}`} style={{ position: 'static', width: 3 }}/>
                  <div style={{ flex: 1, minWidth: 0, padding: '8px 12px' }}>
                    <div style={{ fontFamily: "'Texturina', 'Marauder Display', Georgia, serif", fontWeight: 600, fontSize: 14, color: 'var(--text)' }}>
                      {spellName(s, lang)}
                    </div>
                    <div style={{ fontSize: 11, color: 'var(--subtext0)', fontStyle: 'italic' }}>
                      {schoolKey(s.school)} · {s.lvl === 0 ? T('truque', 'cantrip') : `${T('nv', 'lvl')} ${s.lvl}`}
                    </div>
                  </div>
                  <button onClick={() => togglePrep(s)}
                    style={{
                      width: 36, border: 'none', background: 'transparent', cursor: 'pointer',
                      color: isPrep ? 'var(--accent)' : 'var(--overlay1)',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                    }}
                    title={T('preparar', 'prepare')}>
                    <HifiBookmarkIcon size={14} filled={isPrep}/>
                  </button>
                  <button onClick={() => toggleBook(s)}
                    style={{
                      width: 36, border: 'none', background: 'transparent', cursor: 'pointer',
                      color: isBook ? 'var(--yellow)' : 'var(--overlay1)', fontSize: 16,
                    }}
                    title={T('favorita', 'bookmark')}>
                    {isBook ? '★' : '☆'}
                  </button>
                </div>
              );
            })}
            {filteredSpells.length === 0 && (
              <div style={{ padding: 24, textAlign: 'center', color: 'var(--subtext0)', fontStyle: 'italic', fontSize: 13 }}>
                {tab === 'prepared'
                  ? T('nenhuma magia preparada ainda', 'no prepared spells yet')
                  : tab === 'bookmarked'
                  ? T('nenhuma favorita ainda', 'no bookmarks yet')
                  : T('nenhuma magia encontrada', 'no spells found')}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Footer */}
      <div style={{
        padding: '12px 16px',
        borderTop: '1px solid var(--surface1)',
        display: 'flex', gap: 6, alignItems: 'center',
        background: 'var(--mantle)',
        flexShrink: 0,
      }}>
        {!isNew && (
          confirmDelete ? (
            <>
              <span style={{ fontSize: 13, color: 'var(--subtext0)' }}>{T('tem certeza?', 'sure?')}</span>
              <button className="hifi-btn-ghost" onClick={() => setConfirmDelete(false)}>
                {T('cancelar', 'cancel')}
              </button>
              <button className="hifi-btn-secondary" onClick={remove}
                style={{ color: 'var(--red)', borderColor: 'var(--red)' }}>
                {T('excluir', 'delete')}
              </button>
            </>
          ) : (
            <button className="hifi-btn-ghost" onClick={() => setConfirmDelete(true)}
              style={{ color: 'var(--red)' }}
              disabled={chars.length <= 1}
              title={chars.length <= 1
                ? T('precisa de pelo menos um personagem', 'need at least one character')
                : ''}>
              {T('excluir', 'delete')}
            </button>
          )
        )}
        <div style={{ flex: 1 }}/>
        <button className="hifi-btn-ghost" onClick={() => onClose?.(null)}>
          {T('cancelar', 'cancel')}
        </button>
        <button className="hifi-btn-primary" onClick={save} disabled={!canSave}
          style={!canSave ? { opacity: 0.45, cursor: 'not-allowed' } : {}}>
          {isNew ? T('criar', 'create') : T('salvar', 'save')}
        </button>
      </div>
    </div>
  );
}

Object.assign(window, {
  HIFI_PALETTE, ACCENT_SLOTS, THEME_PALETTES,
  paletteFor, paletteForTheme, accentOf, normalizeAccentId,
  HIFI_DEFAULT_CHARS,
  loadCharacters, persistCharacters, useCharacters,
  loadBookmarks, persistBookmarks, useBookmarks,
  togglePreparedFor, toggleBookmarkedFor,
  setSlotUsedFor, longRestFor, _normSlots,
  CASTER_CLASSES, _normClassLevels,
  charHasPrepared, charHasBookmarked,
  CharacterEditor,
  useHifiTransition,
});
