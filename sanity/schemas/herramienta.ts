import { defineType } from 'sanity';
import { opcionesAcceso } from './valoresComunes';

const formatos = [
  { title: 'PDF', value: 'pdf' },
  { title: 'Word', value: 'word' },
  { title: 'Excel', value: 'excel' },
] as const;

export const herramienta = defineType({
  name: 'herramienta',
  title: 'Herramienta del entrenador',
  description: 'Documento descargable: plantillas, planificaciones, informes…',
  type: 'document',
  fields: [
    {
      name: 'title',
      title: 'Nombre',
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
      name: 'description',
      title: 'Descripción',
      type: 'text',
      rows: 3,
    },
    {
      name: 'formato',
      title: 'Formato',
      type: 'string',
      options: { list: [...formatos], layout: 'radio' },
      initialValue: 'pdf',
      validation: (Rule) => Rule.required(),
    },
    {
      name: 'archivo',
      title: 'Documento',
      type: 'file',
      options: {
        accept:
          'application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document,application/vnd.ms-excel,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      },
      fields: [{ name: 'alt', title: 'Texto alternativo', type: 'string' }],
    },
    {
      name: 'orden',
      title: 'Orden en la biblioteca',
      type: 'number',
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
    select: { title: 'title', subtitle: 'formato' },
    prepare({ title, subtitle }) {
      return { title, subtitle: subtitle ? `· ${subtitle.toUpperCase()}` : undefined };
    },
  },
});
