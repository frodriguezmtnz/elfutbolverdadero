import { sanityClient } from 'sanity:client';
import { createImageUrlBuilder, type SanityImageSource } from '@sanity/image-url';

const { projectId, dataset } = sanityClient.config();
const builder = createImageUrlBuilder({
  projectId: projectId as string,
  dataset: dataset as string,
});

export function urlFor(source: unknown, width = 800) {
  return builder.image(source as SanityImageSource).width(width).auto('format').url();
}

export function srcsetFor(source: unknown, widths: number[]): string {
  return widths
    .map((w) => `${builder.image(source as SanityImageSource).width(w).auto('format').url()} ${w}w`)
    .join(', ');
}
