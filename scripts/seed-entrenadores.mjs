#!/usr/bin/env node
// Siembra el banco de ejercicios de Futbolverdadero Entrenadores con contenido de EJEMPLO
// (2 fichas gratis + 2 premium, con categorías y objetivos de referencia) para poder ver
// el catálogo y el candado funcionando antes de que Xabi cargue contenido real.
//
// Todos los documentos usan _id fijo con prefijo «seed-» => --limpiar los borra sin
// tocar nada más. createOrReplace: repetir el seed actualiza los mismos docs, no duplica.
//
// Uso:
//   node scripts/seed-entrenadores.mjs                  -> DRY-RUN (no escribe), muestra el alcance
//   node scripts/seed-entrenadores.mjs --apply          -> escribe en Sanity
//   node scripts/seed-entrenadores.mjs --limpiar        -> preview del borrado
//   node scripts/seed-entrenadores.mjs --limpiar --apply -> borra (pide «si» en TTY)
//   node scripts/seed-entrenadores.mjs --dataset=X      -> sobrescribe SANITY_DATASET
//
// Flags:
//   --apply      Escribe/borra sin pedir confirmación (por defecto es dry-run).
//   --limpiar    Elimina los documentos sembrados (en vez de crearlos).
//   --dataset=X  Sobrescribe SANITY_DATASET (default: el del .env o «production»).
import 'dotenv/config';
import readline from 'node:readline/promises';
import { createSanity } from './lib/sanity.mjs';

const args = process.argv.slice(2);
const flags = { apply: false, limpiar: false };
for (const a of args) {
  if (a === '--apply') flags.apply = true;
  else if (a === '--limpiar') flags.limpiar = true;
  else if (a.startsWith('--dataset=')) flags.dataset = a.split('=')[1];
  else if (a === '--help') {
    console.log('Uso: node scripts/seed-entrenadores.mjs [--apply] [--limpiar] [--dataset=X]');
    process.exit(0);
  }
}

// Claves _key únicas (el API no las genera en arrays inline que definimos nosotros).
let ck = 0;
const k = () => `seed${(++ck).toString(36).padStart(4, '0')}`;
const span = (text) => ({ _key: k(), _type: 'span', text, marks: [] });
const p = (text) => ({ _key: k(), _type: 'block', style: 'normal', children: [span(text)] });
const h3 = (text) => ({ _key: k(), _type: 'block', style: 'h3', children: [span(text)] });
const ref = (_ref) => ({ _key: k(), _type: 'reference', _ref });

// publishedAt escalonado (días hacia atrás) para un orden estable en el catálogo.
const haceDias = (n) => new Date(Date.now() - n * 86400000).toISOString();

const CATEGORIES = [
  {
    _id: 'seed-cat-conservacion',
    _type: 'categoriaEjercicio',
    name: 'Conservación y rondos',
    slug: { current: 'conservacion-y-rondos' },
    description: 'Superioridad, posesión y apoyos orientados.',
  },
  {
    _id: 'seed-cat-transiciones',
    _type: 'categoriaEjercicio',
    name: 'Transiciones',
    slug: { current: 'transiciones' },
    description: 'Reacción inmediata tras perder o recuperar el balón.',
  },
  {
    _id: 'seed-cat-salida',
    _type: 'categoriaEjercicio',
    name: 'Salida de balón',
    slug: { current: 'salida-de-balon' },
    description: 'Construcción desde atrás contra presión.',
  },
  {
    _id: 'seed-cat-finalizacion',
    _type: 'categoriaEjercicio',
    name: 'Finalización',
    slug: { current: 'finalizacion' },
    description: 'Remate, últimos metros y ataques al espacio.',
  },
];

