// Spells Data Loader — carrega os 4 JSONs de magias e adapta pro formato do app.
// Substitui os mocks (WF_SPELLS) por dados reais do simpleskans / wikidot.
//
// Uso: incluir este arquivo no HTML antes dos componentes que usam v7BuildSpells().
// Ele redefine window.v7BuildSpells pra retornar os dados da seleção de pacotes.

// ──────────────────────────────────────────────────────────────────
// CONFIGURAÇÃO DAS VERSÕES
// ──────────────────────────────────────────────────────────────────
// Contrato de entrada de versão. Campos obrigatórios em toda entrada: `key`,
// `source` ('fetch' | 'idb'), `lang`, `edition`, `labelPt`, `labelEn`, `short`.
// Mais `file` quando `source === 'fetch'`, ou `packId` quando `source === 'idb'`.
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
// `corpus` (WR-07): agrupa entradas que são "a mesma obra, outra edição" —
// usado só pelo comparador de edição (useEditionCompare) pra preferir SRD↔SRD
// e PHB↔PHB antes de aceitar qualquer edição diferente. Packs de terceiro
// (_packToVersion) recebem 'pack' e nunca competem por esse par preferencial.
// A entrada `lang: 'ptbr'` (Fase 7, D-06) é o default de primeira visita para
// navegador em português via `_browserDefaultKey()`/`_initialSelection()`, sem
// código novo — ela fica depois das duas EN pra não mexer no índice 0.
// Os embutidos NÃO são listados aqui: vêm de packs/index.js (globalThis.BUILTIN_PACKS,
// carregado antes deste script), gerado a partir dos JSONs da pasta packs/ por
// scripts/build-packs-index.mjs. O menu só mostra o que está em packs/ + o que o
// usuário instala.
const BUILTIN_VERSIONS = (globalThis.BUILTIN_PACKS || []).slice();

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

// Idioma da INTERFACE, para os toasts deste módulo. Os toasts são chrome: quem
// manda neles é a preferência de interface, nunca o idioma do pacote envolvido
// (que é justamente o pacote que sumiu ou falhou ao carregar). Lê o mesmo blob
// que index.html grava, com o mesmo parse defensivo do resto do arquivo —
// declarar `const UI_PREFS_KEY` aqui colidiria com o bloco inline do index.html
// no escopo global compartilhado entre scripts clássicos.
function _uiLang() {
  try {
    const prefs = JSON.parse(localStorage.getItem('spellbook-ui-prefs') || '{}') || {};
    const raw = String(prefs.lang || '').toLowerCase().replace(/[_-]/g, '');
    if (raw.startsWith('pt')) return 'ptbr';
    if (raw.startsWith('en')) return 'en';
  } catch (e) {}
  return 'ptbr';
}

function _defaultVersion() {
  return SPELL_VERSIONS[0];
}

// D-04: uma preferência salva (`spellbook-ui-prefs.versionKey`) apontando pra
// uma das 4 chaves legadas (removidas em 06-05) cai no SRD da MESMA EDIÇÃO,
// não no default cego — um usuário de 2014 caindo em 5.2 leria a mudança de
// estatísticas como bug, não como migração. Tabela fechada: uma chave
// desconhecida qualquer não casa e segue pra cadeia de default já existente
// (T-06-01-03, accept).
// Sem prototipo (mesmo motivo de SCHOOL_INDEX/CLASS_PT abaixo): indexada por
// uma string vinda de localStorage.
// Fase 7, D-08: a chave 2024 PT-BR vai pro SRD 5.2 em português (mesma
// edição, agora também no mesmo idioma). A chave 2014 PT-BR segue o D-04 e cai
// no SRD 5.1 EN: não existe 5.1 em português, e mandá-la pro 5.2 PT-BR trocava
// a edição em silêncio — a chave preparada é `${school}-${lvl}-${en}`, então as
// magias que mudaram de escola/círculo no 2024 (cure-wounds, healing-word...)
// sumiam da ficha, e o comparador de edição nem aparece (não há 2014 PT-BR pra
// comparar). Revisão da fase 07, WR-01: supera o D-08 para a chave 2014.
const LEGACY_VERSION_FALLBACK = Object.assign(Object.create(null), {
  'spells-5E-2024-PTBR': 'srd-2024-ptbr',
  'spells-5E-2024-EN': 'srd-2024-en',
  'spells-5E-2014-PTBR': 'srd-2014-en',
  'spells-5E-2014-EN': 'srd-2014-en',
});

