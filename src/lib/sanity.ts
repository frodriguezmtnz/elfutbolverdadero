import { sanityClient } from 'sanity:client';

export interface Publicacion {
  _id: string;
  title: string;
  slug: string;
  tipo: string;
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
  'etiquetas': etiquetas[]->{ name }
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