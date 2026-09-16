#!/usr/bin/env node
// Exporta el histórico de WordPress.com → Stats (Jetpack) ANTES de jubilar el WP,
// vía la API pública REST v1.1 (misma que usa el panel de Stats).
// Umami no admite importar eventos con fecha retroactiva: este volcado es la
// línea base con la que comparar las visitas post-corte.
//
// Auth (una de las dos, en .env):
//   WP_STATS_TOKEN  token OAuth de app en developer.wordpress.com (scope admin.scope.stats)
//   WP_COOKIE       cookie de sesión del navegador logueado en wordpress.com (F12 → Network → Cookie)
//
// Uso:
//   node scripts/export-wp-stats.mjs                  # 2019 → hoy
//   node scripts/export-wp-stats.mjs --from=2022
//   node scripts/export-wp-stats.mjs --out=docs/baseline-wp-stats
import 'dotenv/config';
import { mkdirSync, writeFileSync } from 'node:fs';
import path from 'node:path';

// ---- CLI ----
const args = process.argv.slice(2);
const flag = (name, def) => {
  const hit = args.find((a) => a.startsWith(`--${name}=`));
  return hit ? hit.split('=').slice(1).join('=') : def;
};

const SITE = flag('site', process.env.WP_STATS_SITE || 'elfutbolverdadero.com');
const FROM = parseInt(flag('from', '2019'), 10);
const OUT = path.resolve(flag('out', 'docs/baseline-wp-stats'));
const TOKEN = process.env.WP_STATS_TOKEN?.trim() || '';
const COOKIE = process.env.WP_COOKIE?.trim() || '';
const SLEEP_MS = 2500; // límite de cortesía de WordPress.com (~24 req/min)

if (!TOKEN && !COOKIE) {
  console.error(
    'Falta autenticación: define WP_STATS_TOKEN (Bearer OAuth) o WP_COOKIE (sesión de navegador) en .env',
  );
  process.exit(1);
}

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function api(endpoint) {
  const url = `https://public-api.wordpress.com/rest/v1.1/sites/${encodeURIComponent(SITE)}${endpoint}`;
  const headers = { Accept: 'application/json' };
  if (TOKEN) headers.Authorization = `Bearer ${TOKEN}`;
  else headers.Cookie = COOKIE;

  for (let attempt = 1; attempt <= 3; attempt++) {
    const res = await fetch(url, { headers });
    if (res.status === 401 || res.status === 403) {
      throw new Error(
        `${res.status} en ${endpoint}: credencial sin acceso a Stats del sitio. ` +
          'Con token → scope admin.scope.stats; con cookie → navegador logueado con rol Viewer+.',
      );
    }
    if (res.status === 404)
      throw new Error(`404 en ${endpoint}: ¿es el dominio correcto (${SITE})?`);
    if (res.status === 429 || res.status >= 500) {
      const wait = SLEEP_MS * attempt * 2;
      console.warn(`  ${res.status} en ${endpoint} → reintento en ${wait / 1000}s`);
      await sleep(wait);
      continue;
    }
    if (!res.ok) throw new Error(`HTTP ${res.status} en ${endpoint}`);
    return res.json();
  }
  throw new Error(`Agotados los reintentos en ${endpoint}`);
}

const csvCell = (v) => {
  const s = String(v ?? '');
  return /[",\r\n]/.test(s) ? `"${s.replaceAll('"', '""')}"` : s;
};
const toCsv = (rows) => rows.map((r) => r.map(csvCell).join(',')).join('\r\n');

function save(name, data) {
  writeFileSync(path.join(OUT, name), JSON.stringify(data, null, 2), 'utf8');
  console.log(`  ✓ ${name}`);
}

function saveCsv(name, rows) {
  writeFileSync(path.join(OUT, name), toCsv(rows), 'utf8');
  console.log(`  ✓ ${name}`);
}

// ---- serie mensual (vistas + visitantes por mes, del FROM a hoy) ----
async function exportMonthly(years) {
  const merged = { dates: {}, views: {}, visitors: {} };
  for (const y of years) {
    console.log(`Serie de meses de ${y}…`);
    const json = await api(`/stats/month?date=${y}-12-31&max=12`);
    for (const key of Object.keys(json.dates ?? {})) {
      merged.dates[key] = true;
      merged.views[key] = json.views?.[key] ?? 0;
      merged.visitors[key] = json.visitors?.[key] ?? 0;
    }
    await sleep(SLEEP_MS);
  }
  save('stats-mensual.json', merged);
  const keys = Object.keys(merged.dates).sort();
  saveCsv('stats-mensual.csv', [
    ['mes', 'vistas', 'visitantes'],
    ...keys.map((k) => [k, merged.views[k], merged.visitors[k]]),
  ]);
  const total = keys.reduce((acc, k) => acc + (merged.views[k] || 0), 0);
  console.log(`  total vistas en la serie: ${total.toLocaleString('es-ES')}`);
}

// ---- top de entradas por año (vistas acumuladas del año natural) ----
async function exportTopPosts(years) {
  const all = [];
  for (const y of years) {
    console.log(`Top entradas de ${y}…`);
    const json = await api(`/stats/top-posts?period=year&date=${y}-12-31&max=25`);
    const posts = (json.data ?? []).filter((p) => p.type === 'post' || p.type === 'page');
    posts.forEach((p) => all.push({ year: y, ...p }));
    save(`top-posts-${y}.json`, json);
    await sleep(SLEEP_MS);
  }
  saveCsv('top-posts.csv', [
    ['anio', 'vistas', 'titulo', 'url', 'tipo'],
    ...all.map((p) => [p.year, p.views, p.name, p.href, p.type]),
  ]);
}

// ---- snapshot de origen de tráfico y países (año en curso) ----
async function exportSources(today) {
  console.log('Referrers y países (año en curso)…');
  const referrers = await api(`/stats/referrers?period=year&date=${today}&max=100`);
  save('referrers.json', referrers);
  const rows = (referrers.data ?? []).map((r) => [r.name, r.views]);
  if (rows.length) saveCsv('referrers.csv', [['referrer', 'vistas'], ...rows]);
  await sleep(SLEEP_MS);
  const countries = await api(`/stats/country-views?period=year&date=${today}`);
  save('paises.json', countries);
}

// ---- ejecución ----
const now = new Date();
const currentYear = now.getFullYear();
const today = now.toISOString().slice(0, 10);
const years = Array.from({ length: currentYear - FROM + 1 }, (_, i) => FROM + i);
mkdirSync(OUT, { recursive: true });

console.log(`Exportando Stats de ${SITE} (${FROM}→${currentYear}) → ${OUT}\n`);

console.log('Resumen general…');
save('stats-v1.json', await api('/stats/v1'));
await sleep(SLEEP_MS);
console.log('Totales por año…');
save('stats-years.json', await api('/stats/years'));
await sleep(SLEEP_MS);

await exportMonthly(years);
await exportTopPosts(years);
await exportSources(today);

console.log('\nListo. Guarda esta carpeta (o commitea los CSV) antes de apagar WordPress.');
