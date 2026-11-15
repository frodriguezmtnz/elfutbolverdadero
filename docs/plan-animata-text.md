# Plan: Animaciones de texto con Animata (port vanilla WAAPI) — elfutbolverdadero

> Fecha: 2026-10-08 · Estado: aprobado, pendiente de ejecución
> Fuente: [animata.design/docs/text](https://animata.design/docs/text) · repo [codse/animata](https://github.com/codse/animata) (MIT)

## 1. Contexto y hallazgos

- **Animata no es una librería npm**: es estilo shadcn/ui — se copia/pega cada componente. Componentes en React + Tailwind; los 42 efectos nuevos de texto NO usan framer-motion, sino un motor genérico (`animata/text/text-animator.tsx`, ~1000 líneas) construido sobre la **Web Animations API** (`element.animate()`).
- **El proyecto es Astro 7 100% estático** (~900 páginas, cero islas JS, sin `@astrojs/react`, Tailwind v4, `astro-reveal` ya activo con `data-reveal`). Meter React+motion costaría ~140 KB de hidratación por página → **se porta el motor a vanilla TS**.
- **Formato de preset (spec EH)**: `target` (`whole` | `per-character` | `per-word` | `per-line`), fases `enter`/`exit` (durationMs, staggerMs, easing cubic-bezier, frames from/to con opacity, xPx/yPx/zPx, scale, rotate/rotateX/rotateY, blurPx, letterSpacingEm, color), `swap` (sequential + delays), `staggerMode` (normal | center-out | edges-in | reverse), runtime (`speed`, `holdMs`, `gapMs`, `yTravel`).

### Clasificación de los 42 presets (verificada en el repo)

| Tipo                      | Count | Presets                                                                                                                                                                                                                                                                                                                                   | Acción                                                     |
| ------------------------- | ----- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------- |
| Spec WAAPI (TextAnimator) | ~21   | blur-out-up, bottom-up-letters, fade-through, focus-blur-resolve, kinetic-center-build, line-by-line-slide, mask-reveal-up, micro-scale-fade, per-character-rise, per-word-crossfade, scale-down-fade, shared-axis-y, shared-axis-z, shimmer-sweep, short-slide-down, short-slide-right, soft-blur-in, spring-scale-in, top-down-letters… | Volcar spec literal a `presets.ts`                         |
| CSS/Tailwind puro         | ~11   | animated-gradient-text, bold-copy, double-underline, gibberish-text*, glitch-text, metis-text, mirror-text, roll-text*, split-text, underline-hover-text, wave-reveal*                                                                                                                                                                    | Portar a `animata.css` (keyframes/classes); * con micro-JS |
| framer-motion             | ~10   | circular-text, counter*, cycle-text, jitter-text, jumping-text-instagram, mask-text, scroll-reveal, swap-text, text-explode-imessage, text-flip*, ticker, typing-text*                                                                                                                                                                    | Reimplementar en WAAPI/CSS (* = JS vanilla)                |

CSS helper del motor (de `text-animator.css`): `.text-animation-stage` (grid, container), `.text-animation-title` (transform-3d), `.text-animation-unit` (inline-block, backface-hidden, will-change), variantes `.line`, kinetic (line/stack/word absolute), `.text-animation-fallback`.

## 2. Arquitectura del port

### `src/lib/animata/text-animator.ts`

Port del engine: `splitTextByTarget`, `getStaggerRanks`, `toAnimationFrame`, `materializeTileFrame`, `animatePhase` (enter/exit), loop swap/hold, `cleanupLoop`. Sin React ni `cn`.

Extras propios:

- Triggers: `load` | `visible` (IntersectionObserver global único, `once` opcional) | `manual`.
- Fase **exit**: disparar `exit` al salir del viewport (opcional `exit="leave"`).
- `prefers-reduced-motion`: no trocear el texto, dejarlo estático.
- SSR-first: el HTML contiene el texto plano; JS solo crea los `span` units.

### `src/lib/animata/presets.ts`

Catálogo completo de las 42 specs/efectos, tipado con `TextAnimationSpec`. Extraíbles de los `.tsx` de Animata (campos BASE_SPEC).

### `src/components/AnimataText.astro`

```astro
<AnimataText preset="per-character-rise" trigger="visible" exit="leave" holdMs={550}>
  {title}
</AnimataText>
```

Renderiza contenedor + `<script>` que instancia el motor. Props: preset, trigger, exit, speed/hold/gap/yTravel, class.

## 3. Integración en la web

| Zona             | Archivo                                                            | Preset                                                      | Trigger              |
| ---------------- | ------------------------------------------------------------------ | ----------------------------------------------------------- | -------------------- |
| Título hero      | `src/components/Hero.astro` (h1)                                   | per-character-rise o mask-reveal-up                         | load                 |
| Descripción hero | Hero.astro (p)                                                     | blur-out-up                                                 | load (delay)         |
| h2 Newsletter    | `src/components/Newsletter.astro`                                  | line-by-line-slide                                          | visible + exit leave |
| h2 Estandarte    | `src/components/EstandarteEntrenadores.astro`                      | top-down-letters                                            | visible              |
| Títulos tarjetas | `src/components/ListaPublicaciones.astro` / `EntrevistaCard.astro` | micro-scale-fade                                            | visible              |
| Logo/Header      | `src/components/Header.astro` + `Logo.astro`                       | bottom-up-letters                                           | load                 |
| 404              | `src/pages/404.astro`                                              | glitch-text (CSS)                                           | —                    |
| Micro-CSS        | links de tarjetas, `Chip.astro`                                    | underline-hover-text, shimmer-sweep, animated-gradient-text | hover/estático       |

Regla de convivencia: si un contenedor ya tiene `data-reveal` (astro-reveal), el hijo animado con Animata no repite entrada de opacidad (quitar `data-reveal` en el bloque del título o usar solo Animata ahí).

## 4. Accesibilidad / SEO

- Texto real en HTML (SSR); las units son decorativas (`aria-hidden` en el stage clonado + texto visible para AT vía original o `aria-label` en el stage).
- `prefers-reduced-motion` → estático.
- `will-change` limitado a transform/opacity/filter (como Animata); limpiar styles post-animación.
- Sin layout shift: units `inline-block` con mismo texto.

## 5. Verificación

1. `npm run test` — vitest: validar forma de las 42 specs (campos obligatorios, rangos, easing válido) y unit tests de `splitTextByTarget`/`getStaggerRanks`.
2. `astro dev --background` — revisar hero, portada, sección, 404; probar reduced-motion y móvil.
3. `astro build` — comprobar que el JS total añadido es few-KB y sin islas React.
4. `npm run lint` y `npm run format:check`.

## 6. Entrega (AGENTS.md)

- Rama `feat/animata-text-animations` desde main (nunca trabajar en main).
- Commits convencionales: `feat(animata): port WAAPI text animator engine`, `feat(animata): catálogo de 42 presets`, `feat(ui): entradas EH en hero y secciones`, `style: micro-efectos CSS animata`, `test(animata): validación de specs`.
- `gh pr create --assignee frodriguezmtnz --label enhancement`.

## 7. Referencias

- Motor original: `animata/text/text-animator.tsx` + `text-animator.css` (github codse/animata).
- Ejemplo de spec: `animata/text/per-character-rise.tsx` (BASE_SPEC enter/exit).
- Setup/requirements: animata.design/docs/setup (Tailwind; motion solo en presets legacy).
