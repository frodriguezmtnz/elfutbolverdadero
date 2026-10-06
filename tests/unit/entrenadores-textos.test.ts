import { describe, it, expect } from 'vitest';
import {
  etiquetaJugadores,
  etiquetaDuracion,
  etiquetaEspacio,
  ETIQUETAS_CATEGORIA_EDAD,
} from '../../src/lib/entrenadores-textos';

describe('etiquetaJugadores', () => {
  it('rango min–max', () => {
    expect(etiquetaJugadores(8, 12)).toBe('8–12 jugadores');
  });

  it('igual en min y max → valor único', () => {
    expect(etiquetaJugadores(10, 10)).toBe('10 jugadores');
  });

  it('un solo valor → «N+ jugadores»', () => {
    expect(etiquetaJugadores(6, null)).toBe('6+ jugadores');
    expect(etiquetaJugadores(null, 8)).toBe('8+ jugadores');
  });

  it('sin datos → null', () => {
    expect(etiquetaJugadores(null, null)).toBeNull();
    expect(etiquetaJugadores(undefined, undefined)).toBeNull();
  });
});

describe('etiquetaDuracion', () => {
  it('formatea minutos', () => {
    expect(etiquetaDuracion(20)).toBe('20 min');
  });

  it('sin dato → null', () => {
    expect(etiquetaDuracion(null)).toBeNull();
  });
});

describe('etiquetaEspacio', () => {
  it('traduce la enum y combina con medidas', () => {
    expect(etiquetaEspacio('reducido', '30x20 m')).toBe('Reducido (4v4–6v6) · 30x20 m');
    expect(etiquetaEspacio('medio')).toBe('Medio (8v8 aprox.)');
  });

  it('valor desconocido pasa tal cual', () => {
    expect(etiquetaEspacio('patio')).toBe('patio');
  });

  it('solo medidas', () => {
    expect(etiquetaEspacio(null, 'media cancha')).toBe('media cancha');
  });

  it('sin datos → null', () => {
    expect(etiquetaEspacio(null, null)).toBeNull();
  });
});

describe('ETIQUETAS_CATEGORIA_EDAD', () => {
  it('incluye las categorías base en español', () => {
    expect(ETIQUETAS_CATEGORIA_EDAD.alevin).toBe('Alevín');
    expect(ETIQUETAS_CATEGORIA_EDAD.benjamin).toBe('Benjamín');
  });
});
