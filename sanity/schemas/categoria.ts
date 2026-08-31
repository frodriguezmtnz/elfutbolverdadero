import { defineType } from 'sanity';

export const categoria = defineType({
  name: 'categoria',
  title: 'Categoría',
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
    {
      name: 'description',
      title: 'Descripción',
      type: 'string',
    },
  ],
  preview: {
    select: {
      title: 'name',
      subtitle: 'description',
    },
  },
});
