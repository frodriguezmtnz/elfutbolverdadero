import type { SupabaseClient } from '@supabase/supabase-js';

// Estado de la suscripción en la tabla `memberships` de Supabase (Postgres).
// Las funciones de decisión son puras para poder testearlas sin red.

export interface Membresia {
  email: string;
  user_id?: string | null;
  ls_subscription_id?: string | null;
  ls_customer_id?: string | null;
  status: string;
  current_period_end?: string | null;
}

export const RUTA_POR_DEFECTO = '/entrenadores/panel/';

/**
 * Acceso válido si la suscripción está viva ahora mismo:
 * - active/trialing: sin fecha fin → válida; con fecha → debe ser futura.
 * - past_due (reintento de cobro) y cancelled (mantiene el periodo pagado):
 *   solo mientras current_period_end no haya pasado.
 */
export function suscripcionActiva(m: Membresia | null, ahora: Date = new Date()): boolean {
  if (!m) return false;
  const fin = m.current_period_end ? new Date(m.current_period_end) : null;
  if (m.status === 'active' || m.status === 'trialing') {
    return !fin || Number.isNaN(fin.getTime()) || fin.getTime() > ahora.getTime();
  }
  if (m.status === 'past_due' || m.status === 'cancelled') {
    return !!fin && !Number.isNaN(fin.getTime()) && fin.getTime() > ahora.getTime();
  }
  return false;
}

/** Redirecciones post-login: solo rutas internas de la zona de entrenadores. */
export function sanearNext(next: string | null | undefined): string {
  if (!next) return RUTA_POR_DEFECTO;
  if (!next.startsWith('/') || next.startsWith('//')) return RUTA_POR_DEFECTO;
  if (!next.startsWith('/entrenadores/')) return RUTA_POR_DEFECTO;
  return next;
}

export async function obtenerMembresia(
  supabase: SupabaseClient,
  email: string,
): Promise<Membresia | null> {
  const { data } = await supabase
    .from('memberships')
    .select('*')
    .eq('email', email.toLowerCase())
    .maybeSingle();
  return (data as Membresia | null) ?? null;
}

export function estadoParaPanel(m: Membresia | null, ahora: Date = new Date()) {
  if (suscripcionActiva(m, ahora)) {
    return {
      clase: 'activa' as const,
      etiqueta: 'Suscripción activa',
      hasta: m?.current_period_end
        ? new Date(m.current_period_end).toLocaleDateString('es-ES')
        : null,
    };
  }
  if (m && (m.status === 'cancelled' || m.status === 'expired' || m.status === 'unpaid')) {
    return { clase: 'caducada' as const, etiqueta: 'Suscripción terminada', hasta: null };
  }
  return { clase: 'sin-acceso' as const, etiqueta: 'Sin suscripción', hasta: null };
}
