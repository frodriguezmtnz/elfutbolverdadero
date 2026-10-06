import { defineType } from 'sanity';
import { opcionesAcceso } from './valoresComunes';

export const vozEntrenador = defineType({
  name: 'vozEntrenador',
  title: 'Voz de entrenador',
  description: 'La pregunta del mes: la respuesta de un entrenador real.',
  type: 'document',
  fields: [
    {
      name: 'title',
      title: 'Pregunta',
      type: 'string',
      validation: (Rule) => Rule.required(),
    },
    {
      name: 'slug',
      title: 'Slug (URL)',
      type: 'slug',
      options: { source: 'title', maxLength: 96 },
      validation: (Rule) => Rule.required(),
    },
    {
      name: 'acceso',
      title: 'Acceso',
      type: 'string',
      options: { list: [...opcionesAcceso], layout: 'radio' },
      initialValue: 'premium',
      validation: (Rule) => Rule.required(),
    },
    {
      name: 'entrenador',
      title: 'Entrenador / entrevistado',
      type: 'reference',
      to: [{ type: 'autor' }],
    },
    {
      name: 'respuesta',
      title: 'Respuesta',
      type: 'array',
      of: [
        {
          type: 'block',
          styles: [
            { title: 'Párrafo', value: 'normal' },
            { title: 'Título', value: 'h3' },
          ],
        },
        { type: 'image', options: { hotspot: true } },
      ],
    },
    {
      name: 'imagen',
      title: 'Imagen',
      type: 'image',
      options: { hotspot: true },
      fields: [{ name: 'alt', title: 'Texto alternativo', type: 'string' }],
    },
    {
      name: 'mesAnio',
      title: 'Mes de la pregunta',
      type: 'date',
    },
    {
      name: 'publishedAt',
      title: 'Fecha de publicación',
      type: 'datetime',
      initialValue: () => new Date().toISOString(),
      validation: (Rule) => Rule.required(),
    },
  ],
  preview: {
    select: { title: 'title', subtitle: 'mesAnio', media: 'imagen' },
  },
});
