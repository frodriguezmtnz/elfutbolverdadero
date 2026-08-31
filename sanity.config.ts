import { defineConfig } from 'sanity';
import { structureTool } from 'sanity/structure';
import { schemaTypes } from './sanity/schemas';

const projectId = import.meta.env.SANITY_STUDIO_PROJECT_ID ?? process.env.SANITY_PROJECT_ID ?? '';
const dataset = import.meta.env.SANITY_STUDIO_DATASET ?? process.env.SANITY_DATASET ?? 'production';

export default defineConfig({
  name: 'elfutbolverdadero',
  title: 'Futbolverdadero',
  projectId,
  dataset,
  plugins: [structureTool()],
  schema: {
    types: schemaTypes,
  },
});
