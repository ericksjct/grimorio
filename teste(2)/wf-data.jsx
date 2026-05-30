// Static fake data used in wireframes. Bilingual EN / PTBR.
// Names are placeholders — generic TTRPG-style spell names, not from any
// specific copyrighted source.

const WF_STR = {
  en: {
    appName: 'spellbook · wireframe',
    search: 'search spells…',
    filters: 'filters',
    level: 'level',
    school: 'school',
    klass: 'class',
    castTime: 'cast',
    range: 'range',
    duration: 'duration',
    components: 'components',
    concentration: 'conc.',
    ritual: 'ritual',
    known: 'known',
    prepared: 'prepared',
    sortBy: 'sort by',
    name: 'name',
    description: 'description',
    upgrade: 'at higher levels',
    source: 'source',
    cantrip: 'cantrip',
    lvl: 'lvl',
    add: '+ add',
    selected: 'selected',
    prepare: 'prepare',
    compare: 'compare',
    print: 'print',
    cmdHint: 'press / to search',
    showFilters: 'show filters',
    hideFilters: 'hide filters',
    all: 'all',
    classes: ['wizard', 'cleric', 'bard', 'druid', 'sorcerer', 'warlock', 'ranger', 'paladin'],
    schools: ['abjur', 'conj', 'divin', 'ench', 'evoc', 'illus', 'necro', 'transm'],
  },
  ptbr: {
    appName: 'grimório · wireframe',
    search: 'buscar magias…',
    filters: 'filtros',
    level: 'nível',
    school: 'escola',
    klass: 'classe',
    castTime: 'execução',
    range: 'alcance',
    duration: 'duração',
    components: 'componentes',
    concentration: 'conc.',
    ritual: 'ritual',
    known: 'conhecida',
    prepared: 'preparada',
    sortBy: 'ordenar',
    name: 'nome',
    description: 'descrição',
    upgrade: 'em níveis superiores',
    source: 'fonte',
    cantrip: 'truque',
    lvl: 'nv',
    add: '+ add',
    selected: 'selec.',
    prepare: 'preparar',
    compare: 'comparar',
    print: 'imprimir',
    cmdHint: 'aperte / p/ buscar',
    showFilters: 'mostrar filtros',
    hideFilters: 'ocultar filtros',
    all: 'todas',
    classes: ['mago', 'clérigo', 'bardo', 'druida', 'feiticeiro', 'bruxo', 'patrulheiro', 'paladino'],
    schools: ['abjur', 'conj', 'div', 'ench', 'evoc', 'ilus', 'necr', 'trans'],
  }
};

