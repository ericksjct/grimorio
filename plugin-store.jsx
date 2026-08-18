// Plugin Store — camada de persistência IndexedDB para pacotes de magias BYOD.
//
// Schema: banco 'grimorio-plugins' (v1), um único object store 'packs' com
// keyPath 'id'. Cada registro tem a forma { id, meta, spells }, onde `spells`
// é o JSON cru na mesma forma dos arquivos spells-5E-*.json — esta camada não
// normaliza, transforma nem empobrece o conteúdo; o adaptador de magias (no
// loader) continua o único ponto de normalização do app (STOR-01).
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
  // WR-04: um registro ausente (pack apagado/corrompido) NÃO é o mesmo que um
  // pack legitimamente vazio — o funil de importação exige minItems: 1, então
  // um array vazio vindo do storage só pode significar registro sumido. Antes
  // isto virava `[]`, indistinguível de sucesso: loadVersion() cacheava como
  // um resultado válido pra sempre, sem toast e sem retry.
  if (!record) throw new Error(`pluginStore.getSpells: pacote '${id}' não encontrado.`);
  // Array cru, sem transformação/filtro/ordenação — o adaptador de magias é quem normaliza.
  return record.spells;
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
// ARMAZENAMENTO PERSISTENTE (STOR-02)
// ──────────────────────────────────────────────────────────────────
// ponytail: persistência é best-effort por definição (Pitfall 4 do research) —
// nunca bloqueia o boot, nunca é usada pra habilitar/desabilitar funcionalidade.
let _persistPromise = null;
let _persistState = null;

async function requestPersistence() {
  if (_persistPromise) return _persistPromise;

  if (!navigator.storage || typeof navigator.storage.persist !== 'function') {
    const result = { supported: false, persisted: false, requested: false };
    _persistState = result;
    return result;
  }

  _persistPromise = (async () => {
    try {
      const already = await navigator.storage.persisted();
      if (already) {
        // Curto-circuito: já concedida, não emite uma segunda requisição.
        return { supported: true, persisted: true, requested: false };
      }
      const granted = await navigator.storage.persist();
      return { supported: true, persisted: granted, requested: true };
    } catch (err) {
      // Único ponto do arquivo onde um erro é absorvido em vez de propagado:
      // persistência é best-effort e não pode derrubar o boot.
      console.warn('pluginStore.requestPersistence: falha ao consultar/solicitar persistência.', err);
      return { supported: true, persisted: false, requested: true };
    }
  })()
    .then((result) => {
      _persistState = result;
      return result;
    })
    .finally(() => {
      _persistPromise = null;
    });

  return _persistPromise;
}

function getPersistenceState() {
  return _persistState;
}

// Solicita persistência assim que o DOM estiver pronto — mitiga a eviction de
// 7 dias do Safari (STOR-02, mesmo padrão de boot de spells-data-loader.jsx).
// Não aguardada por nada; resultado é best-effort e observável via getPersistenceState().
if (typeof document !== 'undefined') {
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => { requestPersistence(); });
  } else {
    requestPersistence();
  }
}

// ──────────────────────────────────────────────────────────────────
// EXPORTAÇÃO DE PACOTE (STOR-03)
// ──────────────────────────────────────────────────────────────────
// Mitigação de T-02-06: meta.name vem de conteúdo não confiável (arquivo do
// usuário) e nunca deve alcançar o atributo `download` cru.
function _packFileName(record) {
  const reduce = (s) => String(s || '')
    .toLowerCase()
    .replace(/[^a-z0-9-]/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 60);

  let slug = reduce(record && record.meta && record.meta.name);
  if (!slug) slug = reduce(record && record.id);
  if (!slug) slug = 'pack';
  return `grimorio-${slug}.json`;
}

async function exportPack(id) {
  const record = await getPack(id);
  if (!record) {
    throw new Error(`pluginStore.exportPack: pacote '${id}' não encontrado.`);
  }
  // Serializado VERBATIM — sem remover/renomear/reordenar campos (A-02: o
  // arquivo baixado precisa reparsear pra um objeto idêntico ao armazenado).
  const text = JSON.stringify(record, null, 2);
  const blob = new Blob([text], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = _packFileName(record);
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url); // depois do click — revogar cedo cancela o download em alguns navegadores
  return text;
}

// ──────────────────────────────────────────────────────────────────
// EXPOSIÇÃO
// ──────────────────────────────────────────────────────────────────
window.pluginStore = {
  openDB, putPack, getPack, getSpells, listPacks, deletePack,
  requestPersistence, getPersistenceState, exportPack,
};
