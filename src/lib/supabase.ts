import { createServerClient } from '@supabase/ssr';
import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import type { APIContext } from 'astro';

// En Vercel (Node runtime) las variables llegan por process.env en las funciones
// on-demand; en dev las carga dotenv desde .env (astro.config.mjs ya lo importa).
function envVar(nombre: string): string | undefined {
  return process.env[nombre]?.trim() || undefined;
}

export function supabaseConfigurado(): boolean {
  return !!(envVar('SUPABASE_URL') && envVar('SUPABASE_ANON_KEY'));
}

/**
 * Cliente Supabase ligado a la sesión del navegador (cookies). Respeta RLS:
 * `auth.getUser()` valida la cookie y las consultas ven solo las propias filas.
 */
export function crearClienteSupabase(context: APIContext): SupabaseClient {
  const url = envVar('SUPABASE_URL');
  const anonKey = envVar('SUPABASE_ANON_KEY');
  if (!url || !anonKey) {
    throw new Error('Faltan SUPABASE_URL / SUPABASE_ANON_KEY para una ruta on-demand');
  }
  return createServerClient(url, anonKey, {
    cookies: {
      getAll() {
        // Astro no expone cookies.getAll en esta versión: se parsea el header.
        const header = context.request.headers.get('cookie');
        if (!header) return [];
        return header
          .split(/;\s*/)
          .filter(Boolean)
          .map((par) => {
            const i = par.indexOf('=');
            if (i < 0) return { name: par, value: '' };
            return { name: par.slice(0, i), value: decodeURIComponent(par.slice(i + 1)) };
          });
      },
      setAll(cookiesToSet) {
        for (const { name, value, options } of cookiesToSet) {
          context.cookies.set(name, value, options);
        }
      },
    },
  });
}

/**
 * Cliente con service_role: SOLO para el webhook de Lemon Squeezy (saltar RLS).
 * No usar nunca en rutas de usuario ni exponer la clave al navegador.
 */
export function crearClienteServicio(): SupabaseClient {
  const url = envVar('SUPABASE_URL');
  const serviceKey = envVar('SUPABASE_SERVICE_ROLE_KEY');
  if (!url || !serviceKey) {
    throw new Error('Faltan SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY (webhook)');
  }
  return createClient(url, serviceKey, { auth: { persistSession: false } });
}

export async function usuarioActual(context: APIContext): Promise<{ email: string } | null> {
  if (!supabaseConfigurado()) return null;
  const supabase = crearClienteSupabase(context);
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return user?.email ? { email: user.email.toLowerCase() } : null;
}
