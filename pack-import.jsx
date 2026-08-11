// Pack Import — camada de validação, sanitização e instalação de pacotes de
// magias BYOD (PKG-02, PKG-03, PKG-04, PKG-05).
//
// Este módulo possui: leitura defensiva de texto JSON de pacote
// (parsePackText), validação de schema escrita à mão (validatePack)
// espelhando pack.schema.json, cálculo puro de identificador livre
// (freeIdentifier, D-09), leitura de arquivo local e busca por URL com teto
// de tamanho nos dois caminhos (_readFileText, _fetchText, D-08),
// sanitização de HTML com DOMPurify (sanitizePack, PKG-05) e o funil único de
// instalação (installFromFile, installFromUrl) que lê, valida, sanitiza e
// grava — nessa ordem, com uma única gravação.
//
// Este módulo NÃO possui: não abre IndexedDB por conta própria — toda
// gravação passa por window.pluginStore (plugin-store.jsx); não normaliza
// magia — adaptSpells() no loader continua o único ponto de normalização do
// app.
//
// Uso: incluir este arquivo no HTML depois de plugin-store.jsx (a instalação
// usa window.pluginStore) e depois do script do DOMPurify.

// ──────────────────────────────────────────────────────────────────
// CONSTANTES
// ──────────────────────────────────────────────────────────────────

// Teto de D-08. Medido em BYTES do arquivo/resposta, nunca em número de
// caracteres — os arquivos de magias do próprio app têm 580-750 KB, então
// 10 MB é folga larga.
const MAX_PACK_BYTES = 10 * 1024 * 1024;

// As três chaves proibidas de D-11 (poluição de protótipo, T-03-08).
const BLOCKED_KEYS = Object.freeze(['__proto__', 'constructor', 'prototype']);

// A camada de UI traduz código para texto bilíngue via i18n.jsx; este módulo
// não conhece idioma.
const PACK_ERROR_CODES = Object.freeze({
  MALFORMED_JSON: 'malformed-json',
  BLOCKED_KEY: 'blocked-key',
  TOO_LARGE: 'too-large',
  SCHEMA_INVALID: 'schema-invalid',
  FETCH_FAILED: 'fetch-failed',
});

// ──────────────────────────────────────────────────────────────────
// TABELAS DE CAMPO — mecanismo de sincronia com pack.schema.json (D-13).
// Cada entrada é { key, type, required, ...qualificadores }. Divergência
// entre estas tabelas e pack.schema.json quebra
// scripts/check-pack-validator.tests.ps1.
// ──────────────────────────────────────────────────────────────────

const META_FIELDS = [
  { key: 'source', type: 'string', required: true, pattern: /^[a-z0-9][a-z0-9-]{0,63}$/ },
  { key: 'name', type: 'string', required: true, minLength: 1 },
  { key: 'version', type: 'string', required: true, minLength: 1 },
  { key: 'author', type: 'string', required: true, minLength: 1 },
  { key: 'lang', type: 'string', required: true, enum: ['ptbr', 'en'] },
  { key: 'edition', type: 'string', required: false },
  { key: 'spellCount', type: 'integer', required: false },
  { key: 'license', type: 'object', required: true },
];

const LICENSE_FIELDS = [
  { key: 'id', type: 'string', required: true, minLength: 1 },
  { key: 'attribution', type: 'string', required: true, minLength: 1 },
  { key: 'modifications', type: 'string', required: false },
  { key: 'url', type: 'string', required: false },
];

const SPELL_FIELDS = [
  { key: 'name', type: 'string', required: true, minLength: 1 },
  { key: 'displayName', type: 'string', required: false },
  { key: 'level', type: 'integer', required: true, min: 0, max: 9 },
  { key: 'school', type: 'string', required: true, minLength: 1 },
  { key: 'description', type: 'string', required: true },
  { key: 'upgradeDescription', type: 'string', required: false },
  { key: 'statBlock', type: 'string|null', required: false },
  { key: 'ritual', type: 'boolean', required: false },
  { key: 'concentration', type: 'boolean', required: false },
  { key: 'castTime', type: 'string', required: false },
  { key: 'castTimeNote', type: 'string', required: false },
  { key: 'range', type: 'string', required: false },
  { key: 'components', type: 'string', required: false },
  { key: 'componentsNote', type: 'string', required: false },
  { key: 'duration', type: 'string', required: false },
  { key: 'source', type: 'string', required: false },
  { key: 'class', type: 'string[]', required: false },
  { key: 'classNote', type: 'string[]', required: false },
  { key: 'url', type: 'string', required: false },
];

