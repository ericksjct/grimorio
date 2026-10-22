# Phase 8: Composição aditiva de pacotes - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-09-27
**Phase:** 08-composicao-aditiva-de-pacotes
**Areas discussed:** Quem é base, quem empilha; Colisão de magias; Origem visível; Idioma/edição misturados

---

## Quem é base, quem empilha

| Option | Description | Selected |
|--------|-------------|----------|
| Usuário decide | Qualquer pack pode ser base ou empilhado | |
| Pack declara no meta | `meta.kind: 'addon'` | |
| Todo pack do usuário soma | Builtins são bases, importados sempre somam | |

**User's choice:** Todo pack é somado, e é possível não selecionar nenhum (sem conceito de base).

| Option | Description | Selected |
|--------|-------------|----------|
| No gerenciador | Interruptor por item | |
| No seletor de versão | Checkboxes no dropdown | |
| Nos dois | | |

**User's choice:** Menu remodelado de escolha de pacotes, com imagem, título e descrição.

- Builtin empilhável? **Sim, com as mesmas regras de sobreposição.**
- Quantos? **Vários.**
- Seleção vazia? Opções: estado vazio com convite / grade vazia. **Escolha: mostra o pacote padrão de hoje (SRD 5.2).**
- Menu substitui seletor? **Substitui e absorve o gerenciador.**
- Imagem? Opções: data: URI / URL ou data: / sem imagem. **data: URI opcional em `meta.image`.**
- Descrição? Opções: `meta.description` / derivada. **Derivada automaticamente.**

---

## Colisão de magias

| Option | Description | Selected |
|--------|-------------|----------|
| Uma só, por prioridade | Vence o pack de maior prioridade | |
| Todas aparecem | Uma entrada por pack | |
| Uma só + alternar no detalhe | | |

**User's choice:** Slug único obrigatório; slugs reservados consultáveis; conflito mostra mensagem com os nomes das magias.
**Notes:** Pergunta de prioridade não fez sentido para o usuário e caiu com o modelo de slug único.

- Import com slug reservado: opções rejeitar / instalar e avisar / instalar sem conflitantes. **Escolha: avisa e pede rename do slug direto na UI.**
- Dois homebrews com mesmo slug na seleção: **mesmo fluxo de rename.**
- SRD 5.1 + 5.2: **edições exclusivas.**
- SRD EN + PT da mesma edição: **prefere o idioma da interface.**
- Onde ver reservados: **docs e app**; no app, cada slug com subitens "pacote → nome da magia no pacote".
- Sugestão no prompt: **sufixo do pack + opção de aplicar a todas as conflitantes.**
- Qual pack renomeia: **o que entra.** (Alternativas: usuário escolhe; renomear e migrar preparadas.)
- Cancelar: **aborta a operação.**
- Export após rename: **versão renomeada.**

---

## Origem visível

| Option | Description | Selected |
|--------|-------------|----------|
| Selo só com 2+ pacotes | | |
| Sempre selo | | |
| Só no detalhe | | |

**User's choice:** O rodapé de cada magia já mostra a fonte; manter esse padrão.

- Filtro por pacote: **Não.**
- Cor por pacote: **derivada**, e depois restringida a **só no menu**.
- Chip do topo: **primeiro pack + contagem.**

---

## Idioma/edição misturados

- Homebrew EN com SRD PT-BR: **permite livre.**
- Homebrew com `edition: '5e 2014'` junto do SRD 5.2: usuário pediu esclarecimento ("estamos exigindo versão de regras base dos homebrews?"). Esclarecido que `meta.edition` já é opcional; **confirmado: segue opcional e informativo, sem restringir.**
- Escopo da seleção: **global no dispositivo.**
- Migração de `versionKey`: **vira seleção de um item.**
- `?v=`: **aceita lista separada por vírgula.**
- Comparador de edição: **você decide.**

---

## Todos

- `i18n-toast-versao-e-pluralizacao` (score 0,2): **incluído no escopo.**

## Claude's Discretion

- Adaptação do comparador de edição ao modelo multi-pacote.
- Layout do menu, teto de `meta.image`, hash de cor, copy, nome das chaves novas.

## Deferred Ideas

Nenhuma.
