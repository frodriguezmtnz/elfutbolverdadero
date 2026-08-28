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
