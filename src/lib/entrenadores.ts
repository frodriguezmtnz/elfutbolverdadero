import { sanityClient } from 'sanity:client';

// Datos de FUTBOLVERDADERO ENTRENADORES.
// Este módulo solo proyecta campos de TEASER (los que se venden en la landing y
// en la biblioteca filtrable). El contenido completo de los ejercicios (desarrollo,
// claves…) NO se consulta aquí: se servirá en Fase 2-3 desde rutas on-demand
// (`prerender = false`) tras validar la suscripción en el servidor.

export interface EjercicioTeaser {
  _id: string;
  title: string;
  slug: string;
  acceso: string;
  resumen?: string;
  duracionMin?: number;
  jugadoresMin?: number;
  jugadoresMax?: number;
  espacio?: string;
  espacioMedidas?: string;
  categoriasEdad?: string[];
  categorias?: { name: string; slug?: string }[];
  objetivos?: { name: string; slug?: string }[];
  diagrama?: { asset?: { _id?: string; url?: string } | null; alt?: string } | null;
}

export interface HerramientaTeaser {
  _id: string;
  title: string;
  slug: string;
  acceso: string;
  description?: string;
  formato: string;
}

const ejercicioCampos = `
  _id,
  title,
  'slug': slug.current,
  acceso,
  resumen,
  duracionMin,
  jugadoresMin,
  jugadoresMax,
  espacio,
  espacioMedidas,
  categoriasEdad,
  'categorias': categorias[]->{ name, 'slug': slug.current },
  'objetivos': objetivos[]->{ name, 'slug': slug.current },
  diagrama { 'asset': asset->{_id, url}, alt }
`;

// Ejercicios gratuitos visibles en la landing (los premium no se tocan aquí).
export async function getEjerciciosGratis(limit = 6): Promise<EjercicioTeaser[]> {
  const docs = await sanityClient.fetch<EjercicioTeaser[]>(
    `*[_type == 'ejercicio' && acceso == 'free' && defined(slug.current)]
       | order(publishedAt desc)[0...$limit] { ${ejercicioCampos} }`,
    { limit },
  );
  return docs ?? [];
}

// Contador de marketing: tamaño real del banco premium (solo el número, nunca el contenido).
export async function getConteoEjerciciosPremium(): Promise<number> {
  const n = await sanityClient.fetch<number>(
    `count(*[_type == 'ejercicio' && acceso == 'premium' && !(_id in path('drafts.**'))])`,
  );
  return n ?? 0;
}

export async function getHerramientasGratis(limit = 4): Promise<HerramientaTeaser[]> {
  const docs = await sanityClient.fetch<HerramientaTeaser[]>(
    `*[_type == 'herramienta' && acceso == 'free' && defined(slug.current)]
       | order(orden asc, publishedAt desc)[0...$limit] {
        _id, title, 'slug': slug.current, acceso, description, formato
       }`,
    { limit },
  );
  return docs ?? [];
}

// Publicaciones de metodología gratuitas (Fase 4: la premium se servirá
// solo en rutas on-demand tras validar suscripción).
export interface MetodologiaTeaser {
  _id: string;
  title: string;
  slug: string;
  description?: string;
  publishedAt?: string;
}

export async function getMetodologiaGratis(limit = 3): Promise<MetodologiaTeaser[]> {
  const docs = await sanityClient.fetch<MetodologiaTeaser[]>(
    `*[_type == 'publicacion' && tipo == 'metodologia' && coalesce(acceso, 'free') == 'free'
        && defined(slug.current)]
       | order(publishedAt desc)[0...$limit] {
        _id, title, 'slug': slug.current, description, publishedAt
       }`,
    { limit },
  );
  return docs ?? [];
}
