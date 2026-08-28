const BASE = 'https://www.elfutbolverdadero.com/wp-json/wp/v2';

async function wpFetch(path, { retries = 3, backoffMs = 1500 } = {}) {
  let lastErr;
  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      const res = await fetch(BASE + path, {
        headers: { 'User-Agent': 'elfutbolverdadero-migration (import)' },
        signal: AbortSignal.timeout(60000),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status} for ${path}`);
      return await res.json();
    } catch (err) {
      lastErr = err;
      if (attempt < retries) {
        await new Promise((r) => setTimeout(r, backoffMs * attempt));
      }
    }
  }
  throw new Error(`wpFetch failed: ${path} — ${lastErr?.message ?? lastErr}`);
}

async function wpFetchAll(path) {
  let page = 1;
  let all = [];
  while (true) {
    const data = await wpFetch(`${path}${path.includes('?') ? '&' : '?'}per_page=100&page=${page}`);
    if (!Array.isArray(data) || data.length === 0) break;
    all = all.concat(data);
    if (data.length < 100) break;
    page++;
  }
  return all;
}

export async function getRecentPosts(limit) {
  return wpFetch(`/posts?per_page=${limit}&orderby=date&order=desc`);
}

export async function getAllPosts() {
  return wpFetchAll('/posts');
}

export async function getCategories() {
  return wpFetchAll('/categories');
}

export async function getTags() {
  return wpFetchAll('/tags');
}

export async function getMediaByIds(ids) {
  // include — max 100 per request
  const chunks = [];
  for (let i = 0; i < ids.length; i += 100) chunks.push(ids.slice(i, i + 100));
  let all = [];
  for (const chunk of chunks) {
    const data = await wpFetch(`/media?include=${chunk.join(',')}&per_page=100`);
    if (Array.isArray(data)) all = all.concat(data);
  }
  return all;
}

export async function getYoastHead(url) {
  const res = await fetch(`https://www.elfutbolverdadero.com/wp-json/yoast/v1/get_head?url=${encodeURIComponent(url)}`, {
    headers: { 'User-Agent': 'elfutbolverdadero-migration (import)' },
  });
  if (!res.ok) return null;
  const data = await res.json();
  const html = data?.html ?? '';
  const title = dec(html.match(/<title>([^<]*)<\/title>/)?.[1]?.trim() ?? null);
  const desc = dec(html.match(/<meta name="description" content="([^"]*)"/)?.[1] ?? null);
  return { title, description: desc };
}

function dec(s) {
  if (!s) return s;
  return s
    .replace(/&amp;/g, '&')
    .replace(/&quot;/g, '"')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&#0?39;/g, "'")
    .replace(/&nbsp;/g, ' ');
}

export { wpFetch };