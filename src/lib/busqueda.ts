import { sanityClient } from 'sanity:client';
import { decodificarEntidades } from './entidades';

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

let cacheBusqueda: Promise<ItemBusqueda[]> | null = null;
let cacheCuerpo: Promise<ItemCuerpo[]> | null = null;

export async function getIndexBusqueda(): Promise<ItemBusqueda[]> {
  if (import.meta.env.DEV) return fetchIndexBusqueda();
  if (!cacheBusqueda) cacheBusqueda = fetchIndexBusqueda();
  return cacheBusqueda;
}

async function fetchIndexBusqueda(): Promise<ItemBusqueda[]> {
  const items = await sanityClient.fetch<ItemBusqueda[]>(
    `*[_type == 'publicacion' && defined(slug.current)] | order(publishedAt desc) {
      ${metaFields}
    }`,
  );
  return (items ?? []).map((item) => ({
    ...item,
    title: decodificarEntidades(item.title),
    description: item.description ? decodificarEntidades(item.description) : item.description,
    alt: item.alt ? decodificarEntidades(item.alt) : item.alt,
  }));
}

export async function getIndexCuerpo(): Promise<ItemCuerpo[]> {
  if (import.meta.env.DEV) return fetchIndexCuerpo();
  if (!cacheCuerpo) cacheCuerpo = fetchIndexCuerpo();
  return cacheCuerpo;
}

async function fetchIndexCuerpo(): Promise<ItemCuerpo[]> {
  const items: ItemCuerpo[] = await sanityClient.fetch(
    `*[_type == 'publicacion' && defined(slug.current)] {
      'slug': slug.current,
      'bodyText': pt::text(body)
    }`,
  );
  return items.map((item) => ({
    ...item,
    bodyText: item.bodyText
      ? decodificarEntidades(item.bodyText).slice(0, MAX_BODY_TEXT)
      : item.bodyText,
  }));
}
