// Spells Data Loader — carrega os 4 JSONs de magias e adapta pro formato do app.
// Substitui os mocks (WF_SPELLS) por dados reais do simpleskans / wikidot.
//
// Uso: incluir este arquivo no HTML antes dos componentes que usam v7BuildSpells().
// Ele redefine window.v7BuildSpells pra retornar os dados da versão ativa.

// ──────────────────────────────────────────────────────────────────
// CONFIGURAÇÃO DAS VERSÕES
// ──────────────────────────────────────────────────────────────────
const SPELL_VERSIONS = [
  { key: 'spells-5E-2024-PTBR', file: 'spells-5E-2024-PTBR.json', lang: 'ptbr', label: 'D&D 5.5E 2024', labelPt: 'D&D 5.5E 2024', labelEn: "D&D 5.5E 2024", short: '5.5E 2024' },
  { key: 'spells-5E-2014-PTBR', file: 'spells-5E-2014-PTBR.json', lang: 'ptbr', label: 'D&D 5E 2014',   labelPt: 'D&D 5E 2014',   labelEn: "D&D 5E 2014",   short: '5E 2014' },
  { key: 'spells-5E-2024-EN',   file: 'spells-5E-2024-EN.json',   lang: 'en',   label: "PHB 2024",      labelPt: 'PHB 2024',      labelEn: "PHB 2024",      short: '2024 EN' },
  { key: 'spells-5E-2014-EN',   file: 'spells-5E-2014-EN.json',   lang: 'en',   label: "PHB 2014",      labelPt: 'PHB 2014',      labelEn: "PHB 2014",      short: '2014 EN' },
];

// ──────────────────────────────────────────────────────────────────
// MAPEAMENTOS
// ──────────────────────────────────────────────────────────────────
const SCHOOL_INDEX = {
  abjuration: 0, abjur: 0, abjuração: 0,
  conjuration: 1, conj: 1, conjuração: 1, invocação: 1,
  divination: 2, div: 2, divinação: 2,
  enchantment: 3, ench: 3, encantamento: 3,
  evocation: 4, evoc: 4, evocação: 4,
  illusion: 5, ilus: 5, illus: 5, ilusão: 5,
  necromancy: 6, necr: 6, necromancia: 6,
  transmutation: 7, trans: 7, transm: 7, transmutação: 7,
};

// Inglês → pt-br (para filtros e display)
const CLASS_PT = {
  bard: 'bardo', cleric: 'clérigo', druid: 'druida', sorcerer: 'feiticeiro',
  warlock: 'bruxo', wizard: 'mago', ranger: 'patrulheiro', paladin: 'paladino',
  artificer: 'artífice', monk: 'monge', barbarian: 'bárbaro', fighter: 'guerreiro', rogue: 'ladino',
};

// pt-br → inglês (para filtros em EN)
const CLASS_EN = {
  bardo: 'bard', 'clérigo': 'cleric', druida: 'druid', feiticeiro: 'sorcerer',
  bruxo: 'warlock', mago: 'wizard', patrulheiro: 'ranger', paladino: 'paladin',
  artífice: 'artificer', monge: 'monk', bárbaro: 'barbarian', guerreiro: 'fighter', ladino: 'rogue',
};

const SOURCE_CODE = {
  'Livro do Jogador': 'PHB', "Player's Handbook": 'PHB',
  // Strings reais dos JSONs PT-BR (a forma oficial Galápagos), além das antigas.
  'Guia de Xanathar para Todas as Coisas': 'XGE', 'Guia de Tudo de Xanathar': 'XGE', "Xanathar's Guide to Everything": 'XGE',
  'O Caldeirão de Todas as Coisas de Tasha': 'TCE', 'Caldeirão de Tudo de Tasha': 'TCE', "Tasha's Cauldron of Everything": 'TCE',
  'Tesouros de Fizban dos Dragões': 'FTD', "Fizban's Treasury of Dragons": 'FTD',
};

// ──────────────────────────────────────────────────────────────────
// HELPERS
// ──────────────────────────────────────────────────────────────────
function stripHtml(s) {
  if (!s) return '';
  return s
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/\s+/g, ' ')
    .trim();
}

function normalizeComponents(comp) {
  if (!comp) return '';
  return comp.split(',').map(s => s.trim()).filter(Boolean).join(' ');
}

function detectEdition(fileName) {
  if (fileName.includes('2024')) return '5e 2024';
  return '5e 2014';
}

