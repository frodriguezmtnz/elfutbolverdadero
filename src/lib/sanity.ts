import { sanityClient } from 'sanity:client';
import type { QueryParams } from '@sanity/client';
import { decodificarEntidades } from './entidades';

export interface Publicacion {
  _id: string;
  title: string;
  slug: string;
  tipo: string;
  club?: string;
  description?: string;
  publishedAt?: string;
  updatedAt?: string;
  seoTitle?: string;
  seoDescription?: string;
  readingTime?: string;
  wpId?: number;
  wpUrl?: string;
  author?: {
    name: string;
    role?: string;
    image?: {
      asset?: {
        _ref?: string;
        _id?: string;
        url?: string;
      };
    };
  };
  mainImage?: {
    asset?: {
      _ref?: string;
      _id?: string;
      url?: string;
    };
    alt?: string;
    caption?: string;
  };
  categorias?: Array<{ name: string; slug?: string }>;
  etiquetas?: Array<{ name: string; slug?: string }>;
  body?: Array<unknown>;
}

const baseFields = `
  _id,
  title,
  'slug': slug.current,
  tipo,
  club,
  description,
  publishedAt,
  updatedAt,
  seoTitle,
  seoDescription,
  readingTime,
  wpId,
  wpUrl,
  'author': author->{ name, role, 'image': image.asset->{ _id, url } },
  'mainImage': mainImage {
    'asset': asset->{ _id, url, 'dimensions': metadata.dimensions },
    alt,
    caption
  },
  'categorias': categorias[]->{ name, 'slug': slug.current },
  'etiquetas': etiquetas[]->{ name, 'slug': slug.current }
`;

const publicacionFields = `
  ${baseFields},
  'body': body[]{ ..., 'asset': select(_type == 'image' => asset->{_id, url, 'dimensions': metadata.dimensions}, null) }
`;

interface BloqueBody {
  _type?: string;
  children?: Array<Record<string, unknown>>;
}

// Limpia las entidades HTML residuales de WordPress en un doc de publicacion
// (titulo, resumen, SEO, alt/caption, body) para que se muestren como caracteres reales.
export function sanearPublicacion<T extends Partial<Publicacion>>(pub: T): T {
  const p = pub as Record<string, unknown>;
  for (const k of ['title', 'club', 'description', 'seoTitle', 'seoDescription', 'readingTime']) {
    if (typeof p[k] === 'string') p[k] = decodificarEntidades(p[k] as string);
  }
  const author = p.author as { name?: string; role?: string } | undefined;
  if (author) {
    if (typeof author.name === 'string') author.name = decodificarEntidades(author.name);
    if (typeof author.role === 'string') author.role = decodificarEntidades(author.role);
  }
  const img = p.mainImage as { alt?: string; caption?: string } | undefined;
  if (img) {
    if (typeof img.alt === 'string') img.alt = decodificarEntidades(img.alt);
    if (typeof img.caption === 'string') img.caption = decodificarEntidades(img.caption);
  }
  for (const coleccion of ['categorias', 'etiquetas'] as const) {
    const arr = p[coleccion] as Array<{ name?: string }> | undefined;
    if (Array.isArray(arr)) {
      for (const item of arr) {
        if (typeof item?.name === 'string') item.name = decodificarEntidades(item.name);
      }
    }
  }
  const body = p.body;
  if (Array.isArray(body)) {
    for (const bloque of body as BloqueBody[]) {
      if (Array.isArray(bloque?.children)) {
        for (const hijo of bloque.children) {
          if (typeof hijo.text === 'string') hijo.text = decodificarEntidades(hijo.text);
        }
      }
    }
  }
  return pub;
}

async function fetchDocs(query: string, params?: QueryParams): Promise<Publicacion[]> {
  const docs = params
    ? await sanityClient.fetch<Publicacion[]>(query, params)
    : await sanityClient.fetch<Publicacion[]>(query);
  return (docs ?? []).map(sanearPublicacion);
}

async function fetchDoc(query: string, params?: QueryParams): Promise<Publicacion | null> {
  const doc = params
    ? await sanityClient.fetch<Publicacion | null>(query, params)
    : await sanityClient.fetch<Publicacion | null>(query);
  return doc ? sanearPublicacion(doc) : null;
}

export async function getPublicaciones(): Promise<Publicacion[]> {
  return fetchDocs(
    `*[_type == 'publicacion' && defined(slug.current)] | order(publishedAt desc) {
      ${publicacionFields}
    }`,
  );
}

