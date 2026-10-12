// scripts/generate-srd-pack.mjs
//
// One-shot generator, run by hand OUTSIDE the app runtime:
//   node scripts/generate-srd-pack.mjs
// The app has no build step and must never gain one — this file is never
// loaded by the browser, never referenced from index.html/sw.js.
//
// Produces the three embedded SRD packs at the repo root (srd-2014-en.json,
// srd-2024-en.json, srd-2024-ptbr.json), in the format defined by
// pack.schema.json.
//
// The pt-BR pack (srd-2024-ptbr.json) is a translation, not a fresh SRD
// extraction: it reads a versioned recorte at
// scripts/srd-sources/srd-5.2-ptbr-source.json (339 SRD 5.2 spell blocks in
// Markdown, produced one-shot by scripts/extract-ptbr-source.mjs — see the
// pt-BR section of 03-SRD-SOURCE.md for provenance) and borrows level/school/
// class from the freshly written srd-2024-en.json by slug, so the two packs
// can never disagree on those facts.
//
// Sources (registered in
// .planning/phases/03-srd-pack-import-pipeline/03-SRD-SOURCE.md, the
// approved D-06 route per edition — read that file before touching this
// script):
//   - SRD 5.1 (2014): Tabyltop/CC-SRD's text-dump export of the official PDF
//     (CC-BY-4.0, already OCR-free — this script parses its heading/paragraph
//     stream into per-spell records).
//     https://raw.githubusercontent.com/Tabyltop/CC-SRD/main/SRD5.1-CCBY4.0License-TT.json
//   - SRD 5.2 (2024): dmcb's structured 339-spell gist (CC-BY-4.0, backs
//     5e-spellbook.app). A local versioned copy is committed at
//     scripts/srd-sources/srd-5.2-spells.json — this script never fetches it
//     live, at generation time or otherwise.
//     https://gist.github.com/dmcb/4b67869f962e3adaa3d0f7e5ca8f4912
//   - SRD 5.1 class lists ONLY: 5e-bits/5e-database's 2014 spell file, used as a
//     transcription of the spell→class associations because the Tabyltop dump
//     corrupts the PDF's "Spell Lists" appendix (see the D-06 amendment dated
//     2026-09-05 in 03-SRD-SOURCE.md for the measurements and the licence
//     reasoning). Nothing else is taken from it — no description, name, level or
//     school. The pack stays CC-BY-4.0, attributed to WotC.
//     https://raw.githubusercontent.com/5e-bits/5e-database/main/src/2014/en/5e-SRD-Spells.json
//
// Re-run when the SRD text is updated (WotC errata) or a source moves.
//
// D-05 (locked): no byte of description text from spells-5E-*.json ever
// enters these packs. The sources listed above are the ONLY input; this script
// never reads any spells-5E-*.json file.

import { readFile, writeFile, mkdir } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(__dirname, '..');
const CACHE_DIR = path.join(repoRoot, '.cache', 'srd-sources');

const MODIFICATION_NOTE_EN =
  'Texto reformatado para JSON e HTML estrutural; conteúdo da magia não foi alterado.';

// D-04: nota de modificação por pacote — o pack pt-BR é uma tradução de
// terceiro recortada ao SRD 5.2, então a nota do pack EN acima seria falsa
// para ele.
const MODIFICATION_NOTE_PTBR =
  'Tradução para o português do Brasil feita pelo Heróis Anônimos (https://6x.work/heroisanonimos, versão de 07/03/2025), publicada pelos tradutores sob CC-BY-4.0. Recorte às 339 magias do SRD 5.2: nenhum outro conteúdo do documento de origem foi incluído. Texto extraído do Markdown e reformatado para JSON e HTML estrutural; legendas de ilustração removidas. As 17 magias que o SRD 5.2 renomeou aparecem com o nome genérico do SRD traduzido, sem os nomes próprios do Player\'s Handbook. Círculo, escola e classes seguem o SRD 5.2 em inglês. Errata aplicada contra o SRD 5.2 em inglês: Cárcere de Energia sem Concentração (duração de 1 hora), e Convocar Relâmpagos com a cláusula da tempestade e o aprimoramento por círculo superior, que faltavam na tradução (texto traduzido do SRD 5.2).';

// ── shared helpers ──────────────────────────────────────────────────────

