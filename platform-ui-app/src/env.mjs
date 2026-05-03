import { createEnv } from '@t3-oss/env-nextjs';
import { z } from 'zod';

export const env = createEnv({
  server: {
    PLATFORM_API_URL: z.string().url().min(1),
  },
  client: {
    // Browser-side base URL for the control-plane read API. Used by the
    // cp/* services in src/services/cp/.
    NEXT_PUBLIC_PLATFORM_API_URL: z.string().url().min(1),
    // Feature flag: when 'true' the UI reads from the live CP via the
    // cp/* services; otherwise it falls back to static fixtures
    // (laptop demo, no CP container required). String→boolean transform
    // because Next exposes env vars as strings.
    NEXT_PUBLIC_USE_LIVE_CP: z
      .enum(['true', 'false'])
      .default('false')
      .transform(v => v === 'true'),
  },
  runtimeEnv: {
    PLATFORM_API_URL: process.env.PLATFORM_API_URL,
    NEXT_PUBLIC_PLATFORM_API_URL: process.env.NEXT_PUBLIC_PLATFORM_API_URL,
    NEXT_PUBLIC_USE_LIVE_CP: process.env.NEXT_PUBLIC_USE_LIVE_CP,
  },
});
