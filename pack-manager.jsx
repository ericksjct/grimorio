// Pack Manager — superfície de leitura do gerenciador de pacotes (MGMT-01, MGMT-05, SRD-02).
//
// Este módulo possui: `PackManager` (lista de packs instalados, linhas builtin do SRD com
// atribuição CC-BY verbatim recolhível, estado vazio) e `PackManagerRoot` (estado de qual
// diálogo está visível + o global window.__openPackManager).
//
// Este módulo NÃO possui: import/validação/gravação de pacote (delega a `PackImportDialog` e a
// `window.pluginStore`), remoção de pacote, contagem de duplicatas nem índice de magias — esses
// entram nos planos 05-02/05-03, sobre esta base.
//
// Uso: incluir este arquivo no HTML depois de `pack-import-dialog.jsx` (precisa de
// `PackImportDialog`) e antes de `v10-hifi.jsx` (que vai consumir `window.__openPackManager`).

// ──────────────────────────────────────────────────────────────────
// MODELO DE LINHA — funções puras, sem componente
// ──────────────────────────────────────────────────────────────────

// meta de pack instalado (plugin-store.jsx listPacks()) → linha de exibição.
function _installedRows(metas) {
  return (metas || []).map((meta) => ({
    id: meta.source,
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
        name: v.labelEn,
        version: v.short,
        count: meta && typeof meta.spellCount === 'number' ? meta.spellCount : null,
        origin: 'builtin',
        license,
      };
    });
}

// ──────────────────────────────────────────────────────────────────
// LINHA
// ──────────────────────────────────────────────────────────────────

function PackManagerRow({ lang, row }) {
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
  const installedRows = packs ? _installedRows(packs) : [];
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
              {installedRows.map((row) => <PackManagerRow key={row.id} lang={lang} row={row} />)}
            </div>
          )}

          <div style={{ marginTop: 16 }}>
            <div className="hifi-section-label">{tt(lang, 'manager.sectionBuiltin')}</div>
            {builtinRows.map((row) => <PackManagerRow key={row.id} lang={lang} row={row} />)}
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
