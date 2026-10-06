import { sanityClient } from 'sanity:client';

// Datos de FUTBOLVERDADERO ENTRENADORES.
// - `getEjerciciosGratis` / `getHerramientasGratis`: teasers para la landing estática.
// - `getCatalogoEjercicios`: lista ligera (sin desarrollo) de TODO el banco; solo la
//   consume la ruta on-demand `/entrenadores/ejercicios/` para pintar catálogo público.
// - `getEjercicioBySlug`: ficha COMPLETA; solo en rutas on-demand, que deciden en
//   servidor si el visitante (free / socio / nadie) ve el contenido o el candado.
// Nada de esto se prerenderiza en el build estático salvo los teasers gratuitos.

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
  tipoTarea?: string;
  material?: string[];
  categoriasEdad?: string[];
  categorias?: { name: string; slug?: string }[];
  objetivos?: { name: string; slug?: string }[];
  diagrama?: { asset?: { _id?: string; url?: string } | null; alt?: string } | null;
}

export interface EjercicioFicha extends EjercicioTeaser {
  desarrollo?: unknown[];
  claves?: string[];
  errores?: string[];
  variantes?: string[];
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
  tipoTarea,
  material,
  categoriasEdad,
  'categorias': categorias[]->{ name, 'slug': slug.current },
  'objetivos': objetivos[]->{ name, 'slug': slug.current },
  diagrama { 'asset': asset->{_id, url}, alt }
`;

const SIN_BORRADORES = `!(_id in path('drafts.**'))`;

// Ejercicios gratuitos visibles en la landing (los premium no se tocan aquí).
export async function getEjerciciosGratis(limit = 6): Promise<EjercicioTeaser[]> {
  const docs = await sanityClient.fetch<EjercicioTeaser[]>(
    `*[_type == 'ejercicio' && acceso == 'free' && defined(slug.current) && ${SIN_BORRADORES}]
        | order(publishedAt desc)[0...$limit] { ${ejercicioCampos} }`,
    { limit },
  );
  return docs ?? [];
}

// Catálogo ligero del banco completo (free + premium): solo consume metadatos de
// venta; el desarrollo nunca viaja en esta proyección. Ruta on-demand únicamente.
export async function getCatalogoEjercicios(): Promise<EjercicioTeaser[]> {
  const docs = await sanityClient.fetch<EjercicioTeaser[]>(
    `*[_type == 'ejercicio' && defined(slug.current) && ${SIN_BORRADORES}]
        | order(publishedAt desc) { ${ejercicioCampos} }`,
  );
  return docs ?? [];
}

// Ficha COMPLETA por slug. Quien llame debe decidir el acceso en servidor:
// free → todos; premium → solo con suscripción activa.
export async function getEjercicioBySlug(slug: string): Promise<EjercicioFicha | null> {
  const doc = await sanityClient.fetch<EjercicioFicha>(
    `*[_type == 'ejercicio' && slug.current == $slug && ${SIN_BORRADORES}][0] {
      ${ejercicioCampos},
      desarrollo[] { ..., 'asset': select(_type == 'image' => asset->{_id, url, 'dimensions': metadata.dimensions}, null) },
      claves,
      errores,
      variantes
    }`,
    { slug },
  );
  return doc ?? null;
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
    `*[_type == 'herramienta' && acceso == 'free' && defined(slug.current) && ${SIN_BORRADORES}]
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
        && defined(slug.current) && ${SIN_BORRADORES}]
       | order(publishedAt desc)[0...$limit] {
        _id, title, 'slug': slug.current, description, publishedAt
       }`,
    { limit },
  );
  return docs ?? [];
}
