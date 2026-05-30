// V4 funcional — ⌘K palette, modal de presets, painel "+ mais filtros".

function CmdKPalette({ t, lang, fs, onClose }) {
  const [input, setInput] = React.useState(filtersToTokens(fs.state.filters).join(' ') + (fs.state.query ? ' ' + fs.state.query : ''));
  const inputRef = React.useRef(null);

  React.useEffect(() => { inputRef.current?.focus(); }, []);

  const parsed = React.useMemo(() => parseQuery(input), [input]);

  // Sugestões de magias (mock)
  const spellMatches = React.useMemo(() => {
    const q = parsed.query.toLowerCase();
    if (!q) return [];
    return ['Bola de Fogo', 'Mísseis Mágicos', 'Cura Ferimentos', 'Escudo', 'Convocar Familiar']
      .filter(s => s.toLowerCase().includes(q)).slice(0, 4);
  }, [parsed.query]);

  // Comandos sugeridos
  const cmdSuggestions = React.useMemo(() => {
    if (input.endsWith(':') || input.includes(':')) return [];
    return [
      { syntax: 'classe:mago', desc: 'filtrar por classe' },
      { syntax: 'lvl<3', desc: 'magias até nível 2' },
      { syntax: 'escola:evocação', desc: 'filtrar por escola' },
      { syntax: 'dano:fogo', desc: 'magias de fogo' },
      { syntax: 'rit:sim', desc: 'só rituais' },
    ];
  }, [input]);

  const apply = () => {
    fs.replaceAll({ filters: parsed.filters, query: parsed.query });
    onClose();
  };

  return (
    <div onClick={onClose} style={{
      position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.42)', zIndex: 100,
      display: 'flex', justifyContent: 'center', alignItems: 'flex-start', paddingTop: 90,
    }}>
      <div onClick={e => e.stopPropagation()} style={{
        width: 620, background: t.paper, border: `1.6px solid ${t.ink}`, borderRadius: 10,
        boxShadow: '0 18px 50px rgba(0,0,0,0.35)', overflow: 'hidden',
        fontFamily: "'Caveat', cursive",
      }}>
        <div style={{ padding: '14px 18px', borderBottom: `1.2px dashed ${t.rule}`, display: 'flex', alignItems: 'center', gap: 10 }}>
          <span style={{ fontSize: 20, color: t.sub }}>⌕</span>
          <input ref={inputRef} value={input} onChange={e => setInput(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter') apply(); if (e.key === 'Escape') onClose(); }}
            placeholder="buscar magia ou: classe:mago lvl<3 dano:fogo"
            style={{
              flex: 1, border: 'none', outline: 'none', background: 'transparent',
              fontSize: 19, color: t.ink, fontFamily: "'Caveat', cursive",
            }}/>
          <span style={{ fontSize: 11, color: t.sub, fontFamily: "'JetBrains Mono', monospace" }}>esc</span>
        </div>

        <div style={{ maxHeight: 360, overflow: 'auto', padding: '8px 0' }}>
          {spellMatches.length > 0 && (
            <CmdKSection t={t} title="magias">
              {spellMatches.map((name, i) => (
                <CmdKRow key={name} t={t} icon="✦" label={name} hint="abrir" highlight={i === 0}/>
              ))}
            </CmdKSection>
          )}

          {Object.entries(parsed.filters).some(([_, v]) => v.length > 0) && (
            <CmdKSection t={t} title="filtros parseados">
              {Object.entries(parsed.filters).filter(([_, v]) => v.length).map(([k, v]) => (
                <div key={k} style={{ padding: '4px 18px', fontSize: 14, display: 'flex', gap: 10 }}>
                  <span style={{ color: t.sub, fontFamily: "'JetBrains Mono', monospace", fontSize: 12, minWidth: 80 }}>{FILTER_LABEL_PT[k]}:</span>
                  <span>{v.join(', ')}</span>
                </div>
              ))}
            </CmdKSection>
          )}

          {cmdSuggestions.length > 0 && spellMatches.length === 0 && (
            <CmdKSection t={t} title="exemplos">
              {cmdSuggestions.map(c => (
                <CmdKRow key={c.syntax} t={t}
                  icon="›"
                  label={<span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 13 }}>{c.syntax}</span>}
                  hint={c.desc}
                  onClick={() => setInput(input ? input + ' ' + c.syntax : c.syntax)}/>
              ))}
            </CmdKSection>
          )}
        </div>

        <div style={{ padding: '8px 18px', borderTop: `1.2px dashed ${t.rule}`, display: 'flex', gap: 14, fontSize: 12, color: t.sub, fontFamily: "'JetBrains Mono', monospace" }}>
          <span>↵ aplicar como filtro</span>
          <span>↑↓ navegar</span>
          <div style={{ flex: 1 }}/>
          <span>tente: classe:mago lvl&lt;3</span>
        </div>
      </div>
    </div>
  );
}

