// Transition Banner — aviso de migração pós-descomissionamento (MIGR-03).
//
// Este módulo possui: `TransitionBannerRoot` (decide, uma vez no boot, se o usuário é
// "existente" — D-06 — e mantém a contagem de órfãs e o estado de dispensa) e
// `TransitionBanner` (a apresentação: barra fixa dispensável no topo, D-05, nunca modal).
//
// Este módulo NÃO possui: nenhum caminho de escrita em `hifi_bookmarks_v1` ou
// `hifi_chars_v1` — o sinal de usuário existente e a contagem de órfãs só LEEM, via
// `peekBookmarks()` (entregue em 06-02) e `peekCharacters()` (entregue em 06-07 pra
// fechar o defeito de `loadCharacters()` sintetizando o personagem default como
// evidência de usuário existente). Não oferece, linka ou nomeia nenhum pack em
// português (D-02) — a única saída pra conteúdo completo é "importe o seu próprio
// pacote". Não introduz nenhum aviso recorrente novo (D-03): dispensado uma vez,
// nunca mais aparece.
//
// Uso: incluir este arquivo no HTML depois de `pack-manager.jsx` (consome
// `window.__openPackManager`) e antes de `v10-hifi.jsx`. Monta `<TransitionBannerRoot
// lang={uiLang} dark={dark} theme={theme} />` ao lado de `<PackManagerRoot ... />`,
// recebendo SEMPRE `uiLang` — nunca uma derivação da versão de magias ativa (D-01).

// D-06: sinal de "usuário existente", avaliado UMA vez (inicializador de estado, não a
// cada render). Qualquer um dos três basta. `peekCharacters()` e `peekBookmarks()` são
// OBRIGATÓRIOS aqui — `loadCharacters()` sintetiza o personagem default quando não há
// nada salvo (o defeito que 06-07 fecha) e `loadBookmarks()` tem um ramo de escrita
// (migração de favoritas por personagem) que CRIARIA `hifi_bookmarks_v1` numa
// instalação nova (WR-01, fechado em 06-02) — os dois atravessariam a fronteira
// "leitor de estado → decisão de produto" como se fossem fato sobre o usuário.
function _hasExistingUserSignal() {
  if (window.__legacyVersionFallback != null) return true;
  const chars = typeof window.peekCharacters === 'function' ? window.peekCharacters() : [];
  if (Array.isArray(chars) && chars.length > 0) return true;
  const bookmarks = typeof window.peekBookmarks === 'function' ? window.peekBookmarks() : [];
  if (Array.isArray(bookmarks) && bookmarks.length > 0) return true;
  return false;
}

// D-07: mesmo parse defensivo do `loadPrefs()` de index.html, repetido aqui em vez de
// importado — este arquivo carrega ANTES do bloco inline que declara `UI_PREFS_KEY`
// (mesma posição relativa de `spells-data-loader.jsx`, que faz o mesmo pelo mesmo motivo:
// um `const` de mesmo nome nos dois arquivos colidiria no escopo global compartilhado
// entre scripts clássicos).
function _peekUiPrefsBlob() {
  try { return JSON.parse(localStorage.getItem('spellbook-ui-prefs')) || {}; } catch (e) { return {}; }
}

// D-13: une as chaves de `prepared` de todos os personagens (via `peekCharacters()`)
// com as de `peekBookmarks()` e conta as ausentes de `resolvable`. `resolvable === null`
// é "ainda não sei" (fetch falhou ou indeterminado) e devolve `null` — nunca "zero
// órfãs" por omissão.
function _countOrphans(resolvable) {
  if (!resolvable) return null;
  const chars = typeof window.peekCharacters === 'function' ? window.peekCharacters() : [];
  const bookmarks = typeof window.peekBookmarks === 'function' ? window.peekBookmarks() : [];
  const userKeys = new Set(Array.isArray(bookmarks) ? bookmarks : []);
  (Array.isArray(chars) ? chars : []).forEach((c) => {
    (Array.isArray(c && c.prepared) ? c.prepared : []).forEach((k) => userKeys.add(k));
  });
  let missing = 0;
  userKeys.forEach((k) => { if (!resolvable.has(k)) missing += 1; });
  return missing;
}

