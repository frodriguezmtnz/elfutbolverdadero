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

| Ruta                                 | Render         | Quién entra                                                                       |
| ------------------------------------ | -------------- | --------------------------------------------------------------------------------- |
| `/entrenadores/`                     | estático (SEO) | todos                                                                             |
| `/entrenadores/acceder/`             | on-demand      | todos (login)                                                                     |
| `/entrenadores/auth/magic`           | on-demand      | POST form                                                                         |
| `/entrenadores/auth/callback`        | on-demand      | link del email                                                                    |
| `/entrenadores/auth/salir`           | on-demand      | con sesión                                                                        |
| `/entrenadores/auth/suscrito`        | on-demand      | redirect post-checkout                                                            |
| `/entrenadores/suscribirse/`         | on-demand      | con sesión (sin suscripción)                                                      |
| `/entrenadores/panel/`               | on-demand      | con sesión                                                                        |
| `/entrenadores/ejercicios/`          | on-demand      | pública (catálogo con teasers; la ficha completa exige socio)                     |
| `/entrenadores/ejercicios/[slug]/`   | on-demand      | free = todos; premium = vista bloqueada sin socio, ficha con candado por servidor |
| `/entrenadores/sesiones/`            | on-demand      | pública (catálogo con teasers; la ficha completa exige socio)                     |
| `/entrenadores/sesiones/[slug]/`     | on-demand      | free = todos; premium = vista bloqueada sin socio (notas y claves nunca viajan)   |
| `/entrenadores/herramientas/`        | on-demand      | pública (biblioteca; nunca proyecta URLs de archivo)                              |
| `/entrenadores/herramientas/[slug]/` | on-demand      | free = descarga para todos; premium = enlace solo visible con suscripción viva    |
| `/entrenadores/metodologia/`         | on-demand      | pública (lista free+premium; las free enlazan al blog, su URL canónica)           |
| `/entrenadores/metodologia/[slug]/`  | on-demand      | free = 301 al blog; premium = dossier completo con socio, teaser de venta sin él  |
| `/entrenadores/voces/`               | on-demand      | pública (pregunta del mes + archivo; nunca proyecta la respuesta)                 |
| `/entrenadores/voces/[slug]/`        | on-demand      | pregunta pública siempre; la respuesta solo con suscripción viva                  |
| `/api/webhooks/lemonsqueezy`         | on-demand      | solo LS (firma HMAC)                                                              |

El guard (`src/middleware.ts`) es **fail-closed**: cualquier `/entrenadores/<nueva-ruta>` exige suscripción por defecto; las excepciones se declaran en la lista blanca (`PREFIJOS_TEASER` permite servir catálogo/fichas con candado por página).

## 4 · Verificación post-despliegue

- [ ] `curl -I https://…/entrenadores/panel/` sin cookie → 302 a `/entrenadores/acceder/?next=…`
- [ ] `curl https://…/entrenadores/ejercicios/` sin cookie → 200 con catálogo y candados (nunca desarrollo)
- [ ] Magic link llega y crea sesión; el panel muestra el correo.
- [ ] Pago de prueba → webhook → `memberships` con `status=active` y `renews_at` futuro; ficha premium muestra desarrollo completo (200) y `window.print()` genera la ficha.
- [ ] Cancelar en el portal → sigue dentro hasta `current_period_end` (status cancelled), luego el guard redirige.
- [ ] Webhook con firma falsa → 401.
- [ ] `/entrenadores/suscribirse/` con sesión → página de **consentimiento** (casilla obligatoria de entrega inmediata + términos/privacidad); POST sin marcar → aviso y no se crea checkout; POST marcado → URL de LS con `custom.desistimiento='acceso-inmediato-consentido-v1'` (constancia auditable en la orden).
- [ ] Lemon Squeezy · Store Settings → Checkout: enlaces a términos (`/terminos-de-venta/`) y privacidad (`/politica-de-privacidad/`) visibles en la pasarela.
- [ ] Sitemap/Google: solo `/entrenadores/` pública; el resto tiene `noindex` y no son prerenderizadas.

## 5 · Magic link ≠ suscripción (checklist de acceso)

El login solo **identifica**; el pago vive en `memberships` (lo escribe el webhook de
Lemon Squeezy). Son dos llaves distintas y las rutas premium exigen **ambas**. Las
decisiones son puras y están testeadas en `src/lib/acceso-entrenadores.ts`
(`tests/unit/acceso-entrenadores.test.ts`); middleware y fichas solo las consumen.

| Visitante                | Panel / suscribirse     | Ficha premium            | Rutas premium futuras (sesiones…) |
| ------------------------ | ----------------------- | ------------------------ | --------------------------------- |
| Anónimo                  | → `/acceder/?next=…`    | vista bloqueada de venta | → `/acceder/?next=…`              |
| Magic link **sin pagar** | ✅ (ve su estado + CTA) | **sigue bloqueada**      | → `/panel/?motivo=suscripcion`    |
| Magic link + pago activo | ✅                      | ✅ completa + imprimir   | ✅                                |

Checklist tras configurar Supabase (antes no puede probarse el login real):

- [ ] Anónimo: `/entrenadores/ejercicios/` → 200 con catálogo; ficha premium → vista bloqueada (nunca el desarrollo); `/entrenadores/panel/` → 302 a `/acceder/?next=…`.
- [ ] Pide magic link un email **sin pagar**: llega el correo, el callback crea sesión y el panel muestra «sin suscripción» con CTA.
- [ ] Ese mismo usuario, con sesión: ficha premium → **sigue bloqueada**; `/entrenadores/cualquier-cosa-premium` → 302 a `/panel/?motivo=suscripcion`.
- [ ] Paga en LS test mode → webhook activa `memberships` → la ficha premium se ve completa y el botón de imprimir funciona.
