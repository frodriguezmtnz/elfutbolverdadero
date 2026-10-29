# El Fútbol Verdadero

Web de [elfutbolverdadero.com](https://www.elfutbolverdadero.com): entrevistas, artículos y opinión sobre fútbol base. Entrenar, pensar, compartir.

[![CI](https://github.com/frodriguezmtnz/elfutbolverdadero/actions/workflows/ci.yml/badge.svg)](https://github.com/frodriguezmtnz/elfutbolverdadero/actions/workflows/ci.yml) [![Vercel](https://therealsujitk-vercel-badge.vercel.app/?app=elfutbolverdadero)](https://www.elfutbolverdadero.com) [![Sitio](https://img.shields.io/website?url=https%3A%2F%2Fwww.elfutbolverdadero.com&label=sitio)](https://www.elfutbolverdadero.com) [![Producción](https://img.shields.io/badge/producci%C3%B3n-main-007EC6?logo=git&logoColor=white)](https://github.com/frodriguezmtnz/elfutbolverdadero/tree/main) [![Astro](https://img.shields.io/badge/Astro-7.x-BC52EE?logo=astro&logoColor=white)](https://docs.astro.build) [![TypeScript](https://img.shields.io/badge/TypeScript-strict-3178C6?logo=typescript&logoColor=white)](https://www.typescriptlang.org) [![Node.js](https://img.shields.io/badge/Node.js-24.x-339933?logo=node.js&logoColor=white)](https://nodejs.org)

<img src="images/fullpage-elfutbolverdadero-v2.png" alt="Vista completa de la web elfutbolverdadero en localhost" width="100%">

## Stack

- **[Astro 7](https://docs.astro.build)** (estático + rutas on-demand) + **TypeScript strict**
- **[Sanity.io](https://www.sanity.io)** como headless CMS (contenido e imágenes)
- **[Tailwind CSS 4](https://tailwindcss.com)** vía plugin Vite
- **[Supabase](https://supabase.com)** para el login por enlace mágico y la tabla de membresías
- **[Lemon Squeezy](https://www.lemonsqueezy.com)** como Merchant of Record de la suscripción
- **[Vercel](https://vercel.com)** para hosting/deploys · **GitHub Actions** para CI

## Comandos

| Comando                             | Acción                                                     |
| :---------------------------------- | :--------------------------------------------------------- |
| `npm run dev`                       | Servidor de desarrollo en `localhost:4321`                 |
| `npm run build`                     | Build de producción a `./dist/`                            |
| `npm run preview`                   | Sirve el build localmente para previsualizar               |
| `npm run lint`                      | ESLint (incluye reglas jsx-a11y para `.astro`)             |
| `npm run format`                    | Prettier sobre todo el repo                                |
| `npm run format:check`              | Comprueba el formato sin modificar                         |
| `npx astro check`                   | Chequeo de tipos de Astro                                  |
| `npm run studio`                    | Sanity Studio en `localhost:3333`                          |
| `npm run import:wp`                 | Import de contenido desde la API REST de WordPress         |
| `npm run sanity:fix-entities`       | Limpia entidades HTML residuales de WP en Sanity (dry-run) |
| `npm run sanity:fix-entities:apply` | Idem, escribiendo los cambios en Sanity                    |
| `npm run sanity:fix-titles`         | Quita almohadillas `#` de títulos WP en Sanity (dry-run)   |
| `npm run sanity:fix-titles:apply`   | Idem, escribiendo los cambios en Sanity                    |
| `npm run seed:entrenadores`         | Contenido de ejemplo de la zona (dry-run)                  |
| `npm run seed:entrenadores:apply`   | Siembra el contenido de ejemplo en Sanity                  |
| `npm run seed:entrenadores:limpiar` | Borra los documentos `seed-*` (contenido real intacto)     |

## Estructura

```text
/
├── images/            # Capturas del README (no se incluyen en el build)
├── public/            # Estáticos (favicon, fonts, og.png)
├── sanity/            # Schemas del CMS (publicación, autor, taxonomías y zona de entrenadores)
├── scripts/           # Utilidades (import WP, seed de entrenadores, og.png)
├── supabase/          # Migraciones SQL (membresías de la zona)
└── src/
    ├── components/    # Componentes Astro (cards, navegación, Portable Text…)
    ├── config/        # Config (enlaces sociales)
    ├── layouts/       # Base.astro: SEO, OG, JSON-LD, skip link
    ├── lib/           # Queries GROQ, acceso, membresías y Lemon Squeezy
    ├── pages/         # Rutas estáticas y on-demand (/entrenadores/*)
    └── styles/        # Tokens de diseño (global.css)
```

### Rutas principales

- `/` · `/entrevistas/` (paginada) · `/categoria/[slug]/` · `/etiqueta/[slug]/` (paginadas)
- `/buscar/` (índice de búsqueda dividido: `busqueda.json` + `busqueda-cuerpo.json`)
- `/rss.xml` · `/politica-de-privacidad/` · `/colaboraciones/`

### Zona de entrenadores (on-demand)

- `/entrenadores/` — landing pública de la suscripción (12 €/año)
- `/entrenadores/acceder/` · `/entrenadores/auth/*` — login por enlace mágico (Supabase)
- `/entrenadores/panel/` — estado de la suscripción y accesos
- `/entrenadores/suscribirse/` — consentimiento y checkout (Lemon Squeezy)
- `/entrenadores/ejercicios|sesiones|herramientas|metodologia|voces/` — catálogo público con
  candado por página; el contenido premium nunca se sirve sin suscripción activa
- Runbook de configuración: [`docs/zona-entrenadores-fase2.md`](docs/zona-entrenadores-fase2.md)

## Variables de entorno

Copia `.env.example` a `.env` y rellena los valores. En Sanity:

- `SANITY_PROJECT_ID` / `SANITY_DATASET` — cliente de lectura de Astro
- `SANITY_TOKEN` — solo para escritura (import); nunca se publica
- `SANITY_STUDIO_PROJECT_ID` / `SANITY_STUDIO_DATASET` — Studio (corre en navegador)
- `DEV_ALLOWED_HOSTS` — hosts extra permitidos en `astro dev`

Zona de entrenadores (solo rutas on-demand; en Vercel van como Secret):

- `SUPABASE_URL` / `SUPABASE_ANON_KEY` — login por enlace mágico y lectura RLS
- `SUPABASE_SERVICE_ROLE_KEY` — solo servidor (webhook de membresías)
- `LS_API_KEY` / `LS_STORE_ID` / `LS_VARIANT_ID` — checkout de Lemon Squeezy
- `LS_WEBHOOK_SECRET` — verificación HMAC del webhook
- `LS_PORTAL_URL` — portal de cliente para gestionar/cancelar la suscripción
- `SMTP_HOST` / `SMTP_PORT` / `SMTP_USER` / `SMTP_PASS` / `EMAIL_FROM` — email de bienvenida

> El dataset de desarrollo local es `production` (el mismo que producción).
> Un webhook de Sanity → Vercel dispara el build al publicar en el Studio.
> Las rutas `/entrenadores/*` se renderizan on-demand y no se prerenderizan.

## Contenido y despliegue

1. Se publica en el Sanity Studio (dataset `production`).
2. El contenido público es estático: cada publicación requiere un build. El webhook de
   Sanity llama al Deploy Hook de Vercel, que lo lanza automáticamente. La zona de
   entrenadores se sirve on-demand (login, panel, checkout y fichas con candado).
3. CI (`.github/workflows/ci.yml`): en cada push/PR ejecuta `lint`, `format:check`,
   `astro check` y `build` (Lighthouse solo en PRs).

## Migración desde WordPress

`scripts/import-wp.mjs` importa los posts legacy (HTML → Portable Text, imágenes
a Sanity, meta Yoast, slugs 1:1) con checkpoint en `.import/`.
