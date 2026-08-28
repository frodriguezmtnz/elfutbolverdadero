import { sanityClient } from 'sanity:client';

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
  etiquetas?: Array<{ name: string }>;
  body?: Array<unknown>;
}

const publicacionFields = `
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
    'asset': asset->{ _id, url },
    alt,
    caption
  },
  'categorias': categorias[]->{ name, 'slug': slug.current },
  'etiquetas': etiquetas[]->{ name },
  'body': body[]{ ..., 'asset': select(_type == 'image' => asset->{_id, url}, null) }
`;

export async function getPublicaciones(): Promise<Publicacion[]> {
  return sanityClient.fetch(
    `*[_type == 'publicacion' && defined(slug.current)] | order(publishedAt desc) {
      ${publicacionFields}
    }`
  );
}

export async function getPublicacionBySlug(slug: string): Promise<Publicacion | null> {
  return sanityClient.fetch(
    `*[_type == 'publicacion' && slug.current == $slug][0] {
      ${publicacionFields}
    }`,
    { slug }
  );
}

export async function getAllSlugs(): Promise<string[]> {
  return sanityClient.fetch(
    `*[_type == 'publicacion' && defined(slug.current)].slug.current`
  );
}

export interface CategoriaConteo {
  name: string;
  slug: string;
  n: number;
}

export async function getEntrevistaDestacada(): Promise<Publicacion | null> {
  return sanityClient.fetch(
    `*[_type == 'publicacion' && tipo == 'entrevista' && defined(slug.current) && defined(description) && defined(mainImage.asset)] | order(publishedAt desc) [0] {
      ${publicacionFields}
    }`
  );
}

export async function getUltimasEntrevistas(limit = 3, excludeId = ''): Promise<Publicacion[]> {
  return sanityClient.fetch(
    `*[_type == 'publicacion' && tipo == 'entrevista' && defined(slug.current) && _id != $excludeId] | order(publishedAt desc) [0...$limit] {
      ${publicacionFields}
    }`,
    { excludeId, limit }
  );
}

export async function getCuadernoDestacado(): Promise<Publicacion | null> {
  return sanityClient.fetch(
    `*[_type == 'publicacion' && tipo in ['articulo', 'opinion'] && defined(slug.current) && defined(description)] | order(publishedAt desc) [0] {
      ${publicacionFields}
    }`
  );
}

export async function getUltimosArticulos(limit = 3, excludeId = ''): Promise<Publicacion[]> {
  return sanityClient.fetch(
    `*[_type == 'publicacion' && tipo in ['articulo', 'opinion'] && defined(slug.current) && _id != $excludeId] | order(publishedAt desc) [0...$limit] {
      ${publicacionFields}
    }`,
    { excludeId, limit }
  );
}

export async function getCategoriasConConteo(minimo = 1): Promise<CategoriaConteo[]> {
  const categorias: CategoriaConteo[] = await sanityClient.fetch(
    `*[_type == 'categoria' && defined(slug.current)] {
      'name': name,
      'slug': slug.current,
      'n': count(*[_type == 'publicacion' && references(^._id)])
    } | order(n desc, name asc)`
  );
  return categorias.filter((c) => c.n >= minimo && !/^sin categor/i.test(c.name));
}

export async function getPublicacionesPorCategoria(slug: string): Promise<Publicacion[]> {
  return sanityClient.fetch(
    `*[_type == 'publicacion' && defined(slug.current) && $slug in categorias[]->slug.current] | order(publishedAt desc) {
      ${publicacionFields}
    }`,
    { slug }
  );
}