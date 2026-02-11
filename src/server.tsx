/**
 * Bun Development Server
 *
 * Serves the React+TS UI with SWC compilation baked into Bun
 */

import { readFileSync, existsSync, mkdirSync } from 'fs';
import { join } from 'path';
import { networkInterfaces } from 'os';
import { API_URLS, API_ENV_VARS } from './lib/api-constants';

const PORT = Number(process.env.WEB_PORT) || 3000;

// Determine if we're in development mode
const isDev = process.env.NODE_ENV === 'development';

// Get API base URL for proxy mode
// - Development: uses dev API (can be overridden with DEV_API_BASE_URL)
// - Production: uses API_BASE_URL
const API_PROXY_TARGET = isDev
  ? (process.env[API_ENV_VARS.DEV_API] || API_URLS.DEV)
  : process.env[API_ENV_VARS.PROD_API];

if (!API_PROXY_TARGET) {
  console.log('ℹ️  API_BASE_URL not set - app will use default API directly');
  console.log('   To use proxy mode, set API_BASE_URL=/api (and API_BASE_URL for proxy target)');
}
const HTML_PATH = join(import.meta.dir, '../index.html');
const CSS_INPUT = join(import.meta.dir, 'styles/globals.css');
const CSS_OUTPUT = join(import.meta.dir, '../.cache/styles.css');

// Ensure cache directory exists
const cacheDir = join(import.meta.dir, '../.cache');
if (!existsSync(cacheDir)) {
  mkdirSync(cacheDir, { recursive: true });
}

// Compile Tailwind CSS at startup
async function compileTailwindCSS(): Promise<boolean> {
  const proc = Bun.spawn(
    ['bunx', 'tailwindcss', '-i', CSS_INPUT, '-o', CSS_OUTPUT],
    { stdout: 'inherit', stderr: 'inherit' }
  );
  await proc.exited;
  return proc.exitCode === 0;
}

// 获取本机局域网 IP 地址
function getLocalIP(): string | null {
  try {
    const nets = networkInterfaces();
    for (const name of Object.keys(nets)) {
      for (const net of nets[name] || []) {
        // 跳过内部（即 127.0.0.1）和非 IPv4 地址
        if (net.family === 'IPv4' && !net.internal) {
          return net.address;
        }
      }
    }
  } catch (e) {
    // 忽略错误
  }
  return null;
}

// Initial CSS compilation
console.log('🎨 Compiling Tailwind CSS...');
await compileTailwindCSS();

// Watch for CSS changes and recompile (runs in background)
void Bun.spawn(
  ['bunx', 'tailwindcss', '-i', CSS_INPUT, '-o', CSS_OUTPUT, '--watch'],
  { stdout: 'inherit', stderr: 'inherit' }
);

