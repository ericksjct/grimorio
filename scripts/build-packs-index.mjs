// Gera packs/index.js — o manifesto dos pacotes embutidos.
//
// Todo `packs/*.json` (formato pack.schema.json) é um pacote embutido: o menu só
// mostra o que está nessa pasta + o que o usuário instala. Pra adicionar um,
// copie o JSON pra packs/ e rode `npm run packs` (ou `node scripts/build-packs-index.mjs`);
// depois commite o JSON e o index.js. `scripts/check-packs-index.tests.ps1` falha
// se o manifesto estiver desatualizado.
//
// index.js é um script clássico (carrega síncrono antes do loader e também via
// importScripts no service worker) — daí o globalThis em vez de window.
import { existsSync } from 'node:fs';
import { readdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const dir = path.join(path.dirname(fileURLToPath(import.meta.url)), '..', 'packs');

const files = (await readdir(dir)).filter((f) => f.endsWith('.json'));
const entries = [];
for (const f of files) {
  const { meta } = JSON.parse(await readFile(path.join(dir, f), 'utf8'));
  const base = meta.name.replace(/\s*\(.*\)/, '');
  entries.push({
    key: meta.source,
    source: 'fetch',
    file: 'packs/' + f,
    lang: meta.lang,
    edition: meta.edition ? '5e ' + meta.edition : '',
    // corpus 'srd' = bases embutidos (comparador de edicao); adicional embutido e 'pack'.
    corpus: meta.role === 'additional' ? 'pack' : 'srd',
    role: meta.role === 'additional' ? 'additional' : 'base',
    base: meta.base,
    labelPt: meta.name,
    labelEn: meta.name,
    // Miniatura opcional: packs/<mesmo-nome>.png (ou .webp/.jpg) ao lado do JSON.
    image: ['png', 'webp', 'jpg'].map((e) => f.replace(/\.json$/, '.' + e)).find((n) => existsSync(path.join(dir, n))),
    short: meta.lang === 'ptbr' ? base + ' PT' : base,
  });
}
// Ordem é semântica no loader: índice 0 = fallback; 1º 'en' = default de navegador EN.
// Bases antes de adicionais, EN antes de PT, edição mais nova primeiro.
entries.sort((a, b) => (a.role === 'base' ? 0 : 1) - (b.role === 'base' ? 0 : 1)
  || (a.lang === 'en' ? 0 : 1) - (b.lang === 'en' ? 0 : 1)
  || b.edition.localeCompare(a.edition) || a.key.localeCompare(b.key));

const out = '// GERADO por scripts/build-packs-index.mjs — não editar à mão.\n'
  + 'globalThis.BUILTIN_PACKS = ' + JSON.stringify(entries, null, 2) + ';\n';
await writeFile(path.join(dir, 'index.js'), out);
console.log(`packs/index.js: ${entries.length} pacote(s).`);
