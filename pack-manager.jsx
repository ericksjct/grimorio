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
// MODELO DO CARTÃO (Fase 8, D-16..D-19) — funções puras, sem componente
// ──────────────────────────────────────────────────────────────────

// Hash estável do identificador do pacote sobre as 10 cores --level-0..9
// (D-19) — cor do marcador quando não há imagem, SÓ no menu; nunca tinge a
// grade. Determinística (mesma entrada → mesma saída) e nunca negativa.
function _packColorIndex(source) {
  return Math.abs(Array.from(String(source || '')).reduce((h, c) => (h * 31 + c.charCodeAt(0)) | 0, 0)) % 10;
}

// Defesa em profundidade (T-08-23): revalida `meta.image` com a MESMA regex e
// o MESMO teto que o import já checou antes de deixar chegar a um `<img
// src>` — qualquer coisa que não seja um data: URI raster dentro do teto
// devolve null, e o chamador cai pro marcador de cor (D-17).
function _safeImage(image) {
  if (typeof image !== 'string') return null;
  if (image.length > window.packImport.MAX_IMAGE_CHARS) return null;
  if (!window.packImport.IMAGE_DATA_URI.test(image)) return null;
  return image;
}

// Descrição derivada do cartão (D-17): autor · versão · idioma · edição · N
// magias — sem nenhum campo novo no schema. `count` não numérico vira '?' e a
// pluralização de nounSpell trata isso como plural (uma contagem desconhecida
// não é "1 magia").
function _cardMetaVars(row, lang) {
  const n = typeof row.count === 'number' && Number.isFinite(row.count) ? row.count : '?';
  return {
    author: row.author || tt(lang, 'menu.authorUnknown'),
    version: row.version || '?',
    lang: row.lang === 'ptbr' ? 'PT' : 'EN',
    edition: row.edition ? ' · ' + row.edition : '',
    n,
    nounSpell: tt(lang, 'noun.spell.' + window.i18nPlural(n === '?' ? 2 : n)),
  };
}

// ──────────────────────────────────────────────────────────────────
// MODELO DE LINHA — funções puras, sem componente
// ──────────────────────────────────────────────────────────────────

// meta de pack instalado (plugin-store.jsx listPacks()) → linha de exibição.
// `id` é o id do pluginStore (usado por deletePack); `versionKey` é a chave em
// window.SPELL_VERSIONS ('plugin-' + source, ver _packToVersion em
// spells-data-loader.jsx) — os dois divergem, por isso ficam em campos
// separados em vez de reusar um só pro índice de duplicatas (D-10) e pra remoção (MGMT-02).
// `author`/`lang`/`edition`/`image`/`source` vêm direto do meta (D-16/D-17) — o
// pluginStore.listPacks() já devolve o objeto meta do pack.schema.json inteiro.
function _installedRows(metas) {
  return (metas || []).map((meta) => ({
    id: meta.source,
    versionKey: 'plugin-' + meta.source,
    source: meta.source,
    name: meta.name,
    version: meta.version,
    author: meta.author,
    lang: meta.lang,
    edition: meta.edition,
    image: meta.image,
    count: meta.spellCount,
    origin: 'installed',
    license: meta.license || null,
  }));
}