// ──────────────────────────────────────────────────────────────────
// HELPER DE ERRO — todo throw deste módulo passa por aqui, para que a UI
// sempre tenha um .code para mapear.
// ──────────────────────────────────────────────────────────────────
function _fail(code, message) {
  const err = new Error(message);
  err.code = code;
  throw err;
}

// ──────────────────────────────────────────────────────────────────
// PARSE DEFENSIVO — a única chamada a JSON.parse do arquivo.
// ──────────────────────────────────────────────────────────────────
function parsePackText(text) {
  let result;
  try {
    result = JSON.parse(text, (key, value) => {
      if (BLOCKED_KEYS.indexOf(key) !== -1) {
        // Bloqueia durante a construção do objeto, em qualquer nível de
        // aninhamento (D-13) — não numa varredura posterior.
        _fail(PACK_ERROR_CODES.BLOCKED_KEY, `packImport.parse: chave bloqueada encontrada: ${key}`);
      }
      return value;
    });
  } catch (err) {
    // O erro lançado pelo reviver já tem .code (blocked-key) e precisa
    // atravessar este catch sem ser reclassificado como JSON malformado.
    if (err && err.code) throw err;
    _fail(PACK_ERROR_CODES.MALFORMED_JSON, `packImport.parse: JSON malformado — ${err && err.message}`);
  }

  if (!result || typeof result !== 'object' || Array.isArray(result)) {
    _fail(PACK_ERROR_CODES.SCHEMA_INVALID, 'packImport.validate: o pacote precisa ser um objeto JSON, não array nem valor primitivo.');
  }

  return result;
}

// ──────────────────────────────────────────────────────────────────
// VALIDADOR DE SCHEMA ESCRITO À MÃO (D-13)
// ──────────────────────────────────────────────────────────────────

// Valida UM valor contra UMA entrada de tabela de campo.
function _checkField(path, spec, value) {
  switch (spec.type) {
    case 'string': {
      if (typeof value !== 'string') _fail(PACK_ERROR_CODES.SCHEMA_INVALID, `packImport.validate: ${path} precisa ser uma string.`);
      if (spec.minLength !== undefined && value.length < spec.minLength) _fail(PACK_ERROR_CODES.SCHEMA_INVALID, `packImport.validate: ${path} precisa ter ao menos ${spec.minLength} caractere(s).`);
      if (spec.pattern && !spec.pattern.test(value)) _fail(PACK_ERROR_CODES.SCHEMA_INVALID, `packImport.validate: ${path} não bate com o formato esperado.`);
      if (spec.enum && spec.enum.indexOf(value) === -1) _fail(PACK_ERROR_CODES.SCHEMA_INVALID, `packImport.validate: ${path} precisa ser um dos valores: ${spec.enum.join(', ')}.`);
      break;
    }
    case 'integer': {
      if (typeof value !== 'number' || !Number.isInteger(value)) _fail(PACK_ERROR_CODES.SCHEMA_INVALID, `packImport.validate: ${path} precisa ser um número inteiro.`);
      if (spec.min !== undefined && value < spec.min) _fail(PACK_ERROR_CODES.SCHEMA_INVALID, `packImport.validate: ${path} precisa ser >= ${spec.min}.`);
      if (spec.max !== undefined && value > spec.max) _fail(PACK_ERROR_CODES.SCHEMA_INVALID, `packImport.validate: ${path} precisa ser <= ${spec.max}.`);
      break;
    }
    case 'boolean': {
      if (typeof value !== 'boolean') _fail(PACK_ERROR_CODES.SCHEMA_INVALID, `packImport.validate: ${path} precisa ser booleano.`);
      break;
    }
    case 'string[]': {
      if (!Array.isArray(value) || !value.every((v) => typeof v === 'string')) _fail(PACK_ERROR_CODES.SCHEMA_INVALID, `packImport.validate: ${path} precisa ser um array de strings.`);
      break;
    }
    case 'string|null': {
      if (value !== null && typeof value !== 'string') _fail(PACK_ERROR_CODES.SCHEMA_INVALID, `packImport.validate: ${path} precisa ser string ou null.`);
      break;
    }
    case 'object': {
      if (!value || typeof value !== 'object' || Array.isArray(value)) _fail(PACK_ERROR_CODES.SCHEMA_INVALID, `packImport.validate: ${path} precisa ser um objeto.`);
      break;
    }
    default:
      _fail(PACK_ERROR_CODES.SCHEMA_INVALID, `packImport.validate: ${path} tem tipo de campo desconhecido: ${spec.type}.`);
  }
}