// ──────────────────────────────────────────────────────────────────
// ADAPTADOR: JSON raw → formato do app
// ──────────────────────────────────────────────────────────────────
function adaptSpell(s, versionLang, edition) {
  const schoolKey = (s.school || '').toLowerCase();
  const schoolIdx = SCHOOL_INDEX[schoolKey];

  // Classes: o JSON vem em inglês; convertemos pra pt-br se necessário
  const rawClasses = Array.isArray(s.class) ? s.class : [];
  const classesPt = rawClasses.map(c => CLASS_PT[c.toLowerCase()] || c);
  const classesEn = rawClasses.map(c => c.toLowerCase());

  // Nome: displayName (pt) ou name (en slug)
  const ptName = s.displayName || s.name || '';
  const enName = s.name || '';

  return {
    en: enName,
    pt: ptName,
    displayName: ptName,
    name_pt: ptName,
    name_en: enName,
    lvl: typeof s.level === 'number' ? s.level : parseInt(s.level, 10) || 0,
    school: typeof schoolIdx === 'number' ? schoolIdx : 4,
    time: s.castTime || '—',
    range: s.range || '—',
    dur: s.duration || '—',
    comp: normalizeComponents(s.components),
    compNote: s.componentsNote || '',
    castTimeNote: s.castTimeNote || '',
    conc: !!s.concentration,
    rit: !!s.ritual,
    known: false,
    desc: {
      pt: stripHtml(s.description),
      en: stripHtml(s.description),
    },
    descHtml: {
      pt: s.description || '',
      en: s.description || '',
    },
    upgrade: {
      pt: stripHtml(s.upgradeDescription),
      en: stripHtml(s.upgradeDescription),
    },
    upgradeHtml: {
      pt: s.upgradeDescription || '',
      en: s.upgradeDescription || '',
    },
    classes: versionLang === 'ptbr' ? classesPt : classesEn,
    classesPt,
    classesEn,
    src: SOURCE_CODE[s.source] || (s.source || '').slice(0, 4).toUpperCase(),
    sourceFull: s.source || '',
    edition: edition || detectEdition(''),
    url: s.url || '',
    ritual: !!s.ritual,
    concentration: !!s.concentration,
    castTime: s.castTime || '—',
  };
}

function adaptSpells(json, versionLang, edition) {
  const list = Array.isArray(json) ? json : (json?.spells || []);
  return list.map(s => adaptSpell(s, versionLang, edition));
}

// ──────────────────────────────────────────────────────────────────
// CACHE + ESTADO
// ──────────────────────────────────────────────────────────────────
const _cache = {};     // key → adapted spells[]
const _rawCache = {};  // key → raw JSON

// Versão inicial = preferência salva (idioma escolhido na última visita) ou,
// na primeira visita, a versão que casa com o idioma do navegador. Assim o app
// já PRÉ-CARREGA a língua certa — sem flash de PT-BR pra quem é EN, sem fetch
// desperdiçado. O index.html (App) deriva o mesmo, então não há troca dupla.
function _initialVersionKey() {
  try {
    // ?v= de link compartilhado vence a preferência salva (o App faz o mesmo).
    const urlV = new URL(window.location.href).searchParams.get('v');
    if (urlV && SPELL_VERSIONS.some(v => v.key === urlV)) return urlV;
    const prefs = JSON.parse(localStorage.getItem('spellbook-ui-prefs') || '{}');
    if (prefs.versionKey && SPELL_VERSIONS.some(v => v.key === prefs.versionKey)) {
      return prefs.versionKey;
    }
    const nav = (navigator.languages && navigator.languages[0]) || navigator.language || '';
    const lang = String(nav).toLowerCase().startsWith('pt') ? 'ptbr' : 'en';
    const v = SPELL_VERSIONS.find(x => x.lang === lang);
    if (v) return v.key;
  } catch (e) {}
  return SPELL_VERSIONS[0].key;
}
let _currentVersion = _initialVersionKey();
let _loadingPromise = null;

function getCurrentVersion() {
  return SPELL_VERSIONS.find(v => v.key === _currentVersion) || SPELL_VERSIONS[0];
}

function setCurrentVersion(key) {
  if (_currentVersion === key) return;
  _currentVersion = key;
  // Notifica todos os listeners que a fonte mudou
  window.dispatchEvent(new CustomEvent('hifi-spells-source-changed', { detail: key }));
}

// ──────────────────────────────────────────────────────────────────
// FETCH
// ──────────────────────────────────────────────────────────────────
const _pending = {}; // key → Promise em voo (dedup de fetches concorrentes)

