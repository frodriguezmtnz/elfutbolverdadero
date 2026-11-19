import { describe, it, expect } from 'vitest';
import { esHrefSeguro, esExterno, esEmbedPermitido } from '../../src/lib/embeds';

describe('esHrefSeguro', () => {
  it('acepta http, https, mailto, tel, anclas y rutas relativas', () => {
    expect(esHrefSeguro('https://ejemplo.com/a')).toBe(true);
    expect(esHrefSeguro('http://ejemplo.com/a')).toBe(true);
    expect(esHrefSeguro('mailto:hola@ejemplo.com')).toBe(true);
    expect(esHrefSeguro('tel:+34600000000')).toBe(true);
    expect(esHrefSeguro('#seccion')).toBe(true);
    expect(esHrefSeguro('/categoria/entrevistas/')).toBe(true);
  });

  it('rechaza esquemas ejecutables y data:', () => {
    expect(esHrefSeguro('javascript:alert(1)')).toBe(false);
    expect(esHrefSeguro('JavaScript:alert(1)')).toBe(false);
    expect(esHrefSeguro(' javascript:alert(1)')).toBe(false);
    expect(esHrefSeguro('data:text/html;base64,xxxx')).toBe(false);
    expect(esHrefSeguro('vbscript:msgbox')).toBe(false);
    expect(esHrefSeguro('')).toBe(false);
  });
});

describe('esExterno', () => {
  it('marca http(s) fuera del dominio propio como externo', () => {
    expect(esExterno('https://youtube.com/watch')).toBe(true);
    expect(esExterno('https://www.elfutbolverdadero.com/a')).toBe(false);
  });

  it('rutas relativas y anclas no son externas', () => {
    expect(esExterno('/categoria/foo/')).toBe(false);
    expect(esExterno('#ancla')).toBe(false);
  });
});

describe('esEmbedPermitido', () => {
  it('acepta https de YouTube y del dominio propio', () => {
    expect(esEmbedPermitido('https://www.youtube.com/embed/abc')).toBe(true);
    expect(esEmbedPermitido('https://youtube.com/embed/abc')).toBe(true);
    expect(esEmbedPermitido('https://www.youtube-nocookie.com/embed/abc')).toBe(true);
    expect(esEmbedPermitido('https://elfutbolverdadero.com/x')).toBe(true);
    expect(esEmbedPermitido('https://www.elfutbolverdadero.com/x')).toBe(true);
  });

  it('rechaza subdominios que imitan el allowlist', () => {
    expect(esEmbedPermitido('https://evil.youtube.com/embed/abc')).toBe(false);
    expect(esEmbedPermitido('https://youtube.com.evil.com/embed/abc')).toBe(false);
    expect(esEmbedPermitido('https://notyoutube.com/embed/abc')).toBe(false);
  });

  it('rechaza http plano y esquemas peligrosos', () => {
    expect(esEmbedPermitido('http://www.youtube.com/embed/abc')).toBe(false);
    expect(esEmbedPermitido('javascript:alert(1)')).toBe(false);
    expect(esEmbedPermitido('https://no-es-una-url')).toBe(false);
  });
});
