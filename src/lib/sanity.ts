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

// En build/SSG todas las rutas se renderizan en el mismo proceso de Node: se trae
// UNA vez el dataset completo de publicaciones y el resto se deriva en memoria.
// Sin esto, cada página de artículo lanzaba 2 consultas HTTP a Sanity (~400ms) y
// el build de CI superaba los 8 minutos. En dev no se cachea para ver datos frescos.
const QUERY_TODAS_PUBLICACIONES = `
  *[_type == 'publicacion' && defined(slug.current)] | order(publishedAt desc) {
    ${publicacionFields}
  }
`;

let cachePublicaciones: Promise<Publicacion[]> | null = null;

async function loadPublicaciones(): Promise<Publicacion[]> {
  if (import.meta.env.DEV) return fetchDocs(QUERY_TODAS_PUBLICACIONES);
  if (!cachePublicaciones) cachePublicaciones = fetchDocs(QUERY_TODAS_PUBLICACIONES);
  return cachePublicaciones;
}

export async function getPublicaciones(): Promise<Publicacion[]> {
  return (await loadPublicaciones()).slice();
}

export async function getPublicacionBySlug(slug: string): Promise<Publicacion | null> {
  const todas = await loadPublicaciones();
  return todas.find((p) => p.slug === slug) ?? null;
}

export async function getAllSlugs(): Promise<string[]> {
  const todas = await loadPublicaciones();
  return todas.map((p) => p.slug);
}

export interface CategoriaConteo {
  name: string;
  slug: string;
  n: number;
}

export async function getEntrevistaDestacada(): Promise<Publicacion | null> {
  const todas = await loadPublicaciones();
  return (
    todas.find(
      (p) => p.tipo === 'entrevista' && p.description != null && p.mainImage?.asset != null,
    ) ?? null
  );
}

export async function getUltimasEntrevistas(limit = 3, excludeId = ''): Promise<Publicacion[]> {
  const todas = await loadPublicaciones();
  return todas.filter((p) => p.tipo === 'entrevista' && p._id !== excludeId).slice(0, limit);
}

export async function getTodasEntrevistas(): Promise<Publicacion[]> {
  const todas = await loadPublicaciones();
  return todas.filter((p) => p.tipo === 'entrevista');
}

export async function getUltimasPublicaciones(limit = 50): Promise<Publicacion[]> {
  const todas = await loadPublicaciones();
  return todas.slice(0, limit);
}

export async function getCuadernoDestacado(): Promise<Publicacion | null> {
  const todas = await loadPublicaciones();
  return (
    todas.find((p) => (p.tipo === 'articulo' || p.tipo === 'opinion') && p.description != null) ??
    null
  );
}

export async function getUltimosArticulos(limit = 3, excludeId = ''): Promise<Publicacion[]> {
  const todas = await loadPublicaciones();
  return todas
    .filter((p) => (p.tipo === 'articulo' || p.tipo === 'opinion') && p._id !== excludeId)
    .slice(0, limit);
}

let cacheCategorias: Promise<CategoriaConteo[]> | null = null;

async function loadCategorias(): Promise<CategoriaConteo[]> {
  const query = `*[_type == 'categoria' && defined(slug.current)] {
    'name': name,
    'slug': slug.current,
    'n': count(*[_type == 'publicacion' && references(^._id)])
  } | order(n desc, name asc)`;
  if (import.meta.env.DEV) return sanityClient.fetch<CategoriaConteo[]>(query);
  if (!cacheCategorias) cacheCategorias = sanityClient.fetch<CategoriaConteo[]>(query);
  return cacheCategorias;
}

export async function getCategoriasConConteo(minimo = 1): Promise<CategoriaConteo[]> {
  const categorias = await loadCategorias();
  return categorias.filter((c) => c.n >= minimo && !/^sin categor/i.test(c.name));
}

export async function getPublicacionesPorCategoria(slug: string): Promise<Publicacion[]> {
  const todas = await loadPublicaciones();
  return todas.filter((p) => p.categorias?.some((c) => c.slug === slug));
}

export interface EtiquetaConteo {
  name: string;
  slug?: string;
  n: number;
}

let cacheEtiquetas: Promise<EtiquetaConteo[]> | null = null;

async function loadEtiquetas(): Promise<EtiquetaConteo[]> {
  const query = `*[_type == 'etiqueta'] {
    'name': name,
    'slug': slug.current,
    'n': count(*[_type == 'publicacion' && references(^._id)])
  } | order(n desc, name asc)`;
  if (import.meta.env.DEV) return sanityClient.fetch<EtiquetaConteo[]>(query);
  if (!cacheEtiquetas) cacheEtiquetas = sanityClient.fetch<EtiquetaConteo[]>(query);
  return cacheEtiquetas;
}

export async function getEtiquetasConConteo(minimo = 1): Promise<EtiquetaConteo[]> {
  const etiquetas = await loadEtiquetas();
  return etiquetas.filter((e) => e.n >= minimo);
}

export async function getPublicacionesPorEtiqueta(name: string): Promise<Publicacion[]> {
  const todas = await loadPublicaciones();
  return todas.filter((p) => p.etiquetas?.some((e) => e.name === name));
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
