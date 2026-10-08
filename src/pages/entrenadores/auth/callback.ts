import type { APIContext } from 'astro';
import { crearClienteSupabase, supabaseConfigurado } from '../../../lib/supabase';
import { sanearNext } from '../../../lib/membresias';

export const prerender = false;

// Callback del enlace mágico. Dos formatos según los ajustes de Supabase:
// - token_hash (recomendado: «Use token hash in email» activado)
// - code (flujo PKCE)
export async function GET(context: APIContext): Promise<Response> {
  if (!supabaseConfigurado()) {
    return context.redirect('/entrenadores/acceder/?aviso=config', 302);
  }

  const supabase = crearClienteSupabase(context);
  const tokenHash = context.url.searchParams.get('token_hash');
  const code = context.url.searchParams.get('code');

  if (tokenHash) {
    await supabase.auth.verifyOtp({ token_hash: tokenHash, type: 'email' });
  } else if (code) {
    await supabase.auth.exchangeCodeForSession(code);
  }

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (user?.email) {
    return context.redirect(sanearNext(context.url.searchParams.get('next')), 302);
  }
  return context.redirect('/entrenadores/acceder/?error=1', 302);
}
