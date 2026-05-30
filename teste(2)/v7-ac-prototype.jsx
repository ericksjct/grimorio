// V7 — protótipo funcional: barra de chips + ⌘K sincronizados.
// Lógica: OU dentro de uma categoria, E entre categorias.
// ⌘K aceita: texto livre (busca por nome) e comandos sintáticos (classe:mago, lvl<3, escola:evoc)
// Tudo aplica nos mesmos filterState — barra reflete ⌘K e vice-versa.

const V7_CATEGORIES = [
  { key: 'class',  label_pt: 'classe',  label_en: 'class',  values: ['mago', 'clérigo', 'bardo', 'druida', 'feiticeiro', 'bruxo', 'patrulheiro', 'paladino'], values_en: ['wizard','cleric','bard','druid','sorcerer','warlock','ranger','paladin'] },
  { key: 'level',  label_pt: 'nível',   label_en: 'level',  values: ['truque','1','2','3','4','5','6','7','8','9'], values_en: ['cantrip','1','2','3','4','5','6','7','8','9'] },
  { key: 'school', label_pt: 'escola',  label_en: 'school', values: ['abjur','conj','div','ench','evoc','ilus','necr','trans'], values_en: ['abjur','conj','divin','ench','evoc','illus','necro','transm'] },
  { key: 'source', label_pt: 'fonte',   label_en: 'source', values: ['PHB','XGE','TCE','FTD'], values_en: ['PHB','XGE','TCE','FTD'] },
  { key: 'edition',label_pt: 'edição',  label_en: 'edition',values: ['5e 2014','5e 2024'], values_en: ['5e 2014','5e 2024'] },
];

const V7_SECONDARY = [
  { key: 'castTime',     label_pt: 'tempo de conjuração', label_en: 'cast time' },
  { key: 'range',        label_pt: 'alcance',             label_en: 'range' },
  { key: 'duration',     label_pt: 'duração',             label_en: 'duration' },
  { key: 'concentration',label_pt: 'concentração',        label_en: 'concentration' },
  { key: 'ritual',       label_pt: 'ritual',              label_en: 'ritual' },
];

// Spell mock data — extends WF_SPELLS with class/source/edition for filtering demo
function v7BuildSpells() {
  // attach mock metadata so filters have something to bite
  const classMap = [
    ['mago','feiticeiro'], ['mago','bardo'], ['mago','clérigo'], ['bardo','bruxo'],
    ['clérigo','paladino'], ['druida','patrulheiro'], ['mago','feiticeiro'], ['bruxo','feiticeiro'],
    ['mago','feiticeiro','clérigo'], ['clérigo','paladino','bardo'], ['mago','bardo'], ['mago','bruxo'],
    ['druida','feiticeiro'], ['paladino','clérigo'], ['bardo','mago'],
    ['mago','feiticeiro','bruxo'], // test spell (level 7)
  ];
  const sources = ['PHB','PHB','PHB','XGE','PHB','PHB','XGE','TCE','PHB','PHB','PHB','XGE','TCE','PHB','FTD','TCE'];
  const editions = ['5e 2014','5e 2014','5e 2024','5e 2024','5e 2014','5e 2014','5e 2014','5e 2024','5e 2014','5e 2014','5e 2014','5e 2014','5e 2024','5e 2014','5e 2024','5e 2024'];
  return WF_SPELLS.map((s, i) => ({ ...s, classes: classMap[i] || ['mago'], src: sources[i], edition: editions[i] }));
}

// Convert a spell's level (number) to the value-string used in the filter
function levelKey(lvl) { return lvl === 0 ? 'truque' : String(lvl); }

// School index → key
const SCHOOL_KEYS = ['abjur','conj','div','ench','evoc','ilus','necr','trans'];
function schoolKey(idx) { return SCHOOL_KEYS[idx] || 'evoc'; }

// ─────────────────────────────────────────────────────────
// FILTER ENGINE
// ─────────────────────────────────────────────────────────
function applyFilters(spells, filters, query) {
  return spells.filter(s => {
    for (const cat of Object.keys(filters)) {
      const sel = filters[cat];
      if (!sel || sel.size === 0) continue;
      let val;
      if (cat === 'class') {
        // OR: spell matches if ANY of its classes is selected
        if (![...sel].some(c => s.classes.includes(c))) return false;
        continue;
      } else if (cat === 'level') {
        val = levelKey(s.lvl);
      } else if (cat === 'school') {
        val = schoolKey(s.school);
      } else if (cat === 'source') {
        val = s.src;
      } else if (cat === 'edition') {
        val = s.edition;
      }
      if (!sel.has(val)) return false;
    }
    if (query && query.trim()) {
      const q = query.trim().toLowerCase();
      if (!s.en.toLowerCase().includes(q) && !s.pt.toLowerCase().includes(q)) return false;
    }
    return true;
  });
}

// Parse a ⌘K command line like "classe:mago lvl<3 fogo"
// Returns { filters: {category: Set}, residualQuery: string }
function parseCommandLine(line) {
  const tokens = line.match(/\S+/g) || [];
  const filters = {};
  const residual = [];
  for (const tok of tokens) {
    // operator forms: lvl<3, lvl<=3, lvl=3
    const op = tok.match(/^(lvl|nivel|nível|level)(<=|<|=|>=|>)(\d+)$/i);
    if (op) {
      const operator = op[2];
      const n = parseInt(op[3], 10);
      const set = filters.level || new Set();
      for (let i = 0; i <= 9; i++) {
        const ok =
          operator === '<'  ? i <  n :
          operator === '<=' ? i <= n :
          operator === '='  ? i === n :
          operator === '>=' ? i >= n :
          operator === '>'  ? i >  n : false;
        if (ok) set.add(i === 0 ? 'truque' : String(i));
      }
      filters.level = set;
      continue;
    }
    // key:value
    const kv = tok.match(/^([^:]+):(.+)$/);
    if (kv) {
      const rawKey = kv[1].toLowerCase();
      const val = kv[2].toLowerCase();
      const keyMap = {
        classe: 'class', class: 'class',
        nivel: 'level', 'nível': 'level', lvl: 'level', level: 'level',
        escola: 'school', school: 'school',
        fonte: 'source', source: 'source',
        edicao: 'edition', 'edição': 'edition', edition: 'edition',
      };
      const cat = keyMap[rawKey];
      if (cat) {
        const set = filters[cat] || new Set();
        // for level numeric without operator: just add
        if (cat === 'level' && /^\d+$/.test(val)) {
          set.add(val === '0' ? 'truque' : val);
        } else {
          set.add(val);
        }
        filters[cat] = set;
        continue;
      }
    }
    residual.push(tok);
  }
  return { filters, residualQuery: residual.join(' ') };
}