const OBJETIVOS = [
  {
    _id: 'seed-obj-presion',
    _type: 'objetivo',
    name: 'Presión tras pérdida',
    slug: { current: 'presion-tras-perdida' },
    description: 'Reacción colectiva e inmediata al robo rival: cerca, cubre, recupera.',
  },
  {
    _id: 'seed-obj-superioridad',
    _type: 'objetivo',
    name: 'Superioridad numérica ofensiva',
    slug: { current: 'superioridad-numerica-ofensiva' },
    description: 'Crear y mantener 2v1/3v2 y orientar el cuerpo para conservarla.',
  },
  {
    _id: 'seed-obj-decision',
    _type: 'objetivo',
    name: 'Toma de decisión bajo presión',
    slug: { current: 'toma-de-decision-bajo-presion' },
    description: 'Elegir pase, conducción o giro con el rival encima y sin perder tiempo.',
  },
];

const EJERCICIOS = [
  {
    _id: 'seed-ej-rondos-orientacion',
    _type: 'ejercicio',
    title: 'Rondos con cambio de orientación',
    slug: { current: 'rondos-con-cambio-de-orientacion' },
    acceso: 'free',
    categorias: [ref('seed-cat-conservacion')],
    objetivos: [ref('seed-obj-superioridad')],
    tipoTarea: 'tactica',
    jugadoresMin: 6,
    jugadoresMax: 10,
    categoriasEdad: ['benjamin', 'alevin'],
    espacio: 'reducido',
    espacioMedidas: '12x12 m (rondo) + 4 quadrados de 4x4 m en las esquinas',
    duracionMin: 15,
    material: ['Conos', 'Petos / chalecos', 'Balones'],
    resumen:
      'Rondo clásico con objetivo extra: los exteriores solo pueden recibir cambiando la orientación del juego. Simple de montar y con lectura táctica real.',
    desarrollo: [
      p(
        'Dos equipos: 5-6 por dentro (posesión) y 2-4 por fuera en los quadrados. El equipo de dentro puntúa encadenando 6 pases; los de fuera puntúan robando y saliendo con el balón controlado hacia su quadrado.',
      ),
      h3('Regla que lo convierte en tarea de juego'),
      p(
        'Un pase solo vale si cambia la mitad del campo (orientación). El apoyo exterior que recibe NO puede devolver al mismo interior: debe conectar con otro o con el exterior contrario. Así el rondo deja de ser un «se la pasan entre amigos» y obliga a mirar el campo entero.',
      ),
      h3('Progresión'),
      p(
        '1) Libre una vez por posesión. 2) Obligatorio en cada serie de 6. 3) Un solo toque hacia el exterior.',
      ),
    ],
    claves: [
      'Cuerpo abierto del receptor interior: recibe mirando hacia el exterior, no hacia el balón.',
      'El pase de orientación es el pase fuerte a la altura del pecho, no picado.',
      'Exteriores: controlar y proteger antes de pensar el siguiente pase.',
    ],
    errores: [
      'Buscar siempre el mismo exterior por comodidad: corrige cambiando el cono de posición cada 2 minutos.',
      'Aceptación de pases «flojos» que el rival intercepta a medio camino: haz repetir la serie desde 0.',
    ],
    variantes: [
      '2toques interiores / 1 toque exteriores: sube la velocidad de decisión.',
      'Añade un comodín neutro: el equipo que defiende recupera con 3 robos, no con 1.',
    ],
    publishedAt: haceDias(1),
  },
  {
    _id: 'seed-ej-4v4-porterias',
    _type: 'ejercicio',
    title: '4v4 con porterías laterales',
    slug: { current: '4v4-con-porterias-laterales' },
    acceso: 'free',
    categorias: [ref('seed-cat-transiciones')],
    objetivos: [ref('seed-obj-presion')],
    tipoTarea: 'cognitiva',
    jugadoresMin: 8,
    jugadoresMax: 12,
    categoriasEdad: ['alevin', 'infantil'],
    espacio: 'reducido',
    espacioMedidas: '25x18 m, 4 porterías pequeñas (una por lado, 2 m)',
    duracionMin: 12,
    material: ['Porterías portátiles', 'Picas', 'Petos / chalecos', 'Balones'],
    resumen:
      'Cuatro porterías (una por equipo en cada lado): marcar exige leer qué portería está desprotegida ahora mismo. La presión tras pérdida se entrena sola: el equipo que roba ataca y el que pierde defiende al instante.',
    desarrollo: [
      p(
        'Dos equipos de 4. Cada equipo defiende SU portería (lado norte) y puede marcar también en la portería lateral del lado este o oeste. Resultado: siempre hay dos porterías válidas y el rival nunca sabe cuál atacará.',
      ),
      h3('Regla de transición'),
      p(
        'Al perder el balón, los 4 deben quedar entre el balón y su portería antes del siguiente toque rival (3 segundos). Si el rival tira a portería antes, el gol vale doble: el castigo entrena la reacción, no la queja.',
      ),
      h3('Gestión'),
      p(
        'Partidos a 3 goles o 3 minutos, gana el que más porterías distintas haya usado (fomenta la lectura, no el gol repetido). Rotación completa cada 12.',
      ),
    ],
    claves: [
      'Primer toque tras robar: hacia fuera del presión, no en dirección propia.',
      'El jugador más cercano al balón presiona; los otros dos cierran línea de pase interior; el cuarto cubre profundidad.',
      'Pregunta activa entre partido y partido: «¿qué portería estaba libre y por qué no la usaste?»',
    ],
    errores: [
      'Los 4 van a la misma portería: falta de información del entrenador sobre el gol doble por porterías distintas.',
      'Presión «bailar» sin orientación corporal: presionar corriendo hacia el balón sin cortar la línea hacia portería.',
    ],
    variantes: [
      'Sin regla de 3 segundos: juego libre para comparar el antes/después (útil para el discurso del club).',
      '3v3+3 comodines exteriores: el equipo con balón siempre tiene superioridad: entrena finalizar la transición.',
    ],
    publishedAt: haceDias(2),
  },
  {
    _id: 'seed-ej-salida-presion-zonal',
    _type: 'ejercicio',
    title: 'Salida de balón contra presión zonal (8v8+2)',
    slug: { current: 'salida-de-balon-contra-presion-zonal' },
    acceso: 'premium',
    categorias: [ref('seed-cat-salida')],
    objetivos: [ref('seed-obj-decision'), ref('seed-obj-superioridad')],
    tipoTarea: 'tactica',
    jugadoresMin: 10,
    jugadoresMax: 14,
    categoriasEdad: ['infantil', 'cadete'],
    espacio: 'medio',
    espacioMedidas: '35x30 m + 3 zonas verticales marcadas con picas',
    duracionMin: 20,
    material: ['Picas', 'Conos', 'Petos / chalecos', 'Balones'],
    resumen:
      'El equipo que construye contra un rival que presiona por zonas: los comodines por dentro desatan la presión y obligan a elegir entre saltar línea o atraer y girar. La ficha completa trae el diagrama de zonas, los disparadores de presión rival y 3 progresiones.',
    desarrollo: [
      p(
        'Equipo rojo (1 portero + 4 defensas + 2 mediocentros + 2 comodines que solo juegan por dentro) sale el balón contra equipo azul (8) que presiona por zonas: cada zona se defiende al hombre y las líneas basculan juntas.',
      ),
      h3('Regla de superación'),
      p(
        'El objetivo no es «pasar al mediocentro»: es superar la segunda línea de presión (el balón llega a un delantero o comodín en zona franca). Contable: 1 punto por superar líneas, 3 por gol tras superarlas sin pérdida intermedia.',
      ),
      h3('Lectura clave'),
      p(
        'Si el central tiene tiempo, el problema es que la presión azul no llega: deja jugar. Si el central repite pase hacia el mismo sitio sin avanzar, el problema es posicional: para y corrige con preguntas («¿dónde está el espacio?»).',
      ),
    ],
    claves: [
      'Portero como +1 real: si no participa, la ventaja numérica trasera no se usa.',
      'Mediocentro entre líneas: recibe de perfil, un toque hacia el exterior libre y devuelve el apoyo al interior.',
      'Comodines: por dentro NO regatean; su función es desordenar la presión y descargar.',
      'Exterior que baja a recibir = exterior que luego debe atacar profundidad en el siguiente momento: entrena el Enganche → Ataque.',
    ],
    errores: [
      'Central que siempre busca el pase largo al 9: la presión rival se come el intento; corrige con norma de 2 toques y recompensa al pase roto entre líneas.',
      'El 6 baja a la línea del balón y deja el pasillo interior muerto: recordatorio de posición con conos altos.',
    ],
    variantes: [
      'Presión libre del azul: el rojo debe reconocer cuándo saltar y cuándo atraer (más cognitivo, más caos).',
      'Sin comodines (8v8 puro): el que construye necesita superioridad con tercer central: entrena salidas en 3.',
      'Meta del rojo = mantener posesión 20 pases en campo contrario: presión sin portería (más simple, mismo principio).',
    ],
    publishedAt: haceDias(3),
  },
  {
    _id: 'seed-ej-finalizacion-segundo-palo',
    _type: 'ejercicio',
    title: 'Finalización: ataques al segundo palo',
    slug: { current: 'finalizacion-ataques-al-segundo-palo' },
    acceso: 'premium',
    categorias: [ref('seed-cat-finalizacion')],
    objetivos: [ref('seed-obj-superioridad')],
    tipoTarea: 'tactica',
    jugadoresMin: 8,
    jugadoresMax: 12,
    categoriasEdad: ['alevin', 'infantil', 'cadete'],
    espacio: 'completo',
    espacioMedidas: 'medio campo con 2 porterías y porteros',
    duracionMin: 18,
    material: ['Conos', 'Petos / chalecos', 'Balones'],
    resumen:
      'Circuito de centros laterales con norma de ocupación: primero palo, punto de penalti y segundo palo + rebote. Se entrena el timing de la carrera, no solo el remate. Incluye las 3 normas que convierten el circuito en situación de juego.',
    desarrollo: [
      p(
        'Dos columnas atacantes (exterior con balón + 3 que atacan el área) contra fila de defensas estáticos (los primeros 2 minutos) y luego activos. El exterior conduce por banda y centra raso al segundo palo.',
      ),
      h3('Regla de oro de la ocupación'),
      p(
        'Obligatoria la llegada de 3: uno al primer palo, uno al punto de penalti, uno al segundo palo. El cuarto atacante corta el rebote desde fuera. Sin esa forma, el gol no suma: el circuito entrena la estructura, no la casualidad.',
      ),
      h3('Timing'),
      p(
        'El del segundo palo sale cuando el exterior levanta la cabeza para centrar (no antes). Si el defensa lo ve parado, llega tarde: pregunta «¿desde cuándo corrías?».',
      ),
    ],
    claves: [
      'Centro raso y fuerte al segundo palo antes de elevar: en fútbol base el balón aéreo se convierte en despeje.',
      'El atacante del segundo palo ataca la ESPALDA del defensa, no el espacio que ve.',
      'Gol de primero vale doble si lo marca el que atacó el espacio del central: premia la lectura del rebote.',
    ],
    errores: [
      'Todos atacan el primer palo: se anulan entre ellos; marca con conos la zona prohibida para dos de ellos.',
      'El que centra mira el área y frena: la regla del ritmo obliga a centrar con el primer bote limpio.',
    ],
    variantes: [
      'Centros desde la línea de fondo con defensa 2v2 real (más contacto y más decisión).',
      'Ataque continuo: los defensas recuperados salen conduciendo contra la portería opuesta (cierra el circuito y mete transición defensiva).',
    ],
    publishedAt: haceDias(4),
  },
];

