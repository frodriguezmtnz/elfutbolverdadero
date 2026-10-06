# Runbook — Fase 2: login y suscripción (Supabase + Lemon Squeezy)

Checklist de puesta en marcha para la zona **Futbolverdadero Entrenadores**.
Nada de esto toca el sitio público: las claves son solo para las rutas on-demand.

## 1 · Supabase (auth magic link + Postgres)

1. Crear proyecto (región `eu-west`/cercana; plan Free vale).
2. **SQL Editor** → ejecutar `supabase/migrations/0001_memberships.sql`.
3. **Authentication → Providers → Email** y **URLs**:
   - Site URL: `https://www.elfutbolverdadero.com` (en el proyecto de Vercel).
   - Redirect URLs permitidas: `https://www.elfutbolverdadero.com/entrenadores/auth/callback` y `http://localhost:4321/entrenadores/auth/callback`.
   - Activar **«Use token hash instead of the implicit link»`** (el callback del sitio maneja ambos formatos, pero con token hash la sesión se valida 100 % en servidor).
4. **SMTP**: configurar un proveedor real (Resend/Postmark/SES) en
   Authentication → SMTP; el envío gratis de Supabase caduca y cae rate-limit.
   Plantilla de Magic Link con: `{{ .ConfirmationURL }}` (por defecto ya funciona).
5. Claves → `.env` local y Vercel (Secrets, Production + Preview):
   - `SUPABASE_URL`
   - `SUPABASE_ANON_KEY`
   - `SUPABASE_SERVICE_ROLE_KEY` (solo servidor: lo usa el webhook)

## 2 · Lemon Squeezy (Merchant of Record)

1. Alta + aprobación de tienda (vendemos contenido digital español; IVA UE lo gestiona LS).
2. Crear **Product** «Futbolverdadero Entrenadores» con **Subscription variant** anual 12 € (IVA incluido a elegir: precio bruto con tax `inclusive`).
3. **Developer → Webhooks** → Add: URL `https://www.elfutbolverdadero.com/api/webhooks/lemonsqueezy`, eventos `subscription_*` (created/updated/resumed/paused/cancelled/expired). Guardar el **secret**.
4. Variables en Vercel (Secrets):
   - `LS_API_KEY`, `LS_STORE_ID`, `LS_VARIANT_ID` (Developer → API docs)
   - `LS_WEBHOOK_SECRET`
   - `LS_PORTAL_URL` (portal de cliente para cancelar/descargar facturas)
   - `LS_TEST_MODE=1` **solo** en Preview; nunca en Production.
5. Probar el ciclo completo en test mode: magic link → `/entrenadores/suscribirse/` → checkout → webhook → `/entrenadores/panel/` con acceso.

## 3 · Rutas de la fase

| Ruta | Render | Quién entra |
| --- | --- | --- |
| `/entrenadores/` | estático (SEO) | todos |
| `/entrenadores/acceder/` | on-demand | todos (login) |
| `/entrenadores/auth/magic` | on-demand | POST form |
| `/entrenadores/auth/callback` | on-demand | link del email |
| `/entrenadores/auth/salir` | on-demand | con sesión |
| `/entrenadores/auth/suscrito` | on-demand | redirect post-checkout |
| `/entrenadores/suscribirse/` | on-demand | con sesión (sin suscripción) |
| `/entrenadores/panel/` | on-demand | con sesión |
| `/entrenadores/banco/` | on-demand | **suscripción activa** |
| `/api/webhooks/lemonsqueezy` | on-demand | solo LS (firma HMAC) |

El guard (`src/middleware.ts`) es **fail-closed**: cualquier `/entrenadores/<nueva-ruta>` exige suscripción por defecto; las excepciones se declaran explícitamente en la lista blanca.

## 4 · Verificación post-despliegue

- [ ] `curl -I https://…/entrenadores/banco/` sin cookie → 302 a `/entrenadores/acceder/?next=…`
- [ ] Magic link llega y crea sesión; el panel muestra el correo.
- [ ] Pago de prueba → webhook → `memberships` con `status=active` y `renews_at` futuro; `/entrenadores/banco/` responde 200.
- [ ] Cancelar en el portal → sigue dentro hasta `current_period_end` (status cancelled), luego el guard redirige.
- [ ] Webhook con firma falsa → 401.
- [ ] Sitemap/Google: solo `/entrenadores/` pública; el resto tiene `noindex` y no son prerenderizadas.
