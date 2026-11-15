import { describe, expect, it } from 'vitest';
import {
  getStaggerRanks,
  isValidEasing,
  specToKeyframes,
  splitTextByTarget,
  type TextAnimationPhaseSpec,
} from '../../src/lib/animata/core';
import { getPreset, presets } from '../../src/lib/animata/presets';

describe('splitTextByTarget', () => {
  it('devuelve el texto entero con target whole', () => {
    expect(splitTextByTarget('Hola mundo', 'whole')).toEqual(['Hola mundo']);
  });

  it('trocea por caracteres respetando surrogate pairs', () => {
    expect(splitTextByTarget('a🎾b', 'per-character')).toEqual(['a', '🎾', 'b']);
  });

  it('trocea por palabras ignorando espacios múltiples', () => {
    expect(splitTextByTarget('  fútbol   base ', 'per-word')).toEqual(['fútbol', 'base']);
  });

  it('trocea por líneas explícitas', () => {
    expect(splitTextByTarget('línea uno\nlínea dos\r\nlínea tres', 'per-line')).toEqual([
      'línea uno',
      'línea dos',
      'línea tres',
    ]);
  });
});

describe('getStaggerRanks', () => {
  it('ordena de inicio a fin en modo normal', () => {
    expect(getStaggerRanks(4)).toEqual([0, 1, 2, 3]);
  });

  it('invierte el orden en modo reverse', () => {
    expect(getStaggerRanks(4, 'reverse')).toEqual([3, 2, 1, 0]);
  });

  it('sale desde el centro en center-out', () => {
    expect(getStaggerRanks(5, 'center-out')).toEqual([2, 1, 0, 1, 2]);
  });

  it('entra desde los bordes en edges-in', () => {
    expect(getStaggerRanks(5, 'edges-in')).toEqual([0, 1, 2, 1, 0]);
  });

  it('con una sola unidad el rango es 0', () => {
    expect(getStaggerRanks(1, 'center-out')).toEqual([0]);
  });
});

describe('specToKeyframes', () => {
  const phase: TextAnimationPhaseSpec = {
    durationMs: 500,
    staggerMs: 20,
    easing: 'ease-out',
    from: { opacity: 0, yPx: 30, blurPx: 6 },
    to: { opacity: 1, yPx: 0, blurPx: 0 },
  };

  it('convierte frames a keyframes con transform/filter/opacity', () => {
    const [from, to] = specToKeyframes(phase);
    expect(from).toEqual({
      opacity: 0,
      filter: 'blur(6px)',
      transform: 'translate3d(0px, 30px, 0px)',
    });
    expect(to).toEqual({
      opacity: 1,
      filter: 'blur(0px)',
      transform: 'translate3d(0px, 0px, 0px)',
    });
  });

  it('aplica el multiplicador yTravel', () => {
    const [from] = specToKeyframes(phase, 0.5);
    expect(from.transform).toBe('translate3d(0px, 15px, 0px)');
  });

  it('compone x, y, z, rotate y scale', () => {
    const [, to] = specToKeyframes({
      ...phase,
      to: { opacity: 1, xPx: 10, yPx: 5, zPx: 2, rotate: 4, scale: 0.9 },
    });
    expect(to.transform).toBe('translate3d(10px, 5px, 2px) rotate(4deg) scale(0.9)');
  });

  it('mantiene un transform identidad cuando no hay desplazamientos ni escala', () => {
    const [from] = specToKeyframes({
      ...phase,
      from: { opacity: 0, blurPx: 4, letterSpacingEm: 0.2 },
    });
    expect(from).toEqual({
      opacity: 0,
      filter: 'blur(4px)',
      letterSpacing: '0.2em',
      transform: 'translate3d(0px, 0px, 0px)',
    });
  });
});

describe('isValidEasing', () => {
  it('acepta easings estándar y cubic-bezier', () => {
    expect(isValidEasing('ease-out')).toBe(true);
    expect(isValidEasing('linear')).toBe(true);
    expect(isValidEasing('cubic-bezier(0.22, 1, 0.36, 1)')).toBe(true);
  });

  it('rechaza easings inválidos', () => {
    expect(isValidEasing('ease-bounce')).toBe(false);
    expect(isValidEasing('cubic-bezier(1.2, 1, 0.36, 1)')).toBe(false);
  });
});

describe('presets', () => {
  const entries = Object.entries(presets);

  it('cada preset declara un id coherente con su clave', () => {
    for (const [key, spec] of entries) {
      expect(spec.id).toBe(key);
    }
  });

  it('las fases usan duraciones, stagger y easing válidos', () => {
    for (const [, spec] of entries) {
      for (const phase of [spec.enter, spec.exit]) {
        if (!phase) continue;
        expect(phase.durationMs).toBeGreaterThan(0);
        expect(phase.staggerMs).toBeGreaterThanOrEqual(0);
        expect(isValidEasing(phase.easing)).toBe(true);
      }
    }
  });

  it('las opacidades quedan en el rango 0..1', () => {
    for (const [, spec] of entries) {
      for (const phase of [spec.enter, spec.exit]) {
        if (!phase) continue;
        for (const frame of [phase.from, phase.to]) {
          if (frame.opacity !== undefined) {
            expect(frame.opacity).toBeGreaterThanOrEqual(0);
            expect(frame.opacity).toBeLessThanOrEqual(1);
          }
        }
      }
    }
  });

  it('getPreset resuelve ids conocidos y devuelve undefined con desconocidos', () => {
    expect(getPreset('mask-reveal-up')?.target).toBe('per-line');
    expect(getPreset('inventado')).toBeUndefined();
  });
});
