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
  const page = await apiClient<Page<Entity>>(
    `/api/v1/objects/Entity${buildQuery(params)}`,
    {},
    token,
  );
  return { ...page, items: page.items.map(normalizeEntity) };
};

export const getEntity = async (id: string, token?: string): Promise<Entity> => {
  const entity = await apiClient<Entity>(
    `/api/v1/objects/Entity/${encodeURIComponent(id)}`,
    {},
    token,
  );
  return normalizeEntity(entity);
};

// CP serializes geo as separate `lat` / `lon` columns; the UI ontology
// expects `position: [lat, lon]`. Bridge here so every consumer sees
// the uniform shape the type system promises.
function normalizeEntity(raw: Entity): Entity {
  if (Array.isArray(raw.position)) return raw;
  const r = raw as unknown as { lat?: unknown; lon?: unknown };
  if (typeof r.lat === 'number' && typeof r.lon === 'number') {
    return { ...raw, position: [r.lat, r.lon] };
  }
  return raw;
}
