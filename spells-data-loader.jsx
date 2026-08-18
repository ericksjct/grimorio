// Spells Data Loader — carrega os 4 JSONs de magias e adapta pro formato do app.
// Substitui os mocks (WF_SPELLS) por dados reais do simpleskans / wikidot.
//
// Uso: incluir este arquivo no HTML antes dos componentes que usam v7BuildSpells().
// Ele redefine window.v7BuildSpells pra retornar os dados da versão ativa.

// ──────────────────────────────────────────────────────────────────
// CONFIGURAÇÃO DAS VERSÕES
// ──────────────────────────────────────────────────────────────────
// Contrato de entrada de versão. Campos obrigatórios em toda entrada: `key`,
// `source` ('fetch' | 'idb'), `lang`, `edition`, `labelPt`, `labelEn`, `short`.
// Mais `file` quando `source === 'fetch'`, ou `packId` quando `source === 'idb'`.
// O campo `label` existe só nas 4 entradas legadas abaixo e não é consumido em
// lugar nenhum do app — não o replique em entradas novas.
//
// Colisão de nomes — três coisas diferentes chamadas `source` neste arquivo:
//   - `source` na ENTRADA DE VERSÃO (aqui, `BUILTIN_VERSIONS`/`SPELL_VERSIONS`): 'fetch' | 'idb'.
//   - `meta.source` de um PACK (ver plugin-store.jsx): identificador único do pack (D-09).
//   - `source` numa MAGIA (campo do JSON de spells): nome do livro-fonte (ex.: "SRD 5.2").
//
// BUILTIN_VERSIONS = entradas que vêm do repositório, nesta ordem EXATA — a
// ordem é semântica: índice 0 é o último elo da cadeia de fallback
// (_defaultVersion) e a primeira entrada com lang 'en' é o default de primeira
// visita para navegador em inglês. Os rótulos SRD nomeiam a edição do SRD
// (5.1/5.2), não a edição do PHB — isso evita que o usuário leia 319/339
// magias do SRD como se fosse o PHB completo de 474 (P-03).
const BUILTIN_VERSIONS = [
  { key: 'srd-2024-en', source: 'fetch', file: 'srd-2024-en.json', lang: 'en', edition: '5e 2024', labelPt: 'SRD 5.2 (EN)', labelEn: 'SRD 5.2 (EN)', short: 'SRD 5.2' },
  { key: 'srd-2014-en', source: 'fetch', file: 'srd-2014-en.json', lang: 'en', edition: '5e 2014', labelPt: 'SRD 5.1 (EN)', labelEn: 'SRD 5.1 (EN)', short: 'SRD 5.1' },
  { key: 'spells-5E-2024-PTBR', source: 'fetch', file: 'spells-5E-2024-PTBR.json', lang: 'ptbr', edition: '5e 2024', label: 'D&D 5.5E 2024', labelPt: 'D&D 5.5E 2024', labelEn: "D&D 5.5E 2024", short: '5.5E 2024' },
  { key: 'spells-5E-2014-PTBR', source: 'fetch', file: 'spells-5E-2014-PTBR.json', lang: 'ptbr', edition: '5e 2014', label: 'D&D 5E 2014',   labelPt: 'D&D 5E 2014',   labelEn: "D&D 5E 2014",   short: '5E 2014' },
  { key: 'spells-5E-2024-EN',   source: 'fetch', file: 'spells-5E-2024-EN.json',   lang: 'en',   edition: '5e 2024', label: "PHB 2024",      labelPt: 'PHB 2024',      labelEn: "PHB 2024",      short: '2024 EN' },
  { key: 'spells-5E-2014-EN',   source: 'fetch', file: 'spells-5E-2014-EN.json',   lang: 'en',   edition: '5e 2014', label: "PHB 2014",      labelPt: 'PHB 2014',      labelEn: "PHB 2014",      short: '2014 EN' },
];

