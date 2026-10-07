#!/usr/bin/env node
// Siembra la zona Futbolverdadero Entrenadores con contenido de EJEMPLO: taxonomías,
// 4 ejercicios (2 free + 2 premium), 2 sesiones (1 free + 1 premium), 3 herramientas
// con PDFs generados (2 free + 1 premium) y 2 dossiers de metodología (1 free para el
// blog + 1 premium) para ver catálogo, candado, descargas e impresión funcionando
// antes de que Xabi cargue contenido real.
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
const h2 = (text) => ({ _key: k(), _type: 'block', style: 'h2', children: [span(text)] });
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

// Sesiones de ejemplo: la estructura enlaza los ejercicios sembrados (o bloques ad hoc).
const bloque = (fase, duracionMin, notas, ejercicioId) => ({
  _key: k(),
  _type: 'bloqueSesion',
  fase,
  duracionMin,
  notas,
  ...(ejercicioId ? { ejercicio: ref(ejercicioId) } : {}),
});

const SESIONES = [
  {
    _id: 'seed-sesion-conservacion-75',
    _type: 'sesion',
    title: 'Sesión: conservación y cambio de orientación (75 min)',
    slug: { current: 'sesion-conservacion-y-cambio-de-orientacion' },
    acceso: 'free',
    objetivoGeneral:
      'Que el equipo mantenga el balón moviéndolo de lado a lado y que los apoyos se orienten antes de recibir. Todo la sesión gira alrededor de la superioridad por dentro.',
    objetivos: [ref('seed-obj-superioridad')],
    categoriasEdad: ['benjamin', 'alevin'],
    duracionMin: 75,
    material: ['Conos', 'Petos / chalecos', 'Balones'],
    estructura: [
      bloque(
        'calentamiento',
        10,
        'Pases en cuadrado 4v1 libre: solo cuenta el primer toque hacia el espacio. Sin presión al hombre: el que roba sale del medio.',
      ),
      bloque('tarea', 20, null, 'seed-ej-rondos-orientacion'),
      bloque(
        'juegoCondicionado',
        15,
        'Posesión 6v6 en 30x20 con dos zonas: para puntuar, el balón debe cruzar la zona central en 4 toques máximo.',
      ),
      bloque(
        'partido',
        22,
        '8v8 con porterías grandes. Regla: gol tras cambio de orientación vale doble. Sin correcciones durante el juego.',
      ),
      bloque(
        'vueltaCalma',
        8,
        'Ronda de preguntas: «¿cuándo veis que el lado fuerte está cerrado?». Estiramiento en pareja con pases suaves.',
      ),
    ],
    claves: [
      'El rondo solo funciona si el exterior que recibe protege el balón con el cuerpo: sin eso, todo lo demás se cae.',
      'En el partido final, deja que se equivoquen: el gol doble por orientación hace que ellos solos busquen el cambio.',
      'Pregunta en la vuelta a la calma, no durante el partido: en el juego se entrena, después se piensa.',
    ],
    variantes: [
      'Versión de 60 min: quita el juego condicionado y alarga el partido a 30.',
      'Si el equipo es muy superior, pasa a 5v5 con comodín exterior por dentro.',
    ],
    publishedAt: haceDias(0),
  },
  {
    _id: 'seed-sesion-presion-salida-90',
    _type: 'sesion',
    title: 'Sesión: presión tras pérdida y salida bajo presión (90 min)',
    slug: { current: 'sesion-presion-tras-perdida-y-salida-bajo-presion' },
    acceso: 'premium',
    objetivoGeneral:
      'Unir las dos caras del mismo comportamiento: reaccionar juntos al robo y, con el balón, salir de la presión sin patadones. La sesión entera alterna atacar-pressing y defender-pressing.',
    objetivos: [ref('seed-obj-presion'), ref('seed-obj-decision')],
    categoriasEdad: ['infantil', 'cadete'],
    duracionMin: 90,
    material: ['Picas', 'Conos', 'Porterías portátiles', 'Petos / chalecos', 'Balones'],
    estructura: [
      bloque(
        'calentamiento',
        12,
        'Rondo 4v2 con norma de 3 toques: quien pierde, presiona al balón con las dos manos a la espalda (recordatorio de postura).',
      ),
      bloque('tarea', 18, null, 'seed-ej-4v4-porterias'),
      bloque(
        'tarea',
        15,
        'Mini 2v2+1 en 15x12: el comodín solo juega de cara. Tras pérdida, los dos de fuera atacan el balón antes del 2º toque.',
      ),
      bloque('juegoCondicionado', 25, null, 'seed-ej-salida-presion-zonal'),
      bloque('partido', 14, null, 'seed-ej-finalizacion-segundo-palo'),
      bloque(
        'vueltaCalma',
        6,
        'Tira y afloja de preguntas: «¿cuándo presionamos juntos y cuándo no?» y «¿qué hicimos mejor al salir?». Vuelta a la calma con pases en círculo.',
      ),
    ],
    claves: [
      'No corrijas la salida Y la presión a la vez: elige una mira por bloque y pregúntala al final.',
      'En el juego condicionado, si el rojo supera la presión con 2 pases seguidos, para y saca al azul: que sientan el error estructural, no el individual.',
      'La vuelta a la calma verbal es parte del entrenamiento: el que no sabe explicar por qué presionó, mañana no presiona.',
    ],
    errores: [
      'Presión sin cobertura: el primero salta y los demás miran. Corrige con el grito de «¡cerca-cubre!» antes de cada bloque.',
    ],
    variantes: [
      'Versión de 75 min: quita el 2v2+1 y alarga el partido final a 25.',
      'Si el equipo no tiene portero fiable, empieza la salida desde el mediocentro (sin portero) y añade al portero al final.',
    ],
    publishedAt: haceDias(1),
  },
];

