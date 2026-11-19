// Validaciones de seguridad para contenido embebido/enlaces que llegan de
// Sanity. Se usan en el render (PortableText.astro) para bloquear esquemas
// de URL peligrosos y iframes de dominios no autorizados.

// Solo se admiten enlaces http(s), mailto:, tel:, anclas y rutas relativas.
// Bloquea javascript:, data:, vbscript: y demás esquemas que un editor podría
// pegar en Sanity desde un texto copiado.
export function esHrefSeguro(href: string): boolean {
  return /^(https?:|mailto:|tel:|#|\/)/i.test(href.trim());
}

export function esExterno(href: string): boolean {
  return /^https?:\/\//i.test(href) && !/elfutbolverdadero\.com(\/|$)/i.test(href);
}

// Allowlist de dominios de embed (los 53 embeds del dataset son YouTube o
// self). Cualquier otro dominio se degrada a texto en vez de renderizar un
// iframe de origen desconocido.
const EMBEDS_PERMITIDOS = /^(www\.)?(youtube\.com|youtube-nocookie\.com|elfutbolverdadero\.com)$/i;

export function esEmbedPermitido(url: string): boolean {
  if (!/^https:\/\//i.test(url)) return false;
  try {
    return EMBEDS_PERMITIDOS.test(new URL(url).hostname);
  } catch {
    return false;
  }
}