// Valida um objeto contra uma tabela de campos: obrigatoriedade, tipo, e
// rejeita a primeira chave própria fora da tabela (equivalente a
// additionalProperties: false do schema). Nunca remove nem corrige a chave
// desconhecida; rejeita.
function _checkObject(path, fields, obj) {
  if (!obj || typeof obj !== 'object' || Array.isArray(obj)) {
    _fail(PACK_ERROR_CODES.SCHEMA_INVALID, `packImport.validate: ${path} precisa ser um objeto.`);
  }
  for (const field of fields) {
    const value = obj[field.key];
    const fieldPath = `${path}.${field.key}`;
    if (value === undefined) {
      if (field.required) _fail(PACK_ERROR_CODES.SCHEMA_INVALID, `packImport.validate: ${fieldPath} é obrigatório.`);
      continue;
    }
    _checkField(fieldPath, field, value);
  }
  const known = fields.map((f) => f.key);
  for (const key of Object.keys(obj)) {
    if (known.indexOf(key) === -1) {
      _fail(PACK_ERROR_CODES.SCHEMA_INVALID, `packImport.validate: ${path} contém uma chave desconhecida: ${key}.`);
    }
  }
}

// Ordem exata: pacote é objeto -> chaves de topo conhecidas -> meta -> license
// -> spells (mínimo 1 item, cada um contra SPELL_FIELDS). Falha na primeira
// violação encontrada; não retorna valor e não modifica pack.
function validatePack(pack) {
  if (!pack || typeof pack !== 'object' || Array.isArray(pack)) {
    _fail(PACK_ERROR_CODES.SCHEMA_INVALID, 'packImport.validate: o pacote precisa ser um objeto.');
  }

  // id é tolerado (A-02: pluginStore.exportPack() serializa o registro
  // verbatim incluindo a chave de topo id) — o import recalcula o id e não
  // confia no que veio no arquivo.
  const topKeys = ['id', 'meta', 'spells'];
  for (const key of Object.keys(pack)) {
    if (topKeys.indexOf(key) === -1) {
      _fail(PACK_ERROR_CODES.SCHEMA_INVALID, `packImport.validate: chave de topo desconhecida: ${key}.`);
    }
  }

  _checkObject('meta', META_FIELDS, pack.meta);
  _checkObject('meta.license', LICENSE_FIELDS, pack.meta && pack.meta.license);

  // minItems: 1 do schema — um pacote vazio criaria entrada fantasma no
  // seletor de versões da Fase 5.
  if (!Array.isArray(pack.spells) || pack.spells.length < 1) {
    _fail(PACK_ERROR_CODES.SCHEMA_INVALID, 'packImport.validate: spells precisa ser um array com ao menos 1 magia.');
  }
  pack.spells.forEach((spell, i) => {
    _checkObject(`spells[${i}]`, SPELL_FIELDS, spell);
  });
}

// ──────────────────────────────────────────────────────────────────
// IDENTIFICADOR LIVRE (D-09)
// ──────────────────────────────────────────────────────────────────

// ponytail: pluginStore.putPack faz um store.put cru (upsert, sem dedup) e
// sobrescreveria em silêncio um pacote existente com o mesmo id — este
// cálculo é obrigatório ANTES da gravação, não uma cortesia.
function freeIdentifier(base, existingIds) {
  if (existingIds.indexOf(base) === -1) return base;
  let n = 2;
  while (existingIds.indexOf(`${base}-${n}`) !== -1) {
    n += 1;
  }
  return `${base}-${n}`;
}

