import { createEnv } from '@t3-oss/env-nextjs';
import { z } from 'zod';

export const env = createEnv({
  server: {
    PLATFORM_API_URL: z.string().url().min(1),
  },
  client: {},
  runtimeEnv: {
    PLATFORM_API_URL: process.env.PLATFORM_API_URL,
  },
});
