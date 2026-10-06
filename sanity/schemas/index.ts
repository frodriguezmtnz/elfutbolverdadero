import type { SchemaTypeDefinition } from 'sanity';

import { publicacion } from './publicacion';
import { autor } from './autor';
import { categoria } from './categoria';
import { etiqueta } from './etiqueta';
import { embed } from './embed';
import { webAmiga } from './webAmiga';
import { ejercicio } from './ejercicio';
import { sesion } from './sesion';
import { bloqueSesion } from './bloqueSesion';
import { herramienta } from './herramienta';
import { vozEntrenador } from './vozEntrenador';
import { objetivo } from './objetivo';
import { categoriaEjercicio } from './categoriaEjercicio';

export const schemaTypes: SchemaTypeDefinition[] = [
  publicacion,
  autor,
  categoria,
  etiqueta,
  embed,
  webAmiga,
  ejercicio,
  sesion,
  bloqueSesion,
  herramienta,
  vozEntrenador,
  objetivo,
  categoriaEjercicio,
];
