// Etiquetas humanas para los valores de enumeración de Sanity.
// Módulo puro (sin red) para poder testearlo con Vitest.

import {
  opcionesCategoriaEdad,
  opcionesEspacio,
  fasesSesion,
} from '../../sanity/schemas/valoresComunes';

export const ETIQUETAS_CATEGORIA_EDAD: Record<string, string> = Object.fromEntries(
  opcionesCategoriaEdad.map((o) => [o.value, o.title]),
);

export const ETIQUETAS_ESPACIO: Record<string, string> = Object.fromEntries(
  opcionesEspacio.map((o) => [o.value, o.title]),
);

export const ETIQUETAS_FASE: Record<string, string> = Object.fromEntries(
  fasesSesion.map((f) => [f.value, f.title]),
);

export function etiquetaFase(fase?: string | null): string | null {
  return fase ? (ETIQUETAS_FASE[fase] ?? fase) : null;
}

export function etiquetaJugadores(min?: number | null, max?: number | null): string | null {
  if (min == null && max == null) return null;
  if (min != null && max != null)
    return min === max ? `${min} jugadores` : `${min}–${max} jugadores`;
  return `${min ?? max}+ jugadores`;
}

export function etiquetaDuracion(min?: number | null): string | null {
  return min != null ? `${min} min` : null;
}

export function etiquetaEspacio(espacio?: string | null, medidas?: string | null): string | null {
  const base = espacio ? (ETIQUETAS_ESPACIO[espacio] ?? espacio) : null;
  if (base && medidas) return `${base} · ${medidas}`;
  return base ?? medidas ?? null;
}

export const ETIQUETAS_FORMATO: Record<string, string> = {
  pdf: 'PDF',
  word: 'Word',
  excel: 'Excel',
};

export function etiquetaFormato(formato?: string | null): string | null {
  return formato ? (ETIQUETAS_FORMATO[formato] ?? formato.toUpperCase()) : null;
}
