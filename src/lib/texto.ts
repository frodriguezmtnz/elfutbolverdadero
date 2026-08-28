import getReadingTime from 'reading-time';

interface HijoPortable {
  text?: string;
}

interface BloquePortable {
  children?: HijoPortable[];
}

const PATRON_TIEMPO_LEGADO =
  /^tiempo\s+de\s+lectura:\s*(?:&lt;|&gt;|<=|>=|<|>|≤)?\s*\d+\s*minutos?\.?\s*/i;

export function limpiarDescripcion(descripcion: string | null | undefined): string | undefined {
  if (!descripcion) return undefined;
  let limpia = descripcion;
  while (PATRON_TIEMPO_LEGADO.test(limpia)) {
    limpia = limpia.replace(PATRON_TIEMPO_LEGADO, '');
  }
  limpia = limpia.trim();
  return limpia || undefined;
}

export function extraerTexto(blocks: unknown[] | null | undefined): string {
  return (blocks ?? [])
    .flatMap((bloque) => {
      const hijos = (bloque as BloquePortable).children ?? [];
      return hijos.map((hijo) => hijo.text ?? '');
    })
    .join(' ')
    .replace(/\s+/g, ' ')
    .trim();
}

export function tiempoLectura(
  blocks: unknown[] | null | undefined,
  fallback?: string | null
): string | null {
  const texto = extraerTexto(blocks);
  if (texto) {
    const minutos = Math.max(1, Math.ceil(getReadingTime(texto).minutes));
    return `${minutos} min de lectura`;
  }
  const legado = fallback?.trim();
  if (!legado) return null;
  return /^\d+$/.test(legado) ? `${legado} min de lectura` : legado;
}
