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
  },
});