// ————— PDF mínimo sin dependencias —————
// Genera un PDF de una página (A4, Helvetica ± negrita) con WinAnsi para que
// las tildes y la ñ se vean bien. Suficiente para plantillas de ejemplo.
function pdfSimple(titulo, lineas) {
  const esc = (s) => String(s).replace(/\\/g, '\\\\').replace(/\(/g, '\\(').replace(/\)/g, '\\)');
  let stream = `BT /F1 16 Tf 56 782 Td (${esc(titulo)}) Tj ET\n`;
  let y = 750;
  for (const l of lineas) {
    if (l) {
      const bold = l.startsWith('## ');
      const texto = bold ? l.slice(3) : l;
      stream += `BT /${bold ? 'F1' : 'F2'} ${bold ? 12 : 10.5} Tf 56 ${y} Td (${esc(texto)}) Tj ET\n`;
    }
    y -= 20;
  }
  const objs = [
    '<< /Type /Catalog /Pages 2 0 R >>',
    '<< /Type /Pages /Kids [3 0 R] /Count 1 >>',
    '<< /Type /Page /Parent 2 0 R /MediaBox [0 0 595 842] /Contents 4 0 R /Resources << /Font << /F1 5 0 R /F2 6 0 R >> >> >>',
    `<< /Length ${Buffer.byteLength(stream, 'latin1')} >>\nstream\n${stream}endstream`,
    '<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold /Encoding /WinAnsiEncoding >>',
    '<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica /Encoding /WinAnsiEncoding >>',
  ];
  let pdf = '%PDF-1.4\n';
  const offsets = [];
  objs.forEach((o, i) => {
    offsets.push(Buffer.byteLength(pdf, 'latin1'));
    pdf += `${i + 1} 0 obj\n${o}\nendobj\n`;
  });
  const xref = Buffer.byteLength(pdf, 'latin1');
  pdf += `xref\n0 ${objs.length + 1}\n0000000000 65535 f \n`;
  for (const off of offsets) pdf += `${String(off).padStart(10, '0')} 00000 n \n`;
  pdf += `trailer\n<< /Size ${objs.length + 1} /Root 1 0 R >>\nstartxref\n${xref}\n%%EOF\n`;
  return Buffer.from(pdf, 'latin1');
}