const DOCS = [...CATEGORIES, ...OBJETIVOS, ...EJERCICIOS];
const IDS = DOCS.map((d) => d._id);

async function main() {
  if (flags.dataset) process.env.SANITY_DATASET = flags.dataset;
  const { client, dataset } = createSanity();
  const projectId = process.env.SANITY_PROJECT_ID;
  const accion = flags.limpiar ? 'LIMPIAR (borrar)' : 'SEMBRAR (crear/actualizar)';

  console.log(`→ Sanity: ${projectId}/${dataset}`);
  console.log(`→ Acción: ${accion}`);
  console.log(`→ Modo: ${flags.apply ? 'ESCRITURA (--apply)' : 'DRY-RUN (no escribe)'}\n`);

  const existentes = await client.fetch(
    `*[_id in $ids]{ _id, _type, "label": coalesce(title, name) }`,
    {
      ids: IDS,
    },
  );
  const porId = Object.fromEntries(existentes.map((d) => [d._id, d]));

  for (const d of DOCS) {
    const ya = porId[d._id];
    if (flags.limpiar) {
      if (ya) console.log(`  ✗ borrar   ${d._id}  (${ya._type})  ${ya.label ?? ''}`);
      else console.log(`  ·  ausente ${d._id} (no hay nada que borrar)`);
    } else {
      const label = d.title ?? d.name;
      const acceso = d.acceso ? ` [${d.acceso}]` : '';
      console.log(
        `  ${ya ? '↻ actualizar' : '+ crear   '} ${d._id}  (${d._type})  ${label}${acceso}`,
      );
    }
  }

  const aBorrar = flags.limpiar ? IDS.filter((id) => porId[id]) : [];
  console.log('\n== RESUMEN ==');
  if (flags.limpiar) {
    console.log(` Docs sembrados presentes: ${aBorrar.length}/${IDS.length}`);
    if (!aBorrar.length) {
      console.log('No hay docs de ejemplo que borrar. ✔');
      return;
    }
  } else {
    const nuevos = DOCS.filter((d) => !porId[d._id]);
    console.log(
      ` Documentos del seed: ${DOCS.length} (${nuevos.length} nuevos, ${DOCS.length - nuevos.length} ya existentes → se actualizan)`,
    );
    console.log(
      ` Ejercicios: ${EJERCICIOS.filter((e) => e.acceso === 'free').length} free + ${EJERCICIOS.filter((e) => e.acceso === 'premium').length} premium`,
    );
  }

  if (!flags.apply) {
    const next = flags.limpiar
      ? 'Repite con --apply para BORRAR los docs de ejemplo.'
      : 'Repite con --apply para escribir en Sanity.';
    console.log(`\nDRY-RUN: no se ha tocado nada. ${next}`);
    return;
  }

  const rl = await readline.createInterface({ input: process.stdin, output: process.stdout });
  try {
    if (flags.limpiar) {
      if (process.stdin.isTTY) {
        const ok = await rl.question(
          `\n⚠ Confirmar BORRADO de ${aBorrar.length} docs de ejemplo en ${dataset} [escribe si]: `,
        );
        if (ok.trim().toLowerCase() !== 'si') {
          console.log('Cancelado. No se ha borrado nada.');
          return;
        }
      }
      const tx = client.transaction();
      for (const id of aBorrar) tx.delete(id);
      await tx.commit();
      console.log(`\n✔ Borrados ${aBorrar.length} docs de ejemplo. Banco limpio de seed.`);
    } else {
      const tx = client.transaction();
      for (const d of DOCS) tx.createOrReplace(d);
      await tx.commit();
      console.log(`\n✔ Sembrados ${DOCS.length} docs en ${projectId}/${dataset}.`);
      console.log(
        '  Catálogo: /entrenadores/ejercicios/  ·  premium bloqueado: /entrenadores/ejercicios/salida-de-balon-contra-presion-zonal/',
      );
    }
  } finally {
    rl.close();
  }
}

main().catch((e) => {
  console.error('Fallo:', e);
  process.exit(1);
});