// ──────────────────────────────────────────────────────────────────
// LEITURA — arquivo local e busca por URL, teto de bytes de D-08 nos dois
// caminhos. Nenhuma das duas funções grava nem sanitiza; devolvem texto cru.
// ──────────────────────────────────────────────────────────────────

function _tooLarge(bytes) {
  const mb = (bytes / (1024 * 1024)).toFixed(1);
  _fail(PACK_ERROR_CODES.TOO_LARGE, `packImport.read: arquivo de ${mb} MB excede o teto de 10 MB.`);
}

// O tamanho de um File é conhecido pelo navegador sem ler nenhum byte, então
// o caminho local não precisa de leitura incremental — só compara e lê.
async function _readFileText(file) {
  if (file.size > MAX_PACK_BYTES) _tooLarge(file.size);
  return file.text();
}

// PKG-03 + metade remota de D-08. O navegador não distingue bloqueio de CORS
// de DNS/offline — um único código (fetch-failed) cobre todos os casos de
// "não consegui buscar"; classificar por heurística de string seria frágil e
// falso.
async function _fetchText(url) {
  let res;
  try {
    res = await fetch(url);
  } catch (err) {
    _fail(PACK_ERROR_CODES.FETCH_FAILED, `packImport.fetch: não foi possível buscar o pacote — ${err && err.message}`);
  }

  if (!res.ok) {
    _fail(PACK_ERROR_CODES.FETCH_FAILED, `packImport.fetch: resposta HTTP ${res.status} ao buscar o pacote.`);
  }

  // Content-Length, quando presente, falha ANTES de tocar no corpo.
  const contentLength = res.headers && typeof res.headers.get === 'function' ? res.headers.get('Content-Length') : null;
  if (contentLength && Number(contentLength) > MAX_PACK_BYTES) {
    _tooLarge(Number(contentLength));
  }

  if (!res.body || typeof res.body.getReader !== 'function') {
    // ponytail: sem streams no fetch (navegador antigo) — este ramo
    // bufferiza o corpo inteiro antes de medir. O teto de 10 MB é pequeno o
    // bastante para isso ser aceitável como degradação, não um risco real de
    // memória.
    const text = await res.text();
    const byteLength = new TextEncoder().encode(text).byteLength;
    if (byteLength > MAX_PACK_BYTES) _tooLarge(byteLength);
    return text;
  }

  // Independentemente do cabeçalho, os bytes efetivamente lidos são
  // limitados de qualquer forma — a leitura aborta ao ultrapassar o teto,
  // sem bufferizar o corpo inteiro.
  const reader = res.body.getReader();
  const chunks = [];
  let total = 0;
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    total += value.byteLength;
    if (total > MAX_PACK_BYTES) {
      reader.cancel();
      _tooLarge(total);
    }
    chunks.push(value);
  }
  const merged = new Uint8Array(total);
  let offset = 0;
  for (const chunk of chunks) {
    merged.set(chunk, offset);
    offset += chunk.byteLength;
  }
  return new TextDecoder().decode(merged);
}

// ──────────────────────────────────────────────────────────────────
// SANITIZAÇÃO (PKG-05) — whitelist explícita, DOMPurify, falha fechada.
// ──────────────────────────────────────────────────────────────────

// Tags observadas nos quatro spells-5E-*.json atuais. `ol` e `hr` entram por
// simetria com `ul` e as demais tags de bloco; nenhum atributo é permitido em
// nenhuma delas.
const ALLOWED_TAGS = Object.freeze(['p', 'strong', 'em', 'i', 'b', 'ul', 'ol', 'li', 'table', 'thead', 'tbody', 'tr', 'th', 'td', 'h5', 'br', 'hr']);

// Campos de texto do meta que a UI exibe — rótulos, nunca marcação.
const META_TEXT_FIELDS = ['name', 'author', 'version', 'edition'];
const META_LICENSE_TEXT_FIELDS = ['id', 'attribution', 'modifications', 'url'];
const SPELL_HTML_FIELDS = ['description', 'upgradeDescription', 'statBlock'];

