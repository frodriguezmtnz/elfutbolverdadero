import { defineMiddleware } from 'astro:middleware';
import { crearClienteSupabase, supabaseConfigurado } from './lib/supabase';
import { obtenerMembresia, suscripcionActiva } from './lib/membresias';
import { clasificarRuta, decidirAcceso } from './lib/acceso-entrenadores';

// Guard de la zona FUTBOLVERDADERO ENTRENADORES.
// Con output: 'static' este middleware solo corre en las rutas on-demand
// (prerender = false): las páginas públicas no lo ejecutan ni en build.
// La decisión pura (clasificar + decidir) vive en src/lib/acceso-entrenadores.ts
// y está cubierta por tests unitarios (fail-closed).

export const onRequest = defineMiddleware(async (context, next) => {
  const clase = clasificarRuta(context.url.pathname);
  if (clase === 'publica' || clase === 'teaser') return next();

  const configurado = supabaseConfigurado();
  let email: string | null = null;
  let suscripcionViva = false;
  if (configurado) {
    const supabase = crearClienteSupabase(context);
    const {
      data: { user },
    } = await supabase.auth.getUser();
    email = user?.email ?? null;
    if (email && clase === 'premium') {
      const membresia = await obtenerMembresia(supabase, email.toLowerCase());
      suscripcionViva = suscripcionActiva(membresia);
    }
  }

  const decision = decidirAcceso(clase, {
    configurado,
    email,
    origen: context.url.pathname + context.url.search,
    suscripcionViva,
  });
  if (decision.accion === 'redirect') return context.redirect(decision.destino, 302);
  return next();
});
