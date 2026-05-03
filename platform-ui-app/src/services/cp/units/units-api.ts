import { apiClient } from '@/components/lib/api-client';
import {
  type CommonListParams,
  type Page,
  buildCommonParams,
  qs,
} from '@/services/cp/shared';
import type { Unit } from '@/types/ontology';

// Unit has no FK columns beyond what CommonListParams already covers
// (subtype, source, bbox, status). Unit.assigned_mission_id is on the
// row but not currently a CP filter param.
export type UnitsListParams = CommonListParams;

function buildQuery(p?: UnitsListParams): string {
  return qs(buildCommonParams(p));
}

export const getUnits = async (
  params?: UnitsListParams,
  token?: string,
): Promise<Page<Unit>> => {
  return apiClient<Page<Unit>>(
    `/api/v1/objects/Unit${buildQuery(params)}`,
    {},
    token,
  );
};

export const getUnit = async (id: string, token?: string): Promise<Unit> => {
  return apiClient<Unit>(
    `/api/v1/objects/Unit/${encodeURIComponent(id)}`,
    {},
    token,
  );
};