// Sinal de leitura pro banner de transição (06-04): { from, to } quando o
// fallback acima disparou neste boot, `null` caso contrário. Inicializado
// aqui, antes de `_initialVersionKey()` rodar (mais abaixo), pro global
// existir sempre — inclusive quando nenhum fallback dispara.
window.__legacyVersionFallback = null;

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
    role: meta.role === 'base' ? 'base' : 'additional',
    base: typeof meta.base === 'string' ? meta.base : undefined,
    corpus: 'pack', // WR-07: nunca compete pelo par preferencial do comparador de edição
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
// WR-02/WR-01: refreshPluginVersions() é chamada fire-and-forget de dois
// lugares (boot e todo import bem-sucedido) sem nada serializando as
// chamadas. Um dedup por promise-em-voo (devolver a MESMA promise pra quem
// chama enquanto uma já roda) é certo pra uma leitura pura keyada por uma
// chave imutável — é ERRADO aqui: a enumeração já em voo fez seu
// listPacks() ANTES da escrita que a chamada mais nova precisa observar.
// Concreto: importar pack A dispara refreshPluginVersions() sem await;
// enquanto essa enumeração está em voo, a escrita de instalação do pack B comita;
// refreshPluginVersions() de B devolve a promise de A — B nunca é
// enumerado, nunca aparece no seletor, e nenhum erro aparece. Só se
// autocura num reload.
// ponytail: fila de um, não dedup. Cada chamada encadeia depois da
// anterior, então observa o estado (IndexedDB) depois que a anterior
// terminou — nenhuma chamada é descartada.
let _refreshChain = Promise.resolve([]);
function refreshPluginVersions() {
  _refreshChain = _refreshChain.catch(() => {}).then(_refreshPluginVersionsInner);
  return _refreshChain;
}