export async function getPublicacionBySlug(slug: string): Promise<Publicacion | null> {
  return fetchDoc(
    `*[_type == 'publicacion' && slug.current == $slug][0] {
      ${publicacionFields}
    }`,
    { slug },
  );
}

export async function getAllSlugs(): Promise<string[]> {
  return sanityClient.fetch<string[]>(
    `*[_type == 'publicacion' && defined(slug.current)].slug.current`,
  );
}

export interface CategoriaConteo {
  name: string;
  slug: string;
  n: number;
}

export async function getEntrevistaDestacada(): Promise<Publicacion | null> {
  return fetchDoc(
    `*[_type == 'publicacion' && tipo == 'entrevista' && defined(slug.current) && defined(description) && defined(mainImage.asset)] | order(publishedAt desc) [0] {
      ${publicacionFields}
    }`,
  );
}

export async function getUltimasEntrevistas(limit = 3, excludeId = ''): Promise<Publicacion[]> {
  return fetchDocs(
    `*[_type == 'publicacion' && tipo == 'entrevista' && defined(slug.current) && _id != $excludeId] | order(publishedAt desc) [0...$limit] {
      ${publicacionFields}
    }`,
    { excludeId, limit },
  );
}

export async function getTodasEntrevistas(): Promise<Publicacion[]> {
  return fetchDocs(
    `*[_type == 'publicacion' && tipo == 'entrevista' && defined(slug.current)] | order(publishedAt desc) {
      ${baseFields}
    }`,
  );
}

export async function getUltimasPublicaciones(limit = 50): Promise<Publicacion[]> {
  return fetchDocs(
    `*[_type == 'publicacion' && defined(slug.current)] | order(publishedAt desc) [0...$limit] {
      ${baseFields}
    }`,
    { limit },
  );
}

export async function getCuadernoDestacado(): Promise<Publicacion | null> {
  return fetchDoc(
    `*[_type == 'publicacion' && tipo in ['articulo', 'opinion'] && defined(slug.current) && defined(description)] | order(publishedAt desc) [0] {
      ${publicacionFields}
    }`,
  );
}

export async function getUltimosArticulos(limit = 3, excludeId = ''): Promise<Publicacion[]> {
  return fetchDocs(
    `*[_type == 'publicacion' && tipo in ['articulo', 'opinion'] && defined(slug.current) && _id != $excludeId] | order(publishedAt desc) [0...$limit] {
      ${publicacionFields}
    }`,
    { excludeId, limit },
  );
}

export async function getCategoriasConConteo(minimo = 1): Promise<CategoriaConteo[]> {
  const categorias: CategoriaConteo[] = await sanityClient.fetch(
    `*[_type == 'categoria' && defined(slug.current)] {
      'name': name,
      'slug': slug.current,
      'n': count(*[_type == 'publicacion' && references(^._id)])
    } | order(n desc, name asc)`,
  );
  return categorias.filter((c) => c.n >= minimo && !/^sin categor/i.test(c.name));
}

export async function getPublicacionesPorCategoria(slug: string): Promise<Publicacion[]> {
  return fetchDocs(
    `*[_type == 'publicacion' && defined(slug.current) && $slug in categorias[]->slug.current] | order(publishedAt desc) {
      ${baseFields}
    }`,
    { slug },
  );
}

export interface EtiquetaConteo {
  name: string;
  slug?: string;
  n: number;
}

export async function getEtiquetasConConteo(minimo = 1): Promise<EtiquetaConteo[]> {
  const etiquetas: EtiquetaConteo[] = await sanityClient.fetch(
    `*[_type == 'etiqueta'] {
      'name': name,
      'slug': slug.current,
      'n': count(*[_type == 'publicacion' && references(^._id)])
    } | order(n desc, name asc)`,
  );
  return etiquetas.filter((e) => e.n >= minimo);
}

export async function getPublicacionesPorEtiqueta(name: string): Promise<Publicacion[]> {
  return fetchDocs(
    `*[_type == 'publicacion' && defined(slug.current) && $name in etiquetas[]->name] | order(publishedAt desc) {
      ${baseFields}
    }`,
    { name },
  );
}

export interface WebAmiga {
  _id: string;
  name: string;
  url: string;
  description?: string;
  logo?: {
    asset?: {
      _id?: string;
      url?: string;
    };
  };
}

export async function getWebsAmigas(): Promise<WebAmiga[]> {
  return sanityClient.fetch<WebAmiga[]>(
    `*[_type == 'webAmiga' && !(_id in path('drafts.**'))] | order(order asc, name asc) {
      _id,
      name,
      url,
      description,
      'logo': { 'asset': logo.asset->{ _id, url } }
    }`,
  );
}
