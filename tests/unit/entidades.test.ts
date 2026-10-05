import { describe, it, expect } from 'vitest';
import { decodificarEntidades } from '../../src/lib/entidades';

describe('decodificarEntidades (src)', () => {
  it('vacío / null / undefined → string vacío', () => {
    expect(decodificarEntidades('')).toBe('');
    expect(decodificarEntidades(null)).toBe('');
    expect(decodificarEntidades(undefined)).toBe('');
  });

  it('entidades numéricas decimales y hexadecimales', () => {
    expect(decodificarEntidades('&#8211;')).toBe('\u2013');
    expect(decodificarEntidades('&#x2013;')).toBe('\u2013');
    expect(decodificarEntidades('&#128512;')).toBe('😀');
  });

  it('entidades con nombre', () => {
    expect(decodificarEntidades('a &ndash; b')).toBe('a \u2013 b');
    expect(decodificarEntidades('&hellip;')).toBe('\u2026');
    expect(decodificarEntidades('&nbsp;')).toBe(' ');
    expect(decodificarEntidades('&lt;x&gt;')).toBe('<x>');
    expect(decodificarEntidades('&shy;')).toBe('');
  });

  it('&amp; se resuelve al final, una sola pasada', () => {
    expect(decodificarEntidades('A &amp; B')).toBe('A & B');
    expect(decodificarEntidades('&amp;lt;')).toBe('&lt;');
  });

  it('rechaza codepoints inválidos y surrogate sueltos', () => {
    expect(decodificarEntidades('&#0;')).toBe('');
    expect(decodificarEntidades('&#55296;')).toBe('');
  });
});
