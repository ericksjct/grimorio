// V4 funcional — UI: barra com chips, popover de checkboxes, ⌘K, modal de presets.

function FilterBarFunctional({ t, lang, fs, onOpenCmdK, onOpenPresets, onOpenMore }) {
  const [openKey, setOpenKey] = React.useState(null);
  const ref = React.useRef(null);

  React.useEffect(() => {
    const onClick = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpenKey(null); };
    document.addEventListener('mousedown', onClick);
    return () => document.removeEventListener('mousedown', onClick);
  }, []);

  return (
    <div ref={ref} style={{ position: 'relative', padding: '12px 24px', borderBottom: `1.4px solid ${t.rule}`, display: 'flex', flexWrap: 'wrap', gap: 8, alignItems: 'center' }}>
      {/* Search w/ ⌘K */}
      <div onClick={onOpenCmdK} style={{
        display: 'flex', alignItems: 'center', gap: 8,
        padding: '5px 10px', border: `1.3px solid ${t.rule}`, borderRadius: 4,
        background: t.paper2, minWidth: 200, cursor: 'text',
      }}>
        <span style={{ color: t.sub, fontSize: 14 }}>⌕</span>
        <span style={{ fontSize: 14, color: t.sub2, flex: 1 }}>{lang==='ptbr'?'buscar magia ou comando…':'search spell or command…'}</span>
        <WfPill theme={t} style={{ fontSize: 11 }}>⌘K</WfPill>
      </div>

      <span style={{ width: 1, height: 22, background: t.rule, margin: '0 4px' }}/>

      {FILTER_KEYS_PRIMARY.map(k => {
        const active = (fs.state.filters[k] || []).length;
        return (
          <FilterChip key={k} t={t}
            label={FILTER_LABEL_PT[k]}
            count={active}
            open={openKey === k}
            onClick={() => setOpenKey(openKey === k ? null : k)}>
            <FilterPopover
              t={t} fieldKey={k}
              values={FILTER_OPTIONS[k]}
              selected={fs.state.filters[k] || []}
              onToggle={(v) => fs.toggleValue(k, v)}
              onClear={() => fs.clearKey(k)}
              onClose={() => setOpenKey(null)}
            />
          </FilterChip>
        );
      })}

      <button onClick={onOpenMore} style={{
        background: 'none', border: `1.3px dashed ${t.rule}`, borderRadius: 4,
        padding: '4px 10px', fontSize: 13, color: t.ink, cursor: 'pointer',
        fontFamily: "'Caveat', cursive",
      }}>+ {lang==='ptbr'?'mais filtros':'more'}</button>

      <div style={{ flex: 1 }}/>

      <button onClick={onOpenPresets} style={{
        background: 'none', border: `1.3px solid ${t.rule}`, borderRadius: 4,
        padding: '4px 10px', fontSize: 13, color: t.ink, cursor: 'pointer',
        fontFamily: "'Caveat', cursive", display: 'flex', alignItems: 'center', gap: 6,
      }}>★ {lang==='ptbr'?'predefinições':'presets'}</button>

      {countActive(fs.state.filters) > 0 && (
        <button onClick={fs.clearAll} style={{
          background: 'none', border: 'none', fontSize: 13, color: t.sub, cursor: 'pointer',
          fontFamily: "'Caveat', cursive", textDecoration: 'underline',
        }}>{lang==='ptbr'?'limpar tudo':'clear all'}</button>
      )}
    </div>
  );
}

function FilterChip({ t, label, count, open, onClick, children }) {
  const active = count > 0;
  return (
    <div style={{ position: 'relative' }}>
      <button onClick={onClick} style={{
        display: 'flex', alignItems: 'center', gap: 6,
        padding: '4px 10px',
        border: `1.3px solid ${active || open ? t.accent : t.rule}`,
        borderRadius: 4,
        background: active ? t.highlight : (open ? t.paper2 : t.paper),
        fontSize: 14, cursor: 'pointer',
        fontFamily: "'Caveat', cursive", color: t.ink,
      }}>
        <span>{label}</span>
        {count > 0 && <span style={{ background: t.ink, color: t.paper, fontSize: 10, padding: '0 5px', borderRadius: 8, fontFamily: "'JetBrains Mono', monospace" }}>{count}</span>}
        <span style={{ color: t.sub, fontSize: 11 }}>{open ? '▴' : '▾'}</span>
      </button>
      {open && children}
    </div>
  );
}

