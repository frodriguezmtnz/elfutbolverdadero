# Runbook — Corte a producción (elfutbolverdadero.com)

**Estado actual**: 658 posts + 3.338 imágenes en dataset `staging` de Sanity (`s22b9256`). Dataset `production` vacío. Web construida con Astro (estática) y desplegada en Vercel. Dominio y email contratados en un proveedor externo (los emails NO se tocan).

**Requisitos previos** (persona que ejecuta):

- Cuenta con rol **Administrator** en el proyecto Sanity `s22b9256` (manage.sanity.io → Members)
- Acceso al proyecto en **Vercel** (owner)
- Acceso al **panel DNS** del dominio (registro A/CNAME/TXT; NO tocar MX)
- Node.js ≥ 22 y deps instaladas (`npm ci`) en el portátil

---

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

- [ ] Search Console: añadir propiedad de dominio, verificar (TXT o vía Vercel), subir `sitemap-index.xml`, solicitar indexación de portada
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

1. **Newsletter**: conectar el form (Buttondown/MailerLite) o quitar la sección hasta tener proveedor
2. **Política de privacidad**: confirmar responsable legal real (nombre fiscal / NIF si procede)
3. ~~**Títulos `#Entrevistas:` heredados de WP**~~ **DECIDIDO**: limpieza en lote con `scripts/fix-sanity-titles.mjs` (ver Paso 0.5)
