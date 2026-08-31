import rss from '@astrojs/rss';
import type { APIContext } from 'astro';
import { getUltimasPublicaciones } from '../lib/sanity';
import { limpiarDescripcion } from '../lib/texto';

export async function GET(context: APIContext) {
  const publicaciones = await getUltimasPublicaciones(50);

  return rss({
    title: 'El Fútbol Verdadero',
    description:
      'Entrevistas, reflexiones y cuaderno de entrenador sobre fútbol base. Entrenar, pensar, compartir.',
    site: context.site ?? 'https://www.elfutbolverdadero.com',
    trailingSlash: true,
    customData: '<language>es-ES</language>',
    items: publicaciones.map((p) => ({
      title: p.title,
      description: limpiarDescripcion(p.description) ?? '',
      link: `/${p.slug}/`,
      pubDate: p.publishedAt ? new Date(p.publishedAt) : new Date(),
      ...(p.categorias?.length ? { categories: p.categorias.map((c) => c.name) } : {}),
      ...(p.author?.name ? { author: p.author.name } : {}),
    })),
  });
}