function FilterPopover({ t, fieldKey, values, selected, onToggle, onClear, onClose }) {
  const cols = values.length > 6 ? 2 : 1;
  return (
    <div style={{
      position: 'absolute', top: 'calc(100% + 6px)', left: 0,
      minWidth: cols === 2 ? 320 : 200,
      background: t.paper, border: `1.4px solid ${t.ink}`, borderRadius: 6,
      boxShadow: '0 8px 24px rgba(0,0,0,0.18)',
      zIndex: 20, padding: '10px 12px',
      fontFamily: "'Caveat', cursive",
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, paddingBottom: 6, borderBottom: `1px dashed ${t.rule}`, marginBottom: 8 }}>
        <span style={{ fontSize: 13, color: t.sub }}>{FILTER_LABEL_PT[fieldKey]}</span>
        <span style={{ fontSize: 11, color: t.sub2, fontFamily: "'JetBrains Mono', monospace" }}>· {selected.length > 1 ? 'OU' : selected.length === 1 ? '' : ''}</span>
        <div style={{ flex: 1 }}/>
        {selected.length > 0 && (
          <button onClick={onClear} style={{ background: 'none', border: 'none', fontSize: 12, color: t.sub, cursor: 'pointer', textDecoration: 'underline', fontFamily: "'Caveat', cursive" }}>limpar</button>
        )}
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: `repeat(${cols}, 1fr)`, gap: '4px 12px' }}>
        {values.map(v => {
          const on = selected.includes(v);
          return (
            <label key={v} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '3px 4px', cursor: 'pointer', fontSize: 14, borderRadius: 3, background: on ? t.highlight : 'transparent' }}>
              <span style={{
                width: 14, height: 14, border: `1.3px solid ${t.ink}`, borderRadius: 3,
                display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                background: on ? t.ink : 'transparent', color: t.paper, fontSize: 11, lineHeight: 1,
              }}>{on ? '✓' : ''}</span>
              <span style={{ textTransform: 'lowercase' }}>{v}</span>
              <input type="checkbox" checked={on} onChange={() => onToggle(v)} style={{ display: 'none' }}/>
            </label>
          );
        })}
      </div>
    </div>
  );
}

function ActiveChipsRow({ t, lang, fs }) {
  const total = countActive(fs.state.filters);
  if (total === 0 && !fs.state.query) return null;
  return (
    <div style={{ padding: '8px 24px', display: 'flex', flexWrap: 'wrap', gap: 6, alignItems: 'center', borderBottom: `1px dashed ${t.rule}`, background: t.paper2 }}>
      <span style={{ fontSize: 12, color: t.sub, fontFamily: "'JetBrains Mono', monospace" }}>{lang==='ptbr'?'ativos':'active'}:</span>
      {fs.state.query && (
        <ActiveChip t={t} label={`"${fs.state.query}"`} onRemove={() => fs.setQuery('')}/>
      )}
      {FILTER_KEYS_ALL.flatMap(k =>
        (fs.state.filters[k] || []).map(v =>
          <ActiveChip key={`${k}:${v}`} t={t} label={`${FILTER_LABEL_PT[k]}: ${v}`} onRemove={() => fs.toggleValue(k, v)}/>
        )
      )}
    </div>
  );
}

function ActiveChip({ t, label, onRemove }) {
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', gap: 6,
      padding: '2px 4px 2px 8px',
      background: t.ink, color: t.paper, borderRadius: 3,
      fontSize: 13, fontFamily: "'Caveat', cursive",
    }}>
      {label}
      <button onClick={onRemove} style={{ background: 'none', border: 'none', color: t.paper, cursor: 'pointer', padding: '0 4px', fontSize: 14, lineHeight: 1 }}>×</button>
    </span>
  );
}

Object.assign(window, { FilterBarFunctional, ActiveChipsRow });
