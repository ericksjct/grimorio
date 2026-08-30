// Pack Manager — superfície de leitura do gerenciador de pacotes (MGMT-01, MGMT-04, MGMT-05, SRD-02).
//
// Este módulo possui: `PackManager` (lista de packs instalados, linhas builtin do SRD com
// atribuição CC-BY verbatim recolhível, estado vazio, contagem agregada de duplicatas por linha)
// e `PackManagerRoot` (estado de qual diálogo está visível + o global window.__openPackManager).
// Também possui `packSpellIndex()` — índice de magias por nome e por chave de preparação,
// memoizado e invalidado em `hifi-plugins-changed` (MGMT-04) — e o fluxo de remoção com
// confirmação inline e impacto concreto (MGMT-02).
//
// Este módulo NÃO possui: import/validação/gravação de pacote (delega a `PackImportDialog` e a
// `window.pluginStore`).
//
// Uso: incluir este arquivo no HTML depois de `pack-import-dialog.jsx` (precisa de
// `PackImportDialog`) e antes de `v10-hifi.jsx` (que vai consumir `window.__openPackManager`).

// ──────────────────────────────────────────────────────────────────
// MODELO DE LINHA — funções puras, sem componente
// ──────────────────────────────────────────────────────────────────

// meta de pack instalado (plugin-store.jsx listPacks()) → linha de exibição.
// `id` é o id do pluginStore (usado por deletePack); `versionKey` é a chave em
// window.SPELL_VERSIONS ('plugin-' + source, ver _packToVersion em
// spells-data-loader.jsx) — os dois divergem, por isso ficam em campos
// separados em vez de reusar um só pro índice de duplicatas (D-10) e pra remoção (MGMT-02).
function _installedRows(metas) {
  return (metas || []).map((meta) => ({
    id: meta.source,
    versionKey: 'plugin-' + meta.source,
    name: meta.name,
    version: meta.version,
    count: meta.spellCount,
    origin: 'installed',
    license: meta.license || null,
  }));
}

// entradas SRD de window.SPELL_VERSIONS (source:'fetch', corpus:'srd') → linha de exibição.
// A-01 (flagged assumption do plano): só as duas entradas com corpus 'srd' viram linha
// builtin — as legadas PHB/PT-BR não têm manifesto de licença e saem na Fase 6.
function _builtinRows(versions, licenses) {
  return (versions || [])
    .filter((v) => v.source === 'fetch' && v.corpus === 'srd')
    .map((v) => {
      const license = licenses && licenses[v.key] ? licenses[v.key] : null;
      const meta = window.getVersionMeta ? window.getVersionMeta(v.key) : null;
      return {
        id: v.key,
        versionKey: v.key,
        name: v.labelEn,
        version: v.short,
        count: meta && typeof meta.spellCount === 'number' ? meta.spellCount : null,
        origin: 'builtin',
        license,
      };
    });
}

// ──────────────────────────────────────────────────────────────────
// ÍNDICE DE MAGIAS (MGMT-04)
// ──────────────────────────────────────────────────────────────────

// Duas versões "contam como duplicata" uma da outra, exceto quando ambas são
// o mesmo corpus SRD (A-05): SRD 5.1 e SRD 5.2 são a mesma obra em edições
// diferentes, já servidas pelo comparador de edição — contá-las como
// duplicata faria toda magia do SRD virar ruído constante na contagem.
function _countsAsDuplicate(corpusA, corpusB) {
  return !(corpusA === 'srd' && corpusB === 'srd');
}

