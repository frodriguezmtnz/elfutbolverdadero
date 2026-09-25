#!/usr/bin/env node
// Inyecta las redirecciones del WordPress legacy en .vercel/output/config.json.
// Se ejecuta tras el build (ver package.json → "build"): Astro ya escribió sus
// propias reglas (p. ej. el slug árabe) y nosotros insertamos las nuestras justo
// antes de {handle:"filesystem"} — en Vercel gana la PRIMERA coincidencia.
//
// Diseño:
//  - Las reglas específicas se generan SOLO para slugs que existen en dist/
//    (categorías/etiquetas reales del build) → anti-colisión por construcción.
//  - Slug legacy desconocido (categoría borrada, archivo, basura) → paraguas
//    a /entrevistas/ en vez de 404.
//  - Guard: aborta si algún src casaría con una ruta ya generada (no se puede
//    enmascarar contenido real).
//  - Query legacy (/?p=<ID> de WP y /?s=<term>) vía `has`; el guard las omite
//    porque su src es "/" (no compiten con rutas, solo con el query string).
//
// Uso:
//   npm run build                    → astro build && node scripts/legacy-redirects.mjs
//   node scripts/legacy-redirects.mjs --dry-run   → imprime reglas + guard sin escribir
import { readFileSync, writeFileSync, readdirSync, existsSync, statSync } from 'node:fs';
import path from 'node:path';
import 'dotenv/config';
import { createClient } from '@sanity/client';

const ROOT = process.cwd();
const CONFIG_PATH = path.join(ROOT, '.vercel', 'output', 'config.json');
const DIST = path.join(ROOT, 'dist');
const DRY_RUN = process.argv.includes('--dry-run');

const ENTREVISTAS = '/entrevistas/';

// ---- utilidades ----
const esc = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
const subdirs = (dir) => {
  const abs = path.join(DIST, dir);
  if (!existsSync(abs)) return [];
  return readdirSync(abs).filter((name) => {
    const full = path.join(abs, name);
    return statSync(full).isDirectory() && existsSync(path.join(full, 'index.html'));
  });
};
const redirect = (src, dest, status = 301) => ({ src, dest, status });

// ---- inventario de rutas generadas (para el guard anti-colisión) ----
function rutasGeneradas(dir = DIST, acc = new Set()) {
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const abs = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      rutasGeneradas(abs, acc);
    } else if (entry.name.endsWith('.html')) {
      const rel = path.relative(DIST, abs).replaceAll('\\', '/');
      const ruta = rel === 'index.html' ? '/' : `/${rel.replace(/index\.html$/, '')}`;
      acc.add(ruta);
      acc.add(ruta === '/' ? '/' : ruta.replace(/\/$/, ''));
    }
  }
  return acc;
}

// ---- mapa de enlaces cortos heredados (?p=<ID> de WP → slug) ----
// Best-effort: si Sanity no responde, se omiten esas reglas sin romper el build.
async function mapaWpShortlinks() {
  if (!process.env.SANITY_PROJECT_ID) return new Map();
  try {
    const client = createClient({
      projectId: process.env.SANITY_PROJECT_ID,
      dataset: process.env.SANITY_DATASET ?? 'production',
      useCdn: false,
      apiVersion: '2024-01-01',
    });
    const docs = await client.fetch(
      "*[_type=='publicacion' && defined(slug.current)]{_id, 'slug': slug.current}",
    );
    const mapa = new Map();
    for (const d of docs) {
      const m = /^publicacion-wp-(\d+)$/.exec(d._id);
      if (m) mapa.set(m[1], d.slug);
    }
    return mapa;
  } catch (err) {
    console.warn(`⚠ Mapa ?p= no disponible (${err.message}); se omiten esas reglas.`);
    return new Map();
  }
}

