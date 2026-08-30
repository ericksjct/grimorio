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
    // "Círculo" é o termo da tradução oficial pro nível DA MAGIA (evita
    // confusão com o nível do personagem).
    'spell.level': 'círculo',
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
    'print.slotShort': 'c.',
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
    'action.shareView': 'compartilhar busca e filtros',
    'action.onlyPrepared': 'mostrar só as magias preparadas',
    'action.onlyPreparedShort': 'mostrar só as preparadas',
    'nav.back': 'voltar',
    'nav.close': 'fechar (esc)',
    'filter.byLabel': 'filtrar por {label}',
    'toast.loadFailed': 'não consegui carregar as magias — verifique a conexão',
    'slots.slotAria': 'círculo {lvl}: espaço {i} de {n}',
    'slots.spend': 'gastar espaço',
    'slots.restore': 'restaurar espaço',
    'slots.rested': '🌙 espaços de magia restaurados',
    'slots.longRest': 'descanso longo',
    'slots.longRestTitle': 'restaurar todos os espaços de magia',
    'compare.view': 'ver na {edition}',
    'compare.back': 'voltar pra {edition}',
    'compare.notFound': 'essa magia não existe na {edition}',
    'toast.buildImported': 'personagem “{name}” importado',
    'toast.buildImportFailed': 'não consegui importar a build dessa URL',
    'toast.versionSwitchedAway': 'o pacote que você estava vendo foi removido — voltamos para {version}',
    // Modo sessão
    'session.title': 'modo sessão',
    'session.enter': 'entrar no modo sessão',
    'session.exit': 'voltar ao grimório',
    'session.viewCards': 'visão de cards',
    'session.viewList': 'visão de lista',
    'session.cast': 'Conjurar',
    'session.castCantrip': 'Conjurar (truque)',
    'session.castAria': 'conjurar {name}',
    'session.upcastAria': 'conjurar com espaço maior',
    'session.upcastTitle': 'Conjurar {name} com espaço de…',
    'session.avail': '{n} disp.',
    'session.toastCast': '✨ {name} conjurada',
    'session.toastSlot': '✨ {name} — espaço de {circle}º gasto',
    'session.toastUpcast': '✨ {name} — upcast: espaço de {circle}º gasto',
    'session.noSlots': 'sem espaços de {circle}º círculo',
    'session.groupCantrips': 'truques',
    'session.groupCircle': '{n}º círculo',
    'session.empty': 'nenhuma magia preparada — marque magias no grimório pra vê-las aqui',
    'session.statsAria': 'o que significam esses valores?',
    'stats.dc': 'CD magia',
    'stats.atk': 'ataque',
    'stats.cast': 'conjuração',
    'stats.prof': 'prof.',
    'stats.dcTitle': 'CD de magia',
    'stats.dcFormula': '8 + proficiência + conjuração',
    'stats.dcText': 'A dificuldade que o alvo precisa alcançar na salvaguarda contra suas magias. Você não rola nada: o alvo rola o d20 dele contra a sua CD.',
    'stats.atkTitle': 'bônus de ataque mágico',
    'stats.atkFormula': 'proficiência + conjuração',
    'stats.atkText': 'O bônus somado ao seu d20 quando uma magia pede jogada de ataque. Você rola 1d20 + esse bônus contra a CA do alvo.',
    'stats.castTitle': 'atributo de conjuração',
    'stats.castFormula': '(valor do atributo − 10) ÷ 2',
    'stats.castText': 'O atributo que a sua classe usa pra conjurar (ex: Bardo usa Carisma). O modificador entra na CD, no ataque e em efeitos de algumas magias.',
    'stats.profTitle': 'proficiência',
    'stats.profFormula': '2 + ⌊(nível total − 1) ÷ 4⌋',
    'stats.profText': 'Cresce com o nível total do personagem: +2 (nível 1–4), +3 (5–8), +4 (9–12)…',
    'stats.missing': 'defina classe, nível e atributos no editor do personagem pra calcular esses valores',
    'ability.str': 'FOR',
    'ability.dex': 'DES',
    'ability.con': 'CON',
    'ability.int': 'INT',
    'ability.wis': 'SAB',
    'ability.cha': 'CAR',
    // Import de pacotes (PKG-02/PKG-03), chaves e copy de .planning/phases/03-srd-pack-import-pipeline/03-UI-SPEC.md
    'import.chooseFile': 'Escolher arquivo',
    'import.close': 'Fechar',
    'import.docsLink': 'página de docs',
    'import.docsPrefix': 'Veja o formato do pacote na ',
    'import.emptyBody': 'Escolha um arquivo do seu dispositivo ou cole uma URL compatível (raw.githubusercontent, Gist, jsDelivr).',
    'import.emptyHeading': 'Instale um pacote de magias',
    'import.installing': 'Instalando…',
    'import.installPack': 'Instalar pacote',
    'import.modeFile': 'Arquivo',
    'import.modeUrl': 'URL',
    'import.open': 'Instalar pacote de magias',
    'import.sanitizedNote': '{n} campo(s) de HTML foram ajustados na sanitização.',
    'import.sizeHint': 'Máx. 10 MB',
    'import.success': 'Pacote instalado como "{identifier}".',
    'import.successCount': '{n} magias.',
    'import.title': 'Instalar pacote',
    'import.urlLabel': 'url do pacote',
    'import.urlPlaceholder': 'https://raw.githubusercontent.com/…/meu-pacote.json',
    // Rejeições do pipeline de import (PKG-04) — uma chave por window.packImport.PACK_ERROR_CODES,
    // mais packErr.quota (WR-09): falha de armazenamento pós-validação, não faz parte do enum.
    'packErr.blockedKey': 'Pacote contém uma chave não permitida e foi rejeitado por segurança.',
    'packErr.fetchFailed': 'Não foi possível buscar essa URL (bloqueio de CORS) — baixe o arquivo e importe por upload.',
    'packErr.malformedJson': 'Arquivo não é um JSON válido — verifique a sintaxe e tente de novo.',
    'packErr.quota': 'Sem espaço de armazenamento — libere espaço no navegador e tente de novo.',
    'packErr.schemaInvalid': 'Pacote não corresponde ao schema — confira pack.schema.json.',
    'packErr.tooLarge': 'Arquivo maior que 10 MB — reduza o pacote.',
    'packErr.unknown': 'Não foi possível instalar o pacote.',
    // Gerenciador de pacotes (MGMT-01/MGMT-05, SRD-02) — .planning/phases/05-plugin-manager-ui-version-selector/05-01-PLAN.md Task 1
    'manager.emptyBody': 'Um pacote é um arquivo JSON com suas próprias magias, que você instala no app e passa a ver junto com o conteúdo embutido. Você pode instalar quantos quiser e remover a qualquer momento.',
    'manager.emptyHeading': 'Nenhum pacote instalado',
    'manager.license': 'Licença e atribuição',
    'manager.loading': 'Carregando…',
    'manager.modifications': 'Modificações',
    'manager.originBuiltin': 'embutido',
    'manager.originInstalled': 'instalado',
    'manager.sectionBuiltin': 'embutidos',
    'manager.sectionInstalled': 'instalados',
    'manager.spellCount': '{n} magias',
    'manager.spellCountUnknown': 'contagem de magias indisponível',
    'manager.title': 'Meus pacotes',
    'manager.versionLabel': 'versão {v}',
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
    'action.shareView': 'share search & filters',
    'action.onlyPrepared': 'show only prepared spells',
    'action.onlyPreparedShort': 'show only prepared',
    'nav.back': 'back',
    'nav.close': 'close (esc)',
    'filter.byLabel': 'filter by {label}',
    'toast.loadFailed': 'could not load the spells — check your connection',
    'slots.slotAria': 'level {lvl}: slot {i} of {n}',
    'slots.spend': 'spend slot',
    'slots.restore': 'restore slot',
    'slots.rested': '🌙 spell slots restored',
    'slots.longRest': 'long rest',
    'slots.longRestTitle': 'restore all spell slots',
    'compare.view': 'view in {edition}',
    'compare.back': 'back to {edition}',
    'compare.notFound': 'this spell does not exist in {edition}',
    'toast.buildImported': 'character “{name}” imported',
    'toast.buildImportFailed': 'could not import the build from this URL',
    'toast.versionSwitchedAway': 'the pack you were viewing was removed — switched back to {version}',
    // Session mode
    'session.title': 'session mode',
    'session.enter': 'enter session mode',
    'session.exit': 'back to spellbook',
    'session.viewCards': 'card view',
    'session.viewList': 'list view',
    'session.cast': 'Cast',
    'session.castCantrip': 'Cast (cantrip)',
    'session.castAria': 'cast {name}',
    'session.upcastAria': 'cast with a higher slot',
    'session.upcastTitle': 'Cast {name} using a slot of…',
    'session.avail': '{n} left',
    'session.toastCast': '✨ {name} cast',
    'session.toastSlot': '✨ {name} — level {circle} slot spent',
    'session.toastUpcast': '✨ {name} — upcast: level {circle} slot spent',
    'session.noSlots': 'no level {circle} slots left',
    'session.groupCantrips': 'cantrips',
    'session.groupCircle': 'level {n}',
    'session.empty': 'no prepared spells — prepare spells in the spellbook to see them here',
    'session.statsAria': 'what do these values mean?',
    'stats.dc': 'spell DC',
    'stats.atk': 'attack',
    'stats.cast': 'spellcasting',
    'stats.prof': 'prof.',
    'stats.dcTitle': 'spell save DC',
    'stats.dcFormula': '8 + proficiency + spellcasting',
    'stats.dcText': 'The difficulty the target must reach on its saving throw against your spells. You do not roll: the target rolls its d20 against your DC.',
    'stats.atkTitle': 'spell attack bonus',
    'stats.atkFormula': 'proficiency + spellcasting',
    'stats.atkText': 'The bonus added to your d20 when a spell calls for an attack roll. You roll 1d20 + this bonus against the target\'s AC.',
    'stats.castTitle': 'spellcasting ability',
    'stats.castFormula': '(ability score − 10) ÷ 2',
    'stats.castText': 'The ability your class uses to cast spells (e.g. Bards use Charisma). The modifier feeds the DC, the attack bonus, and some spell effects.',
    'stats.profTitle': 'proficiency',
    'stats.profFormula': '2 + ⌊(total level − 1) ÷ 4⌋',
    'stats.profText': 'Grows with the character\'s total level: +2 (levels 1–4), +3 (5–8), +4 (9–12)…',
    'stats.missing': 'set class, level and ability scores in the character editor to calculate these values',
    'ability.str': 'STR',
    'ability.dex': 'DEX',
    'ability.con': 'CON',
    'ability.int': 'INT',
    'ability.wis': 'WIS',
    'ability.cha': 'CHA',
    // Pack import (PKG-02/PKG-03) keys and copy from .planning/phases/03-srd-pack-import-pipeline/03-UI-SPEC.md
    'import.chooseFile': 'Choose file',
    'import.close': 'Close',
    'import.docsLink': 'docs page',
    'import.docsPrefix': 'See the pack format on the ',
    'import.emptyBody': 'Choose a file from your device or paste a compatible URL (raw.githubusercontent, Gist, jsDelivr).',
    'import.emptyHeading': 'Install a spell pack',
    'import.installing': 'Installing…',
    'import.installPack': 'Install pack',
    'import.modeFile': 'File',
    'import.modeUrl': 'URL',
    'import.open': 'Install spell pack',
    'import.sanitizedNote': '{n} HTML field(s) were adjusted during sanitization.',
    'import.sizeHint': 'Max. 10 MB',
    'import.success': 'Pack installed as "{identifier}".',
    'import.successCount': '{n} spells.',
    'import.title': 'Install pack',
    'import.urlLabel': 'pack url',
    'import.urlPlaceholder': 'https://raw.githubusercontent.com/…/meu-pacote.json',
    // Import pipeline rejections (PKG-04) — one key per window.packImport.PACK_ERROR_CODES,
    // plus packErr.quota (WR-09): a post-validation storage failure, not part of the enum.
    'packErr.blockedKey': 'Pack contains a disallowed key and was rejected for security.',
    'packErr.fetchFailed': 'Could not fetch that URL (CORS block) — download the file and import it by upload.',
    'packErr.malformedJson': 'File is not valid JSON — check the syntax and try again.',
    'packErr.quota': 'Out of storage space — free up space in your browser and try again.',
    'packErr.schemaInvalid': 'Pack does not match the schema — check pack.schema.json.',
    'packErr.tooLarge': 'File larger than 10 MB — reduce the pack.',
    'packErr.unknown': 'Could not install the pack.',
    // Pack manager (MGMT-01/MGMT-05, SRD-02) — .planning/phases/05-plugin-manager-ui-version-selector/05-01-PLAN.md Task 1
    'manager.emptyBody': 'A pack is a JSON file with your own spells that you install into the app and browse alongside the built-in content. You can install as many as you like and remove them at any time.',
    'manager.emptyHeading': 'No packs installed',
    'manager.license': 'License and attribution',
    'manager.loading': 'Loading…',
    'manager.modifications': 'Modifications',
    'manager.originBuiltin': 'built-in',
    'manager.originInstalled': 'installed',
    'manager.sectionBuiltin': 'built-in',
    'manager.sectionInstalled': 'installed',
    'manager.spellCount': '{n} spells',
    'manager.spellCountUnknown': 'spell count unavailable',
    'manager.title': 'My packs',
    'manager.versionLabel': 'version {v}',
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
    // IN-08: STRINGS é um objeto literal comum (não Object.create(null)) —
    // um `key` vindo de uma chave de prototipo ('constructor', 'toString',
    // ...) devolveria a função herdada em vez de undefined, e o `== null`
    // abaixo não pegaria isso. hasOwnProperty é o guard barato, sem
    // reescrever o dicionário inteiro pra Object.assign(Object.create(null)).
    let s = Object.prototype.hasOwnProperty.call(dict, key) ? dict[key] : null;
    if (s == null) {
      s = Object.prototype.hasOwnProperty.call(STRINGS.ptbr, key) ? STRINGS.ptbr[key] : null;
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
