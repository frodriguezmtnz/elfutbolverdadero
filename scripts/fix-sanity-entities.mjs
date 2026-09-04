#!/usr/bin/env node
// Limpia entidades HTML residuales de WordPress (p.ej. &#8211; -> –) en los textos ya
// almacenados en Sanity: titulos, resúmenes, SEO, alt/caption y cuerpo (portable text).
//
// Uso:
//   node scripts/fix-sanity-entities.mjs                 -> DRY-RUN (no escribe), muestra el alcance
//   node scripts/fix-sanity-entities.mjs --apply         -> escribe los cambios
//   node scripts/fix-sanity-entities.mjs --dataset=production
//   node scripts/fix-sanity-entities.mjs --type=publicacion --limit=5 --sample
//
// Flags:
//   --apply          Escribe en Sanity (por defecto es dry-run por seguridad).
//   --dry-run        Explícito: no escribe (es el default).
//   --dataset=X      Sobrescribe SANITY_DATASET.
//   --type=X         Solo un tipo: publicacion|categoria|etiqueta|autor|webAmiga.
//   --all            Todos los tipos (default).
//   --no-body        No tocar el campo body de las publicaciones.
//   --limit=N        Procesa solo los N primeros docs por tipo (útil para probar).
//   --sample         Imprime ejemplos antes/después.
//   --delay-ms=N     Pausa (ms) entre lotes de escritura. Default 250.
import 'dotenv/config';
import { createSanity } from './lib/sanity.mjs';
import { decodificarEntidades } from './lib/entidades.mjs';

const args = process.argv.slice(2);
const flags = {};
for (const a of args) {
  if (a === '--apply') flags.apply = true;
  else if (a === '--dry-run') flags.apply = false;
  else if (a === '--all') flags.all = true;
  else if (a === '--no-body') flags.noBody = true;
  else if (a === '--sample') flags.sample = true;
  else if (a.startsWith('--dataset=')) flags.dataset = a.split('=')[1];
  else if (a.startsWith('--type=')) flags.type = a.split('=')[1];
  else if (a.startsWith('--limit=')) flags.limit = parseInt(a.split('=')[1], 10);
  else if (a.startsWith('--delay-ms=')) flags.delayMs = parseInt(a.split('=')[1], 10);
  else if (a === '--help') {
    console.log(
      'Uso: node scripts/fix-sanity-entities.mjs [--apply] [--dataset=X] [--type=X] [--limit=N] [--no-body] [--sample]',
    );
    process.exit(0);
  }
}
const delayMs = flags.delayMs ?? 250;

const TIPOS = ['publicacion', 'categoria', 'etiqueta', 'autor', 'webAmiga'];
const objetivo = flags.type ? [flags.type] : TIPOS;

// Campos de texto plano por tipo (ruta -> getter ya resuelto en el doc fetch)
function camposPublicacion(doc) {
  const set = {};
  for (const k of ['title', 'club', 'description', 'seoTitle', 'seoDescription', 'readingTime']) {
    if (typeof doc[k] === 'string' && doc[k]) {
      const v = decodificarEntidades(doc[k]);
      if (v !== doc[k]) set[k] = v;
    }
  }
  if (doc.mainImage && typeof doc.mainImage === 'object') {
    for (const k of ['alt', 'caption']) {
      const cur = doc.mainImage[k];
      if (typeof cur === 'string' && cur) {
        const v = decodificarEntidades(cur);
        if (v !== cur) set[`mainImage.${k}`] = v;
      }
    }
  }
  return set;
}

function camposGenericos(doc, keys) {
  const set = {};
  for (const k of keys) {
    if (typeof doc[k] === 'string' && doc[k]) {
      const v = decodificarEntidades(doc[k]);
      if (v !== doc[k]) set[k] = v;
    }
  }
  return set;
}

function cuerpoDecodificado(body) {
  let changed = false;
  const nuevo = (body ?? []).map((b) => {
    if (!b || !Array.isArray(b.children)) return b;
    const children = b.children.map((c) => {
      if (typeof c.text === 'string' && c.text) {
        const t = decodificarEntidades(c.text);
        if (t !== c.text) {
          changed = true;
          return { ...c, text: t };
        }
      }
      return c;
    });
    return { ...b, children };
  });
  return { nuevo, changed };
}

