// Motor de animación de texto sobre la Web Animations API.
// Port vanilla de codse/animata (MIT): sin React ni librerías externas.
import {
  getStaggerRanks,
  specToKeyframes,
  type TextAnimationPhaseSpec,
  type TextAnimationSpec,
} from './core';
import { getPreset } from './presets';

interface PlayOptions {
  speed: number;
  yTravel: number;
  exitOnLeave: boolean;
}

interface StageState {
  spec: TextAnimationSpec;
  units: HTMLElement[];
  options: PlayOptions;
  exited: boolean;
}

interface VisibilityHandler {
  enter: () => void;
  leave?: () => void;
  entered: boolean;
}

const DEFAULT_OPTIONS: PlayOptions = { speed: 1, yTravel: 1, exitOnLeave: false };
const stages = new WeakMap<HTMLElement, StageState>();
const visibilityHandlers = new WeakMap<Element, VisibilityHandler>();
let visibilityObserver: IntersectionObserver | null = null;
let started = false;

function prefersReducedMotion(): boolean {
  return (
    typeof window !== 'undefined' &&
    typeof window.matchMedia === 'function' &&
    window.matchMedia('(prefers-reduced-motion: reduce)').matches
  );
}

function hasSeen(token: string): boolean {
  try {
    return window.sessionStorage.getItem(token) === '1';
  } catch {
    return false;
  }
}

function markSeen(token: string): void {
  try {
    window.sessionStorage.setItem(token, '1');
  } catch {
    // sessionStorage bloqueado: se anima igualmente.
  }
}

function makeUnit(text: string): HTMLElement {
  const unit = document.createElement('span');
  unit.className = 'animata-unit';
  unit.textContent = text;
  unit.setAttribute('aria-hidden', 'true');
  return unit;
}

function makeScreenReaderCopy(text: string): HTMLElement {
  const copy = document.createElement('span');
  copy.className = 'sr-only';
  copy.textContent = text;
  return copy;
}

/** Agrupa las palabras ya insertadas en el DOM en líneas reales medidas. */
function groupIntoLines(words: HTMLElement[]): HTMLElement[][] {
  const tops = words.map((word) => Math.round(word.getBoundingClientRect().top));
  const lines: HTMLElement[][] = [];
  let current: HTMLElement[] = [];
  let currentTop = tops[0];
  words.forEach((word, i) => {
    if (i > 0 && Math.abs(tops[i] - currentTop) > 1) {
      lines.push(current);
      current = [];
      currentTop = tops[i];
    }
    current.push(word);
  });
  if (current.length > 0) lines.push(current);
  return lines;
}

function prepare(el: HTMLElement, spec: TextAnimationSpec): HTMLElement[] | null {
  const state = stages.get(el);
  if (state && state.units.length > 0) return state.units;
  if (el.children.length > 0) return null;

  const text = (el.textContent ?? '').replace(/\s+/g, ' ').trim();
  if (!text) return null;

  const screenReaderCopy = makeScreenReaderCopy(text);
  const words = text.split(/\s+/);

  if (spec.target === 'whole') {
    const unit = makeUnit(text);
    el.replaceChildren(screenReaderCopy, unit);
    return [unit];
  }

  if (spec.target === 'per-character') {
    const units: HTMLElement[] = [];
    const nodes: (Node | string)[] = [screenReaderCopy];
    for (const char of Array.from(text)) {
      if (/\s/.test(char)) {
        nodes.push(' ');
        continue;
      }
      const unit = makeUnit(char);
      units.push(unit);
      nodes.push(unit);
    }
    el.replaceChildren(...nodes);
    return units;
  }

  if (spec.target === 'per-word') {
    const units: HTMLElement[] = [];
    const nodes: (Node | string)[] = [screenReaderCopy];
    words.forEach((word, i) => {
      if (i > 0) nodes.push(' ');
      const unit = makeUnit(word);
      units.push(unit);
      nodes.push(unit);
    });
    el.replaceChildren(...nodes);
    return units;
  }

  // per-line: se insertan las palabras para medir y luego se agrupan en líneas.
  const probe: HTMLElement[] = [];
  el.replaceChildren(screenReaderCopy);
  words.forEach((word, i) => {
    if (i > 0) el.append(' ');
    const unit = makeUnit(word);
    probe.push(unit);
    el.append(unit);
  });
  if (probe.length === 0) return null;

  const lines = groupIntoLines(probe);
  const lineUnits = lines.map((lineWords) => {
    const line = document.createElement('span');
    line.className = 'animata-line';
    line.setAttribute('aria-hidden', 'true');
    lineWords.forEach((word, i) => {
      if (i > 0) line.append(' ');
      line.append(word);
    });
    return line;
  });
  el.replaceChildren(screenReaderCopy, ...lineUnits);
  return lineUnits;
}