function slugify(name) {
  return name
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/['’]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

// Same rule as pack-import.jsx's freeIdentifier (D-09): first collision gets
// "-2", next "-3", and so on — used here to keep spell `name` unique inside
// one pack (the plan's required invariant, not the source's problem to solve).
function freeIdentifier(base, used) {
  if (!used.has(base)) return base;
  let n = 2;
  while (used.has(`${base}-${n}`)) n++;
  return `${base}-${n}`;
}

function htmlEscape(s) {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

function capitalize(s) {
  return s.charAt(0).toUpperCase() + s.slice(1);
}

// Maps one intermediate record (shared shape produced by either edition's
// extractor) to the final spells[] shape pack.schema.json expects. Optional
// fields are only written when the source actually had a value for them.
function toSpell(raw, usedNames) {
  // D-13: no pt-BR, `raw.name` já é o slug EN (identidade estável para
  // preparadas/favoritas salvas). As rotas EN nunca definem `raw.name`, então
  // o fallback para `slugify(raw.displayName)` mantém o comportamento atual
  // para elas.
  const base = raw.name || slugify(raw.displayName);
  const name = freeIdentifier(base, usedNames);
  usedNames.add(name);

  const spell = {
    name,
    displayName: raw.displayName,
    level: raw.level,
    school: raw.school,
    description: raw.description,
  };
  if (raw.ritual) spell.ritual = true;
  if (raw.concentration) spell.concentration = true;
  if (raw.castTime) spell.castTime = raw.castTime;
  if (raw.range) spell.range = raw.range;
  if (raw.components) spell.components = raw.components;
  if (raw.duration) spell.duration = raw.duration;
  if (raw.upgradeDescription) spell.upgradeDescription = raw.upgradeDescription;
  if (raw.source) spell.source = raw.source;
  if (raw.class && raw.class.length) spell.class = raw.class;
  return spell;
}

// ── SRD 5.1 — parser over the Tabyltop/CC-SRD text-dump stream ─────────
//
// The dump is a flat array of PDF-extraction nodes (h1/h2/h3/h4/paragraph/
// table), not one record per spell. Spells live under the "Spell
// Descriptions" h2: each h4 heading followed by a paragraph starting with
// "Nth-level <school>" or "<school> cantrip" begins a new spell; any other
// h4 in that range is a sub-heading belonging to the spell in progress
// (e.g. "Control Weather" has three sub-tables: Precipitation, Temperature,
// Wind — confirmed by direct inspection of the source dump).

function textOf(node) {
  if (!node || !node.subelements) return '';
  return node.subelements.map((s) => s.text).join('');
}

const LEVEL_SCHOOL_RE = /^(\d+)(?:st|nd|rd|th)-level\s+([a-z]+)(\s*\(ritual\))?/i;
const CANTRIP_RE = /^([a-z]+)\s+cantrip(\s*\(ritual\))?/i;
const CASTING_TIME_RE = /^Casting\s*Time\s*:\s*/i;
const RANGE_RE = /^Range\s*:\s*/i;
const COMPONENTS_RE = /^Components?\s*:\s*/i;
const DURATION_LABEL_RE = /^Duration\s*:\s*/i;
const DURATION_VALUE_RE =
  /^(Instantaneous|Special|Until dispelled(?: or triggered)?|(?:Up to )?\d+\s*(?:round|minute|hour|day)s?|Concentration,?\s*up to [A-Za-z0-9]+\s*(?:round|minute|hour|day)s?)\.?/i;
const AT_HIGHER_LEVELS_RE = /^\s*At Higher Levels\.?/i;
// O 5.2 vem da fonte com o cabeçalho enfatizado
// (`<strong><em>At Higher Levels.</em></strong>`); este dump de texto do PDF não
// carrega ênfase nenhuma, então o cabeçalho sairia como texto solto e o app o
// imprimiria ao lado do próprio rótulo de seção. Emitir a MESMA forma dos dois
// lados deixa os packs simétricos e permite que o strip do app case por
// ESTRUTURA, sem precisar de uma lista de rótulos por idioma no código do site.
// Cabe em MODIFICATION_NOTE: é reformatação estrutural, não altera o conteúdo.
function markUpgradeHeading(text) {
  const m = text.match(AT_HIGHER_LEVELS_RE);
  if (!m) return htmlEscape(text);
  const heading = m[0].trim().replace(/\.?$/, '.');
  const rest = text.slice(m[0].length).trim();
  return `<strong><em>${htmlEscape(heading)}</em></strong>${rest ? ` ${htmlEscape(rest)}` : ''}`;
}
// ponytail: the source text stream occasionally splits a label word across a
// PDF page break ("At" / "Higher Levels...", "Casting " / "Time:1 action" —
// both confirmed present in the dump). Merge a lone dangling label fragment
// into the next paragraph before classifying anything.
const DANGLING_LABEL_RE = /^(At|Casting|Range|Components?|Component|Duration)\s*$/i;

function mergeDanglingLabels(nodes) {
  const out = [];
  for (let i = 0; i < nodes.length; i++) {
    const node = nodes[i];
    const next = nodes[i + 1];
    if (
      node.type === 'paragraph' &&
      next &&
      next.type === 'paragraph' &&
      DANGLING_LABEL_RE.test(textOf(node).trim())
    ) {
      out.push({ type: 'paragraph', subelements: [{ text: `${textOf(node).trim()} ${textOf(next)}` }] });
      i++;
      continue;
    }
    out.push(node);
  }
  return out;
}

function tableToHtml(tableNode) {
  const rows = tableNode.rows
    .map((row) => {
      const cells = row
        .map((cell) => {
          const t = htmlEscape(textOf(cell).trim());
          const isHeader = (cell.subelements || []).some((s) => (s.attributes || []).includes('bold'));
          const tag = isHeader ? 'th' : 'td';
          return `<${tag}>${t}</${tag}>`;
        })
        .join('');
      return `<tr>${cells}</tr>`;
    })
    .join('');
  return `<table><tbody>${rows}</tbody></table>`;
}

function findSpellSection(doc) {
  const startIdx = doc.findIndex((n) => n.type === 'h2' && textOf(n).trim() === 'Spell Descriptions');
  if (startIdx === -1) {
    throw new Error('SRD 5.1 parser: could not find the "Spell Descriptions" heading in the source dump.');
  }
  let endIdx = doc.length;
  for (let i = startIdx + 1; i < doc.length; i++) {
    if (doc[i].type === 'h2') {
      endIdx = i;
      break;
    }
  }
  return doc.slice(startIdx + 1, endIdx);
}

function parseSrd51(doc) {
  const section = mergeDanglingLabels(findSpellSection(doc));
  const records = [];
  let current = null;

  for (let i = 0; i < section.length; i++) {
    const node = section[i];

    if (node.type === 'h4') {
      const heading = textOf(node).trim();
      const next = section[i + 1];
      const nextText = next && next.type === 'paragraph' ? textOf(next).trim() : '';
      const levelMatch = nextText.match(LEVEL_SCHOOL_RE);
      const cantripMatch = !levelMatch && nextText.match(CANTRIP_RE);

      if (levelMatch || cantripMatch) {
        if (current) records.push(current);
        current = {
          // Fonte SRD 5.1 traz o título quebrado "See I nvisibility".
          displayName: heading.replace(/^See I nvisibility$/, 'See Invisibility'),
          level: levelMatch ? Number(levelMatch[1]) : 0,
          school: (levelMatch ? levelMatch[2] : cantripMatch[1]).toLowerCase(),
          ritual: Boolean((levelMatch && levelMatch[3]) || (cantripMatch && cantripMatch[2])),
          concentration: false,
          castTime: '',
          range: '',
          components: '',
          duration: '',
          bodyParts: [],
          upgradeParts: [],
          inUpgrade: false,
          source: 'SRD 5.1',
        };
        i++; // consume the level/school paragraph we just matched against
        continue;
      }
      // Sub-heading belonging to the spell in progress (e.g. "Precipitation").
      if (current) current.bodyParts.push(`<h5>${htmlEscape(heading)}</h5>`);
      continue;
    }

    if (!current) continue; // stray content before the first real spell

    if (node.type === 'table') {
      current.bodyParts.push(tableToHtml(node));
      continue;
    }

    if (node.type !== 'paragraph') continue;
    const trimmed = textOf(node).trim();
    if (!trimmed) continue;

    if (CASTING_TIME_RE.test(trimmed)) {
      current.castTime = trimmed.replace(CASTING_TIME_RE, '').trim();
      continue;
    }
    if (RANGE_RE.test(trimmed)) {
      current.range = trimmed.replace(RANGE_RE, '').trim();
      continue;
    }
    if (COMPONENTS_RE.test(trimmed)) {
      current.components = trimmed.replace(COMPONENTS_RE, '').trim();
      continue;
    }
    if (DURATION_LABEL_RE.test(trimmed)) {
      const rest = trimmed.replace(DURATION_LABEL_RE, '');
      const valueMatch = rest.match(DURATION_VALUE_RE);
      if (valueMatch) {
        current.duration = valueMatch[0].replace(/\.$/, '').trim();
        current.concentration = /^Concentration/i.test(current.duration);
        const bodyStart = rest.slice(valueMatch[0].length).trim();
        if (bodyStart) {
          if (AT_HIGHER_LEVELS_RE.test(bodyStart)) {
            current.inUpgrade = true;
            current.upgradeParts.push(`<p>${markUpgradeHeading(bodyStart)}</p>`);
          } else {
            current.bodyParts.push(`<p>${htmlEscape(bodyStart)}</p>`);
          }
        }
      } else {
        // Unknown duration vocabulary — keep the whole line as body text
        // rather than guessing; known gap, see 03-04-SUMMARY.md.
        current.bodyParts.push(`<p>${htmlEscape(rest.trim())}</p>`);
      }
      continue;
    }

    if (AT_HIGHER_LEVELS_RE.test(trimmed)) current.inUpgrade = true;
    const target = current.inUpgrade ? current.upgradeParts : current.bodyParts;
    target.push(`<p>${target === current.upgradeParts ? markUpgradeHeading(trimmed) : htmlEscape(trimmed)}</p>`);
  }
  if (current) records.push(current);

  return records.map((r) => ({
    displayName: r.displayName,
    level: r.level,
    school: r.school,
    ritual: r.ritual,
    concentration: r.concentration,
    castTime: r.castTime,
    range: r.range,
    components: r.components,
    duration: r.duration,
    description: r.bodyParts.join(''),
    upgradeDescription: r.upgradeParts.length ? r.upgradeParts.join('') : null,
    source: r.source,
  }));
}

// ── SRD 5.2 — mapper over dmcb's structured gist ────────────────────────

const ACTION_LABEL = { action: '1 action', bonusAction: '1 bonus action', reaction: '1 reaction' };
const COMPONENT_LABEL = { v: 'V', s: 'S', m: 'M' };

function castTimeOf(s) {
  if (s.castingTime) return s.castingTime;
  const base = ACTION_LABEL[s.actionType] || s.actionType;
  if (s.actionType === 'reaction' && s.castingTrigger) return `${base}, ${s.castingTrigger}`;
  return base;
}

function componentsOf(s) {
  const letters = (s.components || []).map((c) => COMPONENT_LABEL[c] || c.toUpperCase()).join(', ');
  return s.material ? `${letters} (${s.material})` : letters;
}

function durationOf(s) {
  if (s.concentration && !/^concentration/i.test(s.duration)) return `Concentration, ${s.duration}`;
  return s.duration;
}

// Correção documentada da fonte (gist dmcb), não do SRD: o SRD 5.2 dá a Glyph
// of Warding "Duration: Until dispelled or triggered", sem Concentração, mas o
// gist marca `concentration: true` e durationOf produzia "Concentration, Until
// dispelled or triggered" (revisão da fase 07, IN-04/WR-04). Com isto os packs
// EN e pt-BR concordam no selo de Concentração.
const SRD52_SOURCE_FIXES = { 'Glyph of Warding': { concentration: false } };

function parseSrd52(records) {
  return records.map((raw) => {
    const s = Object.hasOwn(SRD52_SOURCE_FIXES, raw.name) ? { ...raw, ...SRD52_SOURCE_FIXES[raw.name] } : raw;
    let upgradeDescription = null;
    if (s.higherLevelSlot) {
      upgradeDescription = `<p><strong><em>At Higher Levels.</em></strong> ${htmlEscape(s.higherLevelSlot)}</p>`;
    } else if (s.cantripUpgrade) {
      upgradeDescription = `<p><strong><em>Cantrip Upgrade.</em></strong> ${htmlEscape(s.cantripUpgrade)}</p>`;
    }
    return {
      displayName: s.name,
      level: s.level,
      school: s.school,
      ritual: Boolean(s.ritual),
      concentration: Boolean(s.concentration),
      castTime: castTimeOf(s),
      range: s.range || '',
      components: componentsOf(s),
      duration: durationOf(s),
      description: `<p>${htmlEscape(s.description)}</p>`,
      upgradeDescription,
      source: 'SRD 5.2',
      class: (s.classes || []).map(capitalize),
    };
  });
}

// ── SRD 5.2 pt-BR — extractor over the versioned Heróis Anônimos recorte ──
//
// scripts/srd-sources/srd-5.2-ptbr-source.json holds one raw Markdown blob
// per spell (metadata line included, never converted). This is the only new
// parsing work this route needs: level/school/class are never derived from
// the pt-BR text — they come from the freshly written srd-2024-en.json by
// slug (facts), so the two packs can never disagree on those facts (D-14).
// Ritual/concentration, by contrast, come from the pt-BR text itself — the
// badge must never contradict the line the player reads.

// htmlEscape primeiro (nenhuma marcação entra sem passar por ele), depois
// `**negrito**` (não guloso), depois `*itálico*` (não guloso). Mesma ordem do
// `mdToHtml` do adaptador do app, mas aqui o pack já entrega HTML pronto — o
// app nunca vê `**` cru vindo deste pack.
function mdInline(text) {
  return htmlEscape(text)
    .replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')
    .replace(/\*([^*]+)\*/g, '<em>$1</em>');
}

// Mesma forma de saída do `tableToHtml` do 5.1 (`<table><tbody>...`), só que
// a partir de linhas de tabela Markdown (`| a | b |`) em vez de nós de PDF.
function mdTableToHtml(lines) {
  const rows = lines.filter((line) => !/^[\s|:-]+$/.test(line));
  const cellsOf = (line) =>
    line
      .trim()
      .replace(/^\||\|$/g, '')
      .split('|')
      .map((c) => c.trim());

  let [headerLine, ...bodyLines] = rows;
  // Bloco de atributos de criatura: a fonte põe 3 atributos lado a lado
  // (12 colunas, "| | | Mod | SG |" x3), largo demais para o painel de
  // detalhe (~350px no celular). Empilha em 4 colunas, um atributo por linha.
  const head = cellsOf(headerLine);
  if (head.length === 12 && /^(\|\s*\|\s*\|\s*\*\*Mod\*\*\s*\|\s*\*\*SG\*\*\s*){3}\|$/.test(headerLine.trim())) {
    headerLine = `|${head.slice(0, 4).join('|')}|`;
    bodyLines = bodyLines.flatMap((line) => {
      const c = cellsOf(line);
      return [0, 4, 8].map((i) => `|${c.slice(i, i + 4).join('|')}|`);
    });
  }
  const headerCells = cellsOf(headerLine)
    .map((c) => `<th>${mdInline(c.replace(/\*\*/g, ''))}</th>`)
    .join('');
  const bodyRows = bodyLines
    .map((line) => `<tr>${cellsOf(line).map((c) => `<td>${mdInline(c)}</td>`).join('')}</tr>`)
    .join('');
  return `<table><tbody><tr>${headerCells}</tr>${bodyRows}</tbody></table>`;
}

const PTBR_METADATA_RE = /^\*(?:\d+[º°]|Truque de)/;
const PTBR_FIELD_PATTERNS = [
  [/^\*\*Tempo de Conjuração:\*\*\s*/, 'castTime'],
  [/^\*\*Alcance:\*\*\s*/, 'range'],
  [/^\*\*Componentes?:\*\*\s*/, 'components'],
  [/^\*\*Duração:\*\*\s*/, 'duration'],
];
const PTBR_UPGRADE_LABELS = ['Usando um Espaço de Magia de Círculo Superior.', 'Aprimoramento de Truque.'];

// Errata da tradução contra o SRD 5.2 em inglês (revisão da fase 07, WR-04).
// Cada patch troca um trecho EXATO do Markdown do recorte; se o trecho sumir
// (o Heróis Anônimos revisou o texto), o gerador para em vez de aplicar o
// patch às cegas — reavalie a entrada. Citada em MODIFICATION_NOTE_PTBR.
// - forcecage: o SRD 5.2 diz "Duration: 1 hour", sem Concentração.
// - call-lightning: faltavam a cláusula da tempestade e o aprimoramento por
//   círculo superior; traduzidos da entrada do SRD 5.2 EN.
const PTBR_ERRATA = {
  forcecage: [['**Duração:** Concentração, até 1 hora', '**Duração:** 1 hora']],
  'call-lightning': [[
    'escolhendo o mesmo ponto ou um diferente.',
    'escolhendo o mesmo ponto ou um diferente. Se você estiver ao ar livre durante uma tempestade quando conjurar esta magia, a magia lhe dá controle sobre essa tempestade em vez de criar uma nova. Nessas condições, o dano da magia aumenta em 1d10.'
      + '\n\n**Usando um Espaço de Magia de Círculo Superior.** O dano aumenta em 1d10 para cada círculo de espaço de magia acima de 3.',
  ]],
};

function applyPtbrErrata(name, markdown) {
  const patches = Object.hasOwn(PTBR_ERRATA, name) ? PTBR_ERRATA[name] : [];
  return patches.reduce((md, [from, to]) => {
    if (md.split(from).length !== 2) {
      throw new Error(`parsePtbr52: errata de '${name}' não achou o trecho exato "${from}" — o recorte mudou, reavalie a errata.`);
    }
    return md.replace(from, () => to);
  }, markdown);
}

function parsePtbr52(source, facts) {
  const missing = [];
  const records = [];

  for (const spell of source.spells) {
    const en = facts.get(spell.name);
    if (!en) {
      missing.push(spell.name);
      continue;
    }

    const chunks = applyPtbrErrata(spell.name, spell.markdown)
      .split(/\n{2,}/)
      .map((c) => c.trim())
      .filter(Boolean);

    let castTime = '';
    let range = '';
    let components = '';
    let duration = '';
    let upgradeDescription = null;
    const parts = [];

    for (let i = 0; i < chunks.length; i++) {
      const chunk = chunks[i];
      if (i === 0 && PTBR_METADATA_RE.test(chunk)) continue; // círculo/escola/classes vêm do EN

      const fieldMatch = PTBR_FIELD_PATTERNS.find(([re]) => re.test(chunk));
      if (fieldMatch) {
        const [re, key] = fieldMatch;
        const value = chunk.replace(re, '').trim();
        if ({ castTime, range, components, duration }[key]) {
          throw new Error(`parsePtbr52: '${spell.name}' tem mais de um trecho de '${key}' — não sobrescrevo em silêncio.`);
        }
        if (key === 'castTime') castTime = value;
        else if (key === 'range') range = value;
        else if (key === 'components') components = value;
        else if (key === 'duration') duration = value;
        continue;
      }

      const upgradeLabel = upgradeDescription === null
        ? PTBR_UPGRADE_LABELS.find((label) => chunk.startsWith(`**${label}**`))
        : undefined;
      if (upgradeLabel) {
        const rest = chunk.slice(`**${upgradeLabel}**`.length).trim();
        upgradeDescription = `<p><strong><em>${mdInline(upgradeLabel)}</em></strong>${rest ? ` ${mdInline(rest)}` : ''}</p>`;
        continue; // trechos seguintes voltam para a description (giant-insect, animate-objects)
      }

      const lines = chunk.split('\n');
      if (lines.every((l) => l.trim().startsWith('|'))) {
        parts.push(mdTableToHtml(lines));
        continue;
      }
      if (lines.every((l) => /^-\s/.test(l.trim()))) {
        const items = lines.map((l) => `<li>${mdInline(l.trim().replace(/^-\s+/, ''))}</li>`).join('');
        parts.push(`<ul>${items}</ul>`);
        continue;
      }
      const h5Match = chunk.match(/^###\s+(.+)$/);
      if (h5Match) {
        parts.push(`<h5>${mdInline(h5Match[1].trim())}</h5>`);
        continue;
      }
      const joined = lines.map((l) => l.trim()).filter(Boolean).join(' ');
      parts.push(`<p>${mdInline(joined)}</p>`);
    }

    if (!castTime || !range || !components || !duration) {
      throw new Error(`parsePtbr52: '${spell.name}' está sem castTime/range/components/duration.`);
    }
    const description = parts.join('');
    if (!description) {
      throw new Error(`parsePtbr52: '${spell.name}' ficou com description vazia.`);
    }

    records.push({
      name: spell.name,
      displayName: spell.displayName,
      level: en.level,
      school: en.school,
      class: en.class,
      ritual: /\bRitual\b/.test(castTime),
      concentration: /^Concentração/.test(duration),
      castTime,
      range,
      components,
      duration,
      description,
      upgradeDescription,
      source: 'SRD 5.2',
    });
  }

  const unusedErrata = Object.keys(PTBR_ERRATA).filter((k) => !source.spells.some((s) => s.name === k));
  if (unusedErrata.length) throw new Error(`parsePtbr52: errata sem magia no recorte: ${unusedErrata.join(', ')}`);
  if (missing.length) {
    throw new Error(
      `parsePtbr52: ${missing.length} magia(s) do recorte sem correspondente no SRD EN: ${missing.join(', ')}`,
    );
  }
  // Igualdade de CONJUNTO, não só de contagem: um slug duplicado + um faltando
  // empatariam no tamanho (e freeIdentifier renomearia o duplicado para x-2).
  const recordNames = new Set(records.map((r) => r.name));
  const absent = [...facts.keys()].filter((k) => !recordNames.has(k));
  if (records.length !== facts.size || recordNames.size !== records.length || absent.length) {
    throw new Error(
      `parsePtbr52: gerou ${records.length} registro(s) (${recordNames.size} distintos), esperado exatamente o conjunto de ${facts.size} slugs do SRD EN; faltando: ${absent.join(', ') || '(nenhum)'}.`,
    );
  }

  return records;
}

// ── editions registry ───────────────────────────────────────────────────

// Extraído da entrada 5.2 EN abaixo para ser reaproveitado (mesmo texto,
// mesmas aspas tipográficas) pela atribuição dupla do pack pt-BR (D-02).
const SRD52_ATTRIBUTION =
  'This work includes material from the System Reference Document 5.2 (“SRD 5.2”) by Wizards of the Coast LLC, available at https://www.dndbeyond.com/srd. Licensed under the Creative Commons Attribution 4.0 International License available at https://creativecommons.org/licenses/by/4.0/legalcode.';

// WR-03 (revisão da fase 07): o gerenciador de pacotes mostra a atribuição como
// texto puro (pre-wrap), então a seção "Licença" do recorte sai sem a sintaxe
// Markdown — as palavras ficam ipsis litteris, só somem os marcadores:
// `[![alt](img)](url)` -> `alt (url)`, `[texto](url)` -> `texto (url)`,
// `**`/`*` de ênfase, `#` de título e linhas `***`. O gate
// check-srd-ptbr-pack.tests.ps1 aplica a mesma normalização na comparação.
function stripLicenseMarkdown(md) {
  return md
    .split('\n')
    .filter((line) => line.trim() !== '***')
    .map((line) => line.replace(/^#+\s+/, ''))
    .join('\n')
    .replace(/\[!\[([^\]]*)\]\([^)]*\)\]\(([^)]*)\)/g, '$1 ($2)')
    .replace(/\[([^\]]*)\]\(([^)]*)\)/g, '$1 ($2)')
    .replace(/\*\*/g, '')
    .replace(/\*([^*\n]+)\*/g, '$1')
    .replace(/\n{3,}/g, '\n\n');
}

const EDITIONS = [
  {
    file: 'packs/srd-2014-en.json',
    source: 'srd-2014-en',
    edition: '2014',
    srdVersion: '5.1',
    sourceUrl: 'https://raw.githubusercontent.com/Tabyltop/CC-SRD/main/SRD5.1-CCBY4.0License-TT.json',
    attribution:
      'This work includes material taken from the System Reference Document 5.1 (“SRD 5.1”) by Wizards of the Coast LLC and available at https://dnd.wizards.com/resources/systems-reference-document. The SRD 5.1 is licensed under the Creative Commons Attribution 4.0 International License available at https://creativecommons.org/licenses/by/4.0/legalcode.',
    modificationNote: MODIFICATION_NOTE_EN,
    extract: parseSrd51,
    // O 5.1 traz a lista por classe num APÊNDICE do PDF ("Spell Lists"), fora da
    // descrição de cada magia — e a extração da Tabyltop corrompe esse apêndice
    // (colapsa as duas colunas: o Bardo sai com 54 das ~110 entradas, e 31
    // magias não aparecem em lista nenhuma). Sem isto, 0 das 319 magias do 5.1
    // tinham classe e o painel mostrava a seção CLASSES vazia.
    //
    // Este arquivo é usado como TRANSCRIÇÃO de conveniência, não como
    // licenciante: o que se extrai dele são as associações magia→classe, que são
    // fatos do SRD 5.1 — documento que a WotC licencia sob CC-BY-4.0 desde
    // jan/2023. A compilação do 5e-bits é oferecida sob OGL 1.0a; não é a
    // compilação deles que entra aqui, e a atribuição do pacote continua sendo à
    // WotC sob CC-BY-4.0. Reverte parcialmente a rejeição de D-06 em
    // .planning/phases/03-srd-pack-import-pipeline/03-SRD-SOURCE.md — leia a
    // emenda registrada lá antes de mexer.
    classListSource: 'srd-2014-en-classlists',
    classListUrl: 'https://raw.githubusercontent.com/5e-bits/5e-database/main/src/2014/en/5e-SRD-Spells.json',
  },
  {
    file: 'packs/srd-2024-en.json',
    source: 'srd-2024-en',
    edition: '2024',
    srdVersion: '5.2',
    sourceUrl: 'https://gist.github.com/dmcb/4b67869f962e3adaa3d0f7e5ca8f4912',
    localSourcePath: 'scripts/srd-sources/srd-5.2-spells.json',
    attribution: SRD52_ATTRIBUTION,
    modificationNote: MODIFICATION_NOTE_EN,
    extract: parseSrd52,
  },
  {
    // Fase 07-traducao-srd-ptbr: tradução de terceiro (Heróis Anônimos,
    // CC-BY-4.0), recortada às 339 magias do SRD 5.2 pelo extrator one-shot
    // scripts/extract-ptbr-source.mjs (fase 07-01). D-03: nenhuma entrada
    // pt-BR para o 5.1 — não existe fonte com licença compatível para ele.
    file: 'packs/srd-2024-ptbr.json',
    source: 'srd-2024-ptbr',
    edition: '2024',
    srdVersion: '5.2',
    lang: 'ptbr',
    packName: 'SRD 5.2 (PT-BR)',
    author: 'Wizards of the Coast LLC; tradução: Heróis Anônimos',
    sourceUrl: 'https://6x.work/heroisanonimos',
    localSourcePath: 'scripts/srd-sources/srd-5.2-ptbr-source.json',
    // D-14: círculo/escola/classes vêm do SRD EN recém-gerado, por slug —
    // nunca do texto traduzido. Resolve resilient-sphere (a tradução diz
    // Abjuração; o SRD diz evocation) por construção.
    factsFrom: 'packs/srd-2024-en.json',
    // D-02: atribuição dupla verbatim — o texto WotC do SRD 5.2 seguido da
    // seção "Licença" do Heróis Anônimos, ambos ipsis litteris (a Licença sem
    // os marcadores Markdown, ver stripLicenseMarkdown).
    // Sem guarda, um recorte sem `license` virava a string "undefined" e
    // passava no schema (é string) — caminho de conformidade de licença.
    attribution: (source) => {
      if (typeof source.license !== 'string' || !source.license.includes('Heróis Anônimos')) {
        throw new Error('srd-2024-ptbr.json: recorte sem a seção "Licença" do Heróis Anônimos (D-02).');
      }
      return `${SRD52_ATTRIBUTION}\n\n${stripLicenseMarkdown(source.license)}`;
    },
    modificationNote: MODIFICATION_NOTE_PTBR,
    extract: parsePtbr52,
  },
];

// ── listas por classe (só o 5.1 precisa; ver classListSource acima) ──────

// Casa por nome normalizado. Se a cobertura não for total o gerador PARA em vez
// de escrever um pacote pela metade: classe faltando numa magia é dado errado
// silencioso, e o usuário confia nisso pra preparar magia.
function applyClassLists(records, classSource, file) {
  const norm = (s) => String(s || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]+/g, '');

  const byName = new Map();
  for (const s of classSource) {
    const classes = (s.classes || []).map((c) => c.name).filter(Boolean);
    if (classes.length) byName.set(norm(s.name), classes);
  }

  const semPar = [];
  for (const r of records) {
    const hit = byName.get(norm(r.displayName));
    if (hit) r.class = hit;
    else semPar.push(r.displayName);
  }
  if (semPar.length) {
    throw new Error(
      `${file}: ${semPar.length} spell(s) found no class list entry — refusing to write a pack with missing class data. ` +
      `First few: ${semPar.slice(0, 5).join(', ')}`,
    );
  }
  return records;
}

