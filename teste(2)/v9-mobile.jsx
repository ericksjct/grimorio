// V9 — protótipo mobile. 3 estados em telas iOS independentes.
// 1) Lista + barra-grip embaixo (drawer fechado).
// 2) Mesmo, mas drawer puxado pra cima com busca, ações, filtros e predefinições.
// 3) Detalhe full-screen (não cabe painel lateral em mobile).
//
// Cada tela é uma instância interativa do mesmo "app" — você pode arrastar a barra
// de baixo pra cima, clicar num card, etc. Os 3 artboards começam em estados
// diferentes pra documentar visualmente o fluxo.

const V9_PHONE_W = 390;
const V9_PHONE_H = 760;

// Compact card for mobile list
function V9MobileCard({ s, t, lang, isPrepared, isBookmarked, onClick }) {
  return (
    <div onClick={onClick} style={{
      padding: '10px 12px',
      border: `1.3px solid ${t.rule}`,
      borderRadius: 8,
      background: t.paper2,
      display: 'flex', flexDirection: 'column', gap: 4,
      cursor: 'pointer',
      position: 'relative',
    }}>
      {(isPrepared || isBookmarked) && (
        <div style={{ position: 'absolute', top: 8, right: 10, display: 'flex', gap: 4, fontSize: 11, fontFamily: "'JetBrains Mono', monospace" }}>
          {isPrepared && <span style={{ color: t.accent, fontWeight: 700 }}>✓</span>}
          {isBookmarked && <span style={{ color: t.accent2 || t.accent }}>★</span>}
        </div>
      )}
      <div style={{ fontSize: 16, fontWeight: 600, lineHeight: 1.1, paddingRight: (isPrepared || isBookmarked) ? 30 : 0 }}>{spellName(s, lang)}</div>
      <div style={{ fontSize: 11, color: t.sub, fontFamily: "'JetBrains Mono', monospace" }}>
        {schoolKey(s.school)} · {s.lvl === 0 ? (lang === 'ptbr' ? 'truque' : 'cantrip') : `nv ${s.lvl}`} · {s.src}
      </div>
    </div>
  );
}

