import type { SchemaTypeDefinition } from 'sanity';

import { publicacion } from './publicacion';
import { autor } from './autor';
import { categoria } from './categoria';
import { etiqueta } from './etiqueta';
import { embed } from './embed';

export const schemaTypes: SchemaTypeDefinition[] = [
  publicacion,
  autor,
  categoria,
  etiqueta,
  embed,
];