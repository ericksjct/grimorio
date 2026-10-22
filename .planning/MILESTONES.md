# Milestones

## v2.0 Plugins BYOD (Shipped: 2026-10-21)

**Delivered:** O Grimório deixou de ser "app com dados embutidos" e virou "casca + pacotes": o usuário instala os pacotes de magias que quiser (arquivo ou URL), os 4 JSONs protegidos saíram do HEAD, e o app embute os pacotes SRD (5.1 EN, 5.2 EN, 5.2 pt-BR) mais um pacote adicional.

**Phases completed:** 10 phases (2–8 com GSD, 9–11 fora do GSD), 48 plans, 112 tasks
**Timeline:** 2026-07-18 → 2026-10-21
**Closeout type:** override_closeout
**Known verification overrides:** 5 (see STATE.md Deferred Items)

**Key accomplishments:**

- Armazenamento de pacotes em IndexedDB (`plugin-store.jsx`), com pedido de armazenamento persistente e export de backup (Fase 2)
- Pipeline de import por arquivo/URL: schema publicado (`pack.schema.json` + `pack-docs.html`), validador, limite de 10 MB e sanitização DOMPurify antes de qualquer escrita (Fase 3)
- Loader com despacho por fonte e gerenciador de pacotes com atribuição CC-BY, duplicatas e remoção sem perder preparadas/favoritas (Fases 4 e 5)
- Idioma da interface desacoplado do idioma do pacote, com `lang` por região (WCAG 3.1.2) (Fase 04.1)
- Descomissionamento dos 4 JSONs protegidos com migração de usuários existentes, referências órfãs preservadas e banner único (Fase 6)
- Pacote SRD 5.2 pt-BR (Heróis Anônimos, CC-BY-4.0) e composição aditiva: um pacote base + pacotes adicionais empilhados no menu único de pacotes (Fases 7 e 8)
- Auditoria mobile fechada: tab bar inferior, alvos de toque ≥44px, safe-area, hover só em mouse, contraste AA (Fases 9–11)

**Scope change at close:**

- `packs/srd-2024-adicionais.json` (69 magias do Livro do Jogador 2024 fora do SRD, `license.id: "proprietary"`) fica embutido e no precache, por decisão do usuário. A linha "Embutir conteúdo não-livre" do Out of Scope foi ajustada. Ver Key Decisions em PROJECT.md.

**Archive:** [v2.0-ROADMAP.md](milestones/v2.0-ROADMAP.md) · [v2.0-REQUIREMENTS.md](milestones/v2.0-REQUIREMENTS.md) · [v2.0-MILESTONE-AUDIT.md](milestones/v2.0-MILESTONE-AUDIT.md) · [v2.0-phases/](milestones/v2.0-phases/)

---
