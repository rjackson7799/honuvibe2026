import { createImageUrlBuilder } from '@sanity/image-url';
import { sanityConfig } from './config';
import type { SanityImage } from './types';

const builder = createImageUrlBuilder({
  projectId: sanityConfig.projectId,
  dataset: sanityConfig.dataset,
});

export function urlForImage(source: SanityImage) {
  return builder.image(source);
}
