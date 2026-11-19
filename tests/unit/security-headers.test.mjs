import { describe, it, expect } from 'vitest';
import {
  CSP,
  construirCabeceras,
  construirRutaCabeceras,
  yaPresente,
} from '../../scripts/security-headers.mjs';

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

  it('no permite scripts inline ni eval', () => {
    const scriptSrc = CSP.split('; ').find((d) => d.startsWith('script-src'));
    expect(scriptSrc).toBe("script-src 'self' https://cloud.umami.is");
    expect(scriptSrc).not.toContain('unsafe-inline');
    expect(scriptSrc).not.toContain('unsafe-eval');
  });

  it('frame-ancestors none (clickjacking) e iframe de YouTube permitido', () => {
    expect(CSP).toContain("frame-ancestors 'none'");
    expect(CSP).toContain('https://www.youtube.com');
  });

  it('img-src limitado a self y el CDN de Sanity', () => {
    expect(CSP).toContain("img-src 'self' data: https://cdn.sanity.io");
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
