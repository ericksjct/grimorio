// Pack Rename Dialog — prompt reutilizável de renomear slugs em conflito
// (Fase 8, D-09..D-14). Usado só pela seleção do menu de pacotes (plano 08-05,
// E-02): renomear pack já instalado exige o prompt e a confirmação do usuário.
// O import não usa este módulo — resolve colisão sozinho no funil de
// pack-import.jsx e só avisa o que renomeou (E-01).
//
// Este módulo possui: `PackRenameForm` (formulário — linhas de conflito,
// sugestão, validação ao vivo, barra de ação), `PackRenameDialog` (shell modal
// que envolve o formulário com cabeçalho, no mesmo padrão de
// pack-import-dialog.jsx; o formulário é interno ao arquivo, não vai para
// `window`), `renameInstalledPackSlugs` (regrava um pack já
// instalado com os slugs renomeados) e `renameImpact` (contagem só-leitura de
// quantas preparadas/favoritas apontam pros slugs antigos).
//
// Este módulo NÃO possui: não detecta colisão (window.packImport.
// detectSlugConflicts faz isso, plano 08-04 Task 1) e não escreve em nenhum
// dado de personagem — nenhuma leitura ou escrita de armazenamento por
// personagem/favoritas além da consulta pública e só-leitura que devolve
// quantos itens salvos apontam pro slug antigo; a seção de órfãs já existente
// é quem trata o que sobra depois. A única escrita deste módulo é regravar o
// PRÓPRIO pack instalado (via window.pluginStore) com os spells renomeados.
//
// Uso: incluir este arquivo no HTML depois de v11-character-editor.jsx (usa
// window.useDialogA11y e os acessores só-leitura de personagem/favoritas
// expostos por ele) e antes de pack-manager.jsx (cujo PackManagerRoot monta
// window.PackRenameDialog).

// ──────────────────────────────────────────────────────────────────
// IMPACTO (só-leitura) — quantas preparadas/favoritas apontam pro slug antigo
// ──────────────────────────────────────────────────────────────────

// Pura: nenhuma consulta aqui grava nada — a mesma garantia de bytes
// idênticos de peekCharacters()/peekBookmarks(), provada por execução em
// scripts/check-slug-rename.tests.ps1 com um armazenamento local instrumentado.
// `oldKeys`: Set de hifiSpellKey antigos; `stillResolves(key)`: true quando a
// chave ainda resolve depois da renomeação (não entra na contagem).
function renameImpact(oldKeys, stillResolves) {
  const resolves = typeof stillResolves === 'function' ? stillResolves : () => false;
  let impact = 0;

  const chars = window.peekCharacters ? window.peekCharacters() : [];
  (chars || []).forEach((c) => {
    (Array.isArray(c && c.prepared) ? c.prepared : []).forEach((key) => {
      if (oldKeys.has(key) && !resolves(key)) impact += 1;
    });
  });

  const bookmarks = window.peekBookmarks ? window.peekBookmarks() : [];
  (bookmarks || []).forEach((key) => {
    if (oldKeys.has(key) && !resolves(key)) impact += 1;
  });

  return impact;
}

// ──────────────────────────────────────────────────────────────────
// ESCRITA — regrava um pack JÁ INSTALADO com os slugs renomeados (D-14)
// ──────────────────────────────────────────────────────────────────

// Único ponto de escrita deste módulo. Consumido pela seleção do menu
// (08-05) quando o usuário escolhe renomear um pack já instalado em vez de
// não selecioná-lo.
async function renameInstalledPackSlugs(packId, renames) {
  const record = await window.pluginStore.getPack(packId);
  if (!record) {
    throw new Error(`renameInstalledPackSlugs: pacote '${packId}' não encontrado.`);
  }
  const renamedSpells = window.packImport.applySlugRenames(record.spells, renames);
  await window.pluginStore.putPack({ ...record, spells: renamedSpells });
  window.invalidateSpellVersion('plugin-' + packId);
  await window.refreshPluginVersions();
}