// Original placeholder spell names — generic fantasy, not from any IP.
// Paired EN/PTBR. Each has level, school index, ritual/conc flags, etc.
const WF_SPELLS = [
  { en: 'Ember Spark',        pt: 'Faísca Brasa',       lvl: 0, school: 4, time: 'action',  range: '60 ft',  dur: 'instant',  conc: false, rit: false, known: true,  comp: 'V S' },
  { en: 'Featherfall',        pt: 'Queda de Pluma',     lvl: 1, school: 7, time: 'reaction',range: '60 ft',  dur: '1 min',    conc: false, rit: false, known: true,  comp: 'V M' },
  { en: 'Mage Light',         pt: 'Luz Arcana',         lvl: 0, school: 5, time: 'action',  range: 'self',   dur: '1 hour',   conc: false, rit: false, known: false, comp: 'V S' },
  { en: 'Whispered Charm',    pt: 'Encanto Sussurrado', lvl: 1, school: 3, time: '1 min',   range: '30 ft',  dur: '1 hour',   conc: true,  rit: true,  known: false, comp: 'V S' },
  { en: 'Stoneward',          pt: 'Guarda de Pedra',    lvl: 2, school: 0, time: 'action',  range: 'touch',  dur: '8 hours',  conc: false, rit: false, known: true,  comp: 'V S M' },
  { en: 'Thornwhip',          pt: 'Chicote Espinho',    lvl: 0, school: 7, time: 'action',  range: '30 ft',  dur: 'instant',  conc: false, rit: false, known: false, comp: 'V S' },
  { en: 'Veil of Mist',       pt: 'Véu de Bruma',       lvl: 2, school: 5, time: 'action',  range: '60 ft',  dur: '10 min',   conc: true,  rit: false, known: true,  comp: 'V S' },
  { en: 'Hexbind',            pt: 'Atadura Maldita',    lvl: 3, school: 6, time: 'action',  range: '90 ft',  dur: '1 min',    conc: true,  rit: false, known: false, comp: 'V S M' },
  { en: 'Sunlance',           pt: 'Lança Solar',        lvl: 4, school: 4, time: 'action',  range: '120 ft', dur: 'instant',  conc: false, rit: false, known: true,  comp: 'V S' },
  { en: 'Soothe Wounds',      pt: 'Acalmar Feridas',    lvl: 1, school: 1, time: 'action',  range: 'touch',  dur: 'instant',  conc: false, rit: false, known: true,  comp: 'V S' },
  { en: 'Reveal Truth',       pt: 'Revelar Verdade',    lvl: 2, school: 2, time: '1 min',   range: 'self',   dur: '10 min',   conc: true,  rit: true,  known: false, comp: 'V S' },
  { en: 'Phantom Step',       pt: 'Passo Fantasma',     lvl: 3, school: 5, time: 'action',  range: 'self',   dur: '1 hour',   conc: true,  rit: false, known: false, comp: 'V S' },
  { en: 'Stormcall',          pt: 'Chamado da Tempest.',lvl: 5, school: 4, time: '1 min',   range: '120 ft', dur: '1 hour',   conc: true,  rit: false, known: false, comp: 'V S M' },
  { en: 'Wardstep',           pt: 'Passo de Guarda',    lvl: 1, school: 0, time: 'reaction',range: 'self',   dur: '1 round',  conc: false, rit: false, known: true,  comp: 'S' },
  { en: 'Mindread',           pt: 'Ler Mente',          lvl: 2, school: 2, time: 'action',  range: '30 ft',  dur: '1 min',    conc: true,  rit: false, known: false, comp: 'V S' },
  // Long-description test spell — exercises the print chunker. Description
  // is long enough to spread across multiple "spell blocks" (~2800 chars).
  { en: 'Test of the Long Tome', pt: 'Teste do Tomo Longo', lvl: 7, school: 5, time: '1 min', range: '120 ft', dur: '10 min', conc: true, rit: false, known: false, comp: 'V S M',
    desc: {
      pt: `Você invoca um tomo etéreo de páginas infinitas que paira diante de você, e suas runas reescrevem a realidade ao redor. Escolha uma área cúbica de 12 metros de aresta dentro do alcance — ela passa a ser regida pelas leis arbitrárias inscritas no Tomo durante a duração da magia.

No início de cada rodada, role 1d8 na Tabela do Tomo: 1) inverter a gravidade; 2) silenciar todos os sons; 3) trocar as posições de duas criaturas à sua escolha; 4) congelar o tempo de uma criatura à sua escolha por 1 rodada; 5) materializar um muro de força que persiste por 2 rodadas; 6) tornar a luz pulsante e desorientadora (todas as criaturas devem repetir os testes de Sabedoria contra efeitos ativos); 7) inverter os efeitos de cura em dano necrótico e vice-versa pela rodada; 8) o conjurador escolhe um dos efeitos anteriores.

Qualquer criatura que entre na área pela primeira vez no seu turno, ou comece o turno nela, deve fazer um teste de Carisma (CD igual à sua CD de magia). Em uma falha, a criatura é marcada com uma runa flutuante visível a olho nu e sofre desvantagem em testes de habilidade até o fim da duração da magia. Em um sucesso crítico, a criatura ignora todos os efeitos do Tomo até o início do seu próximo turno e ganha vantagem em seu próximo ataque ou teste.

Você pode, como uma ação bônus, fechar o Tomo prematuramente. Quando isso acontece, todas as runas flutuantes ativas explodem em luz dourada, causando 8d6 de dano radiante a todas as criaturas marcadas (teste de Destreza para metade). O Tomo então se desfaz em uma chuva de pétalas de pergaminho que repousam no chão por 1 minuto antes de evaporar.

Notas adicionais: criaturas com a habilidade "Mente Inacessível" (como ilícidos e outros aberrações superiores) ignoram o efeito de marcação. Itens mágicos dentro da área têm 50% de chance de pulsar e revelar suas propriedades a qualquer criatura que os observe durante essa rodada. Um efeito de teleporte iniciado de dentro da área tem 25% de chance de redirecionar para uma localização aleatória no mesmo plano.

A magia falha automaticamente se conjurada dentro de antimagia, dentro de outra zona de Tomo já ativa, ou enquanto o conjurador estiver enfeitiçado. Componente material: um pergaminho em branco coberto de tinta dourada (valor 250 po, consumido na conjuração).`,
      en: `You summon an ethereal tome of infinite pages that hovers before you, its runes rewriting reality around it. Choose a 12m cube within range — for the spell's duration the area is governed by the arbitrary laws inscribed in the Tome.

At the start of each round, roll 1d8 on the Tome's Table: 1) reverse gravity; 2) silence all sound; 3) swap the positions of two creatures of your choice; 4) freeze a creature of your choice for 1 round; 5) materialize a wall of force for 2 rounds; 6) make the light pulsate disorientingly (all creatures must reroll Wisdom saves vs active effects); 7) invert healing into necrotic damage and vice versa for the round; 8) caster chooses one of the previous effects.

Any creature that enters the area for the first time on your turn, or starts its turn there, must make a Charisma save (DC equal to your spell save DC). On a failure, the creature is marked with a visible floating rune and has disadvantage on ability checks for the duration. On a critical success, the creature ignores all Tome effects until the start of its next turn and gains advantage on its next attack or check.

You may, as a bonus action, close the Tome early. When you do, all active floating runes burst in golden light, dealing 8d6 radiant damage to every marked creature (Dex save for half). The Tome then dissolves into a rain of parchment petals that linger on the ground for 1 minute before evaporating.

Additional notes: creatures with the "Inscrutable Mind" trait (illithids and higher aberrations) are immune to the marking effect. Magic items within the area have a 50% chance to pulse and reveal their properties to any creature observing them that round. Teleport effects initiated from inside the area have a 25% chance of redirecting to a random location on the same plane.

The spell fails automatically if cast inside antimagic, inside another active Tome zone, or while the caster is charmed. Material component: a blank parchment soaked in golden ink (250 gp, consumed).`,
    },
    upgrade: {
      pt: 'Quando conjurada com espaço de nível 8, a área cresce para 18m e o dano final aumenta para 10d6. Com espaço de nível 9, a área cresce para 24m, o dano para 12d6, e o conjurador escolhe o resultado da tabela em vez de rolar.',
      en: 'When cast with a level 8 slot, the area grows to 18m and final damage to 10d6. With a level 9 slot, area becomes 24m, damage 12d6, and the caster chooses the table result instead of rolling.',
    },
  },
];

function pickStr(lang) { return WF_STR[lang] || WF_STR.en; }
function spellName(s, lang) { return lang === 'ptbr' ? s.pt : s.en; }
function levelLabel(lvl, str) { return lvl === 0 ? str.cantrip : `${str.lvl} ${lvl}`; }

Object.assign(window, { WF_STR, WF_SPELLS, pickStr, spellName, levelLabel });
