import { defineType } from 'sanity';
import {
  opcionesAcceso,
  opcionesCategoriaEdad,
  opcionesEspacio,
  opcionesMaterial,
  opcionesTipoTarea,
} from './valoresComunes';

export const ejercicio = defineType({
  name: 'ejercicio',
  title: 'Ejercicio',
  description: 'Tarea del banco de ejercicios de Futbolverdadero Entrenadores.',
  type: 'document',
  fields: [
    {
      name: 'title',
      title: 'Nombre del ejercicio',
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
      description: '«Gratis» alimenta la pizarra pública y vende la zona premium.',
      type: 'string',
      options: { list: [...opcionesAcceso], layout: 'radio' },
      initialValue: 'premium',
      validation: (Rule) => Rule.required(),
    },
    {
      name: 'categorias',
      title: 'Categorías',
      type: 'array',
      of: [{ type: 'reference', to: [{ type: 'categoriaEjercicio' }] }],
    },
    {
      name: 'objetivos',
      title: 'Objetivos',
      description:
        'Comportamientos que se entrenan. El ejercicio no es el objetivo: el comportamiento sí.',
      type: 'array',
      of: [{ type: 'reference', to: [{ type: 'objetivo' }] }],
    },
    {
      name: 'tipoTarea',
      title: 'Tipo de tarea',
      description: 'Qué domina la tarea (filtro del banco).',
      type: 'string',
      options: { list: [...opcionesTipoTarea], layout: 'dropdown' },
    },
    {
      name: 'jugadoresMin',
      title: 'Jugadores (mínimo)',
      type: 'number',
      validation: (Rule) => Rule.min(1).integer(),
    },
    {
      name: 'jugadoresMax',
      title: 'Jugadores (máximo)',
      type: 'number',
      validation: (Rule) => Rule.min(1).integer(),
    },
    {
      name: 'categoriasEdad',
      title: 'Edad / categoría recomendada',
      type: 'array',
      of: [{ type: 'string' }],
      options: { list: [...opcionesCategoriaEdad], direction: 'horizontal' },
    },
    {
      name: 'espacio',
      title: 'Espacio',
      type: 'string',
      options: { list: [...opcionesEspacio], layout: 'dropdown' },
    },
    {
      name: 'espacioMedidas',
      title: 'Medidas aproximadas',
      description: 'Si lo conoces (ej. 30x20 m).',
      type: 'string',
    },
    {
      name: 'duracionMin',
      title: 'Duración (minutos)',
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
      name: 'resumen',
      title: 'Resumen (visible para captar suscriptores)',
      description: '1–2 frases. Se muestra incluso en el teaser público.',
      type: 'text',
      rows: 2,
    },
    {
      name: 'desarrollo',
      title: 'Desarrollo',
      description: 'Cómo se organiza y desarrolla la tarea.',
      type: 'array',
      of: [
        {
          type: 'block',
          styles: [
            { title: 'Párrafo', value: 'normal' },
            { title: 'Título', value: 'h3' },
          ],
        },
      ],
    },
    {
      name: 'claves',
      title: 'Claves del entrenador',
      description: 'Una clave por línea. Lo que hay que mirar, preguntar y corregir.',
      type: 'array',
      of: [{ type: 'text' }],
    },
    {
      name: 'errores',
      title: 'Errores frecuentes',
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
      name: 'diagrama',
      title: 'Representación gráfica',
      type: 'image',
      options: { hotspot: true },
      fields: [{ name: 'alt', title: 'Texto alternativo', type: 'string' }],
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
    select: {
      title: 'title',
      subtitle: 'acceso',
      media: 'diagrama',
    },
    prepare({ title, subtitle, media }) {
      return {
        title,
        subtitle: subtitle === 'free' ? '· Gratis' : '· Premium',
        media,
      };
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
