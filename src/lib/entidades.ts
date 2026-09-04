// Decodificador de entidades HTML heredadas de la migracion de WordPress.
// Mantiene un unico punto de verdad para titulos, descripciones, alt y SEO.
// Nota: la version Node (scripts) vive en scripts/lib/entidades.mjs -> mantener en sincronia.

const NAMED: Record<string, string> = {
  // Guiones y puntos suspensivos (los mas frecuentes en titulos WP)
  '&ndash;': '\u2013',
  '&mdash;': '\u2014',
  '&hellip;': '\u2026',
  '&bull;': '\u2022',
  // Comillas y apóstrofos tipograficos
  '&lsquo;': '\u2018',
  '&rsquo;': '\u2019',
  '&sbquo;': '\u201a',
  '&ldquo;': '\u201c',
  '&rdquo;': '\u201d',
  '&bdquo;': '\u201e',
  '&prime;': '\u2032',
  '&Prime;': '\u2033',
  '&lsaquo;': '\u2039',
  '&rsaquo;': '\u203a',
  '&quot;': '"',
  '&apos;': "'",
  // Espacios y simbolos varios
  '&nbsp;': ' ',
  '&thinsp;': '\u2009',
  '&shy;': '',
  '&copy;': '\u00a9',
  '&reg;': '\u00ae',
  '&trade;': '\u2122',
  '&deg;': '\u00b0',
  '&plusmn;': '\u00b1',
  '&times;': '\u00d7',
  '&divide;': '\u00f7',
  '&frac12;': '\u00bd',
  '&frac14;': '\u00bc',
  '&frac34;': '\u00be',
  '&iexcl;': '\u00a1',
  '&iquest;': '\u00bf',
  '&laquo;': '\u00ab',
  '&raquo;': '\u00bb',
  '&pound;': '\u00a3',
  '&cent;': '\u00a2',
  '&curren;': '\u00a4',
  '&yen;': '\u00a5',
  '&euro;': '\u20ac',
  '&sect;': '\u00a7',
  '&para;': '\u00b6',
  '&middot;': '\u00b7',
  '&dagger;': '\u2020',
  '&Dagger;': '\u2021',
  '&permil;': '\u2030',
  '&micro;': '\u00b5',
  '&brvbar;': '\u00a6',
  // Vocales acentuadas por nombre (WP suele emitirlas en numerico, por si acaso)
  '&aacute;': '\u00e1',
  '&eacute;': '\u00e9',
  '&iacute;': '\u00ed',
  '&oacute;': '\u00f3',
  '&uacute;': '\u00fa',
  '&uuml;': '\u00fc',
  '&ntilde;': '\u00f1',
  '&agrave;': '\u00e0',
  '&egrave;': '\u00e8',
  '&igrave;': '\u00ec',
  '&ograve;': '\u00f2',
  '&ugrave;': '\u00f9',
  '&acirc;': '\u00e2',
  '&ecirc;': '\u00ea',
  '&icirc;': '\u00ee',
  '&ocirc;': '\u00f4',
  '&ucirc;': '\u00fb',
  '&auml;': '\u00e4',
  '&euml;': '\u00eb',
  '&iuml;': '\u00ef',
  '&ouml;': '\u00f6',
  '&yuml;': '\u00ff',
  '&atilde;': '\u00e3',
  '&otilde;': '\u00f5',
  '&ccedil;': '\u00e7',
  '&aelig;': '\u00e6',
  '&Aacute;': '\u00c1',
  '&Eacute;': '\u00c9',
  '&Iacute;': '\u00cd',
  '&Oacute;': '\u00d3',
  '&Uacute;': '\u00da',
  '&Uuml;': '\u00dc',
  '&Ntilde;': '\u00d1',
  // Corchetes angulares / comparadores
  '&lt;': '<',
  '&gt;': '>',
};

const CLAVE_NAMED = Object.keys(NAMED).sort((a, b) => b.length - a.length);
const RE_NAMED = new RegExp(CLAVE_NAMED.map(escaparRegex).join('|'), 'g');
const RE_HEX = /&#x([0-9a-f]+);/gi;
const RE_DEC = /&#(\d+);/g;

function escaparRegex(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function desdeCodePoint(cp: number): string {
  if (!Number.isFinite(cp) || cp < 1 || cp > 0x10ffff) return '';
  // Evita sustituir surrogate sueltos (rango D800-DFFF) que String.fromCodePoint rechazaria.
  if (cp >= 0xd800 && cp <= 0xdfff) return '';
  return String.fromCodePoint(cp);
}

/**
 * Convierte entidades HTML residuales (`&#8211;`, `&ndash;`, `&#x2013;`...) en su caracter.
 * Pasa una sola vez (sin bucle) para respetar doble-codificaciones reales (`&amp;#8211;` -> `&#8211;`).
 */
export function decodificarEntidades(texto: string | null | undefined): string {
  if (!texto) return '';
  return texto
    .replace(RE_HEX, (_m, hex: string) => desdeCodePoint(parseInt(hex, 16)))
    .replace(RE_DEC, (_m, dec: string) => desdeCodePoint(parseInt(dec, 10)))
    .replace(RE_NAMED, (m: string) => NAMED[m] ?? m)
    .replace(/&amp;/g, '&');
}
