import getReadingTime from 'reading-time';

interface HijoPortable {
  text?: string;
}

interface BloquePortable {
  _type?: string;
  style?: string;
  children?: HijoPortable[];
}

export { limpiarDescripcion } from './limpieza';

const PATRON_BLOQUE_TIEMPO = /^tiempo\s+de\s+lectura/i;

export function sinBloquesTiempoLectura(blocks: unknown[] | null | undefined): unknown[] {
  return (blocks ?? []).filter((bloque) => {
    const b = bloque as BloquePortable & { _type?: string };
    if (b._type !== 'block') return true;
    const texto = (b.children ?? [])
      .map((hijo) => hijo.text ?? '')
      .join('')
      .trim();
    return !PATRON_BLOQUE_TIEMPO.test(texto);
  });
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

// Extracto de reserva para publicaciones sin `description`: los primeros
// párrafos normales del body (ignora títulos, imágenes y el bloque legado de
// tiempo de lectura de WordPress), recortados en límite de palabra.
export function extractoDeBody(
  blocks: unknown[] | null | undefined,
  max = 220,
): string | undefined {
  const texto = (blocks ?? [])
    .filter((bloque) => {
      const b = bloque as BloquePortable;
      if (b._type !== 'block') return false;
      if (b.style && b.style !== 'normal') return false;
      const contenido = (b.children ?? [])
        .map((hijo) => hijo.text ?? '')
        .join('')
        .trim();
      return contenido !== '' && !PATRON_BLOQUE_TIEMPO.test(contenido);
    })
    .map(
      (bloque) =>
        (bloque as BloquePortable).children?.map((hijo) => hijo.text ?? '').join('') ?? '',
    )
    .join(' ')
    .replace(/\s+/g, ' ')
    .trim();

  if (!texto) return undefined;
  if (texto.length <= max) return texto;

  const recorte = texto.slice(0, max);
  const ultimoEspacio = recorte.lastIndexOf(' ');
  const base = (ultimoEspacio > 0 ? recorte.slice(0, ultimoEspacio) : recorte).replace(
    /[.,;:!?—–-]+$/,
    '',
  );
  return `${base}…`;
}

export function tiempoLectura(
  blocks: unknown[] | null | undefined,
  fallback?: string | null,
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

export function slugDeEtiqueta(name: string, slug?: string | null): string {
  if (slug) return slug;
  return name
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}
