import { defineType } from 'sanity';

export const publicacion = defineType({
  name: 'publicacion',
  title: 'Publicación',
  type: 'document',
  fieldsets: [
    {
      name: 'seo',
      title: 'SEO (legado Wordpress / generado por Astro)',
      options: { collapsible: true, collapsed: true },
    },
  ],
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
      description:
        'Debe conservar el slug exacto de Wordpress para no romper URLs (ej. entrevista-fran-garcia-al-futbol-le-debo-la-vida). No incluir barras.',
      type: 'slug',
      options: { source: 'title', maxLength: 200 },
      validation: (Rule) => Rule.required(),
    },
    {
      name: 'tipo',
      title: 'Tipo de publicación',
      type: 'string',
      options: {
        list: [
          { title: 'Entrevista', value: 'entrevista' },
          { title: 'Artículo', value: 'articulo' },
          { title: 'Opinión', value: 'opinion' },
        ],
        layout: 'radio',
      },
      initialValue: 'entrevista',
      validation: (Rule) => Rule.required(),
    },
    {
      name: 'author',
      title: 'Autor',
      type: 'reference',
      to: [{ type: 'autor' }],
    },
    {
      name: 'club',
      title: 'Club / Equipo',
      description: 'Club o equipo del entrevistado. Se muestra en las tarjetas de la portada.',
      type: 'string',
    },
    {
      name: 'mainImage',
      title: 'Imagen destacada',
      type: 'image',
      options: { hotspot: true },
      fields: [
        { name: 'alt', title: 'Texto alternativo', type: 'string' },
        { name: 'caption', title: 'Pie de foto', type: 'string' },
      ],
    },
    {
      name: 'description',
      title: 'Resumen / extracto',
      type: 'text',
      rows: 3,
    },
    {
      name: 'categorias',
      title: 'Categorías',
      type: 'array',
      of: [{ type: 'reference', to: [{ type: 'categoria' }] }],
    },
    {
      name: 'etiquetas',
      title: 'Etiquetas',
      type: 'array',
      of: [{ type: 'reference', to: [{ type: 'etiqueta' }] }],
    },
    {
      name: 'body',
      title: 'Contenido',
      type: 'array',
      of: [
        {
          type: 'block',
          styles: [
            { title: 'Párrafo', value: 'normal' },
            { title: 'Título', value: 'h2' },
            { title: 'Subtítulo', value: 'h3' },
          ],
        },
        { type: 'image', options: { hotspot: true } },
        { type: 'embed' },
      ],
    },
    {
      name: 'publishedAt',
      title: 'Fecha de publicación',
      type: 'datetime',
      validation: (Rule) => Rule.required(),
    },
    {
      name: 'updatedAt',
      title: 'Fecha de actualización',
      type: 'datetime',
    },
    // Campos legados de la migración (WordPress)
    {
      name: 'wpId',
      title: 'ID Wordpress',
      type: 'number',
      fieldset: 'seo',
    },
    {
      name: 'wpUrl',
      title: 'URL original de Wordpress',
      type: 'url',
      fieldset: 'seo',
    },
    {
      name: 'readingTime',
      title: 'Tiempo de lectura (legado)',
      type: 'string',
      fieldset: 'seo',
    },
    {
      name: 'seoTitle',
      title: 'Título SEO (Yoast)',
      type: 'string',
      fieldset: 'seo',
    },
    {
      name: 'seoDescription',
      title: 'Meta descripción SEO (Yoast)',
      type: 'string',
      fieldset: 'seo',
    },
  ],
  preview: {
    select: {
      title: 'title',
      subtitle: 'tipo',
      media: 'mainImage',
    },
    prepare({ title, subtitle, media }) {
      return { title, subtitle: subtitle ? `· ${subtitle}` : '', media };
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
