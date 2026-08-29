import { defineType } from 'sanity';

export const webAmiga = defineType({
  name: 'webAmiga',
  title: 'Web amiga',
  type: 'document',
  fields: [
    {
      name: 'name',
      title: 'Nombre de la web',
      type: 'string',
      validation: (Rule) => Rule.required(),
    },
    {
      name: 'url',
      title: 'URL',
      type: 'url',
      description: 'Dirección completa, ej: https://www.ejemplo.com',
      validation: (Rule) => Rule.required().uri({ allowRelative: false }),
    },
    {
      name: 'logo',
      title: 'Logo',
      type: 'image',
      options: { hotspot: false },
      validation: (Rule) => Rule.required(),
    },
    {
      name: 'description',
      title: 'Descripción',
      type: 'text',
      rows: 2,
      description: 'Descripción breve de la web (1-2 líneas)',
    },
    {
      name: 'order',
      title: 'Orden',
      type: 'number',
      description: 'Posición en la página (menor número = más arriba)',
      initialValue: 100,
    },
  ],
  preview: {
    select: {
      title: 'name',
      subtitle: 'url',
      media: 'logo',
    },
  },
});
