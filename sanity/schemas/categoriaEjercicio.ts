import { defineType } from 'sanity';

export const categoriaEjercicio = defineType({
  name: 'categoriaEjercicio',
  title: 'Categoría de ejercicio',
  type: 'document',
  fields: [
    {
      name: 'name',
      title: 'Nombre',
      description:
        'Familia del banco de ejercicios (ej. Presión, Salida de balón, Transiciones, Finalización, Defensa de equipo).',
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
    select: { title: 'name', subtitle: 'description' },
  },
});
