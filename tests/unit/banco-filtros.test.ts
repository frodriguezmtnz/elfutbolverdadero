import { describe, it, expect } from 'vitest';
import {
  parseFiltros,
  cumpleFiltros,
  aplicarFiltros,
  urlConFiltro,
  facetsCatalogo,
  normalizarTexto,
  contarFiltros,
  tieneFiltros,
  type ItemCatalogo,
  type FiltrosBanco,
} from '../../src/lib/banco-filtros';

const sinFiltros: FiltrosBanco = {
  q: null,
  cat: null,
  obj: null,
  tipo: null,
  edad: null,
  espacio: null,
  jug: null,
  dur: null,
};

const presion: ItemCatalogo = {
  acceso: 'premium',
  slug: 'presion-tras-perdida',
  title: 'Presión tras pérdida 6v6',
  resumen: 'Reaccionar rápido al perder el balón',
  duracionMin: 12,
  jugadoresMin: 12,
  jugadoresMax: 14,
  espacio: 'reducido',
  tipoTarea: 'tactica',
  categoriasEdad: ['cadete', 'juvenil'],
  categorias: [{ name: 'Transiciones', slug: 'transiciones' }],
  objetivos: [{ name: 'Presión tras pérdida', slug: 'presion' }],
};

const posesion: ItemCatalogo = {
  ...presion,
  slug: 'posesion-4v4',
  title: 'Posesión y conducción',
  resumen: null,
  duracionMin: 40,
  jugadoresMin: 8,
  jugadoresMax: null,
  espacio: 'medio',
  tipoTarea: 'tecnica',
  categoriasEdad: ['alevin'],
  categorias: [{ name: 'Conservación', slug: 'conservacion' }],
  objetivos: [{ name: 'Superioridad', slug: 'superioridad' }],
};

describe('parseFiltros', () => {
  it('admite claves conocidas', () => {
    const f = parseFiltros(new URLSearchParams('q=Presión&cat=transiciones&dur=corta'));
    expect(f.q).toBe('Presión');
    expect(f.cat).toBe('transiciones');
    expect(f.dur).toBe('corta');
    expect(f.jug).toBeNull();
  });

  it('rechaza valores de rango desconocidos y claves basura', () => {
    const f = parseFiltros(new URLSearchParams('jug=100&dur=nope&_proto=1'));
    expect(f.jug).toBeNull();
    expect(f.dur).toBeNull();
    expect(JSON.stringify(f)).not.toContain('_proto');
  });

  it('ignora vacíos y recorta largos', () => {
    const f = parseFiltros(new URLSearchParams('q=   &cat=' + 'a'.repeat(200)));
    expect(f.q).toBeNull();
    expect(f.cat!.length).toBeLessThanOrEqual(80);
  });
});

