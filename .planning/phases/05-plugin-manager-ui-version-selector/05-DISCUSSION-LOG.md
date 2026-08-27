# Phase 5: Plugin Manager UI & Version Selector — Discussion Log

**Date:** 2026-08-27
**Mode:** default → o usuário delegou todas as decisões ("decide tudo pra mim")

Documento de referência humana. Não é consumido por agentes downstream — a fonte de verdade é
`05-CONTEXT.md`.

---

## Áreas apresentadas

O gerenciador foi analisado e quatro áreas cinzentas foram levantadas:

1. **Onde o gerenciador vive** — tela própria, seção do drawer mobile, painel lateral desktop, ou
   aba dentro do diálogo de import. Incluía o destino do botão flutuante provisório
   (`pack-import-dialog.jsx:281`).
2. **Fluxo de remoção de pack** — confirmação, aviso de impacto em preparadas/favoritas, undo.
3. **Nota de duplicatas** — badge no card, linha no detalhe, aviso no gerenciador, ou toast.
4. **Atribuição CC-BY + empty state** — onde o texto verbatim aparece e como o estado de zero
   pacotes se manifesta.

Uma segunda pergunta ofereceu incorporar 2 dos 4 todos pendentes que casaram com a fase por
palavra-chave (score 0.6 cada).

## Seleção do usuário

**"decide tudo pra mim"** — delegação integral, das quatro áreas e do tratamento dos todos.

## Decisões tomadas por Claude

Todas registradas como D-01..D-19 em `05-CONTEXT.md`. Resumo do raciocínio:

| Área | Escolha | Por quê |
|---|---|---|
| Onde vive | Modal único `PackManager`, aberto do dropdown do `VersionSelector` (desktop) e da seção VERSÃO do drawer (mobile) | O app é SPA sem router; uma rota nova seria a maior mudança estrutural da fase pelo menor ganho. O seletor de versão já é onde o usuário pensa "de onde vêm minhas magias" |
| Import vs gerenciador | Dois diálogos irmãos, não abas | `PackImportDialog` já funciona e é testado; virar aba mexe em código que não precisa mudar |
| Botão flutuante | Removido | Já marcado no código como provisório desta fase; e é a causa raiz do todo do drawer mobile |
| Remoção | Confirmação inline no item, com contagem de impacto, sem undo | Dois níveis de overlay quebram foco/ESC no mobile. Undo é desnecessário porque as chaves de preparadas nunca são apagadas |
| Preparadas/favoritas | Nunca purgadas ao remover pacote | É o mecanismo que faz MGMT-02 ("voltam se reinstalar") funcionar sem máquina de estado nenhuma |
| Duplicatas | Linha no detalhe da magia + contagem agregada no item do pacote | Badge por card polui uma grade de centenas de itens |
| CC-BY | Bloco recolhível por pacote no gerenciador; SRD embutido é item de primeira classe da mesma lista | Evita uma tela "Sobre" nova e torna a licença encontrável no lugar onde se olha a origem do conteúdo |
| Empty state | "Zero pacotes" = zero packs do usuário; não invade a grade | Os builtins SRD sobrevivem à Fase 6, então o app nunca fica sem magias — anunciar vazio na grade seria falso |

## Achados durante o scout de código

- **MGMT-03 já está majoritariamente entregue pela Fase 4.** `refreshPluginVersions()` sincroniza,
  invalida cache, emite evento e faz fallback com toast. O que resta é superfície.
- **Risco registrado (D-19):** `VersionSelector` desreferencia `versions[0].lang` sem guarda de
  lista vazia. Inalcançável hoje por causa dos builtins, mas o gerenciador vai renderizar listas
  que podem, sim, ser vazias.
- **Primeira escrita de UI fora do import:** a remoção de pacote é a primeira vez que a interface
  chama uma operação de escrita do `pluginStore` fora do fluxo de import. Merece tratamento
  explícito no plano.

## Todos

**Incorporado:** "Mobile: botão instalar cobre drawer" — resolvido na raiz por D-03.

**Revisados e não incorporados:** "SRD pack: nomes slug e markdown cru" (bug de adaptador de
conteúdo, domínio diferente); "bandeiras do toggle no Windows" e "warnings do review 04.1"
(score 0.2, sem relação).

## Ideias adiadas

Edição/renomeação de pacote instalado; atualização de pacote no lugar; página "Sobre" do app.

---

*Phase: 5-plugin-manager-ui-version-selector*
