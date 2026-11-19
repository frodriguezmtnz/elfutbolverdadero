#!/usr/bin/env node
// Inyecta las cabeceras de seguridad HTTP en .vercel/output/config.json.
// Se ejecuta tras el build (ver package.json → "build"): la Build Output API
// solo soporta `routes`, así que se usa una ruta pass-through (headers +
// continue) colocada en la POSICIÓN 0 — el propio adapter de Astro ya usa
// ese mismo patrón para el cache-control de /_astro.
//
// Con `continue: true` la regla no "consume" la petición: aplica las
// cabeceras y sigue evaluando el resto de rutas (host 308, legacy
// redirects, filesystem...), por lo que también viajan en redirecciones.
import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';

const ROOT = process.cwd();
const CONFIG_PATH = path.join(ROOT, '.vercel', 'output', 'config.json');
const DRY_RUN = process.argv.includes('--dry-run');

// Fuente única de verdad de la CSP. Recursos permitidos:
//  - cdn.sanity.io: imágenes del CMS (único CDN de imágenes del sitio)
//  - cloud.umami.is: script de analítica (solo si PUBLIC_UMAMI_WEBSITE_ID
//    está definida) y sus beacons
//  - youtube[-nocookie].com: iframes de embeds del cuerpo (los 53 embeds
//    del dataset son www.youtube.com o self)
//  - style-src 'unsafe-inline': atributos style= generados en el render
//    (colores dinámicos de categoría); los <script> inline no-JS
//    (JSON-LD) no ejecutan y no requieren nonce
//  - frame-ancestors 'none' + X-Frame-Options DENY: evita clickjacking
export const CSP = [
  "default-src 'self'",
  "script-src 'self' https://cloud.umami.is",
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data: https://cdn.sanity.io",
  "font-src 'self'",
  "connect-src 'self' https://cloud.umami.is",
  "media-src 'self'",
  "frame-src 'self' https://www.youtube.com https://www.youtube-nocookie.com https://youtube-nocookie.com",
  "object-src 'none'",
  "base-uri 'self'",
  "form-action 'self'",
  "frame-ancestors 'none'",
].join('; ');

export function construirCabeceras() {
  return {
    'Strict-Transport-Security': 'max-age=63072000; includeSubDomains; preload',
    'X-Content-Type-Options': 'nosniff',
    'X-Frame-Options': 'DENY',
    'Referrer-Policy': 'strict-origin-when-cross-origin',
    'Permissions-Policy': 'camera=(), microphone=(), geolocation=()',
    'Content-Security-Policy': CSP,
  };
}

// Ruta pass-through que aplica las cabeceras a TODAS las respuestas.
// Marcador para idempotencia: el header X-Content-Type-Options solo lo
// establece este script (ni Astro ni Vercel lo añaden por defecto).
export function construirRutaCabeceras() {
  return {
    src: '/(.*)',
    headers: construirCabeceras(),
    continue: true,
  };
}

export function yaPresente(routes) {
  return routes.some((r) => r.continue === true && r.headers?.['X-Content-Type-Options']);
}

/* v8 ignore start */
// Se excluye de cobertura: es E/S pura (fs + process.exit) y se valida
// con el A/B del config.json en el build y el preview de Vercel.
function main() {
  if (!existsSync(CONFIG_PATH)) {
    console.error('No existe .vercel/output/config.json — ejecuta primero "astro build".');
    process.exit(1);
  }

  const config = JSON.parse(readFileSync(CONFIG_PATH, 'utf8'));
  if (!Array.isArray(config.routes)) {
    console.error('config.json sin array routes — revisar el adapter.');
    process.exit(1);
  }

  if (yaPresente(config.routes)) {
    console.log('Cabeceras de seguridad ya presentes en config.json — nada que hacer.');
    return;
  }

  const ruta = construirRutaCabeceras();
  if (DRY_RUN) {
    console.log('--dry-run: se inyectaría esta ruta en la posición 0:');
    console.log(JSON.stringify(ruta, null, 2));
    return;
  }

  config.routes.unshift(ruta);
  writeFileSync(CONFIG_PATH, JSON.stringify(config, null, '\t'), 'utf8');
  console.log(
    `✓ Inyectadas ${Object.keys(ruta.headers).length} cabeceras de seguridad (posición 0).`,
  );
  console.log('  HSTS, X-Content-Type-Options, X-Frame-Options, Referrer-Policy,');
  console.log('  Permissions-Policy y Content-Security-Policy.');
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  main();
}
/* v8 ignore stop */