describe('cumpleFiltros', () => {
  it('q normaliza acentos y mayúsculas en título y resumen', () => {
    expect(cumpleFiltros(presion, { ...sinFiltros, q: 'tras perdida' })).toBe(true);
    expect(cumpleFiltros(presion, { ...sinFiltros, q: 'reaccionar' })).toBe(true);
    expect(cumpleFiltros(presion, { ...sinFiltros, q: 'balon' })).toBe(true);
    expect(cumpleFiltros(posesion, { ...sinFiltros, q: 'presión' })).toBe(false);
  });

  it('filtra por slug de categoría y objetivo', () => {
    expect(cumpleFiltros(presion, { ...sinFiltros, cat: 'transiciones' })).toBe(true);
    expect(cumpleFiltros(presion, { ...sinFiltros, cat: 'conservacion' })).toBe(false);
    expect(cumpleFiltros(presion, { ...sinFiltros, obj: 'presion' })).toBe(true);
  });

  it('intersección de jugadores con rangos', () => {
    // 12–14 → no entra en reducido (1–6) ni medio (7–12)? medio llega hasta 12 → sí
    expect(cumpleFiltros(presion, { ...sinFiltros, jug: 'medio' })).toBe(true);
    expect(cumpleFiltros(presion, { ...sinFiltros, jug: 'amplio' })).toBe(true);
    expect(cumpleFiltros(presion, { ...sinFiltros, jug: 'reducido' })).toBe(false);
  });

  it('usa max como fallback cuando min es null', () => {
    // 8–null → rMin por defecto = max (8) → medio[7,12] sí, amplio[13,..] no
    expect(cumpleFiltros(posesion, { ...sinFiltros, jug: 'medio' })).toBe(true);
    expect(cumpleFiltros(posesion, { ...sinFiltros, jug: 'amplio' })).toBe(false);
  });

  it('duración sin dato excluye al filtrar', () => {
    expect(cumpleFiltros(presion, { ...sinFiltros, dur: 'corta' })).toBe(true);
    expect(cumpleFiltros(posesion, { ...sinFiltros, dur: 'corta' })).toBe(false);
    expect(cumpleFiltros(posesion, { ...sinFiltros, dur: 'larga' })).toBe(true);
  });

  it('edad, espacio y tipo exactos', () => {
    expect(cumpleFiltros(presion, { ...sinFiltros, edad: 'cadete' })).toBe(true);
    expect(cumpleFiltros(presion, { ...sinFiltros, edad: 'alevin' })).toBe(false);
    expect(cumpleFiltros(presion, { ...sinFiltros, espacio: 'reducido' })).toBe(true);
    expect(cumpleFiltros(presion, { ...sinFiltros, tipo: 'tecnica' })).toBe(false);
  });
});

describe('aplicarFiltros', () => {
  it('sin filtros devuelve copia del catálogo', () => {
    const catalogo = [presion, posesion];
    const out = aplicarFiltros(catalogo, sinFiltros);
    expect(out).toEqual(catalogo);
    expect(out).not.toBe(catalogo);
  });

  it('combina filtros con AND', () => {
    const out = aplicarFiltros([presion, posesion], {
      ...sinFiltros,
      cat: 'transiciones',
      dur: 'larga',
    });
    expect(out).toHaveLength(0);
  });
});

describe('urlConFiltro', () => {
  const base = '/entrenadores/ejercicios/';

  it('añade y quita filtros conservando los demás', () => {
    const conQ = urlConFiltro(base, sinFiltros, { q: 'presión' });
    expect(conQ).toBe(`${base}?q=presi%C3%B3n`);
    const mixto = urlConFiltro(base, { ...sinFiltros, q: 'x' }, { cat: 'transiciones' });
    expect(mixto).toContain('q=x');
    expect(mixto).toContain('cat=transiciones');
    const sinCat = urlConFiltro(base, parseFiltros(new URLSearchParams(mixto.split('?')[1])), {
      cat: null,
    });
    expect(sinCat).toBe(`${base}?q=x`);
  });

  it('vacío total → URL limpia', () => {
    expect(urlConFiltro(base, { ...sinFiltros, dur: 'corta' }, { dur: null })).toBe(base);
  });
});

describe('facetsCatalogo', () => {
  it('deduplica y ordena es-ES', () => {
    const f = facetsCatalogo([presion, posesion]);
    expect(f.categorias.map((c) => c[1])).toEqual(['Conservación', 'Transiciones']);
    expect(f.objetivos.length).toBe(2);
  });
});

describe('normalizarTexto', () => {
  it('quita acentos y espacios sobrantes', () => {
    expect(normalizarTexto('  Fútbol  Base ')).toBe('futbol  base');
    expect(normalizarTexto(null)).toBe('');
  });
});

describe('utilidades de estado', () => {
  it('contarFiltros y tieneFiltros', () => {
    expect(contarFiltros(sinFiltros)).toBe(0);
    expect(tieneFiltros(sinFiltros)).toBe(false);
    expect(contarFiltros({ ...sinFiltros, q: 'x', jug: 'medio' })).toBe(2);
    expect(tieneFiltros({ ...sinFiltros, q: 'x' })).toBe(true);
  });
});
