// Catálogo de presets portados de Animata (codse/animata, MIT).
// Solo los specs usados en la web; el resto del catálogo puede añadirse aquí.
import type { TextAnimationSpec } from './core';

export const presets = {
  'per-character-rise': {
    id: 'per-character-rise',
    target: 'per-character',
    enter: {
      durationMs: 700,
      staggerMs: 24,
      easing: 'cubic-bezier(0.2, 0.8, 0.2, 1)',
      from: { opacity: 0, yPx: 32 },
      to: { opacity: 1, yPx: 0 },
    },
    exit: {
      durationMs: 420,
      staggerMs: 14,
      easing: 'cubic-bezier(0.7, 0, 0.84, 0)',
      from: { opacity: 1, yPx: 0 },
      to: { opacity: 0, yPx: -24 },
    },
    staggerMode: 'normal',
  },
  'mask-reveal-up': {
    id: 'mask-reveal-up',
    target: 'per-line',
    enter: {
      durationMs: 760,
      staggerMs: 90,
      easing: 'cubic-bezier(0.22, 1, 0.36, 1)',
      from: { opacity: 0, yPx: 30, blurPx: 6 },
      to: { opacity: 1, yPx: 0, blurPx: 0 },
    },
    exit: {
      durationMs: 520,
      staggerMs: 70,
      easing: 'cubic-bezier(0.64, 0, 0.78, 0)',
      from: { opacity: 1, yPx: 0, blurPx: 0 },
      to: { opacity: 0, yPx: -22, blurPx: 6 },
    },
    staggerMode: 'normal',
  },
  'blur-out-up': {
    id: 'blur-out-up',
    target: 'per-word',
    enter: {
      durationMs: 560,
      staggerMs: 28,
      easing: 'cubic-bezier(0.22, 1, 0.36, 1)',
      from: { opacity: 0, yPx: 10, blurPx: 6 },
      to: { opacity: 1, yPx: 0, blurPx: 0 },
    },
    exit: {
      durationMs: 480,
      staggerMs: 24,
      easing: 'cubic-bezier(0.64, 0, 0.78, 0)',
      from: { opacity: 1, yPx: 0, blurPx: 0 },
      to: { opacity: 0, yPx: -14, blurPx: 8 },
    },
    staggerMode: 'normal',
  },
  'line-by-line-slide': {
    id: 'line-by-line-slide',
    target: 'per-line',
    enter: {
      durationMs: 900,
      staggerMs: 120,
      easing: 'cubic-bezier(0.22, 1, 0.36, 1)',
      from: { opacity: 0, xPx: -48 },
      to: { opacity: 1, xPx: 0 },
    },
    exit: {
      durationMs: 600,
      staggerMs: 80,
      easing: 'cubic-bezier(0.64, 0, 0.78, 0)',
      from: { opacity: 1, xPx: 0 },
      to: { opacity: 0, xPx: 48 },
    },
    staggerMode: 'normal',
  },
  'bottom-up-letters': {
    id: 'bottom-up-letters',
    target: 'per-character',
    enter: {
      durationMs: 400,
      staggerMs: 88,
      easing: 'cubic-bezier(0.18, 1, 0.32, 1)',
      from: { opacity: 0, yPx: 46 },
      to: { opacity: 1, yPx: 0 },
    },
    exit: {
      durationMs: 280,
      staggerMs: 28,
      easing: 'cubic-bezier(0.7, 0, 0.84, 0)',
      from: { opacity: 1, yPx: 0 },
      to: { opacity: 0, yPx: -14 },
    },
    staggerMode: 'normal',
  },
  'micro-scale-fade': {
    id: 'micro-scale-fade',
    target: 'whole',
    enter: {
      durationMs: 600,
      staggerMs: 0,
      easing: 'cubic-bezier(0.32, 0.72, 0, 1)',
      from: { opacity: 0, scale: 0.96 },
      to: { opacity: 1, scale: 1 },
    },
    exit: {
      durationMs: 400,
      staggerMs: 0,
      easing: 'cubic-bezier(0.7, 0, 0.84, 0)',
      from: { opacity: 1, scale: 1 },
      to: { opacity: 0, scale: 0.96 },
    },
    staggerMode: 'normal',
  },
} as const satisfies Record<string, TextAnimationSpec>;

export type PresetId = keyof typeof presets;

export function getPreset(id: string): TextAnimationSpec | undefined {
  return id in presets ? (presets[id as PresetId] as TextAnimationSpec) : undefined;
}