async function loadVersion(key) {
  if (_cache[key]) return _cache[key];
  if (_pending[key]) return _pending[key];
  const ver = SPELL_VERSIONS.find(v => v.key === key);
  if (!ver) throw new Error('Unknown version: ' + key);

  _pending[key] = (async () => {
    // Tenta carregar do path relativo (funciona no GitHub Pages / local)
    const paths = [ver.file, './' + ver.file, '../' + ver.file];
    let lastErr;
    for (const path of paths) {
      try {
        const res = await fetch(path);
        if (!res.ok) continue;
        const json = await res.json();
        _rawCache[key] = json;
        const adapted = adaptSpells(json, ver.lang, detectEdition(ver.file));
        _cache[key] = adapted;
        return adapted;
      } catch (e) {
        lastErr = e;
      }
    }
    console.warn('[spells-data-loader] Falha ao carregar', ver.file, lastErr);
    // NÃO cacheia a falha: a próxima chamada (trocar de versão, reabrir) tenta
    // de novo. Avisa o usuário em vez de mostrar "0 magias" em silêncio.
    try {
      const lang = ver.lang;
      window.dispatchEvent(new CustomEvent('hifi-toast', {
        detail: { msg: window.tt ? window.tt(lang, 'toast.loadFailed') : 'falha ao carregar as magias', kind: 'err' },
      }));
    } catch (e) {}
    return [];
  })();

  try {
    return await _pending[key];
  } finally {
    delete _pending[key];
  }
}

// Mantido pra quem quiser aquecer o cache das 4 versões (ex.: service worker /
// comparador). O boot NÃO chama mais isso — só a versão ativa é baixada.
async function loadAllVersions() {
  if (_loadingPromise) return _loadingPromise;
  _loadingPromise = Promise.all(SPELL_VERSIONS.map(v => loadVersion(v.key)));
  return _loadingPromise;
}

// ──────────────────────────────────────────────────────────────────
// API PÚBLICA — substitui v7BuildSpells
// ──────────────────────────────────────────────────────────────────
function buildSpellsFromRealData() {
  const key = _currentVersion;
  const cached = _cache[key];
  if (cached) return cached;
  // Se ainda não carregou, inicia o fetch em background e retorna vazio temporariamente
  loadVersion(key).then(() => {
    window.dispatchEvent(new CustomEvent('hifi-spells-source-changed', { detail: key }));
  });
  return [];
}

// Hook React para carregamento assíncrono com loading state
function useSpellVersions() {
  const [loaded, setLoaded] = React.useState(false);
  const [current, setCurrent] = React.useState(_currentVersion);
  const [spells, setSpells] = React.useState(() => buildSpellsFromRealData());

  React.useEffect(() => {
    let mounted = true;
    // Só a versão ATIVA é baixada no boot (~600 KB em vez de ~2,6 MB das 4).
    // As outras são carregadas sob demanda ao trocar de versão / comparar edição.
    loadVersion(_currentVersion).then(() => {
      if (!mounted) return;
      setLoaded(true);
      setSpells(buildSpellsFromRealData());
    });
    return () => { mounted = false; };
  }, []);

  React.useEffect(() => {
    const onChange = (e) => {
      setCurrent(e.detail);
      setSpells(buildSpellsFromRealData());
    };
    window.addEventListener('hifi-spells-source-changed', onChange);
    return () => window.removeEventListener('hifi-spells-source-changed', onChange);
  }, []);

  const switchVersion = React.useCallback((key) => {
    setCurrentVersion(key);
    // Atualiza imediatamente se já está em cache
    setSpells(buildSpellsFromRealData());
  }, []);

  return {
    versions: SPELL_VERSIONS,
    current,
    spells,
    loaded,
    switchVersion,
  };
}