// Bottom bar / drawer
function V9Drawer({ t, lang, expanded, onToggle, query, onQueryChange, filters, onToggleFilter, filterCount, prepared, bookmarked, onPrint, onShare, onCopyLink, presets, activePresetName, onApplyPreset, onSavePreset, onDeletePreset }) {
  const collapsedH = 64;
  const expandedH = 540;

  return (
    <>
      {expanded && (
        <div onClick={onToggle} style={{
          position: 'absolute', inset: 0,
          background: 'rgba(0,0,0,0.4)',
          zIndex: 4,
          transition: 'opacity 220ms',
        }}/>
      )}
      <div style={{
        position: 'absolute', left: 0, right: 0, bottom: 0,
        height: expanded ? expandedH : collapsedH,
        background: t.paper,
        borderTopLeftRadius: 18, borderTopRightRadius: 18,
        boxShadow: '0 -6px 20px rgba(0,0,0,0.18)',
        zIndex: 5,
        transition: 'height 280ms cubic-bezier(.2,.7,.3,1)',
        display: 'flex', flexDirection: 'column',
        overflow: 'hidden',
      }}>
        {/* Grip + collapsed peek */}
        <button onClick={onToggle} style={{
          padding: '8px 16px 6px',
          background: 'transparent', border: 'none',
          display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4,
          cursor: 'pointer',
          fontFamily: 'inherit',
        }}>
          <div style={{ width: 40, height: 4, borderRadius: 2, background: t.sub2 }}/>
        </button>

        {/* Always visible: peek row */}
        {!expanded && (
          <div style={{ padding: '4px 16px 0', display: 'flex', alignItems: 'center', gap: 10 }}>
            <span style={{ fontSize: 18, color: t.sub }}>⌕</span>
            <span style={{ flex: 1, fontSize: 14, color: t.sub }}>
              {lang === 'ptbr' ? 'buscar, filtrar, mais…' : 'search, filter, more…'}
            </span>
            {filterCount > 0 && (
              <span style={{
                background: t.accent, color: '#fff', fontSize: 11, padding: '1px 7px', borderRadius: 10,
                fontFamily: "'JetBrains Mono', monospace",
              }}>{filterCount} {lang === 'ptbr' ? 'ativos' : 'active'}</span>
            )}
          </div>
        )}

        {expanded && (
          <div style={{ flex: 1, overflow: 'auto', padding: '4px 16px 16px', display: 'flex', flexDirection: 'column', gap: 14 }}>
            {/* Search */}
            <div style={{
              display: 'flex', alignItems: 'center', gap: 8,
              padding: '8px 12px',
              border: `1.3px solid ${t.rule}`, borderRadius: 8,
              background: t.paper2,
            }}>
              <span style={{ fontSize: 16, color: t.sub }}>⌕</span>
              <input
                value={query}
                onChange={(e) => onQueryChange(e.target.value)}
                placeholder={lang === 'ptbr' ? 'nome da magia…' : 'spell name…'}
                style={{
                  flex: 1, border: 'none', outline: 'none', background: 'transparent',
                  fontFamily: 'inherit', fontSize: 16, color: t.ink,
                }}
              />
            </div>

            {/* Filters section */}
            <div>
              <V9SectionLabel t={t}>{lang === 'ptbr' ? 'filtros' : 'filters'}</V9SectionLabel>
              <V9FilterRow t={t} lang={lang} label={lang === 'ptbr' ? 'nível' : 'level'}
                values={['truque', '1', '2', '3', '4', '5']}
                isSelected={(v) => filters.level?.has(v)}
                onTap={(v) => onToggleFilter('level', v)}/>
              <V9FilterRow t={t} lang={lang} label={lang === 'ptbr' ? 'escola' : 'school'}
                values={['evoc', 'conj', 'abjur', 'ench', 'ilus', 'div', 'necr', 'trans']}
                isSelected={(v) => filters.school?.has(v)}
                onTap={(v) => onToggleFilter('school', v)}/>
              <V9FilterRow t={t} lang={lang} label={lang === 'ptbr' ? 'classe' : 'class'}
                values={['mago', 'clérigo', 'druida', 'bardo', 'feiticeiro', 'bruxo']}
                isSelected={(v) => filters.class?.has(v)}
                onTap={(v) => onToggleFilter('class', v)}/>
            </div>

            {/* Presets */}
            <div>
              <V9SectionLabel t={t}>{lang === 'ptbr' ? 'predefinições' : 'presets'}</V9SectionLabel>
              <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginTop: 4 }}>
                {(presets || []).map((p) => {
                  const active = p.name === activePresetName;
                  return (
                    <span key={p.name} style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                      <button
                        onClick={() => onApplyPreset && onApplyPreset(p)}
                        style={{
                          ...v9PillStyle(t, active),
                          fontFamily: 'inherit',
                          background: active ? t.highlight : 'transparent',
                        }}
                      >
                        {active && <span style={{ color: t.accent, marginRight: 4 }}>✓</span>}
                        {p.name}
                      </button>
                      <button
                        onClick={(e) => { e.stopPropagation(); onDeletePreset && onDeletePreset(p.name); }}
                        title={lang === 'ptbr' ? 'remover' : 'remove'}
                        style={{
                          width: 18, height: 18, padding: 0,
                          border: 'none', background: 'transparent',
                          color: t.sub, cursor: 'pointer', fontSize: 13,
                          opacity: 0.6,
                        }}
                      >✕</button>
                    </span>
                  );
                })}
                <button
                  onClick={() => onSavePreset && onSavePreset()}
                  style={{ ...v9PillStyle(t, false), borderStyle: 'dashed', fontFamily: 'inherit', color: t.accent }}
                >+ {lang === 'ptbr' ? 'salvar atual' : 'save current'}</button>
              </div>
              {filterCount === 0 && (
                <div style={{ marginTop: 6, fontSize: 11, color: t.sub2, fontStyle: 'italic' }}>
                  {lang === 'ptbr' ? 'aplique filtros antes de salvar uma predefinição' : 'apply filters before saving a preset'}
                </div>
              )}
            </div>

            {/* Actions */}
            <div>
              <V9SectionLabel t={t}>{lang === 'ptbr' ? 'ações' : 'actions'}</V9SectionLabel>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 8, marginTop: 4 }}>
                <V9ActionBtn t={t} icon="⎙" label={lang === 'ptbr' ? 'imprimir' : 'print'} onClick={onPrint}/>
                <V9ActionBtn t={t} icon="⎘" label={lang === 'ptbr' ? 'copiar' : 'copy'} onClick={onCopyLink}/>
                <V9ActionBtn t={t} icon="↗" label={lang === 'ptbr' ? 'compartilhar' : 'share'} onClick={onShare}/>
              </div>
            </div>

            {/* Stats */}
            <div style={{
              padding: 10, border: `1px dashed ${t.rule}`, borderRadius: 6,
              fontSize: 13, color: t.sub, fontFamily: "'JetBrains Mono', monospace",
              display: 'flex', justifyContent: 'space-between',
            }}>
              <span>{lang === 'ptbr' ? 'preparadas' : 'prepared'}: <strong style={{ color: t.accent }}>{prepared}</strong></span>
              <span>{lang === 'ptbr' ? 'favoritas' : 'bookmarks'}: <strong style={{ color: t.accent2 || t.accent }}>{bookmarked}</strong></span>
            </div>
          </div>
        )}
      </div>
    </>
  );
}

