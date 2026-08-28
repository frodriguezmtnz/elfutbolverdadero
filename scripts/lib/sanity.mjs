import { createClient } from '@sanity/client';

export function createSanity() {
  const projectId = process.env.SANITY_PROJECT_ID;
  const dataset = process.env.SANITY_DATASET ?? 'staging';
  const token = process.env.SANITY_TOKEN;
  if (!projectId || !token) {
    throw new Error('Faltan SANITY_PROJECT_ID y/o SANITY_TOKEN en .env');
  }
  const client = createClient({ projectId, dataset, token, useCdn: false, apiVersion: '2025-08-15' });
  return { client, dataset };
}

// Sube una imagen desde una URL pública y devuelve el asset _id. Deduplica por URL.
export async function uploadImageFromUrl(client, url, registry) {
  const cached = registry.images?.[url];
  if (cached) return cached;
  const label = `upload-${encodeURIComponent(url)}`;
  const res = await fetch(url, { headers: { 'User-Agent': 'elfutbolverdadero-migration' }, signal: AbortSignal.timeout(60000) });
  if (!res.ok) throw new Error(`fetch image ${url} -> HTTP ${res.status}`);
  const buffer = Buffer.from(await res.arrayBuffer());
  const contentType = res.headers.get('content-type') || 'image/jpeg';
  const asset = await client.assets.upload('image', buffer, { contentType });
  registry.images[url] = asset._id;
  return asset._id;
}

// Crea o reemplaza un documento por lote (createOrReplace)
export async function createOrReplace(client, docs, { verbose = false } = {}) {
  const batchSize = 50;
  let created = 0;
  for (let i = 0; i < docs.length; i += batchSize) {
    const chunk = docs.slice(i, i + batchSize);
    const tx = client.transaction();
    for (const d of chunk) {
      tx.createOrReplace({ ...d, _type: d._type });
    }
    await tx.commit();
    created += chunk.length;
    if (verbose) console.log(`upsert ${created}/${docs.length}`);
  }
  return created;
}