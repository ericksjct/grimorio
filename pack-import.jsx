// Pack Import — camada de validação e rejeição de pacotes de magias BYOD (PKG-04).
//
// Este módulo possui: leitura defensiva de texto JSON de pacote
// (parsePackText), validação de schema escrita à mão (validatePack)
// espelhando pack.schema.json, e o cálculo puro de identificador livre
// (freeIdentifier) exigido antes de qualquer gravação (D-09).
//
// Este módulo NÃO possui: não abre IndexedDB por conta própria — toda
// gravação passa por window.pluginStore (plugin-store.jsx); não normaliza
// magia — adaptSpells() no loader continua o único ponto de normalização do
// app; não sanitiza HTML nem instala pacotes — isso é acrescentado a
// window.packImport (sanitizePack, installFromFile, installFromUrl) por um
// plano posterior desta fase.
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
