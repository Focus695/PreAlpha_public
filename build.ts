/**
 * Production Build Script
 *
 * Builds the React app for production using Bun bundler
 */

import { copyFileSync, mkdirSync, existsSync, rmSync, renameSync } from 'fs';
import { join } from 'path';
import { createHash } from 'crypto';

const DIST_DIR = './dist';

console.log('🏗️  Building PreAlpha Web...');

function shortHashFromArrayBuffer(buf: ArrayBuffer): string {
  return createHash('sha256').update(new Uint8Array(buf)).digest('hex').slice(0, 10);
}

// Clean dist directory
if (existsSync(DIST_DIR)) {
  rmSync(DIST_DIR, { recursive: true });
}
mkdirSync(DIST_DIR, { recursive: true });

// Step 1: Build CSS with Tailwind
console.log('📦 Building CSS with Tailwind...');
const tailwindProc = Bun.spawn(
  [
    'bunx',
    'tailwindcss',
    '-i',
    './src/styles/globals.css',
    '-o',
    `${DIST_DIR}/styles.css`,
    '--minify',
  ],
  {
    stdout: 'inherit',
    stderr: 'inherit',
  }
);

await tailwindProc.exited;
if (tailwindProc.exitCode !== 0) {
  console.error('❌ Tailwind build failed');
  process.exit(1);
}

// Hash CSS filenames to avoid production-cache mismatches (Cloudflare respects immutable caching)
console.log('🔢 Hashing CSS filenames...');

// Tailwind output (built from globals.css)
const tailwindCssPath = `${DIST_DIR}/styles.css`;
const tailwindHash = shortHashFromArrayBuffer(await Bun.file(tailwindCssPath).arrayBuffer());
const tailwindCssHashedName = `styles.${tailwindHash}.css`;
renameSync(tailwindCssPath, `${DIST_DIR}/${tailwindCssHashedName}`);
console.log(`🎨 Tailwind CSS: /${tailwindCssHashedName}`);

// Copy + hash RainbowKit CSS
console.log('📦 Copying RainbowKit CSS...');
const rainbowkitCssTmpPath = `${DIST_DIR}/rainbowkit.css`;
copyFileSync('./node_modules/@rainbow-me/rainbowkit/dist/index.css', rainbowkitCssTmpPath);
const rainbowkitHash = shortHashFromArrayBuffer(await Bun.file(rainbowkitCssTmpPath).arrayBuffer());
const rainbowkitCssHashedName = `rainbowkit.${rainbowkitHash}.css`;
renameSync(rainbowkitCssTmpPath, `${DIST_DIR}/${rainbowkitCssHashedName}`);
console.log(`🌈 RainbowKit CSS: /${rainbowkitCssHashedName}`);

// Step 2: Build JavaScript with Bun
console.log('📦 Building JavaScript...');

// Get environment variables, or use defaults
const apiBaseUrl = process.env.API_BASE_URL || 'YOUR_API_BASE_URL';
const walletConnectProjectId = process.env.WALLETCONNECT_PROJECT_ID || '';

console.log('🔍 Debug: Listing all environment variable KEYS (values hidden):');
console.log(JSON.stringify(Object.keys(process.env).sort(), null, 2));

if (process.env.API_BASE_URL) {
  console.log(`✅ API_BASE_URL will be injected at runtime: ${apiBaseUrl}`);
} else {
  console.log(`ℹ️  API_BASE_URL not set, using default: ${apiBaseUrl}`);
  console.log('   (Set API_BASE_URL environment variable to override)');
}

if (process.env.WALLETCONNECT_PROJECT_ID) {
  console.log(`✅ WALLETCONNECT_PROJECT_ID will be injected at runtime (length: ${walletConnectProjectId.length})`);
} else {
  console.error(`❌ WALLETCONNECT_PROJECT_ID is MISSING in build environment!`);
  console.error(`   The build script cannot see 'WALLETCONNECT_PROJECT_ID'.`);
  console.error(`   Please check your Cloudflare Pages/Workers settings.`);
  console.warn(`⚠️  Wallet connection will NOT work without this ID.`);
}

console.log('   (Environment variables will NOT be hardcoded in JavaScript bundle for security)');

