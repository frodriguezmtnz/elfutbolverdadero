import { decodificarEntidades } from './entidades';

const PATRON_TIEMPO_LEGADO =
  /^tiempo\s+de\s+lectura:\s*(?:&lt;|&gt;|<=|>=|<|>|≤)?\s*\d*\s*minutos?\.?\s*/i;

const PATRON_MAS_ELLIPSIS = /\s*(?:\[&hellip;\]|\[…\]|\[\.\.\.\]|&#8230;)+/gi;

export { decodificarEntidades };

export function limpiarDescripcion(descripcion: string | null | undefined): string | undefined {
  if (!descripcion) return undefined;
  let limpia = decodificarEntidades(descripcion);
  while (PATRON_TIEMPO_LEGADO.test(limpia)) {
    limpia = limpia.replace(PATRON_TIEMPO_LEGADO, '');
  }
  limpia = limpia.replace(PATRON_MAS_ELLIPSIS, '');
  limpia = limpia.replace(/\s{2,}/g, ' ').trim();
  return limpia || undefined;
}