function cancelAnimations(units: HTMLElement[]): void {
  for (const unit of units) {
    for (const animation of unit.getAnimations()) animation.cancel();
  }
}

function playPhase(state: StageState, phase: TextAnimationPhaseSpec): void {
  cancelAnimations(state.units);
  const frames = specToKeyframes(phase, state.options.yTravel) as Keyframe[];
  const ranks = getStaggerRanks(state.units.length, state.spec.staggerMode ?? 'normal');

  const animations = state.units.map((unit, i) => {
    unit.style.willChange = 'transform, opacity, filter';
    return unit.animate(frames, {
      duration: Math.max(0, phase.durationMs / state.options.speed),
      delay: Math.max(0, (ranks[i] * phase.staggerMs) / state.options.speed),
      easing: phase.easing,
      fill: 'both',
    });
  });

  Promise.allSettled(animations.map((animation) => animation.finished)).then(() => {
    for (const unit of state.units) {
      if (unit.getAnimations().length === 0) unit.style.willChange = 'auto';
    }
  });
}

function getVisibilityObserver(): IntersectionObserver {
  if (visibilityObserver) return visibilityObserver;
  visibilityObserver = new IntersectionObserver(
    (entries) => {
      for (const entry of entries) {
        const handler = visibilityHandlers.get(entry.target);
        if (!handler) continue;
        if (entry.isIntersecting) {
          if (!handler.entered || handler.leave) {
            handler.enter();
            handler.entered = true;
          }
          if (!handler.leave) {
            visibilityObserver?.unobserve(entry.target);
            visibilityHandlers.delete(entry.target);
          }
        } else if (handler.leave && handler.entered) {
          handler.leave();
        }
      }
    },
    { threshold: 0.15, rootMargin: '0px 0px -8% 0px' },
  );
  return visibilityObserver;
}

function whenFontsReady(callback: () => void): void {
  const fonts = document.fonts;
  if (fonts && fonts.status === 'loading') {
    fonts.ready.then(callback).catch(callback);
  } else {
    callback();
  }
}

function setupStage(el: HTMLElement): void {
  if (el.dataset.animataBound) return;
  el.dataset.animataBound = 'true';

  const spec = getPreset(el.dataset.animata ?? '');
  if (!spec || prefersReducedMotion()) return;

  const onceKey = el.dataset.animataOnce;
  const token = onceKey ? `animata:once:${onceKey}` : '';
  if (token && hasSeen(token)) return;

  const speed = Number(el.dataset.animataSpeed);
  const state: StageState = {
    spec,
    units: [],
    options: {
      ...DEFAULT_OPTIONS,
      speed: Number.isFinite(speed) && speed > 0 ? speed : DEFAULT_OPTIONS.speed,
      exitOnLeave: el.dataset.animataExit === 'leave',
    },
    exited: false,
  };
  stages.set(el, state);

  const enter = () => {
    const units = prepare(el, spec);
    if (!units) return;
    state.units = units;
    if (token) markSeen(token);
    state.exited = false;
    playPhase(state, spec.enter);
  };

  const leave = () => {
    if (!spec.exit || state.exited || state.units.length === 0) return;
    state.exited = true;
    playPhase(state, spec.exit);
  };

  const trigger = el.dataset.animataTrigger ?? 'visible';
  if (trigger === 'load') {
    whenFontsReady(() => requestAnimationFrame(enter));
  } else if (trigger === 'visible') {
    visibilityHandlers.set(el, {
      enter,
      leave: state.options.exitOnLeave ? leave : undefined,
      entered: false,
    });
    getVisibilityObserver().observe(el);
  }
}

export function initAnimata(): void {
  if (started || typeof document === 'undefined') return;
  started = true;

  const scan = (root: ParentNode) => {
    for (const el of root.querySelectorAll<HTMLElement>('[data-animata]')) setupStage(el);
  };

  scan(document);
  document.addEventListener('astro:page-load', () => scan(document));
}
