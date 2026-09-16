# Runbook — Corte a producción (elfutbolverdadero.com)

**Estado actual**: 658 posts + 3.338 imágenes en dataset `staging` de Sanity (`s22b9256`). Dataset `production` vacío. Web construida con Astro (estática) y desplegada en Vercel. Dominio y email contratados en un proveedor externo (los emails NO se tocan).

**Requisitos previos** (persona que ejecuta):

- Cuenta con rol **Administrator** en el proyecto Sanity `s22b9256` (manage.sanity.io → Members)
- Acceso al proyecto en **Vercel** (owner)
- Acceso al **panel DNS** del dominio (registro A/CNAME/TXT; NO tocar MX)
- Node.js ≥ 22 y deps instaladas (`npm ci`) en el portátil

---

## Paso −1 — Pre-corte: baseline y accesos (mientras el WP sigue vivo)

Estas cuatro cosas **se hacen ANTES de tocar DNS**, porque pierden su razón de ser al apagar WordPress:

1. **Search Console** (propiedad con TU cuenta Google; a Xabi se le invita como usuario después):
   - search.google.com/search-console → Añadir **propiedad de dominio** `elfutbolverdadero.com` → verificar con el registro **TXT** que da Google (se pone en el panel DNS; no toca Vercel ni WP).
   - Settings → Users → invitar al email de Xabi (rol _restringido_ = solo ver).
   - Subir `https://www.elfutbolverdadero.com/sitemap-index.xml` (funciona ya sobre el WP).
   - El informe **Rendimiento** da la línea base de consultas/clicks y **Enlaces → Páginas con más enlaces** prioriza qué URLs legacy necesitan 301.
2. **Captura de WordPress.com → Stats** (la línea base de visitas; Umami nace en cero, no admite importar histórico):
   - `npm run export:wp-stats` → `docs/baseline-wp-stats/` (JSON + CSV: serie mensual 2019→hoy, top-posts por año, referrers, países). Requiere `WP_STATS_TOKEN` (app OAuth en developer.wordpress.com, scope `admin.scope.stats`) o `WP_COOKIE` (cookie de sesión del navegador logueado en wordpress.com).
   - Complemento de 10 s: imprimir la página de Stats a PDF (totales 209.338 vistas / 159.961 visitantes).
3. **Umami Cloud**: la env `PUBLIC_UMAMI_WEBSITE_ID` en Vercel como **Config** (es un valor público: va en el HTML; con Secret solo sale un aviso), activada en Production y Preview. Tras el primer deploy: Umami → Settings de la web → **Share → Enable** y pasar el link público a Xabi.
4. **Suscriptores Jetpack** (~19): exportar la lista (wordpress.com → Ajustes del sitio → **Follow me**/email subscribers, o tabla `wp_jetpack_mail_subscribers` vía Export Tools) antes de apagar WP. Guardarla cifrada; es la semilla del futuro newsletter.

## Paso 0 — Doble de seguridad (5 min)

```bash
npx sanity login
npx sanity datasets export staging backup-staging-$(date +%Y%m%d).tar.gz -p s22b9256
```

Este tar.gz es el backup completo (documentos + assets). Guardarlo bien.

En el panel DNS: bajar el **TTL** de los registros `A` (raíz) y `CNAME` (www) a 300 segundos (hecho el cambio, la propagación es rápida).

## Paso 0.5 — Limpieza de almohadillas `#` en títulos (2 min + revisión)

Antes de copiar staging → production, dejar los títulos limpios en staging para que la copia los herede:

```bash
npm run sanity:fix-titles                 # DRY-RUN: alcance + casos sin «etiqueta:» a revisar
npm run sanity:fix-titles:apply           # aplica title + seoTitle en staging
```

Si el dataset `production` ya se hubiera poblado antes de la limpieza, repetir con `--dataset=production`.

## Paso 1 — Copiar staging → production (10-30 min)

Opción A (intenta primero; puede exigir plan de pago):

```bash
npx sanity datasets copy staging production -p s22b9256
```

Opción B (si A pide Enterprise — funciona en Free):

