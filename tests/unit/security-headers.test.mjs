import { describe, it, expect } from 'vitest';
import { mkdtempSync, writeFileSync, mkdirSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import crypto from 'node:crypto';
import {
  CSP,
  SCRIPTS_INLINE_PERMITIDOS,
  construirCabeceras,
  construirRutaCabeceras,
  yaPresente,
  extraerHashesInline,
  verificarHashesInline,
} from '../../scripts/security-headers.mjs';

const sha256 = (s) => 'sha256-' + crypto.createHash('sha256').update(s).digest('base64');

describe('construirCabeceras', () => {
  const headers = construirCabeceras();

  it('incluye las seis cabeceras OWASP básicas', () => {
    expect(Object.keys(headers).sort()).toEqual(
      [
        'Content-Security-Policy',
        'Permissions-Policy',
        'Referrer-Policy',
        'Strict-Transport-Security',
        'X-Content-Type-Options',
        'X-Frame-Options',
      ].sort(),
    );
  });

  it('HSTS con preload e includeSubDomains', () => {
    expect(headers['Strict-Transport-Security']).toContain('includeSubDomains');
    expect(headers['Strict-Transport-Security']).toContain('preload');
  });

  it('X-Frame-Options DENY y nosniff', () => {
    expect(headers['X-Frame-Options']).toBe('DENY');
    expect(headers['X-Content-Type-Options']).toBe('nosniff');
  });
});

describe('CSP', () => {
  it('bloquea object-src, base-uri y form-action fuera de self', () => {
    expect(CSP).toContain("object-src 'none'");
    expect(CSP).toContain("base-uri 'self'");
    expect(CSP).toContain("form-action 'self'");
  });

  it('script-src contiene los 4 hashes inline y ni unsafe-inline ni eval', () => {
    const scriptSrc = CSP.split('; ').find((d) => d.startsWith('script-src'));
    for (const hash of SCRIPTS_INLINE_PERMITIDOS) {
      expect(scriptSrc).toContain(hash);
    }
    expect(scriptSrc).not.toContain('unsafe-inline');
    expect(scriptSrc).not.toContain('unsafe-eval');
  });

  it('los hashes inline van entrecomillados (gramática CSP)', () => {
    const scriptSrc = CSP.split('; ').find((d) => d.startsWith('script-src'));
    for (const hash of SCRIPTS_INLINE_PERMITIDOS) {
      expect(scriptSrc).toContain(`'${hash}'`);
    }
  });

  it('no queda ningún token sha256- sin comillas en la CSP', () => {
    expect(CSP.match(/(?<!')sha256-[A-Za-z0-9+/]{43}=/g) ?? []).toEqual([]);
  });

  it('frame-ancestors none (clickjacking) e iframe de YouTube permitido', () => {
    expect(CSP).toContain("frame-ancestors 'none'");
    expect(CSP).toContain('https://www.youtube.com');
  });

  it('img-src limitado a self y el CDN de Sanity', () => {
    expect(CSP).toContain("img-src 'self' data: https://cdn.sanity.io");
  });

  it('toolbar de preview de Vercel permitida (solo se carga en previews)', () => {
    const scriptSrc = CSP.split('; ').find((d) => d.startsWith('script-src'));
    expect(scriptSrc).toContain('https://vercel.live');
    expect(CSP).toContain('connect-src');
  });

  it('connect-src permite el script y el gateway de Umami Cloud', () => {
    const connectSrc = CSP.split('; ').find((d) => d.startsWith('connect-src'));
    expect(connectSrc).toContain('https://cloud.umami.is');
    expect(connectSrc).toContain('https://gateway.umami.is');
  });
});

describe('construirRutaCabeceras', () => {
  it('es una ruta pass-through con continue que casa con todo', () => {
    const ruta = construirRutaCabeceras();
    expect(ruta.src).toBe('/(.*)');
    expect(ruta.continue).toBe(true);
    expect(ruta.headers['Content-Security-Policy']).toBe(CSP);
  });

  it('no interfiere con redirecciones (sin dest ni status)', () => {
    const ruta = construirRutaCabeceras();
    expect(ruta.dest).toBeUndefined();
    expect(ruta.status).toBeUndefined();
  });
});

describe('yaPresente', () => {
  it('detecta la ruta inyectada por su marcador', () => {
    expect(yaPresente([construirRutaCabeceras()])).toBe(true);
  });

  it('no confunde la ruta con las de cache-control del adapter', () => {
    const routesAdapter = [
      { src: '^/_astro(?:/(.*))$', headers: { 'cache-control': 'immutable' }, continue: true },
      { handle: 'filesystem' },
    ];
    expect(yaPresente(routesAdapter)).toBe(false);
  });
});

describe('extraerHashesInline', () => {
  it('hashea los scripts inline ejecutables', () => {
    const cuerpo = 'console.log("hola")';
    const html = `<html><body><script>${cuerpo}</script></body></html>`;
    expect(extraerHashesInline(html)).toEqual(new Set([sha256(cuerpo)]));
  });

  it('ignora scripts con src y data blocks ld+json', () => {
    const html = [
      '<script src="/_astro/app.js"></script>',
      '<script type="application/ld+json">{"a":1}</script>',
      '<script>var x = 1;</script>',
    ].join('');
    expect(extraerHashesInline(html)).toEqual(new Set([sha256('var x = 1;')]));
  });
});

describe('verificarHashesInline', () => {
  // directorio fresco por test: verificarHashesInline recorre TODO el
  // directorio, así que los ficheros de un test no deben contaminar el
  // siguiente.
  const dirFresco = () => mkdtempSync(join(tmpdir(), 'csp-guard-'));

  it('devuelve vacío cuando todos los hashes están permitidos', () => {
    const dir = dirFresco();
    const cuerpo = 'console.log("conocido")';
    const permitidos = [sha256(cuerpo)];
    writeFileSync(join(dir, 'index.html'), `<script>${cuerpo}</script>`);
    expect(verificarHashesInline(dir, permitidos)).toEqual([]);
  });

  it('reporta un script inline desconocido con su archivo de ejemplo', () => {
    const dir = dirFresco();
    const cuerpo = 'alert("nuevo-script-del-build")';
    mkdirSync(join(dir, 'sub'), { recursive: true });
    writeFileSync(join(dir, 'sub', 'pagina.html'), `<script>${cuerpo}</script>`);
    const resultado = verificarHashesInline(dir, []);
    expect(resultado).toHaveLength(1);
    expect(resultado[0].hash).toBe(sha256(cuerpo));
    expect(resultado[0].archivo).toContain('pagina.html');
  });

  it('no reporta duplicados aunque el script aparezca en muchas páginas', () => {
    const dir = dirFresco();
    const cuerpo = 'alert("repetido")';
    const permitidos = [sha256(cuerpo)];
    for (const p of ['a.html', 'b.html', 'c.html']) {
      writeFileSync(join(dir, p), `<script>${cuerpo}</script>`);
    }
    expect(verificarHashesInline(dir, permitidos)).toEqual([]);
  });

  it('los 4 hashes de SCRIPTS_INLINE_PERMITIDOS tienen formato CSP válido', () => {
    for (const hash of SCRIPTS_INLINE_PERMITIDOS) {
      expect(hash).toMatch(/^sha256-[A-Za-z0-9+/]{43}=$/);
    }
  });
});
