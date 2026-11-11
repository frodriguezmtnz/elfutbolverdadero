import { describe, it, expect } from 'vitest';
import {
  sinBloquesTiempoLectura,
  extraerTexto,
  extractoDeBody,
  tiempoLectura,
  slugDeEtiqueta,
} from '../../src/lib/texto';

const bloque = (text: string) => ({ _type: 'block', children: [{ _type: 'span', text }] });

describe('sinBloquesTiempoLectura', () => {
  it('filtra el bloque de tiempo de lectura y conserva el resto', () => {
    const blocks = [bloque('Tiempo de lectura: 4 minutos'), bloque('Hola'), { _type: 'image' }];
    const out = sinBloquesTiempoLectura(blocks);
    expect(out).toHaveLength(2);
    expect(out).toContainEqual({ _type: 'image' });
  });

  it('null / undefined → []', () => {
    expect(sinBloquesTiempoLectura(null)).toEqual([]);
    expect(sinBloquesTiempoLectura(undefined)).toEqual([]);
  });
});

describe('extraerTexto', () => {
  it('une los hijos y colapsa espacios', () => {
    expect(extraerTexto([bloque('a b'), bloque('c')])).toBe('a b c');
  });

  it('null → cadena vacía', () => {
    expect(extraerTexto(null)).toBe('');
  });
});

describe('extractoDeBody', () => {
  it('devuelve el texto cuando cabe en el máximo', () => {
    expect(extractoDeBody([bloque('Somos equipo, somos familia.')])).toBe(
      'Somos equipo, somos familia.',
    );
  });

  it('ignora títulos, imágenes y el bloque de tiempo de lectura', () => {
    const blocks = [
      { _type: 'block', style: 'h2', children: [{ _type: 'span', text: 'Un título' }] },
      { _type: 'image' },
      bloque('Tiempo de lectura: 4 minutos'),
      bloque('Primer párrafo real.'),
    ];
    expect(extractoDeBody(blocks)).toBe('Primer párrafo real.');
  });

  it('une párrafos y recorta en límite de palabra con elipsis', () => {
    const blocks = [bloque('palabra '.repeat(40).trim())];
    const out = extractoDeBody(blocks, 30)!;
    expect(out.endsWith('…')).toBe(true);
    expect(out.length).toBeLessThanOrEqual(31);
    expect(out).not.toContain('palabrapalabra');
  });

  it('sin párrafos con texto → undefined', () => {
    expect(extractoDeBody(null)).toBeUndefined();
    expect(extractoDeBody([])).toBeUndefined();
    expect(extractoDeBody([bloque('   ')])).toBeUndefined();
  });
});

describe('tiempoLectura', () => {
  it('calcula minutos (mínimo 1) a partir del texto', () => {
    expect(tiempoLectura([bloque('hola mundo')])).toBe('1 min de lectura');
  });

  it('fallback numérico', () => {
    expect(tiempoLectura([], '42')).toBe('42 min de lectura');
  });

  it('fallback de texto libre', () => {
    expect(tiempoLectura([], 'Casi 3 min')).toBe('Casi 3 min');
  });

  it('sin texto ni fallback → null', () => {
    expect(tiempoLectura([])).toBeNull();
    expect(tiempoLectura(null, '   ')).toBeNull();
  });
});

describe('slugDeEtiqueta', () => {
  it('devuelve el slug si ya existe', () => {
    expect(slugDeEtiqueta('Fútbol', 'custom')).toBe('custom');
  });

  it('slugifica quitando acentos', () => {
    expect(slugDeEtiqueta('Fútbol Base')).toBe('futbol-base');
  });

  it('recorta guiones en los extremos', () => {
    expect(slugDeEtiqueta('  Hola Mundo!! ')).toBe('hola-mundo');
  });

  it('sin caracteres alfanuméricos → vacío', () => {
    expect(slugDeEtiqueta('---')).toBe('');
  });
});