// Clone profundo sem introduzir uma segunda chamada de JSON.parse neste
// arquivo — parsePackText já é a única, e o script de checagem assere isso.
function _cloneDeep(value) {
  if (typeof structuredClone === 'function') return structuredClone(value);
  if (Array.isArray(value)) return value.map(_cloneDeep);
  if (value && typeof value === 'object') {
    const out = {};
    for (const key of Object.keys(value)) out[key] = _cloneDeep(value[key]);
    return out;
  }
  return value;
}

// ponytail: a sanitização acontece uma vez, no import, porque a cópia
// sanitizada é a única que existe no storage e a única que sai no
// exportPack(). Os sinks de dangerouslySetInnerHTML em v10-hifi.jsx não
// ganham sanitização em runtime nesta fase, por decisão de arquitetura: o
// dado entra limpo.
function sanitizePack(pack) {
  if (!window.DOMPurify) {
    _fail(PACK_ERROR_CODES.SCHEMA_INVALID, 'packImport.sanitize: DOMPurify não carregou — o import não instala conteúdo não sanitizado.');
  }

  const copy = _cloneDeep(pack);
  let changedFields = 0;

  const sanitizeHtml = (value) => window.DOMPurify.sanitize(value, { ALLOWED_TAGS, ALLOWED_ATTR: [], ALLOW_DATA_ATTR: false });
  const sanitizeText = (value) => window.DOMPurify.sanitize(value, { ALLOWED_TAGS: [], ALLOWED_ATTR: [] });

  copy.spells.forEach((spell) => {
    for (const field of SPELL_HTML_FIELDS) {
      const original = spell[field];
      if (typeof original !== 'string') continue;
      const clean = sanitizeHtml(original);
      if (clean !== original) changedFields += 1;
      spell[field] = clean;
    }
  });

  for (const field of META_TEXT_FIELDS) {
    const original = copy.meta[field];
    if (typeof original !== 'string') continue;
    const clean = sanitizeText(original);
    if (clean !== original) changedFields += 1;
    copy.meta[field] = clean;
  }

  if (copy.meta.license) {
    for (const field of META_LICENSE_TEXT_FIELDS) {
      const original = copy.meta.license[field];
      if (typeof original !== 'string') continue;
      const clean = sanitizeText(original);
      if (clean !== original) changedFields += 1;
      copy.meta.license[field] = clean;
    }
  }

  return { pack: copy, changedFields };
}

// ──────────────────────────────────────────────────────────────────
// INSTALAÇÃO — funil único: ler → validar → sanitizar → gravar, nessa ordem.
// Nenhum passo pode ser reordenado: gravar antes de validar ou de sanitizar
// é exatamente a falha que PKG-04/PKG-05 existem para impedir.
// ──────────────────────────────────────────────────────────────────
async function _install(text) {
  const parsed = parsePackText(text);
  validatePack(parsed);
  const { pack, changedFields } = sanitizePack(parsed);

  const metas = await window.pluginStore.listPacks();
  const existingIds = metas.map((m) => m.source);
  const identifier = freeIdentifier(pack.meta.source, existingIds);

  // O identificador é sempre recalculado — qualquer chave `id` vinda do
  // arquivo (ciclo exportar→reimportar, A-02) é descartada aqui.
  pack.meta.source = identifier;
  pack.meta.spellCount = pack.spells.length;
  const record = { id: identifier, meta: pack.meta, spells: pack.spells };

  await window.pluginStore.putPack(record);

  return { identifier, spellCount: pack.spells.length, changedFields };
}

async function installFromFile(file) {
  return _install(await _readFileText(file));
}

async function installFromUrl(url) {
  return _install(await _fetchText(url));
}

// ──────────────────────────────────────────────────────────────────
// EXPOSIÇÃO
// ──────────────────────────────────────────────────────────────────
window.packImport = {
  MAX_PACK_BYTES,
  PACK_ERROR_CODES,
  parsePackText,
  validatePack,
  freeIdentifier,
  sanitizePack,
  installFromFile,
  installFromUrl,
};