function CmdKSection({ t, title, children }) {
  return (
    <div style={{ marginBottom: 4 }}>
      <div style={{ padding: '6px 18px 2px', fontSize: 11, color: t.sub2, fontFamily: "'JetBrains Mono', monospace", textTransform: 'uppercase', letterSpacing: 0.5 }}>{title}</div>
      {children}
    </div>
  );
}

function CmdKRow({ t, icon, label, hint, highlight, onClick }) {
  return (
    <div onClick={onClick} style={{
      padding: '6px 18px',
      display: 'flex', alignItems: 'center', gap: 12,
      background: highlight ? t.highlight : 'transparent',
      borderLeft: highlight ? `3px solid ${t.accent}` : '3px solid transparent',
      cursor: onClick ? 'pointer' : 'default',
      fontSize: 15,
    }}>
      <span style={{ width: 14, color: t.sub }}>{icon}</span>
      <span style={{ flex: 1 }}>{label}</span>
      <span style={{ fontSize: 12, color: t.sub, fontFamily: "'JetBrains Mono', monospace" }}>{hint}</span>
    </div>
  );
}

// ─────────────────── Modal de presets ───────────────────
function PresetsModal({ t, lang, fs, presets, setPresets, onClose }) {
  const [name, setName] = React.useState('');
  const save = () => {
    if (!name.trim()) return;
    setPresets([...presets, { name: name.trim(), filters: fs.state.filters, query: fs.state.query }]);
    setName('');
  };
  const apply = (p) => { fs.replaceAll({ filters: p.filters, query: p.query || '' }); onClose(); };
  const del = (i) => setPresets(presets.filter((_, idx) => idx !== i));

  return (
    <div onClick={onClose} style={{
      position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.42)', zIndex: 100,
      display: 'flex', justifyContent: 'center', alignItems: 'center',
    }}>
      <div onClick={e => e.stopPropagation()} style={{
        width: 540, background: t.paper, border: `1.6px solid ${t.ink}`, borderRadius: 10,
        boxShadow: '0 18px 50px rgba(0,0,0,0.35)', overflow: 'hidden',
        fontFamily: "'Caveat', cursive",
      }}>
        <div style={{ padding: '14px 20px', borderBottom: `1.2px dashed ${t.rule}`, display: 'flex', alignItems: 'center' }}>
          <WfHeading theme={t} size={20}>{lang==='ptbr'?'predefinições':'presets'}</WfHeading>
          <div style={{ flex: 1 }}/>
          <button onClick={onClose} style={{ background: 'none', border: 'none', fontSize: 22, color: t.sub, cursor: 'pointer' }}>×</button>
        </div>

        <div style={{ padding: 16, borderBottom: `1px dashed ${t.rule}` }}>
          <div style={{ fontSize: 13, color: t.sub, marginBottom: 8, fontFamily: "'JetBrains Mono', monospace" }}>
            {lang==='ptbr'?'salvar combinação atual':'save current combination'}
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <input value={name} onChange={e => setName(e.target.value)}
              placeholder={lang==='ptbr'?'ex: meu mago nv 5':'name…'}
              onKeyDown={e => e.key === 'Enter' && save()}
              style={{
                flex: 1, padding: '6px 10px', border: `1.3px solid ${t.rule}`, borderRadius: 4,
                background: t.paper2, fontSize: 15, fontFamily: "'Caveat', cursive", color: t.ink,
              }}/>
            <button onClick={save} style={{
              padding: '6px 14px', background: t.ink, color: t.paper, border: 'none', borderRadius: 4,
              cursor: 'pointer', fontSize: 14, fontFamily: "'Caveat', cursive",
            }}>{lang==='ptbr'?'salvar':'save'}</button>
          </div>
          <div style={{ marginTop: 6, fontSize: 12, color: t.sub2 }}>
            {countActive(fs.state.filters)} {lang==='ptbr'?'filtros ativos':'active filters'}
            {fs.state.query && ` · "${fs.state.query}"`}
          </div>
        </div>

        <div style={{ padding: '8px 0', maxHeight: 300, overflow: 'auto' }}>
          {presets.length === 0 && (
            <div style={{ padding: 24, textAlign: 'center', color: t.sub, fontSize: 14 }}>
              {lang==='ptbr'?'nenhuma predefinição salva ainda':'no presets yet'}
            </div>
          )}
          {presets.map((p, i) => (
            <div key={i} style={{ padding: '8px 20px', borderBottom: `1px dashed ${t.rule}`, display: 'flex', alignItems: 'center', gap: 10 }}>
              <span style={{ color: t.accent }}>★</span>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 16 }}>{p.name}</div>
                <div style={{ fontSize: 11, color: t.sub, fontFamily: "'JetBrains Mono', monospace" }}>
                  {filtersToTokens(p.filters).join(' ') || '—'}
                </div>
              </div>
              <button onClick={() => apply(p)} style={{ padding: '3px 10px', background: t.paper2, border: `1.2px solid ${t.rule}`, borderRadius: 3, fontSize: 13, fontFamily: "'Caveat', cursive", cursor: 'pointer', color: t.ink }}>aplicar</button>
              <button onClick={() => del(i)} style={{ background: 'none', border: 'none', color: t.sub, fontSize: 16, cursor: 'pointer' }}>×</button>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ─────────────────── Painel "+ mais filtros" ───────────────────
function MoreFiltersPanel({ t, lang, fs, onClose }) {
  return (
    <div onClick={onClose} style={{
      position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.42)', zIndex: 100,
      display: 'flex', justifyContent: 'flex-end',
    }}>
      <div onClick={e => e.stopPropagation()} style={{
        width: 420, height: '100%', background: t.paper, borderLeft: `1.6px solid ${t.ink}`,
        overflow: 'auto', padding: 20, fontFamily: "'Caveat', cursive",
      }}>
        <div style={{ display: 'flex', alignItems: 'center', marginBottom: 16 }}>
          <WfHeading theme={t} size={20}>{lang==='ptbr'?'mais filtros':'more filters'}</WfHeading>
          <div style={{ flex: 1 }}/>
          <button onClick={onClose} style={{ background: 'none', border: 'none', fontSize: 22, color: t.sub, cursor: 'pointer' }}>×</button>
        </div>
        {FILTER_KEYS_SECONDARY.map(k => (
          <div key={k} style={{ marginBottom: 14 }}>
            <div style={{ fontSize: 14, color: t.sub, marginBottom: 5, fontFamily: "'JetBrains Mono', monospace" }}>{FILTER_LABEL_PT[k]}</div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
              {FILTER_OPTIONS[k].map(v => {
                const on = (fs.state.filters[k] || []).includes(v);
                return (
                  <button key={v} onClick={() => fs.toggleValue(k, v)} style={{
                    padding: '3px 10px', borderRadius: 3, fontSize: 13,
                    border: `1.2px solid ${on ? t.accent : t.rule}`,
                    background: on ? t.ink : t.paper2, color: on ? t.paper : t.ink,
                    cursor: 'pointer', fontFamily: "'Caveat', cursive",
                  }}>{v}</button>
                );
              })}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

Object.assign(window, { CmdKPalette, PresetsModal, MoreFiltersPanel });
