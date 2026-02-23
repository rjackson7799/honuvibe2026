import { createClient } from '@sanity/client';
import { sanityConfig } from './config';

const hasProjectId = !!sanityConfig.projectId;

export const sanityClient = hasProjectId
  ? createClient({
      ...sanityConfig,
      token: process.env.SANITY_API_TOKEN,
    })
  : (null as unknown as ReturnType<typeof createClient>);

export const sanityPublicClient = hasProjectId
  ? createClient({
      ...sanityConfig,
      useCdn: true,
    })
  : (null as unknown as ReturnType<typeof createClient>);
