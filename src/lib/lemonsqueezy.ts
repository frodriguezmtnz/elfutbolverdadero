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

interface LsEventoSuscripcion {
  suscripcionId: string;
  email: string;
  status: string;
  currentPeriodEnd: string | null;
}

/**
 * Normaliza los eventos de suscripción de Lemon Squeezy al estado de membresía.
 * `renews_at` es el fin del periodo pagado vigente; al cancelar mantiene `ends_at`
 * (acceso hasta el final del periodo ya pagado).
 */
export function normalizarEventoLs(cuerpo: unknown): LsEventoSuscripcion | null {
  const data = (cuerpo as { data?: { id?: string; attributes?: Record<string, unknown> } })?.data;
  if (!data?.id || !data.attributes) return null;
  const a = data.attributes;
  const email = typeof a.user_email === 'string' ? a.user_email.toLowerCase() : null;
  if (!email) return null;
  const status = typeof a.status === 'string' ? a.status : 'unknown';
  const renewsAt = typeof a.renews_at === 'string' ? a.renews_at : null;
  const endsAt = typeof a.ends_at === 'string' ? a.ends_at : null;
  return {
    suscripcionId: data.id,
    email,
    status,
    currentPeriodEnd: renewsAt ?? endsAt,
  };
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
 * Crea un checkout hospedado y devuelve su URL. El email viaja en `custom` para
 * que el webhook pueda enlazar la suscripción con la cuenta aunque el usuario
 * pague con otro email en LS (fallback: user_email del evento).
 */
export async function crearCheckoutLs(email: string, origin: string): Promise<string | null> {
  const apiKey = envVar('LS_API_KEY');
  const storeId = envVar('LS_STORE_ID');
  const variantId = envVar('LS_VARIANT_ID');
  if (!apiKey || !storeId || !variantId) return null;

  const portal = envVar('LS_PORTAL_URL');
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
            custom: { email, desistimiento: 'acceso-inmediato-consentido-v1' },
            pre_filled: portal ? { email } : undefined,
            product_options: { redirect: false },
            checkout_options: {
              redirect_url: `${origin}/entrenadores/auth/suscrito/?origen=checkout`,
            },
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
