#!/usr/bin/env node
// Limpia en lote los prefijos de almohadilla heredados de WordPress en los titulos de
// Sanity: «#Entrevistas: X», «#Entrevista: X», «#Futbolverdadero :: X», «#OPINION: X»,
// «##Entrevistas: X»… -> «X». Actua sobre title y seoTitle de publicacion.
//
// Regla: si despues del o los # iniciales hay una etiqueta corta (<=30 letras/numeros/
// espacios y &) cerrada por ':' o '::' y un espacio, se elimina todo el prefijo.
// Si el titulo empieza por # pero no hay prefijo de ese tipo (p. ej.
// «#APOYO AL BOAVISTA CF» o «# Gestión Emocional y Periodización en Fútbol Base: …»),
// se quita solo la almohadilla y el titulo pasa a la lista de revision.
//
// Uso:
//   node scripts/fix-sanity-titles.mjs                 -> DRY-RUN (no escribe), muestra el alcance
//   node scripts/fix-sanity-titles.mjs --apply         -> escribe los cambios
//   node scripts/fix-sanity-titles.mjs --dataset=production
//   node scripts/fix-sanity-titles.mjs --limit=5 --sample
//
// Flags:
//   --apply          Escribe en Sanity (por defecto es dry-run por seguridad).
//   --dry-run        Explícito: no escribe (es el default).
//   --dataset=X      Sobrescribe SANITY_DATASET.
//   --limit=N        Procesa solo los N primeros docs (útil para probar).
//   --sample         Imprime ejemplos antes/después (primeros 10).
//   --drafts         Incluye también los borradores (drafts.*) además de los publicados.
//   --conservar-sin-dos-puntos   No toca los titulos con # que no tienen prefijo «etiqueta:».
//   --delay-ms=N     Pausa (ms) entre lotes de escritura. Default 250.
import 'dotenv/config';
import { createSanity } from './lib/sanity.mjs';

const args = process.argv.slice(2);
const flags = {};
for (const a of args) {
  if (a === '--apply') flags.apply = true;
  else if (a === '--dry-run') flags.apply = false;
  else if (a === '--drafts') flags.drafts = true;
  else if (a === '--sample') flags.sample = true;
  else if (a === '--conservar-sin-dos-puntos') flags.conservarSinDosPuntos = true;
  else if (a.startsWith('--dataset=')) flags.dataset = a.split('=')[1];
  else if (a.startsWith('--limit=')) flags.limit = parseInt(a.split('=')[1], 10);
  else if (a.startsWith('--delay-ms=')) flags.delayMs = parseInt(a.split('=')[1], 10);
  else if (a === '--help') {
    console.log(
      'Uso: node scripts/fix-sanity-titles.mjs [--apply] [--dataset=X] [--limit=N] [--sample] [--drafts] [--conservar-sin-dos-puntos]',
    );
    process.exit(0);
  }
}
const delayMs = flags.delayMs ?? 250;

// «#Entrevistas: », «#Futbolverdadero :: », «##Entrevista : », «# entrevista: »…
const RE_PREFIJO =
  /^#{1,2}[ \t]*([\p{L}\p{N}][\p{L}\p{N}&' -]{0,29}?)[ \t]*::?[ \t]*(?:&nbsp;)?[ \t]+(?=\S)/iu;
const RE_ALMOHADILLA = /^#+[ \t]*/;

// Devuelve { title, seoTitle, revision } o null si no hay cambios.
function limpiar(doc) {
  let revision = false;
  const set = {};
  for (const campo of ['title', 'seoTitle']) {
    const antes = doc[campo];
    if (typeof antes !== 'string' || !antes.startsWith('#')) continue;
    const conPrefijo = antes.replace(RE_PREFIJO, '');
    if (conPrefijo !== antes) {
      set[campo] = conPrefijo.trimStart();
      continue;
    }
    // Sin prefijo «etiqueta:»: solo se quita la almohadilla (caso a revisar).
    if (flags.conservarSinDosPuntos) continue;
    const sinAlmohadilla = antes.replace(RE_ALMOHADILLA, '');
    if (sinAlmohadilla !== antes) {
      set[campo] = sinAlmohadilla.trimStart();
      revision = true;
    }
  }
  return Object.keys(set).length ? { set, revision } : null;
}

