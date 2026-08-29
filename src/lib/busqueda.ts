import { sanityClient } from 'sanity:client';

export interface ItemBusqueda {
  _id: string;
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
  bodyText?: string;
}

const indexFields = `
  _id,
  title,
  'slug': slug.current,
  tipo,
  club,
  description,
  publishedAt,
  'categorias': categorias[]->name,
  'etiquetas': etiquetas[]->name,
  'imagen': mainImage.asset.url,
  'alt': mainImage.alt,
  'bodyText': pt::text(body)
`;

const MAX_BODY_TEXT = 4000;

export async function getIndexBusqueda(): Promise<ItemBusqueda[]> {
  const items: ItemBusqueda[] = await sanityClient.fetch(
    `*[_type == 'publicacion' && defined(slug.current)] | order(publishedAt desc) {
      ${indexFields}
    }`
  );
  return items.map((item) => ({
    ...item,
    bodyText: item.bodyText ? item.bodyText.slice(0, MAX_BODY_TEXT) : item.bodyText,
  }));
}