const HERRAMIENTAS = [
  {
    _id: 'seed-herr-plantilla-sesion',
    _type: 'herramienta',
    title: 'Plantilla de sesión de campo (A4)',
    slug: { current: 'plantilla-de-sesion-de-campo' },
    acceso: 'free',
    description:
      'Una página A4 con todos los huecos que importan el martes: objetivo general, bloques con minutos, material y la pregunta para la vuelta a la calma. Imprime dos: una para el bolsillo y otra para el bolso.',
    formato: 'pdf',
    orden: 1,
    publishedAt: haceDias(2),
    pdf: {
      titulo: 'Futbolverdadero Entrenadores - Plantilla de sesion',
      lineas: [
        'Fecha: ____________  Categoria: ____________  Jugadores: ____/____',
        'Objetivo general: ______________________________________________',
        'Material: ______________________________________________________',
        '',
        '## 1. CALENTAMIENTO   ____ min',
        '   Desarrollo: ________________________________________________',
        '## 2. TAREA PRINCIPAL  ____ min',
        '   Desarrollo: ________________________________________________',
        '## 3. JUEGO CONDICIONADO ____ min',
        '   Reglas: ___________________________________________________',
        '## 4. PARTIDO FINAL   ____ min',
        '   Que observo hoy: ___________________________________________',
        '## 5. VUELTA A LA CALMA ____ min',
        '   Pregunta al grupo: _________________________________________',
        '',
        'Lo que no se pregunta, no se aprende. (c) elfutbolverdadero.com',
      ],
    },
  },
  {
    _id: 'seed-herr-planificacion-semanal',
    _type: 'herramienta',
    title: 'Planificación semanal del microciclo',
    slug: { current: 'planificacion-semanal-del-microciclo' },
    acceso: 'free',
    description:
      'El lunes ya sabe lo que pasa el martes, y el martes ya sabe lo que pasa el domingo. Una hoja con los 4 días, carga, foco táctico y el objetivo del partido. Sin PDFs de 30 páginas que nadie rellena.',
    formato: 'pdf',
    orden: 2,
    publishedAt: haceDias(5),
    pdf: {
      titulo: 'Futbolverdadero Entrenadores - Microciclo semanal',
      lineas: [
        'Semana: __________  Rival domingo: __________  Casa/Fuera: ____',
        '',
        '## LUNES - Recuperacion / analisis',
        '   Carga: baja   Foco: preguntas del ultimo partido',
        '## MARTES - Adquisicion',
        '   Carga: alta    Foco tactico: ______________________________',
        '   Objetivo del entrenamiento: ______________________________',
        '## MIERCOLES - Descanso / gimnasio',
        '## JUEVES - Optimizacion',
        '   Carga: media   Foco: situaciones del rival __________________',
        '## VIERNES - Velocidad / activacion',
        '   Carga: baja    Rituales y balón parado _____________________',
        '## DOMINGO - COMPETICION',
        '   Plan A: ____________________  Plan B: ____________________',
        '',
        'Si el plan no cabe en una hoja, es un deseo. (c) elfutbolverdadero.com',
      ],
    },
  },
  {
    _id: 'seed-herr-informe-postpartido',
    _type: 'herramienta',
    title: 'Informe postpartido individual (jugador)',
    slug: { current: 'informe-postpartido-individual' },
    acceso: 'premium',
    description:
      'La herramienta que convierte «has jugado bien» en feedback útil: 8 comportamientos observables valorados 1-5 con ejemplos, una palanca para la semana y una frase que el jugador recuerde. Plantilla premium del banco de informes.',
    formato: 'pdf',
    orden: 3,
    publishedAt: haceDias(8),
    pdf: {
      titulo: 'Futbolverdadero Entrenadores - Informe postpartido',
      lineas: [
        'Jugador: ______________  Posicion: ______  Partido: __________',
        '',
        '## COMPORTAMIENTOS (1 a 5 + ejemplo concreto)',
        '1. Perfiles al recibir .......... /5  Ej: ____________________',
        '2. Presion tras perdida ......... /5  Ej: ____________________',
        '3. Conduccion hacia espacio ..... /5  Ej: ____________________',
        '4. Decision pase/tiro/dribling .. /5  Ej: ____________________',
        '5. Comunicacion con companeros .. /5  Ej: ____________________',
        '6. Duelo defensivo .............. /5  Ej: ____________________',
        '7. Ayuda al companero presionado  /5  Ej: ____________________',
        '8. Actitud tras error ........... /5  Ej: ____________________',
        '',
        '## LA PALANCA DE LA SEMANA (una sola):',
        '____________________________________________________________',
        '## LA FRASE QUE SE LLEVA A CASA:',
        '____________________________________________________________',
        '',
        'Se evalua lo que se entrena, no lo que brilla. (c) elfutbolverdadero.com',
      ],
    },
  },
];

