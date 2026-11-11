import type { Publicacion } from './sanity';

type Candidata = Pick<Publicacion, 'tipo' | 'destacada' | 'mainImage'>;

// Regla del hero: manda la entrevista marcada como `destacada`; si no hay
// ninguna marcada, la última entrevista con imagen. El array llega ordenado por
// `publishedAt desc`, así que `find` ya resuelve el desempate por recencia.
export function elegirDestacada<T extends Candidata>(todas: readonly T[]): T | null {
  const conImagen = todas.filter((p) => p.tipo === 'entrevista' && p.mainImage?.asset != null);
  return conImagen.find((p) => p.destacada === true) ?? conImagen[0] ?? null;
}
