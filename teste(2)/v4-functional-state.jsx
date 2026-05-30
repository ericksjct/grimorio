// V4 funcional — estado dos filtros, sincronização com URL, lógica de filtragem.

const FILTER_KEYS_PRIMARY   = ['level', 'school', 'class', 'source', 'edition'];
const FILTER_KEYS_SECONDARY = ['castTime', 'range', 'duration', 'components', 'concentration', 'ritual', 'damage', 'save'];
const FILTER_KEYS_ALL = [...FILTER_KEYS_PRIMARY, ...FILTER_KEYS_SECONDARY];

const FILTER_OPTIONS = {
  level:        ['truque', '1', '2', '3', '4', '5', '6', '7', '8', '9'],
  school:       ['evocação', 'abjuração', 'conjuração', 'encantamento', 'ilusão', 'necromancia', 'adivinhação', 'transmutação'],
  class:        ['mago', 'clérigo', 'druida', 'bardo', 'paladino', 'feiticeiro', 'bruxo', 'patrulheiro'],
  source:       ['PHB', 'XGE', 'TCE', 'FTD', 'homebrew'],
  edition:      ['5e 2014', '5e 2024'],
  castTime:     ['ação', 'bônus', 'reação', 'minuto', 'ritual'],
  range:        ['toque', 'pessoal', '9m', '18m', '36m+'],
  duration:     ['instantâneo', 'concentração', '1 minuto', '10 min', 'longa'],
  components:   ['V', 'S', 'M'],
  concentration:['sim', 'não'],
  ritual:       ['sim', 'não'],
  damage:       ['fogo', 'gelo', 'elétrico', 'necrótico', 'radiante', 'psíquico', 'ácido', 'físico'],
  save:         ['Força', 'Destreza', 'Constituição', 'Inteligência', 'Sabedoria', 'Carisma'],
};

const FILTER_LABEL_PT = {
  level: 'nível', school: 'escola', class: 'classe', source: 'fonte', edition: 'edição',
  castTime: 'tempo', range: 'alcance', duration: 'duração', components: 'componentes',
  concentration: 'concentração', ritual: 'ritual', damage: 'dano', save: 'salvaguarda',
};

// Sintaxe ⌘K (curta, fácil de digitar)
const FILTER_SHORT = {
  class: 'classe', level: 'lvl', school: 'escola', source: 'fonte', edition: 'ed',
  castTime: 'tempo', range: 'alc', duration: 'dur', components: 'comp',
  concentration: 'conc', ritual: 'rit', damage: 'dano', save: 'save',
};

function emptyFilters() {
  return Object.fromEntries(FILTER_KEYS_ALL.map(k => [k, []]));
}

// Conta total de filtros ativos
function countActive(filters) {
  return Object.values(filters).reduce((acc, arr) => acc + (arr ? arr.length : 0), 0);
}

// Gera tokens pro ⌘K input ("classe:mago lvl:1,2,3")
function filtersToTokens(filters) {
  return FILTER_KEYS_ALL
    .filter(k => filters[k] && filters[k].length)
    .map(k => `${FILTER_SHORT[k]}:${filters[k].join(',')}`);
}

// Parse de input do ⌘K → estado de filtros
// "classe:mago lvl:1,2 dano:fogo magic missile" → {filters, query}
function parseQuery(input) {
  const out = { filters: emptyFilters(), query: '' };
  const tokens = input.match(/[\w.\u00C0-\u017F]+:[^\s]+|<\d+|>\d+|\S+/g) || [];
  const reverseShort = Object.fromEntries(Object.entries(FILTER_SHORT).map(([k, v]) => [v, k]));
  const reverseLong  = Object.fromEntries(Object.entries(FILTER_LABEL_PT).map(([k, v]) => [v, k]));
  const queryWords = [];
  for (const tok of tokens) {
    let m;
    if ((m = tok.match(/^([\w\u00C0-\u017F]+):(.+)$/))) {
      const fieldRaw = m[1].toLowerCase();
      const valRaw   = m[2];
      const key = reverseShort[fieldRaw] || reverseLong[fieldRaw] || (FILTER_KEYS_ALL.includes(fieldRaw) ? fieldRaw : null);
      if (key) {
        out.filters[key] = valRaw.split(',').map(v => v.trim()).filter(Boolean);
        continue;
      }
    }
    // operadores nv (lvl<3, lvl>=2)
    if ((m = tok.match(/^(lvl|n[ií]vel|level)(<=|>=|<|>|=)(\d+)$/i))) {
      const op = m[2], n = parseInt(m[3], 10);
      const lvls = FILTER_OPTIONS.level.map((v, i) => [v, i]).filter(([_, i]) => {
        if (op === '<')  return i < n;
        if (op === '<=') return i <= n;
        if (op === '>')  return i > n;
        if (op === '>=') return i >= n;
        if (op === '=')  return i === n;
        return false;
      }).map(([v]) => v);
      out.filters.level = lvls;
      continue;
    }
    queryWords.push(tok);
  }
  out.query = queryWords.join(' ').trim();
  return out;
}

// URL state
function readUrlFilters() {
  const out = { filters: emptyFilters(), query: '' };
  try {
    const u = new URL(window.location.href);
    for (const k of FILTER_KEYS_ALL) {
      const v = u.searchParams.get(k);
      if (v) out.filters[k] = v.split(',').filter(Boolean);
    }
    out.query = u.searchParams.get('q') || '';
  } catch (e) {}
  return out;
}

function writeUrlFilters(filters, query) {
  try {
    const u = new URL(window.location.href);
    for (const k of FILTER_KEYS_ALL) {
      if (filters[k] && filters[k].length) u.searchParams.set(k, filters[k].join(','));
      else u.searchParams.delete(k);
    }
    if (query) u.searchParams.set('q', query); else u.searchParams.delete('q');
    window.history.replaceState({}, '', u.toString());
  } catch (e) {}
}

// Hook principal
function useFilterState(initial) {
  const [state, setState] = React.useState(() => {
    const url = readUrlFilters();
    if (countActive(url.filters) || url.query) return url;
    return initial || { filters: emptyFilters(), query: '' };
  });
  React.useEffect(() => {
    writeUrlFilters(state.filters, state.query);
  }, [state]);

  const toggleValue = (key, val) => setState(s => {
    const cur = s.filters[key] || [];
    const next = cur.includes(val) ? cur.filter(v => v !== val) : [...cur, val];
    return { ...s, filters: { ...s.filters, [key]: next } };
  });
  const clearKey = (key) => setState(s => ({ ...s, filters: { ...s.filters, [key]: [] } }));
  const clearAll = () => setState({ filters: emptyFilters(), query: '' });
  const setQuery = (q) => setState(s => ({ ...s, query: q }));
  const replaceAll = (newState) => setState(newState);

  return { state, toggleValue, clearKey, clearAll, setQuery, replaceAll };
}

Object.assign(window, {
  FILTER_KEYS_PRIMARY, FILTER_KEYS_SECONDARY, FILTER_KEYS_ALL,
  FILTER_OPTIONS, FILTER_LABEL_PT, FILTER_SHORT,
  emptyFilters, countActive, filtersToTokens, parseQuery,
  useFilterState,
});
