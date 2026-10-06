// Filtros del banco de ejercicios: puros y sin dependencias (ni Sanity ni URL)
// para poder testearlos y reutilizarlos desde cualquier ruta on-demand.

export interface ItemCatalogo {
  acceso: string;
  slug: string;
  title: string;
  resumen?: string | null;
  duracionMin?: number | null;
  jugadoresMin?: number | null;
  jugadoresMax?: number | null;
  espacio?: string | null;
  tipoTarea?: string | null;
  categoriasEdad?: string[] | null;
  categorias?: { name: string; slug?: string }[] | null;
  objetivos?: { name: string; slug?: string }[] | null;
}

export interface FiltrosBanco {
  q: string | null;
  cat: string | null;
  obj: string | null;
  tipo: string | null;
  edad: string | null;
  espacio: string | null;
  jug: string | null;
  dur: string | null;
}

export const FILTRO_KEYS = ['q', 'cat', 'obj', 'tipo', 'edad', 'espacio', 'jug', 'dur'] as const;

export const RANGOS_JUGADORES: Record<string, [number, number]> = {
  reducido: [1, 6],
  medio: [7, 12],
  amplio: [13, 999],
};

export const RANGOS_DURACION: Record<string, [number, number]> = {
  corta: [1, 15],
  media: [16, 30],
  larga: [31, 9999],
};

export const ETIQUETAS_JUGADORES: Record<string, string> = {
  reducido: 'Hasta 6',
  medio: '7–12',
  amplio: '13 o más',
};

export const ETIQUETAS_DURACION: Record<string, string> = {
  corta: '≤ 15 min',
  media: '16–30 min',
  larga: 'Más de 30 min',
};

const VACIO: FiltrosBanco = {
  q: null,
  cat: null,
  obj: null,
  tipo: null,
  edad: null,
  espacio: null,
  jug: null,
  dur: null,
};

export function normalizarTexto(s: string | null | undefined): string {
  return (s ?? '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim();
}

/**
 * Parsea la query string con lista blanca de claves y rangos conocidos.
 * Cualquier valor fuera de los rangos (jug/dur) o clave desconocida se ignora:
 * el usuario no puede fabricar estados inválidos por URL.
 */
export function parseFiltros(params: URLSearchParams): FiltrosBanco {
  const f: FiltrosBanco = { ...VACIO };
  for (const key of FILTRO_KEYS) {
    const raw = params.get(key);
    if (!raw || !raw.trim()) continue;
    const v = raw.trim().slice(0, 80);
    if (key === 'q') f.q = v;
    else if (key === 'cat') f.cat = v;
    else if (key === 'obj') f.obj = v;
    else if (key === 'tipo') f.tipo = v;
    else if (key === 'edad') f.edad = v;
    else if (key === 'espacio') f.espacio = v;
    else if (key === 'jug' && RANGOS_JUGADORES[v]) f.jug = v;
    else if (key === 'dur' && RANGOS_DURACION[v]) f.dur = v;
  }
  return f;
}

export function tieneFiltros(f: FiltrosBanco): boolean {
  return FILTRO_KEYS.some((k) => f[k] !== null);
}

export function contarFiltros(f: FiltrosBanco): number {
  return FILTRO_KEYS.reduce((n, k) => n + (f[k] !== null ? 1 : 0), 0);
}

function intersectaRango(
  min: number | null | undefined,
  max: number | null | undefined,
  [rMin, rMax]: [number, number],
): boolean {
  const lo = min ?? max ?? null;
  const hi = max ?? min ?? null;
  if (lo == null || hi == null) return false;
  return lo <= rMax && hi >= rMin;
}

export function cumpleFiltros(item: ItemCatalogo, f: FiltrosBanco): boolean {
  if (f.cat && !item.categorias?.some((c) => c.slug === f.cat)) return false;
  if (f.obj && !item.objetivos?.some((o) => o.slug === f.obj)) return false;
  if (f.tipo && item.tipoTarea !== f.tipo) return false;
  if (f.edad && !(item.categoriasEdad ?? []).includes(f.edad)) return false;
  if (f.espacio && item.espacio !== f.espacio) return false;
  if (f.jug && !intersectaRango(item.jugadoresMin, item.jugadoresMax, RANGOS_JUGADORES[f.jug])) {
    return false;
  }
  if (f.dur) {
    if (item.duracionMin == null) return false;
    if (!intersectaRango(item.duracionMin, item.duracionMin, RANGOS_DURACION[f.dur])) return false;
  }
  if (f.q) {
    const q = normalizarTexto(f.q);
    const enTitulo = normalizarTexto(item.title).includes(q);
    const enResumen = normalizarTexto(item.resumen).includes(q);
    if (!enTitulo && !enResumen) return false;
  }
  return true;
}

export function aplicarFiltros<T extends ItemCatalogo>(items: T[], f: FiltrosBanco): T[] {
  if (!tieneFiltros(f)) return items.slice();
  return items.filter((it) => cumpleFiltros(it, f));
}

/** Reconstruye la URL de la lista cambiando o quitando un filtro (null = quitar). */
export function urlConFiltro(base: string, f: FiltrosBanco, cambio: Partial<FiltrosBanco>): string {
  const combinado = { ...f, ...cambio };
  const params = new URLSearchParams();
  for (const key of FILTRO_KEYS) {
    const v = combinado[key];
    if (v !== null && v !== '') params.set(key, v);
  }
  const qs = params.toString();
  return qs ? `${base}?${qs}` : base;
}

/** Facets presentes en el catálogo (para poblar los <select> sin consulta extra). */
export function facetsCatalogo(items: ItemCatalogo[]) {
  const cats = new Map<string, string>();
  const objs = new Map<string, string>();
  for (const it of items) {
    for (const c of it.categorias ?? []) if (c.slug) cats.set(c.slug, c.name);
    for (const o of it.objetivos ?? []) if (o.slug) objs.set(o.slug, o.name);
  }
  return {
    categorias: [...cats.entries()].sort((a, b) => a[1].localeCompare(b[1], 'es')),
    objetivos: [...objs.entries()].sort((a, b) => a[1].localeCompare(b[1], 'es')),
  };
}
