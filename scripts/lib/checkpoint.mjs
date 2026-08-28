import fs from 'node:fs';
import path from 'node:path';

const REGISTRY_FILE = path.join(process.cwd(), '.import', 'registry.json');

export function loadRegistry() {
  try {
    return JSON.parse(fs.readFileSync(REGISTRY_FILE, 'utf8'));
  } catch {
    return { byTitle: {}, bySlug: {}, images: {} };
  }
}

export function saveRegistry(reg) {
  fs.mkdirSync(path.dirname(REGISTRY_FILE), { recursive: true });
  fs.writeFileSync(REGISTRY_FILE, JSON.stringify(reg, null, 2));
}

export async function withRetry(fn, { retries = 4, backoffMs = 2000, label = '' } = {}) {
  let lastErr;
  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      return await fn();
    } catch (err) {
      lastErr = err;
      if (attempt < retries) {
        await new Promise((r) => setTimeout(r, backoffMs * attempt));
      }
    }
  }
  throw new Error(`[${label}] failed after ${retries} retries — ${lastErr?.message ?? lastErr}`);
}

export function makeReport({ docs, images, errors, totalPosts }) {
  const byType = {};
  for (const d of docs) {
    const t = d._type;
    byType[t] = (byType[t] ?? 0) + 1;
  }
  return {
    generatedAt: new Date().toISOString(),
    totalWordPressPosts: totalPosts,
    documents: docs.length,
    byType,
    imagesUploaded: images.length,
    errors: errors.length,
    errorList: errors.slice(0, 50),
  };
}