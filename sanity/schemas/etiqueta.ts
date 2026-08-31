import { defineType } from 'sanity';

export const etiqueta = defineType({
  name: 'etiqueta',
  title: 'Etiqueta',
  type: 'document',
  fields: [
    {
      name: 'name',
      title: 'Nombre',
      type: 'string',
      validation: (Rule) => Rule.required(),
    },
    {
      name: 'slug',
      title: 'Slug',
      type: 'slug',
      options: { source: 'name', maxLength: 96 },
    },
  ],
  preview: {
    select: {
      title: 'name',
    },
  },
});
