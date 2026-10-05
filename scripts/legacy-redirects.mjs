#!/usr/bin/env node
// Inyecta las redirecciones del WordPress legacy en .vercel/output/config.json.
// Se ejecuta tras el build (ver package.json → "build"): Astro ya escribió sus
// propias reglas (p. ej. el slug árabe) y nosotros insertamos las nuestras justo
// antes de {handle:"filesystem"} — en Vercel gana la PRIMERA coincidencia.
// Además se inyecta al principio un 308 del host de producción *.vercel.app al
// dominio canónico (evita contenido duplicado): ver bloque "hostRule" más abajo.
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
import { pathToFileURL } from 'node:url';
import 'dotenv/config';
import { createClient } from '@sanity/client';

const ROOT = process.cwd();
const CONFIG_PATH = path.join(ROOT, '.vercel', 'output', 'config.json');
const DIST = path.join(ROOT, 'dist');
const DRY_RUN = process.argv.includes('--dry-run');

const ENTREVISTAS = '/entrevistas/';

// Dominio canónico y host de producción de Vercel (SEO: evitar contenido duplicado).
const SITE_ORIGIN = 'https://www.elfutbolverdadero.com';
const PROD_VERCEL_HOST_RE = '^elfutbolverdadero\\.vercel\\.app$';

// ---- utilidades ----
// Se exportan las funciones puras/inyectables para poder unit-testearlas
// (ver tests/unit/legacy-redirects.test.ts) sin ejecutar el flujo de escritura.
export const esc = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
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
// `root` fija la base sobre la que se computan las rutas relativas: por defecto
// el propio `dir` (en build es `dist/`), pero se puede pasar un fixture en tests.
export function rutasGeneradas(dir = DIST, acc = new Set(), root = dir) {
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const abs = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      rutasGeneradas(abs, acc, root);
    } else if (entry.name.endsWith('.html')) {
      const rel = path.relative(root, abs).replaceAll('\\', '/');
      const ruta = rel === 'index.html' ? '/' : `/${rel.replace(/index\.html$/, '')}`;
      acc.add(ruta);
      acc.add(ruta === '/' ? '/' : ruta.replace(/\/$/, ''));
    }
  }
  return acc;
}

// ---- mapa de enlaces cortos heredados (?p=<ID> de WP → slug) ----
// Best-effort: si Sanity no responde, se omiten esas reglas sin romper el build.
export async function mapaWpShortlinks() {
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
// `categorias`/`etiquetas` son inyectables: por defecto se leen del `dist/` real
// (comportamiento de build), pero los tests pasan listas explícitas para ser
// deterministas sin necesidad de un árbol de ficheros.
export function construirReglas(
  mapaWp = new Map(),
  { categorias = subdirs('categoria'), etiquetas = subdirs('etiqueta') } = {},
) {
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
  for (const slug of categorias) {
    reglas.push(redirect(`^/category/(?:[^/]+/)*${esc(slug)}/?$`, `/categoria/${slug}/`));
  }

  // Etiquetas WP → /etiqueta/<slug>/, solo si existe
  for (const slug of etiquetas) {
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
  reglas.push(redirect('^/sobre-nosotros/?$', '/futbolverdadero-acerca-de/'));

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
export function verificar(reglas, rutas, { dist = DIST } = {}) {
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
      !(destino === '/rss.xml' && existsSync(path.join(dist, 'rss.xml')))
    ) {
      problemas.push(`destino inexistente en el build: ${destino}`);
    }
  }
  return problemas;
}

// ---- regla 308 del host de producción *.vercel.app al dominio canónico ----
// Va al PRINCIPIO del array: Vercel evalúa las rutas en orden y gana la primera
// coincidencia, así TODA ruta bajo ese host se redirige a www antes que cualquier
// regla legacy. El `has` de host acota el match al dominio exacto, de modo que ni
// los previews (*-git-*.vercel.app) ni www se ven afectados. Se excluye
// /.well-known (ruta reservada por Vercel, no redirigible).
export function construirReglaHost() {
  return {
    src: '^/(?!\\.well-known)(.*)$',
    has: [{ type: 'host', value: PROD_VERCEL_HOST_RE }],
    dest: `${SITE_ORIGIN}/$1`,
    status: 308,
  };
}

// ---- main: orquestación de build (lee/escribe .vercel/output/config.json) ----
// Se excluye de cobertura: es E/S pura (fs + Sanity + process.exit) y se valida
// con A/B del config.json en el build + `npm run redirects:dry`.
/* v8 ignore start */
async function main() {
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

  const hostRule = construirReglaHost();
  const hostYa = config.routes.some(
    (r) => r.has?.[0]?.type === 'host' && r.has[0].value === PROD_VERCEL_HOST_RE,
  );
  const legacyYa = config.routes.some((r) => r.src === '^/category/(?:[^/]+/)*[^/]+/?$');

  console.log(
    `${reglas.length} reglas legacy generadas (${rutas.size} rutas protegidas por el guard).`,
  );

  if (DRY_RUN) {
    if (!hostYa) {
      console.log(`  308  ${hostRule.src}  [host=${PROD_VERCEL_HOST_RE}]  →  ${hostRule.dest}`);
    }
    for (const r of reglas) {
      const cond = r.has ? `  [${r.has.map((h) => `${h.key}=${h.value ?? '*'}`).join(', ')}]` : '';
      console.log(`  ${r.status}  ${r.src}${cond}  →  ${r.dest ?? '(410)'}`);
    }
    console.log('\n--dry-run: config.json NO modificado.');
    return;
  }

  let cambios = false;

  if (!hostYa) {
    config.routes.unshift(hostRule);
    cambios = true;
    console.log(
      '✓ Añadida redirección 308 del host *.vercel.app al dominio canónico (posición 0).',
    );
  }

  if (!legacyYa) {
    const fsIdx = config.routes.findIndex((r) => r.handle === 'filesystem');
    config.routes.splice(fsIdx, 0, ...reglas);
    cambios = true;
    console.log(`✓ Inyectadas ${reglas.length} reglas legacy antes de {handle:"filesystem"}.`);
  } else {
    console.log('Redirecciones legacy ya presentes en config.json — nada que hacer.');
  }

  if (cambios) {
    writeFileSync(CONFIG_PATH, JSON.stringify(config, null, '\t'), 'utf8');
    console.log(`✓ Actualizado ${path.relative(ROOT, CONFIG_PATH)}.`);
  } else {
    console.log('config.json ya al día — sin cambios.');
  }
}

// Solo ejecuta el flujo de build cuando se invoca directamente
// (`node scripts/legacy-redirects.mjs`); al importarlo en tests no hace E/S.
if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  main().catch((e) => {
    console.error(e);
    process.exit(1);
  });
}
/* v8 ignore stop */
