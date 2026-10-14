// @ts-check
import 'dotenv/config';
import { defineConfig } from 'astro/config';
import sitemap from '@astrojs/sitemap';
import mdx from '@astrojs/mdx';
import vercel from '@astrojs/vercel';
import sanity from '@sanity/astro';
import tailwindcss from '@tailwindcss/vite';
import reveal from 'astro-reveal';

// https://astro.build/config
export default defineConfig({
  site: 'https://www.elfutbolverdadero.com',
  output: 'static',
  // Renderiza las rutas estáticas en paralelo (por defecto Astro usa 1 y las ~900
  // páginas se generaban en serie, inflando el build de CI varios minutos)
  build: {
    concurrency: 8,
  },
  integrations: [
    sitemap({
      // Excluir páginas marcadas con noindex (buscador, página legal)
      filter: (page) => !page.includes('/buscar/') && !page.includes('/politica-de-privacidad/'),
    }),
    mdx(),
    reveal({ mode: 'observer' }),
    sanity({
      projectId: process.env.SANITY_PROJECT_ID ?? 's22b9256',
      dataset: process.env.SANITY_DATASET ?? 'production',
      useCdn: false,
      logClientRequests: 'dev',
    }),
  ],
  adapter: vercel(),
  // El webhook de Lemon Squeezy POSTEA sin Origin y el endpoint de magic link es
  // un form normal: checkOrigin (activo por defecto desde Astro 5) los mataría con
  // 403. Seguridad real: firma HMAC en el webhook y el OTP de Supabase como prueba
  // de posesión del correo. Ninguna ruta de estado sensible se ejecuta sin sesión.
  security: { checkOrigin: false },
  redirects: {
    // Entrevista legacy con slug árabe (WP) → slug español tras la traducción
    '/مقابلة-الحسين-بلكبوس-أحاول-نقل-معلو':
      '/entrevista-hussein-belkbous-intento-transmitir-informacion-clara-y-pura-a-los-jugadores/',
  },
  server: {
    allowedHosts: process.env.DEV_ALLOWED_HOSTS?.split(',').map((h) => h.trim()) ?? [],
  },
  vite: {
    plugins: [tailwindcss()],
    // Pre-empaqueta medium-zoom en el arranque del dev server: al descubrirse
    // tarde (import desde el <script> de [slug].astro) Vite re-optimiza deps a
    // mitad de sesión y el navegador queda con un ?v= obsoleto -> 504
    optimizeDeps: {
      include: ['medium-zoom'],
    },
  },
});
