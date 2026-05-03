// Service module for the four "intent → execution" Object Types in the
// CP ontology: MissionObjective, Plan, Mission, TaskingOrder.
// One folder, four typed pairs of getters — they're rarely consumed
// alone since the operator drills from objective → plan → mission →
// tasking order in a single workflow.

import { apiClient } from '@/components/lib/api-client';
import {
  type CommonListParams,
  type Page,
  buildCommonParams,
  qs,
} from '@/services/cp/shared';
import type {
  Mission,
  MissionObjective,
  Plan,
  TaskingOrder,
} from '@/types/ontology';

// ──────────────────────────────────────────────────────────────────────
// MissionObjective
// ──────────────────────────────────────────────────────────────────────

export interface MissionObjectivesListParams extends CommonListParams {
  target_entity_id?: string;
}

function buildObjectiveQuery(p?: MissionObjectivesListParams): string {
  const sp = buildCommonParams(p);
  if (p?.target_entity_id) sp.set('target_entity_id', p.target_entity_id);
  return qs(sp);
}

export const getMissionObjectives = async (
  params?: MissionObjectivesListParams,
  token?: string,
): Promise<Page<MissionObjective>> => {
  return apiClient<Page<MissionObjective>>(
    `/api/v1/objects/MissionObjective${buildObjectiveQuery(params)}`,
    {},
    token,
  );
};

export const getMissionObjective = async (
  id: string,
  token?: string,
): Promise<MissionObjective> => {
  return apiClient<MissionObjective>(
    `/api/v1/objects/MissionObjective/${encodeURIComponent(id)}`,
    {},
    token,
  );
};

// ──────────────────────────────────────────────────────────────────────
// Plan
// ──────────────────────────────────────────────────────────────────────

export interface PlansListParams extends CommonListParams {
  objective_id?: string;
}

function buildPlanQuery(p?: PlansListParams): string {
  const sp = buildCommonParams(p);
  if (p?.objective_id) sp.set('objective_id', p.objective_id);
  return qs(sp);
}

export const getPlans = async (
  params?: PlansListParams,
  token?: string,
): Promise<Page<Plan>> => {
  return apiClient<Page<Plan>>(
    `/api/v1/objects/Plan${buildPlanQuery(params)}`,
    {},
    token,
  );
};

export const getPlan = async (id: string, token?: string): Promise<Plan> => {
  return apiClient<Plan>(
    `/api/v1/objects/Plan/${encodeURIComponent(id)}`,
    {},
    token,
  );
};

// ──────────────────────────────────────────────────────────────────────
// Mission
// ──────────────────────────────────────────────────────────────────────

export interface MissionsListParams extends CommonListParams {
  plan_id?: string;
  unit_id?: string; // → assigned_unit_id on the wire
  target_entity_id?: string;
}

function buildMissionQuery(p?: MissionsListParams): string {
  const sp = buildCommonParams(p);
  if (p?.plan_id) sp.set('plan_id', p.plan_id);
  if (p?.unit_id) sp.set('unit_id', p.unit_id);
  if (p?.target_entity_id) sp.set('target_entity_id', p.target_entity_id);
  return qs(sp);
}

export const getMissions = async (
  params?: MissionsListParams,
  token?: string,
): Promise<Page<Mission>> => {
  return apiClient<Page<Mission>>(
    `/api/v1/objects/Mission${buildMissionQuery(params)}`,
    {},
    token,
  );
};

export const getMission = async (
  id: string,
  token?: string,
): Promise<Mission> => {
  return apiClient<Mission>(
    `/api/v1/objects/Mission/${encodeURIComponent(id)}`,
    {},
    token,
  );
};

// ──────────────────────────────────────────────────────────────────────
// TaskingOrder
// ──────────────────────────────────────────────────────────────────────

export interface TaskingOrdersListParams extends CommonListParams {
  mission_id?: string;
  unit_id?: string;
}

function buildTaskingOrderQuery(p?: TaskingOrdersListParams): string {
  const sp = buildCommonParams(p);
  if (p?.mission_id) sp.set('mission_id', p.mission_id);
  if (p?.unit_id) sp.set('unit_id', p.unit_id);
  return qs(sp);
}

export const getTaskingOrders = async (
  params?: TaskingOrdersListParams,
  token?: string,
): Promise<Page<TaskingOrder>> => {
  return apiClient<Page<TaskingOrder>>(
    `/api/v1/objects/TaskingOrder${buildTaskingOrderQuery(params)}`,
    {},
    token,
  );
};

export const getTaskingOrder = async (
  id: string,
  token?: string,
): Promise<TaskingOrder> => {
  return apiClient<TaskingOrder>(
    `/api/v1/objects/TaskingOrder/${encodeURIComponent(id)}`,
    {},
    token,
  );
};
