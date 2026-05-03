import { apiClient } from '@/components/lib/api-client';
import {
  type CommonListParams,
  type Page,
  buildCommonParams,
  qs,
} from '@/services/cp/shared';
import type { Entity } from '@/types/ontology';

// EntitiesListParams — Entity has no FK columns, just adds `affiliation`
// (CP read API accepts repeated `?affiliation=…`).
export interface EntitiesListParams extends CommonListParams {
  affiliation?: Array<'friendly' | 'hostile' | 'unknown' | 'neutral'>;
}

function buildQuery(p?: EntitiesListParams): string {
  const sp = buildCommonParams(p);
  if (p?.affiliation) p.affiliation.forEach(a => sp.append('affiliation', a));
  return qs(sp);
}

export const getEntities = async (
  params?: EntitiesListParams,
  token?: string,
): Promise<Page<Entity>> => {
  return apiClient<Page<Entity>>(
    `/api/v1/objects/Entity${buildQuery(params)}`,
    {},
    token,
  );
};

export const getEntity = async (id: string, token?: string): Promise<Entity> => {
  return apiClient<Entity>(
    `/api/v1/objects/Entity/${encodeURIComponent(id)}`,
    {},
    token,
  );
};
