#!/usr/bin/env node
// Importa WordPress → Sanity (dataset staging). Resumible, throttle, pilot --limit N.
import 'dotenv/config';
import { mkdirSync, writeFileSync } from 'node:fs';
import path from 'node:path';

import {
  getRecentPosts,
  getAllPosts,
  getCategories,
  getTags,
  getMediaByIds,
  getYoastHead,
} from './lib/wp.mjs';
import { createSanity, uploadImageFromUrl, createOrReplace } from './lib/sanity.mjs';
import { htmlToPortableText } from './lib/portable-text.mjs';
import { loadRegistry, saveRegistry, withRetry, makeReport } from './lib/checkpoint.mjs';

// ---- CLI ----
const args = process.argv.slice(2);
const opt = {};
for (let i = 0; i < args.length; i++) {
  const [k, v] = args[i].split('=');
  if (k === '--limit') opt.limit = parseInt(v, 10);
  else if (k === '--no-seo') opt.noSeo = true;
  else if (k === '--no-images') opt.noImages = true;
  else if (k === '--delay-ms') opt.delayMs = parseInt(v, 10);
  else if (k === '--resume') opt.resume = true;
  else if (k === '--help') {
    console.log(`
Uso: node scripts/import-wp.mjs [opciones]
  --limit=N     Importar solo los N posts más recientes (piloto)
  --no-seo      No capturar meta Yoast (get_head)
  --no-images   No subir imágenes
  --delay-ms=N  Pausa (ms) entre peticiones Yoast/imágenes
  --resume      Reanudar desde el checkpoint (por defecto)
  --help
`);
    process.exit(0);
  }
}

const delayMs = opt.delayMs ?? 300;

