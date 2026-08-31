import { defineType } from 'sanity';

export const autor = defineType({
  name: 'autor',
  title: 'Autor',
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
      name: 'role',
      title: 'Rol / Cargo',
      type: 'string',
    },
    {
      name: 'bio',
      title: 'Biografía',
      type: 'text',
      rows: 4,
    },
    {
      name: 'image',
      title: 'Foto',
      type: 'image',
      options: { hotspot: true },
    },
  ],
  preview: {
    select: {
      title: 'name',
      subtitle: 'role',
      media: 'image',
    },
  },
});
