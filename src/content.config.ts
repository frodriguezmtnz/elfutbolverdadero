import { defineCollection } from 'astro:content';
import { glob } from 'astro/loaders';
import { z } from 'astro/zod';

const postSchema = z.object({
  title: z.string(),
  description: z.string().optional(),
  author: z.string(),
  category: z.string(),
  pubDate: z.coerce.date(),
  updatedDate: z.coerce.date().optional(),
  heroImage: z.string().optional(),
  tags: z.array(z.string()).default([]),
  legacySlug: z.string(),
  readingTime: z.string().optional(),
  draft: z.boolean().default(false),
});

const entrevistas = defineCollection({
  loader: glob({ pattern: '**/*.{md,mdx}', base: './src/content/entrevistas' }),
  schema: postSchema,
});

const articulos = defineCollection({
  loader: glob({ pattern: '**/*.{md,mdx}', base: './src/content/articulos' }),
  schema: postSchema,
});

const opinion = defineCollection({
  loader: glob({ pattern: '**/*.{md,mdx}', base: './src/content/opinion' }),
  schema: postSchema,
});

const autores = defineCollection({
  loader: glob({ pattern: '**/*.json', base: './src/content/autores' }),
  schema: z.object({
    name: z.string(),
    role: z.string().optional(),
    bio: z.string().optional(),
    legacySlug: z.string().optional(),
  }),
});

export const collections = { entrevistas, articulos, opinion, autores };
