// useDemoData returns the 6 ontology arrays the home view consumes,
// branching on NEXT_PUBLIC_USE_LIVE_CP:
//
//   live=false  → static src/lib/fixtures/* (laptop demo, no CP needed)
//   live=true   → live CP via cp/* TanStack Query hooks (polled)
//
// One hook to swap; the column components are unchanged. Per
// data-fetching rules: TanStack Query hooks always run (so the cache
// stays warm for fast flag-flips); on `!live` we just return the
// static arrays instead of consuming the query data.
//
// Does NOT cover: chat history, voice transcript, drone POV synthetic
// telemetry, AI answers — those are complex and remain in component
// state until their CP-side endpoints exist.

'use client';

import { useEntities } from '@/services/cp/entities/entities-query';
import { useEvents } from '@/services/cp/events/events-query';
import { useMissionObjectives } from '@/services/cp/missions/missions-query';
import { useRecommendations } from '@/services/cp/recommendations/recommendations-query';
import { useReports } from '@/services/cp/reports/reports-query';
import { useUnits } from '@/services/cp/units/units-query';
import { useLiveCp } from '@/services/cp/use-live-cp';
import {
  ENTITIES,
  EVENTS,
  MISSIONS,
  RECOMMENDATIONS,
  REPORTS,
  UNITS,
} from '@/lib/fixtures';
import type {
  Entity,
  Event,
  MissionObjective,
  Recommendation,
  Report,
  Unit,
} from '@/types/ontology';

export interface DemoData {
  entities: Entity[];
  units: Unit[];
  events: Event[];
  reports: Report[];
  recommendations: Recommendation[];
  missions: MissionObjective[];
  /** True when data is being polled live from the control plane. */
  live: boolean;
  /** True while any live query is in its first fetch. */
  isLoading: boolean;
}

export function useDemoData(): DemoData {
  const live = useLiveCp();

  // Hooks always run so the cache stays warm if the operator flips the
  // flag mid-session. Polling intervals are conservative (5s).
  const entitiesQ = useEntities(undefined, undefined, live ? 5_000 : false);
  const unitsQ = useUnits(undefined, undefined, live ? 5_000 : false);
  const eventsQ = useEvents(undefined, undefined, live ? 5_000 : false);
  const reportsQ = useReports(undefined, undefined, live ? 5_000 : false);
  const recsQ = useRecommendations(undefined, undefined, live ? 5_000 : false);
  const moQ = useMissionObjectives(undefined, undefined, live ? 60_000 : false);

  if (!live) {
    return {
      entities: ENTITIES,
      units: UNITS,
      events: EVENTS,
      reports: REPORTS,
      recommendations: RECOMMENDATIONS,
      missions: MISSIONS,
      live: false,
      isLoading: false,
    };
  }

  return {
    entities: entitiesQ.data?.items ?? ENTITIES,
    units: unitsQ.data?.items ?? UNITS,
    events: eventsQ.data?.items ?? EVENTS,
    reports: reportsQ.data?.items ?? REPORTS,
    recommendations: recsQ.data?.items ?? RECOMMENDATIONS,
    missions: moQ.data?.items ?? MISSIONS,
    live: true,
    isLoading:
      entitiesQ.isLoading ||
      unitsQ.isLoading ||
      eventsQ.isLoading ||
      reportsQ.isLoading ||
      recsQ.isLoading ||
      moQ.isLoading,
  };
}