// SPELL_VERSIONS é o registro VIVO — extensível em runtime (packs de
// IndexedDB, plano 04-02). REGRA DURA: só pode ser mutado IN PLACE
// (push/splice); NUNCA reatribuído. window.SPELL_VERSIONS, os três leitores em
// index.html (defaultVersionKeyForLang, langOfVersionKey, a derivação de
// versão inicial) e v10-hifi.jsx seguram a MESMA referência de array —
// reatribuir deixa todos eles apontando para a lista antiga.
const SPELL_VERSIONS = BUILTIN_VERSIONS.slice();

function _versionByKey(key) {
  return SPELL_VERSIONS.find(v => v.key === key) || null;
}

function _defaultVersion() {
  return SPELL_VERSIONS[0];
}

// ──────────────────────────────────────────────────────────────────
// ENUMERAÇÃO DE PACKS DO INDEXEDDB (plano 04-02)
// ──────────────────────────────────────────────────────────────────
// Converte um `meta` de pack (ver plugin-store.jsx) numa entrada de versão do
// registro. Os recortes de tamanho são mitigação de T-04-02: meta.name/
// meta.edition vêm de arquivo de terceiro e viram texto de UI sem passo de
// import intermediário — React escapa o texto, então o recorte é a única
// mitigação necessária em L1.
function _packToVersion(meta) {
  const source = String(meta.source);
  const name = String(meta.name || meta.source);
  return {
    key: 'plugin-' + source,
    source: 'idb',
    packId: source,
    lang: meta.lang === 'ptbr' ? 'ptbr' : 'en',
    edition: String(meta.edition || '').slice(0, 24),
    labelPt: name.slice(0, 48),
    labelEn: name.slice(0, 48),
    short: name.slice(0, 14),
  };
}

// Único ponto do app que sincroniza o registro de versões com o IndexedDB.
// Estritamente de leitura (proibição P-02 em must_haves.prohibitions): nunca
// chama nenhuma operação de escrita do pluginStore. Best-effort — uma falha de
// enumeração (aba bloqueada, aba privada, quota, promise rejeitada) nunca pode
// derrubar o boot; degrada para lista vazia com console.warn e sem toast (um
// usuário sem nenhum pack instalado não deve ver mensagem de erro por isso).
// WR-02: refreshPluginVersions() é chamada fire-and-forget de dois lugares
// (boot e todo import bem-sucedido) sem nada serializando as chamadas — quem
// resolver por último escreve o registro. O dedup no `_pending` do loadVersion
// já usa este idioma; aqui é o mesmo, guardando a promise em voo em vez do
// próprio trabalho.
let _refreshInFlight = null;
function refreshPluginVersions() {
  if (_refreshInFlight) return _refreshInFlight;
  _refreshInFlight = _refreshPluginVersionsInner().finally(() => { _refreshInFlight = null; });
  return _refreshInFlight;
}

