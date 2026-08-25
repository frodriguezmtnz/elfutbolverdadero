// @ts-check
import { defineConfig } from 'astro/config';
import sitemap from '@astrojs/sitemap';
import mdx from '@astrojs/mdx';
import vercel from '@astrojs/vercel';

// https://astro.build/config
export default defineConfig({
  site: 'https://www.elfutbolverdadero.com',
  output: 'static',
  integrations: [sitemap(), mdx()],
  adapter: vercel(),
});