// Format current filterState → ⌘K-style syntax string
function formatFilters(filters) {
  const parts = [];
  for (const cat of Object.keys(filters)) {
    const sel = filters[cat];
    if (!sel || sel.size === 0) continue;
    const key = cat === 'class' ? 'classe'
              : cat === 'level' ? 'nivel'
              : cat === 'school' ? 'escola'
              : cat === 'source' ? 'fonte'
              : cat === 'edition' ? 'edicao' : cat;
    for (const v of sel) parts.push(`${key}:${v}`);
  }
  return parts.join(' ');
}

// ─────────────────────────────────────────────────────────
// MAIN PROTOTYPE
// ─────────────────────────────────────────────────────────
function V7ACPrototype({ lang = 'ptbr', dark = false, width = 1280, height = 820 }) {
  const t = useWfTheme(dark);
  const str = pickStr(lang);
  const allSpells = React.useMemo(v7BuildSpells, []);

  // Single source of truth — both bar and ⌘K mutate this
  const [filters, setFilters] = React.useState({});  // { class: Set, level: Set, ... }
  const [query, setQuery] = React.useState('');       // free-text search (URL-synced)
  const [openCategory, setOpenCategory] = React.useState(null); // chip dropdown
  const [paletteOpen, setPaletteOpen] = React.useState(false);
  const [showMore, setShowMore] = React.useState(false);
  const [presets, setPresets] = React.useState([
    { name: 'meu mago nv 5', filters: { class: new Set(['mago']), level: new Set(['truque','1','2','3','4','5']) } },
    { name: 'cura', filters: { class: new Set(['clérigo']), school: new Set(['conj']) } },
  ]);

  // URL sync — only the search query
  React.useEffect(() => {
    const url = new URL(window.location.href);
    const q = url.searchParams.get('q');
    if (q) setQuery(q);
  }, []);
  React.useEffect(() => {
    const url = new URL(window.location.href);
    if (query) url.searchParams.set('q', query);
    else url.searchParams.delete('q');
    window.history.replaceState({}, '', url);
  }, [query]);

  // ⌘K hotkey
  React.useEffect(() => {
    const onKey = (e) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setPaletteOpen(p => !p);
      }
      if (e.key === 'Escape') {
        setPaletteOpen(false);
        setOpenCategory(null);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  // Per-spell state: prepared + bookmarked
  const [prepared, setPrepared] = React.useState(() => new Set());
  const [bookmarked, setBookmarked] = React.useState(() => new Set());
  const [toast, setToast] = React.useState(null); // {msg, kind}
  const [charPickerOpen, setCharPickerOpen] = React.useState(false);
  const [sortBy, setSortBy] = React.useState('default'); // default | name | level | school
  const [sortMenuOpen, setSortMenuOpen] = React.useState(false);

  const spellKey = (s) => `${s.school}-${s.lvl}-${s.name?.[0] || s.name_pt || ''}`;

  function togglePrepared(s) {
    const k = spellKey(s);
    setPrepared(prev => {
      const next = new Set(prev);
      if (next.has(k)) {
        next.delete(k);
        showToast(lang === 'ptbr' ? 'desmarcada como preparada' : 'unmarked as prepared');
      } else {
        next.add(k);
        showToast(lang === 'ptbr' ? '✓ preparada' : '✓ prepared');
      }
      return next;
    });
  }

  function toggleBookmark(s) {
    const k = spellKey(s);
    setBookmarked(prev => {
      const next = new Set(prev);
      if (next.has(k)) {
        next.delete(k);
        showToast(lang === 'ptbr' ? 'removida dos favoritos' : 'unbookmarked');
      } else {
        next.add(k);
        showToast(lang === 'ptbr' ? '★ adicionada aos favoritos' : '★ bookmarked');
      }
      return next;
    });
  }

  function copySpellLink(s) {
    const slug = (spellName(s, 'en') || spellName(s, 'ptbr') || '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
    const url = `https://spellbook.app/s/${slug || 'magia'}`;
    if (navigator.clipboard?.writeText) {
      navigator.clipboard.writeText(url).then(
        () => showToast(lang === 'ptbr' ? `link copiado: ${url}` : `link copied: ${url}`),
        () => showToast(lang === 'ptbr' ? 'falha ao copiar' : 'copy failed', 'err')
      );
    } else {
      showToast(`${url}`);
    }
  }

  function printSpell(s) {
    showToast(lang === 'ptbr' ? '⎙ preparando impressão…' : '⎙ printing…');
    setTimeout(() => { try { window.print(); } catch (e) {} }, 300);
  }

  function addToCharacter(s, charName) {
    setCharPickerOpen(false);
    showToast(lang === 'ptbr' ? `+ adicionada a ${charName}` : `+ added to ${charName}`);
  }

  function showToast(msg, kind = 'ok') {
    setToast({ msg, kind, id: Date.now() });
  }

  // Auto-dismiss toast
  React.useEffect(() => {
    if (!toast) return;
    const id = setTimeout(() => setToast(t => (t?.id === toast.id ? null : t)), 2400);
    return () => clearTimeout(id);
  }, [toast]);

  function toggleValue(category, value) {
    setFilters(prev => {
      const next = { ...prev };
      const set = new Set(next[category] || []);
      if (set.has(value)) set.delete(value);
      else set.add(value);
      if (set.size === 0) delete next[category];
      else next[category] = set;
      return next;
    });
  }

  function clearCategory(category) {
    setFilters(prev => {
      const next = { ...prev };
      delete next[category];
      return next;
    });
  }

  function clearAll() {
    setFilters({});
    setQuery('');
  }

  function applyParsed(parsed) {
    // Merge parsed into current filters (additive)
    setFilters(prev => {
      const next = { ...prev };
      for (const cat of Object.keys(parsed.filters)) {
        const merged = new Set(next[cat] || []);
        for (const v of parsed.filters[cat]) merged.add(v);
        next[cat] = merged;
      }
      return next;
    });
    if (parsed.residualQuery) setQuery(parsed.residualQuery);
  }

  function savePreset() {
    const name = window.prompt(lang === 'ptbr' ? 'nome da predefinição:' : 'preset name:');
    if (!name) return;
    // Deep clone Sets
    const cloned = {};
    for (const k of Object.keys(filters)) cloned[k] = new Set(filters[k]);
    setPresets(p => [...p, { name, filters: cloned }]);
  }

  function loadPreset(p) {
    const cloned = {};
    for (const k of Object.keys(p.filters)) cloned[k] = new Set(p.filters[k]);
    setFilters(cloned);
  }

  const filteredSpells = React.useMemo(
    () => {
      const out = applyFilters(allSpells, filters, query);
      const sorted = [...out];
      if (sortBy === 'name') {
        sorted.sort((a, b) => (spellName(a, lang) || '').localeCompare(spellName(b, lang) || ''));
      } else if (sortBy === 'level') {
        sorted.sort((a, b) => (a.lvl - b.lvl) || (spellName(a, lang) || '').localeCompare(spellName(b, lang) || ''));
      } else if (sortBy === 'school') {
        sorted.sort((a, b) => (a.school - b.school) || (spellName(a, lang) || '').localeCompare(spellName(b, lang) || ''));
      } else if (sortBy === 'prepared') {
        sorted.sort((a, b) => Number(prepared.has(spellKey(b))) - Number(prepared.has(spellKey(a))));
      }
      return sorted;
    },
    [allSpells, filters, query, sortBy, lang, prepared]
  );

  const totalActive = Object.values(filters).reduce((sum, s) => sum + (s?.size || 0), 0) + (query ? 1 : 0);

  // Detail panel state
  const [selectedIdx, setSelectedIdx] = React.useState(null);
  const selectedSpell = selectedIdx !== null ? filteredSpells[selectedIdx] : null;
  const detailOpen = !!selectedSpell;
  // Clamp selectedIdx if filters change
  React.useEffect(() => {
    if (selectedIdx !== null && selectedIdx >= filteredSpells.length) setSelectedIdx(null);
  }, [filteredSpells.length, selectedIdx]);
  // Keyboard nav inside detail
  React.useEffect(() => {
    if (!detailOpen) return;
    const onKey = (e) => {
      if (e.key === 'Escape') { setSelectedIdx(null); return; }
      if (paletteOpen) return; // palette owns keys
      if (e.key === 'ArrowRight') setSelectedIdx(i => (i + 1) % filteredSpells.length);
      if (e.key === 'ArrowLeft')  setSelectedIdx(i => (i - 1 + filteredSpells.length) % filteredSpells.length);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [detailOpen, paletteOpen, filteredSpells.length]);

  return (
    <div style={{ position: 'relative', width, height, background: t.paper, color: t.ink, fontFamily: "'Caveat', 'Patrick Hand', cursive", overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '14px 28px', borderBottom: `1.4px solid ${t.rule}`, flexShrink: 0 }}>
        <WfHeading theme={t} size={22}>{str.appName}</WfHeading>
        <div style={{ flex: 1 }}/>
        <WfMono theme={t}>v7 · barra + ⌘K</WfMono>
      </div>

      {/* Filter bar */}
      <div style={{ padding: '14px 28px 10px', display: 'flex', flexWrap: 'wrap', gap: 8, alignItems: 'center', borderBottom: `1px dashed ${t.rule}`, flexShrink: 0, position: 'relative', zIndex: 5 }}>
        {/* Search field — opens palette when clicked */}
        <button
          onClick={() => setPaletteOpen(true)}
          style={{
            flex: '0 0 220px', display: 'flex', alignItems: 'center', gap: 8,
            padding: '5px 10px', border: `1.3px solid ${t.rule}`, borderRadius: 4,
            background: t.paper2, fontSize: 14, color: query ? t.ink : t.sub,
            fontFamily: 'inherit', cursor: 'text', textAlign: 'left',
          }}
        >
          <span>⌕</span>
          <span style={{ flex: 1 }}>{query || (lang === 'ptbr' ? 'buscar magias…' : 'search spells…')}</span>
          <WfMono theme={t}>⌘K</WfMono>
        </button>

        <span style={{ width: 1, height: 22, background: t.rule, margin: '0 6px' }}/>

        {V7_CATEGORIES.map(cat => (
          <V7Chip
            key={cat.key}
            t={t}
            label={lang === 'ptbr' ? cat.label_pt : cat.label_en}
            count={filters[cat.key]?.size || 0}
            open={openCategory === cat.key}
            onClick={() => setOpenCategory(openCategory === cat.key ? null : cat.key)}
          />
        ))}

        <button
          onClick={() => setShowMore(s => !s)}
          style={{
            padding: '4px 10px', border: `1.3px dashed ${t.rule}`, borderRadius: 4,
            background: 'transparent', fontSize: 14, color: t.ink,
            fontFamily: 'inherit', cursor: 'pointer',
          }}
        >+ {lang === 'ptbr' ? 'mais' : 'more'}</button>

        <div style={{ position: 'relative' }}>
          <button
            onClick={() => setSortMenuOpen(o => !o)}
            style={{
              padding: '4px 10px', border: `1.3px solid ${t.rule}`, borderRadius: 4,
              background: t.paper2, fontSize: 14, color: t.ink, fontFamily: 'inherit', cursor: 'pointer',
              display: 'inline-flex', alignItems: 'center', gap: 6,
            }}
            title={lang === 'ptbr' ? 'ordenar' : 'sort'}
          >
            <span>⇅ {lang === 'ptbr' ? 'ordem' : 'sort'}{sortBy !== 'default' ? `: ${sortBy}` : ''}</span>
          </button>
          {sortMenuOpen && (
            <div style={{ position: 'absolute', top: '100%', right: 0, marginTop: 4, width: 180, background: t.paper2, border: `1.5px solid ${t.ink}`, borderRadius: 4, boxShadow: '0 8px 24px rgba(0,0,0,0.15)', zIndex: 8 }}
              onMouseLeave={() => setSortMenuOpen(false)}>
              {[
                ['default', lang === 'ptbr' ? 'padrão' : 'default'],
                ['name',    lang === 'ptbr' ? 'nome (a–z)' : 'name (a–z)'],
                ['level',   lang === 'ptbr' ? 'nível ↑' : 'level ↑'],
                ['school',  lang === 'ptbr' ? 'escola' : 'school'],
                ['prepared',lang === 'ptbr' ? 'preparadas primeiro' : 'prepared first'],
              ].map(([k, label]) => (
                <button key={k}
                  onClick={() => { setSortBy(k); setSortMenuOpen(false); }}
                  style={{ width: '100%', padding: '8px 12px', textAlign: 'left', border: 'none', background: sortBy === k ? t.highlight : 'transparent', cursor: 'pointer', fontFamily: 'inherit', fontSize: 14, color: t.ink, display: 'flex', alignItems: 'center', gap: 6 }}>
                  <span style={{ width: 14, fontSize: 12, color: t.accent }}>{sortBy === k ? '✓' : ''}</span>
                  <span>{label}</span>
                </button>
              ))}
            </div>
          )}
        </div>

        <div style={{ flex: 1 }}/>

        <V7PresetsButton t={t} lang={lang} presets={presets} onLoad={loadPreset} onSave={savePreset}/>
      </div>

      {/* Open dropdown for selected chip */}
      {openCategory && <V7Dropdown
        t={t} lang={lang}
        category={V7_CATEGORIES.find(c => c.key === openCategory) || V7_SECONDARY.find(c => c.key === openCategory)}
        selected={filters[openCategory] || new Set()}
        onToggle={(v) => toggleValue(openCategory, v)}
        onClear={() => clearCategory(openCategory)}
        onClose={() => setOpenCategory(null)}
        anchorIdx={V7_CATEGORIES.findIndex(c => c.key === openCategory)}
      />}

      {/* Secondary filters expanded */}
      {showMore && (
        <div style={{ padding: '8px 28px', display: 'flex', flexWrap: 'wrap', gap: 8, alignItems: 'center', background: t.paper2, borderBottom: `1px dashed ${t.rule}` }}>
          <WfMono theme={t}>{lang === 'ptbr' ? 'mais filtros' : 'more filters'}:</WfMono>
          {V7_SECONDARY.map(cat => (
            <V7Chip key={cat.key} t={t}
              label={lang === 'ptbr' ? cat.label_pt : cat.label_en}
              count={filters[cat.key]?.size || 0}
              open={openCategory === cat.key}
              onClick={() => setOpenCategory(openCategory === cat.key ? null : cat.key)}/>
          ))}
        </div>
      )}

      {/* Active chips strip */}
      <div style={{ padding: '10px 28px', display: 'flex', flexWrap: 'wrap', gap: 6, alignItems: 'center', borderBottom: `1px dashed ${t.rule}`, flexShrink: 0, minHeight: 38 }}>
        {totalActive === 0 ? (
          <WfMono theme={t}>{lang === 'ptbr' ? 'nenhum filtro ativo' : 'no active filters'}</WfMono>
        ) : (
          <>
            <WfMono theme={t}>{lang === 'ptbr' ? 'ativos' : 'active'}:</WfMono>
            {query && (
              <button onClick={() => setQuery('')} style={pillBtn(t, true)}>
                "{query}" ✕
              </button>
            )}
            {Object.keys(filters).map(cat => [...filters[cat]].map(v => (
              <button key={`${cat}-${v}`} onClick={() => toggleValue(cat, v)} style={pillBtn(t, true)}>
                {v} ✕
              </button>
            )))}
            <button onClick={clearAll} style={pillBtn(t, false)}>
              {lang === 'ptbr' ? 'limpar tudo' : 'clear all'}
            </button>
          </>
        )}
        <div style={{ flex: 1 }}/>
        <WfMono theme={t}>{filteredSpells.length} {lang === 'ptbr' ? 'magias' : 'spells'}</WfMono>
      </div>

      {/* Results grid + detail sidebar */}
      <div style={{ flex: 1, display: 'flex', minHeight: 0, overflow: 'hidden' }}>
        <div style={{ flex: 1, overflow: 'auto', padding: '14px 28px', transition: 'all 320ms cubic-bezier(.2,.7,.3,1)' }}>
          {filteredSpells.length === 0 ? (
            <div style={{ padding: 60, textAlign: 'center', color: t.sub }}>
              <WfHeading theme={t} size={20}>{lang === 'ptbr' ? 'nada por aqui' : 'nothing here'}</WfHeading>
              <div style={{ marginTop: 8, fontSize: 14 }}>{lang === 'ptbr' ? 'tente afrouxar os filtros' : 'try loosening filters'}</div>
            </div>
          ) : (
            <div style={{
              display: 'grid',
              gridTemplateColumns: detailOpen
                ? 'repeat(auto-fill, minmax(180px, 1fr))'
                : 'repeat(auto-fill, minmax(220px, 1fr))',
              gap: 12,
            }}>
              {filteredSpells.map((s, i) => (
                <V7SpellCard
                  key={i}
                  s={s}
                  t={t}
                  lang={lang}
                  selected={i === selectedIdx}
                  isPrepared={prepared.has(spellKey(s))}
                  isBookmarked={bookmarked.has(spellKey(s))}
                  onClick={() => setSelectedIdx(i === selectedIdx ? null : i)}
                />
              ))}
            </div>
          )}
        </div>
        <V7DetailSidebar
          spell={selectedSpell}
          allSpells={filteredSpells}
          idx={selectedIdx}
          total={filteredSpells.length}
          isPrepared={selectedSpell ? prepared.has(spellKey(selectedSpell)) : false}
          isBookmarked={selectedSpell ? bookmarked.has(spellKey(selectedSpell)) : false}
          onPrev={() => setSelectedIdx(i => (i - 1 + filteredSpells.length) % filteredSpells.length)}
          onNext={() => setSelectedIdx(i => (i + 1) % filteredSpells.length)}
          onClose={() => setSelectedIdx(null)}
          onJumpTo={(s) => {
            const newIdx = filteredSpells.indexOf(s);
            if (newIdx >= 0) setSelectedIdx(newIdx);
          }}
          onPrepare={() => selectedSpell && togglePrepared(selectedSpell)}
          onBookmark={() => selectedSpell && toggleBookmark(selectedSpell)}
          onAddChar={() => setCharPickerOpen(true)}
          onCopyLink={() => selectedSpell && copySpellLink(selectedSpell)}
          onPrint={() => selectedSpell && printSpell(selectedSpell)}
          charPickerOpen={charPickerOpen}
          onPickChar={(name) => selectedSpell && addToCharacter(selectedSpell, name)}
          onCloseCharPicker={() => setCharPickerOpen(false)}
          t={t}
          lang={lang}
        />
      </div>

      {/* Backdrop click-out */}
      {openCategory && (
        <div
          onClick={() => setOpenCategory(null)}
          style={{ position: 'absolute', inset: 0, zIndex: 3 }}
        />
      )}

      {/* ⌘K palette */}
      {paletteOpen && (
        <V7Palette
          t={t} lang={lang}
          spells={allSpells}
          currentFilters={filters}
          currentQuery={query}
          onApply={applyParsed}          onSelectSpell={(s) => {
            setPaletteOpen(false);
            const idx = filteredSpells.indexOf(s);
            if (idx >= 0) {
              setSelectedIdx(idx);
            } else {
              // Spell isn't in current filtered set: clear filters first
              setQuery('');
              setFilters({ class: new Set(), level: new Set(), school: new Set(), source: new Set(), components: new Set(), duration: new Set() });
              setTimeout(() => {
                const newIdx = allSpells.indexOf(s);
                setSelectedIdx(newIdx);
              }, 50);
            }
          }}
          onClose={() => setPaletteOpen(false)}
          onUpdateQuery={setQuery}
          onSetFilter={toggleValue}
        />
      )}

      {/* Toast */}
      {toast && (
        <div style={{
          position: 'absolute',
          bottom: 18, left: '50%', transform: 'translateX(-50%)',
          padding: '8px 16px',
          background: t.dark ? '#1f1f1f' : '#222', color: '#fff',
          border: `1.4px solid ${toast.kind === 'err' ? '#c44' : t.accent}`,
          borderRadius: 6, fontSize: 14, fontFamily: 'inherit',
          boxShadow: '0 6px 18px rgba(0,0,0,0.25)',
          zIndex: 20, pointerEvents: 'none',
          animation: 'toastIn 220ms ease-out',
        }}>{toast.msg}</div>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────
// CHIPS / DROPDOWN
// ─────────────────────────────────────────────────────────
function V7Chip({ t, label, count, open, onClick }) {
  const active = count > 0;
  return (
    <button
      onClick={onClick}
      style={{
        display: 'inline-flex', alignItems: 'center', gap: 6,
        padding: '4px 10px',
        border: `1.3px solid ${active ? t.accent : open ? t.ink : t.rule}`,
        borderRadius: 4,
        background: active ? t.highlight : open ? t.paper2 : t.paper2,
        fontSize: 14, color: t.ink, fontFamily: 'inherit',
        cursor: 'pointer',
      }}
    >
      <span>{label}</span>
      {count > 0 && <span style={{ background: t.ink, color: t.paper, fontSize: 10, padding: '0 5px', borderRadius: 8, fontFamily: "'JetBrains Mono', monospace" }}>{count}</span>}
      <span style={{ color: t.sub, fontSize: 12, transform: open ? 'rotate(180deg)' : 'none', transition: 'transform 150ms' }}>▾</span>
    </button>
  );
}

function V7Dropdown({ t, lang, category, selected, onToggle, onClear, onClose, anchorIdx }) {
  if (!category) return null;
  // Approximate left offset so dropdown sits near its chip
  const baseLeft = 28 + 220 + 14 + 12; // search + sep + padding
  const left = baseLeft + anchorIdx * 90;
  const values = lang === 'ptbr' ? category.values : (category.values_en || category.values);
  const valuesPt = category.values; // we filter by pt-key always, regardless of display lang

  return (
    <div style={{
      position: 'absolute',
      left: Math.min(left, 700),
      top: 100,
      width: 240, background: t.paper2, border: `1.6px solid ${t.ink}`, borderRadius: 4,
      boxShadow: t.dark ? '0 8px 24px rgba(0,0,0,0.5)' : '0 8px 24px rgba(0,0,0,0.15)',
      zIndex: 6, padding: '8px 0',
    }}>
      <div style={{ padding: '4px 12px', fontSize: 13, color: t.sub, borderBottom: `1px dashed ${t.rule}`, marginBottom: 4, display: 'flex', alignItems: 'center' }}>
        <span style={{ flex: 1 }}>{lang === 'ptbr' ? category.label_pt : category.label_en}</span>
        {selected.size > 0 && (
          <button onClick={onClear} style={{ background: 'none', border: 'none', color: t.accent, cursor: 'pointer', fontSize: 12, fontFamily: 'inherit' }}>
            {lang === 'ptbr' ? 'limpar' : 'clear'}
          </button>
        )}
      </div>
      <div style={{ maxHeight: 280, overflow: 'auto' }}>
        {valuesPt.map((v, i) => {
          const checked = selected.has(v);
          return (
            <label key={v} style={{
              display: 'flex', alignItems: 'center', gap: 8,
              padding: '4px 12px', cursor: 'pointer', fontSize: 14,
              background: checked ? t.highlight : 'transparent',
            }}>
              <input
                type="checkbox" checked={checked} onChange={() => onToggle(v)}
                style={{ accentColor: t.accent }}
              />
              <span>{values[i]}</span>
            </label>
          );
        })}
      </div>
      {selected.size >= 2 && (
        <div style={{ padding: '4px 12px', fontSize: 11, color: t.sub, borderTop: `1px dashed ${t.rule}`, marginTop: 4, fontFamily: "'JetBrains Mono', monospace" }}>
          {selected.size} {lang === 'ptbr' ? 'selecionados (OU)' : 'selected (OR)'}
        </div>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────
// PRESETS BUTTON
// ─────────────────────────────────────────────────────────
function V7PresetsButton({ t, lang, presets, onLoad, onSave }) {
  const [open, setOpen] = React.useState(false);
  return (
    <div style={{ position: 'relative' }}>
      <button onClick={() => setOpen(o => !o)}
        style={{ background: 'none', border: 'none', cursor: 'pointer', fontFamily: "'JetBrains Mono', monospace", fontSize: 12, color: t.sub, textTransform: 'uppercase', letterSpacing: 0.5 }}>
        {lang === 'ptbr' ? 'predefinições' : 'presets'} ▾
      </button>
      {open && (
        <>
          <div onClick={() => setOpen(false)} style={{ position: 'fixed', inset: 0, zIndex: 6 }}/>
          <div style={{
            position: 'absolute', right: 0, top: '100%', marginTop: 4,
            width: 220, background: t.paper2, border: `1.4px solid ${t.ink}`, borderRadius: 4,
            boxShadow: t.dark ? '0 8px 24px rgba(0,0,0,0.5)' : '0 8px 24px rgba(0,0,0,0.15)',
            zIndex: 7, padding: '6px 0',
          }}>
            {presets.map((p, i) => (
              <button key={i} onClick={() => { onLoad(p); setOpen(false); }}
                style={{ display: 'block', width: '100%', padding: '6px 12px', textAlign: 'left', border: 'none', background: 'transparent', cursor: 'pointer', fontSize: 14, fontFamily: 'inherit', color: t.ink }}>
                {p.name}
              </button>
            ))}
            <div style={{ borderTop: `1px dashed ${t.rule}`, marginTop: 4, paddingTop: 4 }}>
              <button onClick={() => { onSave(); setOpen(false); }}
                style={{ display: 'block', width: '100%', padding: '6px 12px', textAlign: 'left', border: 'none', background: 'transparent', cursor: 'pointer', fontSize: 14, fontFamily: 'inherit', color: t.accent }}>
                + {lang === 'ptbr' ? 'salvar atual' : 'save current'}
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────
// ⌘K PALETTE
// ─────────────────────────────────────────────────────────
function V7Palette({ t, lang, spells, currentFilters, currentQuery, onApply, onSelectSpell, onClose, onUpdateQuery, onSetFilter }) {
  // Pre-fill with current filter syntax + query
  const initial = [formatFilters(currentFilters), currentQuery].filter(Boolean).join(' ');
  const [text, setText] = React.useState(initial);
  const [selIdx, setSelIdx] = React.useState(0);
  const inputRef = React.useRef(null);

  React.useEffect(() => {
    inputRef.current?.focus();
    inputRef.current?.select();
  }, []);

  // Parse current text into would-be filters + residual query
  const parsed = React.useMemo(() => parseCommandLine(text), [text]);
  const previewSpells = React.useMemo(
    () => applyFilters(spells, parsed.filters, parsed.residualQuery).slice(0, 5),
    [spells, parsed]
  );

  // Build suggestions
  const suggestions = React.useMemo(() => buildSuggestions(text, parsed, lang), [text, parsed, lang]);

  const totalRows = previewSpells.length + suggestions.length;

  function handleKey(e) {
    if (e.key === 'ArrowDown') { e.preventDefault(); setSelIdx(i => Math.min(i + 1, totalRows - 1)); }
    if (e.key === 'ArrowUp')   { e.preventDefault(); setSelIdx(i => Math.max(i - 1, 0)); }
    if (e.key === 'Enter') {
      e.preventDefault();
      if (selIdx < previewSpells.length) {
        onSelectSpell(previewSpells[selIdx]);
      } else {
        const sug = suggestions[selIdx - previewSpells.length];
        if (sug) {
          if (sug.kind === 'apply-text') {
            // Apply parsed line as filters + close
            onApply(parsed);
            onClose();
          } else if (sug.kind === 'command') {
            // Append the command into the input
            setText(t => (t.trim() + ' ' + sug.command).trim());
            setSelIdx(0);
          }
        }
      }
    }
  }

  return (
    <>
      <div onClick={onClose} style={{ position: 'absolute', inset: 0, background: t.dark ? 'rgba(0,0,0,0.45)' : 'rgba(50,40,30,0.2)', zIndex: 9 }}/>
      <div style={{
        position: 'absolute',
        left: '50%', top: 70, transform: 'translateX(-50%)',
        width: 640, maxWidth: 'calc(100% - 40px)',
        background: t.paper2, border: `1.6px solid ${t.ink}`, borderRadius: 8,
        boxShadow: t.dark ? '0 16px 50px rgba(0,0,0,0.6)' : '0 16px 50px rgba(0,0,0,0.22)',
        zIndex: 10, overflow: 'hidden',
        display: 'flex', flexDirection: 'column', maxHeight: 'calc(100% - 100px)',
      }}>
        {/* Input */}
        <div style={{ padding: '12px 16px', borderBottom: `1.2px dashed ${t.rule}`, display: 'flex', alignItems: 'center', gap: 12 }}>
          <span style={{ fontSize: 20, color: t.sub }}>⌕</span>
          <input
            ref={inputRef}
            value={text}
            onChange={(e) => { setText(e.target.value); setSelIdx(0); }}
            onKeyDown={handleKey}
            placeholder={lang === 'ptbr' ? 'buscar magias ou digitar comando…' : 'search or type command…'}
            style={{
              flex: 1, border: 'none', outline: 'none', background: 'transparent',
              fontSize: 18, color: t.ink, fontFamily: "'Caveat', 'Patrick Hand', cursive",
            }}
          />
          <WfMono theme={t}>esc</WfMono>
        </div>

        {/* Body */}
        <div style={{ overflow: 'auto', flex: 1 }}>
          {/* Spell results */}
          {previewSpells.length > 0 && (
            <>
              <V7SectionLabel t={t}>{lang === 'ptbr' ? 'magias' : 'spells'}</V7SectionLabel>
              {previewSpells.map((s, i) => (
                <V7PaletteRow key={`s-${i}`} t={t}
                  icon="✦"
                  label={spellName(s, lang)}
                  sub={`${schoolKey(s.school)} · ${levelKey(s.lvl) === 'truque' ? (lang==='ptbr'?'truque':'cantrip') : `nv ${s.lvl}`} · ${s.src}`}
                  active={selIdx === i}
                  onClick={() => onSelectSpell(s)}
                  hint="↵"
                />
              ))}
            </>
          )}

          {/* Suggestions */}
          {suggestions.length > 0 && (
            <>
              <V7SectionLabel t={t}>{lang === 'ptbr' ? 'aplicar' : 'apply'}</V7SectionLabel>
              {suggestions.map((sug, i) => {
                const idx = previewSpells.length + i;
                return (
                  <V7PaletteRow key={`g-${i}`} t={t}
                    icon={sug.icon}
                    label={sug.label}
                    sub={sug.sub}
                    active={selIdx === idx}
                    onClick={() => {
                      if (sug.kind === 'apply-text') { onApply(parsed); onClose(); }
                      else if (sug.kind === 'command') { setText(t => (t.trim() + ' ' + sug.command).trim()); setSelIdx(0); }
                    }}
                  />
                );
              })}
            </>
          )}

          {previewSpells.length === 0 && suggestions.length === 0 && (
            <div style={{ padding: 40, textAlign: 'center', color: t.sub, fontSize: 14 }}>
              {lang === 'ptbr' ? 'nenhum resultado' : 'no results'}
            </div>
          )}
        </div>

        {/* Footer */}
        <div style={{ padding: '8px 16px', borderTop: `1.2px dashed ${t.rule}`, display: 'flex', gap: 14, flexShrink: 0 }}>
          <WfMono theme={t}>↑↓ {lang === 'ptbr' ? 'navegar' : 'nav'}</WfMono>
          <WfMono theme={t}>↵ {lang === 'ptbr' ? 'aplicar' : 'apply'}</WfMono>
          <WfMono theme={t}>esc {lang === 'ptbr' ? 'fechar' : 'close'}</WfMono>
          <div style={{ flex: 1 }}/>
          <WfMono theme={t}>ex: classe:mago lvl&lt;3</WfMono>
        </div>
      </div>
    </>
  );
}

function V7SectionLabel({ t, children }) {
  return <div style={{ padding: '8px 18px 4px', fontSize: 11, color: t.sub, textTransform: 'uppercase', letterSpacing: 0.6, fontFamily: "'JetBrains Mono', monospace" }}>{children}</div>;
}

function V7PaletteRow({ t, icon, label, sub, active, onClick, hint }) {
  return (
    <div onClick={onClick}
      onMouseEnter={(e) => { e.currentTarget.dataset.hover = '1'; }}
      style={{
        padding: '6px 18px', display: 'flex', alignItems: 'center', gap: 12,
        background: active ? t.highlight : 'transparent',
        borderLeft: active ? `3px solid ${t.accent}` : '3px solid transparent',
        cursor: 'pointer',
      }}>
      <span style={{ width: 14, color: t.sub, fontSize: 13 }}>{icon}</span>
      <span style={{ flex: 1, fontSize: 16 }}>{label}</span>
      <span style={{ fontSize: 12, color: t.sub, fontFamily: "'JetBrains Mono', monospace" }}>{sub}</span>
      {hint && active && <WfMono theme={t}>{hint}</WfMono>}
    </div>
  );
}

// Build context-aware suggestions
function buildSuggestions(text, parsed, lang) {
  const trimmed = text.trim();
  const out = [];

  // If user typed something parseable as filters, offer to apply
  if (trimmed && (Object.keys(parsed.filters).length > 0)) {
    const summary = formatFilters(parsed.filters);
    out.push({
      kind: 'apply-text',
      icon: '⚡',
      label: lang === 'ptbr' ? `aplicar como filtro` : `apply as filter`,
      sub: summary || trimmed,
    });
  }

  // Always offer some quick commands
  const quick = [
    { command: 'classe:mago', label_pt: 'classe:mago', label_en: 'class:wizard', sub_pt: 'só de mago', sub_en: 'wizard only' },
    { command: 'nivel:1', label_pt: 'nivel:1', label_en: 'level:1', sub_pt: 'magias de nv 1', sub_en: 'level 1 spells' },
    { command: 'lvl<3', label_pt: 'lvl<3', label_en: 'lvl<3', sub_pt: 'até nv 2', sub_en: 'up to lvl 2' },
    { command: 'escola:evoc', label_pt: 'escola:evoc', label_en: 'school:evoc', sub_pt: 'evocação', sub_en: 'evocation' },
  ];
  for (const q of quick) {
    if (!trimmed.toLowerCase().includes(q.command.toLowerCase())) {
      out.push({
        kind: 'command',
        icon: '⌗',
        label: lang === 'ptbr' ? q.label_pt : q.label_en,
        sub: lang === 'ptbr' ? q.sub_pt : q.sub_en,
        command: q.command,
      });
    }
  }
  return out.slice(0, 5);
}

function V7DetailSidebar({ spell, allSpells, idx, total, isPrepared, isBookmarked, onPrev, onNext, onClose, onJumpTo, onPrepare, onBookmark, onAddChar, onCopyLink, onPrint, charPickerOpen, onPickChar, onCloseCharPicker, t, lang }) {
  const open = !!spell;
  const characters = ['Tharion', 'Lyra', 'Berthold'];
  return (
    <div style={{
      width: open ? 440 : 0,
      flexShrink: 0,
      borderLeft: open ? `1.6px solid ${t.rule}` : 'none',
      background: t.paper2,
      transition: 'all 320ms cubic-bezier(.2,.7,.3,1)',
      overflow: 'hidden',
      display: 'flex', flexDirection: 'column',
      position: 'relative',
    }}>
      {open && (
        <>
          <div style={{ padding: '14px 20px 12px', borderBottom: `1px dashed ${t.rule}`, background: t.paper2 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
              <button style={window.v8IconBtn(t)} onClick={onPrev} title={lang==='ptbr'?'magia anterior (←)':'previous (←)'}>←</button>
              <button style={window.v8IconBtn(t)} onClick={onNext} title={lang==='ptbr'?'próxima magia (→)':'next (→)'}>→</button>
              <span style={{ fontSize: 11, color: t.sub, fontFamily: "'JetBrains Mono', monospace" }}>{idx + 1} / {total}</span>
              <div style={{ flex: 1 }}/>
              <button style={window.v8IconBtn(t)} title={lang==='ptbr'?'fechar (esc)':'close (esc)'} onClick={onClose}>✕</button>
            </div>
            <div style={{ fontSize: 22, fontWeight: 700, lineHeight: 1.1 }}>{spellName(spell, lang)}</div>
            <div style={{ fontSize: 13, color: t.sub, fontFamily: "'JetBrains Mono', monospace", marginTop: 4 }}>
              {schoolKey(spell.school)} · {spell.lvl === 0 ? (lang === 'ptbr' ? 'truque' : 'cantrip') : `${lang === 'ptbr' ? 'nível' : 'level'} ${spell.lvl}`}
            </div>
          </div>
          <div style={{ flex: 1, overflow: 'auto' }}>
            {React.createElement(window.V8DetailContent, { s: spell, t, lang, layout: 'panel' })}
            <div style={{ padding: '14px 20px' }}>
              {React.createElement(window.V8SectionHeader, { t, children: lang === 'ptbr' ? 'relacionadas' : 'related' })}
              <div style={{ marginTop: 8, display: 'flex', flexDirection: 'column', gap: 6 }}>
                {window.v8RelatedSpells(spell, allSpells, 4).map((r, i) => (
                  <button key={i} onClick={() => onJumpTo(r)}
                    style={{ padding: '6px 10px', border: `1.2px solid ${t.rule}`, borderRadius: 3, background: 'transparent', textAlign: 'left', cursor: 'pointer', fontFamily: 'inherit', color: t.ink, fontSize: 14, display: 'flex', alignItems: 'center', gap: 8 }}>
                    <span style={{ flex: 1 }}>{spellName(r, lang)}</span>
                    <span style={{ fontSize: 11, color: t.sub, fontFamily: "'JetBrains Mono', monospace" }}>{schoolKey(r.school)} · nv {r.lvl}</span>
                  </button>
                ))}
              </div>
            </div>
          </div>
          <div style={{ borderTop: `1.4px solid ${t.rule}`, background: t.paper, padding: '10px 14px', display: 'flex', gap: 6, flexWrap: 'wrap', alignItems: 'center' }}>
            <button
              onClick={onPrepare}
              title={isPrepared ? (lang==='ptbr'?'desmarcar como preparada':'unprepare') : (lang==='ptbr'?'marcar como preparada':'mark as prepared')}
              style={{
                padding: '6px 14px', borderRadius: 4, fontFamily: 'inherit', fontSize: 14, cursor: 'pointer', fontWeight: 600,
                border: `1.4px solid ${t.accent}`,
                background: isPrepared ? t.accent : 'transparent',
                color: isPrepared ? '#fff' : t.accent,
              }}
            >{isPrepared ? (lang==='ptbr'?'✓ preparada':'✓ prepared') : (lang==='ptbr'?'preparar':'prepare')}</button>
            <button
              onClick={onBookmark}
              title={isBookmarked ? (lang==='ptbr'?'remover dos favoritos':'remove bookmark') : (lang==='ptbr'?'adicionar aos favoritos':'bookmark')}
              style={{
                padding: '6px 12px', border: `1.3px solid ${t.rule}`, borderRadius: 4, fontFamily: 'inherit', fontSize: 16, cursor: 'pointer',
                background: isBookmarked ? t.highlight : t.paper,
                color: isBookmarked ? (t.accent2 || t.accent) : t.ink,
              }}
            >{isBookmarked ? '★' : '☆'}</button>
            <button onClick={onAddChar} style={window.v8SecondaryBtn(t)} title={lang==='ptbr'?'adicionar a personagem':'add to character'}>{lang === 'ptbr' ? '+ personagem' : '+ char'}</button>
            <div style={{ flex: 1 }}/>
            <button onClick={onCopyLink} style={window.v8GhostBtn(t)} title={lang === 'ptbr' ? 'copiar link' : 'copy link'}>⎘</button>
            <button onClick={onPrint} style={window.v8GhostBtn(t)} title={lang === 'ptbr' ? 'imprimir' : 'print'}>⎙</button>
          </div>
          {charPickerOpen && (
            <div style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.25)', zIndex: 10, display: 'flex', alignItems: 'flex-end', justifyContent: 'center', padding: 14 }}
              onClick={onCloseCharPicker}>
              <div onClick={(e)=>e.stopPropagation()} style={{ background: t.paper, border: `1.6px solid ${t.ink}`, borderRadius: 4, width: 280, padding: '10px 0', boxShadow: '0 8px 24px rgba(0,0,0,0.2)' }}>
                <div style={{ padding: '4px 14px', fontSize: 12, color: t.sub, fontFamily: "'JetBrains Mono', monospace", borderBottom: `1px dashed ${t.rule}` }}>
                  {lang === 'ptbr' ? 'adicionar a:' : 'add to:'}
                </div>
                {characters.map(name => (
                  <button key={name} onClick={() => onPickChar(name)}
                    style={{ width: '100%', padding: '10px 14px', textAlign: 'left', border: 'none', background: 'transparent', cursor: 'pointer', fontFamily: 'inherit', color: t.ink, fontSize: 16 }}>
                    {name}
                  </button>
                ))}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}

function V7SpellCard({ s, t, lang, selected, isPrepared, isBookmarked, onClick }) {
  return (
    <div onClick={onClick} style={{
      padding: 12,
      border: `${selected ? 2 : 1.4}px solid ${selected ? t.accent : t.rule}`,
      borderRadius: 4,
      background: selected ? t.highlight : t.paper2,
      display: 'flex', flexDirection: 'column', gap: 6,
      cursor: 'pointer',
      transition: 'all 180ms',
      position: 'relative',
    }}>
      {(isPrepared || isBookmarked) && (
        <div style={{ position: 'absolute', top: 6, right: 8, display: 'flex', gap: 4, fontSize: 12, fontFamily: "'JetBrains Mono', monospace" }}>
          {isPrepared && <span title={lang==='ptbr'?'preparada':'prepared'} style={{ color: t.accent, fontWeight: 700 }}>✓</span>}
          {isBookmarked && <span title={lang==='ptbr'?'favorita':'bookmarked'} style={{ color: t.accent2 || t.accent }}>★</span>}
        </div>
      )}
      <div style={{ display: 'flex', alignItems: 'baseline', gap: 8, paddingRight: (isPrepared || isBookmarked) ? 28 : 0 }}>
        <span style={{ fontSize: 17, fontWeight: 600 }}>{spellName(s, lang)}</span>
        <div style={{ flex: 1 }}/>
        <WfMono theme={t}>{schoolKey(s.school)}</WfMono>
      </div>
      <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
        <span style={pillBtn(t, true, true)}>{s.lvl === 0 ? (lang==='ptbr'?'truque':'cantrip') : `nv ${s.lvl}`}</span>
        {s.classes.slice(0, 2).map(c => <span key={c} style={pillBtn(t, false, true)}>{c}</span>)}
      </div>
      <div style={{ fontSize: 12, color: t.sub, fontFamily: "'JetBrains Mono', monospace", marginTop: 4 }}>
        {s.time} · {s.range} · {s.src}
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────
// helpers
// ─────────────────────────────────────────────────────────
function pillBtn(t, filled, mini) {
  return {
    display: 'inline-flex', alignItems: 'center', gap: 4,
    padding: mini ? '1px 7px' : '3px 9px',
    border: `1.2px solid ${filled ? t.accent : t.rule}`,
    borderRadius: 12,
    background: filled ? t.highlight : 'transparent',
    fontSize: mini ? 11 : 13,
    color: t.ink, fontFamily: 'inherit',
    cursor: 'pointer',
  };
}

Object.assign(window, { V7ACPrototype });
