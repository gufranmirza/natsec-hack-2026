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
  const page = await apiClient<Page<Unit>>(
    `/api/v1/objects/Unit${buildQuery(params)}`,
    {},
    token,
  );
  return { ...page, items: page.items.map(normalizeUnit) };
};

export const getUnit = async (id: string, token?: string): Promise<Unit> => {
  const unit = await apiClient<Unit>(
    `/api/v1/objects/Unit/${encodeURIComponent(id)}`,
    {},
    token,
  );
  return normalizeUnit(unit);
};

// CP serializes geo as separate `lat` / `lon` columns; the UI ontology
// expects `position: [lat, lon]`. Bridge here so every consumer sees
// the uniform shape the type system promises.
function normalizeUnit(raw: Unit): Unit {
  if (Array.isArray(raw.position)) return raw;
  const r = raw as unknown as { lat?: unknown; lon?: unknown };
  if (typeof r.lat === 'number' && typeof r.lon === 'number') {
    return { ...raw, position: [r.lat, r.lon] };
  }
  return raw;
}
