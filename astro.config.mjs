// @ts-check
import { defineConfig } from 'astro/config';
import sitemap from '@astrojs/sitemap';
import mdx from '@astrojs/mdx';
import vercel from '@astrojs/vercel';
import sanity from '@sanity/astro';

// https://astro.build/config
export default defineConfig({
  site: 'https://www.elfutbolverdadero.com',
  output: 'static',
  integrations: [
    sitemap(),
    mdx(),
    sanity({
      projectId: process.env.SANITY_PROJECT_ID ?? 's22b9256',
      dataset: process.env.SANITY_DATASET ?? 'staging',
      useCdn: false,
      logClientRequests: 'dev',
    }),
  ],
  adapter: vercel(),
});
