import { describe, it, expect } from 'vitest';
import { limpiarDescripcion, decodificarEntidades } from '../../src/lib/limpieza';

describe('limpiarDescripcion', () => {
  it('null / vacío / solo espacios → undefined', () => {
    expect(limpiarDescripcion(null)).toBeUndefined();
    expect(limpiarDescripcion('')).toBeUndefined();
    expect(limpiarDescripcion('   ')).toBeUndefined();
  });

  it('elimina el prefijo legado de tiempo de lectura (aunque se repita)', () => {
    const s = 'Tiempo de lectura: 3 minutos. Tiempo de lectura: 5 minutos. contenido';
    expect(limpiarDescripcion(s)).toBe('contenido');
  });

  it('elimina la elipsis entre corchetes y decodifica entidades', () => {
    expect(limpiarDescripcion('Hola [&hellip;]')).toBe('Hola');
    expect(limpiarDescripcion('Fin […]')).toBe('Fin');
  });

  it('colapsa espacios múltiples', () => {
    expect(limpiarDescripcion('a    b')).toBe('a b');
  });

  it('reexporta decodificarEntidades', () => {
    expect(decodificarEntidades('&ndash;')).toBe('\u2013');
  });
});