void Bun.serve({
  port: PORT,
  hostname: '0.0.0.0', // 允许局域网访问
  async fetch(req) {
    const url = new URL(req.url);

    // Proxy /api requests to backend
    if (url.pathname.startsWith('/api')) {
      // If API_BASE_URL is not set, return a friendly error
      if (!API_PROXY_TARGET) {
        return new Response(
          JSON.stringify({
            error: 'API_BASE_URL not configured',
            message: 'Please set API_BASE_URL environment variable to enable API requests',
            details: 'The API proxy is disabled because API_BASE_URL is not set. This is normal during development when using mock data.',
          }),
          {
            status: 503,
            headers: { 'Content-Type': 'application/json' },
          }
        );
      }

      try {
        // Strip /api prefix since remote API doesn't use it
        const apiPath = url.pathname.replace(/^\/api/, '');
        const apiUrl = new URL(apiPath + url.search, API_PROXY_TARGET);

        // Build clean headers (exclude problematic ones)
        const headers = new Headers();
        headers.set('Content-Type', 'application/json');
        headers.set('Accept', 'application/json');

        // Only include body for POST/PUT/PATCH requests
        const hasBody = ['POST', 'PUT', 'PATCH'].includes(req.method);

        console.log(`[Proxy] ${req.method} ${apiUrl.toString()}`);

        const response = await fetch(apiUrl.toString(), {
          method: req.method,
          headers,
          body: hasBody ? req.body : undefined,
        });

        // Forward the response
        return new Response(response.body, {
          status: response.status,
          statusText: response.statusText,
          headers: response.headers,
        });
      } catch (error) {
        console.error(`[Proxy] ${req.method} ${req.url} failed:`, error);
        return new Response(JSON.stringify({ error: 'API server unavailable', details: String(error) }), {
          status: 502,
          headers: { 'Content-Type': 'application/json' },
        });
      }
    }

    // Serve RainbowKit CSS
    if (url.pathname === '/rainbowkit.css') {
      const rainbowkitCSS = Bun.file(join(import.meta.dir, '../node_modules/@rainbow-me/rainbowkit/dist/index.css'));
      return new Response(rainbowkitCSS, {
        headers: { 'Content-Type': 'text/css' },
      });
    }

    // Serve compiled Tailwind CSS (both old and new paths)
    if (url.pathname === '/src/styles/globals.css' || url.pathname === '/styles.css') {
      const cssFile = Bun.file(CSS_OUTPUT);
      if (await cssFile.exists()) {
        return new Response(cssFile, {
          headers: { 'Content-Type': 'text/css' },
        });
      }
      // Fallback: try to compile on-demand
      await compileTailwindCSS();
      return new Response(Bun.file(CSS_OUTPUT), {
        headers: { 'Content-Type': 'text/css' },
      });
    }

    // Serve main.js as entry point (maps to src/main.tsx)
    if (url.pathname === '/main.js') {
      try {
        const mainTsxPath = join(import.meta.dir, 'main.tsx');
        const result = await Bun.build({
          entrypoints: [mainTsxPath],
          target: 'browser',
          format: 'esm',
          minify: false,
          sourcemap: 'inline',
          splitting: false,
          external: ['./styles/globals.css'],
          loader: {
            '.css': 'file',
          },
        });

        if (result.success && result.outputs.length > 0) {
          const output = result.outputs[0];
          let code = await output.text();

          // Remove CSS imports (they're already in HTML)
          code = code.replace(/import\s*["'][^"']*\.css["'];?\s*\n?/g, '');

          // Fix import paths to include extensions
          code = code.replace(
            /from\s+["'](\.[^"']+?)(?:\.tsx|\.ts|\.jsx|\.js)?["']/g,
            (match, path) => {
              // Skip if already has extension
              if (path.endsWith('.tsx') || path.endsWith('.ts') ||
                  path.endsWith('.jsx') || path.endsWith('.js')) {
                return match;
              }
              // Add .tsx extension for local imports
              return match.replace(path, path + '.tsx');
            }
          );

          return new Response(code, {
            headers: {
              'Content-Type': 'application/javascript; charset=utf-8',
            },
          });
        }
      } catch (error) {
        console.error('Failed to build main.js:', error);
      }
    }

    // Serve static files from public directory first, then project root
    const sanitizedPath = url.pathname.replace(/^\/+/, '');

    // Try public directory first (for static assets like images)
    let filePath = join(import.meta.dir, '..', 'public', sanitizedPath);
    let file = Bun.file(filePath);
    let fileExists = await file.exists();

    // If not found in public, try project root
    if (!fileExists) {
      filePath = join(import.meta.dir, '..', sanitizedPath);
      file = Bun.file(filePath);
      fileExists = await file.exists();
    }

    if (!fileExists && !sanitizedPath.includes('.')) {
      // Try common extensions for module imports
      const extensions = ['.tsx', '.ts', '.jsx', '.js'];
      for (const ext of extensions) {
        const testPath = filePath + ext;
        if (await Bun.file(testPath).exists()) {
          filePath = testPath;
          fileExists = true;
          break;
        }
      }
    }

    // If still not found and path looks like a route (not a file), serve HTML for SPA
    if (!fileExists && (url.pathname === '/' || !url.pathname.includes('.'))) {
      const htmlTemplate = readFileSync(HTML_PATH, 'utf-8');

      // Inject environment variables into HTML for client-side access
      const envScript = `
    <script>
      // Runtime environment variables injection (development mode)
      window.__PREALPHA_ENV__ = {
        NODE_ENV: ${JSON.stringify(process.env.NODE_ENV || 'production')},
        API_BASE_URL: ${JSON.stringify(process.env.API_BASE_URL || '')},
        WALLETCONNECT_PROJECT_ID: ${JSON.stringify(process.env.WALLETCONNECT_PROJECT_ID || '')}
      };
    </script>`;

      const htmlWithEnv = htmlTemplate.replace('</head>', `${envScript}\n  </head>`);

      return new Response(htmlWithEnv, {
        headers: { 'Content-Type': 'text/html' },
      });
    }

    try {
      const resolvedFile = Bun.file(filePath);
      if (await resolvedFile.exists()) {
        // For TypeScript/JSX files, transpile with external imports preserved
        if (filePath.endsWith('.tsx') || filePath.endsWith('.ts') || filePath.endsWith('.jsx')) {
          try {
            const result = await Bun.build({
              entrypoints: [filePath],
              target: 'browser',
              format: 'esm',
              minify: false,
              sourcemap: 'none',
              splitting: false,
              external: [
                // CSS is compiled separately by Tailwind CLI
                // All other dependencies are bundled by Bun to ensure single React instance
                './styles/globals.css',
              ],
              loader: {
                // Avoid Bun trying to parse Tailwind directives
                '.css': 'file',
              },
            });

            if (result.success && result.outputs.length > 0) {
              const output = result.outputs[0];
              let code = await output.text();

              // Remove CSS imports (they're already in HTML)
              code = code.replace(/import\s*["'][^"']*\.css["'];?\s*\n?/g, '');

              // Fix import paths to include extensions
              code = code.replace(
                /from\s+["'](\.[^"']+?)(?:\.tsx|\.ts|\.jsx|\.js)?["']/g,
                (match, path) => {
                  // Skip if already has extension
                  if (path.endsWith('.tsx') || path.endsWith('.ts') ||
                      path.endsWith('.jsx') || path.endsWith('.js')) {
                    return match;
                  }
                  // Add .tsx extension for local imports
                  return match.replace(path, path + '.tsx');
                }
              );

              return new Response(code, {
                headers: {
                  'Content-Type': 'application/javascript; charset=utf-8',
                },
              });
            }
          } catch (buildError) {
            console.error('Build error:', buildError);
          }
        }
        return new Response(resolvedFile);
      }
    } catch (error) {
      console.error('File error:', error);
    }

    // Fallback to index.html for client-side routing
    const htmlTemplate = readFileSync(HTML_PATH, 'utf-8');

    // Inject environment variables into HTML for client-side access
    const envScript = `
    <script>
      // Runtime environment variables injection (development mode)
      window.__PREALPHA_ENV__ = {
        API_BASE_URL: ${JSON.stringify(process.env.API_BASE_URL || '')},
        WALLETCONNECT_PROJECT_ID: ${JSON.stringify(process.env.WALLETCONNECT_PROJECT_ID || '')}
      };
    </script>`;

    const htmlWithEnv = htmlTemplate.replace('</head>', `${envScript}\n  </head>`);

    return new Response(htmlWithEnv, {
      headers: { 'Content-Type': 'text/html' },
    });
  },
  development: true,
});

const localIP = getLocalIP();
console.log(`🚀 PreAlpha Web running at http://localhost:${PORT}`);
if (localIP) {
  console.log(`🌐 Also accessible at http://${localIP}:${PORT}`);
}
if (API_PROXY_TARGET) {
  console.log(`📡 Proxying /api to ${API_PROXY_TARGET}`);
} else {
  console.log(`📡 API proxy disabled - app will use default API directly`);
}
