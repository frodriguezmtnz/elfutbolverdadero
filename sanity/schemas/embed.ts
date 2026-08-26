import { defineType } from 'sanity';

export const embed = defineType({
  name: 'embed',
  title: 'Embeber audio/vídeo',
  type: 'object',
  fields: [
    {
      name: 'url',
      title: 'URL del iframe (YouTube, audio…)',
      type: 'url',
      validation: (Rule) => Rule.required(), // eslint-disable-line @typescript-eslint/no-unused-vars
    },
    {
      name: 'title',
      title: 'Título / descripción',
      type: 'string',
    },
  ],
  preview: {
    select: {
      title: 'title',
      subtitle: 'url',
    },
  },
});