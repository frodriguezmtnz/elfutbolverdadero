// Núcleo puro del motor de texto Animata (port vanilla de codse/animata, MIT).
// Sin DOM: solo tipos y transformaciones testeables en Node.

export type TargetMode = 'whole' | 'per-character' | 'per-word' | 'per-line';
export type StaggerMode = 'normal' | 'center-out' | 'edges-in' | 'reverse';

export interface AnimationFrame {
  opacity?: number;
  xPx?: number;
  yPx?: number;
  zPx?: number;
  scale?: number;
  rotate?: number;
  blurPx?: number;
  letterSpacingEm?: number;
}

export interface TextAnimationPhaseSpec {
  durationMs: number;
  staggerMs: number;
  easing: string;
  from: AnimationFrame;
  to: AnimationFrame;
}

export interface TextAnimationSpec {
  id: string;
  target: TargetMode;
  enter: TextAnimationPhaseSpec;
  exit?: TextAnimationPhaseSpec;
  staggerMode?: StaggerMode;
}

/**
 * Trocea el texto según el modo. `per-line` divide por saltos de línea
 * explícitos: en el DOM las líneas reales se detectan midiendo las palabras.
 */
export function splitTextByTarget(text: string, target: TargetMode): string[] {
  switch (target) {
    case 'whole':
      return [text];
    case 'per-character':
      return Array.from(text);
    case 'per-word':
      return text.split(/\s+/).filter(Boolean);
    case 'per-line':
      return text.split(/\r?\n/).filter(Boolean);
  }
}

/**
 * Rango de retardo (en unidades de stagger) para cada unidad.
 * `normal` 0..n-1 · `reverse` n-1..0 · `center-out` centro→bordes ·
 * `edges-in` bordes→centro.
 */
export function getStaggerRanks(count: number, mode: StaggerMode = 'normal'): number[] {
  const center = (count - 1) / 2;
  return Array.from({ length: count }, (_, i) => {
    switch (mode) {
      case 'normal':
        return i;
      case 'reverse':
        return count - 1 - i;
      case 'center-out':
        return Math.abs(i - center);
      case 'edges-in':
        return center - Math.abs(i - center);
    }
  });
}

function frameToKeyframe(frame: AnimationFrame, yTravel: number): Record<string, string | number> {
  const x = frame.xPx ?? 0;
  const y = (frame.yPx ?? 0) * yTravel;
  const z = frame.zPx ?? 0;
  const scale = frame.scale ?? 1;
  const transforms = [`translate3d(${x}px, ${y}px, ${z}px)`];
  if (frame.rotate) transforms.push(`rotate(${frame.rotate}deg)`);
  if (scale !== 1) transforms.push(`scale(${scale})`);

  const keyframe: Record<string, string | number> = {
    transform: transforms.join(' '),
  };
  if (frame.opacity !== undefined) keyframe.opacity = frame.opacity;
  if (frame.blurPx !== undefined) keyframe.filter = `blur(${frame.blurPx}px)`;
  if (frame.letterSpacingEm !== undefined) keyframe.letterSpacing = `${frame.letterSpacingEm}em`;
  return keyframe;
}

/** Convierte una fase de la spec en keyframes de la Web Animations API. */
export function specToKeyframes(
  phase: TextAnimationPhaseSpec,
  yTravel = 1,
): [Record<string, string | number>, Record<string, string | number>] {
  return [frameToKeyframe(phase.from, yTravel), frameToKeyframe(phase.to, yTravel)];
}

/** Easing aceptado: `ease*`, `linear` o `cubic-bezier(a, b, c, d)`. */
export function isValidEasing(easing: string): boolean {
  const value = easing.trim();
  if (/^(linear|ease|ease-in|ease-out|ease-in-out|step-start|step-end)$/.test(value)) return true;
  return /^cubic-bezier\(\s*(0|1|0?\.\d+)\s*,\s*-?\d*\.?\d+\s*,\s*(0|1|0?\.\d+)\s*,\s*-?\d*\.?\d+\s*\)$/.test(
    value,
  );
}