// ──────────────────────────────────────────────────────────────────
// COMPONENTE: Seletor de Versões
// ──────────────────────────────────────────────────────────────────
function VersionSelector({ current, versions, onChange, lang = 'ptbr', dark = false, style, compact = false }) {
  const [open, setOpen] = React.useState(false);
  const currentVer = versions.find(v => v.key === current) || versions[0];

  const langDot = (v) => ({
    width: 6, height: 6, borderRadius: '50%',
    background: v.lang === 'ptbr' ? 'var(--green)' : 'var(--blue)',
    flexShrink: 0,
  });

  if (compact) {
    // Mobile: icon-button sized chip that opens a bottom sheet
    return (
      <div style={{ position: 'relative', ...style }}>
        <button
          onClick={() => setOpen(o => !o)}
          className="hifi-filter-chip"
          style={{ padding: '0 8px', gap: 5, fontSize: 11 }}
          title={window.tt(lang, 'version.switch')}
        >
          <span style={langDot(currentVer)}/>
          <span style={{ fontFamily: "'JetBrains Mono', ui-monospace, monospace", fontSize: 10, letterSpacing: '0.04em' }}>
            {currentVer.lang === 'ptbr' ? 'PT' : 'EN'}
          </span>
          <span style={{ color: 'var(--subtext0)', fontSize: 9 }}>▾</span>
        </button>
        {open && (
          <>
            <div onClick={() => setOpen(false)} style={{ position: 'fixed', inset: 0, zIndex: 15, background: 'rgba(0,0,0,0.35)' }}/>
            <div style={{
              position: 'fixed', left: 12, right: 12, bottom: 12,
              background: 'var(--mantle)', border: '1px solid var(--surface1)', borderRadius: 8,
              padding: '6px 0', zIndex: 16,
              boxShadow: '0 -8px 32px rgba(0,0,0,0.35)',
              animation: 'hifi-toast-in 180ms ease-out',
            }}>
              <div style={{ padding: '8px 14px 6px', borderBottom: '1px solid var(--surface1)' }}>
                <span className="hifi-section-label">{window.tt(lang, 'version.labelMobile')}</span>
              </div>
              {versions.map(v => (
                <button
                  key={v.key}
                  onClick={() => { onChange(v.key); setOpen(false); }}
                  className="hifi-btn-ghost"
                  style={{
                    display: 'flex', width: '100%', alignItems: 'center', gap: 10,
                    padding: '10px 14px', textAlign: 'left',
                    color: v.key === current ? 'var(--accent)' : 'var(--text)',
                    fontSize: 14,
                  }}
                >
                  <span style={langDot(v)}/>
                  <span style={{ flex: 1 }}>{lang === 'ptbr' ? v.labelPt : v.labelEn}</span>
                  {v.key === current && (
                    <span style={{ fontFamily: "'JetBrains Mono', ui-monospace, monospace", fontSize: 11, color: 'var(--accent)' }}>✓</span>
                  )}
                </button>
              ))}
            </div>
          </>
        )}
      </div>
    );
  }

  // Desktop: filter-chip style dropdown
  return (
    <div style={{ position: 'relative', ...style }}>
      <button
        onClick={() => setOpen(o => !o)}
        className="hifi-filter-chip"
        style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}
        title={window.tt(lang, 'version.switch')}
      >
        <span style={langDot(currentVer)}/>
        <span>{lang === 'ptbr' ? currentVer.labelPt : currentVer.labelEn}</span>
        <span style={{ color: 'var(--subtext0)', fontSize: 10 }}>▾</span>
      </button>
      {open && (
        <>
          <div onClick={() => setOpen(false)} style={{ position: 'fixed', inset: 0, zIndex: 15 }}/>
          <div style={{
            position: 'absolute', right: 0, top: '100%', marginTop: 6,
            background: 'var(--mantle)', border: '1px solid var(--surface1)', borderRadius: 6,
            minWidth: 200, padding: '4px 0', zIndex: 16,
            boxShadow: '0 8px 24px rgba(0,0,0,0.18)',
          }}>
            <div style={{ padding: '6px 12px 4px' }}>
              <span className="hifi-section-label">{window.tt(lang, 'version.label')}</span>
            </div>
            {versions.map(v => (
              <button
                key={v.key}
                onClick={() => { onChange(v.key); setOpen(false); }}
                className="hifi-btn-ghost"
                style={{
                  display: 'flex', width: '100%', alignItems: 'center', gap: 10,
                  padding: '8px 12px', textAlign: 'left',
                  color: v.key === current ? 'var(--accent)' : 'var(--text)',
                }}
              >
                <span style={langDot(v)}/>
                <span style={{ flex: 1 }}>{lang === 'ptbr' ? v.labelPt : v.labelEn}</span>
                {v.key === current && (
                  <span style={{ fontFamily: "'JetBrains Mono', ui-monospace, monospace", fontSize: 11, color: 'var(--accent)' }}>✓</span>
                )}
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  );
}

// ──────────────────────────────────────────────────────────────────
// OVERRIDE: substitui v7BuildSpells global
// ──────────────────────────────────────────────────────────────────
// Guarda a original (mock) como fallback
const _originalV7BuildSpells = window.v7BuildSpells;

window.v7BuildSpells = buildSpellsFromRealData;
window.SPELL_VERSIONS = SPELL_VERSIONS;
// Mapas de classe en↔pt — usados pra remapear o filtro de classe ao trocar de idioma.
window.CLASS_PT = CLASS_PT; // en → pt  (bard → bardo)
window.CLASS_EN = CLASS_EN; // pt → en  (bardo → bard)
window.getCurrentSpellVersion = getCurrentVersion;
window.setCurrentSpellVersion = setCurrentVersion;
window.loadSpellVersion = loadVersion;
window.loadAllSpellVersions = loadAllVersions;
window.useSpellVersions = useSpellVersions;
window.VersionSelector = VersionSelector;
window.adaptSpell = adaptSpell;
window.adaptSpells = adaptSpells;

// Pre-carrega a versão default assim que o DOM estiver pronto
if (typeof document !== 'undefined') {
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => loadVersion(_currentVersion));
  } else {
    loadVersion(_currentVersion);
  }
}
