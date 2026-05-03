// useLiveCp returns the boolean feature flag NEXT_PUBLIC_USE_LIVE_CP.
//
// Components branch on this to decide whether to consume cp/* TanStack
// Query hooks (live CP) or the static src/lib/fixtures/* (laptop demo).
//
// Pattern in a column:
//
//   const live = useLiveCp();
//   const { data } = useRecommendations(
//     { status: ['pending'] },
//     // initialData = current snapshot from fixtures so the UI never
//     // shows an empty state during the first poll.
//     live ? undefined : { items: RECOMMENDATIONS, count: RECOMMENDATIONS.length },
//   );
//   const items = live ? (data?.items ?? []) : RECOMMENDATIONS;
//
// Kept as a hook (not a constant import of `env.NEXT_PUBLIC_USE_LIVE_CP`)
// so future enhancements can tie the flag to user role / per-mission
// override / runtime toggle without touching every consumer.

import { env } from '@/env.mjs';

export function useLiveCp(): boolean {
  return env.NEXT_PUBLIC_USE_LIVE_CP;
}
