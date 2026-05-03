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
  const page = await apiClient<Page<Event>>(
    `/api/v1/objects/Event${buildQuery(params)}`,
    {},
    token,
  );
  return { ...page, items: page.items.map(normalizeEvent) };
};

export const getEvent = async (id: string, token?: string): Promise<Event> => {
  const event = await apiClient<Event>(
    `/api/v1/objects/Event/${encodeURIComponent(id)}`,
    {},
    token,
  );
  return normalizeEvent(event);
};

// CP serializes geo as separate `lat` / `lon` columns; the UI ontology
// expects `position: [lat, lon]` (optional on Event). Bridge here so
// every consumer sees the uniform shape.
function normalizeEvent(raw: Event): Event {
  if (Array.isArray(raw.position)) return raw;
  const r = raw as unknown as { lat?: unknown; lon?: unknown };
  if (typeof r.lat === 'number' && typeof r.lon === 'number') {
    return { ...raw, position: [r.lat, r.lon] };
  }
  return raw;
}

// putEvents writes (upserts) one or more Event rows via the ingest
// batch endpoint. CP wire schema requires `payload` to be a JSON
// string, so we stringify any object-shaped payload before posting.
export const putEvents = async (
  events: Event[],
  token?: string,
): Promise<void> => {
  await apiClient<unknown>(
    '/api/v1/ingest/events',
    {
      method: 'POST',
      body: JSON.stringify(events.map(denormalizeEvent)),
    },
    token,
  );
};

function denormalizeEvent(event: Event): unknown {
  const { position, payload, ...rest } = event as Event & {
    position?: unknown;
    payload?: unknown;
  };
  const wire = rest as Record<string, unknown>;
  if (Array.isArray(position) && position.length === 2) {
    wire.lat = position[0];
    wire.lon = position[1];
  }
  // CP `payload` column is String; UI hands us either an object or a
  // pre-stringified blob. Normalize to string here.
  wire.payload =
    typeof payload === 'string' ? payload : JSON.stringify(payload ?? {});
  return wire;
}