const result = await Bun.build({
  entrypoints: ['./src/main.tsx'],
  outdir: DIST_DIR,
  publicPath: '/',
  target: 'browser',
  minify: false,//之后改为true
  splitting: false,
  format: 'esm',
  // Only inject NODE_ENV, API_BASE_URL will be injected at runtime via window.__PREALPHA_ENV__
  // This prevents API URL from being exposed in the JavaScript bundle
  // NODE_ENV is used by logger.ts to disable debug logs in production
  define: {
    'process.env.NODE_ENV': JSON.stringify('production'),
    // DO NOT inject API_BASE_URL here - it will be injected at runtime in HTML
    // 以下是针对 Web3 库的必要注入
    'global': 'window',
    'process.browser': 'true',
    'process.version': '""', // 有些库会检查 node 版本
  },
  naming: {
    entry: '[dir]/[name].[hash].[ext]',
    chunk: 'chunks/[name].[hash].[ext]',
    asset: 'assets/[name].[hash].[ext]',
  },
  external: [
    // CSS is compiled separately with Tailwind
    // All other dependencies are bundled by Bun to ensure single React instance
    './styles/globals.css',
  ],
  loader: {
    '.css': 'file',
  },
});

if (!result.success) {
  console.error('❌ Build failed:');
  for (const log of result.logs) {
    console.error(log);
  }
  process.exit(1);
}

// --- 更加健壮的 Step 3 ---
console.log('📋 Copying index.html...');
const indexHtml = await Bun.file('./index.html').text();

// 1. 找到构建后的主入口文件
// 优先匹配包含 "main" 且在输出列表中的 JS
const mainJs = result.outputs.find(
  (output) =>
    output.kind === 'entry-point' &&
    output.path.endsWith('.js')
) || result.outputs.find(
  (output) => output.path.includes('main') && output.path.endsWith('.js')
);

// 2. 修复路径：确保只拿到文件名，不带本地磁盘绝对路径
let mainJsFileName = 'main.js';
if (mainJs) {
  // 使用 import { basename } from 'path' 会更优雅，如果没有 import 也可以用 split
  const pathParts = mainJs.path.split(/[\\/]/); // 同时兼容 Windows(\) 和 Linux(/)
  mainJsFileName = pathParts[pathParts.length - 1];
}

console.log(`🔗 Linking to JS: /${mainJsFileName}`);

// 3. 注入运行时环境变量到 HTML（在 </head> 之前）
// 这样敏感配置不会出现在 JavaScript bundle 中，提高安全性
const envScript = `
  <script>
    // Runtime environment variables injection
    // These values are injected at build time, not in the JavaScript bundle
    window.__PREALPHA_ENV__ = {
      API_BASE_URL: ${JSON.stringify(apiBaseUrl)},
      WALLETCONNECT_PROJECT_ID: ${JSON.stringify(walletConnectProjectId)}
    };
  </script>`;

// 4. 注入到 HTML
// 注意：这里确保 src 属性的值以 "/" 开头，这是解决浏览器解析路径问题的关键
let updatedHtml = indexHtml
  .replace(/src="\/src\/main\.tsx"/g, `src="/${mainJsFileName}"`)
  .replace(/src="\/main\.js"/g, `src="/${mainJsFileName}"`)
  .replace(/src='\/src\/main\.tsx'/g, `src='/${mainJsFileName}'`)
  .replace(/src='\/main\.js'/g, `src='/${mainJsFileName}'`)
  // Replace any legacy dev CSS path with hashed CSS
  .replace('/src/styles/globals.css', `/${tailwindCssHashedName}`)
  // Replace fixed CSS hrefs with hashed ones (avoid immutable cache issues)
  .replace(/href="\/styles\.css"/g, `href="/${tailwindCssHashedName}"`)
  .replace(/href='\/styles\.css'/g, `href='/${tailwindCssHashedName}'`)
  .replace(/href="\/rainbowkit\.css"/g, `href="/${rainbowkitCssHashedName}"`)
  .replace(/href='\/rainbowkit\.css'/g, `href='/${rainbowkitCssHashedName}'`)
  .replace('</head>', `${envScript}\n</head>`); // 在 </head> 之前注入环境变量

// 5. Remove the @/ import map entry that references /src/ (not available in production)
// This prevents "Failed to load module script" errors in the browser
updatedHtml = updatedHtml.replace(
  /,?\s*"@\/"\s*:\s*"\/src\/"/g,
  ''
);

await Bun.write(join(DIST_DIR, 'index.html'), updatedHtml);

// Step 4: Copy public assets (if any)
if (existsSync('./public')) {
  console.log('📁 Copying public assets...');
  const publicFiles = await Array.fromAsync(new Bun.Glob('**/*').scan({ cwd: './public' }));
  for (const file of publicFiles) {
    const destDir = join(DIST_DIR, file.split('/').slice(0, -1).join('/'));
    if (destDir && !existsSync(destDir)) {
      mkdirSync(destDir, { recursive: true });
    }
    copyFileSync(join('./public', file), join(DIST_DIR, file));
  }
}

console.log('✅ Build complete!');
console.log(`📂 Output: ${DIST_DIR}/`);
