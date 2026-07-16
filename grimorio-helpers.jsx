// Grimório — shared helpers required by the V11 product modules.
//
// In the original prototype these lived scattered across wf-data.jsx (spellName),
// v7-ac-prototype.jsx (schoolKey / SCHOOL_KEYS) and v8-spell-detail.jsx
// (v8Description / v8Upgrade). The production bundle never loaded those files,
// so v10-hifi.jsx crashed on `spellName` / `schoolKey` and rendered no spell text.
// This module restores exactly those helpers (nothing else from those files is
// needed at runtime) so the hi-fi product works standalone on GitHub Pages.
//
// Loaded BEFORE the other modules; top-level declarations in a classic/Babel
// script share the global lexical scope, so the bare references resolve.

// ── name: adapted spells carry { pt, en } (see spells-data-loader.jsx) ──
function spellName(s, lang) { return (lang === 'ptbr' ? s.pt : s.en) || s.pt || s.en || ''; }

// Normaliza pra busca: minúsculas e sem diacríticos ("Bênção" → "bencao"),
// pra "druidica" achar "Arte Druídica". Usada pelo grid (v10) e pelo editor (v11).
function hifiNorm(str) {
  return String(str || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
}

// ── school: spells store a numeric school index; map to its short key ──
const SCHOOL_KEYS = ['abjur', 'conj', 'div', 'ench', 'evoc', 'ilus', 'necr', 'trans'];
function schoolKey(idx) { return SCHOOL_KEYS[idx] || 'evoc'; }

// Nome COMPLETO da escola (pro menu descritivo) — localizado. Os índices seguem
// a mesma ordem de SCHOOL_KEYS. schoolKey dá a abreviação ("necr") pros chips
// compactos; schoolName dá a forma por extenso ("Necromancia" / "Necromancy").
const SCHOOL_NAMES_PT = ['Abjuração', 'Conjuração', 'Adivinhação', 'Encantamento', 'Evocação', 'Ilusão', 'Necromancia', 'Transmutação'];
const SCHOOL_NAMES_EN = ['Abjuration', 'Conjuration', 'Divination', 'Enchantment', 'Evocation', 'Illusion', 'Necromancy', 'Transmutation'];
function schoolName(idx, lang) {
  const arr = lang === 'ptbr' ? SCHOOL_NAMES_PT : SCHOOL_NAMES_EN;
  return arr[idx] || arr[4];
}

function levelKey(lvl) { return lvl === 0 ? 'truque' : String(lvl); }

// ── description / upgrade ──
// Real data wins: adapted spells expose desc:{pt,en} and upgrade:{pt,en} from
// the JSON. The school-keyed placeholders below are only a last-resort fallback
// for the rare spell with no description in the source.
const V8_DESCRIPTIONS_PT = [
  'Você ergue uma barreira invisível ao seu redor. Pelo tempo da duração, ataques contra você sofrem desvantagem e você ganha resistência a um tipo de dano à sua escolha.',
  'Você canaliza energia restauradora a uma criatura ao alcance. Ela recupera pontos de vida iguais ao dado da magia + seu modificador de habilidade de conjuração.',
  'Você projeta sua percepção além dos sentidos comuns. Por um instante você vê auras, aliados invisíveis, e marcas de magia recentes em até 9 metros.',
  'Você sussurra palavras que ressoam na mente do alvo. Se ele falhar num teste de Sabedoria, fica enfeitiçado por você até o fim da duração.',
  'Você libera uma onda de energia destrutiva a partir de um ponto. Criaturas na área devem fazer um teste de Destreza ou sofrer 6d6 de dano.',
  'Você cobre uma área com uma ilusão sensorial. Aqueles que a observem precisam fazer um teste de Inteligência (Investigação) para perceber o engano.',
  'Você drena a vitalidade de um inimigo próximo. Ele sofre dano necrótico e você recupera pontos de vida iguais à metade do dano causado.',
  'Você altera momentaneamente as leis físicas em volta de você. Ganha velocidade adicional e pode passar por espaços apertados.',
];

function v8Description(s, lang) {
  if (s && s.desc) {
    if (typeof s.desc === 'string') return s.desc;
    return s.desc[lang] || s.desc.pt || s.desc.en || '';
  }
  return V8_DESCRIPTIONS_PT[s.school] || V8_DESCRIPTIONS_PT[0];
}

function v8Upgrade(s, lang) {
  if (s && s.upgrade) {
    if (typeof s.upgrade === 'string') return s.upgrade;
    return s.upgrade[lang] || s.upgrade.pt || s.upgrade.en || '';
  }
  if (s.lvl === 0) return lang === 'ptbr'
    ? 'O dado da magia aumenta para 2d6 no nível 5, 3d6 no nível 11, e 4d6 no nível 17.'
    : "The spell's damage increases by 1d6 at levels 5, 11, and 17.";
  return lang === 'ptbr'
    ? `Quando conjurada usando um espaço de magia de nível ${s.lvl + 1} ou superior, o efeito aumenta em proporção ao nível do espaço.`
    : `When cast using a spell slot of level ${s.lvl + 1} or higher, the effect scales with the slot level.`;
}

// ── HTML variants ──
// As magias do JSON trazem a descrição com marcação (<p>, <ul>, <em>…). As
// funções acima devolvem texto já "achatado" (stripHtml) — bom pro teaser dos
// cards, mas perde as quebras de parágrafo. Estas devolvem o HTML cru pra o
// painel de detalhe renderizar com a formatação original. Retornam '' quando
// não há HTML (a fonte só tinha texto), e aí o chamador cai no texto puro.
function v8DescriptionHtml(s, lang) {
  if (s && s.descHtml) {
    if (typeof s.descHtml === 'string') return s.descHtml;
    return s.descHtml[lang] || s.descHtml.pt || s.descHtml.en || '';
  }
  return '';
}

function v8UpgradeHtml(s, lang) {
  if (s && s.upgradeHtml) {
    if (typeof s.upgradeHtml === 'string') return s.upgradeHtml;
    return s.upgradeHtml[lang] || s.upgradeHtml.pt || s.upgradeHtml.en || '';
  }
  return '';
}

// Expose on window too — v10-hifi.jsx guards some calls with `window.v8Description ? …`.
Object.assign(window, { spellName, schoolKey, schoolName, levelKey, hifiNorm, SCHOOL_KEYS, SCHOOL_NAMES_PT, SCHOOL_NAMES_EN, v8Description, v8Upgrade, v8DescriptionHtml, v8UpgradeHtml, V8_DESCRIPTIONS_PT });
