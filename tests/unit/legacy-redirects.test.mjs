import { describe, it, expect, vi } from 'vitest';
import { mkdtempSync, writeFileSync, mkdirSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import {
  esc,
  construirReglas,
  verificar,
  rutasGeneradas,
  mapaWpShortlinks,
  construirReglaHost,
} from '../../scripts/legacy-redirects.mjs';

vi.mock('@sanity/client', () => ({
  createClient: vi.fn(() => ({
    fetch: vi.fn(async () => [{ _id: 'publicacion-wp-55', slug: 'mi-post' }]),
  })),
}));

const RUTAS_OK = new Set(['/entrevistas/', '/rss.xml', '/futbolverdadero-acerca-de/', '/']);
const findRule = (reglas, pred) => reglas.find(pred);

describe('esc', () => {
  it('escapa caracteres reservados de regex', () => {
    expect(esc('a.b*c')).toBe('a\\.b\\*c');
  });
});

describe('construirReglas', () => {
  const reglas = construirReglas(new Map([['55', 'mi-post']]), {
    categorias: ['entrenadores'],
    etiquetas: ['futbol-base'],
  });

  it('mapea /?p=<id> al slug actual', () => {
    expect(
      findRule(reglas, (r) => r.has?.[0]?.key === 'p' && r.has[0].value === '^55$'),
    ).toMatchObject({ dest: '/mi-post/', status: 301 });
  });

  it('redirige /?s=<termino> al buscador', () => {
    expect(findRule(reglas, (r) => r.has?.[0]?.key === 's')).toMatchObject({ dest: '/buscar/' });
  });

  it('genera category/tag solo para slugs existentes', () => {
    expect(findRule(reglas, (r) => r.src === '^/category/(?:[^/]+/)*entrenadores/?$')?.dest).toBe(
      '/categoria/entrenadores/',
    );
    expect(findRule(reglas, (r) => r.src === '^/tag/futbol-base/?$')?.dest).toBe(
      '/etiqueta/futbol-base/',
    );
  });

  it('reglas de paginación, fechas y autor legacy', () => {
    expect(findRule(reglas, (r) => r.src === '^/page/\\d+/?$')?.dest).toBe('/entrevistas/');
    expect(findRule(reglas, (r) => r.src === '^/author/.+/?$')?.dest).toBe('/entrevistas/');
    expect(findRule(reglas, (r) => r.src === '^/author/[^/]+/feed/?$')?.dest).toBe('/rss.xml');
  });

  it('páginas fundidas y basura de WP', () => {
    expect(findRule(reglas, (r) => r.src === '^/sobre-nosotros/?$')?.dest).toBe(
      '/futbolverdadero-acerca-de/',
    );
    expect(findRule(reglas, (r) => r.src === '^/home/?$')?.dest).toBe('/');
  });

  it('comments/feed devuelve 410 (sin destino)', () => {
    expect(findRule(reglas, (r) => r.src === '^/comments/feed/?$')).toMatchObject({ status: 410 });
  });

  it('NO genera category/tag para slugs inexistentes', () => {
    const r = construirReglas(new Map(), { categorias: [], etiquetas: [] });
    expect(findRule(r, (x) => x.src === '^/category/(?:[^/]+/)*entrenadores/?$')).toBeUndefined();
  });
});

describe('construirReglaHost', () => {
  it('308 al dominio canónico limitado por has.host', () => {
    const h = construirReglaHost();
    expect(h.status).toBe(308);
    expect(h.dest).toBe('https://www.elfutbolverdadero.com/$1');
    expect(h.has[0]).toEqual({ type: 'host', value: '^elfutbolverdadero\\.vercel\\.app$' });
  });
});

describe('verificar', () => {
  const vacio = mkdtempSync(join(tmpdir(), 'guard-'));

  it('detecta colisión entre un src y una ruta generada', () => {
    const reglas = [{ src: '^/hola/?$', dest: '/x/', status: 301 }];
    const rutas = new Set([...RUTAS_OK, '/hola']);
    expect(verificar(reglas, rutas, { dist: vacio })).toEqual([expect.stringContaining('/hola')]);
  });

  it('ignora reglas con has (query/host)', () => {
    const reglas = [
      { src: '/', has: [{ type: 'query', key: 'p', value: '^1$' }], dest: '/y/', status: 301 },
    ];
    expect(verificar(reglas, RUTAS_OK, { dist: vacio })).toEqual([]);
  });

  it('reporta destino estático ausente', () => {
    expect(verificar([], new Set(), { dist: vacio }).join('\n')).toContain('destino inexistente');
  });

  it('sin problemas cuando los destinos estáticos existen', () => {
    expect(verificar([], RUTAS_OK, { dist: vacio })).toEqual([]);
  });
});

describe('rutasGeneradas', () => {
  it('recorre un árbol de fixture y devuelve rutas con y sin slash final', () => {
    const root = mkdtempSync(join(tmpdir(), 'dist-'));
    mkdirSync(join(root, 'categoria', 'foo'), { recursive: true });
    writeFileSync(join(root, 'index.html'), '');
    writeFileSync(join(root, 'categoria', 'foo', 'index.html'), '');
    writeFileSync(join(root, 'notas.html'), '');
    const rutas = rutasGeneradas(root, new Set(), root);
    expect(rutas.has('/')).toBe(true);
    expect(rutas.has('/categoria/foo/')).toBe(true);
    expect(rutas.has('/categoria/foo')).toBe(true);
    expect(rutas.has('/notas.html')).toBe(true);
  });
});

describe('mapaWpShortlinks', () => {
  it('devuelve Map vacío si no hay SANITY_PROJECT_ID', async () => {
    vi.stubEnv('SANITY_PROJECT_ID', '');
    expect((await mapaWpShortlinks()).size).toBe(0);
    vi.unstubAllEnvs();
  });

  it('construye el mapa id → slug', async () => {
    vi.stubEnv('SANITY_PROJECT_ID', 'p1');
    const mapa = await mapaWpShortlinks();
    expect(mapa.get('55')).toBe('mi-post');
    vi.unstubAllEnvs();
  });
});
