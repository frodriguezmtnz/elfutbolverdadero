import { defineMiddleware } from 'astro:middleware';
import { crearClienteSupabase, supabaseConfigurado } from './lib/supabase';
import { obtenerMembresia, suscripcionActiva } from './lib/membresias';

// Guard de la zona FUTBOLVERDADERO ENTRENADORES.
// Con output: 'static' este middleware solo corre en las rutas on-demand
// (prerender = false): las páginas públicas no lo ejecutan ni en build.

// Publicas: landing + login + callbacks del flujo de acceso/pago.
const RUTAS_PUBLICAS = new Set([
  '/entrenadores',
  '/entrenadores/acceder',
  '/entrenadores/auth/callback',
  '/entrenadores/auth/magic',
  '/entrenadores/auth/salir',
  '/entrenadores/auth/suscrito',
]);

// Solo requieren sesión (no suscripción): panel = hub con CTA de pago,
// suscribirse = página que redirige al checkout.
const RUTAS_SOLO_SESION = new Set(['/entrenadores/panel', '/entrenadores/suscribirse']);

function normalizar(pathname: string): string {
  return pathname.replace(/\/+$/, '') || '/';
}

export const onRequest = defineMiddleware(async (context, next) => {
  const ruta = normalizar(context.url.pathname);
  if (ruta !== '/entrenadores' && !ruta.startsWith('/entrenadores/')) return next();
  if (RUTAS_PUBLICAS.has(ruta)) return next();

  if (!supabaseConfigurado()) {
    return context.redirect('/entrenadores/acceder/?aviso=config', 302);
  }

  const supabase = crearClienteSupabase(context);
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user?.email) {
    const nextParam = encodeURIComponent(context.url.pathname + context.url.search);
    return context.redirect(`/entrenadores/acceder/?next=${nextParam}`, 302);
  }

  if (RUTAS_SOLO_SESION.has(ruta)) return next();

  // Fail-closed: cualquier otra ruta bajo /entrenadores/ exige suscripción viva.
  const membresia = await obtenerMembresia(supabase, user.email.toLowerCase());
  if (!suscripcionActiva(membresia)) {
    return context.redirect('/entrenadores/panel/?motivo=suscripcion', 302);
  }
  return next();
});
