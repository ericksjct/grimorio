// scripts/extract-ptbr-source.mjs
//
// One-shot script, run by hand ONLY (D-17):
//   node scripts/extract-ptbr-source.mjs
// Never invoked by generate-srd-pack.mjs, never loaded by the browser/sw.js.
//
// Reads the complete Heróis Anônimos translation of the D&D 2024 Player's
// Handbook (docs/superpowers/herois_anonimos/*.md — .gitignore'd, the whole
// PHB, and it NEVER enters the repository, D-02), the local legacy fixture
// (scripts/build-legacy-fixtures.mjs' output, D-09), the hand-paired table
// (scripts/srd-sources/srd-5.2-ptbr-pairing.json, D-12) and srd-2024-en.json
// (the slug/level/school/class set the SRD 5.2 pack must match, D-01).
//
// Writes ONLY the licensed slice this phase is allowed to version: the
// verbatim "Licença" section plus the 339 SRD 5.2 spell blocks, paired to
// their EN slug, stripped of PHB illustration captions and PHB proper names
// (D-16/D-18) — to scripts/srd-sources/srd-5.2-ptbr-source.json.
//
// Re-run by hand if/when the Heróis Anônimos document is revised (it is in
// continuous revision per its own changelog) — this script never fetches
// anything live, and generate-srd-pack.mjs (07-02) never reads the Markdown
// above, only the output of this script.

import { readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(__dirname, '..');

const SOURCE_MD = path.join(
  repoRoot, 'docs', 'superpowers', 'herois_anonimos',
  'D&D 5.5 - Livro do Jogador (2024) 5.3.7.md',
);
const FIXTURE_PATH = path.join(repoRoot, '.cache', 'legacy-fixtures', 'spells-5E-2024-PTBR.pack.json');
const PAIRING_PATH = path.join(repoRoot, 'scripts', 'srd-sources', 'srd-5.2-ptbr-pairing.json');
const EN_PACK_PATH = path.join(repoRoot, 'srd-2024-en.json');
const OUT_PATH = path.join(repoRoot, 'scripts', 'srd-sources', 'srd-5.2-ptbr-source.json');

const BANNED_NAMES = [
  'Bigby', 'Tasha', 'Otiluke', 'Mordenkainen', 'Melf', 'Leomund',
  'Rary', 'Evard', 'Drawmij', 'Tenser', 'Nystul', 'Otto',
];

const SCHOOL_PT_EN = {
  'Abjuração': 'abjuration',
  'Adivinhação': 'divination',
  'Encantamento': 'enchantment',
  'Evocação': 'evocation',
  'Ilusão': 'illusion',
  'Invocação': 'conjuration',
  'Necromancia': 'necromancy',
  'Transmutação': 'transmutation',
};

const CLASS_PT_EN = {
  'Bardo': 'Bard',
  'Bruxo': 'Warlock',
  'Clérigo': 'Cleric',
  'Druida': 'Druid',
  'Feiticeiro': 'Sorcerer',
  'Guardião': 'Ranger',
  'Mago': 'Wizard',
  'Paladino': 'Paladin',
};

const META_LEVEL_RE = /^\*(\d+)[º°] Círculo, (.+?) \((.+?)\)\*$/;
const META_CANTRIP_RE = /^\*Truque de (.+?) \((.+?)\)\*$/;

// ── small helpers ────────────────────────────────────────────────────────

function isNoiseChunk(chunk) {
  return chunk === '***' || /^[A-Z]$/.test(chunk);
}

// Groups an array of already-trimmed lines into paragraphs separated by one
// or more blank lines, discarding letter-divider/*** noise chunks (D-18,
// "Divisores de letra" fact) wherever in the block they fall.
function chunkify(lines) {
  const joined = lines.join('\n');
  return joined
    .split(/\n{2,}/)
    .map((c) => c.trim())
    .filter((c) => c.length > 0 && !isNoiseChunk(c));
}

function parseMeta(chunk) {
  const mLevel = chunk.match(META_LEVEL_RE);
  if (mLevel) {
    return { level: Number(mLevel[1]), schoolPt: mLevel[2], classesPt: mLevel[3].split(',').map((c) => c.trim()) };
  }
  const mCantrip = chunk.match(META_CANTRIP_RE);
  if (mCantrip) {
    return { level: 0, schoolPt: mCantrip[1], classesPt: mCantrip[2].split(',').map((c) => c.trim()) };
  }
  return null;
}

function normalizeForOracle(s) {
  return s
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/gi, ' ')
    .replace(/&amp;/gi, '&')
    .replace(/&lt;/gi, '<')
    .replace(/&gt;/gi, '>')
    .replace(/\*/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

function firstFixtureParagraph(descriptionHtml) {
  const m = String(descriptionHtml || '').match(/<p>([\s\S]*?)<\/p>/);
  return m ? normalizeForOracle(m[1]) : '';
}

// ── main ─────────────────────────────────────────────────────────────────

async function main() {
  let fixtureRaw;
  try {
    fixtureRaw = await readFile(FIXTURE_PATH, 'utf8');
  } catch {
    throw new Error(
      `Fixture não encontrado em ${FIXTURE_PATH} — rode primeiro: node scripts/build-legacy-fixtures.mjs`,
    );
  }
  const fixture = JSON.parse(fixtureRaw);
  const pairing = JSON.parse(await readFile(PAIRING_PATH, 'utf8'));
  const enPack = JSON.parse(await readFile(EN_PACK_PATH, 'utf8'));
  const enByName = new Map(enPack.spells.map((s) => [s.name, s]));

  const rawText = (await readFile(SOURCE_MD, 'utf8')).replace(/\r\n/g, '\n');
  const lines = rawText.split('\n');

  // ── 1. Licença (D-02), verbatim ─────────────────────────────────────────
  const licStart = lines.findIndex((l) => l.trim() === '## Licença');
  const prefIdx = lines.findIndex((l) => l.trim() === '# Prefácio');
  if (licStart === -1 || prefIdx === -1 || prefIdx <= licStart) {
    throw new Error('Não encontrei a seção "## Licença" ou "# Prefácio" no Markdown-fonte.');
  }
  const licenseLines = lines.slice(licStart, prefIdx);
  while (licenseLines.length && licenseLines[licenseLines.length - 1].trim() === '') licenseLines.pop();
  const license = licenseLines.join('\n');
  if (!license.includes('Versão Brasileira (Heróis Anônimos)') || !license.includes('6x.work/heroisanonimos')) {
    throw new Error('Seção de Licença extraída não contém o crédito esperado do Heróis Anônimos.');
  }

  // ── 2. Capítulo "Descrições da Magias" ──────────────────────────────────
  const chapStart = lines.findIndex((l) => l.trim() === '# Descrições da Magias');
  if (chapStart === -1) throw new Error('Não encontrei "# Descrições da Magias" no Markdown-fonte.');
  let chapEnd = lines.length;
  for (let i = chapStart + 1; i < lines.length; i++) {
    if (/^# /.test(lines[i])) { chapEnd = i; break; }
  }
  const chapter = lines.slice(chapStart + 1, chapEnd);

  // ── 3. Blocos por magia (só "## ", nunca "### ") ────────────────────────
  const headingIdx = [];
  for (let i = 0; i < chapter.length; i++) {
    if (/^## /.test(chapter[i])) headingIdx.push(i);
  }
  const rawBlocks = [];
  for (let i = 0; i < headingIdx.length; i++) {
    const start = headingIdx[i];
    const end = i + 1 < headingIdx.length ? headingIdx[i + 1] : chapter.length;
    const headingText = chapter[start].replace(/^## /, '').trim();
    if (!headingText) continue; // glitch heading, not a spell
    const bodyLines = chapter.slice(start + 1, end).map((l) => l.trim());
    rawBlocks.push({ headingText, chunks: chunkify(bodyLines) });
  }
  if (rawBlocks.length !== 391) {
    throw new Error(`Esperava 391 blocos de magia com texto, encontrei ${rawBlocks.length}.`);
  }

  // ── 4. Trecho de metadado por bloco; descarta legenda posicional (D-18) ─
  const noMeta = [];
  for (const block of rawBlocks) {
    const metaIdx = block.chunks.findIndex((c) => parseMeta(c) !== null);
    if (metaIdx === -1) { noMeta.push(block.headingText); continue; }
    block.metaIdx = metaIdx;
    block.hadCaption = metaIdx > 0;
    block.meta = parseMeta(block.chunks[metaIdx]);
    block.kept = block.chunks.slice(metaIdx);
  }
  if (noMeta.length) {
    throw new Error(`${noMeta.length} bloco(s) sem linha de metadado (círculo/truque): ${noMeta.slice(0, 10).join(', ')}`);
  }

  // ── 5. Pareamento nome PT -> slug EN (D-11/D-12) ────────────────────────
  const manualByPhb = new Map(pairing.renamed.map((r) => [r.phbName, r]));
  const autoByDisplayName = new Map(fixture.spells.map((s) => [s.displayName, s.name]));
  const fixtureBySlug = new Map(fixture.spells.map((s) => [s.name, s]));

  for (const block of rawBlocks) {
    const manual = manualByPhb.get(block.headingText);
    if (manual) {
      block.slug = manual.name;
      block.displayName = manual.displayName;
      block.isManual = true;
    } else {
      const autoSlug = autoByDisplayName.get(block.headingText);
      if (autoSlug) {
        block.slug = autoSlug;
        block.displayName = block.headingText;
        block.isManual = false;
      }
    }
  }

  const kept = rawBlocks.filter((b) => b.slug && enByName.has(b.slug));
  const seenSlugs = new Map();
  for (const b of kept) {
    if (seenSlugs.has(b.slug)) {
      throw new Error(`Slug duplicado '${b.slug}': '${seenSlugs.get(b.slug)}' e '${b.headingText}' caíram no mesmo par.`);
    }
    seenSlugs.set(b.slug, b.headingText);
  }
  const missing = [...enByName.keys()].filter((n) => !seenSlugs.has(n));
  if (missing.length) {
    throw new Error(`${missing.length} magia(s) de srd-2024-en.json sem bloco pareado: ${missing.slice(0, 10).join(', ')}`);
  }

  // ── 6. Troca de nomes próprios (D-16) + varredura de banidos ────────────
  const bannedRe = new RegExp(`\\b(${BANNED_NAMES.join('|')})\\b`);
  const bannedHits = [];
  for (const b of kept) {
    let text = b.kept.join('\n\n');
    for (const [phb, disp] of [...manualByPhb.values()].map((r) => [r.phbName, r.displayName])) {
      text = text.split(phb).join(disp);
    }
    b.markdown = text;
    if (bannedRe.test(b.displayName) || bannedRe.test(b.markdown)) {
      bannedHits.push(b.slug);
    }
  }
  if (bannedHits.length) {
    throw new Error(`Nome próprio banido (D-16) sobreviveu em: ${bannedHits.join(', ')}`);
  }

  // ── 7. Validação do par contra srd-2024-en.json (D-11/D-12) ────────────
  const schoolDivergences = [];
  const badPairs = [];
  for (const b of kept) {
    const en = enByName.get(b.slug);
    const schoolEn = SCHOOL_PT_EN[b.meta.schoolPt];
    const classesEn = b.meta.classesPt.map((c) => CLASS_PT_EN[c]);
    if (!schoolEn) throw new Error(`Escola desconhecida '${b.meta.schoolPt}' em '${b.headingText}'.`);
    if (classesEn.some((c) => !c)) throw new Error(`Classe desconhecida em '${b.headingText}': ${b.meta.classesPt.join(', ')}`);

    if (b.meta.level !== en.level) badPairs.push(`${b.slug}: círculo ${b.meta.level} != EN ${en.level}`);
    const gotSorted = [...classesEn].sort().join(',');
    const wantSorted = [...(en.class || [])].sort().join(',');
    if (gotSorted !== wantSorted) badPairs.push(`${b.slug}: classes [${gotSorted}] != EN [${wantSorted}]`);
    if (schoolEn !== en.school) schoolDivergences.push(b.slug);
  }
  if (badPairs.length) {
    throw new Error(`Par nome<->slug incorreto (círculo/classes não batem com o EN):\n  ${badPairs.join('\n  ')}`);
  }

  // ── 8. Oráculo D-19, só nos pareados automaticamente ────────────────────
  let oracleTotal = 0;
  let oracleMatches = 0;
  const oracleDivergent = [];
  for (const b of kept) {
    if (b.isManual) continue;
    oracleTotal++;
    const durIdx = b.kept.findIndex((c) => /^\*\*Duração:\*\*/.test(c));
    const oursRaw = durIdx !== -1 && durIdx + 1 < b.kept.length ? b.kept[durIdx + 1] : '';
    const ours = normalizeForOracle(oursRaw);
    const legacy = fixtureBySlug.get(b.slug);
    const legacyFirst = legacy ? firstFixtureParagraph(legacy.description) : '';
    if (ours && legacy && ours === legacyFirst) {
      oracleMatches++;
    } else {
      oracleDivergent.push(b.slug);
    }
  }
  console.log(`D-19 oráculo: ${oracleMatches}/${oracleTotal} primeiras frases idênticas ao parse legado`);
  if (oracleDivergent.length) {
    console.log(`  Divergentes: ${oracleDivergent.join(', ')}`);
  }
  if (oracleMatches < 300) {
    throw new Error(`Oráculo D-19 abaixo do mínimo: ${oracleMatches}/${oracleTotal} (esperado >= 300).`);
  }

  // ── 9. Gravar o recorte ─────────────────────────────────────────────────
  const spells = kept
    .map((b) => ({ name: b.slug, displayName: b.displayName, markdown: b.markdown }))
    .sort((a, c) => a.name.localeCompare(c.name));

  const capturedAt = new Date().toISOString().slice(0, 10);
  const out = {
    source: {
      title: 'Livro do Jogador (SRD Traduzido e organizado) 2024',
      publisher: 'Heróis Anônimos',
      url: 'https://6x.work/heroisanonimos',
      version: '07/03/2025',
      license: 'CC-BY-4.0',
      capturedAt,
    },
    license,
    spells,
  };
  await writeFile(OUT_PATH, `${JSON.stringify(out, null, 2)}\n`, 'utf8');

  // ── 10. Resumo ───────────────────────────────────────────────────────────
  const captionCount = kept.filter((b) => b.hadCaption).length;
  const manualCount = kept.filter((b) => b.isManual).length;
  console.log(`Blocos totais: ${rawBlocks.length}`);
  console.log(`Mantidos: ${kept.length} (${kept.length - manualCount} automáticos + ${manualCount} manuais)`);
  console.log(`Descartados fora do SRD: ${rawBlocks.length - kept.length}`);
  console.log(`Legendas descartadas: ${captionCount}`);
  console.log(`Divergências de escola: ${schoolDivergences.length ? schoolDivergences.join(', ') : '(nenhuma)'}`);
  console.log(`${OUT_PATH}: ${spells.length} magias gravadas.`);
}

if (import.meta.url === pathToFileURL(process.argv[1] || '').href) {
  main().catch((err) => {
    console.error(err);
    process.exitCode = 1;
  });
}
