// i18n — catálogo central de strings de UI (chrome) PT-BR / EN.
//
// GERADO/MANTIDO junto da migração das strings do v10-hifi.jsx. Centraliza o
// chrome num dicionário keyed por id, com fallback pro PT-BR, interpolação
// {var} e i18nParityCheck() pra auditar buracos entre idiomas.
//
// Acoplamento: o idioma do chrome segue a VERSÃO de magias ativa (PT/EN) — sem
// toggle separado. Ver index.html (estado `lang`) e spells-data-loader.jsx.
//
// Uso nos componentes (no-build, Babel no browser):
//   tt(lang, 'spell.range')                      → string traduzida
//   tt(lang, 'spell.part', { i: 1, n: 3 })       → com interpolação
// `tt` memoiza por idioma; `makeT(lang)` segue disponível pra quem prefere.

const STRINGS = {
  ptbr: {
    'spell.cantrip': 'truque',
    'spell.cantripShort': 'T',
    'spell.level': 'nível',
    'spell.cast': 'execução',
    'spell.castTime': 'execução',
    'spell.range': 'alcance',
    'spell.duration': 'duração',
    'spell.components': 'componentes',
    'spell.component': 'componente',
    'spell.concentration': 'concentração',
    'spell.ritual': 'ritual',
    'spell.school': 'escola',
    'spell.class': 'classe',
    'spell.classes': 'classes',
    'spell.source': 'fonte',
    'spell.description': 'descrição',
    'spell.higherLevels': 'Em níveis superiores.',
    'spell.higherLevelsLabel': 'em níveis superiores',
    'spell.part': 'parte {i} de {n}',
    'spell.prepare': 'marcar como preparada',
    'spell.unprepare': 'desmarcar como preparada',
    'spell.prepared': 'preparada',
    'spell.prepareShort': 'preparar',
    'spell.bookmark': 'favoritar magia',
    'spell.copyLink': 'copiar link da magia',
    'comp.verbal': 'verbal',
    'comp.somatic': 'somático',
    'comp.material': 'material',
    'value.yes': 'sim',
    'value.no': 'não',
    'theme.toLight': 'mudar para tema claro',
    'theme.toDark': 'mudar para tema escuro',
    'print.dc': 'CD',
    'print.bonus': 'bônus',
    'print.spellSlots': 'espaços de magia',
    'print.slotShort': 'nv',
    'print.preparing': '⎙ preparando impressão…',
    'print.noPrepared': 'nenhuma magia preparada',
    'print.printing': '⎙ imprimindo {n} {nounSpell}…',
    'noun.spell.one': 'magia',
    'noun.spell.other': 'magias',
    'toast.linkCopied': 'link copiado: {url}',
    'toast.linkCopiedShort': 'link copiado',
    'toast.copyFailed': 'falha ao copiar',
    'toast.shared': 'compartilhado',
    'toast.versionShort': 'versão: {short}',
    'version.label': 'versão',
    'version.labelMobile': 'versão das magias',
    'version.switch': 'trocar versão das magias',
    'filter.clearAll': 'limpar filtros',
    'filter.clear': 'limpar',
    'filter.removeFilter': '✕ remover filtro',
    'filter.addCustom': 'adicionar filtro personalizado',
    'filter.more': 'mais',
    'filter.add': 'adicionar filtro',
    'filter.searchSpells': 'buscar magias…',
    'filter.results': 'resultados',
    'filter.searchFilterShort': 'buscar, filtrar…',
    'filter.spellName': 'nome da magia…',
    'filter.searchFilterAria': 'buscar e filtrar magias',
    'empty.title': 'Nenhuma magia encontrada',
    'empty.body': 'Nenhuma magia corresponde à busca e aos filtros atuais. Tente ajustar ou limpar os filtros.',
    'char.switch': 'trocar de personagem',
    'char.edit': 'editar',
    'char.new': 'novo personagem',
    'char.label': 'personagem',
    'char.switchEdit': 'trocar / editar personagem',
    'char.default.name': 'Aventureiro Desconhecido',
    'title.spellbook': 'Grimório',
    'title.designStudy': 'estudo de design',
    'title.myGrimoire': 'meu grimório',
    'section.themes': 'temas',
    'section.fonts': 'fontes',
    'section.tools': 'ferramentas',
    'section.actions': 'ações',
    'action.printPrepared': 'imprimir preparadas',
    'action.printPreparedTitle': 'imprimir magias preparadas',
    'action.shareBuild': 'compartilhar build',
    'action.shareBuildTitle': 'compartilhar build do personagem',
    'action.copyLink': 'copiar link',
    'action.shareFilter': 'compartilhar filtro',
    'action.onlyPrepared': 'mostrar só as magias preparadas',
    'action.onlyPreparedShort': 'mostrar só as preparadas',
    'nav.back': 'voltar',
    'nav.close': 'fechar (esc)',
  },

  en: {
    'spell.cantrip': 'cantrip',
    'spell.cantripShort': 'C',
    'spell.level': 'level',
    'spell.cast': 'cast',
    'spell.castTime': 'cast time',
    'spell.range': 'range',
    'spell.duration': 'duration',
    'spell.components': 'components',
    'spell.component': 'component',
    'spell.concentration': 'concentration',
    'spell.ritual': 'ritual',
    'spell.school': 'school',
    'spell.class': 'class',
    'spell.classes': 'classes',
    'spell.source': 'source',
    'spell.description': 'description',
    'spell.higherLevels': 'At higher levels.',
    'spell.higherLevelsLabel': 'at higher levels',
    'spell.part': 'part {i} of {n}',
    'spell.prepare': 'prepare',
    'spell.unprepare': 'unprepare',
    'spell.prepared': 'prepared',
    'spell.prepareShort': 'prepare',
    'spell.bookmark': 'bookmark spell',
    'spell.copyLink': 'copy spell link',
    'comp.verbal': 'verbal',
    'comp.somatic': 'somatic',
    'comp.material': 'material',
    'value.yes': 'yes',
    'value.no': 'no',
    'theme.toLight': 'switch to light theme',
    'theme.toDark': 'switch to dark theme',
    'print.dc': 'DC',
    'print.bonus': 'bonus',
    'print.spellSlots': 'spell slots',
    'print.slotShort': 'lvl',
    'print.preparing': '⎙ printing…',
    'print.noPrepared': 'no prepared spells',
    'print.printing': '⎙ printing {n} {nounSpell}…',
    'noun.spell.one': 'spell',
    'noun.spell.other': 'spells',
    'toast.linkCopied': 'link copied: {url}',
    'toast.linkCopiedShort': 'link copied',
    'toast.copyFailed': 'copy failed',
    'toast.shared': 'shared',
    'toast.versionShort': 'version: {short}',
    'version.label': 'version',
    'version.labelMobile': 'spell version',
    'version.switch': 'switch spell version',
    'filter.clearAll': 'clear filters',
    'filter.clear': 'clear',
    'filter.removeFilter': '✕ remove filter',
    'filter.addCustom': 'add custom filter',
    'filter.more': 'more',
    'filter.add': 'add filter',
    'filter.searchSpells': 'search spells…',
    'filter.results': 'results',
    'filter.searchFilterShort': 'search, filter…',
    'filter.spellName': 'spell name…',
    'filter.searchFilterAria': 'search and filter spells',
    'empty.title': 'No spells found',
    'empty.body': 'No spell matches the current search and filters. Try adjusting or clearing them.',
    'char.switch': 'switch character',
    'char.edit': 'edit',
    'char.new': 'new character',
    'char.label': 'character',
    'char.switchEdit': 'switch / edit character',
    'char.default.name': 'Unknown Adventurer',
    'title.spellbook': 'Spellbook',
    'title.designStudy': 'design study',
    'title.myGrimoire': 'my spellbook',
    'section.themes': 'themes',
    'section.fonts': 'fonts',
    'section.tools': 'tools',
    'section.actions': 'actions',
    'action.printPrepared': 'print prepared',
    'action.printPreparedTitle': 'print prepared spells',
    'action.shareBuild': 'share build',
    'action.shareBuildTitle': 'share character build',
    'action.copyLink': 'copy link',
    'action.shareFilter': 'share filter',
    'action.onlyPrepared': 'show only prepared spells',
    'action.onlyPreparedShort': 'show only prepared',
    'nav.back': 'back',
    'nav.close': 'close (esc)',
  },
};

