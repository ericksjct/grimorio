// scripts/build-legacy-fixtures.mjs
//
// One-shot generator, run by hand OUTSIDE the app runtime:
//   node scripts/build-legacy-fixtures.mjs
// Never loaded by the browser, never referenced from index.html/sw.js.
//
// Purpose (D-09): regenerate the 4 legacy spells-5E-*.json datasets — deleted
// from the repo by Phase 6 (commit 98740fe) — in pack.schema.json shape, as a
// LOCAL test fixture only. Never published, never content the app fetches.
//
// Protection (D-10): the ONLY guard is .gitignore's `.cache/` entry. There is
// no static gate backing this up (the user considered and declined one) — do
// NOT `git add -f` any file under OUT_DIR, and do NOT change OUT_DIR to a path
// outside `.cache/`. Nothing will warn you if either happens.
//
// Origin: commit '98740fe^' (the parent of the commit where Phase 6 deleted
// the 4 files). Recovered via `git show <commit>:<file>`, not by fetch.

import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { execFileSync } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { validatePackAgainstSchema } from './generate-srd-pack.mjs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(__dirname, '..');

const LEGACY_COMMIT = '98740fe^';
const LEGACY_FILES = [
  'spells-5E-2024-PTBR.json',
  'spells-5E-2014-PTBR.json',
  'spells-5E-2024-EN.json',
  'spells-5E-2014-EN.json',
];
const OUT_DIR = path.join(repoRoot, '.cache', 'legacy-fixtures');

function normalizeSpell(raw) {
  const spell = {};
  for (const [key, value] of Object.entries(raw)) {
    if (value === null) continue; // drop null-valued keys (statBlock, upgradeDescription, ...)
    if (key === 'statBlock' && typeof value !== 'string') continue; // drop non-string statBlock
    spell[key] = value;
  }
  return spell;
}

function metaFor(file, spellCount) {
  const base = file.replace(/\.json$/, '');
  const lower = base.toLowerCase();
  return {
    source: `fixture-${lower}`,
    name: `FIXTURE LOCAL — ${file} (não distribuir)`,
    version: '0',
    author: 'fixture local (Fase 7, D-09)',
    lang: lower.includes('ptbr') ? 'ptbr' : 'en',
    edition: lower.includes('2024') ? '2024' : '2014',
    spellCount,
    license: {
      id: 'proprietary',
      attribution:
        'Fixture local de teste regenerada do histórico do git (98740fe^). ' +
        'Procedência protegida — nunca versionar, nunca publicar (Fase 7, D-09/D-10).',
    },
  };
}

async function main() {
  const schema = JSON.parse(await readFile(path.join(repoRoot, 'pack.schema.json'), 'utf8'));
  await mkdir(OUT_DIR, { recursive: true });

  for (const file of LEGACY_FILES) {
    const text = execFileSync('git', ['show', `${LEGACY_COMMIT}:${file}`], {
      cwd: repoRoot,
      encoding: 'utf8',
      maxBuffer: 64 * 1024 * 1024,
    });
    const json = JSON.parse(text);
    const rawSpells = Array.isArray(json) ? json : json.spells;
    const spells = rawSpells.map(normalizeSpell);
    const pack = { meta: metaFor(file, spells.length), spells };

    const errors = validatePackAgainstSchema(pack, schema);
    if (errors.length) {
      console.error(`${file}: FAILED schema validation, nothing written:`);
      for (const e of errors.slice(0, 10)) console.error(`  - ${e}`);
      process.exitCode = 1;
      continue;
    }

    const outName = `${file.replace(/\.json$/, '')}.pack.json`;
    const outPath = path.join(OUT_DIR, outName);
    await writeFile(outPath, JSON.stringify(pack), 'utf8');
    console.log(`${file}: ${spells.length} magias -> .cache/legacy-fixtures/${outName}`);
  }
}

if (import.meta.url === pathToFileURL(process.argv[1] || '').href) {
  main().catch((err) => {
    console.error(err);
    process.exitCode = 1;
  });
}
