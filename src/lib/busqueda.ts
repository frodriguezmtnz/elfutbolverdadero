import { sanityClient } from 'sanity:client';

export interface ItemBusqueda {
  title: string;
  slug: string;
  tipo: string;
  club?: string;
  description?: string;
  publishedAt?: string;
  categorias?: string[];
  etiquetas?: string[];
  imagen?: string;
  alt?: string;
}

export interface ItemCuerpo {
  slug: string;
  bodyText?: string;
}

const metaFields = `
  title,
  'slug': slug.current,
  tipo,
  club,
  description,
  publishedAt,
  'categorias': categorias[]->name,
  'etiquetas': etiquetas[]->name,
  'imagen': mainImage.asset.url,
  'alt': mainImage.alt
`;

const MAX_BODY_TEXT = 4000;

export async function getIndexBusqueda(): Promise<ItemBusqueda[]> {
  return sanityClient.fetch(
    `*[_type == 'publicacion' && defined(slug.current)] | order(publishedAt desc) {
      ${metaFields}
    }`,
  );
}

export async function getIndexCuerpo(): Promise<ItemCuerpo[]> {
  const items: ItemCuerpo[] = await sanityClient.fetch(
    `*[_type == 'publicacion' && defined(slug.current)] {
      'slug': slug.current,
      'bodyText': pt::text(body)
    }`,
  );
  return items.map((item) => ({
    ...item,
    bodyText: item.bodyText ? item.bodyText.slice(0, MAX_BODY_TEXT) : item.bodyText,
  }));
}