async function _refreshPluginVersionsInner() {
  if (!window.pluginStore || typeof window.pluginStore.listPacks !== 'function') {
    return [];
  }

  let metas;
  try {
    metas = await window.pluginStore.listPacks();
  } catch (e) {
    console.warn('[spells-data-loader] Falha ao enumerar packs do IndexedDB:', e);
    return [];
  }

  // Registros corrompidos (sem source string não-vazia) são descartados em vez
  // de virarem entrada quebrada no seletor.
  const entries = (metas || [])
    .filter(m => m && typeof m.source === 'string' && m.source !== '')
    .map(_packToVersion);
  const newKeys = new Set(entries.map(e => e.key));

  // Mutação IN PLACE do registro vivo (regra dura, ver comentário de
  // SPELL_VERSIONS acima): remove de trás pra frente todas as entradas idb
  // antigas, depois acrescenta as novas com push. As entradas builtin nunca
  // são tocadas. Nunca reatribuir o array.
  const oldIdbKeys = [];
  for (let i = SPELL_VERSIONS.length - 1; i >= 0; i--) {
    if (SPELL_VERSIONS[i].source === 'idb') {
      oldIdbKeys.push(SPELL_VERSIONS[i].key);
      SPELL_VERSIONS.splice(i, 1);
    }
  }
  entries.forEach(e => SPELL_VERSIONS.push(e));

  // Invalida o cache das chaves plugin-* que não estão mais na lista nova —
  // senão as magias de um pack removido continuariam servidas de memória.
  oldIdbKeys.forEach(key => {
    if (!newKeys.has(key)) {
      delete _cache[key];
      delete _rawCache[key];
    }
  });

  // Evento novo da fase, espelhando a convenção já usada por
  // hifi-spells-source-changed e hifi-chars-changed.
  window.dispatchEvent(new CustomEvent('hifi-plugins-changed', { detail: entries.length }));

  // Preferência pendente: se a chave desejada crua agora resolve e é diferente
  // da versão corrente, honra sem esperar recarga. Se não resolver, nada de
  // troca silenciosa (proibição P-01) — o seletor tem de continuar mostrando
  // a versão realmente em uso.
  // Consome de uma vez: assim que a chave desejada RESOLVE, a preferencia
  // pendente cumpriu seu papel -- seja porque ja e a versao corrente (boot
  // normal), seja porque acabamos de aplica-la. Mante-la viva depois disso era
  // o CR-02. Se ela nunca resolver, continua pendente, que e o comportamento
  // desejado para um pack ainda nao enumerado.
  if (_wantedVersionKey && _versionByKey(_wantedVersionKey)) {
    const wanted = _wantedVersionKey;
    _wantedVersionKey = null;
    if (wanted !== _currentVersion) setCurrentVersion(wanted);
  }

  // CR-01 (raiz): o splice acima pode ter removido a entrada idb que estava
  // selecionada. Um _currentVersion que nao resolve mais faz loadVersion()
  // cair no redirect de chave desconhecida, que cacheia sob a chave DEFAULT --
  // _cache[_currentVersion] nunca preenche e todo render tenta de novo.
  if (!_versionByKey(_currentVersion)) {
    console.warn('[spells-data-loader] Versao ativa sumiu do registro:', _currentVersion, '- voltando para a padrao.');
    setCurrentVersion(_defaultVersion().key);
    // WR-02: setCurrentVersion aqui dispara hifi-spells-source-changed, que
    // troca o dataset E o idioma inteiro da UI sob o usuário sem aviso — a
    // troca silenciosa que P-01 proíbe. O console.warn não é visível pra
    // quem não abriu o devtools; um toast avisa de verdade.
    try {
      const fallback = _defaultVersion();
      const fallbackLabel = (fallback.lang === 'ptbr' ? fallback.labelPt : fallback.labelEn) || fallback.short || fallback.key;
      window.dispatchEvent(new CustomEvent('hifi-toast', {
        detail: {
          msg: window.tt
            ? window.tt(fallback.lang, 'toast.versionSwitchedAway', { version: fallbackLabel })
            : 'o pacote que você estava vendo foi removido — voltamos para ' + fallbackLabel,
          kind: 'err',
        },
      }));
    } catch (e2) {}
  }

  return entries;
}

// ──────────────────────────────────────────────────────────────────
// MAPEAMENTOS
// ──────────────────────────────────────────────────────────────────
// Sem prototipo (CR-03): adaptSpell() indexa esta tabela com strings vindas
// direto do JSON de um pack de terceiro. Num literal comum, a chave
// 'constructor' devolveria a funcao herdada -- truthy, entao o fallback
// `|| c` nao salvaria, e ela chegaria ate .charAt() na tela de detalhe.
const SCHOOL_INDEX = Object.assign(Object.create(null), {
  abjuration: 0, abjur: 0, abjuração: 0,
  conjuration: 1, conj: 1, conjuração: 1, invocação: 1,
  divination: 2, div: 2, divinação: 2,
  enchantment: 3, ench: 3, encantamento: 3,
  evocation: 4, evoc: 4, evocação: 4,
  illusion: 5, ilus: 5, illus: 5, ilusão: 5,
  necromancy: 6, necr: 6, necromancia: 6,
  transmutation: 7, trans: 7, transm: 7, transmutação: 7,
});

