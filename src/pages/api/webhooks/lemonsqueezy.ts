import type { APIContext } from 'astro';
import { crearClienteServicio, supabaseConfigurado } from '../../../lib/supabase';
import { enviarBienvenida } from '../../../lib/emails';
import {
  normalizarEventoLs,
  sincronizarMembresia,
  verificarFirmaLs,
} from '../../../lib/lemonsqueezy';

export const prerender = false;

// Webhook de Lemon Squeezy (Merchant of Record). Acepta los eventos
// subscription_created/updated/resumed/paused/cancelled/expired y sincroniza la
// tabla `memberships` con el cliente service_role (único escribiente).

function envVar(nombre: string): string | undefined {
  return process.env[nombre]?.trim() || undefined;
}

export async function POST(context: APIContext): Promise<Response> {
  const secreto = envVar('LS_WEBHOOK_SECRET');
  if (!secreto || !supabaseConfigurado()) {
    return new Response('not configured', { status: 501 });
  }

  const firma = context.request.headers.get('x-signature');
  const rawBody = await context.request.text();
  if (!firma || !verificarFirmaLs(rawBody, firma, secreto)) {
    return new Response(null, { status: 401 });
  }

  let cuerpo: unknown;
  try {
    cuerpo = JSON.parse(rawBody);
  } catch {
    return new Response(null, { status: 400 });
  }

  const nombreEvento = String(
    (cuerpo as { meta?: { event_name?: string } })?.meta?.event_name ?? '',
  );
  const evento = normalizarEventoLs(cuerpo);

  if (nombreEvento.startsWith('subscription') && evento) {
    try {
      await sincronizarMembresia(crearClienteServicio(), evento);
    } catch {
      return new Response(null, { status: 500 });
    }
    // Bienvenida propia solo al nacer la suscripción. El fallo del email NUNCA
    // puede romper el webhook (LS reintentaría y duplicaría sincronizaciones).
    if (nombreEvento === 'subscription_created') {
      const origin = String(context.site ?? new URL(context.url).origin);
      await enviarBienvenida({
        email: evento.email,
        origin,
        currentPeriodEnd: evento.currentPeriodEnd,
      }).catch(() => false);
    }
  }

  // 204 para el resto de eventos: LS deja de reintentar.
  return new Response(null, { status: 204 });
}
