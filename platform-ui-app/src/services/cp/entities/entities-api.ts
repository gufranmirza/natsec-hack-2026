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

// putEntities writes (upserts) one or more Entity rows via the ingest
// batch endpoint. Used by the unknown-contact scenario to spawn the new
// contact (Phase 1) and to upgrade its classification once the drone
// has analyzed the scene (Phase 5).
export const putEntities = async (
  entities: Entity[],
  token?: string,
): Promise<void> => {
  await apiClient<unknown>(
    '/api/v1/ingest/entities',
    {
      method: 'POST',
      body: JSON.stringify(entities.map(denormalizeEntity)),
    },
    token,
  );
};

function denormalizeEntity(entity: Entity): unknown {
  const { position, ...rest } = entity as Entity & { position?: unknown };
  const wire = rest as Record<string, unknown>;
  if (Array.isArray(position) && position.length === 2) {
    wire.lat = position[0];
    wire.lon = position[1];
  }
  return wire;
}