// Inglês → pt-br (para filtros e display)
// Sem prototipo (CR-03): adaptSpell() indexa esta tabela com strings vindas
// direto do JSON de um pack de terceiro. Num literal comum, a chave
// 'constructor' devolveria a funcao herdada -- truthy, entao o fallback
// `|| c` nao salvaria, e ela chegaria ate .charAt() na tela de detalhe.
const CLASS_PT = Object.assign(Object.create(null), {
  bard: 'bardo', cleric: 'clérigo', druid: 'druida', sorcerer: 'feiticeiro',
  warlock: 'bruxo', wizard: 'mago', ranger: 'patrulheiro', paladin: 'paladino',
  artificer: 'artífice', monk: 'monge', barbarian: 'bárbaro', fighter: 'guerreiro', rogue: 'ladino',
});

// pt-br → inglês (para filtros em EN)
// Sem prototipo (CR-03): adaptSpell() indexa esta tabela com strings vindas
// direto do JSON de um pack de terceiro. Num literal comum, a chave
// 'constructor' devolveria a funcao herdada -- truthy, entao o fallback
// `|| c` nao salvaria, e ela chegaria ate .charAt() na tela de detalhe.
const CLASS_EN = Object.assign(Object.create(null), {
  bardo: 'bard', 'clérigo': 'cleric', druida: 'druid', feiticeiro: 'sorcerer',
  bruxo: 'warlock', mago: 'wizard', patrulheiro: 'ranger', paladino: 'paladin',
  artífice: 'artificer', monge: 'monk', bárbaro: 'barbarian', guerreiro: 'fighter', ladino: 'rogue',
});

// Sem prototipo (CR-03): adaptSpell() indexa esta tabela com strings vindas
// direto do JSON de um pack de terceiro. Num literal comum, a chave
// 'constructor' devolveria a funcao herdada -- truthy, entao o fallback
// `|| c` nao salvaria, e ela chegaria ate .charAt() na tela de detalhe.
const SOURCE_CODE = Object.assign(Object.create(null), {
  'Livro do Jogador': 'PHB', "Player's Handbook": 'PHB',
  // Strings reais dos JSONs PT-BR (a forma oficial Galápagos), além das antigas.
  'Guia de Xanathar para Todas as Coisas': 'XGE', 'Guia de Tudo de Xanathar': 'XGE', "Xanathar's Guide to Everything": 'XGE',
  'O Caldeirão de Todas as Coisas de Tasha': 'TCE', 'Caldeirão de Tudo de Tasha': 'TCE', "Tasha's Cauldron of Everything": 'TCE',
  'Tesouros de Fizban dos Dragões': 'FTD', "Fizban's Treasury of Dragons": 'FTD',
});

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

// A fonte embute o próprio cabeçalho no texto do upgrade
// (`<p><strong><em>Em Níveis Superiores.</em></strong> …`) e a UI já renderiza
// um rótulo de seção "em níveis superiores" — sem tirar, o título aparece duas
// vezes. Remove só o cabeçalho de abertura, preservando o `<p>` e o resto do
// HTML. Casa pela ESTRUTURA (ênfase curta terminada em `.`/`:` na abertura), não
// pelo texto — serve pros dois idiomas e pros packs BYOD. Se sobrar só o
// cabeçalho (3 magias de 2014 PT-BR), devolve '' e a seção inteira desaparece
// em vez de mostrar um título solto.
const UPGRADE_HEADING = /^(\s*<p[^>]*>)?\s*<strong>\s*<em>\s*[^<]{1,40}[.:]\s*<\/em>\s*<\/strong>\s*/i;
function stripUpgradeHeading(html) {
  if (!html) return '';
  const out = String(html).replace(UPGRADE_HEADING, (m, openP) => (openP ? openP.trimStart() : ''));
  return stripHtml(out) ? out : '';
}

