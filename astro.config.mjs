// @ts-check
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
    sitemap(),
    mdx(),
    reveal({ mode: 'observer' }),
    sanity({
      projectId: process.env.SANITY_PROJECT_ID ?? 's22b9256',
      dataset: process.env.SANITY_DATASET ?? 'staging',
      useCdn: false,
      logClientRequests: 'dev',
    }),
  ],
  adapter: vercel(),
  vite: {
    plugins: [tailwindcss()],
  },
});