// ── fetch/cache ──────────────────────────────────────────────────────────

async function fetchJson(url, cacheName) {
  await mkdir(CACHE_DIR, { recursive: true });
  const cachePath = path.join(CACHE_DIR, `${cacheName}.json`);
  try {
    return JSON.parse(await readFile(cachePath, 'utf8'));
  } catch {
    // not cached yet — fetch live below
  }
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Failed to fetch ${url}: ${res.status} ${res.statusText}`);
  const text = await res.text();
  await writeFile(cachePath, text, 'utf8');
  return JSON.parse(text);
}

async function fetchSource(edition) {
  if (edition.localSourcePath) {
    const text = await readFile(path.join(repoRoot, edition.localSourcePath), 'utf8');
    return JSON.parse(text);
  }
  await mkdir(CACHE_DIR, { recursive: true });
  const cachePath = path.join(CACHE_DIR, `${edition.source}.json`);
  try {
    return JSON.parse(await readFile(cachePath, 'utf8'));
  } catch {
    // not cached yet — fetch live below
  }
  const res = await fetch(edition.sourceUrl);
  if (!res.ok) {
    throw new Error(`Failed to fetch ${edition.sourceUrl}: ${res.status} ${res.statusText}`);
  }
  const text = await res.text();
  await writeFile(cachePath, text, 'utf8');
  return JSON.parse(text);
}

// ── hand-rolled schema validator (D-13: no dependency, mirrors pack.schema.json) ──

function validateValue(value, schema, pathStr, errors) {
  if (!schema || typeof schema !== 'object') return;

  if (schema.type === 'object') {
    if (typeof value !== 'object' || value === null || Array.isArray(value)) {
      errors.push(`${pathStr}: expected object`);
      return;
    }
    for (const req of schema.required || []) {
      if (!(req in value)) errors.push(`${pathStr}.${req}: required field is missing`);
    }
    if (schema.additionalProperties === false) {
      for (const key of Object.keys(value)) {
        if (!schema.properties || !(key in schema.properties)) {
          errors.push(`${pathStr}.${key}: field not declared in pack.schema.json`);
        }
      }
    }
    for (const [key, subSchema] of Object.entries(schema.properties || {})) {
      if (key in value) validateValue(value[key], subSchema, `${pathStr}.${key}`, errors);
    }
    return;
  }

  if (schema.type === 'array') {
    if (!Array.isArray(value)) {
      errors.push(`${pathStr}: expected array`);
      return;
    }
    if (typeof schema.minItems === 'number' && value.length < schema.minItems) {
      errors.push(`${pathStr}: expected at least ${schema.minItems} item(s), got ${value.length}`);
    }
    value.forEach((item, i) => validateValue(item, schema.items, `${pathStr}[${i}]`, errors));
    return;
  }

  if (schema.type === 'string') {
    if (typeof value !== 'string') {
      errors.push(`${pathStr}: expected string`);
      return;
    }
    if (typeof schema.minLength === 'number' && value.length < schema.minLength) {
      errors.push(`${pathStr}: expected length >= ${schema.minLength}`);
    }
    if (schema.pattern && !new RegExp(schema.pattern).test(value)) {
      errors.push(`${pathStr}: does not match pattern ${schema.pattern}`);
    }
    if (schema.enum && !schema.enum.includes(value)) {
      errors.push(`${pathStr}: expected one of [${schema.enum.join(', ')}], got "${value}"`);
    }
    return;
  }

  if (schema.type === 'integer') {
    if (typeof value !== 'number' || !Number.isInteger(value)) {
      errors.push(`${pathStr}: expected integer`);
      return;
    }
    if (typeof schema.minimum === 'number' && value < schema.minimum) errors.push(`${pathStr}: expected >= ${schema.minimum}`);
    if (typeof schema.maximum === 'number' && value > schema.maximum) errors.push(`${pathStr}: expected <= ${schema.maximum}`);
    return;
  }

  if (schema.type === 'boolean') {
    if (typeof value !== 'boolean') errors.push(`${pathStr}: expected boolean`);
    return;
  }

  if (Array.isArray(schema.type)) {
    const ok = schema.type.some((t) => {
      if (t === 'null') return value === null;
      if (t === 'integer') return typeof value === 'number' && Number.isInteger(value);
      return typeof value === t;
    });
    if (!ok) errors.push(`${pathStr}: expected one of types [${schema.type.join(', ')}]`);
  }
}

function validatePackAgainstSchema(pack, schema) {
  const errors = [];
  validateValue(pack, schema, '$', errors);
  return errors;
}

// ── pack assembly ────────────────────────────────────────────────────────

function buildPack(edition, spells, source) {
  if (!edition.modificationNote) {
    throw new Error(`${edition.file}: edition.modificationNote ausente (D-04 exige nota por pacote).`);
  }
  const attribution = typeof edition.attribution === 'function' ? edition.attribution(source) : edition.attribution;
  return {
    meta: {
      source: edition.source,
      name: edition.packName || `SRD ${edition.srdVersion} (EN)`,
      version: edition.srdVersion,
      author: edition.author || 'Wizards of the Coast LLC',
      lang: edition.lang || 'en',
      edition: edition.edition,
      spellCount: spells.length,
      license: {
        id: 'CC-BY-4.0',
        attribution,
        modifications: edition.modificationNote,
        url: 'https://creativecommons.org/licenses/by/4.0/legalcode',
      },
    },
    spells,
  };
}

// ── slugs reservados (D-09, D-15, 08-02) ────────────────────────────────
//
// Fonte única lida tanto pelo app (rename-conflict, 08-04/08-05: um homebrew
// que reusar um destes slugs recebe o prompt de renomear no import) quanto
// por pack-docs.html — evita as duas listas divergirem. Gerada a partir dos
// mesmos 3 pacotes SRD que já estão em disco (não busca rede nem lê os
// spells-5E-*.json, D-05).
function buildReservedSlugs(packs) {
  const packsOut = packs.map((p) => ({ source: p.meta.source, name: p.meta.name }));

  const bySlug = new Map();
  for (const p of packs) {
    for (const spell of p.spells) {
      if (!bySlug.has(spell.name)) bySlug.set(spell.name, []);
      bySlug.get(spell.name).push({ source: p.meta.source, name: spell.displayName || spell.name });
    }
  }

  const slugs = [...bySlug.keys()].sort().map((slug) => ({ slug, in: bySlug.get(slug) }));

  return {
    description:
      'Nomes (name) das magias dos pacotes SRD embutidos no Grimório do Jogador. Um pacote ' +
      'homebrew que declarar um destes slugs recebe, no import, o prompt para renomear antes de ' +
      'gravar. Arquivo GERADO por scripts/generate-srd-pack.mjs — não editar à mão.',
    packs: packsOut,
    slugs,
  };
}

async function writeReservedSlugs() {
  const packs = await Promise.all(
    EDITIONS.map((e) => readFile(path.join(repoRoot, e.file), 'utf8').then(JSON.parse)),
  );
  const reserved = buildReservedSlugs(packs);
  await writeFile(path.join(repoRoot, 'srd-reserved-slugs.json'), `${JSON.stringify(reserved, null, 2)}\n`, 'utf8');
  console.log(`srd-reserved-slugs.json: wrote ${reserved.slugs.length} reserved slug(s) across ${reserved.packs.length} pack(s).`);
}

// ── entry point ──────────────────────────────────────────────────────────

async function main() {
  if (process.argv.includes('--reserved-only')) {
    await writeReservedSlugs();
    return;
  }

  const schema = JSON.parse(await readFile(path.join(repoRoot, 'pack.schema.json'), 'utf8'));

  for (const edition of EDITIONS) {
    const source = await fetchSource(edition);

    // factsFrom (D-14): lê o pack (EN) já escrito nesta mesma execução, por
    // slug — nunca busca fonte externa nova. A ordem de EDITIONS garante que
    // srd-2024-en.json já existe em disco quando a entrada pt-BR chega aqui.
    let facts = null;
    if (edition.factsFrom) {
      const factsPack = JSON.parse(await readFile(path.join(repoRoot, edition.factsFrom), 'utf8'));
      facts = new Map(factsPack.spells.map((s) => [s.name, s]));
    }

    let rawRecords = edition.extract(source, facts);
    if (edition.classListUrl) {
      const classSource = await fetchJson(edition.classListUrl, edition.classListSource);
      rawRecords = applyClassLists(rawRecords, classSource, edition.file);
    }
    const usedNames = new Set();
    const spells = rawRecords.map((r) => toSpell(r, usedNames));
    const pack = buildPack(edition, spells, source);

    const errors = validatePackAgainstSchema(pack, schema);
    if (errors.length) {
      console.error(`${edition.file}: FAILED schema validation, nothing written:`);
      for (const e of errors) console.error(`  - ${e}`);
      process.exitCode = 1;
      return;
    }

    const outPath = path.join(repoRoot, edition.file);
    await writeFile(outPath, `${JSON.stringify(pack, null, 2)}\n`, 'utf8');
    console.log(`${edition.file}: wrote ${spells.length} spells (SRD ${edition.srdVersion}).`);
  }

  await writeReservedSlugs();
}

if (import.meta.url === pathToFileURL(process.argv[1] || '').href) {
  main().catch((err) => {
    console.error(err);
    process.exitCode = 1;
  });
}

export { EDITIONS, validatePackAgainstSchema, buildReservedSlugs };
