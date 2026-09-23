#!/usr/bin/env node
// Servidor estático mínimo para Lighthouse CI (y previews locales rápidos).
// Astro 7 lanza `astro preview` como servidor gestionado en segundo plano, lo que
// complica el `startServerCommand` de LHCI; esto es un servidor en primer plano.
import { createServer } from 'node:http';
import { readFile, stat } from 'node:fs/promises';
import path from 'node:path';

const DIST = path.resolve('dist');
const PORT = Number(process.env.PORT ?? 4321);
const HOST = process.env.HOST ?? '127.0.0.1';

const TIPOS = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.mjs': 'text/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.xml': 'application/xml; charset=utf-8',
  '.txt': 'text/plain; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.gif': 'image/gif',
  '.webp': 'image/webp',
  '.avif': 'image/avif',
  '.ico': 'image/x-icon',
  '.woff': 'font/woff',
  '.woff2': 'font/woff2',
  '.map': 'application/json; charset=utf-8',
};

async function resolver(url) {
  const limpio = decodeURIComponent((url ?? '/').split('?')[0]);
  let abs = path.join(DIST, path.normalize(limpio));
  const rel = path.relative(DIST, abs);
  if (rel.startsWith('..') || path.isAbsolute(rel)) return null;
  try {
    if ((await stat(abs)).isDirectory()) abs = path.join(abs, 'index.html');
  } catch {
    if (!path.extname(abs)) abs += '.html';
  }
  try {
    if ((await stat(abs)).isFile()) return abs;
  } catch {
    /* no existe */
  }
  return null;
}

const server = createServer(async (req, res) => {
  const abs = await resolver(req.url);
  if (!abs) {
    res.writeHead(404, { 'content-type': 'text/plain; charset=utf-8' });
    res.end('404');
    return;
  }
  try {
    const cuerpo = await readFile(abs);
    res.writeHead(200, {
      'content-type': TIPOS[path.extname(abs)] ?? 'application/octet-stream',
    });
    res.end(cuerpo);
  } catch {
    res.writeHead(500, { 'content-type': 'text/plain; charset=utf-8' });
    res.end('500');
  }
});

server.listen(PORT, HOST, () => {
  console.log(`Listening on http://${HOST}:${PORT}`);
});
