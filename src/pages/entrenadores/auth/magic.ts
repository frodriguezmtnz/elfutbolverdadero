import type { APIContext } from 'astro';
import { crearClienteSupabase, supabaseConfigurado } from '../../../lib/supabase';
import { sanearNext } from '../../../lib/membresias';

export const prerender = false;

const EMAIL_RE = /^[^@\s]+@[^@\s]+\.[^@\s]+$/;

export async function POST(context: APIContext): Promise<Response> {
  const form = await context.request.formData();
  const email = String(form.get('email') ?? '')
    .trim()
    .toLowerCase();
  const next = sanearNext(String(form.get('next') ?? ''));

  if (!EMAIL_RE.test(email)) {
    return context.redirect('/entrenadores/acceder/?error=email', 302);
  }
  if (!supabaseConfigurado()) {
    return context.redirect('/entrenadores/acceder/?aviso=config', 302);
  }

  const supabase = crearClienteSupabase(context);
  const { error } = await supabase.auth.signInWithOtp({
    email,
    options: {
      emailRedirectTo: new URL(
        `/entrenadores/auth/callback/?next=${encodeURIComponent(next)}`,
        context.url.origin,
      ).href,
    },
  });

  // No distinguimos "usuario no existe": un desconocido que pague recibirá el
  // enlace igualmente (Supabase crea la cuenta al verificar el OTP).
  if (error) {
    return context.redirect('/entrenadores/acceder/?error=1', 302);
  }
  return context.redirect('/entrenadores/acceder/?enviado=1', 302);
}