function V9SectionLabel({ t, children }) {
  return (
    <div style={{
      fontSize: 11, color: t.sub, textTransform: 'uppercase',
      letterSpacing: 0.6, fontFamily: "'JetBrains Mono', monospace",
      marginBottom: 6,
    }}>{children}</div>
  );
}

function V9FilterRow({ t, lang, label, values, isSelected, onTap }) {
  return (
    <div style={{ marginBottom: 8 }}>
      <div style={{ fontSize: 13, color: t.sub, marginBottom: 4 }}>{label}</div>
      <div style={{ display: 'flex', gap: 6, overflowX: 'auto', paddingBottom: 4 }}>
        {values.map((v) => {
          const sel = isSelected ? isSelected(v) : false;
          return (
            <span key={v} onClick={() => onTap(v)} style={v9PillStyle(t, sel)}>{v}</span>
          );
        })}
      </div>
    </div>
  );
}

function V9ActionBtn({ t, icon, label, onClick }) {
  return (
    <button onClick={onClick} style={{
      padding: '10px 6px',
      border: `1.3px solid ${t.rule}`, borderRadius: 8,
      background: t.paper2,
      display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4,
      cursor: 'pointer', fontFamily: 'inherit', color: t.ink,
    }}>
      <span style={{ fontSize: 22 }}>{icon}</span>
      <span style={{ fontSize: 12 }}>{label}</span>
    </button>
  );
}

function v9PillStyle(t, active) {
  return {
    display: 'inline-flex', alignItems: 'center',
    padding: '5px 12px',
    border: `1.3px solid ${active ? t.accent : t.rule}`,
    borderRadius: 14,
    background: active ? t.highlight : 'transparent',
    fontSize: 13,
    color: t.ink, fontFamily: 'inherit',
    cursor: 'pointer', whiteSpace: 'nowrap',
  };
}

