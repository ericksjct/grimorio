/**
 * Build script - Compila JSX para JS puro e prepara o dist/
 * 
 * O que faz:
 * 1. Limpa a pasta dist/
 * 2. Compila todos os arquivos .jsx para .js usando Babel
 * 3. Copia arquivos estáticos (HTML, CSS, JSON, fontes, imagens)
 * 4. Atualiza as referências no HTML (jsx -> js, type="text/babel" -> type="text/javascript")
 */

const fs = require('fs');
const path = require('path');

// Verifica se Babel está instalado
try {
  require.resolve('@babel/core');
} catch (e) {
  console.error('❌ @babel/core não encontrado. Rode primeiro: npm install');
  process.exit(1);
}

const babel = require('@babel/core');

const SRC_DIR = __dirname;
const DIST_DIR = path.join(__dirname, 'dist');

// Arquivos/pastas a ignorar
const IGNORE = [
  'node_modules',
  'dist',
  '.git',
  'build.js',
  'package.json',
  'package-lock.json',
  '.github',
  'DEPLOY-GUIDE.md',
  'README.md',
];

// Extensões que são copiadas como estáticos
const STATIC_EXTS = ['.html', '.css', '.json', '.woff2', '.png', '.jpg', '.jpeg', '.gif', '.svg', '.ico', '.txt', '.md'];

function cleanDist() {
  if (fs.existsSync(DIST_DIR)) {
    fs.rmSync(DIST_DIR, { recursive: true });
    console.log('🧹 Limpando dist/...');
  }
  fs.mkdirSync(DIST_DIR, { recursive: true });
}

function shouldIgnore(filePath) {
  const basename = path.basename(filePath);
  return IGNORE.some(ign => basename === ign || basename.startsWith('.'));
}

function copyFile(src, dest) {
  fs.mkdirSync(path.dirname(dest), { recursive: true });
  fs.copyFileSync(src, dest);
}

function compileJsx(srcPath, destPath) {
  const code = fs.readFileSync(srcPath, 'utf-8');
  
  try {
    const result = babel.transformSync(code, {
      presets: ['@babel/preset-react'],
      filename: srcPath,
    });
    
    fs.mkdirSync(path.dirname(destPath), { recursive: true });
    fs.writeFileSync(destPath, result.code);
    console.log(`   ⚡ Compilado: ${path.relative(SRC_DIR, srcPath)} → ${path.relative(SRC_DIR, destPath)}`);
  } catch (err) {
    console.error(`   ❌ Erro compilando ${srcPath}:`, err.message);
    process.exit(1);
  }
}

function processDirectory(srcDir, destDir) {
  const entries = fs.readdirSync(srcDir, { withFileTypes: true });
  
  for (const entry of entries) {
    const srcPath = path.join(srcDir, entry.name);
    const destPath = path.join(destDir, entry.name);
    
    if (shouldIgnore(srcPath)) continue;
    
    if (entry.isDirectory()) {
      processDirectory(srcPath, destPath);
    } else if (entry.name.endsWith('.jsx')) {
      // Compila JSX para JS
      const jsDestPath = destPath.replace(/\.jsx$/, '.js');
      compileJsx(srcPath, jsDestPath);
    } else if (STATIC_EXTS.some(ext => entry.name.endsWith(ext))) {
      copyFile(srcPath, destPath);
    }
  }
}

function fixHtmlReferences() {
  const htmlFiles = [];
  
  function findHtml(dir) {
    const entries = fs.readdirSync(dir, { withFileTypes: true });
    for (const entry of entries) {
      const fullPath = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        findHtml(fullPath);
      } else if (entry.name.endsWith('.html')) {
        htmlFiles.push(fullPath);
      }
    }
  }
  
  findHtml(DIST_DIR);
  
  for (const htmlFile of htmlFiles) {
    let content = fs.readFileSync(htmlFile, 'utf-8');
    
    // Remove o script do Babel standalone (não precisamos mais dele)
    content = content.replace(
      /<script[^>]*src="[^"]*babel[^"]*"[^>]*><\/script>\s*/gi,
      ''
    );
    
    // Substitui type="text/babel" por type="text/javascript"
    content = content.replace(/type="text\/babel"/g, 'type="text/javascript"');
    
    // Substitui .jsx por .js nos src
    content = content.replace(/\.jsx/g, '.js');
    
    fs.writeFileSync(htmlFile, content);
    console.log(`   🔧 HTML corrigido: ${path.relative(SRC_DIR, htmlFile)}`);
  }
}

function createSpaFallback() {
  // Para SPAs, cria um 404.html que é cópia do index.html
  // (GitHub Pages serve 404.html para rotas não encontradas)
  const indexPath = path.join(DIST_DIR, 'Spellbook Wireframes.html');
  const fallbackPath = path.join(DIST_DIR, '404.html');
  
  if (fs.existsSync(indexPath)) {
    fs.copyFileSync(indexPath, fallbackPath);
    console.log('   📄 404.html criado (SPA fallback)');
  }
}

// ===== EXECUÇÃO =====
console.log('🏗️  Iniciando build...\n');

cleanDist();
processDirectory(SRC_DIR, DIST_DIR);
fixHtmlReferences();
createSpaFallback();

console.log('\n✅ Build completo! Arquivos em dist/');
console.log('\n📋 Próximos passos:');
console.log('   1. npm install        (instalar dependências)');
console.log('   2. npm run deploy     (deploy para GitHub Pages)');
