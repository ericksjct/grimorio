// V4 funcional — montagem final. Barra + ⌘K + presets + painel "+ mais filtros" + grid.
// Atalho ⌘K / ⌃K abre a palette. ESC fecha qualquer modal.

function V4Functional({ lang, dark, annotations, width = 1280, height = 820 }) {
  const t = useWfTheme(dark);
  const str = pickStr(lang);
  const fs = useFilterState();
  const [cmdkOpen, setCmdkOpen] = React.useState(false);
  const [presetsOpen, setPresetsOpen] = React.useState(false);
  const [moreOpen, setMoreOpen] = React.useState(false);
  const [presets, setPresets] = React.useState([
    { name: 'meu mago nv 5', filters: { ...emptyFilters(), class: ['mago'], level: ['1','2','3'] }, query: '' },
    { name: 'magias de cura', filters: { ...emptyFilters(), school: ['evocação'] }, query: 'cura' },
  ]);

  React.useEffect(() => {
    const onKey = (e) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setCmdkOpen(true);
      }
      if (e.key === 'Escape') {
        setCmdkOpen(false); setPresetsOpen(false); setMoreOpen(false);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  // Filtragem real (mock — usa WF_SPELLS, marcando matches)
  const items = React.useMemo(() => {
    const f = fs.state.filters;
    const q = fs.state.query.toLowerCase();
    return WF_SPELLS.map((s, i) => {
      let match = true;
      // class — mock: todas as primeiras 8 magias têm "mago" no índice 0; refletido só visualmente
      if (f.class.length > 0 && !f.class.includes('mago') && i % 3 === 0) match = false;
      if (f.level.length > 0 && !f.level.includes(String(s.lvl)) && !(s.lvl === 0 && f.level.includes('truque'))) match = false;
      if (f.school.length > 0) {
        const schoolName = FILTER_OPTIONS.school[s.school % FILTER_OPTIONS.school.length];
        if (!f.school.includes(schoolName)) match = false;
      }
      if (q && !spellName(s, lang).toLowerCase().includes(q)) match = false;
      return { s, match };
    }).filter(x => x.match).map(x => x.s);
  }, [fs.state, lang]);

  return (
    <div style={{ width, height, background: t.paper, color: t.ink, fontFamily: "'Caveat', 'Patrick Hand', cursive", overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
      {/* Topbar */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '12px 24px', borderBottom: `1.4px solid ${t.rule}` }}>
        <WfHeading theme={t} size={22}>{str.appName}</WfHeading>
        <div style={{ flex: 1 }}/>
        <WfMono theme={t}>v4 · funcional · A+C</WfMono>
      </div>

      <FilterBarFunctional t={t} lang={lang} fs={fs}
        onOpenCmdK={() => setCmdkOpen(true)}
        onOpenPresets={() => setPresetsOpen(true)}
        onOpenMore={() => setMoreOpen(true)}/>

      <ActiveChipsRow t={t} lang={lang} fs={fs}/>

      {/* Resultados */}
      <div style={{ flex: 1, overflow: 'auto', padding: '14px 24px' }}>
        <div style={{ display: 'flex', alignItems: 'baseline', marginBottom: 10 }}>
          <WfMono theme={t}>{items.length} {lang==='ptbr'?'magias':'spells'}</WfMono>
          <div style={{ flex: 1 }}/>
          <WfMono theme={t}>experimente: ⌘K · clique nos chips · "+ mais filtros" · ★</WfMono>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: 14 }}>
          {items.slice(0, 18).map((s, i) => (
            <V4FResultCard key={i} s={s} t={t} str={str} lang={lang}/>
          ))}
          {items.length === 0 && (
            <div style={{ gridColumn: '1 / -1', textAlign: 'center', padding: 40, color: t.sub }}>
              {lang==='ptbr'?'nenhuma magia bate com esses filtros':'no spells match these filters'}
              <div style={{ marginTop: 6 }}>
                <button onClick={fs.clearAll} style={{ background: 'none', border: `1px solid ${t.rule}`, padding: '4px 10px', borderRadius: 3, cursor: 'pointer', fontFamily: "'Caveat', cursive", fontSize: 14, color: t.ink }}>limpar filtros</button>
              </div>
            </div>
          )}
        </div>
      </div>

      {cmdkOpen && <CmdKPalette t={t} lang={lang} fs={fs} onClose={() => setCmdkOpen(false)}/>}
      {presetsOpen && <PresetsModal t={t} lang={lang} fs={fs} presets={presets} setPresets={setPresets} onClose={() => setPresetsOpen(false)}/>}
      {moreOpen && <MoreFiltersPanel t={t} lang={lang} fs={fs} onClose={() => setMoreOpen(false)}/>}
    </div>
  );
}

function V4FResultCard({ s, t, str, lang }) {
  return (
    <div style={{
      height: 180, padding: '10px 14px',
      border: `1.3px solid ${t.rule}`, borderRadius: 4, background: t.paper2,
      display: 'flex', flexDirection: 'column', gap: 6, cursor: 'pointer', position: 'relative', overflow: 'hidden',
    }}>
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 8 }}>
        <WfSchoolMark idx={s.school} theme={t} size={20}/>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 17, fontWeight: 600, lineHeight: 1.05 }}>{spellName(s, lang)}</div>
          <WfMono theme={t}>{levelLabel(s.lvl, str)} · {str.schools[s.school]}</WfMono>
        </div>
        <WfBookmark on={s.known} theme={t} size={16}/>
      </div>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 3 }}>
        <WfPill theme={t} style={{ padding: '0 6px', fontSize: 11 }}>{s.time}</WfPill>
        <WfPill theme={t} style={{ padding: '0 6px', fontSize: 11 }}>{s.range}</WfPill>
        <WfPill theme={t} style={{ padding: '0 6px', fontSize: 11 }}>{s.dur}</WfPill>
      </div>
      <div style={{ marginTop: 4, position: 'relative', flex: 1, overflow: 'hidden' }}>
        <WfTextBlock theme={t} lines={3} width={200} seed={s.lvl*7 + s.school + 1}/>
        <div style={{ position: 'absolute', left: 0, right: 0, bottom: 0, height: 28, background: `linear-gradient(to bottom, transparent, ${t.paper2} 80%)`, display: 'flex', alignItems: 'flex-end', justifyContent: 'center', paddingBottom: 2, pointerEvents: 'none' }}>
          <span style={{ color: t.sub, fontSize: 13 }}>↓</span>
        </div>
      </div>
    </div>
  );
}

window.V4Functional = V4Functional;
