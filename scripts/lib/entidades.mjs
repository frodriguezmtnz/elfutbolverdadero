// Decodificador de entidades HTML heredadas de la migracion de WordPress (version Node).
// Espejo de src/lib/entidades.ts -> mantener en sincronia.

const NAMED = {
  '&ndash;': '\u2013',
  '&mdash;': '\u2014',
  '&hellip;': '\u2026',
  '&bull;': '\u2022',
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
  '&lt;': '<',
  '&gt;': '>',
};

const CLAVE_NAMED = Object.keys(NAMED).sort((a, b) => b.length - a.length);
const RE_NAMED = new RegExp(CLAVE_NAMED.map(escaparRegex).join('|'), 'g');
const RE_HEX = /&#x([0-9a-f]+);/gi;
const RE_DEC = /&#(\d+);/g;

function escaparRegex(s) {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function desdeCodePoint(cp) {
  if (!Number.isFinite(cp) || cp < 1 || cp > 0x10ffff) return '';
  if (cp >= 0xd800 && cp <= 0xdfff) return '';
  return String.fromCodePoint(cp);
}

export function decodificarEntidades(texto) {
  if (texto == null) return texto === null ? null : '';
  if (typeof texto !== 'string') return texto;
  return texto
    .replace(RE_HEX, (_m, hex) => desdeCodePoint(parseInt(hex, 16)))
    .replace(RE_DEC, (_m, dec) => desdeCodePoint(parseInt(dec, 10)))
    .replace(RE_NAMED, (m) => NAMED[m] ?? m)
    .replace(/&amp;/g, '&');
}
