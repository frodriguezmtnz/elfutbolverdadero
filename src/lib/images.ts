import { sanityClient } from 'sanity:client';
import { createImageUrlBuilder, type SanityImageSource } from '@sanity/image-url';
import { getImageDimensions } from '@sanity/asset-utils';

const { projectId, dataset } = sanityClient.config();
const builder = createImageUrlBuilder({
  projectId: projectId as string,
  dataset: dataset as string,
});

function anchoOriginal(source: unknown): number {
  try {
    return getImageDimensions(source as SanityImageSource).width;
  } catch {
    return Number.POSITIVE_INFINITY;
  }
}

export function urlFor(source: unknown, width = 800, ratio?: number) {
  const w = Math.min(width, anchoOriginal(source));
  const img = builder
    .image(source as SanityImageSource)
    .width(w)
    .auto('format');
  const cropped = ratio
    ? img
        .height(Math.round(w / ratio))
        .fit('crop')
        .crop('center')
    : img;
  return cropped.url();
}

export function srcsetFor(source: unknown, widths: number[], ratio?: number): string {
  const max = anchoOriginal(source);
  const candidatos = [...new Set(widths.map((w) => Math.min(w, max)))];
  return candidatos
    .map((w) => {
      const img = builder
        .image(source as SanityImageSource)
        .width(w)
        .auto('format');
      const cropped = ratio
        ? img
            .height(Math.round(w / ratio))
            .fit('crop')
            .crop('center')
        : img;
      return `${cropped.url()} ${w}w`;
    })
    .join(', ');
}