// ──────────────────────────────────────────────────────────────────
// FORMULÁRIO
// ──────────────────────────────────────────────────────────────────

// `rows`: [{ packId, slug, name, oldKey, existing: [{ label, name }] }].
// `onSubmit(list)` recebe [{ packId, slug, newSlug }] e pode ser async (o
// diálogo mostra rename.submitting enquanto `busy` está true).
function PackRenameForm({ lang, rows, reservedKeys, takenKeys, impact, busy, onCancel, onSubmit }) {
  const [values, setValues] = React.useState(() => rows.map((r) => r.slug));

  // Reabrir com um conjunto de linhas diferente reinicia os valores — cada
  // linha nasce com o próprio slug antigo (que É o conflito), então o erro
  // aparece de saída e o usuário precisa agir antes de conseguir enviar.
  React.useEffect(() => {
    setValues(rows.map((r) => r.slug));
  }, [rows]);

  // Sugestões calculadas uma vez por `rows`: cada sugestão entra no conjunto
  // de ocupados da próxima, pra duas linhas nunca sugerirem o mesmo slug.
  const suggestions = React.useMemo(() => {
    const pool = new Set([...(takenKeys || []), ...(reservedKeys || [])]);
    return rows.map((row) => {
      const suggestion = window.packImport.suggestSlug(row.slug, row.packId, pool);
      pool.add(suggestion);
      return suggestion;
    });
  }, [rows]);

  function setValueAt(i, v) {
    setValues((prev) => {
      const next = prev.slice();
      next[i] = v;
      return next;
    });
  }

  function applyRowSuggestion(i) {
    setValueAt(i, suggestions[i]);
  }

  function applyAllSuggestions() {
    setValues(suggestions.slice());
  }

  function errorCodeFor(i) {
    const others = values.filter((_, idx) => idx !== i).map((v) => window.packImport.slugKey(v));
    const taken = new Set([...(takenKeys || []), ...others]);
    return window.packImport.validateSlugRename(values[i], reservedKeys, taken);
  }

  const errorCodes = rows.map((_row, i) => errorCodeFor(i));
  const ERROR_KEY = { format: 'rename.errorFormat', reserved: 'rename.errorReserved', duplicate: 'rename.errorDuplicate' };
  const hasAnyError = errorCodes.some((code) => !!code);
  const submitDisabled = busy || hasAnyError;

  function handleSubmit() {
    if (submitDisabled) return;
    onSubmit(rows.map((r, i) => ({ packId: r.packId, slug: r.slug, newSlug: values[i] })));
  }

  return (
    <div style={{ flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column' }}>
      <div style={{ flex: 1, minHeight: 0, overflowY: 'auto', padding: 16 }}>
        <p style={{ fontSize: 14, fontWeight: 400, lineHeight: 1.5, margin: '0 0 16px' }}>
          {tt(lang, 'rename.intro')}
        </p>

        {rows.map((row, i) => {
          const rowName = String(row.name || '').slice(0, 64);
          const rowSlug = String(row.slug || '').slice(0, 64);
          const incomingLabel = tt(lang, 'rename.rowIncoming', { name: rowName, slug: rowSlug });
          const errorCode = errorCodes[i];
          const errorId = `hifi-rename-error-${i}`;

          return (
            <div key={row.packId + ':' + row.slug} style={{ marginBottom: 16, paddingBottom: 16, borderBottom: '1px solid var(--surface1)' }}>
              <div style={{ fontWeight: 700, fontSize: 14, overflowWrap: 'anywhere' }}>{incomingLabel}</div>
              {(row.existing || []).map((owner, oi) => (
                <div
                  key={oi}
                  style={{ marginTop: 2, fontSize: 12, color: 'var(--subtext0)', overflowWrap: 'anywhere' }}
                >
                  {tt(lang, 'rename.rowExisting', { pack: String(owner.label || '').slice(0, 64), name: String(owner.name || '').slice(0, 64) })}
                </div>
              ))}

              <div style={{ display: 'flex', gap: 8, marginTop: 8, alignItems: 'center', flexWrap: 'wrap' }}>
                <input
                  className="hifi-input"
                  type="text"
                  value={values[i]}
                  onChange={(e) => setValueAt(i, e.target.value)}
                  disabled={busy}
                  aria-label={incomingLabel}
                  aria-describedby={errorCode ? errorId : undefined}
                  style={{ flex: '1 1 200px', minWidth: 0 }}
                />
                <button
                  type="button"
                  className="hifi-btn-ghost"
                  onClick={() => applyRowSuggestion(i)}
                  disabled={busy}
                >{tt(lang, 'rename.suggestion', { slug: suggestions[i] })}</button>
              </div>

              {errorCode && (
                <div id={errorId} role="alert" aria-live="polite" style={{ marginTop: 6, color: 'var(--red)', fontSize: 12, lineHeight: 1.4 }}>
                  {tt(lang, ERROR_KEY[errorCode])}
                </div>
              )}
            </div>
          );
        })}

        {typeof impact === 'number' && impact > 0 && (
          <div style={{ fontSize: 13, lineHeight: 1.5, color: 'var(--subtext0)' }}>
            {tt(lang, 'rename.impactWarning.' + window.i18nPlural(impact), { n: impact })}
          </div>
        )}
      </div>

      <div style={{ flexShrink: 0, padding: 16, borderTop: '1px solid var(--surface1)' }}>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          <button type="button" className="hifi-btn-secondary" onClick={applyAllSuggestions} disabled={busy}>
            {tt(lang, 'rename.applyAllSuffix')}
          </button>
          <button type="button" className="hifi-btn-ghost" onClick={onCancel} disabled={busy} style={{ marginLeft: 'auto' }}>
            {tt(lang, 'rename.cancel')}
          </button>
          <button type="button" className="hifi-btn-primary" onClick={handleSubmit} disabled={submitDisabled}>
            {busy ? tt(lang, 'rename.submitting') : tt(lang, 'rename.submit')}
          </button>
        </div>
        {submitDisabled && !busy && (
          <div style={{ marginTop: 8, fontSize: 12, color: 'var(--subtext0)' }}>{tt(lang, 'rename.submitDisabledHint')}</div>
        )}
      </div>
    </div>
  );
}

// ──────────────────────────────────────────────────────────────────
// DIÁLOGO — shell modal, mesmo padrão de pack-import-dialog.jsx
// ──────────────────────────────────────────────────────────────────
function PackRenameDialog({ lang, dark, theme, open, rows, reservedKeys, takenKeys, impact, onCancel, onSubmit }) {
  const [busy, setBusy] = React.useState(false);
  const dialogRef = React.useRef(null);
  window.useDialogA11y?.(dialogRef, open, onCancel);

  if (!open) return null;

  const themeClass = `hifi ${dark ? 'hifi-dark' : 'hifi-light'}${theme && theme !== 'catppuccin' ? ' hifi-theme-' + theme : ''}`;

  async function handleSubmit(list) {
    setBusy(true);
    try {
      await onSubmit(list);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div
      className={themeClass}
      style={{
        position: 'fixed', inset: 0, zIndex: 100,
        background: 'rgba(0,0,0,0.55)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        padding: 18,
      }}
      onClick={onCancel}
    >
      <section
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-label={tt(lang, 'rename.title')}
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
          padding: 16,
          borderBottom: '1px solid var(--surface1)',
        }}>
          <h2 style={{ fontSize: 20, fontWeight: 700, lineHeight: 1.2, margin: 0 }}>{tt(lang, 'rename.title')}</h2>
        </header>

        <PackRenameForm
          lang={lang}
          rows={rows}
          reservedKeys={reservedKeys}
          takenKeys={takenKeys}
          impact={impact}
          busy={busy}
          onCancel={onCancel}
          onSubmit={handleSubmit}
        />
      </section>
    </div>
  );
}

// ──────────────────────────────────────────────────────────────────
// EXPOSIÇÃO
// ──────────────────────────────────────────────────────────────────
Object.assign(window, {
  PackRenameDialog,
  renameInstalledPackSlugs,
  renameImpact,
});
