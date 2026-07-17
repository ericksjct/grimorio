# Modo Sessão (mobile) — Design

**Data:** 2026-07-17 · **Status:** aprovado (mockup iterado em `.superpowers/brainstorm/session-screen-v2.html`)

## Objetivo

Tela dedicada pra usar **durante a sessão de jogo**, no celular: acompanhar espaços de magia, consultar as magias preparadas e conjurar — sem os filtros/busca da tela principal. Só mobile; desktop não muda.

## Decisões (aprovadas no brainstorm)

1. **Atributos completos no personagem.** O jogador informa os 6 valores de atributo (For/Des/Con/Int/Sab/Car) no editor de personagem; tudo mais é derivado:
   - modificador = `⌊(valor − 10) / 2⌋`
   - proficiência = `2 + ⌊(nível total − 1) / 4⌋`
   - CD de magia = `8 + proficiência + mod. do atributo de conjuração`
   - ataque mágico = `proficiência + mod. do atributo de conjuração`
   - O atributo de conjuração é derivado da classe (Bardo/Paladino/Feiticeiro/Bruxo→CAR, Mago/Artífice→INT, Clérigo/Druida/Patrulheiro→SAB). Multiclasse v1: usa a 1ª classe conjuradora.
2. **Entrada/saída:** ícone no header do mobile entra; `‹` sai. Estado persistido em localStorage (recarregar durante a sessão volta direto pro modo sessão).
3. **Lista = só as preparadas**, agrupadas por círculo (Truques, 1º, 2º…). Toggle **cards** (padrão) ↔ **lista compacta**; escolha persistida. Sem filtros/busca.
4. **Conjurar pela magia:** botão em card/linha/detalhe gasta 1 espaço do círculo da magia; **▲** abre sheet de upcast (círculos ≥ o da magia, mostrando disponibilidade). Truque não gasta nada.
5. **Animação de conjuração (escolhida: fagulhas):** estouro de ~9 partículas **na cor da escola da magia**, originado **exatamente no ponto do toque**; quadradinho do slot "drena" em sincronia; toast confirma. CSS puro, easing `cubic-bezier(.2,.7,.3,1)`, ~600ms; `prefers-reduced-motion` desliga animações (fica só troca de estado + toast).

## Layout (top→bottom)

- **Header:** `‹` sair · "MODO SESSÃO / {nome} · {classe nível}" · toggle ⊞/≣.
- **Stats:** 4 caixinhas — CD magia (accent) / Ataque / Conjuração (ex: CAR +3) / Prof. A **faixa inteira é tocável** e abre um sheet único explicando os 4 valores (título, fórmula, texto); um ⓘ discreto centralizado à direita da faixa é o affordance. Sem atributos definidos → valores "—" e o sheet orienta preencher no editor.
- **Tracker compacto (estilo BG3):** por círculo, numeral romano + slots em bloco 2×2 (grid de 2 colunas; >4 slots quebra linha). Quadradinho aceso = disponível, apagado = gasto; toque ajusta manual (mesma semântica do tracker atual: gasta/restaura até ele); 🌙 descanso longo à direita. Sem totais → faixa oculta.
- **Lista (cards):** visual da visão de preparação — nome serif, escola · marcador de círculo, descrição clampada, chips V/S/M · alcance · fonte · C/R — mais a linha de conjurar: botão-pílula **✦ Conjurar** (`.hifi-btn-primary`, pílula como no app) + **▲** círculo (38px) pra upcast. Truque: pílula outline "Conjurar (truque)".
- **Lista (compacta):** como a lista do editor de personagem — nome + escola·círculo — com **✦** e **▲** como **círculos iguais** (34px).
- **Detalhe:** tocar no corpo do card/linha desliza a tela de detalhe (mesmo padrão do app): nome, meta, componentes, texto completo; rodapé com Conjurar + ▲.
- **Sheets** (upcast e info): bottom sheet com scrim, animados, fechan no scrim/Escape.

## Implementação

- **`v11-character-editor.jsx`:** `abilities` no modelo (`_normAbilities`, parcial, 1–30), seção "atributos" no editor (6 campos, digitação livre + clamp no blur, mesmo padrão dos outros números), helpers `CASTING_ABILITY`/`hifiAbilityMod`/`hifiProfBonus`/`hifiCasterStats` exportados no `window`.
- **`i18n.jsx`:** chaves `session.*` e `stats.*` em PT-BR e EN (parity check).
- **`hifi-tokens.css`:** keyframes (spark, drain, pulse) + classes do modo sessão + bloco reduced-motion.
- **`v10-hifi.jsx`:** `HifiSessionMode` como overlay dentro de `HifiMobile` (padrão da tela de detalhe), botão de entrada no header, persistência `hifi_session_v1`/`hifi_session_view_v1`. Conjurar usa `setSlotUsedFor` existente. Fagulha: DOM imperativo (cria/remove nó), cor da escola com fallback no accent.

## Não-objetivos

- Desktop; rastrear usos de habilidades não-magia; iniciativa/perícias (os atributos ficam prontos pra isso, mas fora do escopo); animação "fagulha voando até o tracker".