async function main() {
  const { client, dataset } = createSanity();
  const registry = loadRegistry();
  const errors = [];

  console.log(`→ Sanity: ${process.env.SANITY_PROJECT_ID}/${dataset}`);
  console.log(`→ Modo: ${opt.limit ? `PILOTO (${opt.limit} últimos)` : 'COMPLETO'}`);

  // 1. Taxonomías + autores
  console.log('→ Cargando categorías, tags, autores…');
  const [cats, tags] = await Promise.all([getCategories(), getTags()]);
  const catDocs = cats.map((c) => ({
    _id: `categoria-wp-${c.id}`,
    _type: 'categoria',
    name: c.name,
    slug: { current: c.slug ?? slugify(c.name) },
    description: '',
  }));
  const tagDocs = tags.map((t) => ({
    _id: `etiqueta-wp-${t.id}`,
    _type: 'etiqueta',
    name: t.name,
    slug: { current: t.slug ?? slugify(t.name) },
  }));
  // Autores: deduplicar por slug del user
  const authorDocs = [];

  // 2. Posts
  let posts;
  if (opt.limit) {
    posts = await getRecentPosts(opt.limit);
  } else {
    posts = await getAllPosts();
  }
  console.log(`→ Posts obtenidos: ${posts.length}`);
  const totalPosts = posts.length;

  // Media featured (lote include) — para los posts con featured_media
  const featuredIds = [...new Set(posts.map((p) => p.featured_media).filter(Boolean))];
  let mediaById = new Map();
  if (featuredIds.length && !opt.noImages) {
    console.log(`→ Media featured: ${featuredIds.length} IDs en lotes`);
    const media = await getMediaByIds(featuredIds);
    mediaById = new Map(media.map((m) => [m.id, m]));
  }

  // 3. Por post: conversión + upsert
  let imported = 0;
  const docList = [];
  const imagesUploaded = new Set();
  const catIdToName = (id) => catDocs.find((c) => c._id === `categoria-wp-${id}`)?.name ?? '';

  for (const post of posts) {
    const wpUrl = post.link ?? `https://www.elfutbolverdadero.com/${post.slug}/`;
    const slug = post.slug;
    const tipo = mapTipo(post.categories ?? [], catIdToName);
    const seo = opt.noSeo
      ? { seoTitle: null, seoDescription: null }
      : await withRetry(() => getYoastHead(wpUrl), { label: `yoast ${slug}` });
    if (!opt.noSeo) await sleep(delayMs);

    // Categorías / etiquetas (refs)
    const categorias = (post.categories ?? [])
      .filter((id) => catDocs.some((c) => c._id === `categoria-wp-${id}`))
      .map((id) => ({ _type: 'reference', _ref: `categoria-wp-${id}` }));
    const etiquetas = (post.tags ?? [])
      .filter((id) => tagDocs.some((t) => t._id === `etiqueta-wp-${id}`))
      .map((id) => ({ _type: 'reference', _ref: `etiqueta-wp-${id}` }));

    // Main image (featured)
    let mainImage;
    if (!opt.noImages && post.featured_media && mediaById.has(post.featured_media)) {
      const m = mediaById.get(post.featured_media);
      const src = m?.source_url || m?.guid?.rendered;
      if (src) {
        try {
          const assetId = await uploadImageFromUrl(client, src, registry);
          mainImage = { _type: 'image', asset: { _type: 'reference', _ref: assetId } };
        } catch (e) {
          errors.push(`mainImage ${slug}: ${e.message}`);
        }
      }
    }

    // Body (inline images → assets)
    let body;
    try {
      body = await htmlToPortableText(post.content?.rendered ?? '', {
        resolveImageUrl: async (src) => {
          if (opt.noImages) return null;
          const abs = new URL(src, 'https://www.elfutbolverdadero.com').href;
          try {
            const assetId = await uploadImageFromUrl(client, abs, registry);
            imagesUploaded.add(assetId);
            return assetId;
          } catch (e) {
            errors.push(`body img ${slug}: ${e.message}`);
            return null;
          }
        },
      });
    } catch (e) {
      errors.push(`body ${slug}: ${e.message}`);
    }

    docList.push({
      _id: `publicacion-wp-${post.id}`,
      _type: 'publicacion',
      title: stripTags(post.title?.rendered) ?? slug,
      slug: { current: slug },
      tipo,
      description: limpiarExtracto(post.excerpt?.rendered ?? ''),
      publishedAt: post.date ? new Date(post.date).toISOString() : undefined,
      body,
      ...(mainImage ? { mainImage } : {}),
      categorias,
      etiquetas,
      wpId: post.id,
      wpUrl,
      seoTitle: seo?.title ?? null,
      seoDescription: seo?.description ?? null,
    });

    imported++;
    if (imported % 25 === 0) console.log(`  …${imported}/${totalPosts} posts preparados`);
  }

  // 4. Upsert (autores primero, luego categorías/tags, luego publicaciones)
  console.log('→ Upsert taxonomías…');
  await createOrReplace(client, [...authorDocs, ...catDocs, ...tagDocs], { verbose: true });
  console.log(`→ Upsert ${docList.length} publicaciones…`);
  await createOrReplace(client, docList, { verbose: true });

  // 5. Reporte + checkpoint
  const report = makeReport({ docs: docList, images: [...imagesUploaded], errors, totalPosts });
  const outDir = path.join(process.cwd(), '.import');
  mkdirSync(outDir, { recursive: true });
  writeFileSync(path.join(outDir, 'import-report.json'), JSON.stringify(report, null, 2));
  saveRegistry(registry);
  console.log('\n== RESUMEN ==');
  console.log(JSON.stringify(report, null, 2));
  console.log(`\nReporte: .import/import-report.json`);
}

function mapTipo(categoryIds, catIdToName) {
  // Heurística por categoría; ampliable
  const names = categoryIds.map(catIdToName).filter(Boolean).join(' ').toLowerCase();
  if (/entrevistas?/.test(names)) return 'entrevista';
  if (/opinion|opinión/.test(names)) return 'opinion';
  return 'articulo';
}

function stripTags(html = '') {
  return html.replace(/<[^>]+>/g, '').trim();
}

function limpiarExtracto(html = '') {
  let texto = stripTags(html)
    .replace(/&#0?39;/g, "'")
    .replace(/&#8230;/g, '…')
    .replace(/&hellip;/gi, '…')
    .replace(/&nbsp;/gi, ' ')
    .replace(/&quot;/g, '"')
    .replace(/&amp;/g, '&');
  texto = texto.replace(/^tiempo\s+de\s+lectura:\s*\d*\s*minutos?\.?\s*/i, '');
  texto = texto.replace(/\s*\[\s*…\s*\]\s*$/u, '');
  return texto.replace(/\s+/g, ' ').trim();
}

function slugify(s = '') {
  return (
    s
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '') || 'untitled'
  );
}

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

main().catch((e) => {
  console.error('Import falló:', e);
  process.exit(1);
});
