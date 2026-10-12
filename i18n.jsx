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
    'spell.alsoIn': 'Também em: {sources}',
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
    // Banner de transição (MIGR-03) — D-08: ordem fixa (o que mudou, o que
    // continua, órfãs quando houver, a ação). O D-02 da Fase 6 (nunca oferece
    // pack PT-BR) foi superado pela Fase 7: quem vinha da chave 2024 PT-BR já
    // cai no SRD 5.2 PT-BR embutido (D-08; a 2014 PT-BR cai no SRD 5.1 EN,
    // WR-01 da revisão da fase 07); o CTA continua sendo importar o
    // próprio pacote pra ter o conteúdo completo.
    'migration.title': 'O Grimório mudou',
    'migration.removed': 'Os pacotes de magias D&D 5E 2014 e D&D 5.5E 2024 saíram do aplicativo.',
    'migration.kept': 'O SRD 5.1 e o SRD 5.2 continuam embutidos — o SRD 5.2 agora também em português —, e as suas magias preparadas e favoritas continuam salvas.',
    'migration.orphansOne': '1 das suas magias está num pacote que você não tem instalado. Ela aparece marcada na ficha; não foi apagada.',
    'migration.orphansMany': '{n} das suas magias estão em pacotes que você não tem instalados. Elas aparecem marcadas na ficha; não foram apagadas.',
    'migration.importCta': 'Para ter o conteúdo completo de volta, importe o seu próprio pacote.',
    'migration.openManager': 'Gerenciar pacotes',
    'migration.learnMore': 'Como montar um pacote',
    'migration.dismiss': 'Entendi',
    'migration.dismissAria': 'dispensar o aviso de transição',
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
    'import.chooseFile': 'Fazer upload',
    'import.fileLabel': 'Escolher arquivo externo',
    'import.close': 'Fechar',
    'import.docsLink': 'página de docs',
    'import.docsPrefix': 'Veja o formato do pacote na ',
    'import.emptyBody': 'Escolha um arquivo do seu dispositivo ou cole uma URL compatível (raw.githubusercontent, Gist, jsDelivr).',
    'import.emptyHeading': 'Instale um pacote de magias',
    'import.installing': 'Instalando…',
    'import.installPack': 'Instalar pacote',
    'import.or': 'ou',
    'import.open': 'Instalar pacote de magias',
    'import.renamed.one': 'Instalado com {n} magia renomeada para evitar conflito: {list}',
    'import.renamed.other': 'Instalado com {n} magias renomeadas para evitar conflito: {list}',
    'import.renamedMore': 'e mais {n}',
    'import.sanitizedNote': '{n} campo(s) de HTML foram ajustados na sanitização.',
    'import.sizeHint': 'Máx. 10 MB',
    'import.success': 'Pacote instalado como "{identifier}".',
    'import.successCount': '{n} magias.',
    'import.title': 'Instalar pacote',
    'import.urlLabel': 'Instalar por URL',
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
    'manager.duplicates': '{n} {nounSpell} também em outros pacotes',
    'manager.emptyBody': 'Um pacote é um arquivo JSON com suas próprias magias, que você instala no app e soma ao pacote base escolhido. Você pode instalar quantos quiser e remover a qualquer momento.',
    'manager.emptyHeading': 'Nenhum pacote adicional',
    'manager.impactBookmarked.one': '{n} favorita deixa de resolver',
    'manager.impactBookmarked.other': '{n} favoritas deixam de resolver',
    'manager.impactNone': 'Nada preparado ou favoritado depende só deste pacote.',
    'manager.impactPrepared.one': '{n} preparada em {c} {nounChar} deixa de resolver',
    'manager.impactPrepared.other': '{n} preparadas em {c} {nounChar} deixam de resolver',
    'manager.license': 'Licença e atribuição',
    'manager.loading': 'Carregando…',
    'manager.modifications': 'Modificações',
    'manager.no': 'Não',
    'manager.originBuiltin': 'embutido',
    'manager.originInstalled': 'instalado',
    'manager.remove': 'Remover',
    'manager.removeConfirm': 'Remover?',
    'manager.removeFailed': 'Não foi possível remover o pacote.',
    'manager.removed': 'Pacote "{name}" removido.',
    'manager.sectionBuiltin': 'pacotes base',
    'manager.sectionInstalled': 'pacotes adicionais',
    'manager.baseHint': 'Só um pacote base por vez.',
    'manager.requiresBase': 'Requer o pacote base: {name}',
    'manager.additionalHint': 'Somam magias ao pacote base.',
    'manager.spellCount': '{n} magias',
    'manager.spellCountUnknown': 'contagem de magias indisponível',
    'manager.title': 'Meus pacotes',
    'manager.versionLabel': 'versão {v}',
    'manager.yes': 'Sim',
    // Fase 8 — menu de pacotes e prompt de renomear (PKG-06, MGMT-07/08/09, D-15)
    'menu.sectionReserved': 'Slugs reservados',
    'menu.reservedHint': 'Slugs usados pelos pacotes SRD — pacotes homebrew não podem reutilizá-los.',
    'menu.reservedSubitem': '{pack}: {name}',
    'menu.cardMeta': '{author} · v{version} · {lang}{edition} · {n} {nounSpell}',
    'menu.authorUnknown': 'autor desconhecido',
    'menu.toastFallbackToDefault': 'Pacote removido da seleção — mostrando o pacote padrão.',
    'rename.title': 'Conflito de slugs',
    'rename.intro': 'Este pacote usa slugs já ocupados. Renomeie os que estiverem em conflito antes de continuar.',
    'rename.rowIncoming': 'Entrando: {name} ({slug})',
    'rename.rowExisting': 'Já existe em {pack}: {name}',
    'rename.suggestion': 'Sugestão: {slug}',
    'rename.applyAllSuffix': 'Aplicar sufixo a todas as conflitantes',
    'rename.impactWarning.one': 'Renomear afeta {n} magia preparada ou favoritada que aponta pro slug antigo.',
    'rename.impactWarning.other': 'Renomear afeta {n} magias preparadas ou favoritadas que apontam pro slug antigo.',
    'rename.cancel': 'Cancelar',
    'rename.submit': 'Renomear e continuar',
    'rename.submitting': 'Renomeando…',
    'rename.submitDisabledHint': 'Resolva todos os conflitos para continuar.',
    'rename.errorFormat': 'Slug inválido — use letras minúsculas, números e hífens.',
    'rename.errorReserved': 'Este slug é reservado pelo pacote SRD — escolha outro.',
    'rename.errorDuplicate': 'Este slug já está em uso por outro pacote instalado.',
    'packErr.imageTooLarge': 'Pacote não instalado: a imagem embutida no cartão (meta.image) passa de {kb} KB — reduza a imagem ou use um link https:// para ela.',
    'packErr.imageInvalid': 'Pacote não instalado: a imagem do cartão (meta.image) precisa ser um link https:// para uma imagem ou uma imagem PNG, JPEG, WebP ou GIF de até {kb} KB embutida no arquivo.',
    'noun.character.one': 'personagem',
    'noun.character.other': 'personagens',
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
    'spell.alsoIn': 'Also in: {sources}',
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
    // Transition banner (MIGR-03) — D-08: fixed order (what changed, what
    // stays, orphans when any, the action). Phase 6's D-02 (never offers a
    // PT-BR pack) was superseded by Phase 7: whoever came from the 2024 PT-BR
    // key already lands on the built-in SRD 5.2 PT-BR (D-08; the 2014 PT-BR key
    // lands on SRD 5.1 EN, phase 07 review WR-01); the CTA is still
    // importing your own pack for the full content.
    'migration.title': 'The Grimoire has changed',
    'migration.removed': 'The D&D 5E 2014 and D&D 5.5E 2024 spell packs have been removed from the app.',
    'migration.kept': 'SRD 5.1 and SRD 5.2 are still built in (SRD 5.2 now also in Portuguese), and your prepared and bookmarked spells are still saved.',
    'migration.orphansOne': '1 of your spells is in a pack you don\'t have installed. It is flagged on your sheet, not deleted.',
    'migration.orphansMany': '{n} of your spells are in packs you don\'t have installed. They are flagged on your sheet, not deleted.',
    'migration.importCta': 'To get the full content back, import your own pack.',
    'migration.openManager': 'Manage packs',
    'migration.learnMore': 'How to build a pack',
    'migration.dismiss': 'Got it',
    'migration.dismissAria': 'dismiss the transition notice',
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
    'import.chooseFile': 'Upload',
    'import.fileLabel': 'Choose external file',
    'import.close': 'Close',
    'import.docsLink': 'docs page',
    'import.docsPrefix': 'See the pack format on the ',
    'import.emptyBody': 'Choose a file from your device or paste a compatible URL (raw.githubusercontent, Gist, jsDelivr).',
    'import.emptyHeading': 'Install a spell pack',
    'import.installing': 'Installing…',
    'import.installPack': 'Install pack',
    'import.or': 'or',
    'import.open': 'Install spell pack',
    'import.renamed.one': 'Installed with {n} spell renamed to avoid a conflict: {list}',
    'import.renamed.other': 'Installed with {n} spells renamed to avoid conflicts: {list}',
    'import.renamedMore': 'and {n} more',
    'import.sanitizedNote': '{n} HTML field(s) were adjusted during sanitization.',
    'import.sizeHint': 'Max. 10 MB',
    'import.success': 'Pack installed as "{identifier}".',
    'import.successCount': '{n} spells.',
    'import.title': 'Install pack',
    'import.urlLabel': 'Install from URL',
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
    'manager.duplicates': '{n} {nounSpell} also in other packs',
    'manager.emptyBody': 'A pack is a JSON file with your own spells that you install into the app and add on top of the chosen base pack. You can install as many as you like and remove them at any time.',
    'manager.emptyHeading': 'No additional packs',
    'manager.impactBookmarked.one': '{n} bookmarked spell will stop resolving',
    'manager.impactBookmarked.other': '{n} bookmarked spells will stop resolving',
    'manager.impactNone': 'Nothing prepared or bookmarked depends on this pack alone.',
    'manager.impactPrepared.one': '{n} prepared spell across {c} {nounChar} will stop resolving',
    'manager.impactPrepared.other': '{n} prepared spells across {c} {nounChar} will stop resolving',
    'manager.license': 'License and attribution',
    'manager.loading': 'Loading…',
    'manager.modifications': 'Modifications',
    'manager.no': 'No',
    'manager.originBuiltin': 'built-in',
    'manager.originInstalled': 'installed',
    'manager.remove': 'Remove',
    'manager.removeConfirm': 'Remove?',
    'manager.removeFailed': 'Could not remove the pack.',
    'manager.removed': 'Pack "{name}" removed.',
    'manager.sectionBuiltin': 'base packs',
    'manager.sectionInstalled': 'additional packs',
    'manager.baseHint': 'Only one base pack at a time.',
    'manager.requiresBase': 'Requires base pack: {name}',
    'manager.additionalHint': 'They add spells to the base pack.',
    'manager.spellCount': '{n} spells',
    'manager.spellCountUnknown': 'spell count unavailable',
    'manager.title': 'My packs',
    'manager.versionLabel': 'version {v}',
    'manager.yes': 'Yes',
    // Phase 8 — pack menu and rename prompt (PKG-06, MGMT-07/08/09, D-15)
    'menu.sectionReserved': 'Reserved slugs',
    'menu.reservedHint': 'Slugs used by the built-in SRD packs — homebrew packs can\'t reuse them.',
    'menu.reservedSubitem': '{pack}: {name}',
    'menu.cardMeta': '{author} · v{version} · {lang}{edition} · {n} {nounSpell}',
    'menu.authorUnknown': 'unknown author',
    'menu.toastFallbackToDefault': 'Pack removed from selection — showing the default pack.',
    'rename.title': 'Slug conflicts',
    'rename.intro': 'This pack uses slugs that are already taken. Rename the conflicting ones before continuing.',
    'rename.rowIncoming': 'Incoming: {name} ({slug})',
    'rename.rowExisting': 'Already exists in {pack}: {name}',
    'rename.suggestion': 'Suggestion: {slug}',
    'rename.applyAllSuffix': 'Apply suffix to all conflicts',
    'rename.impactWarning.one': 'Renaming affects {n} prepared or bookmarked spell pointing at the old slug.',
    'rename.impactWarning.other': 'Renaming affects {n} prepared or bookmarked spells pointing at the old slug.',
    'rename.cancel': 'Cancel',
    'rename.submit': 'Rename and continue',
    'rename.submitting': 'Renaming…',
    'rename.submitDisabledHint': 'Resolve every conflict to continue.',
    'rename.errorFormat': 'Invalid slug — use lowercase letters, numbers, and hyphens.',
    'rename.errorReserved': 'This slug is reserved by the SRD pack — choose another.',
    'rename.errorDuplicate': 'This slug is already used by another installed pack.',
    'packErr.imageTooLarge': 'Pack not installed: the card image embedded in the pack (meta.image) is over {kb} KB — shrink it or use an https:// link to it instead.',
    'packErr.imageInvalid': 'Pack not installed: the card image (meta.image) must be an https:// link to an image, or a PNG, JPEG, WebP or GIF image of up to {kb} KB embedded in the file.',
    'noun.character.one': 'character',
    'noun.character.other': 'characters',
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
