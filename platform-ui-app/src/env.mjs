import { createEnv } from '@t3-oss/env-nextjs';
import { z } from 'zod';

export const env = createEnv({
  server: {},
  client: {
    // Base URL for the platform-control-plane HTTP API. Read from both
    // browser and server (Next inlines NEXT_PUBLIC_* into both bundles)
    // so we don't keep two vars for the same value.
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
    NEXT_PUBLIC_PLATFORM_API_URL: process.env.NEXT_PUBLIC_PLATFORM_API_URL,
    NEXT_PUBLIC_USE_LIVE_CP: process.env.NEXT_PUBLIC_USE_LIVE_CP,
  },
});
