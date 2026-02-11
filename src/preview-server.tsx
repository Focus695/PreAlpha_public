/**
 * Bun Preview Server
 *
 * Serves the production build for testing
 */

import { readFileSync } from 'fs';
import { join } from 'path';
import { networkInterfaces } from 'os';

const PORT = 3000;
const DIST_DIR = join(import.meta.dir, '../dist');

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

const indexHtml = readFileSync(join(DIST_DIR, 'index.html'), 'utf-8');

void Bun.serve({
  port: PORT,
  hostname: '0.0.0.0', // 允许局域网访问
  async fetch(req) {
    const url = new URL(req.url);

    // Serve index.html for root and SPA routes
    if (url.pathname === '/' || !url.pathname.includes('.')) {
      return new Response(indexHtml, {
        headers: { 'Content-Type': 'text/html' },
      });
    }

    // Serve static files from dist (strip leading slash to avoid absolute path resolution)
    const sanitizedPath = url.pathname.replace(/^\/+/, '');
    const filePath = join(DIST_DIR, sanitizedPath);

    try {
      const file = Bun.file(filePath);
      if (await file.exists()) {
        return new Response(file);
      }
    } catch (error) {
      console.error('File error:', error);
    }

    // Fallback to index.html
    return new Response(indexHtml, {
      headers: { 'Content-Type': 'text/html' },
    });
  },
});

const localIP = getLocalIP();
console.log(`🎉 PreAlpha Web preview at http://localhost:${PORT}`);
if (localIP) {
  console.log(`🌐 Also accessible at http://${localIP}:${PORT}`);
}
