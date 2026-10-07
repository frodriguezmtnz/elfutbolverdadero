// Decisiones puras de la zona FUTBOLVERDADERO ENTRENADORES.
// Viven fuera del middleware y de las páginas para que el fail-closed esté
// fijado por tests unitarios: la identidad (magic link) ≠ el pago (memberships).
// Una sesión sin suscripción NUNCA abre contenido premium.

export type ClaseRuta = 'publica' | 'teaser' | 'solo-sesion' | 'premium';

// Publicas: landing + login + callbacks del flujo de acceso/pago.
const RUTAS_PUBLICAS = new Set([
  '/entrenadores',
  '/entrenadores/acceder',
  '/entrenadores/auth/callback',
  '/entrenadores/auth/magic',
  '/entrenadores/auth/salir',
  '/entrenadores/auth/suscrito',
]);

// Zona pública CON candado por página: catálogo y fichas se sirven sin sesión,
// pero la ruta decide (acceso del doc + estado del visitante) qué se pinta.
const PREFIJOS_TEASER = [
  '/entrenadores/ejercicios',
  '/entrenadores/sesiones',
  '/entrenadores/herramientas',
  '/entrenadores/metodologia',
];

// Solo requieren sesión (no suscripción): panel = hub con CTA de pago,
// suscribirse = página que redirige al checkout.
const RUTAS_SOLO_SESION = new Set(['/entrenadores/panel', '/entrenadores/suscribirse']);

export function normalizarRuta(pathname: string): string {
  return pathname.replace(/\/+$/, '') || '/';
}

export function clasificarRuta(pathname: string): ClaseRuta {
  const ruta = normalizarRuta(pathname);
  if (ruta !== '/entrenadores' && !ruta.startsWith('/entrenadores/')) return 'publica';
  if (RUTAS_PUBLICAS.has(ruta)) return 'publica';
  if (PREFIJOS_TEASER.some((p) => ruta === p || ruta.startsWith(`${p}/`))) return 'teaser';
  if (RUTAS_SOLO_SESION.has(ruta)) return 'solo-sesion';
  return 'premium';
}

export interface ContextoAcceso {
  /** Supabase configurado (si no, todo lo privado redirige con aviso). */
  configurado: boolean;
  /** Email del visitante si tiene sesión; null si es anónimo. */
  email: string | null;
  /** path + search de la petición, para el ?next= del redirect de login. */
  origen: string;
  /** Suscripción viva según `memberships` (solo se consulta en rutas premium). */
  suscripcionViva: boolean;
}

export type Decision = { accion: 'next' } | { accion: 'redirect'; destino: string };

export function decidirAcceso(clase: ClaseRuta, ctx: ContextoAcceso): Decision {
  if (clase === 'publica' || clase === 'teaser') return { accion: 'next' };
  if (!ctx.configurado) {
    return { accion: 'redirect', destino: '/entrenadores/acceder/?aviso=config' };
  }
  if (!ctx.email) {
    return {
      accion: 'redirect',
      destino: `/entrenadores/acceder/?next=${encodeURIComponent(ctx.origen)}`,
    };
  }
  if (clase === 'solo-sesion') return { accion: 'next' };
  // Fail-closed: cualquier otra ruta bajo /entrenadores/ exige suscripción viva.
  return ctx.suscripcionViva
    ? { accion: 'next' }
    : { accion: 'redirect', destino: '/entrenadores/panel/?motivo=suscripcion' };
}

// Gate por página (ficha de ejercicio y futuros contenidos):
// free (o acceso ausente, como coalesce(acceso,'free') en Sanity) es público;
// premium exige suscripción viva. El magic link solo no basta.
export function puedeVerContenido(
  acceso: string | null | undefined,
  suscripcionViva: boolean,
): boolean {
  return acceso !== 'premium' || suscripcionViva;
}
