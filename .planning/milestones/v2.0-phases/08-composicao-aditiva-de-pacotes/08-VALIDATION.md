---
phase: 8
slug: composicao-aditiva-de-pacotes
# status lifecycle: draft (seeded by plan-phase) → validated (set by validate-phase §6)
# audit-milestone §5.5 distinguishes NOT-VALIDATED (draft) from PARTIAL (validated + nyquist_compliant: false) (#2117)
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-09-27
---

# Phase 8 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | none (no JS test runner) — PowerShell source-assertion gates `scripts/*.tests.ps1` + headless-Chromium checkpoint at 390×844 and desktop |
| **Config file** | none — `scripts/run-tests.ps1` runs every `scripts/*.tests.ps1` |
| **Quick run command** | `pwsh -NoProfile -File scripts/check-<gate>.tests.ps1` (single gate for the task) |
| **Full suite command** | `npm test` |
| **Estimated runtime** | ~30 seconds |

---

## Sampling Rate

- **After every task commit:** Run the single `.tests.ps1` gate that covers the task
- **After every plan wave:** Run `npm test` + headless-Chromium pass (390×844 and desktop)
- **Before `/gsd-verify-work`:** Full suite must be green + human checkpoint on pack menu and rename dialog (UI-SPEC)
- **Max feedback latency:** 30 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Threat Ref | Secure Behavior | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|------------|-----------------|-----------|-------------------|-------------|--------|
| 08-01-T1 | 08-01 | 1 | MGMT-06, SRD-05, MGMT-08 | T-08-06 | loader nunca escreve em dado de personagem | node proof (vm) | `pwsh -NoProfile -File scripts/check-pack-composition.tests.ps1` | ❌ criado na task (RED→GREEN) | ⬜ pending |
| 08-01-T2 | 08-01 | 1 | MIGR-04, MGMT-08 | T-08-01, T-08-02, T-08-05 | prefs adulteradas normalizadas; sem laço de re-render; toast de fallback | node proof (vm, contexto por caso) | `pwsh -NoProfile -File scripts/check-selection-migration.tests.ps1` | ❌ criado na task (RED→GREEN) | ⬜ pending |
| 08-01-T3 | 08-01 | 1 | MIGR-04 | — | index.html sem estado de versão | static + suite | `npm test` | ✅ | ⬜ pending |
| 08-02-T1 | 08-02 | 1 | MGMT-07, MGMT-08, MGMT-09 | T-08-07 | textos só via tt; paridade PT/EN | node proof (vm i18n) | `pwsh -NoProfile -File scripts/check-i18n-pack-menu.tests.ps1` | ❌ criado na task | ⬜ pending |
| 08-02-T2 | 08-02 | 1 | PKG-06 | T-08-09, T-08-10, T-08-11 | `meta.image` só data: raster ≤ 200 KB, rejeitado antes de gravar | node proof (validatePack) | `pwsh -NoProfile -File scripts/check-pack-validator.tests.ps1` | ✅ (estendido) | ⬜ pending |
| 08-02-T3 | 08-02 | 1 | MGMT-07 | T-08-12 | docs renderizam a lista só por textContent | node proof + static | `pwsh -NoProfile -File scripts/check-srd-packs.tests.ps1` + `check-pack-format` | ✅ (estendidos) | ⬜ pending |
| 08-03-T1 | 08-03 | 2 | MGMT-06 | T-08-14 | conteúdo no idioma da magia; 5 sinks HTML | static | `pwsh -NoProfile -File scripts/check-content-lang-ownership.tests.ps1` (+ editor-version-lang, filter-lang-vocabulary) | ✅ (realinhados) | ⬜ pending |
| 08-03-T2 | 08-03 | 2 | SRD-05 | T-08-15 | "Também em"/comparador por `_versionKey` | static + node proof | `pwsh -NoProfile -File scripts/check-edition-compare.tests.ps1` + `check-pack-composition` | ✅ (estendidos) | ⬜ pending |
| 08-04-T1 | 08-04 | 2 | MGMT-07 | T-08-17, T-08-19, T-08-22 | colisão detectada antes de gravar; cancelar não grava | node proof (funil com stubs) | `pwsh -NoProfile -File scripts/check-slug-rename.tests.ps1` + `check-pack-import` | ❌ criado na task | ⬜ pending |
| 08-04-T2 | 08-04 | 2 | MGMT-07 | T-08-18, T-08-20 | prompt sem sink HTML; impacto só leitura | node proof (pureza com localStorage instrumentado) | `pwsh -NoProfile -File scripts/check-slug-rename.tests.ps1` | ❌ estendido na task | ⬜ pending |
| 08-04-T3 | 08-04 | 2 | MGMT-07 | T-08-17 | import integrado ao prompt, cancelar/fechar aborta | static + suite | `pwsh -NoProfile -File scripts/check-pack-import-dialog.tests.ps1` + `npm test` | ✅ (estendido) | ⬜ pending |
| 08-05-T1 | 08-05 | 2 | PKG-06, MGMT-09 | T-08-23 | imagem revalidada antes de `<img src>` | node proof (funções extraídas) | `pwsh -NoProfile -File scripts/check-pack-menu.tests.ps1` | ❌ criado na task | ⬜ pending |
| 08-05-T2 | 08-05 | 2 | MGMT-06, MGMT-08, MGMT-09, SRD-05 | T-08-24, T-08-25 | menu sem localStorage/putPack/sink HTML | static | `pwsh -NoProfile -File scripts/check-pack-menu.tests.ps1` | ❌ estendido na task (substitui check-pack-manager) | ⬜ pending |
| 08-05-T3 | 08-05 | 2 | MGMT-07, MGMT-09 | T-08-26 | colisão na seleção passa pelo prompt | node proof (`_chipLabel`) + static | `pwsh -NoProfile -File scripts/check-pack-menu.tests.ps1` | ❌ estendido na task | ⬜ pending |
| 08-06-T1 | 08-06 | 3 | MGMT-09, MIGR-04 | T-08-29 | chip montado; `?v=` em lista; sem filtro de pacote | static | `pwsh -NoProfile -File scripts/check-ui-lang-toggle.tests.ps1` + `check-pack-composition` | ✅ (realinhados) | ⬜ pending |
| 08-06-T2 | 08-06 | 3 | MGMT-06 | — | nenhum leitor de versão única sobra | static | `pwsh -NoProfile -File scripts/check-pack-composition.tests.ps1` + `check-i18n-pack-menu` | ✅ (estendidos) | ⬜ pending |
| 08-06-T3 | 08-06 | 3 | MGMT-09 | T-08-28 | bump do SW para v5 | static + suite | `npm test` | ✅ (check-decommission/check-pack-wiring realinhados) | ⬜ pending |
| 08-07-T1 | 08-07 | 4 | todos | T-08-31 | nada de artefato de QA no repo | suite + fumaça playwright (temp) | `npm test` | ✅ | ⬜ pending |
| 08-07-T2 | 08-07 | 4 | todos | T-08-32 | veredito humano por item | manual (checkpoint) | — | n/a | ⬜ pending |
| 08-07-T3 | 08-07 | 4 | — | — | todo dobrado fechado | node check | `node -e` (ver plano) | n/a | ⬜ pending |
| 08-08-T1 | 08-08 | 6 | MGMT-07, PKG-06 | T-08-33 | emendas anexadas, original intacto | node check | `node -e` (ver plano) | n/a | ⬜ pending |
| 08-08-T2 | 08-08 | 6 | MGMT-07, PKG-06 | — | PKG-06/MGMT-07 revisados e Pending | node check | `node -e` (ver plano) | n/a | ⬜ pending |
| 08-09-T1 | 08-09 | 7 | MGMT-06 | T-08-34 | fonte = nome do pacote só na ausência | node proof (vm) | `pwsh -NoProfile -File scripts/check-pack-composition.tests.ps1` | ✅ (estendido) | ⬜ pending |
| 08-09-T2 | 08-09 | 7 | MGMT-06 | — | FONTE sem separador órfão | static + suite | `pwsh -NoProfile -File scripts/check-pack-composition.tests.ps1` + `npm test` | ✅ (estendido) | ⬜ pending |
| 08-10-T1 | 08-10 | 7 | PKG-06 | T-08-36, T-08-39, T-08-42 | allowlist única `IMAGE_SRC` no import, no render e no schema | node proof (validatePack + paridade schema) | `pwsh -NoProfile -File scripts/check-pack-validator.tests.ps1` + `check-pack-menu` | ✅ (realinhados) | ⬜ pending |
| 08-10-T2 | 08-10 | 7 | PKG-06 | T-08-37, T-08-38, T-08-40 | `<img>` no-referrer + fallback; CSP sem img-src; docs de privacidade | static | `pwsh -NoProfile -File scripts/check-pack-menu.tests.ps1` + `check-pack-format` + `check-csp` | ✅ (estendidos) | ⬜ pending |
| 08-10-T3 | 08-10 | 7 | MGMT-09, PKG-06 | — | mensagens de imagem claras, PT/EN | node proof (vm i18n) | `pwsh -NoProfile -File scripts/check-i18n-pack-menu.tests.ps1` + `npm test` | ✅ (estendido) | ⬜ pending |
| 08-11-T1 | 08-11 | 8 | MGMT-07 | T-08-44, T-08-45, T-08-46 | auto-renomeação só do pack que entra, falha fechada | node proof (funil com stubs) | `pwsh -NoProfile -File scripts/check-slug-rename.tests.ps1` + `check-pack-import` | ✅ (realinhados) | ⬜ pending |
| 08-11-T2 | 08-11 | 8 | MGMT-07 | T-08-43, T-08-47 | aviso de renomeação no idioma da interface | node proof (`_renamedNotice` + i18n) | `pwsh -NoProfile -File scripts/check-pack-import-dialog.tests.ps1` + `check-i18n-pack-menu` | ✅ (realinhados) | ⬜ pending |
| 08-11-T3 | 08-11 | 8 | MGMT-07 | T-08-48 | prompt só na seleção; SW v6 | static + suite | `pwsh -NoProfile -File scripts/check-slug-rename.tests.ps1` + `check-pack-wiring` + `npm test` | ✅ (realinhados) | ⬜ pending |
| 08-12-T1 | 08-12 | 9 | todos | T-08-49 | nada de artefato de QA no repo | suite + fumaça playwright (temp) | `npm test` | ✅ | ⬜ pending |
| 08-12-T2 | 08-12 | 9 | todos | T-08-50 | veredito humano por item (refeito) | manual (checkpoint) | — | n/a | ⬜ pending |
| 08-12-T3 | 08-12 | 9 | todos | T-08-50 | todo e requisitos só com aprovação | node check | `node -e` (ver plano) | n/a | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

