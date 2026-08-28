import { htmlToBlocks } from '@sanity/block-tools';

// Mini-schema de bloque para que block-tools sepa los estilos válidos
const blockContentType = {
  name: 'body',
  type: 'array',
  of: [
    { type: 'block', styles: [{ title: 'Normal', value: 'normal' }, { title: 'H2', value: 'h2' }, { title: 'H3', value: 'h3' }] },
    { type: 'image' },
    { type: 'embed' },
  ],
};

function htmlEntityDecode(s = '') {
  return s
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#0?39;/g, "'")
    .replace(/&nbsp;/g, ' ');
}

// Recorta un HTML en "segmentos": textos/bloques y elementos especiales (iframe, img, blockquote)
function tokenize(html) {
  const tokens = [];
  const blockRe = /<(h[123]|p|li|blockquote)\b[^>]*>([\s\S]*?)<\/\1>|<(iframe|img)\b[^>]*\/?>/gi;
  let lastIndex = 0;
  let match;
  while ((match = blockRe.exec(html)) !== null) {
    const before = html.slice(lastIndex, match.index);
    if (before.trim()) tokens.push({ type: 'text', html: before });
    const tag = match[1] ?? match[3];
    if (tag === 'iframe') {
      const src = match[0].match(/src="([^"]*)"/)?.[1] ?? '';
      tokens.push({ type: 'iframe', src });
    } else if (tag === 'img') {
      const src = match[0].match(/src="([^"]*)"/)?.[1] ?? '';
      tokens.push({ type: 'img', src });
    } else if (tag) {
      const inner = match[2];
      const style = tag === 'h1' ? 'h2' : tag === 'h2' ? 'h2' : tag === 'h3' ? 'h3' : 'normal';
      tokens.push({ type: 'block', tag, inner, style });
    }
    lastIndex = match.index + match[0].length;
  }
  const after = html.slice(lastIndex);
  if (after.trim()) tokens.push({ type: 'text', html: after });
  return tokens;
}

export async function htmlToPortableText(html, { resolveImageUrl }) {
  const blocks = [];
  const tokens = tokenize(html);

  for (const tok of tokens) {
    if (tok.type === 'text') {
      // Convertir bloques de texto restantes con block-tools (seguro)
      try {
        const converted = htmlToBlocks(tok.html, blockContentType);
        blocks.push(...converted.filter((b) => b._type === 'block'));
      } catch {
        // fallback: texto plano
        const txt = htmlEntityDecode(tok.html).replace(/<[^>]+>/g, '').trim();
        if (txt) blocks.push({ _type: 'block', style: 'normal', children: [{ _type: 'span', text: txt }] });
      }
    } else if (tok.type === 'block') {
      const text = htmlEntityDecode(tok.inner.replace(/<[^>]+>/g, '')).trim();
      if (!text) continue;
      blocks.push({
        _type: 'block',
        style: tok.style ?? 'normal',
        children: [{ _type: 'span', marks: [], text }],
      });
    } else if (tok.type === 'iframe') {
      blocks.push({ _type: 'embed', url: tok.src, title: 'Audio/vídeo' });
    } else if (tok.type === 'img') {
      const assetRef = await resolveImageUrl(tok.src);
      if (assetRef) {
        blocks.push({ _type: 'image', asset: { _type: 'reference', _ref: assetRef } });
      }
    }
  }

  return blocks;
}