```bash
npx sanity datasets import backup-staging-YYYYMMDD.tar.gz -d production -p s22b9256
```

(usa el tar del Paso 0; `production` debe estar vacío; si se repite, añadir `--replace`)

Verificar (debe dar 658, y >0 en el resto):

```bash
node --env-file=.env -e "import('@sanity/client').then(async({createClient})=>{const c=createClient({apiVersion:'2024-01-01',projectId:'s22b9256',dataset:'production',useCdn:false});for(const t of['publicacion','autor','categoria','etiqueta','sanity.imageAsset'])console.log(t,await c.fetch('count(*[_type==\''+t+'\']')));})"
```

> El post árabe traducido (Hussein Belkbous) viaja en la copia ya en español con su slug español. **`npm run import:wp` no se vuelve a ejecutar nunca** (sobrescribiría ese doc con el árabe original de WP).

## Paso 2 — Visibilidad del dataset (1 min)

```bash
npx sanity datasets visibility set production public -p s22b9256
```

El sitio lee sin token; `private` es de pago (Growth) y obligaría a meter token en Vercel.

## Paso 3 — Vercel: env vars + redeploy (10 min)

Vercel → Project → **Settings → Environment Variables**:

| Variable            | Production                         | Preview                       |
| ------------------- | ---------------------------------- | ----------------------------- |
| `SANITY_PROJECT_ID` | `s22b9256`                         | `s22b9256`                    |
| `SANITY_DATASET`    | `production`                       | `staging` (previews aisladas) |
| `SANITY_TOKEN`      | borrarla si existe (no hace falta) | idem                          |

Deployments → último production → **Redeploy** (para aplicar env sin cambiar código).

## Paso 4 — CI (2 min)

`.github/workflows/ci.yml`: `SANITY_DATASET: staging` → `production` (el CI valida lo que se despliega). El `.env` local de cada uno puede seguir en `staging` para desarrollo.

## Paso 5 — Studio de Xabi → production (2 min)

En el portátil donde se edita contenido, `.env`:

```
SANITY_STUDIO_DATASET=production
```

Desde ahora: editar y publicar en production. `staging` queda como archivo (no borrarlo, es tu red).

## Paso 6 — Webhook Sanity → Vercel (Fase 4) (10 min)

1. Vercel → Settings → **Git → Deploy Hooks** → Create Hook (nombre `sanity-publish`, sistema "Other") → copiar la URL (`https://api.vercel.com/v1/integrations/deploy/prj_…`)
2. manage.sanity.io → proyecto → **API → Webhooks** → Add:
   - Document types: `publicacion` (y opcionalmente `autor`, `categoria`, `etiqueta`, `webAmiga`)
   - Filter: `!(_id in path("drafts.**"))` (solo documentos publicados)
   - Include: Creates, Updates, Deletes, Patches
   - URL: el deploy hook
3. Prueba: publicar una edición menor en Studio → a los segundos aparece build nuevo en Vercel (~5-8 min de build).

## Paso 7 — Verificación integral ANTES de DNS (30 min)

Sobre la URL `*.vercel.app` de production (o el dominio si ya estaba):

- [ ] Home con datos reales; `/entrevistas/23/` (última página de paginación)
- [ ] Un post con imágenes + el de Belkbous en español
- [ ] `/buscar/?q=portero` (resultados y luego re-orden al llegar el cuerpo)
- [ ] `/etiqueta/futbol-base/`, `/categoria/entrenadores/`
- [ ] `curl -I` de la URL legacy árabe → **301** al slug español
- [ ] **Matriz de redirecciones legacy** (en el preview deploy de la rama, antes de tocar DNS — las reglas solo viven en Vercel, no en `astro preview`):