// Metodología: la free se sirve en el blog (URL canónica /slug/); la premium, en la zona.
const METODOLOGIA = [
  {
    _id: 'seed-met-error-informacion',
    _type: 'publicacion',
    title: 'El error como información: dar feedback que se entiende',
    slug: { current: 'el-error-como-informacion' },
    tipo: 'metodologia',
    acceso: 'free',
    description:
      'Tres maneras de nombrar el mismo error y por qué solo una cambia la conducta del lunes. Feedback concreto, oportuno y que el jugador pueda accionar.',
    publishedAt: haceDias(6),
    body: [
      p(
        'Hay dos tipos de feedback que no cambian nada: el «muy bien» sin ancla y el «eso no se hace» sin alternativa. El jugador recuerda el tono, no la instrucción.',
      ),
      h2('El error como dato, no como identidad'),
      p(
        '«Has perdido tres balones por dentro» es información. «Eres desordenado» es un diagnóstico que el niño se pone como chaqueta y no se quita en un año. El feedback útil describe el momento, no a la persona.',
      ),
      h3('La regla de los tres segundos'),
      p(
        'Tras el error, tres segundos para conectar: señalar con la mirada, una palabra clave («perfil») y dejar jugar. La explicación larga es para el descanso o el vestuario, cuando el cerebro ya no está en partido.',
      ),
      h2('Una palanca por semana'),
      p(
        'Si corriges ocho cosas, no se corrige ninguna. Elige un comportamiento por jugador y semana, dáselo con nombre propio y pregúntalo al final del partido: «¿cuántas veces recibiste de perfil?». Lo que se pregunta, se entrena.',
      ),
    ],
  },
  {
    _id: 'seed-met-presion-si-no',
    _type: 'publicacion',
    title: 'Presión: cuándo sí, cuándo no (y cómo explicarlo a un alevín)',
    slug: { current: 'presion-cuando-si-cuando-no' },
    tipo: 'metodologia',
    acceso: 'premium',
    description:
      'Presionar no es correr hacia el balón: es un acuerdo colectivo con disparadores. Este dossier traduce cuándo presionar, cuándo aguantar y cómo entrenar ambos con lenguaje de fútbol base.',
    publishedAt: haceDias(12),
    body: [
      p(
        'Todo equipo presiona a veces. Pocos presionan por acuerdo. La diferencia entre una presión que roba y una presión que se come es si los once leen el mismo disparador.',
      ),
      h2('Los cuatro disparadores que sí existen en base'),
      p(
        '1) Pase flojo o al pie del rival. 2) El rival recibe de espaldas. 3) El balón va a una banda donde somos superiores. 4) Saque de puerta rival con portero que no conduce. Cuatro, y ninguno es «porque sí».',
      ),
      h2('Cuándo NO presionar'),
      p(
        'Con balón en el central rival que tiene tiempo: aguantar y orientar al 9 hacia la banda es más difícil que mandar a dos a morder, y mucho más rentable. Presionar sin acuerdo es regalar la superioridad por dentro.',
      ),
      h3('Cómo se lo cuentas a un alevín'),
      p(
        '«Cuando el balón llega flojo o al de espaldas:¡todos al balón! Cuando el central la tiene tranquila: puerta cerrada, nos movemos juntos». Dos frases, dos reglas. El resto son ejercicios del banco con nombres de siempre: rondos, 4v4 con porterías, salidas con presión.',
      ),
      h2('Cómo se entrena'),
      p(
        'La presión no se entrena con consignas: se entrena con tareas donde robar tiene premio inmediato (portería pequeña, salir conduciendo) y donde el espacio rival está cerrado si aguantas. En el banco tienes dos fichas que hacen exactamente eso: «4v4 con porterías laterales» y «Salida de balón contra presión zonal».',
      ),
    ],
  },
];

