import { apiClient } from '@/components/lib/api-client';
import {
  type CommonListParams,
  type Page,
  buildCommonParams,
  qs,
} from '@/services/cp/shared';
import type { Recommendation } from '@/types/ontology';

// RecommendationsListParams extends CommonListParams with FK filters
// the CP read API supports for the recommendation table:
//   ?entity_id=…           filter by subject_entity_id
//   ?subject_event_id=…    filter by subject_event_id
//   ?objective_id=…        filter by objective_id
export interface RecommendationsListParams extends CommonListParams {
  entity_id?: string;
  subject_event_id?: string;
  objective_id?: string;
}

function buildQuery(p?: RecommendationsListParams): string {
  const sp = buildCommonParams(p);
  if (p?.entity_id) sp.set('entity_id', p.entity_id);
  if (p?.subject_event_id) sp.set('subject_event_id', p.subject_event_id);
  if (p?.objective_id) sp.set('objective_id', p.objective_id);
  return qs(sp);
}

export const getRecommendations = async (
  params?: RecommendationsListParams,
  token?: string,
): Promise<Page<Recommendation>> => {
  return apiClient<Page<Recommendation>>(
    `/api/v1/objects/Recommendation${buildQuery(params)}`,
    {},
    token,
  );
};

export const getRecommendation = async (
  id: string,
  token?: string,
): Promise<Recommendation> => {
  return apiClient<Recommendation>(
    `/api/v1/objects/Recommendation/${encodeURIComponent(id)}`,
    {},
    token,
  );
};