async function main() {
  if (flags.dataset) process.env.SANITY_DATASET = flags.dataset;
  const { client, dataset } = createSanity();
  const projectId = process.env.SANITY_PROJECT_ID;

  console.log(`→ Sanity: ${projectId}/${dataset}`);
  console.log(`→ Modo: ${flags.apply ? 'ESCRITURA (--apply)' : 'DRY-RUN (no escribe)'}`);
  console.log(
    `→ Documentos: ${flags.drafts ? 'publicados + borradores' : 'solo publicados (sin drafts.*)'}\n`,
  );

  const filtroDrafts = flags.drafts ? '' : ' && !(_id in path("drafts.**"))';
  const query = `*[_type == 'publicacion' && title match '*' ${filtroDrafts}]${
    flags.limit ? ` [0...${flags.limit}]` : ''
  }{ _id, title, seoTitle } | order(_createdAt asc)`;
  const docs = (await client.fetch(query)) ?? [];

  const parches = [];
  const aRevisar = [];
  let sinCambios = 0;
  for (const doc of docs) {
    const res = limpiar(doc);
    if (!res) {
      sinCambios++;
      continue;
    }
    parches.push({ id: doc._id, set: res.set });
    if (res.revision) aRevisar.push({ id: doc._id, antes: doc.title, despues: res.set.title });
    if (flags.sample && parches.length <= 10) {
      console.log(`  · ${doc._id}`);
      for (const [k, v] of Object.entries(res.set)) {
        console.log(`      ${k}:\n        - ${doc[k]}\n        + ${v}`);
      }
    }
  }

  const quedanConHash = docs.filter((d) => {
    const p = parches.find((x) => x.id === d._id);
    const final_ = p?.set.title ?? d.title;
    return typeof final_ === 'string' && final_.startsWith('#');
  });
  for (const d of quedanConHash)
    console.log(`  · QUEDA CON #: ${d._id} ${JSON.stringify(d.title)}`);

  console.log(`\n== RESUMEN ==`);
  console.log(` Docs analizados: ${docs.length}`);
  console.log(` Docs con cambios: ${parches.length}`);
  console.log(` Docs sin almohadilla (intactos): ${sinCambios}`);
  console.log(` Titulos que aun quedarian con #: ${quedanConHash.length}`);
  console.log(` Parches de campo: ${parches.reduce((n, p) => n + Object.keys(p.set).length, 0)}`);
  console.log(
    ` ⚠ Titulos sin prefijo «etiqueta:» (se quita solo el # — revisar): ${aRevisar.length}`,
  );
  for (const r of aRevisar)
    console.log(`    · ${r.id}\n        - ${r.antes}\n        + ${r.despues}`);

  if (!flags.apply) {
    console.log('\nDRY-RUN: no se ha escrito nada. Repite con --apply para aplicar.');
    if (!parches.length) console.log('No hay nada que cambiar. ✔');
    return;
  }
  if (!parches.length) {
    console.log('No hay nada que cambiar. ✔');
    return;
  }

  console.log(`\n→ Aplicando ${parches.length} parches en lotes de 50…`);
  let aplicados = 0;
  for (let i = 0; i < parches.length; i += 50) {
    const lote = parches.slice(i, i + 50);
    const tx = client.transaction();
    for (const p of lote) tx.patch(p.id, { set: p.set });
    await tx.commit();
    aplicados += lote.length;
    console.log(`  …${aplicados}/${parches.length}`);
    if (i + 50 < parches.length) await new Promise((r) => setTimeout(r, delayMs));
  }
  console.log(`\n✔ Listo. ${aplicados} documentos actualizados en ${projectId}/${dataset}.`);
}

main().catch((e) => {
  console.error('Fallo:', e);
  process.exit(1);
});