const DOCS = [
  ...CATEGORIES,
  ...OBJETIVOS,
  ...EJERCICIOS,
  ...SESIONES,
  ...HERRAMIENTAS,
  ...METODOLOGIA,
];
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
    `*[_id in $ids]{ _id, _type, "label": coalesce(title, name), "fileRef": archivo.asset._ref }`,
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
      const asset = d.pdf
        ? porId[d._id]?.fileRef
          ? ' · reutiliza PDF'
          : ' · subira PDF nuevo'
        : '';
      console.log(
        `  ${ya ? '↻ actualizar' : '+ crear   '} ${d._id}  (${d._type})  ${label}${acceso}${asset}`,
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
    console.log(
      ` Sesiones: ${SESIONES.filter((s) => s.acceso === 'free').length} free + ${SESIONES.filter((s) => s.acceso === 'premium').length} premium`,
    );
    console.log(
      ` Herramientas: ${HERRAMIENTAS.filter((h) => h.acceso === 'free').length} free + ${HERRAMIENTAS.filter((h) => h.acceso === 'premium').length} premium (con PDF)`,
    );
    console.log(
      ` Metodología: ${METODOLOGIA.filter((m) => m.acceso === 'free').length} free (blog) + ${METODOLOGIA.filter((m) => m.acceso === 'premium').length} premium (zona)`,
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
      // Los PDFs subidos por el seed también: sin docs que los referencien, quedan huérfanos.
      const assets = aBorrar.map((id) => porId[id]?.fileRef).filter(Boolean);
      for (const a of assets) tx.delete(a);
      await tx.commit();
      console.log(
        `\n✔ Borrados ${aBorrar.length} docs de ejemplo${assets.length ? ` + ${assets.length} PDF(s)` : ''}. Banco limpio de seed.`,
      );
    } else {
      const tx = client.transaction();
      for (const d of DOCS) {
        const doc = { ...d };
        if (doc.pdf) {
          const reutilizar = porId[d._id]?.fileRef;
          if (reutilizar) {
            doc.archivo = { _type: 'file', _ref: reutilizar };
          } else {
            const asset = await client.assets.upload(
              'file',
              pdfSimple(doc.pdf.titulo, doc.pdf.lineas),
              { contentType: 'application/pdf', filename: `${doc.slug.current}.pdf` },
            );
            doc.archivo = { _type: 'file', _ref: asset._id };
            console.log(`  ↑ PDF subido: ${asset._id}`);
          }
          delete doc.pdf;
        }
        tx.createOrReplace(doc);
      }
      await tx.commit();
      console.log(`\n✔ Sembrados ${DOCS.length} docs en ${projectId}/${dataset}.`);
      console.log(
        '  Banco: /entrenadores/ejercicios/  ·  Sesiones: /entrenadores/sesiones/  ·  Herramientas: /entrenadores/herramientas/  ·  Metodología: /entrenadores/metodologia/',
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