async function _refreshPluginVersionsInner() {
  if (!window.pluginStore || typeof window.pluginStore.listPacks !== 'function') {
    // Sem isto, a preferência pendente antiga (uma chave plugin-* ou um `?v=`
    // compartilhado que nunca existiu neste dispositivo) ficaria armada pra
    // sempre por falta de sinal de que a enumeração pelo menos tentou rodar.
    console.warn('[spells-data-loader] window.pluginStore ausente — packs não enumerados.');
    _enumerated = true;
    return [];
  }

  let metas;
  try {
    metas = await window.pluginStore.listPacks();
  } catch (e) {
    console.warn('[spells-data-loader] Falha ao enumerar packs do IndexedDB:', e);
    // Mesmo raciocínio do early return acima — uma enumeração que falha
    // (onblocked, quota, storage bloqueado) também conta como tentativa.
    _enumerated = true;
    return [];
  }

  // Registros corrompidos (sem source string não-vazia) são descartados em vez
  // de virarem entrada quebrada no menu.
  const entries = (metas || [])
    .filter(m => m && typeof m.source === 'string' && m.source !== '')
    .map(_packToVersion);
  const newKeys = new Set(entries.map(e => e.key));

  // Assinaturas ANTES da mutação do registro — comparadas depois pra saber se
  // a composição resolvida mudou ou se a seleção acabou de virar fallback,
  // generalizando o antigo reparo de "chave pendurada" (que só existia pra
  // uma versão ativa única) pra qualquer tamanho de seleção.
  const before = resolveSelection(_selectedKeys).join('|');
  const wasFallback = _isFallback(_selectedKeys);

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
    }
  });

  // Evento novo da fase, espelhando a convenção já usada por
  // hifi-spells-source-changed e hifi-chars-changed.
  window.dispatchEvent(new CustomEvent('hifi-plugins-changed', { detail: entries.length }));
  _enumerated = true;

  // Pendência por item (D-24): uma chave crua que ainda não resolvia (pack
  // não enumerado) pode passar a resolver agora, e uma que resolvia pode ter
  // sumido do registro (pack removido em outra aba). A composição inteira é
  // recalculada; um sinal avisa a UI só se o conjunto resolvido realmente
  // mudou — nunca uma troca silenciosa sem mudança real (proibição P-01).
  const after = resolveSelection(_selectedKeys).join('|');
  if (after !== before) {
    _unionMemo = null;
    window.dispatchEvent(new CustomEvent('hifi-spells-source-changed', { detail: _selectedKeys.slice() }));
  }
  // D-04: a mesma seleção crua pode ter passado de "algo resolvível" pra
  // "nada resolvível" só por causa da enumeração (ex.: o único pack marcado
  // acabou de ser removido em outra aba) — o toast segue sempre o idioma da
  // interface, nunca o do pacote que sumiu.
  if (!wasFallback && _isFallback(_selectedKeys)) {
    try {
      window.dispatchEvent(new CustomEvent('hifi-toast', {
        detail: {
          msg: window.tt ? window.tt(_uiLang(), 'menu.toastFallbackToDefault') : 'nenhum pacote selecionado — mostrando o padrão',
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
// O rótulo pt-BR "Usando um Espaço de Magia de Círculo Superior." tem 45
// caracteres — passa dos 40 do limite EN/pt-curto. A âncora `^` + a exigência
// de `<strong><em>...</em></strong>` continuam sendo o que impede de comer
// texto legítimo; só o teto do rótulo cresce (Fase 7, D-05).
const UPGRADE_HEADING = /^(\s*<p[^>]*>)?\s*<strong>\s*<em>\s*[^<]{1,60}[.:]\s*<\/em>\s*<\/strong>\s*/i;
function stripUpgradeHeading(html) {
  if (!html) return '';
  const out = String(html).replace(UPGRADE_HEADING, (m, openP) => (openP ? openP.trimStart() : ''));
  return stripHtml(out) ? out : '';
}

function normalizeComponents(comp) {
  if (!comp) return '';
  return comp.split(',').map(s => s.trim()).filter(Boolean).join(' ');
}

// Conversão mínima de markdown pro adaptador SRD (todo folded
// srd-pack-nomes-slug-e-markdown-cru): os JSONs SRD usam `**negrito**` e
// `*itálico*`/`_itálico_` cru dentro da descrição em HTML. Não é um parser de
// markdown — só negrito e itálico, nada de listas/links/títulos/código.
//
// T-06-01-01 (mitigate, high): a conversão só pode rodar sobre nós de TEXTO,
// nunca dentro da marcação de uma tag. A regex abaixo alterna entre um trecho
// que começa com `<` e vai até o próximo `>` (passa intocado) e um trecho de
// texto puro (convertido). Sem essa separação, um `alt="** onerror=... **"`
// vindo de um pack de terceiro viraria `alt="<strong> onerror=... </strong>"`
// — o parser do navegador fecharia o atributo no primeiro `<` novo e o resto
// viraria atributo injetado num sink de dangerouslySetInnerHTML.
// T-06-01-02 (mitigate, medium): só emite os literais `<strong>`/`<em>`, já
// presentes em ALLOWED_TAGS de sanitizePack (pack-import.jsx) — nenhum
// atributo é emitido, então a conversão não amplia a superfície sanitizada.
function mdToHtml(html) {
  if (!html) return '';
  return String(html).replace(/<[^>]*>|[^<]+/g, (chunk) => {
    if (chunk.charAt(0) === '<') return chunk;
    return chunk
      .replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')
      .replace(/\*([^*]+)\*/g, '<em>$1</em>')
      .replace(/_([^_]+)_/g, '<em>$1</em>');
  });
}

// ──────────────────────────────────────────────────────────────────
// ADAPTADOR: JSON raw → formato do app
// ──────────────────────────────────────────────────────────────────
function adaptSpell(s, versionLang, edition, versionKey, packName) {
  // GAP-1/E-04: ponto único de derivação da origem. O nome do pacote só
  // preenche ausência de `source`, nunca troca uma fonte declarada pela magia;
  // todos os leitores (v10-hifi.jsx) herdam a correção.
  const source = (typeof s.source === 'string' && s.source) ? s.source
    : (typeof packName === 'string' ? packName : '');
  const schoolKey = (s.school || '').toLowerCase();
  const schoolIdx = SCHOOL_INDEX[schoolKey];

  // Classes: o JSON vem em inglês; convertemos pra pt-br se necessário
  const rawClasses = Array.isArray(s.class) ? s.class : [];
  const classesPt = rawClasses.map(c => CLASS_PT[c.toLowerCase()] || c);
  const classesEn = rawClasses.map(c => c.toLowerCase());

  // Nome: displayName (pt) ou name (en slug)
  const ptName = s.displayName || s.name || '';
  const enName = s.name || '';
  // Nome legível em inglês (todo folded srd-pack-nomes-slug-e-markdown-cru):
  // os packs SRD trazem `displayName` já legível ("Acid Splash"), mas o
  // adaptador ignorava e devolvia o slug (`acid-splash`) pro caminho EN.
  // `en:` continua intocado (`enName = s.name`) — é a chave de identidade
  // usada por hifiSpellKey, pelo índice `byName` de pack-manager.jsx e pelo
  // pareamento de edição de v10-hifi.jsx; mudá-la invalidaria em silêncio
  // toda preparada/favorita já salva de todo usuário. A condição é pela lang
  // do PACOTE (`versionLang`), nunca a da interface (D-01) — num pack PT-BR o
  // `displayName` é o nome em português e não pode vazar pro slot EN.
  const nameEn = versionLang === 'en' ? (s.displayName || s.name || '') : (s.name || '');

  return {
    en: enName,
    pt: ptName,
    displayName: ptName,
    name_pt: ptName,
    name_en: nameEn,
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
    // Markdown cru convertido (todo folded srd-pack-nomes-slug-e-markdown-cru):
    // os SRD usam `**negrito**`/`*itálico*` dentro de `description`. mdToHtml
    // roda ANTES de stripHtml pra descHtml/desc: assim o negrito vira
    // <strong> pra renderização rica, e o texto achatado (`desc`) perde a
    // marcação junto com o `**` — nenhum campo mostra markdown cru.
    desc: {
      pt: stripHtml(mdToHtml(s.description)),
      en: stripHtml(mdToHtml(s.description)),
    },
    descHtml: {
      pt: mdToHtml(s.description) || '',
      en: mdToHtml(s.description) || '',
    },
    // `upgrade`/`upgradeHtml` NÃO passam por mdToHtml aqui: o vizinho
    // scripts/check-upgrade-heading-strip.tests.ps1 trava o literal exato
    // `stripHtml(stripUpgradeHeading(s.upgradeDescription))` pro campo plano.
    // Nenhum upgradeDescription dos JSONs embutidos hoje contém `**` (só
    // `description` tem, 36 ocorrências em srd-2024-en.json) — sem impacto de
    // dado real. upgradeHtml já recebe stripUpgradeHeading, então uma futura
    // edição do SRD com markdown ali passaria só por mdToHtml, não por
    // stripHtml — igual ao par desc/descHtml acima nesse aspecto.
    upgrade: {
      pt: stripHtml(stripUpgradeHeading(s.upgradeDescription)),
      en: stripHtml(stripUpgradeHeading(s.upgradeDescription)),
    },
    upgradeHtml: {
      pt: mdToHtml(stripUpgradeHeading(s.upgradeDescription)),
      en: mdToHtml(stripUpgradeHeading(s.upgradeDescription)),
    },
    classes: versionLang === 'ptbr' ? classesPt : classesEn,
    classesPt,
    classesEn,
    src: SOURCE_CODE[source] || source.slice(0, 4).toUpperCase().trim(),
    sourceFull: source,
    // WR-05: propaga ausencia em vez de inventar uma edicao — um pack sem
    // `edition` declarada nao e "5e 2014" por padrao, e useEditionCompare ja
    // sabe se esconder quando `!cur.edition`.
    edition: edition || '',
    // Fase 8 (D-06, Pattern 2): cada magia carrega o próprio idioma de
    // conteúdo e a chave do pacote de origem — a composição aditiva permite
    // pacotes de idiomas diferentes selecionados ao mesmo tempo, então um
    // `versionLang` único no nível do hook deixou de fazer sentido pra
    // renderização por magia (só concerns agregados, como locale de
    // ordenação, continuam usando o idioma da interface).
    lang: versionLang === 'ptbr' ? 'ptbr' : 'en',
    _versionKey: versionKey || '',
    url: s.url || '',
    ritual: !!s.ritual,
    concentration: !!s.concentration,
    castTime: s.castTime || '—',
  };
}

function adaptSpells(json, versionLang, edition, versionKey, packName) {
  const list = Array.isArray(json) ? json : (json?.spells || []);
  return list.map(s => adaptSpell(s, versionLang, edition, versionKey, packName));
}

// ──────────────────────────────────────────────────────────────────
// CACHE + ESTADO
// ──────────────────────────────────────────────────────────────────
const _cache = {};     // key → adapted spells[]
// key → json.meta cru do pack (Fase 5/MGMT-01, SRD-02). O adaptador de magias
// só consome json.spells, então o meta (nome/versão/licença CC-BY) seria
// descartado sem este cache — só preenchido pra source 'fetch' (builtins);
// packs de IndexedDB já expõem meta via pluginStore.listPacks().
const _metaCache = {};

// Preferência CRUA (seleção de pacotes) — persistida pelo próprio loader em
// spellbook-ui-prefs.selectedVersionKeys (D-07). `_enumerated` marca se a
// primeira volta de refreshPluginVersions() já rodou: antes dela, uma chave
// plugin-* ainda não vista nunca é podada (D-24 — só uma mudança explícita
// poda depois da primeira enumeração). `_unionMemo` guarda a última união
// calculada por buildSpellsFromRealData(), pra devolver a MESMA identidade de
// array enquanto nada muda (chaves resolvidas, idioma, cache de cada chave) —
// a antiga preferência pendente de um item deixa de existir: a pendência
// agora é por item dentro da própria lista.
function _readPrefs() {
  try {
    const parsed = JSON.parse(localStorage.getItem('spellbook-ui-prefs') || '{}');
    return (parsed && typeof parsed === 'object') ? parsed : {};
  } catch (e) {
    return {};
  }
}

// Seleção inicial (D-23/D-24): (1) ?v= de link compartilhado, lista separada
// por vírgula (um valor só continua válido, retrocompatível); (2) senão a
// lista já persistida pelo loader (`selectedVersionKeys`, inclusive vazia —
// Pitfall 1); (3) senão a preferência legada de um item (`versionKey`) —
// resolve direto, cai no mapa de fallback (D-23: aplicado ANTES da conversão
// pra lista, grava window.__legacyVersionFallback) ou fica pendente por item
// (D-24); (4) senão o pacote padrão do navegador.
function _initialSelection() {
  try {
    // IN-01: um blob de prefs corrompido não pode descartar um `?v=` válido —
    // _readPrefs() isola o próprio parse no seu try/catch, então um `?v=` de
    // link compartilhado sempre chega aqui intacto.
    const urlV = new URL(window.location.href).searchParams.get('v');
    if (urlV) {
      const fromUrl = urlV.split(',').map(s => s.trim()).filter(Boolean);
      if (fromUrl.length) return normalizeSelection(fromUrl);
    }
    const prefs = _readPrefs();
    if (Array.isArray(prefs.selectedVersionKeys)) {
      return normalizeSelection(prefs.selectedVersionKeys);
    }
    if (typeof prefs.versionKey === 'string' && prefs.versionKey !== '') {
      if (_versionByKey(prefs.versionKey)) {
        return normalizeSelection([prefs.versionKey]);
      }
      // D-04/D-23: chave legada que não resolve mais cai no mapa de fallback
      // (Fase 7, D-08: só a 2024 PT-BR vai pro SRD 5.2 PT-BR; as demais pro
      // SRD da mesma edição), aplicado ANTES da conversão pra lista.
      if (LEGACY_VERSION_FALLBACK[prefs.versionKey]) {
        const fallbackTo = LEGACY_VERSION_FALLBACK[prefs.versionKey];
        window.__legacyVersionFallback = { from: prefs.versionKey, to: fallbackTo };
        return normalizeSelection([fallbackTo]);
      }
      // D-24: chave de pack ainda não instalado/enumerado fica pendente por
      // item — refreshPluginVersions() honra assim que resolver.
      return normalizeSelection([prefs.versionKey]);
    }
  } catch (e) {}
  return normalizeSelection([_browserDefaultKey()]);
}

// Read-modify-write do blob inteiro (mesmo contrato que transition-banner.jsx
// já respeita): grava a lista CRUA, nunca a resolvida (Pitfall 1 — uma
// seleção vazia persiste vazia), e remove o campo legado de um item no mesmo
// write (D-23).
function _persistSelection(keys) {
  try {
    const prev = _readPrefs();
    const next = Object.assign({}, prev, { selectedVersionKeys: keys.slice() });
    delete next.versionKey;
    localStorage.setItem('spellbook-ui-prefs', JSON.stringify(next));
  } catch (e) {}
}

let _selectedKeys = _initialSelection();
_persistSelection(_selectedKeys);
let _enumerated = false;
let _unionMemo = null;

function getSelectedVersionKeys() {
  return _selectedKeys.slice();
}

function getResolvedVersionKeys() {
  return resolveSelection(_selectedKeys);
}

// Muda a seleção crua (menu de pacotes, `?v=` já resolvido, ou qualquer
// chamador programático). Depois da primeira enumeração de packs, poda
// fantasmas (chaves que nunca vão resolver); antes dela, uma chave plugin-*
// ainda não vista sobrevive (D-24). Avisa a troca sempre; o toast de D-04 só
// dispara quando a seleção VIRA fallback nesta chamada (nunca se já estava).
function setSelectedVersionKeys(keys) {
  let next = normalizeSelection(keys);
  if (_enumerated) {
    next = next.filter(k => _versionByKey(k));
  }
  const wasFallback = _isFallback(_selectedKeys);
  _selectedKeys = next;
  _persistSelection(_selectedKeys);
  window.dispatchEvent(new CustomEvent('hifi-spells-source-changed', { detail: _selectedKeys.slice() }));
  if (!wasFallback && _isFallback(_selectedKeys)) {
    try {
      window.dispatchEvent(new CustomEvent('hifi-toast', {
        // chrome: segue a interface, nunca o idioma de um pacote da seleção.
        detail: {
          msg: window.tt ? window.tt(_uiLang(), 'menu.toastFallbackToDefault') : 'nenhum pacote selecionado — mostrando o padrão',
          kind: 'err',
        },
      }));
    } catch (e2) {}
  }
}

// Limpa o cache de uma chave (usado pelo rename de pack de um plano futuro
// desta fase) e avisa a UI só se a chave invalidada está de fato na
// composição atual — nunca escreve no IndexedDB.
function invalidateSpellVersion(key) {
  delete _cache[key];
  delete _metaCache[key];
  _resolvableKeysPromise = null;
  _unionMemo = null;
  if (resolveSelection(_selectedKeys).includes(key)) {
    window.dispatchEvent(new CustomEvent('hifi-spells-source-changed', { detail: _selectedKeys.slice() }));
  }
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
      // source 'idb' devolve um array cru (pluginStore.getSpells) — a guarda
      // de objeto não-array abaixo naturalmente só preenche builtins.
      if (json && !Array.isArray(json) && typeof json.meta === 'object' && json.meta) {
        _metaCache[key] = json.meta;
      }
      const adapted = adaptSpells(json, ver.lang, ver.edition, ver.key, ver.labelEn);
      // WR-03: refreshPluginVersions() pode ter removido `key` do registro
      // enquanto este load estava em voo (pack apagado no meio do fetch). Sem
      // este guard, a escrita abaixo resuscitaria no _cache uma entrada que a
      // invalidação de refreshPluginVersions() acabou de limpar.
      if (_versionByKey(key)) {
        _cache[key] = adapted;
      }
      return adapted;
    } catch (e) {
      console.warn('[spells-data-loader] Falha ao carregar', key, e);
      // NÃO cacheia a falha: a próxima chamada (trocar de versão, reabrir)
      // tenta de novo. Avisa o usuário em vez de mostrar "0 magias" em silêncio.
      try {
        window.dispatchEvent(new CustomEvent('hifi-toast', {
          // chrome: segue a interface, não o idioma do pacote que falhou.
          detail: { msg: window.tt ? window.tt(_uiLang(), 'toast.loadFailed') : 'falha ao carregar as magias', kind: 'err' },
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

// Meta cru (nome/versão/licença) do pack builtin já carregado por loadVersion().
// Convenção do projeto: devolve null, nunca undefined.
function getVersionMeta(key) {
  return _metaCache[key] || null;
}

// ──────────────────────────────────────────────────────────────────
// ÍNDICE DE CHAVES RESOLVÍVEIS (consumido por 06-03 "órfãs" e pelo banner 06-04)
// ──────────────────────────────────────────────────────────────────
// ponytail: função dedicada em vez de reusar packSpellIndex() de
// pack-manager.jsx — o early-return de _buildSpellIndex() devolve índice
// vazio quando não há pack `idb` instalado, o que marcaria TODAS as
// preparadas como órfãs justo no caso mais comum (usuário sem nenhum pack
// importado). Esta função sempre carrega TODAS as SPELL_VERSIONS, builtin
// incluso.
let _resolvableKeysPromise = null;
function resolvableSpellKeys() {
  if (_resolvableKeysPromise) return _resolvableKeysPromise;
  const attempt = (async () => {
    if (typeof window.hifiSpellKey !== 'function') return null;
    const keys = new Set();
    for (const v of SPELL_VERSIONS) {
      await loadVersion(v.key);
      // loadVersion() nunca lança — falha de fetch degrada silenciosamente
      // pra [] e, de propósito, NÃO cacheia a falha (ver comentário acima em
      // loadVersion). Ausência em _cache é o único sinal confiável de "esta
      // versão falhou", distinto de uma versão que carregou e genuinamente
      // não tem magias.
      if (!_cache[v.key]) return null;
      _cache[v.key].forEach((spell) => keys.add(window.hifiSpellKey(spell)));
    }
    return keys;
  })();
  _resolvableKeysPromise = attempt;
  return attempt.then((result) => {
    // null é indeterminado, não "zero chaves resolvem": não memoiza, pra a
    // próxima chamada tentar de novo em vez de uma falha transitória de
    // fetch fazer a UI declarar as magias do usuário como perdidas pra sempre.
    if (result === null && _resolvableKeysPromise === attempt) _resolvableKeysPromise = null;
    return result;
  });
}
// Instalar/remover um pack pode mudar quais chaves resolvem — mesmo padrão de
// invalidação que pack-manager.jsx usa pra _indexPromise.
window.addEventListener('hifi-plugins-changed', () => { _resolvableKeysPromise = null; });
window.resolvableSpellKeys = resolvableSpellKeys;

// ──────────────────────────────────────────────────────────────────
// SELEÇÃO DE PACOTES — composição aditiva (Fase 8, D-01..D-06)
// ──────────────────────────────────────────────────────────────────
// A partir daqui a grade deixa de ser "uma versão ativa" e passa a ser a
// UNIÃO de qualquer número de pacotes marcados. As funções abaixo são puras
// (sem estado próprio, sem I/O) — o estado que as consome (`_selectedKeys`,
// na seção CACHE + ESTADO acima) e as funções que o mutam ficam antes deste
// bloco por hoisting; a ordem textual não importa em tempo de execução.

// Origem `fetch` + `corpus` igual a `srd` identifica um dos 3 SRD embutidos
// (BUILTIN_VERSIONS). Um pack de terceiro nunca casa aqui, mesmo declarando
// `meta.edition` (D-05: edition de homebrew é só informativa).
// Base = concorre com os outros bases (um por vez); os demais são adicionais.
function _isBase(v) {
  return !!(v && v.role === 'base');
}

// Id do pacote como um adicional o referencia em meta.base (= meta.source).
function _baseIdOf(v) {
  return v.source === 'idb' ? v.packId : v.key;
}

function _isSrdBuiltin(v) {
  return !!(v && v.source === 'fetch' && v.corpus === 'srd');
}

// Resolução "pacote padrão" (D-04): mesma detecção de idioma do navegador que
// _initialVersionKey() já usa, devolvendo a primeira entrada de SPELL_VERSIONS
// nesse idioma, senão a raiz da cadeia de fallback (_defaultVersion()).
function _browserDefaultKey() {
  try {
    const candidates = [
      ...Array.from(navigator.languages || []),
      navigator.language,
      navigator.userLanguage,
      navigator.browserLanguage,
    ].filter(Boolean).map(l => String(l).toLowerCase());
    const lang = candidates.some(l => l.startsWith('pt')) ? 'ptbr' : 'en';
    const v = SPELL_VERSIONS.find(x => x.lang === lang && _isBase(x));
    if (v) return v.key;
  } catch (e) {}
  return _defaultVersion().key;
}

// Normaliza a lista CRUA de chaves selecionadas: só strings não vazias
// (trim), teto de 64 itens, dedupe mantendo a primeira ocorrência. D-03: os
// SRD embutidos são mutuamente exclusivos POR EDIÇÃO — vence a edição da
// última chave SRD da lista (A-01: a mesma regra que o clique no menu e o
// `?v=` aplicam); SRD da mesma edição em idiomas diferentes (ex.: srd-2024-en
// e srd-2024-ptbr) sobrevivem juntas porque compartilham a edição vencedora.
// Uma chave não registrada (plugin-x) ou com qualquer outro `corpus` nunca é
// removida por esta regra (D-05).
function normalizeSelection(keys) {
  const arr = Array.isArray(keys) ? keys : [];
  const seen = new Set();
  let out = [];
  for (const k of arr) {
    if (typeof k !== 'string') continue;
    const trimmed = k.trim();
    if (!trimmed || seen.has(trimmed)) continue;
    seen.add(trimmed);
    out.push(trimmed);
    if (out.length >= 64) break;
  }
  // Pacotes base concorrem entre si: só o ÚLTIMO base da lista sobrevive.
  // Adicionais nunca são removidos por esta regra.
  let lastBase = null;
  for (let i = out.length - 1; i >= 0; i--) {
    if (_isBase(_versionByKey(out[i]))) { lastBase = out[i]; break; }
  }
  if (lastBase !== null) {
    const baseId = _baseIdOf(_versionByKey(lastBase));
    // Adicional com `base` só convive com esse base; os outros saem da seleção.
    out = out.filter((k) => {
      const v = _versionByKey(k);
      return k === lastBase || !_isBase(v) && !(v && v.base && v.base !== baseId);
    });
  }
  return out;
}

// Lista normalizada, restrita às chaves que resolvem no registro atual.
// Vazia (seleção com nada resolvível, inclusive `[]`) cai no pacote padrão —
// a grade nunca fica vazia por falta de seleção (D-04, F5 D-17).
function resolveSelection(keys) {
  const resolved = normalizeSelection(keys).filter(k => _versionByKey(k));
  return resolved.length ? resolved : [_browserDefaultKey()];
}

// Verdadeiro quando NENHUMA chave da seleção crua resolve mais — é o sinal
// que dispara o toast de D-04 (consumido por setSelectedVersionKeys() e por
// _refreshPluginVersionsInner() ao redor de uma mudança explícita ou de uma
// enumeração de packs).
function _isFallback(keys) {
  return normalizeSelection(keys).filter(k => _versionByKey(k)).length === 0;
}

// União das magias de todos os pacotes resolvidos, na ordem da seleção.
// `entries` = [{ version, spells }]. Sem `keyOf`, é concatenação pura (uso
// interno/teste). Com `keyOf` (produção: window.hifiSpellKey), colisão de
// chave é resolvida assim: SUBSTITUI a existente só quando as duas entradas
// são SRD da MESMA edição e a que está entrando casa com `uiLang` enquanto a
// existente não (D-03 — desempate por idioma da interface, não da ordem da
// lista); qualquer outra colisão MANTÉM a existente, sem duplicar (A-04: rede
// de segurança determinística contra chave React duplicada entre homebrews).
// Nunca muta os arrays de `entries`.
function unionSpells(entries, uiLang, keyOf) {
  const list = Array.isArray(entries) ? entries : [];
  if (typeof keyOf !== 'function') {
    const out = [];
    list.forEach((entry) => {
      (entry && Array.isArray(entry.spells) ? entry.spells : []).forEach(s => out.push(s));
    });
    return out;
  }
  const out = [];
  const indexByKey = new Map();
  list.forEach((entry) => {
    const ver = entry && entry.version;
    const spells = entry && Array.isArray(entry.spells) ? entry.spells : [];
    spells.forEach((s) => {
      const k = keyOf(s);
      if (!indexByKey.has(k)) {
        indexByKey.set(k, out.length);
        out.push(s);
        return;
      }
      const idx = indexByKey.get(k);
      const existing = out[idx];
      const existingVer = existing && existing._versionKey ? _versionByKey(existing._versionKey) : null;
      const sameEditionSrd = !!(ver && existingVer && ver.corpus === 'srd' && existingVer.corpus === 'srd' && ver.edition === existingVer.edition);
      if (sameEditionSrd && s.lang === uiLang && existing.lang !== uiLang) {
        out[idx] = s;
      }
    });
  });
  return out;
}

// ──────────────────────────────────────────────────────────────────
// API PÚBLICA — substitui v7BuildSpells
// ──────────────────────────────────────────────────────────────────
function buildSpellsFromRealData(uiLang) {
  const lang = uiLang || _uiLang();
  const keys = resolveSelection(_selectedKeys);
  const missing = keys.filter(k => !_cache[k]);
  if (missing.length) {
    // Se ainda não carregou tudo, inicia o fetch em background; a grade
    // devolve, por enquanto, só a união do que já está em cache — marcar mais
    // um pacote nunca zera o que já está na tela.
    Promise.all(missing.map(loadVersion)).then(() => {
      // CR-01 generalizado: só avisa se TODAS as chaves resolvidas
      // preencheram o cache. Com o cache ainda incompleto (falha de carga,
      // que não é cacheada de propósito, ou chave desconhecida, cujo redirect
      // cacheia sob a chave default) o par dispatch/listener viraria um ciclo
      // que não termina e trava a aba.
      if (keys.every(k => _cache[k])) {
        window.dispatchEvent(new CustomEvent('hifi-spells-source-changed', { detail: _selectedKeys.slice() }));
      }
    });
  }
  const ready = keys.filter(k => _cache[k]);
  const keysSig = ready.join('|');
  const memoHit = _unionMemo
    && _unionMemo.keysSig === keysSig
    && _unionMemo.lang === lang
    && _unionMemo.refs.length === ready.length
    && _unionMemo.refs.every((ref, i) => ref === _cache[ready[i]]);
  if (memoHit) return _unionMemo.result;
  const keyOf = typeof window.hifiSpellKey === 'function' ? window.hifiSpellKey : null;
  const result = unionSpells(ready.map(k => ({ version: _versionByKey(k), spells: _cache[k] })), lang, keyOf);
  _unionMemo = { keysSig, lang, refs: ready.map(k => _cache[k]), result };
  return result;
}

// Hook React para carregamento assíncrono com loading state
function useSpellVersions(uiLang) {
  const [loaded, setLoaded] = React.useState(false);
  const [selectedKeys, setSelectedKeysState] = React.useState(() => getSelectedVersionKeys());
  const [spells, setSpells] = React.useState(() => buildSpellsFromRealData(uiLang));

  React.useEffect(() => {
    let mounted = true;
    // Só as versões RESOLVIDAS são baixadas no boot. As outras (comparador de
    // edição, packs ainda não marcados) são carregadas sob demanda.
    Promise.all(resolveSelection(_selectedKeys).map(loadVersion)).then(() => {
      if (!mounted) return;
      setLoaded(true);
      setSpells(buildSpellsFromRealData(uiLang));
    });
    return () => { mounted = false; };
  }, []);

  React.useEffect(() => {
    const onChange = (e) => {
      setSelectedKeysState(Array.isArray(e.detail) ? e.detail.slice() : getSelectedVersionKeys());
      setSpells(buildSpellsFromRealData(uiLang));
    };
    window.addEventListener('hifi-spells-source-changed', onChange);
    return () => window.removeEventListener('hifi-spells-source-changed', onChange);
  }, [uiLang]);

  // O idioma da interface participa do desempate de colisão SRD EN×PT-BR
  // (D-03) — trocar uiLang sem trocar a seleção precisa recalcular a união.
  React.useEffect(() => {
    setSpells(buildSpellsFromRealData(uiLang));
  }, [uiLang]);

  // SPELL_VERSIONS é mutado in place (push/splice) por refreshPluginVersions()
  // — mutar não provoca re-render por si só, então mantemos uma cópia rasa em
  // estado React e a renovamos quando o evento de sincronização dispara.
  const [versions, setVersions] = React.useState(() => SPELL_VERSIONS.slice());
  React.useEffect(() => {
    const onPluginsChanged = () => setVersions(SPELL_VERSIONS.slice());
    window.addEventListener('hifi-plugins-changed', onPluginsChanged);
    return () => window.removeEventListener('hifi-plugins-changed', onPluginsChanged);
  }, []);

  const setSelectedKeys = React.useCallback((keys) => {
    setSelectedVersionKeys(keys);
    setSelectedKeysState(getSelectedVersionKeys());
    setSpells(buildSpellsFromRealData(uiLang));
  }, [uiLang]);

  const resolvedKeys = resolveSelection(selectedKeys);

  return {
    versions,
    selectedKeys,
    resolvedKeys,
    spells,
    loaded,
    setSelectedKeys,
  };
}

// ──────────────────────────────────────────────────────────────────
// OVERRIDE: substitui v7BuildSpells global
// ──────────────────────────────────────────────────────────────────
window.v7BuildSpells = buildSpellsFromRealData;
window.SPELL_VERSIONS = SPELL_VERSIONS;
// Mapas de classe en↔pt — usados pra remapear o filtro de classe ao trocar de idioma.
window.CLASS_PT = CLASS_PT; // en → pt  (bard → bardo)
window.CLASS_EN = CLASS_EN; // pt → en  (bardo → bard)
window.loadSpellVersion = loadVersion;
window.getVersionMeta = getVersionMeta;
window.useSpellVersions = useSpellVersions;
window.adaptSpell = adaptSpell;
window.adaptSpells = adaptSpells;
window.refreshPluginVersions = refreshPluginVersions;
window.getSelectedVersionKeys = getSelectedVersionKeys;
window.getResolvedVersionKeys = getResolvedVersionKeys;
window.setSelectedVersionKeys = setSelectedVersionKeys;
window.invalidateSpellVersion = invalidateSpellVersion;
window.normalizeSelection = normalizeSelection;

// Pre-carrega a versão default assim que o DOM estiver pronto. A enumeração de
// packs do IndexedDB roda em paralelo, fire-and-forget: sem await e sem
// encadear o pré-carregamento nela, porque o primeiro paint não pode depender
// de IndexedDB. O .catch() evita rejeição não tratada (a própria função já
// degrada para lista vazia internamente; isto é só uma rede de segurança).
if (typeof document !== 'undefined') {
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
      resolveSelection(_selectedKeys).forEach(k => loadVersion(k));
      refreshPluginVersions().catch(e => console.warn('[spells-data-loader] refreshPluginVersions falhou no boot:', e));
    });
  } else {
    resolveSelection(_selectedKeys).forEach(k => loadVersion(k));
    refreshPluginVersions().catch(e => console.warn('[spells-data-loader] refreshPluginVersions falhou no boot:', e));
  }
}
