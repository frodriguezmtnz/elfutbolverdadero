import { describe, it, expect } from 'vitest';
import { colorCategoria, estiloChipCategoria } from '../../src/lib/colores-categoria';

describe('colorCategoria', () => {
  it('usa el mapa curado normalizando mayúsculas y acentos', () => {
    expect(colorCategoria('Entrevistas')).toEqual({ bg: '#ffc107', fg: '#1a1a1a' });
    expect(colorCategoria('Fútbol Femenino')).toEqual({ bg: '#f6d7e8', fg: '#1a1a1a' });
  });

  it('null / vacío → null', () => {
    expect(colorCategoria(null)).toBeNull();
    expect(colorCategoria('')).toBeNull();
    expect(colorCategoria('   ')).toBeNull();
  });

  it('categoría desconocida → color por hash, determinista', () => {
    const a = colorCategoria('Inexistente XYZ');
    const b = colorCategoria('Inexistente XYZ');
    expect(a).not.toBeNull();
    expect(a).toEqual(b);
    expect(a!.bg).toMatch(/^hsl\(\d+ 60% 87%\)$/);
    expect(a!.fg).toBe('#1a1a1a');
  });
});

describe('estiloChipCategoria', () => {
  it('mapea a propiedades CSS', () => {
    expect(estiloChipCategoria('Entrevistas')).toEqual({
      'background-color': '#ffc107',
      color: '#1a1a1a',
    });
  });

  it('sin color → undefined', () => {
    expect(estiloChipCategoria(null)).toBeUndefined();
  });
});
