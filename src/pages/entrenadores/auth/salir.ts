import type { APIContext } from 'astro';
import { crearClienteSupabase, supabaseConfigurado } from '../../../lib/supabase';

export const prerender = false;

async function cerrarSesion(context: APIContext): Promise<Response> {
  if (supabaseConfigurado()) {
    const supabase = crearClienteSupabase(context);
    await supabase.auth.signOut();
  }
  return context.redirect('/', 302);
}

export async function GET(context: APIContext): Promise<Response> {
  return cerrarSesion(context);
}

export async function POST(context: APIContext): Promise<Response> {
  return cerrarSesion(context);
}
