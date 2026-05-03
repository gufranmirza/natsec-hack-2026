import { apiClient } from '@/components/lib/api-client';
import {
  type CommonListParams,
  type Page,
  buildCommonParams,
  qs,
} from '@/services/cp/shared';
import type { ActionGating, Recommendation } from '@/types/ontology';

// RecommendationsListParams extends CommonListParams with FK filters
// the CP read API supports for the recommendation table:
//   ?entity_id=…           filter by subject_entity_id
//   ?subject_event_id=…    filter by subject_event_id
//   ?objective_id=…        filter by objective_id
export interface RecommendationsListParams extends CommonListParams {
  entity_id?: string;
  subject_event_id?: string;
  objective_id?: string;
}

function buildQuery(p?: RecommendationsListParams): string {
  const sp = buildCommonParams(p);
  if (p?.entity_id) sp.set('entity_id', p.entity_id);
  if (p?.subject_event_id) sp.set('subject_event_id', p.subject_event_id);
  if (p?.objective_id) sp.set('objective_id', p.objective_id);
  return qs(sp);
}

export const getRecommendations = async (
  params?: RecommendationsListParams,
  token?: string,
): Promise<Page<Recommendation>> => {
  const page = await apiClient<Page<Recommendation>>(
    `/api/v1/objects/Recommendation${buildQuery(params)}`,
    {},
    token,
  );
  return { ...page, items: page.items.map(normalizeRecommendation) };
};

export const getRecommendation = async (
  id: string,
  token?: string,
): Promise<Recommendation> => {
  const rec = await apiClient<Recommendation>(
    `/api/v1/objects/Recommendation/${encodeURIComponent(id)}`,
    {},
    token,
  );
  return normalizeRecommendation(rec);
};

// putRecommendations writes (upserts) one or more Recommendation rows
// via the ingest batch endpoint. CP wire schema requires
// `proposed_params` as a JSON string; we stringify before posting and
// strip the UI-only display helpers (verb / short / gating / why) that
// don't exist on the CP column list.
export const putRecommendations = async (
  recommendations: Recommendation[],
  token?: string,
): Promise<void> => {
  await apiClient<unknown>(
    '/api/v1/ingest/recommendations',
    {
      method: 'POST',
      body: JSON.stringify(recommendations.map(denormalizeRecommendation)),
    },
    token,
  );
};

function denormalizeRecommendation(rec: Recommendation): unknown {
  const wire = { ...rec } as Record<string, unknown>;
  delete wire.verb;
  delete wire.short;
  delete wire.gating;
  delete wire.why;
  delete wire.eta;
  delete wire.asset_callsign;
  if (typeof wire.proposed_params !== 'string') {
    wire.proposed_params = JSON.stringify(wire.proposed_params ?? {});
  }
  return wire;
}

// ──────────────────────────────────────────────────────────────────
// Wire→UI normalizer
//
// The CP serializes `proposed_params` as a JSON string and doesn't
// emit the UI-only display helpers (`verb`, `short`, `gating`, `why`)
// the recommendation card needs. We fill them here so every consumer
// downstream (the column, the chat panel, the recengine→agent merge
// in _view.tsx) sees a uniform shape.
// ──────────────────────────────────────────────────────────────────

const ACTION_VERB: Record<string, string> = {
  fire_himars: 'Fire',
  clear_fpv_kinetic: 'Engage',
  reroute_medical: 'Re-route',
  dispatch_medevac: 'Dispatch',
  vector_isr: 'Vector',
  dispatchdrone: 'Dispatch',
  launch_swarm: 'Launch',
  launch: 'Launch',
  intercept: 'Intercept',
  handoff: 'Hand-off',
  retask: 'Re-task',
  observe: 'Observe',
};

function verbFor(actionType: string): string {
  const key = actionType.toLowerCase();
  if (ACTION_VERB[key]) return ACTION_VERB[key];
  // Humanize: "vector_isr" → "Vector", "dispatchDrone" → "Dispatch"
  const head = key.split(/[_\s]/)[0] ?? actionType;
  return head.charAt(0).toUpperCase() + head.slice(1);
}

function shortFor(rationale: string, actionType: string): string {
  const trimmed = (rationale ?? '').trim();
  if (!trimmed) return actionType.replace(/_/g, ' ');
  const firstSentence = trimmed.split(/(?<=[.!?])\s+/)[0] ?? trimmed;
  return firstSentence.length > 160
    ? `${firstSentence.slice(0, 157)}…`
    : firstSentence;
}

function gatingFrom(params: Record<string, unknown>): ActionGating {
  const g = params.gating;
  if (g === 'auto' || g === 'confirm' || g === 'forbid-llm') return g;
  return 'confirm';
}

function whyChips(rec: Recommendation): string[] {
  const chips: string[] = [];
  const evidenceCount = rec.evidence_refs?.length ?? 0;
  if (evidenceCount > 0) {
    chips.push(`${evidenceCount} evidence ref${evidenceCount === 1 ? '' : 's'}`);
  }
  if (rec._source) chips.push(rec._source.replace(/^system:/, ''));
  return chips;
}

export function normalizeRecommendation(raw: Recommendation): Recommendation {
  // proposed_params is sometimes serialized as a JSON string by the CP.
  let params: Record<string, unknown>;
  if (typeof raw.proposed_params === 'string') {
    try {
      params = JSON.parse(raw.proposed_params) as Record<string, unknown>;
    } catch {
      params = {};
    }
  } else {
    params = (raw.proposed_params ?? {}) as Record<string, unknown>;
  }

  const verb = raw.verb ?? verbFor(raw.proposed_action_type);
  const short = raw.short ?? shortFor(raw.rationale, raw.proposed_action_type);
  const gating = raw.gating ?? gatingFrom(params);
  const why = raw.why ?? whyChips(raw);

  return {
    ...raw,
    proposed_params: params,
    verb,
    short,
    gating,
    why,
  };
}
