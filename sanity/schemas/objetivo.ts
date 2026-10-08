import { defineType } from 'sanity';

export const objetivo = defineType({
  name: 'objetivo',
  title: 'Objetivo de entrenamiento',
  type: 'document',
  fields: [
    {
      name: 'name',
      title: 'Nombre',
      description:
        'Comportamiento observable que persigue la tarea (ej. presión tras pérdida, superioridad numérica en salida).',
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
      type: 'text',
      rows: 3,
    },
  ],
  preview: {
    select: { title: 'name', subtitle: 'description' },
  },
});