async function _buildSpellIndex() {
  const all = (window.SPELL_VERSIONS || []).filter((v) => v.source === 'idb' || v.corpus === 'srd');

  // ponytail: sem nenhum pack instalado, duplicata entre pacotes não existe —
  // devolve índice vazio sem pagar o parse dos dois JSONs SRD. Upgrade path se
  // isso um dia precisar mudar: construir sob demanda no primeiro toggle da
  // seção de duplicatas, não na abertura do gerenciador.
  if (!all.some((v) => v.source === 'idb')) {
    return { byName: new Map(), byKey: new Map(), corpusOf: new Map(), labelOf: new Map() };
  }

  const byName = new Map();
  const byKey = new Map();
  const corpusOf = new Map();
  const labelOf = new Map();
  const hasSpellKey = typeof window.hifiSpellKey === 'function';
  if (!hasSpellKey) {
    console.warn('[pack-manager] window.hifiSpellKey ausente — índice byKey não será construído.');
  }

  for (const v of all) {
    corpusOf.set(v.key, v.corpus);
    labelOf.set(v.key, v.labelEn || v.short || v.key);
    let spells;
    try {
      spells = await window.loadSpellVersion(v.key);
    } catch (e) {
      console.warn('[pack-manager] falha ao carregar versão para índice:', v.key, e);
      continue;
    }
    (spells || []).forEach((spell) => {
      const nameKey = String(spell.en || '').toLowerCase();
      if (nameKey) {
        if (!byName.has(nameKey)) byName.set(nameKey, []);
        byName.get(nameKey).push(v.key);
      }
      if (hasSpellKey) {
        const k = window.hifiSpellKey(spell);
        if (!byKey.has(k)) byKey.set(k, []);
        byKey.get(k).push(v.key);
      }
    });
  }

  return { byName, byKey, corpusOf, labelOf };
}

let _indexPromise = null;
function packSpellIndex() {
  return _indexPromise || (_indexPromise = _buildSpellIndex());
}
// Instalar/remover um pack invalida o índice — a próxima chamada reconstrói do zero.
window.addEventListener('hifi-plugins-changed', () => { _indexPromise = null; });
window.packSpellIndex = packSpellIndex;

// Contagem agregada de duplicatas por versão (D-10): quantas entradas de
// byName que incluem esta versão também incluem pelo menos uma outra versão
// que conta como duplicata dela (A-05). Informativo — não altera ordenação,
// não desabilita nada, não muda qual fonte está ativa (D-11/P-04).
function _computeDupCounts(index) {
  const counts = {};
  if (!index || !index.byName || !index.corpusOf) return counts;
  index.corpusOf.forEach((_corpus, key) => { counts[key] = 0; });
  index.byName.forEach((keys) => {
    const uniqueKeys = [...new Set(keys)];
    uniqueKeys.forEach((k) => {
      const isDup = uniqueKeys.some((k2) => k2 !== k && _countsAsDuplicate(index.corpusOf.get(k), index.corpusOf.get(k2)));
      if (isDup) counts[k] = (counts[k] || 0) + 1;
    });
  });
  return counts;
}

// Impacto concreto de remover `versionKey` (MGMT-02/D-06) — puro, estritamente de leitura via
// window.loadCharacters()/window.loadBookmarks(). Uma chave "deixa de resolver" quando o índice a
// lista, contém `versionKey`, e tem comprimento 1 — este pack é a ÚNICA fonte indexada daquela
// chave; se outra fonte também a provê, a preparada continua resolvendo e não entra na contagem.
// Nada aqui é persistido: é derivado no momento do render.
function _removalImpact(versionKey, index) {
  const impact = { prepared: 0, characters: 0, bookmarked: 0 };
  if (!index || !index.byKey) return impact;

  const staleKey = (key) => {
    const sources = index.byKey.get(key);
    return !!sources && sources.length === 1 && sources[0] === versionKey;
  };

  const chars = window.loadCharacters ? window.loadCharacters() : [];
  (chars || []).forEach((c) => {
    let charAffected = false;
    (Array.isArray(c.prepared) ? c.prepared : []).forEach((key) => {
      if (staleKey(key)) {
        impact.prepared += 1;
        charAffected = true;
      }
    });
    if (charAffected) impact.characters += 1;
  });

  const bookmarks = window.loadBookmarks ? window.loadBookmarks() : [];
  (bookmarks || []).forEach((key) => {
    if (staleKey(key)) impact.bookmarked += 1;
  });

  return impact;
}

// ──────────────────────────────────────────────────────────────────
// LINHA
// ──────────────────────────────────────────────────────────────────

