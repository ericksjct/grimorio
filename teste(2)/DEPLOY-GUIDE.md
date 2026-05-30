# 🚀 Guia de Deploy - GitHub Pages

Este guia explica como colocar seu projeto Spellbook no ar usando **GitHub Pages**.

---

## 📋 Pré-requisitos

- Conta no [GitHub](https://github.com)
- [Git](https://git-scm.com/downloads) instalado
- [Node.js](https://nodejs.org) instalado (versão 18+)

---

## 🛠️ Passo a Passo

### 1. Inicializar repositório Git

Se ainda não tiver um repositório Git no projeto:

```bash
cd teste(2)
git init
git add .
git commit -m "Primeiro commit"
```

### 2. Criar repositório no GitHub

1. Acesse [github.com/new](https://github.com/new)
2. Nomeie o repositório (ex: `spellbook`)
3. **Não** marque "Add a README" (já temos arquivos)
4. Clique em **Create repository**

### 3. Conectar e enviar código

```bash
# Substitua SEU-USUARIO pelo seu nome de usuário do GitHub
git remote add origin https://github.com/SEU-USUARIO/spellbook.git
git branch -M main
git push -u origin main
```

### 4. Instalar dependências

```bash
npm install
```

Isso instala o Babel (para compilar JSX) e o gh-pages.

### 5. Build e Deploy (Manual)

```bash
npm run build    # Compila JSX → JS e cria a pasta dist/
npm run deploy   # Envia dist/ para o GitHub Pages
```

> ⚠️ O deploy manual usa a branch `gh-pages`. A configuração do GitHub Pages deve apontar para essa branch.

---

## 🤖 Deploy Automático (Recomendado)

Configuramos um **GitHub Actions** que faz deploy automático toda vez que você fizer `git push` na branch `main`.

### Ativar no GitHub:

1. Vá em **Settings** → **Pages** do seu repositório
2. Em **Source**, selecione **GitHub Actions**
3. Pronto! A partir de agora, todo push na `main` dispara o deploy automaticamente

### Verificar status:

- Acesse **Actions** no seu repositório GitHub
- Veja o workflow "Deploy to GitHub Pages"
- Quando ficar verde ✅, seu site está no ar!

---

## 🌐 Acessar seu site

Após o deploy, seu site estará disponível em:

```
https://SEU-USUARIO.github.io/spellbook/
```

> Substitua `SEU-USUARIO` e `spellbook` pelos seus valores reais.

---

## 📁 Estrutura do Build

```
teste(2)/
├── dist/                    ← Pasta gerada pelo build (não commitar)
│   ├── Spellbook Wireframes.html
│   ├── *.js                 ← Arquivos JSX compilados para JS
│   ├── *.css
│   ├── *.json
│   └── marauder/            ← Fontes copiadas
├── build.js                 ← Script de build
├── package.json
├── .github/workflows/
│   └── deploy.yml           ← CI/CD automático
└── ... (seus arquivos fonte)
```

---

## 🔧 Comandos úteis

| Comando | Descrição |
|---------|-----------|
| `npm install` | Instala dependências |
| `npm run build` | Compila projeto para `dist/` |
| `npm run deploy` | Build + deploy manual para gh-pages |
| `npm run deploy:local` | Build + servidor local para testar |

---

## ❓ Problemas comuns

### "Module not found" ao rodar build
```bash
npm install
```

### Site não carrega (404)
- Verifique se o GitHub Pages está ativado em Settings → Pages
- Confirme que a source está em "GitHub Actions" (se usar CI) ou "gh-pages branch" (se usar deploy manual)

### Fontes não carregam
- As fontes `.woff2` são copiadas automaticamente pelo build
- Verifique se os arquivos estão em `dist/marauder/webfonts/`

### JSX não funciona
- O build compila `.jsx` para `.js` e remove o Babel standalone
- Não é necessário Babel no navegador em produção

---

## 📝 Notas importantes

- **Não commite a pasta `dist/`** — ela é gerada automaticamente
- **Não commite `node_modules/`** — já está no `.gitignore` implícito
- O arquivo `404.html` é criado automaticamente para suportar SPA routing

---

Feito! Seu Spellbook estará no ar em poucos minutos. 🎉
