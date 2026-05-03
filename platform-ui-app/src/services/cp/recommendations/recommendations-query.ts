import { useQuery } from '@tanstack/react-query';

import {
  type RecommendationsListParams,
  getRecommendation,
  getRecommendations,
} from '@/services/cp/recommendations/recommendations-api';
import { type Page, commonKey } from '@/services/cp/shared';
import type { Recommendation } from '@/types/ontology';

// useRecommendations polls the CP every 5s by default since the
// recengine emits new recs as fusion fires. Override `refetchInterval`
// to `false` (caller owns triggering) or to a different ms value.
//
// Per data-fetching rules: never useEffect+fetch. The polling interval
// lives on the useQuery config.
export function useRecommendations(
  params?: RecommendationsListParams,
  initialData?: Page<Recommendation>,
  refetchInterval: number | false = 5000,
) {
  return useQuery({
    queryKey: ['cp', 'recommendations', 'list', recsKey(params)],
    queryFn: () => getRecommendations(params),
    initialData,
    refetchInterval,
  });
}

function recsKey(p?: RecommendationsListParams): string {
  const base = commonKey(p);
  const extras: string[] = [];
  if (p?.entity_id) extras.push(`ent=${p.entity_id}`);
  if (p?.subject_event_id) extras.push(`evt=${p.subject_event_id}`);
  if (p?.objective_id) extras.push(`obj=${p.objective_id}`);
  return [base, ...extras].filter(Boolean).join('&');
}

export function useRecommendation(id: string, initialData?: Recommendation) {
  return useQuery({
    queryKey: ['cp', 'recommendations', id],
    queryFn: () => getRecommendation(id),
    initialData,
    enabled: !!id,
  });
}
