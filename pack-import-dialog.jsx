// Pack Import Dialog — superfície mínima de import de arquivo/URL (PKG-02/PKG-03, D-12).
//
// Este módulo possui: `PackImportDialog` (o diálogo em si — alternador de modo
// arquivo/URL, envio, erro inline, sucesso com identificador aplicado) e
// `PackImportRoot` (estado `open` + botão gatilho provisório).
//
// Este módulo NÃO possui: validação/sanitização/gravação de pacote — chama
// as duas funções de instalação de window.packImport (contrato dos planos
// 03-03/03-05) e nunca abre IndexedDB por conta própria; onde o import "vive"
// na UI final é decisão da Fase 5 (D-12) — PackImportRoot é só o mínimo pra
// PKG-02/PKG-03 serem alcançáveis nesta fase.
//
// Uso: incluir este arquivo no HTML depois de i18n.jsx e de pack-import.jsx
// (plano 03-07 decide a montagem exata em index.html).

// Mapa fixo código→chave i18n. Os cinco valores são o contrato de
// window.packImport.PACK_ERROR_CODES (strings literais, não o objeto em si —
// não depende da ordem de carga dos scripts).
// WR-09: sem prototipo — code vem de um erro lancado por qualquer caminho de
// storage (putPack/_assertPackShape/openDB/IndexedDB), nao so pelos 5 codes
// pre-storage de window.packImport. Um objeto literal indexado por
// 'constructor' devolveria a funcao Object herdada (truthy), passando pelo
// fallback `|| 'packErr.unknown'` e virando filho React invalido em tt().
const PACK_ERR_KEY_BY_CODE = Object.assign(Object.create(null), {
  'malformed-json': 'packErr.malformedJson',
  'blocked-key': 'packErr.blockedKey',
  'too-large': 'packErr.tooLarge',
  'schema-invalid': 'packErr.schemaInvalid',
  'fetch-failed': 'packErr.fetchFailed',
});

function packErrKeyFor(err) {
  const code = err && err.code;
  if (typeof code === 'string' && PACK_ERR_KEY_BY_CODE[code]) return PACK_ERR_KEY_BY_CODE[code];
  // WR-09: tudo depois da validacao (putPack's _assertPackShape, openDB's
  // onblocked, DOMException de verdade) nao tem `.code` nesse conjunto e
  // colapsava pra packErr.unknown - inclusive a falha mais provavel de
  // acontecer de verdade num pack de 10 MB: estourar a quota (DOMException
  // legado usa `.code` NUMERICO 22, nao string).
  if (err && (err.name === 'QuotaExceededError' || code === 22)) return 'packErr.quota';
  return 'packErr.unknown';
}