function TransitionBannerRoot({ lang, dark, theme }) {
  const [isExistingUser] = React.useState(_hasExistingUserSignal);
  const [dismissed, setDismissed] = React.useState(() => !!_peekUiPrefsBlob().migrationNoticeDismissed);
  // null = ainda não sei (D-13) — o banner nunca renderiza "0 magias" nesse estado.
  const [orphanCount, setOrphanCount] = React.useState(null);

  React.useEffect(() => {
    if (!isExistingUser || dismissed) return undefined;
    let cancelled = false;
    const recompute = () => {
      if (typeof window.resolvableSpellKeys !== 'function') {
        if (!cancelled) setOrphanCount(null);
        return;
      }
      window.resolvableSpellKeys().then((resolvable) => {
        if (!cancelled) setOrphanCount(_countOrphans(resolvable));
      });
    };
    recompute();
    window.addEventListener('hifi-plugins-changed', recompute);
    return () => {
      cancelled = true;
      window.removeEventListener('hifi-plugins-changed', recompute);
    };
  }, [isExistingUser, dismissed]);

  // D-07: lê o blob atual (defensivo), regrava o blob INTEIRO com só o campo de
  // dispensa acrescentado — nunca cria chave nova, nunca apaga campo alheio.
  const handleDismiss = React.useCallback(() => {
    const prev = _peekUiPrefsBlob();
    try {
      localStorage.setItem('spellbook-ui-prefs', JSON.stringify(Object.assign({}, prev, { migrationNoticeDismissed: true })));
    } catch (e) {}
    setDismissed(true);
  }, []);

  if (!isExistingUser || dismissed) return null;

  return (
    <TransitionBanner lang={lang} dark={dark} theme={theme} orphanCount={orphanCount} onDismiss={handleDismiss} />
  );
}

// Apresentação. Barra fixa no topo, NÃO modal (D-05): sem backdrop, sem trava de foco,
// sem bloqueio de scroll, sem timeout — o app inteiro continua clicável e a dispensa é a
// única forma de fechar. zIndex abaixo dos diálogos modais do app (100) e acima do
// conteúdo de rolagem normal.
function TransitionBanner({ lang, dark, theme, orphanCount, onDismiss }) {
  const themeClass = `hifi ${dark ? 'hifi-dark' : 'hifi-light'}${theme && theme !== 'catppuccin' ? ' hifi-theme-' + theme : ''}`;
  const orphanKey = orphanCount === 1 ? 'migration.orphansOne' : 'migration.orphansMany';

  return (
    <div
      className={themeClass}
      role="region"
      aria-label={tt(lang, 'migration.title')}
      style={{
        position: 'fixed', top: 0, left: 0, right: 0, zIndex: 90,
        background: 'var(--mantle)', color: 'var(--text)',
        borderBottom: '1px solid var(--surface1)',
        padding: '12px 16px',
      }}
    >
      <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'flex-start', gap: 12, maxWidth: 860, margin: '0 auto' }}>
        <div style={{ flex: '1 1 240px', minWidth: 0 }}>
          <h2 style={{ margin: '0 0 4px', fontSize: 15, fontWeight: 700, fontFamily: "'Marauder Text', Georgia, serif" }}>
            {tt(lang, 'migration.title')}
          </h2>
          <p style={{ margin: '0 0 4px', fontSize: 13 }}>{tt(lang, 'migration.removed')}</p>
          <p style={{ margin: '0 0 4px', fontSize: 13 }}>{tt(lang, 'migration.kept')}</p>
          {orphanCount > 0 && (
            <p style={{ margin: '0 0 4px', fontSize: 13, color: 'var(--subtext0)' }}>
              {tt(lang, orphanKey, { n: orphanCount })}
            </p>
          )}
          <p style={{ margin: '0 0 8px', fontSize: 13 }}>{tt(lang, 'migration.importCta')}</p>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
            <button type="button" className="hifi-btn-primary" onClick={() => window.__openPackManager?.()}>
              {tt(lang, 'migration.openManager')}
            </button>
            <a
              href="pack-docs.html"
              target="_blank"
              rel="noopener noreferrer"
              className="hifi-btn-secondary"
              style={{ textDecoration: 'none', display: 'inline-flex', alignItems: 'center' }}
            >
              {tt(lang, 'migration.learnMore')}
            </a>
          </div>
        </div>
        {/* Dispensar usa `hifi-btn-secondary`, não `hifi-btn-ghost`: a variante
            ghost não tem borda nem fundo e usa `--subtext0`, a afordância mais
            fraca do sistema. Num banner que ocupa ~40% da tela no celular, a
            única saída precisa parecer clicável. Fica abaixo do CTA primário
            (roxo) na hierarquia, mas acima de "texto solto". */}
        <button
          type="button"
          className="hifi-btn-secondary"
          onClick={onDismiss}
          aria-label={tt(lang, 'migration.dismissAria')}
          style={{ flex: '0 0 auto' }}
        >
          {tt(lang, 'migration.dismiss')}
        </button>
      </div>
    </div>
  );
}

Object.assign(window, { TransitionBanner, TransitionBannerRoot });
