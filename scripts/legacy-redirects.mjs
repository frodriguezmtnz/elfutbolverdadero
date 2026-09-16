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
//
// Uso:
//   npm run build                    → astro build && node scripts/legacy-redirects.mjs
//   node scripts/legacy-redirects.mjs --dry-run   → imprime reglas + guard sin escribir
import { readFileSync, writeFileSync, readdirSync, existsSync, statSync } from 'node:fs';
import path from 'node:path';

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

// ---- reglas ----
function construirReglas() {
  const reglas = [];

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
  for (const { src, dest } of reglas) {
    if (!dest) continue;
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

const reglas = construirReglas();
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
    console.log(`  ${r.status}  ${r.src}  →  ${r.dest ?? '(410)'}`);
  }
  console.log('\n--dry-run: config.json NO modificado.');
  process.exit(0);
}

config.routes.splice(idx, 0, ...reglas);
writeFileSync(CONFIG_PATH, JSON.stringify(config, null, '\t'), 'utf8');
console.log(`✓ Inyectadas en ${path.relative(ROOT, CONFIG_PATH)} antes de {handle:"filesystem"}.`);
