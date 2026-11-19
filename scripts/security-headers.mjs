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
import { readFileSync, writeFileSync, existsSync, readdirSync } from 'node:fs';
import crypto from 'node:crypto';
import path from 'node:path';
import { pathToFileURL } from 'node:url';

const ROOT = process.cwd();
const CONFIG_PATH = path.join(ROOT, '.vercel', 'output', 'config.json');
const DRY_RUN = process.argv.includes('--dry-run');

// Hashes SHA-256 (base64) de los ÚNICOS <script> inline ejecutables que
// emite el build (950 páginas escaneadas). Astro los genera inline en vez
// de como archivos externos; en SSG no existen nonces (deben ser únicos
// por respuesta HTTP) y 'unsafe-inline' anularía la protección XSS, así
// que se permiten por hash. Si una dependencia (Astro, astro-reveal...)
// muta uno de estos scripts, el guard de build rompe CI con el hash nuevo
// en el mensaje: se añade aquí y listo.
export const SCRIPTS_INLINE_PERMITIDOS = [
  // Boot de astro-reveal: window.__ASTRO_REVEAL__ + IntersectionObserver
  'sha256-MlTpMj8chxZeS1vRfdYTZwKrqVU7c8iP8aPhKP4JWj4=',
  // Header sticky/smart scroll ([data-header])
  'sha256-5rTu2DRXAKgScrQGL5VTJfmMdHmZ2ZGKDAvLcSAIDNc=',
  // Failsafe del reveal (scroll/resize) — layouts/Base.astro
  'sha256-uk6Cq0DWKQWtVTbyxEQBR5oMKdHoWE4HgpzrahaKSPw=',
  // Carrusel [data-carrusel] — components/AnimataText.astro
  'sha256-0VoXi0491vEClkNDlz/xXPWOgAa6YM23zKTRTGTOwd8=',
];

// Fuente única de verdad de la CSP. Recursos permitidos:
//  - cdn.sanity.io: imágenes del CMS (único CDN de imágenes del sitio)
//  - cloud.umami.is: script de analítica (solo si PUBLIC_UMAMI_WEBSITE_ID
//    está definida) y sus beacons
//  - youtube[-nocookie].com: iframes de embeds del cuerpo (los 53 embeds
//    del dataset son www.youtube.com o self)
//  - vercel.live: toolbar que Vercel SOLO inyecta en deployments de
//    preview (en producción nada la carga, las entradas no casan con nada)
//  - style-src 'unsafe-inline': atributos style= generados en el render
//    (colores dinámicos de categoría); los <script> inline no-JS
//    (JSON-LD) son data blocks: no ejecutan y no requieren hash
//  - frame-ancestors 'none' + X-Frame-Options DENY: evita clickjacking
export const CSP = [
  "default-src 'self'",
  `script-src 'self' https://cloud.umami.is https://vercel.live ${SCRIPTS_INLINE_PERMITIDOS.join(' ')}`,
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data: https://cdn.sanity.io",
  "font-src 'self'",
  "connect-src 'self' https://cloud.umami.is https://vercel.live",
  "media-src 'self'",
  "frame-src 'self' https://www.youtube.com https://www.youtube-nocookie.com https://youtube-nocookie.com https://vercel.live",
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

// ---- guard de hashes de scripts inline ----
// Extrae el hash SHA-256 (formato CSP 'sha256-<base64>') de cada <script>
// inline EJECUTABLE de un HTML. Los data blocks (application/ld+json) y
// los scripts con src= quedan excluidos.
export function extraerHashesInline(html) {
  const hashes = new Set();
  for (const m of html.matchAll(/<script\b([^>]*)>([\s\S]*?)<\/script>/g)) {
    const attrs = m[1];
    if (attrs.includes('src=')) continue;
    if (attrs.includes('ld+json')) continue;
    hashes.add('sha256-' + crypto.createHash('sha256').update(m[2]).digest('base64'));
  }
  return hashes;
}

// Recorre todos los .html de un directorio y devuelve los hashes inline
// que NO están en la lista de permitidos, con el archivo de ejemplo.
export function verificarHashesInline(dir, permitidos = SCRIPTS_INLINE_PERMITIDOS) {
  const permitidoSet = new Set(permitidos);
  const desconocidos = new Map();
  const recorrer = (d) => {
    for (const entry of readdirSync(d, { withFileTypes: true })) {
      const abs = path.join(d, entry.name);
      if (entry.isDirectory()) recorrer(abs);
      else if (entry.name.endsWith('.html')) {
        for (const hash of extraerHashesInline(readFileSync(abs, 'utf8'))) {
          if (!permitidoSet.has(hash) && !desconocidos.has(hash)) {
            desconocidos.set(hash, path.relative(dir, abs));
          }
        }
      }
    }
  };
  recorrer(dir);
  return [...desconocidos.entries()].map(([hash, archivo]) => ({ hash, archivo }));
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

  if (!yaPresente(config.routes)) {
    const ruta = construirRutaCabeceras();
    if (DRY_RUN) {
      console.log('--dry-run: se inyectaría esta ruta en la posición 0:');
      console.log(JSON.stringify(ruta, null, 2));
    } else {
      config.routes.unshift(ruta);
      writeFileSync(CONFIG_PATH, JSON.stringify(config, null, '\t'), 'utf8');
      console.log(
        `✓ Inyectadas ${Object.keys(ruta.headers).length} cabeceras de seguridad (posición 0).`,
      );
      console.log('  HSTS, X-Content-Type-Options, X-Frame-Options, Referrer-Policy,');
      console.log('  Permissions-Policy y Content-Security-Policy.');
    }
  } else {
    console.log('Cabeceras de seguridad ya presentes en config.json — nada que hacer.');
  }

  // Guard: todo <script> inline del dist/ debe tener su hash en la CSP.
  // Un hash nuevo (bump de Astro/astro-reveal que mute un script inline)
  // rompe el build con instrucciones, en vez de romper la web en prod.
  const distDir = path.join(ROOT, 'dist');
  if (existsSync(distDir)) {
    const desconocidos = verificarHashesInline(distDir);
    if (desconocidos.length) {
      console.error(`✖ Guard CSP: ${desconocidos.length} script(s) inline sin hash en la CSP:`);
      for (const { hash, archivo } of desconocidos) {
        console.error(`  - ${hash} (ej: ${archivo})`);
      }
      console.error('Añádelos a SCRIPTS_INLINE_PERMITIDOS en scripts/security-headers.mjs');
      console.error('— o elimina el script inline — y vuelve a lanzar el build.');
      process.exit(1);
    }
    console.log('✓ Guard CSP: todos los scripts inline del dist/ tienen su hash en la CSP.');
  }
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  main();
}
/* v8 ignore stop */
