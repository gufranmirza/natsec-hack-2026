import { apiClient } from '@/components/lib/api-client';
import {
  type CommonListParams,
  type Page,
  buildCommonParams,
  qs,
} from '@/services/cp/shared';
import type { Event } from '@/types/ontology';

// EventsListParams adds the FK filters the CP read API exposes for the
// event table:
//   ?entity_id=…   filter by entity_id
//   ?unit_id=…     filter by unit_id
// Use these for the object-drawer "events for this entity" view.
export interface EventsListParams extends CommonListParams {
  entity_id?: string;
  unit_id?: string;
}

function buildQuery(p?: EventsListParams): string {
  const sp = buildCommonParams(p);
  if (p?.entity_id) sp.set('entity_id', p.entity_id);
  if (p?.unit_id) sp.set('unit_id', p.unit_id);
  return qs(sp);
}

export const getEvents = async (
  params?: EventsListParams,
  token?: string,
): Promise<Page<Event>> => {
  return apiClient<Page<Event>>(
    `/api/v1/objects/Event${buildQuery(params)}`,
    {},
    token,
  );
};

export const getEvent = async (id: string, token?: string): Promise<Event> => {
  return apiClient<Event>(
    `/api/v1/objects/Event/${encodeURIComponent(id)}`,
    {},
    token,
  );
};