// entradas SRD de window.SPELL_VERSIONS (source:'fetch', corpus:'srd') → linha de exibição.
// A-01 (flagged assumption do plano): só as duas entradas com corpus 'srd' viram linha
// builtin — as legadas PHB/PT-BR não têm manifesto de licença e saem na Fase 6.
// `author`/`version`/`edition`/`count` vêm de getVersionMeta(v.key) quando o
// JSON builtin já carregou (mesmo efeito que hoje carrega a licença).
function _builtinRows(versions, licenses) {
  return (versions || [])
    .filter((v) => v.source === 'fetch' && v.corpus === 'srd')
    .map((v) => {
      const license = licenses && licenses[v.key] ? licenses[v.key] : null;
      const meta = window.getVersionMeta ? window.getVersionMeta(v.key) : null;
      return {
        id: v.key,
        versionKey: v.key,
        source: v.key,
        name: v.labelEn,
        version: meta ? meta.version : v.short,
        author: meta ? meta.author : null,
        lang: v.lang,
        edition: meta ? meta.edition : null,
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

// CR-01: `byName` e `byKey` respondem perguntas DIFERENTES e por isso têm
// populações diferentes.
//
// `byName` alimenta a contagem de duplicatas exibida (MGMT-04) e a nota "Também
// em:". É display, então segue as regras de display: só os packs do usuário e as
// duas edições SRD com manifesto de licença (A-01). Incluir os quatro builtins
// PHB aqui faria toda linha SRD anunciar ~322 duplicatas — o mesmo ruído
// constante que A-05 existe para evitar, só que noutro par.
//
// `byKey` responde "esta chave preparada/favoritada ainda resolve se eu remover
// este pack?" (MGMT-02). Isso é resolução, não display: QUALQUER versão que
// sirva a chave conta, PHB inclusive. `hifiSpellKey` é `school-lvl-en`, e
// `adaptSpell` normaliza school pra índice numérico e `en` pro nome em inglês
// cru — então a chave é independente de versão, e 322 das 339 magias do SRD
// 5.2 têm nome idêntico no PHB 2024 EN. Filtrar PHB daqui fazia a confirmação
// de remoção dizer "deixa de resolver" sobre magias que o PHB continua servindo.
function _indexPopulation() {
  const versions = window.SPELL_VERSIONS || [];
  return {
    // toda versão indexável — base da resolução (byKey)
    resolution: versions,
    // subconjunto de display — base da contagem de duplicatas (byName)
    display: new Set(versions.filter((v) => v.source === 'idb' || v.corpus === 'srd').map((v) => v.key)),
  };
}

async function _buildSpellIndex() {
  const { resolution, display } = _indexPopulation();

  // ponytail: sem nenhum pack instalado, não há duplicata entre pacotes E não há
  // remoção possível — os dois consumidores do índice ficam sem pergunta a fazer.
  // Devolve índice vazio sem pagar o parse de nenhum JSON. Upgrade path se isso
  // um dia precisar mudar: construir sob demanda no primeiro toggle da seção de
  // duplicatas, não na abertura do gerenciador.
  if (!resolution.some((v) => v.source === 'idb')) {
    return { byName: new Map(), byKey: new Map(), corpusOf: new Map(), labelOf: new Map() };
  }
  const all = resolution;

  const byName = new Map();
  const byKey = new Map();
  const corpusOf = new Map();
  const labelOf = new Map();
  const hasSpellKey = typeof window.hifiSpellKey === 'function';
  if (!hasSpellKey) {
    console.warn('[pack-manager] window.hifiSpellKey ausente — índice byKey não será construído.');
  }

  for (const v of all) {
    // corpusOf/labelOf só descrevem linhas de display — _computeDupCounts itera
    // corpusOf pra semear as contagens, então incluir PHB aqui inventaria linhas.
    const isDisplay = display.has(v.key);
    if (isDisplay) {
      corpusOf.set(v.key, v.corpus);
      labelOf.set(v.key, v.labelEn || v.short || v.key);
    }
    let spells;
    try {
      spells = await window.loadSpellVersion(v.key);
    } catch (e) {
      console.warn('[pack-manager] falha ao carregar versão para índice:', v.key, e);
      continue;
    }
    // CR-02: Set, não array. Um pack que lista a mesma magia duas vezes gerava
    // ['plugin-x','plugin-x'], e o `length === 1` de staleKey passava a ser falso
    // — a magia era relatada como NÃO impactada pela remoção do único pack que a
    // servia. Com Set a unicidade é estrutural, e não depende de cada consumidor
    // lembrar de deduplicar (era essa assimetria — _computeDupCounts deduplicava,
    // _removalImpact não — que escondia o bug).
    (spells || []).forEach((spell) => {
      if (isDisplay) {
        const nameKey = String(spell.en || '').toLowerCase();
        if (nameKey) {
          if (!byName.has(nameKey)) byName.set(nameKey, new Set());
          byName.get(nameKey).add(v.key);
        }
      }
      if (hasSpellKey) {
        const k = window.hifiSpellKey(spell);
        if (!byKey.has(k)) byKey.set(k, new Set());
        byKey.get(k).add(v.key);
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
    // byName já é um Set (CR-02) — a unicidade vem do índice, não daqui.
    const uniqueKeys = [...keys];
    uniqueKeys.forEach((k) => {
      const isDup = uniqueKeys.some((k2) => k2 !== k && _countsAsDuplicate(index.corpusOf.get(k), index.corpusOf.get(k2)));
      if (isDup) counts[k] = (counts[k] || 0) + 1;
    });
  });
  return counts;
}

// Impacto concreto de remover `versionKey` (MGMT-02/D-06) — derivado no render, nunca persistido
// por este módulo. Uma chave "deixa de resolver" quando o índice a lista e `versionKey` é a ÚNICA
// fonte dela; se qualquer outra versão também a provê — pack, SRD ou PHB (CR-01) — a preparada
// continua resolvendo e não entra na contagem.
//
// WR-01, fechado: este módulo lê favoritas pelo acessor puro `peekBookmarks()`
// (v11-character-editor.jsx, exportado em window), sem nenhum ramo de escrita — nunca chama `setItem`,
// `removeItem` ou `dispatchEvent`. A garantia P-01/D-07 de bytes idênticos é uma propriedade
// local desta chamada, não depende mais do acessor migratório (que TEM ramo de escrita)
// já ter rodado no boot antes deste módulo abrir. A pureza é provada por execução, não por
// leitura de texto, em `scripts/check-bookmarks-read-purity.tests.ps1` (MGMT-02).
function _removalImpact(versionKey, index) {
  const impact = { prepared: 0, characters: 0, bookmarked: 0 };
  if (!index || !index.byKey) return impact;

  const staleKey = (key) => {
    const sources = index.byKey.get(key);
    return !!sources && sources.size === 1 && sources.has(versionKey);
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

  const bookmarks = window.peekBookmarks ? window.peekBookmarks() : [];
  (bookmarks || []).forEach((key) => {
    if (staleKey(key)) impact.bookmarked += 1;
  });

  return impact;
}

// ──────────────────────────────────────────────────────────────────
// CARTÃO
// ──────────────────────────────────────────────────────────────────

// Miniatura do pacote (D-17/D-19): imagem revalidada por _safeImage, senão um
// marcador com a inicial do título sobre a cor de hash do pacote. Nunca tinge
// nada fora do menu — a grade principal não consome _packColorIndex.
function PackThumb({ row, size }) {
  const safe = _safeImage(row.image);
  const boxStyle = {
    width: size, height: size, flexShrink: 0,
    borderRadius: 8, border: '1px solid var(--surface1)',
  };
  if (safe) {
    return <img src={safe} alt="" width={size} height={size} style={{ ...boxStyle, objectFit: 'cover' }} />;
  }
  const initial = String(row.name || '?').trim().charAt(0).toUpperCase() || '?';
  return (
    <div
      aria-hidden="true"
      style={{
        ...boxStyle,
        background: `var(--level-${_packColorIndex(row.source || row.id)})`,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
      }}
    >
      <span className="hifi-mono" style={{ color: 'var(--base)', fontSize: Math.round(size * 0.45), lineHeight: 1 }}>{initial}</span>
    </div>
  );
}

// Um cartão marcável: checkbox + miniatura + título/descrição derivada, com
// remoção inline (só instalados) e licença (só quem tem manifesto).
function PackCard({ lang, row, size, checked, disabled, onToggle, dupCount, confirming, impact, onRequestRemove, onCancelRemove, onConfirmRemove }) {
  const inputId = 'hifi-pack-card-' + row.versionKey;
  // Nome vem de arquivo de terceiro (T-08-24): sempre filho de texto React, recortado.
  const title = String(row.name || '').slice(0, 64);
  const desc = tt(lang, 'menu.cardMeta', _cardMetaVars(row, lang));
  return (
    <div style={{ display: 'flex', gap: 8, alignItems: 'flex-start', padding: '10px 0', borderBottom: '1px solid var(--surface1)' }}>
      <input
        id={inputId}
        type="checkbox"
        checked={checked}
        disabled={disabled}
        onChange={(e) => onToggle(row, e.target.checked)}
        style={{ accentColor: 'var(--accent)', marginTop: 3, flexShrink: 0 }}
      />
      <PackThumb row={row} size={size} />
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: 8 }}>
          <div style={{ flex: 1, minWidth: 0 }}>
            <label htmlFor={inputId} style={{ display: 'block', fontWeight: 700, fontSize: 14, overflowWrap: 'anywhere', cursor: 'pointer' }}>
              {title}
            </label>
            <div
              title={desc}
              style={{ marginTop: 2, fontSize: 12, color: 'var(--subtext0)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}
            >{desc}</div>
          </div>
          {row.origin === 'installed' && !confirming && (
            <button
              type="button"
              className="hifi-icon-btn"
              onClick={onRequestRemove}
              aria-label={tt(lang, 'manager.remove')}
              title={tt(lang, 'manager.remove')}
            >✕</button>
          )}
        </div>

        {typeof dupCount === 'number' && dupCount > 0 && (
          <div style={{ marginTop: 4, fontSize: 12, color: 'var(--subtext0)' }}>
            {tt(lang, 'manager.duplicates', { n: dupCount, nounSpell: tt(lang, 'noun.spell.' + window.i18nPlural(dupCount)) })}
          </div>
        )}

        {row.origin === 'installed' && confirming && (
          <div style={{ marginTop: 8 }}>
            <div style={{ fontSize: 12, color: 'var(--subtext0)', marginBottom: 6 }}>
              {impact && impact.prepared > 0 && (
                <div>{tt(lang, 'manager.impactPrepared.' + window.i18nPlural(impact.prepared), {
                  n: impact.prepared, c: impact.characters,
                  nounChar: tt(lang, 'noun.character.' + window.i18nPlural(impact.characters)),
                })}</div>
              )}
              {impact && impact.bookmarked > 0 && (
                <div>{tt(lang, 'manager.impactBookmarked.' + window.i18nPlural(impact.bookmarked), { n: impact.bookmarked })}</div>
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
    </div>
  );
}

// ──────────────────────────────────────────────────────────────────
// PACK MENU (D-16) — menu único: SRD, instalados, slugs reservados
// ──────────────────────────────────────────────────────────────────

function PackMenu({ lang, dark, theme, open, isMobile, anchor, onClose, onOpenImport, onRequestRename }) {
  const [packs, setPacks] = React.useState(null); // null = carregando; [] = vazio
  const [licenses, setLicenses] = React.useState({}); // versionKey → license dos builtins
  const [dupCounts, setDupCounts] = React.useState({}); // versionKey → contagem agregada de duplicatas (D-10)
  const [confirmingId, setConfirmingId] = React.useState(null); // id (pluginStore) da linha em confirmação — só uma por vez (D-05)
  const [impact, setImpact] = React.useState(null); // { prepared, characters, bookmarked } da linha em confirmação
  const [selected, setSelected] = React.useState(() => window.getSelectedVersionKeys());
  const [busyKey, setBusyKey] = React.useState(null); // versionKey em voo (checagem de colisão/renomeação)
  const [reserved, setReserved] = React.useState(null); // null = ainda não carregado; array = carregado; 'error' = falhou

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

  // Seleção renovada a cada mudança do loader (marcar/desmarcar aqui mesmo,
  // ou de qualquer outro consumidor de window.setSelectedVersionKeys).
  React.useEffect(() => {
    if (!open) return;
    const onSourceChanged = () => setSelected(window.getSelectedVersionKeys());
    setSelected(window.getSelectedVersionKeys());
    window.addEventListener('hifi-spells-source-changed', onSourceChanged);
    return () => window.removeEventListener('hifi-spells-source-changed', onSourceChanged);
  }, [open]);

  // installedRows recomputado a cada render a partir de `packs` — leve o bastante (lista de
  // packs instalados) pra não precisar de memoização, e os handlers de remoção abaixo precisam
  // dele pra resolver versionKey/name a partir do id em confirmação.
  const installedRows = packs ? _installedRows(packs) : [];

  // Impacto concreto da linha em confirmação (D-06) — recalcula sempre que a confirmação abre ou
  // que o índice muda. Nunca persistido.
  React.useEffect(() => {
    setImpact(null); // evita mostrar o impacto da linha anterior enquanto o novo cálculo carrega
    if (!confirmingId) return;
    const row = installedRows.find((r) => r.id === confirmingId);
    if (!row) return;
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
      // Remoção também tira o pack da seleção (D-16) ANTES do refresh — se
      // esvaziar a seleção, o loader emite o toast de fallback sozinho.
      const stillSelected = window.getSelectedVersionKeys();
      if (stillSelected.includes(row.versionKey)) {
        window.setSelectedVersionKeys(stillSelected.filter((k) => k !== row.versionKey));
      }
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

  // ponytail: as licenças SRD carregam na abertura do menu (custo: os JSONs SRD, já
  // pré-cacheados pelo service worker) — se isso pesar, o caminho de upgrade é carregar
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

  // Toggle de seleção (D-02/D-03/D-04): desmarcar tira a chave; marcar acrescenta
  // no FIM da lista, então normalizeSelection() aplica a exclusividade de edição
  // SRD no MESMO update de estado (D-03). Antes de marcar de fato, checa colisão
  // de slug (D-10/A-14): sem conflito, marca direto; com conflito, delega pro
  // prompt de renomear (onRequestRename) e NÃO marca aqui.
  const handleToggle = React.useCallback(async (row, checked) => {
    const current = window.getSelectedVersionKeys();
    if (!checked) {
      window.setSelectedVersionKeys(current.filter((k) => k !== row.versionKey));
      return;
    }
    const next = window.normalizeSelection([...current.filter((k) => k !== row.versionKey), row.versionKey]);
    const version = (window.SPELL_VERSIONS || []).find((v) => v.key === row.versionKey);
    if (!version) return;
    setBusyKey(row.versionKey);
    try {
      const conflict = await _selectionConflicts(version, next);
      if (!conflict.rows.length) {
        window.setSelectedVersionKeys(next);
      } else if (typeof onRequestRename === 'function') {
        onRequestRename({ ...conflict, next });
      }
    } catch (e) {
      console.warn('[pack-manager] falha ao checar conflito de slug na seleção:', e);
      window.dispatchEvent(new CustomEvent('hifi-toast', { detail: { msg: tt(lang, 'packErr.unknown'), kind: 'err' } }));
    } finally {
      setBusyKey(null);
    }
  }, [lang, onRequestRename]);

  // Slugs reservados (D-15): carrega só na primeira abertura do <details>.
  const handleReservedToggle = React.useCallback((e) => {
    if (e.target.open && reserved === null) {
      window.packImport.loadReservedSlugs()
        .then((data) => setReserved(data))
        .catch((err) => {
          console.warn('[pack-manager] falha ao carregar slugs reservados:', err);
          setReserved('error');
        });
    }
  }, [reserved]);

  const reservedPackName = React.useMemo(() => {
    if (!reserved || reserved === 'error') return new Map();
    return new Map((reserved.packs || []).map((p) => [p.source, p.name]));
  }, [reserved]);

  if (!open) return null;

  const themeClass = `hifi ${dark ? 'hifi-dark' : 'hifi-light'}${theme && theme !== 'catppuccin' ? ' hifi-theme-' + theme : ''}`;
  const builtinRows = _builtinRows(window.SPELL_VERSIONS, licenses);
  // D-19: zero pacotes instalados pelo usuário — nunca "zero versões" (a seção
  // SRD continua presente abaixo, sempre).
  const isEmpty = packs !== null && installedRows.length === 0;
  const thumbSize = isMobile ? 32 : 40;

  const panelStyle = isMobile
    ? {
        position: 'fixed', left: 12, right: 12, bottom: 12,
        maxHeight: '80vh', borderRadius: 8,
      }
    : {
        position: 'fixed',
        top: anchor ? anchor.bottom + 6 : 64,
        right: anchor ? Math.max(12, window.innerWidth - anchor.right) : 24,
        width: 'min(420px, calc(100vw - 24px))',
        maxHeight: 'min(72vh, 640px)',
        borderRadius: 6,
      };

  return (
    <div
      className={themeClass}
      style={{
        position: 'fixed', inset: 0, zIndex: 100,
        background: isMobile ? 'rgba(0,0,0,0.35)' : 'transparent',
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
          ...panelStyle,
          display: 'flex',
          flexDirection: 'column',
          background: 'var(--mantle)',
          color: 'var(--text)',
          border: '1px solid var(--surface1)',
          boxShadow: '0 24px 80px rgba(0,0,0,0.45)',
        }}
      >
        <header style={{
          flexShrink: 0,
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: 16,
          borderBottom: '1px solid var(--surface1)',
        }}>
          <h2 style={{ fontSize: 18, fontWeight: 700, lineHeight: 1.2, margin: 0 }}>{tt(lang, 'manager.title')}</h2>
          <button type="button" className="hifi-btn-ghost" onClick={onClose}>{tt(lang, 'import.close')}</button>
        </header>

        <div style={{ flex: 1, overflowY: 'auto', padding: 16 }}>
          <div>
            <div className="hifi-section-label">{tt(lang, 'manager.sectionBuiltin')}</div>
            {builtinRows.map((row) => (
              <PackCard
                key={row.id} lang={lang} row={row} size={thumbSize}
                checked={selected.includes(row.versionKey)}
                disabled={!!busyKey}
                onToggle={handleToggle}
                dupCount={dupCounts[row.versionKey]}
              />
            ))}
          </div>

          <div style={{ marginTop: 16 }}>
            <div className="hifi-section-label">{tt(lang, 'manager.sectionInstalled')}</div>
            {packs === null ? (
              <div style={{ fontSize: 14, color: 'var(--subtext0)', marginTop: 8 }}>{tt(lang, 'manager.loading')}</div>
            ) : isEmpty ? (
              <div style={{ marginTop: 8 }}>
                <h3 style={{ fontSize: 16, fontWeight: 700, lineHeight: 1.2, margin: '0 0 6px' }}>
                  {tt(lang, 'manager.emptyHeading')}
                </h3>
                <p style={{ fontSize: 13, fontWeight: 400, lineHeight: 1.5, margin: 0 }}>
                  {tt(lang, 'manager.emptyBody')}{' '}
                  {tt(lang, 'import.docsPrefix')}
                  <a href="pack-docs.html" target="_blank" rel="noopener" style={{ color: 'var(--accent)' }}>
                    {tt(lang, 'import.docsLink')}
                  </a>.
                </p>
              </div>
            ) : (
              installedRows.map((row) => (
                <PackCard
                  key={row.id} lang={lang} row={row} size={thumbSize}
                  checked={selected.includes(row.versionKey)}
                  disabled={busyKey === row.versionKey}
                  onToggle={handleToggle}
                  dupCount={dupCounts[row.versionKey]}
                  confirming={confirmingId === row.id}
                  impact={impact}
                  onRequestRemove={() => handleRequestRemove(row.id)}
                  onCancelRemove={handleCancelRemove}
                  onConfirmRemove={() => handleConfirmRemove(row)}
                />
              ))
            )}
          </div>

          <details style={{ marginTop: 16 }} onToggle={handleReservedToggle}>
            <summary className="hifi-section-label" style={{ cursor: 'pointer' }}>{tt(lang, 'menu.sectionReserved')}</summary>
            <div style={{ marginTop: 8 }}>
              <p style={{ fontSize: 12, color: 'var(--subtext0)', margin: '0 0 8px' }}>{tt(lang, 'menu.reservedHint')}</p>
              {reserved === null ? (
                <div style={{ fontSize: 13, color: 'var(--subtext0)' }}>{tt(lang, 'manager.loading')}</div>
              ) : reserved === 'error' ? (
                <div style={{ fontSize: 13, color: 'var(--subtext0)' }}>{tt(lang, 'packErr.unknown')}</div>
              ) : (
                (reserved.slugs || []).map((entry) => (
                  <div key={entry.slug} style={{ marginBottom: 8 }}>
                    <div className="hifi-mono" style={{ fontSize: 12 }}>{entry.slug}</div>
                    <ul style={{ margin: '2px 0 0', paddingLeft: 18 }}>
                      {(entry.in || []).map((owner, i) => (
                        <li key={i} style={{ fontSize: 12, color: 'var(--subtext0)', overflowWrap: 'anywhere' }}>
                          {tt(lang, 'menu.reservedSubitem', {
                            pack: String(reservedPackName.get(owner.source) || owner.source).slice(0, 64),
                            name: String(owner.name || '').slice(0, 64),
                          })}
                        </li>
                      ))}
                    </ul>
                  </div>
                ))
              )}
            </div>
          </details>
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
// CHIP DO TOPO (D-18)
// ──────────────────────────────────────────────────────────────────

// Rótulo do chip: primeiro pacote RESOLVIDO + contagem dos demais (D-18/D-19).
// Chave desconhecida ou seleção vazia nunca desreferencia nada — devolve ''.
function _chipLabel(resolvedKeys, versions) {
  const keys = resolvedKeys || [];
  if (!keys.length) return '';
  const first = (versions || []).find((v) => v.key === keys[0]);
  if (!first) return '';
  const n = keys.length;
  return first.short + (n > 1 ? ' +' + (n - 1) : '');
}

function PackMenuChip({ lang, style, onOpen }) {
  const [resolved, setResolved] = React.useState(() => window.getResolvedVersionKeys());
  const [versions, setVersions] = React.useState(() => (window.SPELL_VERSIONS || []).slice());

  React.useEffect(() => {
    const onSourceChanged = () => setResolved(window.getResolvedVersionKeys());
    const onPluginsChanged = () => {
      setVersions((window.SPELL_VERSIONS || []).slice());
      setResolved(window.getResolvedVersionKeys());
    };
    window.addEventListener('hifi-spells-source-changed', onSourceChanged);
    window.addEventListener('hifi-plugins-changed', onPluginsChanged);
    return () => {
      window.removeEventListener('hifi-spells-source-changed', onSourceChanged);
      window.removeEventListener('hifi-plugins-changed', onPluginsChanged);
    };
  }, []);

  const first = versions.find((v) => v.key === resolved[0]);
  const langDot = {
    width: 6, height: 6, borderRadius: '50%', flexShrink: 0,
    background: first && first.lang === 'ptbr' ? 'var(--green)' : 'var(--blue)',
  };

  return (
    <button
      type="button"
      className="hifi-filter-chip"
      style={{ display: 'inline-flex', alignItems: 'center', gap: 6, ...style }}
      aria-haspopup="dialog"
      title={tt(lang, 'manager.title')}
      onClick={(e) => {
        onOpen && onOpen();
        window.__openPackManager && window.__openPackManager({ anchor: e.currentTarget.getBoundingClientRect() });
      }}
    >
      <span style={langDot} />
      <span>{_chipLabel(resolved, versions)}</span>
      <span style={{ color: 'var(--subtext0)', fontSize: 10 }}>▾</span>
    </button>
  );
}

// ──────────────────────────────────────────────────────────────────
// SELEÇÃO POR SLUG (D-08..D-14, A-14) — colisão ao marcar SRD/homebrew
// ──────────────────────────────────────────────────────────────────

// Conflitos de slug ao marcar `version` na próxima seleção `nextKeys` (Fase 8):
// SRD embutido entrando checa os homebrews já marcados contra as PRÓPRIAS
// magias do SRD (A-14 — o homebrew é quem é renomeado, o SRD nunca é); homebrew
// entrando checa as próprias magias contra os donos das outras versões já
// marcadas (SRD e homebrews, D-03 nunca compara SRD×SRD). Qualquer falha
// (loadSpellVersion, loadReservedSlugs, slugOwnersOf) propaga pro chamador —
// o PackMenu mostra packErr.unknown e não marca nada.
async function _selectionConflicts(version, nextKeys) {
  const byKey = (k) => (window.SPELL_VERSIONS || []).find((v) => v.key === k);
  const others = (nextKeys || []).filter((k) => k !== version.key && byKey(k));
  const isSrdBuiltin = version.source === 'fetch' && version.corpus === 'srd';

  let rows;
  if (isSrdBuiltin) {
    const donos = await window.packImport.slugOwnersOf([version.key]);
    const homebrews = others.map(byKey).filter((v) => v && v.source === 'idb');
    rows = [];
    for (const h of homebrews) {
      const spells = await window.loadSpellVersion(h.key);
      const targets = (spells || []).map((s) => ({ name: s.en, displayName: s.displayName, oldKey: window.hifiSpellKey(s) }));
      window.packImport.detectSlugConflicts(targets, donos).forEach((r) => rows.push({ ...r, packId: h.packId }));
    }
  } else {
    const donos = await window.packImport.slugOwnersOf(others);
    const spells = await window.loadSpellVersion(version.key);
    const targets = (spells || []).map((s) => ({ name: s.en, displayName: s.displayName, oldKey: window.hifiSpellKey(s) }));
    rows = window.packImport.detectSlugConflicts(targets, donos).map((r) => ({ ...r, packId: version.packId }));
  }

  const reservedData = await window.packImport.loadReservedSlugs();
  const allIdbKeys = (window.SPELL_VERSIONS || []).filter((v) => v.source === 'idb').map((v) => v.key);
  const takenKeys = new Set((await window.packImport.slugOwnersOf(allIdbKeys)).keys());

  let impact = 0;
  if (rows.length) {
    const index = await packSpellIndex();
    const alvos = new Set(rows.map((r) => 'plugin-' + r.packId));
    impact = window.renameImpact(new Set(rows.map((r) => r.oldKey)), (k) => {
      const src = index.byKey.get(k);
      return !!src && [...src].some((x) => !alvos.has(x));
    });
  }

  return { rows, reservedKeys: reservedData.keys, takenKeys, impact };
}

// ──────────────────────────────────────────────────────────────────
// PACK MANAGER ROOT
// ──────────────────────────────────────────────────────────────────

function PackManagerRoot({ lang, dark, theme }) {
  // D-04/D-05: um só overlay visível por vez — 'menu', 'import' e 'rename' nunca
  // ficam empilhados. Fechar o import volta pro menu; cancelar a renomeação também
  // (D-12: nada é marcado quando o usuário cancela).
  const [view, setView] = React.useState('closed');
  const [anchor, setAnchor] = React.useState(null);
  const [isMobile, setIsMobile] = React.useState(false);
  const [renameCtx, setRenameCtx] = React.useState(null);

  React.useEffect(() => {
    const open = (opts) => {
      setAnchor((opts && opts.anchor) || null);
      setIsMobile(Math.min(window.innerWidth, window.innerHeight) < 768);
      setView('menu');
    };
    window.__openPackManager = open;
    return () => {
      if (window.__openPackManager === open) delete window.__openPackManager;
    };
  }, []);

  // Renomear e continuar (D-14): agrupa as linhas por pack, regrava cada pack
  // já instalado com renameInstalledPackSlugs, e só então aplica a seleção
  // pendente (renameCtx.next) — a marca acontece DEPOIS da renomeação resolver.
  const handleRenameSubmit = React.useCallback(async (list) => {
    try {
      const byPack = new Map();
      list.forEach((r) => {
        if (!byPack.has(r.packId)) byPack.set(r.packId, new Map());
        byPack.get(r.packId).set(r.slug, r.newSlug);
      });
      for (const [packId, renames] of byPack) {
        await window.renameInstalledPackSlugs(packId, renames);
      }
      if (renameCtx) window.setSelectedVersionKeys(renameCtx.next);
      setView('menu');
    } catch (e) {
      console.warn('[pack-manager] falha ao renomear slugs em conflito:', e);
      window.dispatchEvent(new CustomEvent('hifi-toast', { detail: { msg: tt(lang, 'packErr.unknown'), kind: 'err' } }));
      setView('menu');
    }
  }, [lang, renameCtx]);

  return (
    <>
      <PackMenu
        lang={lang} dark={dark} theme={theme}
        open={view === 'menu'}
        isMobile={isMobile}
        anchor={anchor}
        onClose={() => setView('closed')}
        onOpenImport={() => setView('import')}
        onRequestRename={(ctx) => { setRenameCtx(ctx); setView('rename'); }}
      />
      <PackImportDialog
        lang={lang} dark={dark} theme={theme}
        open={view === 'import'}
        onClose={() => setView('menu')}
      />
      {window.PackRenameDialog && (
        <window.PackRenameDialog
          lang={lang} dark={dark} theme={theme}
          open={view === 'rename'}
          rows={renameCtx ? renameCtx.rows : []}
          reservedKeys={renameCtx ? renameCtx.reservedKeys : new Set()}
          takenKeys={renameCtx ? renameCtx.takenKeys : new Set()}
          impact={renameCtx ? renameCtx.impact : 0}
          onCancel={() => setView('menu')}
          onSubmit={handleRenameSubmit}
        />
      )}
    </>
  );
}

Object.assign(window, { PackMenu, PackMenuChip, PackManagerRoot });
