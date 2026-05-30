// Adapter — converte spells-5E-2024-PTBR.json (formato simpleskans.com.br)
// pro formato esperado pelo Grimório (v10-hifi).
//
// Uso:
//   import (ou <script src=>) este arquivo + o JSON, depois:
//     window.v7BuildSpells = () => adaptSpells(window.RAW_SPELLS);
//
//   Em produção, no seu app você chamaria:
//     const spells = adaptSpells(await fetch('/spells.json').then(r => r.json()));

const SCHOOL_INDEX = {
  abjuration:    0, abjur: 0, abjuração: 0,
  conjuration:   1, conj:  1, conjuração: 1, invocação: 1,
  divination:    2, div:   2, divinação: 2,
  enchantment:   3, ench:  3, encantamento: 3,
  evocation:     4, evoc:  4, evocação: 4,
  illusion:      5, ilus:  5, illus: 5, ilusão: 5,
  necromancy:    6, necr:  6, necromancia: 6,
  transmutation: 7, trans: 7, transm: 7, transmutação: 7,
};

// Inglês (vindo do JSON) → label pt-br exibido no app
const CLASS_PT = {
  bard:        'bardo',
  cleric:      'clérigo',
  druid:       'druida',
  sorcerer:    'feiticeiro',
  warlock:     'bruxo',
  wizard:      'mago',
  ranger:      'patrulheiro',
  paladin:     'paladino',
  artificer:   'artífice',
  monk:        'monge',
  barbarian:   'bárbaro',
  fighter:     'guerreiro',
  rogue:       'ladino',
};

// Nome do livro → sigla curta usada no footer do card
const SOURCE_CODE = {
  'Livro do Jogador':                  'PHB',
  "Player's Handbook":                 'PHB',
  'Guia de Tudo de Xanathar':          'XGE',
  "Xanathar's Guide to Everything":    'XGE',
  'Caldeirão de Tudo de Tasha':        'TCE',
  "Tasha's Cauldron of Everything":    'TCE',
  'Tesouros de Fizban dos Dragões':    'FTD',
  "Fizban's Treasury of Dragons":      'FTD',
};

// Tira tags HTML e devolve texto puro (pro card e busca).
// Mantemos o HTML original em `descHtml` pra renderizar no detalhe se quiser.
function stripHtml(s) {
  if (!s) return '';
  return s
    .replace(/<[^>]+>/g, ' ')           // tira tags
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/\s+/g, ' ')
    .trim();
}

// Normaliza "V, S, M" → "V S M". O resto do app espera espaços.
function normalizeComponents(comp) {
  if (!comp) return '';
  return comp.split(',').map(s => s.trim()).filter(Boolean).join(' ');
}

// Converte uma magia do JSON pro formato do Grimório.
function adaptSpell(s) {
  const schoolKey = (s.school || '').toLowerCase();
  const schoolIdx = SCHOOL_INDEX[schoolKey];
  return {
    // Identificação — `en` vira o slug do JSON; `pt` o displayName
    en: s.name || '',
    pt: s.displayName || s.name || '',
    // Eixos primários
    lvl: typeof s.level === 'number' ? s.level : parseInt(s.level, 10) || 0,
    school: typeof schoolIdx === 'number' ? schoolIdx : 4, // fallback evocação
    // Stats exibidas no card e no painel
    time: s.castTime || '—',
    range: s.range || '—',
    dur: s.duration || '—',
    comp: normalizeComponents(s.components),
    compNote: s.componentsNote || '',
    castTimeNote: s.castTimeNote || '',
    // Flags
    conc: !!s.concentration,
    rit: !!s.ritual,
    known: false, // não vem do JSON; gerenciado pelo app
    // Descrição — guarda HTML pro detalhe, texto cru pro card/busca
    desc: { pt: stripHtml(s.description) },
    descHtml: { pt: s.description || '' },
    upgrade: { pt: stripHtml(s.upgradeDescription) },
    upgradeHtml: { pt: s.upgradeDescription || '' },
    // Classes — mantém em pt pra bater com os filtros
    classes: (s.class || []).map(c => CLASS_PT[c.toLowerCase()] || c),
    // Fonte
    src: SOURCE_CODE[s.source] || (s.source || '').slice(0, 4).toUpperCase(),
    sourceFull: s.source || '',
    edition: '5e 2024',
    url: s.url || '',
  };
}

function adaptSpells(json) {
  const list = Array.isArray(json) ? json : (json?.spells || []);
  return list.map(adaptSpell);
}

Object.assign(window, { adaptSpells, adaptSpell, SCHOOL_INDEX, CLASS_PT, SOURCE_CODE });