function proyeccion(tipo) {
  if (tipo === 'publicacion') {
    const cam = [
      'title',
      'club',
      'description',
      'seoTitle',
      'seoDescription',
      'readingTime',
      "'mainImage': mainImage{alt, caption}",
    ];
    if (!flags.noBody) cam.push('body');
    return `_id, ${cam.join(', ')}`;
  }
  if (tipo === 'categoria') return '_id, name, description';
  if (tipo === 'autor') return '_id, name, role, bio';
  if (tipo === 'webAmiga') return '_id, name, description';
  return '_id, name';
}

async function main() {
  if (flags.dataset) process.env.SANITY_DATASET = flags.dataset;
  const { client, dataset } = createSanity();
  const projectId = process.env.SANITY_PROJECT_ID;

  console.log(`→ Sanity: ${projectId}/${dataset}`);
  console.log(`→ Modo: ${flags.apply ? 'ESCRITURA (--apply)' : 'DRY-RUN (no escribe)'}`);
  console.log(`→ Tipos: ${objetivo.join(', ')}${flags.noBody ? ' [body omitido]' : ''}\n`);

  let totalDocs = 0;
  let docsACambiar = 0;
  let camposParcheados = 0;
  const todosParches = [];

  for (const tipo of objetivo) {
    const query = `*[_type == $tipo]${flags.limit ? ` [0...${flags.limit}]` : ''}{ ${proyeccion(tipo)} } | order(_createdAt asc)`;
    let docs;
    try {
      docs = await client.fetch(query, { tipo });
    } catch (e) {
      console.error(`  ! ${tipo}: ${e.message}`);
      continue;
    }
    docs = docs ?? [];
    let tipoCambios = 0;

    for (const doc of docs) {
      let set = {};
      if (tipo === 'publicacion') set = camposPublicacion(doc);
      else if (tipo === 'categoria') set = camposGenericos(doc, ['name', 'description']);
      else if (tipo === 'autor') set = camposGenericos(doc, ['name', 'role', 'bio']);
      else if (tipo === 'webAmiga') set = camposGenericos(doc, ['name', 'description']);
      else if (tipo === 'etiqueta') set = camposGenericos(doc, ['name']);

      if (tipo === 'publicacion' && !flags.noBody) {
        const { nuevo, changed } = cuerpoDecodificado(doc.body);
        if (changed) set.body = nuevo;
      }

      const n = Object.keys(set).length;
      if (n > 0) {
        tipoCambios++;
        camposParcheados += n;
        todosParches.push({ id: doc._id, tipo, set });
        if (flags.sample && tipoCambios <= 3) {
          console.log(`  · [${tipo}] ${doc._id}`);
          for (const [k, v] of Object.entries(set)) {
            if (k === 'body') {
              console.log(
                `      body: (${(doc.body ?? []).length} bloques con spans decodificados)`,
              );
            } else {
              const antes =
                tipo === 'publicacion'
                  ? k === 'mainImage.alt'
                    ? doc.mainImage?.alt
                    : k === 'mainImage.caption'
                      ? doc.mainImage?.caption
                      : doc[k]
                  : doc[k];
              console.log(`      ${k}:\n        - ${antes}\n        + ${v}`);
            }
          }
        }
      }
    }
    totalDocs += docs.length;
    docsACambiar += tipoCambios;
    console.log(`→ ${tipo}: ${docs.length} docs, ${tipoCambios} con cambios`);
  }

  console.log(
    `\n== RESUMEN ==\n Docs analizados: ${totalDocs}\n Docs a modificar: ${docsACambiar}\n Campos parcheados: ${camposParcheados}`,
  );

  if (!flags.apply) {
    console.log('\nDRY-RUN: no se ha escrito nada. Repite con --apply para aplicar.');
    if (!todosParches.length) console.log('No hay nada que cambiar. ✔');
    return;
  }

  if (!todosParches.length) {
    console.log('No hay nada que cambiar. ✔');
    return;
  }

  console.log(`\n→ Aplicando ${todosParches.length} parches en lotes de 50…`);
  let aplicados = 0;
  for (let i = 0; i < todosParches.length; i += 50) {
    const lote = todosParches.slice(i, i + 50);
    const tx = client.transaction();
    for (const p of lote) tx.patch(p.id, { set: p.set });
    await tx.commit();
    aplicados += lote.length;
    console.log(`  …${aplicados}/${todosParches.length}`);
    if (i + 50 < todosParches.length) await sleep(delayMs);
  }
  console.log(`\n✔ Listo. ${aplicados} documentos actualizados en ${projectId}/${dataset}.`);
}

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

main().catch((e) => {
  console.error('Fallo:', e);
  process.exit(1);
});
