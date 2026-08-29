import getReadingTime from 'reading-time';

interface HijoPortable {
  text?: string;
}

interface BloquePortable {
  children?: HijoPortable[];
}

export { limpiarDescripcion } from './limpieza';

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