Confirmed by the planner. Não há plano "Wave 0" separado: cada gate novo nasce RED na
primeira tarefa que o usa e fica GREEN na mesma tarefa (ou na seguinte do mesmo plano).

- [ ] `scripts/check-pack-composition.tests.ps1` — 08-01-T1 (união, exclusividade SRD, desempate EN×PT, default, `lang`/`_versionKey`); estendido em 08-03-T2 e 08-06-T1/T2
- [ ] `scripts/check-selection-migration.tests.ps1` — 08-01-T2 (MIGR-04: `versionKey` → lista, `?v=` em lista, pendência por item, `[]` persiste `[]`)
- [ ] `scripts/check-i18n-pack-menu.tests.ps1` — 08-02-T1 (paridade e plurais); ajustado em 08-05-T1 e 08-06-T2
- [ ] `scripts/check-slug-rename.tests.ps1` — 08-04-T1/T2/T3 (detecção, sugestão, validação, funil, pureza de leitura)
- [ ] `scripts/check-pack-menu.tests.ps1` — 08-05-T1/T2/T3 (substitui e apaga `check-pack-manager.tests.ps1`)
- [ ] Estendidos: `check-pack-validator` (PKG-06), `check-srd-packs` + `check-pack-format` (slugs reservados), `check-edition-compare` (comparador por `_versionKey`)
- [ ] Realinhados: `check-loader-hardening`, `check-source-dispatch`, `check-migration-version-fallback`, `check-ui-lang-state`, `check-transition-banner` (08-01); `check-content-lang-ownership`, `check-editor-version-lang`, `check-filter-lang-vocabulary` (08-03); `check-pack-import`, `check-pack-import-dialog` (08-04); `check-ui-lang-toggle`, `check-decommission`, `check-pack-wiring` (08-06)

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Pack menu cards (image, title, description, derived color), chip `SRD 5.2 +2` | MGMT-09, PKG-06 (D-16..D-19) | Visual layout / UI-SPEC 6 dimensions | 08-07 checkpoint item 8 (390×844 + desktop) |
| Rename prompt live validation, "apply suffix to all", cancel aborts | MGMT-07 (D-09..D-12) | Interactive dialog flow | 08-07 checkpoint items 5-7 |
| Grid shows union with per-spell language (`lang`) and `src` footer | MGMT-06 (D-01, D-06, D-20) | Rendered output across languages | 08-07 checkpoint items 1-3 |
| Empty selection keeps grid full + toast in UI language | MGMT-08 (D-04) | Toast + grid state | 08-07 checkpoint item 4 |
| Saved `versionKey` and `?v=a,b` open the right selection | MIGR-04 (D-23, D-24) | Boot-time behavior on a real profile | 08-07 checkpoint item 9 |
| Gap re-verification (08-07 NOT APPROVED): origin in card/FONTE, import auto-rename + notice, selection prompt, https image + no Referer + offline fallback, new image messages, `grimorio-v6` | MGMT-06..09, PKG-06, SRD-05, MIGR-04 (E-01..E-05) | Rendered output, network headers, offline behavior | 08-12 checkpoint items 1-10 |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 30s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
