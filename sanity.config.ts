import { defineConfig } from 'sanity';
import { structureTool } from 'sanity/structure';
import { schemaTypes } from './sanity/schemas';

const projectId = import.meta.env.SANITY_STUDIO_PROJECT_ID ?? process.env.SANITY_PROJECT_ID ?? '';
const dataset = import.meta.env.SANITY_STUDIO_DATASET ?? process.env.SANITY_DATASET ?? 'production';

const TYPES_ENTRENADORES = [
  'ejercicio',
  'sesion',
  'herramienta',
  'vozEntrenador',
  'objetivo',
  'categoriaEjercicio',
];

export default defineConfig({
  name: 'elfutbolverdadero',
  title: 'Futbolverdadero',
  projectId,
  dataset,
  users: { access: 'private' },
  plugins: [
    structureTool({
      structure: (S) =>
        S.list()
          .title('Contenido')
          .items([
            S.documentTypeListItem('publicacion').title('Publicaciones'),
            S.divider(),
            S.listItem()
              .title('⚽ Futbolverdadero Entrenadores')
              .child(
                S.list()
                  .title('Futbolverdadero Entrenadores')
                  .items([
                    S.documentTypeListItem('ejercicio').title('🏋️ Banco de ejercicios'),
                    S.documentTypeListItem('sesion').title('📋 Sesiones de entrenamiento'),
                    S.documentTypeListItem('herramienta').title('🧰 Herramientas del entrenador'),
                    S.documentTypeListItem('vozEntrenador').title('🎙️ Voces de entrenadores'),
                    S.divider(),
                    S.documentTypeListItem('objetivo').title('Objetivos (taxonomía)'),
                    S.documentTypeListItem('categoriaEjercicio').title(
                      'Categorías de ejercicio (taxonomía)',
                    ),
                  ]),
              ),
            S.divider(),
            ...S.documentTypeListItems().filter(
              (item) =>
                item.getId() !== 'publicacion' && !TYPES_ENTRENADORES.includes(item.getId()!),
            ),
          ]),
    }),
  ],
  schema: {
    types: schemaTypes,
  },
});