// Normaliza 'pt-br', 'pt_BR', 'pt' → 'ptbr'; qualquer outra coisa → 'en'.
function normLang(lang) {
  if (!lang) return 'ptbr';
  const l = String(lang).toLowerCase();
  return l.startsWith('pt') ? 'ptbr' : 'en';
}

// Interpola {chave} com vars[chave]. Sem var → mantém o placeholder literal.
function interpolate(str, vars) {
  if (!vars) return str;
  return str.replace(/\{(\w+)\}/g, (m, k) => (k in vars ? String(vars[k]) : m));
}

// Cria a função de tradução pra um idioma. Fallback: idioma → PT-BR → key.
function makeT(lang) {
  const L = normLang(lang);
  const dict = STRINGS[L] || STRINGS.ptbr;
  return function t(key, vars) {
    let s = dict[key];
    if (s == null) {
      s = STRINGS.ptbr[key];
      if (s == null) {
        if (typeof console !== 'undefined') console.warn('[i18n] chave ausente:', key);
        return key;
      }
    }
    return interpolate(s, vars);
  };
}

// tt(lang, key, vars) — atalho memoizado por idioma, usado em todo o chrome.
const _tCache = {};
function tt(lang, key, vars) {
  const L = normLang(lang);
  if (!_tCache[L]) _tCache[L] = makeT(L);
  return _tCache[L](key, vars);
}

// Helper bilíngue (pt, en) inline — usado pelo editor de personagem, que tem
// strings curtas locais. Centraliza a checagem de idioma num só lugar.
function bilingual(lang) {
  const pt = normLang(lang) === 'ptbr';
  return (ptStr, enStr) => (pt ? ptStr : enStr);
}

// Pluralização mínima PT/EN (1 vs resto). Uso: 'noun.spell.' + plural(n).
function plural(n) {
  return Math.abs(Number(n)) === 1 ? 'one' : 'other';
}

// Auditoria: chaves presentes em um idioma e ausentes no outro. {} = paridade ok.
function i18nParityCheck() {
  const langs = Object.keys(STRINGS);
  const all = new Set();
  langs.forEach(l => Object.keys(STRINGS[l]).forEach(k => all.add(k)));
  const missing = {};
  langs.forEach(l => {
    const gaps = [...all].filter(k => !(k in STRINGS[l]));
    if (gaps.length) missing[l] = gaps;
  });
  return missing;
}

if (typeof window !== 'undefined') {
  window.STRINGS = STRINGS;
  window.makeT = makeT;
  window.tt = tt;
  window.bilingual = bilingual;
  window.i18nPlural = plural;
  window.normLang = normLang;
  window.i18nParityCheck = i18nParityCheck;
}
