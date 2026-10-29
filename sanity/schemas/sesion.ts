import { defineType } from 'sanity';
import { opcionesAcceso, opcionesCategoriaEdad, opcionesMaterial } from './valoresComunes';

export const sesion = defineType({
  name: 'sesion',
  title: 'Sesión de entrenamiento',
  description: 'Sesión completa lista para llevar al campo.',
  type: 'document',
  fields: [
    {
      name: 'title',
      title: 'Título',
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
      name: 'objetivoGeneral',
      title: 'Objetivo general',
      type: 'text',
      rows: 2,
    },
    {
      name: 'objetivos',
      title: 'Objetivos específicos',
      type: 'array',
      of: [{ type: 'reference', to: [{ type: 'objetivo' }] }],
    },
    {
      name: 'categoriasEdad',
      title: 'Edad / categoría recomendada',
      type: 'array',
      of: [{ type: 'string' }],
      options: { list: [...opcionesCategoriaEdad], direction: 'horizontal' },
    },
    {
      name: 'duracionMin',
      title: 'Duración total (minutos)',
      type: 'number',
      validation: (Rule) => Rule.min(1).integer(),
    },
    {
      name: 'material',
      title: 'Material',
      type: 'array',
      of: [{ type: 'string' }],
      options: { list: [...opcionesMaterial] },
    },
    {
      name: 'estructura',
      title: 'Estructura',
      description: 'Calentamiento → tareas → juego condicionado → partido → vuelta a la calma.',
      type: 'array',
      of: [{ type: 'bloqueSesion' }],
    },
    {
      name: 'claves',
      title: 'Claves del entrenador',
      type: 'array',
      of: [{ type: 'text' }],
    },
    {
      name: 'variantes',
      title: 'Variantes',
      type: 'array',
      of: [{ type: 'text' }],
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
    select: { title: 'title', subtitle: 'duracionMin' },
    prepare({ title, subtitle }) {
      return { title, subtitle: subtitle ? `${subtitle} min` : undefined };
    },
  },
  orderings: [
    {
      title: 'Más recientes primero',
      name: 'publishedAtDesc',
      by: [{ field: 'publishedAt', direction: 'desc' }],
    },
  ],
});
