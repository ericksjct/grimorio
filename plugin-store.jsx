// Plugin Store — camada de persistência IndexedDB para pacotes de magias BYOD.
//
// Schema: banco 'grimorio-plugins' (v1), um único object store 'packs' com
// keyPath 'id'. Cada registro tem a forma { id, meta, spells }, onde `spells`
// é o JSON cru na mesma forma dos arquivos spells-5E-*.json — esta camada não
// normaliza, transforma nem empobrece o conteúdo; adaptSpells() (no loader)
// continua o único ponto de normalização do app (STOR-01).
//
// Uso: incluir este arquivo no HTML depois de spells-data-loader.jsx e antes
// dos componentes que consultam window.pluginStore.

// ──────────────────────────────────────────────────────────────────
// CONFIGURAÇÃO DO BANCO
// ──────────────────────────────────────────────────────────────────
const DB_NAME = 'grimorio-plugins';
const DB_VERSION = 1;
const STORE = 'packs';

// ──────────────────────────────────────────────────────────────────
// ABERTURA DO BANCO (memoizada, mesmo padrão de dedup de _pending no loader)
// ──────────────────────────────────────────────────────────────────
let _dbPromise = null;

function openDB() {
  if (_dbPromise) return _dbPromise;
  _dbPromise = new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(STORE)) {
        db.createObjectStore(STORE, { keyPath: 'id' });
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
    // Bloqueado por outra aba com uma versão antiga aberta: rejeita com erro
    // claro em vez de deixar a Promise pendurada pra sempre.
    req.onblocked = () => reject(new Error('IndexedDB bloqueado por outra aba do Grimório aberta — feche as outras abas e tente de novo.'));
  }).catch((err) => {
    _dbPromise = null; // não cacheia a falha: a próxima chamada tenta abrir de novo
    throw err;
  });
  return _dbPromise;
}

// ──────────────────────────────────────────────────────────────────
// HELPER PRIVADO DE TRANSAÇÃO
// ──────────────────────────────────────────────────────────────────
// ponytail: esta camada propaga o erro ORIGINAL do IndexedDB (name, message
// intactos) em vez de engolir ou envolver em um Error genérico — quem decide
// o toast/mensagem de UI é o chamador (Fase 3/5). Nenhum catch vazio aqui.
function _tx(mode, fn) {
  return openDB().then((db) => new Promise((resolve, reject) => {
    const tx = db.transaction(STORE, mode);
    const store = tx.objectStore(STORE);
    let result;
    const req = fn(store);
    if (req) {
      req.onsuccess = () => { result = req.result; };
    }
    // Só o oncomplete da transação prova que o dado foi commitado — nunca
    // resolver no onsuccess de uma escrita isolada.
    tx.oncomplete = () => resolve(result);
    tx.onerror = () => reject(tx.error || (req && req.error));
    tx.onabort = () => reject(tx.error || (req && req.error));
  }));
}

// ──────────────────────────────────────────────────────────────────
// VALIDAÇÃO DE FORMA (antes de qualquer transação)
// ──────────────────────────────────────────────────────────────────
function _assertPackShape(pack) {
  if (!pack || typeof pack !== 'object') {
    throw new TypeError('pluginStore.putPack: pack precisa ser um objeto.');
  }
  if (typeof pack.id !== 'string' || pack.id === '') {
    throw new TypeError('pluginStore.putPack: pack.id precisa ser uma string não-vazia.');
  }
  if (!pack.meta || typeof pack.meta !== 'object') {
    throw new TypeError('pluginStore.putPack: pack.meta precisa ser um objeto.');
  }
  if (!Array.isArray(pack.spells)) {
    throw new TypeError('pluginStore.putPack: pack.spells precisa ser um array.');
  }
}

// ──────────────────────────────────────────────────────────────────
// OPERAÇÕES PÚBLICAS
// ──────────────────────────────────────────────────────────────────
async function putPack(pack) {
  _assertPackShape(pack);
  await _tx('readwrite', (store) => store.put(pack));
}

async function getPack(id) {
  const record = await _tx('readonly', (store) => store.get(id));
  return record || null; // sempre null, nunca undefined (convenção do projeto)
}

async function getSpells(id) {
  const record = await _tx('readonly', (store) => store.get(id));
  // Array cru, sem transformação/filtro/ordenação — adaptSpells() é quem normaliza.
  return record ? record.spells : [];
}

async function listPacks() {
  const records = await _tx('readonly', (store) => store.getAll());
  // Só os metas (nunca os blobs de spells); registros sem meta são filtrados fora.
  return (records || []).filter((r) => r && r.meta).map((r) => r.meta);
}

async function deletePack(id) {
  await _tx('readwrite', (store) => store.delete(id));
}

// ──────────────────────────────────────────────────────────────────
// EXPOSIÇÃO
// ──────────────────────────────────────────────────────────────────
window.pluginStore = { openDB, putPack, getPack, getSpells, listPacks, deletePack };
