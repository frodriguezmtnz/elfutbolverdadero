# El Fútbol Verdadero

Web de [elfutbolverdadero.com](https://www.elfutbolverdadero.com): entrevistas, artículos y opinión sobre fútbol base. Entrenar, pensar, compartir.

## Stack

- **[Astro 7](https://docs.astro.build)** (SSG, output estático) + **TypeScript strict**
- **[Sanity.io](https://www.sanity.io)** como headless CMS (contenido e imágenes)
- **[Tailwind CSS 4](https://tailwindcss.com)** vía plugin Vite
- **[Vercel](https://vercel.com)** para hosting/deploys · **GitHub Actions** para CI

## Comandos

| Comando                | Acción                                             |
| :--------------------- | :------------------------------------------------- |
| `npm run dev`          | Servidor de desarrollo en `localhost:4321`         |
| `npm run build`        | Build de producción a `./dist/`                    |
| `npm run preview`      | Sirve el build localmente para previsualizar       |
| `npm run lint`         | ESLint (incluye reglas jsx-a11y para `.astro`)     |
| `npm run format`       | Prettier sobre todo el repo                        |
| `npm run format:check` | Comprueba el formato sin modificar                 |
| `npx astro check`      | Chequeo de tipos de Astro                          |
| `npm run studio`       | Sanity Studio en `localhost:3333`                  |
| `npm run import:wp`    | Import de contenido desde la API REST de WordPress |

## Estructura

```text
/
├── public/            # Estáticos (favicon, fonts, og.png)
├── sanity/            # Schemas del CMS (publicacion, autor, categoria, etiqueta, embed, webAmiga)
├── scripts/           # Utilidades (import WP, generación de og.png)
└── src/
    ├── components/    # Componentes Astro (cards, navegación, Portable Text…)
    ├── config/        # Config (enlaces sociales)
    ├── layouts/       # Base.astro: SEO, OG, JSON-LD, skip link
    ├── lib/           # Queries GROQ y helpers (sanity.ts, images.ts, texto.ts…)
    ├── pages/         # Rutas estáticas
    └── styles/        # Tokens de diseño (global.css)
```

### Rutas principales

- `/` · `/entrevistas/` (paginada) · `/categoria/[slug]/` · `/etiqueta/[slug]/` (paginadas)
- `/buscar/` (índice de búsqueda dividido: `busqueda.json` + `busqueda-cuerpo.json`)
- `/rss.xml` · `/politica-de-privacidad/` · `/colaboraciones/`

## Variables de entorno

Copia `.env.example` a `.env` y rellena los valores. En Sanity:

- `SANITY_PROJECT_ID` / `SANITY_DATASET` — cliente de lectura de Astro
- `SANITY_TOKEN` — solo para escritura (import); nunca se publica
- `SANITY_STUDIO_PROJECT_ID` / `SANITY_STUDIO_DATASET` — Studio (corre en navegador)
- `DEV_ALLOWED_HOSTS` — hosts extra permitidos en `astro dev`

> El dataset de desarrollo local suele ser `staging`; producción usa `production`
> (configurado en Vercel). El fallback del build es `production` por seguridad.

## Contenido y despliegue

1. Se publica en el Sanity Studio (dataset de trabajo).
2. El sitio es estático: cada publicación requiere un build (deploy en Vercel;
   webhook pendiente de configurar para automatizarlo).
3. CI (`.github/workflows/ci.yml`): en cada push/PR ejecuta `lint`, `format:check`,
   `astro check` y `build`.

## Migración desde WordPress

`scripts/import-wp.mjs` importa los posts legacy (HTML → Portable Text, imágenes
a Sanity, meta Yoast, slugs 1:1) con checkpoint en `.import/`. Ver
`MIGRATION-TRACKING.md` para el estado detallado de la migración.
