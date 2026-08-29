import type { APIRoute } from 'astro';
import { getIndexBusqueda } from '../lib/busqueda';

export const GET: APIRoute = async () => {
  const items = await getIndexBusqueda();
  return new Response(JSON.stringify(items), {
    headers: {
      'Content-Type': 'application/json; charset=utf-8',
    },
  });
};