// Detail full-screen
function V9DetailScreen({ s, t, lang, isPrepared, isBookmarked, onBack, onPrepare, onBookmark, onAddChar, onFilterBy }) {
  return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column', background: t.paper, color: t.ink }}>
      {/* Top bar */}
      <div style={{
        padding: '12px 14px', display: 'flex', alignItems: 'center', gap: 8,
        borderBottom: `1px solid ${t.rule}`, flexShrink: 0,
      }}>
        <button onClick={onBack} style={{
          width: 32, height: 32, border: `1.2px solid ${t.rule}`, borderRadius: 16,
          background: t.paper2, color: t.ink, cursor: 'pointer', fontSize: 16,
        }}>←</button>
        <div style={{ flex: 1 }}/>
        <button onClick={onBookmark} style={{
          width: 32, height: 32, border: `1.2px solid ${isBookmarked ? t.accent : t.rule}`,
          borderRadius: 16, background: isBookmarked ? t.highlight : t.paper2,
          color: isBookmarked ? (t.accent2 || t.accent) : t.ink, cursor: 'pointer', fontSize: 16,
        }}>{isBookmarked ? '★' : '☆'}</button>
      </div>

      {/* Body */}
      <div style={{ flex: 1, overflow: 'auto', padding: '18px 18px 100px' }}>
        <div style={{ display: 'flex', gap: 5, flexWrap: 'wrap', marginBottom: 10 }}>
          <span onClick={() => onFilterBy && onFilterBy('school', schoolKey(s.school))} style={{ ...v9PillStyle(t, false), cursor: 'pointer' }}>{schoolKey(s.school)}</span>
          <span onClick={() => onFilterBy && onFilterBy('level', s.lvl === 0 ? 'truque' : String(s.lvl))} style={{ ...v9PillStyle(t, true), cursor: 'pointer' }}>
            {s.lvl === 0 ? (lang === 'ptbr' ? 'truque' : 'cantrip') : `${lang === 'ptbr' ? 'nível' : 'level'} ${s.lvl}`}
          </span>
          {s.conc && <span style={v9PillStyle(t, false)}>{lang === 'ptbr' ? 'conc.' : 'conc.'}</span>}
          {s.rit && <span style={v9PillStyle(t, false)}>{lang === 'ptbr' ? 'ritual' : 'ritual'}</span>}
        </div>
        <h1 style={{ fontSize: 30, fontWeight: 700, margin: '0 0 14px', lineHeight: 1.05, fontFamily: 'inherit' }}>{spellName(s, lang)}</h1>

        {/* Stats grid */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, padding: 12, border: `1.3px solid ${t.rule}`, borderRadius: 8, background: t.paper2, marginBottom: 16 }}>
          <V9Stat t={t} label={lang === 'ptbr' ? 'execução' : 'cast'} value={s.time}/>
          <V9Stat t={t} label={lang === 'ptbr' ? 'alcance' : 'range'} value={s.range}/>
          <V9Stat t={t} label={lang === 'ptbr' ? 'duração' : 'duration'} value={s.dur}/>
          <V9Stat t={t} label={lang === 'ptbr' ? 'componentes' : 'components'} value={s.comp}/>
        </div>

        <V9DetailSection t={t} label={lang === 'ptbr' ? 'descrição' : 'description'}>
          <p style={{ margin: 0, fontSize: 16, lineHeight: 1.55, textWrap: 'pretty' }}>
            {(window.v8Description ? window.v8Description(s, lang) : '')}
          </p>
        </V9DetailSection>

        <V9DetailSection t={t} label={lang === 'ptbr' ? 'em níveis superiores' : 'at higher levels'}>
          <p style={{ margin: 0, fontSize: 15, lineHeight: 1.55, color: t.sub, textWrap: 'pretty' }}>
            {(window.v8Upgrade ? window.v8Upgrade(s, lang) : '')}
          </p>
        </V9DetailSection>

        <V9DetailSection t={t} label={lang === 'ptbr' ? 'classes' : 'classes'}>
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
            {(s.classes || []).map(c => (
              <span key={c} onClick={() => onFilterBy && onFilterBy('class', c)} style={{ ...v9PillStyle(t, false), cursor: 'pointer' }}>{c}</span>
            ))}
          </div>
        </V9DetailSection>
      </div>

      {/* Sticky action bar */}
      <div style={{
        position: 'absolute', left: 0, right: 0, bottom: 0,
        padding: '10px 14px',
        background: t.paper, borderTop: `1.4px solid ${t.rule}`,
        display: 'flex', gap: 8,
      }}>
        <button onClick={onPrepare} style={{
          flex: 1, padding: '12px',
          border: `1.4px solid ${t.accent}`, borderRadius: 8,
          background: isPrepared ? t.accent : 'transparent',
          color: isPrepared ? '#fff' : t.accent,
          fontFamily: 'inherit', fontSize: 16, fontWeight: 600, cursor: 'pointer',
        }}>{isPrepared ? (lang === 'ptbr' ? '✓ preparada' : '✓ prepared') : (lang === 'ptbr' ? 'preparar' : 'prepare')}</button>
        <button onClick={onAddChar} style={{
          padding: '12px 16px',
          border: `1.3px solid ${t.rule}`, borderRadius: 8,
          background: t.paper2, color: t.ink, fontFamily: 'inherit', fontSize: 16, cursor: 'pointer',
        }}>{lang === 'ptbr' ? '+ char' : '+ char'}</button>
      </div>
    </div>
  );
}

