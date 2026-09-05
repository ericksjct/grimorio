// scripts/generate-srd-pack.mjs
//
// One-shot generator, run by hand OUTSIDE the app runtime:
//   node scripts/generate-srd-pack.mjs
// The app has no build step and must never gain one — this file is never
// loaded by the browser, never referenced from index.html/sw.js.
//
// Produces the two embedded SRD packs at the repo root (srd-2014-en.json,
// srd-2024-en.json), in the format defined by pack.schema.json.
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
//
// Re-run when the SRD text is updated (WotC errata) or a source moves.
//
// D-05 (locked): no byte of description text from spells-5E-*.json ever
// enters these packs. The two sources above are the ONLY input; this script
// never reads any spells-5E-*.json file.

import { readFile, writeFile, mkdir } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(__dirname, '..');
const CACHE_DIR = path.join(repoRoot, '.cache', 'srd-sources');

const MODIFICATION_NOTE =
  'Texto reformatado para JSON e HTML estrutural; conteúdo da magia não foi alterado.';

// ── shared helpers ──────────────────────────────────────────────────────

function slugify(name) {
  return name
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/'/g, '')
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
  const base = slugify(raw.displayName);
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
          displayName: heading,
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

function parseSrd52(records) {
  return records.map((s) => {
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

// ── editions registry ───────────────────────────────────────────────────

const EDITIONS = [
  {
    file: 'srd-2014-en.json',
    source: 'srd-2014-en',
    edition: '2014',
    srdVersion: '5.1',
    sourceUrl: 'https://raw.githubusercontent.com/Tabyltop/CC-SRD/main/SRD5.1-CCBY4.0License-TT.json',
    attribution:
      'This work includes material taken from the System Reference Document 5.1 (“SRD 5.1”) by Wizards of the Coast LLC and available at https://dnd.wizards.com/resources/systems-reference-document. The SRD 5.1 is licensed under the Creative Commons Attribution 4.0 International License available at https://creativecommons.org/licenses/by/4.0/legalcode.',
    extract: parseSrd51,
  },
  {
    file: 'srd-2024-en.json',
    source: 'srd-2024-en',
    edition: '2024',
    srdVersion: '5.2',
    sourceUrl: 'https://gist.github.com/dmcb/4b67869f962e3adaa3d0f7e5ca8f4912',
    localSourcePath: 'scripts/srd-sources/srd-5.2-spells.json',
    attribution:
      'This work includes material from the System Reference Document 5.2 (“SRD 5.2”) by Wizards of the Coast LLC, available at https://www.dndbeyond.com/srd. Licensed under the Creative Commons Attribution 4.0 International License available at https://creativecommons.org/licenses/by/4.0/legalcode.',
    extract: parseSrd52,
  },
];

// ── fetch/cache ──────────────────────────────────────────────────────────

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

function buildPack(edition, spells) {
  return {
    meta: {
      source: edition.source,
      name: `SRD ${edition.srdVersion} (EN)`,
      version: edition.srdVersion,
      author: 'Wizards of the Coast LLC',
      lang: 'en',
      edition: edition.edition,
      spellCount: spells.length,
      license: {
        id: 'CC-BY-4.0',
        attribution: edition.attribution,
        modifications: MODIFICATION_NOTE,
        url: 'https://creativecommons.org/licenses/by/4.0/legalcode',
      },
    },
    spells,
  };
}

// ── entry point ──────────────────────────────────────────────────────────

async function main() {
  const schema = JSON.parse(await readFile(path.join(repoRoot, 'pack.schema.json'), 'utf8'));

  for (const edition of EDITIONS) {
    const source = await fetchSource(edition);
    const rawRecords = edition.extract(source);
    const usedNames = new Set();
    const spells = rawRecords.map((r) => toSpell(r, usedNames));
    const pack = buildPack(edition, spells);

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
}

if (import.meta.url === pathToFileURL(process.argv[1] || '').href) {
  main().catch((err) => {
    console.error(err);
    process.exitCode = 1;
  });
}

export { EDITIONS };
