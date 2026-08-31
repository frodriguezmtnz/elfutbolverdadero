import type { APIRoute } from 'astro';
import { getIndexCuerpo } from '../lib/busqueda';

export const GET: APIRoute = async () => {
  const items = await getIndexCuerpo();
  return new Response(JSON.stringify(items), {
    headers: {
      'Content-Type': 'application/json; charset=utf-8',
    },
  });
};