function PackManagerRow({ lang, row, dupCount, confirming, impact, onRequestRemove, onCancelRemove, onConfirmRemove }) {
  const hasCount = typeof row.count === 'number' && Number.isFinite(row.count);
  // Nome/versão vêm de arquivo de terceiro (T-05-01): sempre filho de texto React, recortado.
  const name = String(row.name || '').slice(0, 64);
  const version = String(row.version || '').slice(0, 24);
  return (
    <div style={{ padding: '12px 0', borderBottom: '1px solid var(--surface1)' }}>
      <div style={{ fontWeight: 700, fontSize: 15, overflowWrap: 'anywhere' }}>{name}</div>
      <div style={{ marginTop: 2, fontSize: 12, color: 'var(--subtext0)', display: 'flex', gap: 6, flexWrap: 'wrap', alignItems: 'center' }}>
        <span>{tt(lang, 'manager.versionLabel', { v: version })}</span>
        <span>·</span>
        <span>{hasCount ? tt(lang, 'manager.spellCount', { n: row.count }) : tt(lang, 'manager.spellCountUnknown')}</span>
        <span className="hifi-section-label" style={{ marginLeft: 'auto' }}>
          {row.origin === 'installed' ? tt(lang, 'manager.originInstalled') : tt(lang, 'manager.originBuiltin')}
        </span>
      </div>
      {typeof dupCount === 'number' && dupCount > 0 && (
        <div style={{ marginTop: 2, fontSize: 12, color: 'var(--subtext0)' }}>
          {tt(lang, 'manager.duplicates', { n: dupCount })}
        </div>
      )}
      {row.origin === 'installed' && (
        confirming ? (
          <div style={{ marginTop: 8 }}>
            <div style={{ fontSize: 12, color: 'var(--subtext0)', marginBottom: 6 }}>
              {impact && impact.prepared > 0 && (
                <div>{tt(lang, 'manager.impactPrepared', { n: impact.prepared, c: impact.characters })}</div>
              )}
              {impact && impact.bookmarked > 0 && (
                <div>{tt(lang, 'manager.impactBookmarked', { n: impact.bookmarked })}</div>
              )}
              {impact && impact.prepared === 0 && impact.bookmarked === 0 && (
                <div>{tt(lang, 'manager.impactNone')}</div>
              )}
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <span style={{ fontSize: 13 }}>{tt(lang, 'manager.removeConfirm')}</span>
              <button type="button" className="hifi-btn-primary" onClick={onConfirmRemove}>{tt(lang, 'manager.yes')}</button>
              <button type="button" className="hifi-btn-ghost" onClick={onCancelRemove}>{tt(lang, 'manager.no')}</button>
            </div>
          </div>
        ) : (
          <div style={{ marginTop: 8 }}>
            <button type="button" className="hifi-btn-secondary" onClick={onRequestRemove}>{tt(lang, 'manager.remove')}</button>
          </div>
        )
      )}
      {row.license && (
        <details style={{ marginTop: 8 }}>
          <summary style={{ cursor: 'pointer', fontSize: 12, color: 'var(--accent)' }}>{tt(lang, 'manager.license')}</summary>
          <div style={{
            marginTop: 6, fontSize: 12, whiteSpace: 'pre-wrap', overflowWrap: 'anywhere',
            maxHeight: 200, overflowY: 'auto', color: 'var(--subtext0)',
          }}>
            {row.license.attribution}
            {row.license.modifications && (
              <div style={{ marginTop: 6 }}>
                <strong>{tt(lang, 'manager.modifications')}: </strong>
                {row.license.modifications}
              </div>
            )}
          </div>
        </details>
      )}
    </div>
  );
}

// ──────────────────────────────────────────────────────────────────
// PACK MANAGER
// ──────────────────────────────────────────────────────────────────

