import { describe, it, expect } from 'vitest';
import { decodificarEntidades } from '../../scripts/lib/entidades.mjs';

describe('decodificarEntidades (scripts)', () => {
  it('null → null; undefined y vacío → ""', () => {
    expect(decodificarEntidades(null)).toBeNull();
    expect(decodificarEntidades(undefined)).toBe('');
    expect(decodificarEntidades('')).toBe('');
  });

  it('valores no-string pasan tal cual', () => {
    expect(decodificarEntidades(123)).toBe(123);
  });

  it('decode hex / decimal / con nombre / &amp;', () => {
    expect(decodificarEntidades('&#8211;')).toBe('\u2013');
    expect(decodificarEntidades('&#x2013;')).toBe('\u2013');
    expect(decodificarEntidades('&ndash;')).toBe('\u2013');
    expect(decodificarEntidades('&amp;lt;')).toBe('&lt;');
  });

  it('codepoints inválidos → vacío', () => {
    expect(decodificarEntidades('&#0;')).toBe('');
    expect(decodificarEntidades('&#55296;')).toBe('');
  });
});