// ---- reglas ----
function construirReglas(mapaWp = new Map()) {
  const reglas = [];

  // Enlaces cortos y búsquedas del WP legacy: /?p=<ID> → slug actual y
  // /?s=<term> → /buscar/ (el término viaja en el query; la página lee q|s).
  for (const [id, slug] of mapaWp) {
    reglas.push({
      src: '/',
      has: [{ type: 'query', key: 'p', value: `^${esc(id)}$` }],
      dest: `/${slug}/`,
      status: 301,
    });
  }
  reglas.push({ src: '/', has: [{ type: 'query', key: 's' }], dest: '/buscar/', status: 301 });

  // Categorías WP (anidadas o no) → /categoria/<último segmento>/, solo si existe
  for (const slug of subdirs('categoria')) {
    reglas.push(redirect(`^/category/(?:[^/]+/)*${esc(slug)}/?$`, `/categoria/${slug}/`));
  }

  // Etiquetas WP → /etiqueta/<slug>/, solo si existe
  for (const slug of subdirs('etiqueta')) {
    reglas.push(redirect(`^/tag/${esc(slug)}/?$`, `/etiqueta/${slug}/`));
  }

  // Paginación legacy (sin categoría/tag prefix) → general de entrevistas
  reglas.push(redirect('^/page/\\d+/?$', ENTREVISTAS));
  reglas.push(redirect('^/\\d{4}(?:/\\d{2}){0,2}/?$', ENTREVISTAS));

  // Archivos de autor WP (site monoautor — no hay páginas de autor en Astro)
  // → /author/xabiathletic/, /author/<slug>/page/N/ y feeds de autor legacy.
  reglas.push(redirect('^/author/[^/]+/feed/?$', '/rss.xml'));
  reglas.push(redirect('^/author/.+/?$', ENTREVISTAS));

  // Duplicados /slug/index.html → /slug/ (y /index.html → /)
  reglas.push(redirect('^/(.*)index\\.html$', '/$1'));

  // Catch-all categoría (sin paginación) → general
  reglas.push(redirect('^/category/(?:[^/]+/)*[^/]+/?$', ENTREVISTAS));

  // Catch-all etiqueta (sin paginación) → general
  reglas.push(redirect('^/tag/.+/?$', ENTREVISTAS));

  // Feeds: el general al RSS de Astro; los de comentarios ya no existen
  reglas.push({ src: '^/comments/feed/?$', status: 410 });
  reglas.push(redirect('^/feed(?:/.*)?/?$', '/rss.xml'));

  // Páginas WP fundidas en /futbolverdadero-acerca-de/ (que SÍ existe en Astro)
  reglas.push(
    redirect(
      '^/futbolverdadero-para-los-amantes-de-este-deporte/?$',
      '/futbolverdadero-acerca-de/',
    ),
  );
  reglas.push(
    redirect('^/eres-entrenador-y-estas-buscando-equipo/?$', '/futbolverdadero-acerca-de/'),
  );

  // Basura de WordPress (páginas del theme/membership/plugins confirmadas en vivo)
  for (const basura of ['home', 'home-2', 'be-pin-posts', 'be-pin-posts-2', 'login']) {
    reglas.push(redirect(`^/${esc(basura)}/?$`, '/'));
  }
  for (const prefijo of ['membership-account', 'membership-checkout', 'membership-levels']) {
    reglas.push(redirect(`^/${prefijo}(?:/.*)?/?$`, '/'));
  }

  return reglas;
}

// ---- guard anti-colisión + destinos válidos ----
function verificar(reglas, rutas) {
  const problemas = [];
  for (const { src, dest, has } of reglas) {
    if (!dest || has) continue;
    const re = new RegExp(src);
    for (const ruta of rutas) {
      if (re.test(ruta)) {
        problemas.push(`src ${src} casaría con la página generada ${ruta}`);
      }
    }
  }
  // destinos que deben existir (excepto los dinámicos con $1 y el feed/rss)
  const estaticos = new Set([ENTREVISTAS, '/rss.xml', '/futbolverdadero-acerca-de/', '/']);
  for (const destino of estaticos) {
    if (
      !rutas.has(destino) &&
      !(destino === '/rss.xml' && existsSync(path.join(DIST, 'rss.xml')))
    ) {
      problemas.push(`destino inexistente en el build: ${destino}`);
    }
  }
  return problemas;
}

// ---- main ----
if (!existsSync(CONFIG_PATH)) {
  console.error('No existe .vercel/output/config.json — ejecuta primero "astro build".');
  process.exit(1);
}

const config = JSON.parse(readFileSync(CONFIG_PATH, 'utf8'));
const idx = config.routes.findIndex((r) => r.handle === 'filesystem');
if (idx === -1) {
  console.error('No se encontró {handle:"filesystem"} en config.json — revisar el adapter.');
  process.exit(1);
}

const mapaWp = await mapaWpShortlinks();
const reglas = construirReglas(mapaWp);
const rutas = rutasGeneradas();
const problemas = verificar(reglas, rutas);

if (problemas.length) {
  console.error(`✖ Guard anti-colisión (${problemas.length}):`);
  for (const p of problemas) console.error(`  - ${p}`);
  process.exit(1);
}

const yaInyectadas = config.routes.some((r) => r.src === '^/category/(?:[^/]+/)*[^/]+/?$');
if (yaInyectadas) {
  console.log('Redirecciones legacy ya presentes en config.json — nada que hacer.');
  process.exit(0);
}

console.log(
  `${reglas.length} reglas legacy generadas (${rutas.size} rutas protegidas por el guard).`,
);
if (DRY_RUN) {
  for (const r of reglas) {
    const cond = r.has ? `  [${r.has.map((h) => `${h.key}=${h.value ?? '*'}`).join(', ')}]` : '';
    console.log(`  ${r.status}  ${r.src}${cond}  →  ${r.dest ?? '(410)'}`);
  }
  console.log('\n--dry-run: config.json NO modificado.');
  process.exit(0);
}

config.routes.splice(idx, 0, ...reglas);
writeFileSync(CONFIG_PATH, JSON.stringify(config, null, '\t'), 'utf8');
console.log(`✓ Inyectadas en ${path.relative(ROOT, CONFIG_PATH)} antes de {handle:"filesystem"}.`);