function PackManager({ lang, dark, theme, open, onClose, onOpenImport }) {
  const [packs, setPacks] = React.useState(null); // null = carregando; [] = vazio
  const [licenses, setLicenses] = React.useState({}); // versionKey → license dos builtins
  const [dupCounts, setDupCounts] = React.useState({}); // versionKey → contagem agregada de duplicatas (D-10)
  const [confirmingId, setConfirmingId] = React.useState(null); // id (pluginStore) da linha em confirmação — só uma por vez (D-05)
  const [impact, setImpact] = React.useState(null); // { prepared, characters, bookmarked } da linha em confirmação

  const dialogRef = React.useRef(null);
  window.useDialogA11y?.(dialogRef, open, onClose);

  const reload = React.useCallback(() => {
    window.pluginStore.listPacks()
      .then((metas) => setPacks(metas || []))
      .catch((e) => {
        console.warn('[pack-manager] listPacks falhou:', e);
        setPacks([]);
        window.dispatchEvent(new CustomEvent('hifi-toast', { detail: { msg: tt(lang, 'packErr.unknown'), kind: 'err' } }));
      });
  }, [lang]);

  React.useEffect(() => {
    if (!open) return;
    reload();
    window.addEventListener('hifi-plugins-changed', reload);
    return () => window.removeEventListener('hifi-plugins-changed', reload);
  }, [open, reload]);

  const reloadDupCounts = React.useCallback(() => {
    packSpellIndex()
      .then((index) => setDupCounts(_computeDupCounts(index)))
      .catch((e) => console.warn('[pack-manager] falha ao calcular duplicatas:', e));
  }, []);

  React.useEffect(() => {
    if (!open) return;
    reloadDupCounts();
    window.addEventListener('hifi-plugins-changed', reloadDupCounts);
    return () => window.removeEventListener('hifi-plugins-changed', reloadDupCounts);
  }, [open, reloadDupCounts]);

  // installedRows recomputado a cada render a partir de `packs` — leve o bastante (lista de
  // packs instalados) pra não precisar de memoização, e os handlers de remoção abaixo precisam
  // dele pra resolver versionKey/name a partir do id em confirmação.
  const installedRows = packs ? _installedRows(packs) : [];

  // Impacto concreto da linha em confirmação (D-06) — recalcula sempre que a confirmação abre ou
  // que o índice muda. Nunca persistido.
  React.useEffect(() => {
    if (!confirmingId) { setImpact(null); return; }
    const row = installedRows.find((r) => r.id === confirmingId);
    if (!row) { setImpact(null); return; }
    let cancelled = false;
    packSpellIndex().then((index) => {
      if (cancelled) return;
      setImpact(_removalImpact(row.versionKey, index));
    });
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [confirmingId, packs]);

  const handleRequestRemove = React.useCallback((id) => {
    setConfirmingId(id); // D-05: abrir a confirmação de outra linha fecha a anterior (um só estado)
  }, []);

  const handleCancelRemove = React.useCallback(() => {
    setConfirmingId(null);
  }, []);

  const handleConfirmRemove = React.useCallback(async (row) => {
    try {
      await window.pluginStore.deletePack(row.id);
      window.dispatchEvent(new CustomEvent('hifi-toast', { detail: { msg: tt(lang, 'manager.removed', { name: row.name }) } }));
      // Sem await — mesmo padrão de pack-import-dialog.jsx. A fila _refreshChain do loader já
      // serializa; nenhuma serialização nova é necessária aqui.
      window.refreshPluginVersions().catch((e) =>
        console.warn('[pack-manager] refreshPluginVersions falhou após remover:', e));
      // A lista se atualiza pelo listener de hifi-plugins-changed já existente (reload) — nunca
      // por manipulação manual do array local.
    } catch (e) {
      console.warn('[pack-manager] falha ao remover pacote:', e);
      window.dispatchEvent(new CustomEvent('hifi-toast', { detail: { msg: tt(lang, 'manager.removeFailed'), kind: 'err' } }));
    } finally {
      setConfirmingId(null);
    }
  }, [lang]);

  // ponytail: as duas licenças SRD carregam na abertura do gerenciador (custo: os dois JSONs
  // SRD, já pré-cacheados pelo service worker) — se isso pesar, o caminho de upgrade é carregar
  // sob o primeiro toggle do bloco de licença, não no efeito de abertura.
  React.useEffect(() => {
    if (!open) return;
    const srdVersions = (window.SPELL_VERSIONS || []).filter((v) => v.source === 'fetch' && v.corpus === 'srd');
    srdVersions.forEach((v) => {
      window.loadSpellVersion(v.key)
        .then(() => {
          const meta = window.getVersionMeta(v.key);
          setLicenses((prev) => ({ ...prev, [v.key]: meta && meta.license }));
        })
        .catch((e) => console.warn('[pack-manager] falha ao carregar licença builtin:', v.key, e));
    });
  }, [open]);

  if (!open) return null;

  const themeClass = `hifi ${dark ? 'hifi-dark' : 'hifi-light'}${theme && theme !== 'catppuccin' ? ' hifi-theme-' + theme : ''}`;
  const builtinRows = _builtinRows(window.SPELL_VERSIONS, licenses);
  // D-19: zero pacotes instalados pelo usuário — nunca "zero versões" (as duas linhas builtin
  // continuam presentes abaixo, sempre).
  const isEmpty = packs !== null && installedRows.length === 0;

  return (
    <div
      className={themeClass}
      style={{
        position: 'fixed', inset: 0, zIndex: 100,
        background: 'rgba(0,0,0,0.55)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        padding: 18,
      }}
      onClick={onClose}
    >
      <section
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-label={tt(lang, 'manager.title')}
        tabIndex={-1}
        onClick={(e) => e.stopPropagation()}
        style={{
          width: 'min(560px, 100%)',
          maxHeight: '80vh',
          display: 'flex',
          flexDirection: 'column',
          background: 'var(--base)',
          color: 'var(--text)',
          border: '1px solid var(--surface1)',
          borderRadius: 8,
          boxShadow: '0 24px 80px rgba(0,0,0,0.45)',
        }}
      >
        <header style={{
          flexShrink: 0,
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: 16,
          borderBottom: '1px solid var(--surface1)',
        }}>
          <h2 style={{ fontSize: 20, fontWeight: 700, lineHeight: 1.2, margin: 0 }}>{tt(lang, 'manager.title')}</h2>
          <button type="button" className="hifi-btn-ghost" onClick={onClose}>{tt(lang, 'import.close')}</button>
        </header>

        <div style={{ flex: 1, overflowY: 'auto', padding: 16 }}>
          {packs === null ? (
            <div style={{ fontSize: 14, color: 'var(--subtext0)' }}>{tt(lang, 'manager.loading')}</div>
          ) : isEmpty ? (
            <div>
              <h3 style={{ fontSize: 20, fontWeight: 700, lineHeight: 1.2, margin: '0 0 8px' }}>
                {tt(lang, 'manager.emptyHeading')}
              </h3>
              <p style={{ fontSize: 14, fontWeight: 400, lineHeight: 1.5, margin: '0 0 16px' }}>
                {tt(lang, 'manager.emptyBody')}{' '}
                {tt(lang, 'import.docsPrefix')}
                <a href="pack-docs.html" target="_blank" rel="noopener" style={{ color: 'var(--accent)' }}>
                  {tt(lang, 'import.docsLink')}
                </a>.
              </p>
            </div>
          ) : (
            <div style={{ marginBottom: 8 }}>
              <div className="hifi-section-label">{tt(lang, 'manager.sectionInstalled')}</div>
              {installedRows.map((row) => (
                <PackManagerRow
                  key={row.id} lang={lang} row={row} dupCount={dupCounts[row.versionKey]}
                  confirming={confirmingId === row.id}
                  impact={impact}
                  onRequestRemove={() => handleRequestRemove(row.id)}
                  onCancelRemove={handleCancelRemove}
                  onConfirmRemove={() => handleConfirmRemove(row)}
                />
              ))}
            </div>
          )}

          <div style={{ marginTop: 16 }}>
            <div className="hifi-section-label">{tt(lang, 'manager.sectionBuiltin')}</div>
            {builtinRows.map((row) => <PackManagerRow key={row.id} lang={lang} row={row} dupCount={dupCounts[row.versionKey]} />)}
          </div>
        </div>

        <footer style={{ flexShrink: 0, padding: 16, borderTop: '1px solid var(--surface1)' }}>
          <button
            type="button"
            className="hifi-btn-primary"
            onClick={onOpenImport}
            style={{ width: '100%', justifyContent: 'center' }}
          >{tt(lang, 'import.open')}</button>
        </footer>
      </section>
    </div>
  );
}

// ──────────────────────────────────────────────────────────────────
// PACK MANAGER ROOT
// ──────────────────────────────────────────────────────────────────

function PackManagerRoot({ lang, dark, theme }) {
  // D-04/D-05: um só overlay visível por vez — 'manager' e 'import' são diálogos irmãos, nunca
  // empilhados. Fechar o import volta para o gerenciador.
  const [view, setView] = React.useState('closed');

  React.useEffect(() => {
    const open = () => setView('manager');
    window.__openPackManager = open;
    return () => {
      if (window.__openPackManager === open) delete window.__openPackManager;
    };
  }, []);

  return (
    <>
      <PackManager
        lang={lang} dark={dark} theme={theme}
        open={view === 'manager'}
        onClose={() => setView('closed')}
        onOpenImport={() => setView('import')}
      />
      <PackImportDialog
        lang={lang} dark={dark} theme={theme}
        open={view === 'import'}
        onClose={() => setView('manager')}
      />
    </>
  );
}

Object.assign(window, { PackManager, PackManagerRoot });