function PackImportDialog({ lang, dark, theme, open, onClose }) {
  const [mode, setMode] = React.useState('file');
  const [file, setFile] = React.useState(null);
  const [url, setUrl] = React.useState('');
  const [busy, setBusy] = React.useState(false);
  const [error, setError] = React.useState('');
  const [result, setResult] = React.useState(null);

  const dialogRef = React.useRef(null);
  const fileInputRef = React.useRef(null);
  window.useDialogA11y?.(dialogRef, open, onClose);

  // WR-08: PackImportRoot nunca desmonta o diálogo (`open` só faz esta
  // função devolver null), então result/file/url/error sobreviviam a um
  // close/reopen. Reabrir depois de um import bem-sucedido caía direto na
  // tela de sucesso anterior, e `file` continuava setado com hasValue=true —
  // clicar em enviar de novo reinstalava o mesmo arquivo como pack duplicado.
  React.useEffect(() => {
    if (!open) return;
    setResult(null); setError(''); setFile(null); setUrl(''); setMode('file');
  }, [open]);

  if (!open) return null;

  const themeClass = `hifi ${dark ? 'hifi-dark' : 'hifi-light'}${theme && theme !== 'catppuccin' ? ' hifi-theme-' + theme : ''}`;

  function switchMode(next) {
    if (busy) return;
    setMode(next);
    setError('');
    if (next === 'file') setUrl('');
    else setFile(null);
  }

  function onFileChange(e) {
    setFile((e.target.files && e.target.files[0]) || null);
    setError('');
  }

  function onUrlChange(e) {
    setUrl(e.target.value);
    setError('');
  }

  async function handleSubmit() {
    setError('');
    setResult(null);
    setBusy(true);
    try {
      const res = mode === 'file'
        ? await window.packImport.installFromFile(file)
        : await window.packImport.installFromUrl(url.trim());
      setResult(res);
      window.dispatchEvent(new CustomEvent('hifi-toast', { detail: { msg: tt(lang, 'import.success', { identifier: res.identifier }) } }));
      // Reconstrói o registro de versões do loader e dispara hifi-plugins-changed
      // — a entrada nova aparece no seletor sem recarregar a página (04-02).
      // Sem await: não é preciso segurar o feedback de sucesso na chamada de
      // storage. WR-10: refreshPluginVersions() absorve a PRÓPRIA falha de
      // enumeração, mas chama setCurrentVersion() e dispara eventos - um throw
      // futuro ali (ou num listener síncrono no mesmo call frame) virava
      // rejeição não tratada sem nenhum rastro ligado a este import. Os dois
      // call sites de boot (spells-data-loader.jsx) já tratam com .catch() por
      // exatamente este motivo; este era o único que não.
      if (typeof window.refreshPluginVersions === 'function') {
        window.refreshPluginVersions().catch(e =>
          console.warn('[pack-import-dialog] refreshPluginVersions falhou após instalar:', e));
      }
    } catch (err) {
      const code = err && err.code;
      const msg = tt(lang, packErrKeyFor(err));
      setError(msg);
      if (code === 'fetch-failed') {
        window.dispatchEvent(new CustomEvent('hifi-toast', { detail: { msg, kind: 'err' } }));
      }
    } finally {
      setBusy(false);
    }
  }

  const hasValue = mode === 'file' ? !!file : url.trim().length > 0;
  const submitDisabled = busy || !hasValue;

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
        aria-label={tt(lang, 'import.title')}
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
          <h2 style={{ fontSize: 20, fontWeight: 700, lineHeight: 1.2, margin: 0 }}>{tt(lang, 'import.title')}</h2>
          <button type="button" className="hifi-btn-ghost" onClick={onClose}>{tt(lang, 'import.close')}</button>
        </header>

        <div style={{ flex: 1, overflowY: 'auto', padding: 16 }}>
          {result ? (
            <div>
              <div className="hifi-mono" style={{ overflowWrap: 'anywhere' }}>
                {tt(lang, 'import.success', { identifier: result.identifier })}
              </div>
              <div style={{ marginTop: 8, fontSize: 14, lineHeight: 1.5 }}>
                {tt(lang, 'import.successCount', { n: result.spellCount })}
              </div>
              {result.changedFields > 0 && (
                <div style={{ marginTop: 8, fontSize: 14, lineHeight: 1.5, color: 'var(--subtext0)' }}>
                  {tt(lang, 'import.sanitizedNote', { n: result.changedFields })}
                </div>
              )}
            </div>
          ) : (
            <>
              <h3 style={{ fontSize: 20, fontWeight: 700, lineHeight: 1.2, margin: '0 0 8px' }}>
                {tt(lang, 'import.emptyHeading')}
              </h3>
              <p style={{ fontSize: 14, fontWeight: 400, lineHeight: 1.5, margin: '0 0 16px' }}>
                {tt(lang, 'import.emptyBody')}{' '}
                {tt(lang, 'import.docsPrefix')}
                <a href="pack-docs.html" target="_blank" rel="noopener" style={{ color: 'var(--accent)' }}>
                  {tt(lang, 'import.docsLink')}
                </a>.
              </p>

              <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
                <button
                  type="button"
                  className={mode === 'file' ? 'hifi-btn-primary' : 'hifi-btn-secondary'}
                  onClick={() => switchMode('file')}
                  disabled={busy}
                >{tt(lang, 'import.modeFile')}</button>
                <button
                  type="button"
                  className={mode === 'url' ? 'hifi-btn-primary' : 'hifi-btn-secondary'}
                  onClick={() => switchMode('url')}
                  disabled={busy}
                >{tt(lang, 'import.modeUrl')}</button>
              </div>

              {mode === 'file' ? (
                <div>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="application/json,.json"
                    onChange={onFileChange}
                    disabled={busy}
                    style={{ display: 'none' }}
                  />
                  <button
                    type="button"
                    className="hifi-btn-secondary"
                    onClick={() => fileInputRef.current?.click()}
                    disabled={busy}
                  >{tt(lang, 'import.chooseFile')}</button>
                  {file && (
                    <div
                      className="hifi-mono"
                      title={file.name}
                      style={{ marginTop: 8, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}
                    >{file.name}</div>
                  )}
                </div>
              ) : (
                <div>
                  <label className="hifi-section-label" htmlFor="pack-import-url">{tt(lang, 'import.urlLabel')}</label>
                  <input
                    id="pack-import-url"
                    className="hifi-input"
                    type="url"
                    value={url}
                    onChange={onUrlChange}
                    placeholder={tt(lang, 'import.urlPlaceholder')}
                    disabled={busy}
                    style={{ display: 'block', width: '100%', marginTop: 4 }}
                  />
                </div>
              )}

              {error && (
                <div style={{ marginTop: 8, color: 'var(--red)', fontSize: 12, lineHeight: 1.4 }}>{error}</div>
              )}

              <div className="hifi-section-label" style={{ marginTop: 12 }}>{tt(lang, 'import.sizeHint')}</div>
            </>
          )}
        </div>

        <footer style={{ flexShrink: 0, padding: 16, borderTop: '1px solid var(--surface1)' }}>
          <button
            type="button"
            className="hifi-btn-primary"
            onClick={handleSubmit}
            disabled={submitDisabled}
            style={{ width: '100%', justifyContent: 'center' }}
          >{busy ? tt(lang, 'import.installing') : tt(lang, 'import.installPack')}</button>
        </footer>
      </section>
    </div>
  );
}

function PackImportRoot({ lang, dark, theme }) {
  const [open, setOpen] = React.useState(false);
  return (
    <>
      {/* ponytail: gatilho provisório de D-12 — a Fase 5 decide onde o import
          vive na UI final; até lá é só um botão fixo pra PKG-02/PKG-03 serem
          alcançáveis. Apagar esta tag na Fase 5. */}
      <button
        type="button"
        className="hifi-btn-secondary"
        onClick={() => setOpen(true)}
        style={{ position: 'fixed', left: 16, bottom: 16, zIndex: 90 }}
      >{tt(lang, 'import.open')}</button>
      <PackImportDialog lang={lang} dark={dark} theme={theme} open={open} onClose={() => setOpen(false)} />
    </>
  );
}
