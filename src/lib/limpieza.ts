const PATRON_TIEMPO_LEGADO =
  /^tiempo\s+de\s+lectura:\s*(?:&lt;|&gt;|<=|>=|<|>|≤)?\s*\d*\s*minutos?\.?\s*/i;

const PATRON_MAS_ELLIPSIS = /\s*(?:\[&hellip;\]|\[…\]|\[\.\.\.\]|&#8230;)+/gi;

export function decodificarEntidades(texto: string): string {
  return texto
    .replace(/&#0?39;/g, "'")
    .replace(/&#8230;/g, '…')
    .replace(/&hellip;/gi, '…')
    .replace(/&nbsp;/gi, ' ')
    .replace(/&quot;/g, '"')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&amp;/g, '&');
}

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
