import { defineCliConfig } from 'sanity/cli';

export default defineCliConfig({
  api: {
    projectId: process.env.SANITY_PROJECT_ID ?? '',
    dataset: process.env.SANITY_DATASET ?? 'production',
  },
  deployment: {
    appId: 'si8z66fymoi70fxe46ulkw0y',
  },
});
