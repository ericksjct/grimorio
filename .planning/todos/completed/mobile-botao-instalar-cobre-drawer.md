---
id: mobile-botao-instalar-cobre-drawer
status: pending
created: 2026-08-24
source: checkpoint 04.1-05 (QA headless da Fase 04.1)
area: v10-hifi.jsx (drawer mobile) / botão flutuante de instalação de pack
---

# Mobile: botão "Instalar pacote de magias" cobre o conteúdo do drawer

## O que foi observado

Viewport 390×844, drawer de filtros aberto: o botão flutuante
"Instalar pacote de magias" fica ancorado no canto inferior esquerdo, por cima do
drawer, e cobre parte da seção **VERSÃO** (as pills de seleção de pack). Em modo
claro com o drawer rolado para o topo, ele sobrepõe a primeira linha de pills.

Reproduzido nos dois modos (claro e escuro). Capturas em
`shots/s5-mobile-drawer.png` e `shots/s5-mobile-tools-{light,dark}.png` do QA.

## Não é regressão da Fase 04.1

O botão e o drawer são anteriores à fase; o desacoplamento de idioma não alterou
o layout do drawer, só adicionou o toggle PT/EN à seção FERRAMENTAS (que fica
abaixo de VERSÃO e não é afetada pela sobreposição).

## Encaminhamento sugerido

Ou o botão flutuante recolhe/esconde enquanto o drawer está aberto, ou o drawer
ganha padding inferior equivalente à altura do botão. A primeira opção é menor:
o botão não tem função com o drawer aberto.

## Resolvido

Fechado em 2026-08-30 pela Fase 5 (Plugin Manager UI & Version Selector).

A Fase 5 não reposicionou o botão nem deu padding ao drawer: resolveu o problema
pela raiz. A decisão D-03 removeu o gatilho flutuante de importação por completo —
`PackImportRoot` deixou de existir em `pack-import-dialog.jsx` e em `index.html`.
O import passou a ser alcançado só de dentro do gerenciador de pacotes, pelo botão
primário da lista e pelo convite do estado vazio. Sem elemento flutuante, não há o
que sobrepor.

Confirmação visual obtida no checkpoint humano do plano 05-05, em 390×844, com o
drawer aberto na seção VERSÃO, nos temas claro e escuro: nenhum elemento fora do
drawer cobre a seção (verificado por `elementFromPoint` sobre uma grade de pontos
da seção inteira), e não existe nenhum elemento posicionado de "instalar pacote"
em canto nenhum da tela, nem em 390×844 nem em 1440px.
