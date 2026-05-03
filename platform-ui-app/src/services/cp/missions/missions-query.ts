import { useQuery } from '@tanstack/react-query';

import {
  type MissionObjectivesListParams,
  type MissionsListParams,
  type PlansListParams,
  type TaskingOrdersListParams,
  getMission,
  getMissionObjective,
  getMissionObjectives,
  getMissions,
  getPlan,
  getPlans,
  getTaskingOrder,
  getTaskingOrders,
} from '@/services/cp/missions/missions-api';
import { type Page, commonKey } from '@/services/cp/shared';
import type {
  Mission,
  MissionObjective,
  Plan,
  TaskingOrder,
} from '@/types/ontology';

// ──────────────────────────────────────────────────────────────────────
// MissionObjective hooks. Drives the mission-tabs row at the top.
// Slow refetch (60s) because objectives change infrequently — operator
// adds/closes them via dedicated UI flows, not via the replayer.
// ──────────────────────────────────────────────────────────────────────

export function useMissionObjectives(
  params?: MissionObjectivesListParams,
  initialData?: Page<MissionObjective>,
  refetchInterval: number | false = 60_000,
) {
  return useQuery({
    queryKey: ['cp', 'mission_objectives', 'list', moKey(params)],
    queryFn: () => getMissionObjectives(params),
    initialData,
    refetchInterval,
  });
}

function moKey(p?: MissionObjectivesListParams): string {
  const base = commonKey(p);
  return p?.target_entity_id ? `${base}&te=${p.target_entity_id}` : base;
}

export function useMissionObjective(
  id: string,
  initialData?: MissionObjective,
) {
  return useQuery({
    queryKey: ['cp', 'mission_objectives', id],
    queryFn: () => getMissionObjective(id),
    initialData,
    enabled: !!id,
  });
}

// ──────────────────────────────────────────────────────────────────────
// Plan hooks.
// ──────────────────────────────────────────────────────────────────────

export function usePlans(
  params?: PlansListParams,
  initialData?: Page<Plan>,
  refetchInterval: number | false = 10_000,
) {
  return useQuery({
    queryKey: ['cp', 'plans', 'list', planKey(params)],
    queryFn: () => getPlans(params),
    initialData,
    refetchInterval,
  });
}

function planKey(p?: PlansListParams): string {
  const base = commonKey(p);
  return p?.objective_id ? `${base}&obj=${p.objective_id}` : base;
}

export function usePlan(id: string, initialData?: Plan) {
  return useQuery({
    queryKey: ['cp', 'plans', id],
    queryFn: () => getPlan(id),
    initialData,
    enabled: !!id,
  });
}

// ──────────────────────────────────────────────────────────────────────
// Mission hooks.
// ──────────────────────────────────────────────────────────────────────

export function useMissions(
  params?: MissionsListParams,
  initialData?: Page<Mission>,
  refetchInterval: number | false = 5_000,
) {
  return useQuery({
    queryKey: ['cp', 'missions', 'list', missionKey(params)],
    queryFn: () => getMissions(params),
    initialData,
    refetchInterval,
  });
}

function missionKey(p?: MissionsListParams): string {
  const base = commonKey(p);
  const extras: string[] = [];
  if (p?.plan_id) extras.push(`plan=${p.plan_id}`);
  if (p?.unit_id) extras.push(`unit=${p.unit_id}`);
  if (p?.target_entity_id) extras.push(`te=${p.target_entity_id}`);
  return [base, ...extras].filter(Boolean).join('&');
}

export function useMission(id: string, initialData?: Mission) {
  return useQuery({
    queryKey: ['cp', 'missions', id],
    queryFn: () => getMission(id),
    initialData,
    enabled: !!id,
  });
}

// ──────────────────────────────────────────────────────────────────────
// TaskingOrder hooks. Polls fast (3s) — operator approval → tasking
// order is the tightest feedback loop in the demo.
// ──────────────────────────────────────────────────────────────────────

export function useTaskingOrders(
  params?: TaskingOrdersListParams,
  initialData?: Page<TaskingOrder>,
  refetchInterval: number | false = 3_000,
) {
  return useQuery({
    queryKey: ['cp', 'tasking_orders', 'list', toKey(params)],
    queryFn: () => getTaskingOrders(params),
    initialData,
    refetchInterval,
  });
}

function toKey(p?: TaskingOrdersListParams): string {
  const base = commonKey(p);
  const extras: string[] = [];
  if (p?.mission_id) extras.push(`mis=${p.mission_id}`);
  if (p?.unit_id) extras.push(`unit=${p.unit_id}`);
  return [base, ...extras].filter(Boolean).join('&');
}

export function useTaskingOrder(id: string, initialData?: TaskingOrder) {
  return useQuery({
    queryKey: ['cp', 'tasking_orders', id],
    queryFn: () => getTaskingOrder(id),
    initialData,
    enabled: !!id,
  });
}