function normalizeComponents(comp) {
  if (!comp) return '';
  return comp.split(',').map(s => s.trim()).filter(Boolean).join(' ');
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
    // WR-05: nao inventamos escola quando o pack usa um nome que a app nao
    // reconhece — cair pra 4 (Evocacao) apresentava um chute como fato.
    school: typeof schoolIdx === 'number' ? schoolIdx : null,
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
      pt: stripHtml(stripUpgradeHeading(s.upgradeDescription)),
      en: stripHtml(stripUpgradeHeading(s.upgradeDescription)),
    },
    upgradeHtml: {
      pt: stripUpgradeHeading(s.upgradeDescription),
      en: stripUpgradeHeading(s.upgradeDescription),
    },
    classes: versionLang === 'ptbr' ? classesPt : classesEn,
    classesPt,
    classesEn,
    src: SOURCE_CODE[s.source] || (s.source || '').slice(0, 4).toUpperCase().trim(),
    sourceFull: s.source || '',
    // WR-05: propaga ausencia em vez de inventar uma edicao — um pack sem
    // `edition` declarada nao e "5e 2014" por padrao, e useEditionCompare ja
    // sabe se esconder quando `!cur.edition`.
    edition: edition || '',
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
// Chave desejada crua (?v= ou preferência salva), registrada mesmo quando não
// resolve ainda — é o que refreshPluginVersions() usa pra honrar, via retry,
// uma preferência que aponta pra um pack de IndexedDB ainda não enumerado.
let _wantedVersionKey = null;

function _initialVersionKey() {
  try {
    // ?v= de link compartilhado vence a preferência salva (o App faz o mesmo).
    const urlV = new URL(window.location.href).searchParams.get('v');
    const prefs = JSON.parse(localStorage.getItem('spellbook-ui-prefs') || '{}');
    _wantedVersionKey = urlV || prefs.versionKey || null;
    if (urlV && _versionByKey(urlV)) return urlV;
    if (prefs.versionKey && _versionByKey(prefs.versionKey)) {
      return prefs.versionKey;
    }
    const nav = (navigator.languages && navigator.languages[0]) || navigator.language || '';
    const lang = String(nav).toLowerCase().startsWith('pt') ? 'ptbr' : 'en';
    const v = SPELL_VERSIONS.find(x => x.lang === lang);
    if (v) return v.key;
  } catch (e) {}
  return _defaultVersion().key;
}
let _currentVersion = _initialVersionKey();
let _loadingPromise = null;

function getCurrentVersion() {
  return _versionByKey(_currentVersion) || _defaultVersion();
}

function setCurrentVersion(key) {
  if (_currentVersion === key) return;
  // CR-02: qualquer troca EFETIVA cancela a preferencia pendente. Sem isto,
  // _wantedVersionKey sobrevive a sessao inteira e refreshPluginVersions()
  // volta a aplica-lo a cada importacao de pack, arrastando o usuario de volta
  // para a versao do boot -- a troca silenciosa que P-01 proibe.
  _wantedVersionKey = null;
  _currentVersion = key;
  // Notifica todos os listeners que a fonte mudou
  window.dispatchEvent(new CustomEvent('hifi-spells-source-changed', { detail: key }));
}

// ──────────────────────────────────────────────────────────────────
// FETCH
// ──────────────────────────────────────────────────────────────────
const _pending = {}; // key → Promise em voo (dedup de fetches concorrentes)

// Tenta os mesmos três caminhos relativos de sempre (nome cru, './' e '../' —
// funciona no GitHub Pages / local / file://) e devolve o primeiro JSON
// parseado com sucesso. Ponto ÚNICO de tratamento de erro de fetch — lança
// quando nenhum caminho responde OK, em vez de engolir o erro dentro do loop.
async function _fetchVersionJson(ver) {
  const paths = [ver.file, './' + ver.file, '../' + ver.file];
  let lastErr;
  for (const path of paths) {
    try {
      const res = await fetch(path);
      if (!res.ok) continue;
      return await res.json();
    } catch (e) {
      lastErr = e;
    }
  }
  throw lastErr || new Error('Falha ao carregar ' + ver.file);
}