function V9Stat({ t, label, value }) {
  return (
    <div>
      <div style={{ fontSize: 10, color: t.sub, textTransform: 'uppercase', letterSpacing: 0.5, fontFamily: "'JetBrains Mono', monospace" }}>{label}</div>
      <div style={{ fontSize: 15, marginTop: 2 }}>{value}</div>
    </div>
  );
}

function V9DetailSection({ t, label, children }) {
  return (
    <div style={{ marginBottom: 16 }}>
      <V9SectionLabel t={t}>{label}</V9SectionLabel>
      <div style={{ marginTop: 4 }}>{children}</div>
    </div>
  );
}

// Full app per phone
function V9MobileApp({ lang, dark, initialDrawerOpen = false, initialSpellIdx = null }) {
  const t = useWfTheme(dark);
  const allSpells = React.useMemo(() => (window.v7BuildSpells ? window.v7BuildSpells() : []), []);
  const [drawerOpen, setDrawerOpen] = React.useState(initialDrawerOpen);
  const [selectedIdx, setSelectedIdx] = React.useState(initialSpellIdx);
  const [query, setQuery] = React.useState('');
  const [filters, setFilters] = React.useState(() => ({
    class: new Set(['mago']),
    level: new Set(['truque', '1', '2', '3']),
    school: new Set(),
  }));
  const [prepared, setPrepared] = React.useState(() => new Set(['evoc-3-Hexbind']));
  const [bookmarked, setBookmarked] = React.useState(() => new Set(['conj-1-Soothe Wounds']));
  const [charPickerOpen, setCharPickerOpen] = React.useState(false);
  const [toast, setToast] = React.useState(null);
  const [presets, setPresets] = React.useState(() => ([
    { name: 'meu mago nv 5', filters: { class: new Set(['mago']), level: new Set(['truque','1','2','3','4','5']), school: new Set() } },
    { name: 'magias de cura', filters: { class: new Set(['clérigo']), level: new Set(), school: new Set(['conj']) } },
  ]));

  // Compare two filter shapes by content (not reference)
  function filtersEqual(a, b) {
    const cats = ['class', 'level', 'school'];
    for (const c of cats) {
      const sa = a[c] || new Set();
      const sb = b[c] || new Set();
      if (sa.size !== sb.size) return false;
      for (const v of sa) if (!sb.has(v)) return false;
    }
    return true;
  }
  const activePresetName = React.useMemo(() => {
    const p = presets.find(p => filtersEqual(p.filters, filters));
    return p ? p.name : null;
  }, [presets, filters]);

  function applyPreset(p) {
    setFilters({
      class: new Set(p.filters.class || []),
      level: new Set(p.filters.level || []),
      school: new Set(p.filters.school || []),
    });
    setQuery('');
    showToast(lang === 'ptbr' ? `aplicada: ${p.name}` : `applied: ${p.name}`);
  }

  function saveCurrentAsPreset() {
    const name = window.prompt(lang === 'ptbr' ? 'nome da predefinição:' : 'preset name:');
    if (!name) return;
    const cloned = {
      class: new Set(filters.class || []),
      level: new Set(filters.level || []),
      school: new Set(filters.school || []),
    };
    setPresets(prev => [...prev, { name, filters: cloned }]);
    showToast(lang === 'ptbr' ? `salva: ${name}` : `saved: ${name}`);
  }

  function deletePreset(name) {
    setPresets(prev => prev.filter(p => p.name !== name));
    showToast(lang === 'ptbr' ? `removida: ${name}` : `removed: ${name}`);
  }

  function showToast(msg) {
    const id = Date.now();
    setToast({ msg, id });
    setTimeout(() => setToast(t => (t?.id === id ? null : t)), 2000);
  }

  function toggleFilter(category, value) {
    setFilters(prev => {
      const next = { ...prev };
      const set = new Set(next[category] || []);
      if (set.has(value)) set.delete(value);
      else set.add(value);
      next[category] = set;
      return next;
    });
  }

  function clearAllFilters() {
    setFilters({ class: new Set(), level: new Set(), school: new Set() });
    setQuery('');
  }

  function applyFilterFromDetail(category, value) {
    setFilters({ class: new Set(), level: new Set(), school: new Set(), [category]: new Set([value]) });
    setSelectedIdx(null);
    setDrawerOpen(false);
  }

  function pickChar(name) {
    setCharPickerOpen(false);
    showToast(lang === 'ptbr' ? `+ adicionada a ${name}` : `+ added to ${name}`);
  }

  const filtered = React.useMemo(() => {
    let out = allSpells;
    if (query.trim()) {
      const q = query.toLowerCase();
      out = out.filter(s => spellName(s, lang).toLowerCase().includes(q) || s.en.toLowerCase().includes(q));
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
    return out;
  }, [allSpells, query, filters, lang]);

  const activeChips = React.useMemo(() => {
    const out = [];
    if (query) out.push({ key: 'q', label: `"${query}"`, onRemove: () => setQuery('') });
    for (const cat of ['class', 'level', 'school']) {
      for (const v of (filters[cat] || [])) {
        const lbl = cat === 'level' ? (v === 'truque' ? (lang === 'ptbr' ? 'truque' : 'cantrip') : `nv ${v}`) : v;
        out.push({ key: `${cat}-${v}`, label: lbl, onRemove: () => toggleFilter(cat, v) });
      }
    }
    return out;
  }, [query, filters, lang]);

  const filterCount = activeChips.length;

  const spell = selectedIdx !== null ? filtered[selectedIdx] : null;
  const spellKey = (s) => `${schoolKey(s.school)}-${s.lvl}-${s.en}`;

  function togglePrep(s) {
    const k = spellKey(s);
    setPrepared(prev => { const n = new Set(prev); n.has(k) ? n.delete(k) : n.add(k); return n; });
  }
  function toggleBook(s) {
    const k = spellKey(s);
    setBookmarked(prev => { const n = new Set(prev); n.has(k) ? n.delete(k) : n.add(k); return n; });
  }

  // Detail mode = full screen
  if (spell) {
    return (
      <div style={{ height: '100%', paddingTop: 52, paddingBottom: 34, boxSizing: 'border-box' }}>
        <V9DetailScreen
          s={spell} t={t} lang={lang}
          isPrepared={prepared.has(spellKey(spell))}
          isBookmarked={bookmarked.has(spellKey(spell))}
          onBack={() => setSelectedIdx(null)}
          onPrepare={() => togglePrep(spell)}
          onBookmark={() => toggleBook(spell)}
          onAddChar={() => setCharPickerOpen(true)}
          onFilterBy={applyFilterFromDetail}
        />
        {charPickerOpen && (
          <div onClick={() => setCharPickerOpen(false)} style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.4)', zIndex: 30, display: 'flex', alignItems: 'flex-end' }}>
            <div onClick={(e) => e.stopPropagation()} style={{ width: '100%', background: t.paper, borderTopLeftRadius: 18, borderTopRightRadius: 18, padding: '12px 0 34px', maxHeight: '60%' }}>
              <div style={{ width: 40, height: 4, borderRadius: 2, background: t.sub2, margin: '0 auto 12px' }}/>
              <div style={{ padding: '0 18px 8px', fontSize: 12, color: t.sub, fontFamily: "'JetBrains Mono', monospace", textTransform: 'uppercase' }}>
                {lang === 'ptbr' ? 'adicionar a:' : 'add to:'}
              </div>
              {['Tharion', 'Lyra', 'Berthold'].map(name => (
                <button key={name} onClick={() => pickChar(name)} style={{ width: '100%', padding: '14px 18px', textAlign: 'left', border: 'none', borderTop: `1px solid ${t.rule}`, background: 'transparent', cursor: 'pointer', fontFamily: 'inherit', color: t.ink, fontSize: 17 }}>
                  {name}
                </button>
              ))}
            </div>
          </div>
        )}
        {toast && (
          <div style={{ position: 'absolute', bottom: 100, left: '50%', transform: 'translateX(-50%)', padding: '8px 16px', background: '#222', color: '#fff', border: `1.2px solid ${t.accent}`, borderRadius: 6, fontSize: 13, zIndex: 40 }}>{toast.msg}</div>
        )}
      </div>
    );
  }

  return (
    <div style={{ height: '100%', paddingTop: 52, paddingBottom: 34, boxSizing: 'border-box', background: t.paper, color: t.ink, position: 'relative', overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
      {/* Header */}
      <div style={{ padding: '10px 16px 12px', flexShrink: 0, borderBottom: `1px solid ${t.rule}` }}>
        <div style={{ display: 'flex', alignItems: 'baseline', gap: 8 }}>
          <h1 style={{ fontSize: 24, fontWeight: 700, margin: 0, lineHeight: 1, fontFamily: 'inherit' }}>
            {lang === 'ptbr' ? 'grimório' : 'spellbook'}
          </h1>
          <div style={{ flex: 1 }}/>
          <span style={{ fontSize: 12, color: t.sub, fontFamily: "'JetBrains Mono', monospace" }}>
            {filtered.length} {lang === 'ptbr' ? 'magias' : 'spells'}
          </span>
        </div>
        {/* Active filter chips */}
        <div style={{ display: 'flex', gap: 5, flexWrap: 'wrap', marginTop: 8 }}>
          {activeChips.length === 0 ? (
            <span style={{ fontSize: 12, color: t.sub2, fontStyle: 'italic' }}>
              {lang === 'ptbr' ? 'sem filtros · puxa o drawer pra filtrar' : 'no filters · pull drawer to filter'}
            </span>
          ) : (
            <>
              {activeChips.map(c => (
                <button key={c.key} onClick={c.onRemove} style={{ ...v9PillStyle(t, true), border: 'none', padding: '5px 12px' }}>
                  {c.label} <span style={{ marginLeft: 4, color: t.sub }}>✕</span>
                </button>
              ))}
              {activeChips.length > 1 && (
                <button onClick={clearAllFilters} style={{ ...v9PillStyle(t, false), border: 'none', color: t.sub }}>
                  {lang === 'ptbr' ? 'limpar tudo' : 'clear all'}
                </button>
              )}
            </>
          )}
        </div>
      </div>

      {/* Cards list */}
      <div style={{ flex: 1, overflow: 'auto', padding: '12px 12px 80px' }}>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
          {filtered.map((s, i) => (
            <V9MobileCard
              key={i} s={s} t={t} lang={lang}
              isPrepared={prepared.has(spellKey(s))}
              isBookmarked={bookmarked.has(spellKey(s))}
              onClick={() => setSelectedIdx(i)}
            />
          ))}
        </div>
      </div>

      {/* Bottom drawer */}
      <V9Drawer
        t={t} lang={lang}
        expanded={drawerOpen}
        onToggle={() => setDrawerOpen(o => !o)}
        query={query}
        onQueryChange={setQuery}
        filters={filters}
        onToggleFilter={toggleFilter}
        filterCount={filterCount}
        prepared={prepared.size}
        bookmarked={bookmarked.size}
        onPrint={() => { showToast(lang === 'ptbr' ? '⎙ imprimindo…' : '⎙ printing…'); setTimeout(() => { try { window.print(); } catch(e){} }, 250); }}
        onShare={() => showToast(lang === 'ptbr' ? '↗ compartilhado!' : '↗ shared!')}
        onCopyLink={() => showToast(lang === 'ptbr' ? '⎘ link copiado' : '⎘ link copied')}
        presets={presets}
        activePresetName={activePresetName}
        onApplyPreset={applyPreset}
        onSavePreset={saveCurrentAsPreset}
        onDeletePreset={deletePreset}
      />

      {/* Char picker */}
      {charPickerOpen && (
        <div onClick={() => setCharPickerOpen(false)} style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.4)', zIndex: 30, display: 'flex', alignItems: 'flex-end' }}>
          <div onClick={(e) => e.stopPropagation()} style={{ width: '100%', background: t.paper, borderTopLeftRadius: 18, borderTopRightRadius: 18, padding: '12px 0 34px', maxHeight: '60%' }}>
            <div style={{ width: 40, height: 4, borderRadius: 2, background: t.sub2, margin: '0 auto 12px' }}/>
            <div style={{ padding: '0 18px 8px', fontSize: 12, color: t.sub, fontFamily: "'JetBrains Mono', monospace", textTransform: 'uppercase' }}>
              {lang === 'ptbr' ? 'adicionar a:' : 'add to:'}
            </div>
            {['Tharion', 'Lyra', 'Berthold'].map(name => (
              <button key={name} onClick={() => pickChar(name)} style={{ width: '100%', padding: '14px 18px', textAlign: 'left', border: 'none', borderTop: `1px solid ${t.rule}`, background: 'transparent', cursor: 'pointer', fontFamily: 'inherit', color: t.ink, fontSize: 17 }}>
                {name}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Toast */}
      {toast && (
        <div style={{
          position: 'absolute', bottom: 80, left: '50%', transform: 'translateX(-50%)',
          padding: '8px 16px', background: '#222', color: '#fff',
          border: `1.2px solid ${t.accent}`, borderRadius: 6, fontSize: 13,
          zIndex: 40, pointerEvents: 'none',
        }}>{toast.msg}</div>
      )}
    </div>
  );
}

// Each artboard renders one phone using IOSDevice
function V9PhoneList({ lang = 'ptbr', dark = false }) {
  return (
    <IOSDevice width={V9_PHONE_W} height={V9_PHONE_H} dark={dark}>
      <V9MobileApp lang={lang} dark={dark} initialDrawerOpen={false}/>
    </IOSDevice>
  );
}

function V9PhoneDrawerOpen({ lang = 'ptbr', dark = false }) {
  return (
    <IOSDevice width={V9_PHONE_W} height={V9_PHONE_H} dark={dark}>
      <V9MobileApp lang={lang} dark={dark} initialDrawerOpen={true}/>
    </IOSDevice>
  );
}

function V9PhoneDetail({ lang = 'ptbr', dark = false }) {
  return (
    <IOSDevice width={V9_PHONE_W} height={V9_PHONE_H} dark={dark}>
      <V9MobileApp lang={lang} dark={dark} initialSpellIdx={3}/>
    </IOSDevice>
  );
}

Object.assign(window, { V9PhoneList, V9PhoneDrawerOpen, V9PhoneDetail, V9MobileApp });
