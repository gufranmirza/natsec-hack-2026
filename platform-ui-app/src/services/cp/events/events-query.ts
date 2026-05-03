import { useQuery } from '@tanstack/react-query';

import {
  type EventsListParams,
  getEvent,
  getEvents,
} from '@/services/cp/events/events-api';
import { type Page, commonKey } from '@/services/cp/shared';
import type { Event } from '@/types/ontology';

// useEvents drives the col-status "What changed" feed. Polling default
// is 5s — events arrive frequently during demo replay so a tighter
// cadence keeps the feed feeling live.
export function useEvents(
  params?: EventsListParams,
  initialData?: Page<Event>,
  refetchInterval: number | false = 5000,
) {
  return useQuery({
    queryKey: ['cp', 'events', 'list', eventsKey(params)],
    queryFn: () => getEvents(params),
    initialData,
    refetchInterval,
  });
}

function eventsKey(p?: EventsListParams): string {
  const base = commonKey(p);
  const extras: string[] = [];
  if (p?.entity_id) extras.push(`ent=${p.entity_id}`);
  if (p?.unit_id) extras.push(`unit=${p.unit_id}`);
  return [base, ...extras].filter(Boolean).join('&');
}

export function useEvent(id: string, initialData?: Event) {
  return useQuery({
    queryKey: ['cp', 'events', id],
    queryFn: () => getEvent(id),
    initialData,
    enabled: !!id,
  });
}