async function loadVersion(key) {
  if (_cache[key]) return _cache[key];
  if (_pending[key]) return _pending[key];

  const ver = _versionByKey(key);
  if (!ver) {
    // Chave desconhecida (ex.: preferência salva apontando pra um pack que
    // sumiu do IndexedDB) nunca pode terminar em exceção/tela em branco —
    // redireciona pra entrada padrão builtin, que sempre resolve.
    console.warn('[spells-data-loader] Versão desconhecida:', key, '— usando versão padrão.');
    return loadVersion(_defaultVersion().key);
  }

  _pending[key] = (async () => {
    try {
      // Dispatch por origem: dali em diante o caminho é UM SÓ, seja o JSON
      // vindo de arquivo estático ou de IndexedDB — mesma normalização abaixo,
      // mesmo _cache. Nenhum pós-processamento condicional por origem.
      const json = ver.source === 'idb'
        ? await window.pluginStore.getSpells(ver.packId)
        : await _fetchVersionJson(ver);
      const adapted = adaptSpells(json, ver.lang, ver.edition);
      // WR-03: refreshPluginVersions() pode ter removido `key` do registro
      // enquanto este load estava em voo (pack apagado no meio do fetch). Sem
      // este guard, a escrita abaixo resuscitaria no _cache uma entrada que a
      // invalidação de refreshPluginVersions() acabou de limpar.
      if (_versionByKey(key)) {
        _rawCache[key] = json;
        _cache[key] = adapted;
      }
      return adapted;
    } catch (e) {
      console.warn('[spells-data-loader] Falha ao carregar', key, e);
      // NÃO cacheia a falha: a próxima chamada (trocar de versão, reabrir)
      // tenta de novo. Avisa o usuário em vez de mostrar "0 magias" em silêncio.
      try {
        window.dispatchEvent(new CustomEvent('hifi-toast', {
          detail: { msg: window.tt ? window.tt(ver.lang, 'toast.loadFailed') : 'falha ao carregar as magias', kind: 'err' },
        }));
      } catch (e2) {}
      return [];
    }
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
    // CR-01: so avisa se o cache REALMENTE preencheu para esta chave. O
    // listener de useSpellVersions responde chamando esta funcao de novo; com
    // o cache ainda vazio (falha de carga, que nao e cacheada de proposito, ou
    // chave desconhecida, cujo redirect cacheia sob a chave default) o par
    // dispatch/listener vira um ciclo que nao termina e trava a aba.
    if (_cache[key]) {
      window.dispatchEvent(new CustomEvent('hifi-spells-source-changed', { detail: key }));
    }
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

  // SPELL_VERSIONS é mutado in place (push/splice) por refreshPluginVersions()
  // — mutar não provoca re-render por si só, então mantemos uma cópia rasa em
  // estado React e a renovamos quando o evento de sincronização dispara.
  const [versions, setVersions] = React.useState(() => SPELL_VERSIONS.slice());
  React.useEffect(() => {
    const onPluginsChanged = () => setVersions(SPELL_VERSIONS.slice());
    window.addEventListener('hifi-plugins-changed', onPluginsChanged);
    return () => window.removeEventListener('hifi-plugins-changed', onPluginsChanged);
  }, []);

  const switchVersion = React.useCallback((key) => {
    setCurrentVersion(key);
    // Atualiza imediatamente se já está em cache
    setSpells(buildSpellsFromRealData());
  }, []);

  return {
    versions,
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
window.refreshPluginVersions = refreshPluginVersions;
// WR-01: index.html usa isto pra não sobrescrever prefs.versionKey com o
// builtin de boot enquanto uma preferência plugin-* ainda não resolveu.
window.hasPendingSpellVersion = () => !!_wantedVersionKey;

// Pre-carrega a versão default assim que o DOM estiver pronto. A enumeração de
// packs do IndexedDB roda em paralelo, fire-and-forget: sem await e sem
// encadear o pré-carregamento nela, porque o primeiro paint não pode depender
// de IndexedDB. O .catch() evita rejeição não tratada (a própria função já
// degrada para lista vazia internamente; isto é só uma rede de segurança).
if (typeof document !== 'undefined') {
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
      loadVersion(_currentVersion);
      refreshPluginVersions().catch(e => console.warn('[spells-data-loader] refreshPluginVersions falhou no boot:', e));
    });
  } else {
    loadVersion(_currentVersion);
    refreshPluginVersions().catch(e => console.warn('[spells-data-loader] refreshPluginVersions falhou no boot:', e));
  }
}
