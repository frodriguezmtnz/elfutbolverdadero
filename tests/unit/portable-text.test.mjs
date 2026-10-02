import { describe, it, expect } from 'vitest';
import { htmlToPortableText } from '../../scripts/lib/portable-text.mjs';

const textoDe = (b) => (b.children ?? []).map((s) => s.text ?? '').join('');
const noImg = async () => null;

describe('htmlToPortableText', () => {
  it('convierte headings y párrafos y descarta el bloque de tiempo de lectura', async () => {
    const html = '<h2>Encabezado</h2><p>Párrafo uno</p><p>Tiempo de lectura: 4 minutos</p>';
    const blocks = await htmlToPortableText(html, { resolveImageUrl: noImg });
    const texts = blocks.map(textoDe);
    const styles = blocks.map((b) => b.style);
    expect(texts).toContain('Encabezado');
    expect(texts).toContain('Párrafo uno');
    expect(styles).toContain('h2');
    expect(texts.some((t) => /^tiempo\s+de\s+lectura/i.test(t))).toBe(false);
  });

  it('iframe → bloque embed con su url', async () => {
    const blocks = await htmlToPortableText('<iframe src="https://x/y"></iframe>', {
      resolveImageUrl: noImg,
    });
    const embed = blocks.find((b) => b._type === 'embed');
    expect(embed).toBeTruthy();
    expect(embed.url).toBe('https://x/y');
  });

  it('img → bloque image con la referencia de resolveImageUrl', async () => {
    const blocks = await htmlToPortableText('<img src="https://cdn/p.jpg">', {
      resolveImageUrl: async (src) => (src === 'https://cdn/p.jpg' ? 'asset-123' : null),
    });
    const img = blocks.find((b) => b._type === 'image');
    expect(img).toBeTruthy();
    expect(img.asset).toEqual({ _type: 'reference', _ref: 'asset-123' });
  });

  it('texto suelto sin etiquetas → bloque normal', async () => {
    const blocks = await htmlToPortableText('Hola mundo', { resolveImageUrl: noImg });
    expect(blocks.length).toBeGreaterThanOrEqual(1);
    expect(textoDe(blocks[0])).toContain('Hola mundo');
  });

  it('decodifica entidades en el texto', async () => {
    const blocks = await htmlToPortableText('<p>A &amp; B</p>', { resolveImageUrl: noImg });
    expect(blocks.map(textoDe)).toContain('A & B');
  });
});
