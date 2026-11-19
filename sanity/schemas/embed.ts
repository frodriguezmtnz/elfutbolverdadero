import { defineType } from 'sanity';

export const embed = defineType({
  name: 'embed',
  title: 'Embeber audio/vídeo',
  type: 'object',
  fields: [
    {
      name: 'url',
      title: 'URL del iframe (YouTube, audio…)',
      type: 'url',
      validation: (Rule) =>
        Rule.required().custom((url: string | undefined) => {
          if (!url) return true;
          try {
            const { hostname, protocol } = new URL(url);
            if (protocol !== 'https:') return 'La URL del embed debe usar https://';
            const permitido =
              /^(www\.)?(youtube\.com|youtube-nocookie\.com|elfutbolverdadero\.com)$/i.test(
                hostname,
              );
            if (!permitido) return 'Dominio no permitido: solo YouTube (o esta misma web)';
            return true;
          } catch {
            return 'URL no válida';
          }
        }),
    },
    {
      name: 'title',
      title: 'Título / descripción',
      type: 'string',
    },
  ],
  preview: {
    select: {
      title: 'title',
      subtitle: 'url',
    },
  },
});
