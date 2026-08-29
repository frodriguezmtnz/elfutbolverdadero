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