```bash
P=https://<preview-vercel-app>   # deploy de la rama; el dominio real sigue en WP
for u in category/entrevistas/entrenadores-as/ category/no-existe/ tag/futbol-base/ \
         feed/ comments/feed/ page/2/ 2024/03/ home/ membership-account/your-profile/ \
         futbolverdadero-para-los-amantes-de-este-deporte/ eres-entrenador-y-estas-buscando-equipo/ \
         entrevista-fran-garcia-al-futbol-le-debo-la-vida/index.html politica-de-privacidad/; do
  curl -s -o /dev/null -w "%{http_code} $u -> %{redirect_url}\n" "$P/$u"
done
# Esperado: 301 a /categoria|/etiqueta|/rss.xml|/entrevistas|/|/futbolverdadero-acerca-de,
# 410 en comments/feed, 200 en politica-de-privacidad (nativa Astro, sin regla)
```

- [ ] `/rss.xml`, `/sitemap-index.xml`, `/robots.txt`, `/politica-de-privacidad/`
- [ ] Facebook Sharing Debugger + X Card Validator (OG e imagen)
- [ ] Lighthouse móvil (objetivo: ≥95 en todo)

## Paso 8 — DNS (15 min + propagación)

1. Vercel → Settings → **Domains**: añadir `elfutbolverdadero.com` y `www.elfutbolverdadero.com` → copiar valores que pide (típicamente `A 76.76.21.21` para la raíz, `CNAME cname.vercel-dns.com` para www, un `TXT` de verificación)
2. En el panel del proveedor: cambiar **solo** A y CNAME y añadir el TXT. **MX / SPF / DKIM / DMARC intactos → el email no se toca ni se pierde**
3. En Vercel: configurar redirección apex → www (el canonical del sitio es `www.`)
4. SSL: Vercel emite los certificados automáticamente (minutos)
5. Comprobar: `nslookup www.elfutbolverdadero.com` → IP/CNAME de Vercel; y https funcionando
6. **El WordPress viejo sigue encendido** durante 1-2 semanas (rollback = devolver los registros DNS; con TTL bajo, minutos)

## Paso 9 — Post-corte

- [ ] Search Console: **ya verificado en el Paso −1** (propiedad de dominio) → tras el corte, subir el `sitemap-index.xml` nuevo y solicitar indexación de portada; vigilar el informe de Rendimiento comparando con la baseline del Paso −1
- [ ] Comprobar que el email sigue igual (envío de prueba interno/externo)
- [ ] manage.sanity.io → Usage: vigilar docs (~4.100) y storage de assets (Free: 10k docs / 100GB)
- [ ] Cuando todo esté estable: apagar WordPress del hosting viejo **conservando el servicio de email** (ojo si es un pack hosting+email: consultar con el proveedor antes de cancelar nada)
- [ ] Borrar `backup-staging-*.tar.gz` cuando confirmes que todo está OK (o guardarlo archivado)

## Rollback rápido

| Capa   | Cómo                                                             |
| ------ | ---------------------------------------------------------------- |
| DNS    | Devolver A/CNAME antiguos (minutos con TTL bajo)                 |
| Deploy | Vercel → Deployments → rollback a anterior (instantáneo)         |
| Datos  | `production` es copia; `staging` intacto; backup `.tar.gz` local |

## Decisiones pendientes antes del corte (opcionales pero recomendadas)

1. **Newsletter**: conectar el form (Buttondown/MailerLite) o quitar la sección hasta tener proveedor — **en curso**: export de los ~19 suscriptores Jetpack (Paso −1.4)
2. **Política de privacidad**: confirmar responsable legal real (nombre fiscal / NIF si procede)
3. ~~**Títulos `#Entrevistas:` heredados de WP**~~ **DECIDIDO**: limpieza en lote con `scripts/fix-sanity-titles.mjs` (ver Paso 0.5)
4. ~~**Analítica**~~ **DECIDIDO**: Umami Cloud free tier (cookieless, link público para Xabi) — ver Paso −1.3
5. ~~**Redirecciones legacy**~~ **DECIDIDO**: `scripts/legacy-redirects.mjs` inyectado en el build (`npm run build`); páginas WP huérfanas fundidas en `/futbolverdadero-acerca-de/`
6. **Opcionales `/?s=termino` y `/?p=123`**: sin decidir — se evalúan con datos de Search Console tras el corte (v3 `has: query` si salen muchos)
