import { defineType } from 'sanity';
import { fasesSesion } from './valoresComunes';

export const bloqueSesion = defineType({
  name: 'bloqueSesion',
  title: 'Bloque de sesión',
  type: 'object',
  fields: [
    {
      name: 'fase',
      title: 'Fase',
      type: 'string',
      options: { list: [...fasesSesion], layout: 'dropdown' },
      validation: (Rule) => Rule.required(),
    },
    {
      name: 'ejercicio',
      title: 'Ejercicio',
      description: 'Referencia al banco (o escribe el desarrollo en «notas» si es ad hoc).',
      type: 'reference',
      to: [{ type: 'ejercicio' }],
    },
    {
      name: 'duracionMin',
      title: 'Duración (minutos)',
      type: 'number',
      validation: (Rule) => Rule.min(1).integer(),
    },
    {
      name: 'notas',
      title: 'Notas del bloque',
      type: 'text',
      rows: 3,
    },
  ],
  preview: {
    select: { title: 'fase', subtitle: 'duracionMin' },
    prepare({ title, subtitle }) {
      return {
        title: title ?? 'Bloque',
        subtitle: subtitle ? `${subtitle} min` : undefined,
      };
    },
  },
});
