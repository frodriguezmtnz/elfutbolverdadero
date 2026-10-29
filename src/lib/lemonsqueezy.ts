import { createHmac, timingSafeEqual } from 'node:crypto';
import type { SupabaseClient } from '@supabase/supabase-js';
import type { Membresia } from './membresias';

// Lemon Squeezy actúa como Merchant of Record: cobra, factura y gestiona el IVA.
// Aquí solo: verificar la firma del webhook y crear checkouts desde el servidor.

function envVar(nombre: string): string | undefined {
  return process.env[nombre]?.trim() || undefined;
}

/** Firma HMAC-SHA256 (hex) del cuerpo RAW del webhook con el secreto del endpoint. */
export function verificarFirmaLs(rawBody: string, firma: string, secreto: string): boolean {
  const esperado = createHmac('sha256', secreto).update(rawBody, 'utf8').digest('hex');
  const a = Buffer.from(esperado, 'utf8');
  const b = Buffer.from(firma, 'utf8');
  return a.length === b.length && timingSafeEqual(a, b);
}

export interface LsEventoSuscripcion {
  suscripcionId: string;
  email: string;
  status: string;
  currentPeriodEnd: string | null;
  variantId: string | null;
}

/**
 * Normaliza los eventos de suscripción de Lemon Squeezy al estado de membresía.
 * El email sale de `meta.custom_data.email` (lo envía nuestro checkout) para que
 * la membresía quede ligada a la cuenta con la que se pidió el magic link, aunque
 * el comprador cambie el correo en la pasarela. Fallback: `user_email` del evento.
 * `renews_at` es el fin del periodo pagado vigente; al cancelar mantiene `ends_at`.
 */
export function normalizarEventoLs(cuerpo: unknown): LsEventoSuscripcion | null {
  const data = (cuerpo as { data?: { id?: string; attributes?: Record<string, unknown> } })?.data;
  if (!data?.id || !data.attributes) return null;
  const a = data.attributes;

  const meta = (cuerpo as { meta?: { custom_data?: Record<string, unknown> } })?.meta;
  const customEmail =
    typeof meta?.custom_data?.email === 'string'
      ? meta.custom_data.email.trim().toLowerCase()
      : null;
  const userEmail = typeof a.user_email === 'string' ? a.user_email.trim().toLowerCase() : null;
  const email = customEmail || userEmail;
  if (!email) return null;

  const status = typeof a.status === 'string' ? a.status.toLowerCase() : 'unknown';
  const renewsAt = typeof a.renews_at === 'string' ? a.renews_at : null;
  const endsAt = typeof a.ends_at === 'string' ? a.ends_at : null;
  const variantId =
    typeof a.variant_id === 'number' || typeof a.variant_id === 'string'
      ? String(a.variant_id)
      : null;
  return {
    suscripcionId: data.id,
    email,
    status,
    currentPeriodEnd: renewsAt ?? endsAt,
    variantId,
  };
}

/**
 * Si la tienda vende más de un producto en el futuro, solo los eventos de la
 * variante suscrita (12 €/año) deben abrir la zona. Si el payload no trae
 * `variant_id`, no bloqueamos: preferimos dar acceso a un socio real antes que
 * dejarlo fuera por un cambio de formato de LS.
 */
export function esVarianteEsperada(
  evento: LsEventoSuscripcion,
  variantEsperada: string | null,
): boolean {
  if (!variantEsperada || !evento.variantId) return true;
  return evento.variantId === variantEsperada;
}

/** Escribe/actualiza la fila de membresía (cliente service_role, upsert por email). */
export async function sincronizarMembresia(
  servicio: SupabaseClient,
  evento: LsEventoSuscripcion,
): Promise<void> {
  const ahora = new Date().toISOString();
  const valores: Partial<Membresia> & { email: string; updated_at: string } = {
    email: evento.email,
    ls_subscription_id: evento.suscripcionId,
    status: evento.status,
    current_period_end: evento.currentPeriodEnd,
    updated_at: ahora,
  };
  await servicio.from('memberships').upsert(valores, { onConflict: 'email' });
}

export function lemonsqueezyConfigurado(): boolean {
  return !!(envVar('LS_API_KEY') && envVar('LS_STORE_ID') && envVar('LS_VARIANT_ID'));
}

/**
 * Crea un checkout hospedado y devuelve su URL. El email se prellena en
 * `checkout_data.email` y viaja también en `custom` para que el webhook ligue
 * la suscripción a la cuenta aunque el comprador cambie el correo en LS.
 * El retorno tras el pago vive en `product_options.redirect_url` (API de LS).
 */
export async function crearCheckoutLs(email: string, origin: string): Promise<string | null> {
  const apiKey = envVar('LS_API_KEY');
  const storeId = envVar('LS_STORE_ID');
  const variantId = envVar('LS_VARIANT_ID');
  if (!apiKey || !storeId || !variantId) return null;

  const res = await fetch('https://api.lemonsqueezy.com/v1/checkouts', {
    method: 'POST',
    headers: {
      Accept: 'application/vnd.api+json',
      'Content-Type': 'application/vnd.api+json',
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      data: {
        type: 'checkouts',
        attributes: {
          checkout_data: {
            email,
            custom: { email, desistimiento: 'acceso-inmediato-consentido-v1' },
          },
          product_options: {
            redirect_url: `${origin}/entrenadores/auth/suscrito/?origen=checkout`,
          },
          preview: false,
          test_mode: envVar('LS_TEST_MODE') === '1',
        },
        relationships: {
          store: { data: { type: 'stores', id: storeId } },
          variant: { data: { type: 'variants', id: variantId } },
        },
      },
    }),
  });

  if (!res.ok) return null;
  const json = (await res.json()) as { data?: { attributes?: { url?: string } } };
  return json.data?.attributes?.url ?? null;
}
