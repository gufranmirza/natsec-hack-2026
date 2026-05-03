// Build mission-aware AI prompt suggestions from live ontology state.
//
// The previous hardcoded prompts ("Give me an update on the last 10 minutes",
// "Launch ROOK-1 to investigate") had two flaws: they didn't cite any real
// object, and one was a command (not a question the agent can answer with
// SQL grounding).
//
// This module derives prompts that name actual live entities / units /
// recommendations — so the agent's reply has concrete handles to cite, and
// the operator sees the C2 picture reflected in the AI surface.
//
// Prompts are pure strings; consumers wire them to onAsk(prompt).
// Categories (in priority order):
//   T1 decide   — pending recs that need approval
//   T2 picture  — synthesis across entities/events
//   T3 asset    — unit utilization vs uncovered priorities
//   T4 cross    — multi-source corroboration
//   T5 gaps     — stale tracks, low fuel, orphan refs

import type {
  Entity,
  Event,
  Recommendation,
  Report,
  Unit,
} from '@/types/ontology';

export interface AiSuggestionsInput {
  entities: Entity[];
  units: Unit[];
  events: Event[];
  reports: Report[];
  recommendations: Recommendation[];
}

export interface AiSuggestion {
  /** Stable key for React lists. */
  id: string;
  /** Click-to-submit prompt text — what gets sent to onAsk(). */
  prompt: string;
  /** One-word category for badge / glyph selection downstream. */
  category: 'decide' | 'picture' | 'asset' | 'cross' | 'gaps';
}

// Prompts are written so the agent's SQL generator hits a real, populated
// table with a simple SELECT, GROUP BY, or single-FK join. Avoid prompts
// that require: time windows (`now() - INTERVAL …`), geo math, multi-step
// reasoning, or array-element joins — those tend to come back empty.

export function buildAiSuggestions(
  state: AiSuggestionsInput,
  limit = 6
): AiSuggestion[] {
  const out: AiSuggestion[] = [];
  const { entities, units, events, reports, recommendations } = state;

  const pendingRecs = recommendations.filter((r) => r.status === 'pending');
  const hostiles = entities.filter(
    (e) => e.threat_level === 'high' || e.threat_level === 'med'
  );

  // ── decide ───────────────────────────────────────────────────
  // SELECT / aggregate over recommendation FINAL — pending row count is
  // the most actionable thing to surface.
  if (pendingRecs.length > 0) {
    out.push({
      id: 'decide-list-pending',
      category: 'decide',
      prompt: `List every pending recommendation: action type, subject entity, confidence, and rationale.`,
    });
    out.push({
      id: 'decide-group-by-action',
      category: 'decide',
      prompt: `Group recommendations by status and action type — give me counts per bucket.`,
    });
    out.push({
      id: 'decide-by-confidence',
      category: 'decide',
      prompt: `Show pending recommendations ordered by confidence — highest first.`,
    });
  }

  // ── picture ──────────────────────────────────────────────────
  // SELECT / aggregate over entity FINAL.
  if (hostiles.length > 0) {
    out.push({
      id: 'picture-hostile-summary',
      category: 'picture',
      prompt: `List every hostile entity (threat_level high or med): name, classification, confidence, and last known lat/lon.`,
    });
  }
  out.push({
    id: 'picture-by-subtype',
    category: 'picture',
    prompt: `Count entities by subtype and threat level — give me a breakdown table.`,
  });
  out.push({
    id: 'picture-avg-confidence',
    category: 'picture',
    prompt: `Average entity confidence per subtype — which class is the best resolved?`,
  });

  // ── asset ────────────────────────────────────────────────────
  // SELECT / aggregate over unit FINAL.
  out.push({
    id: 'asset-drone-roster',
    category: 'asset',
    prompt: `List every drone with callsign, status, battery_pct, fuel_pct, and capabilities.`,
  });
  out.push({
    id: 'asset-status-breakdown',
    category: 'asset',
    prompt: `Group units by status — count how many are on_station, en_route, idle, returning, offline.`,
  });
  const kineticUnits = units.filter((u) =>
    (u.capabilities ?? []).includes('kinetic')
  );
  if (kineticUnits.length > 0) {
    out.push({
      id: 'asset-kinetic-roster',
      category: 'asset',
      prompt: `Which units have 'kinetic' in their capabilities? Show callsign, subtype, and status.`,
    });
  }

  // ── cross-source ─────────────────────────────────────────────
  // SELECT / aggregate over report FINAL + event FINAL.
  if (reports.length > 0) {
    out.push({
      id: 'cross-reports-by-channel',
      category: 'cross',
      prompt: `Group reports by _subtype and channel — give me a count per source.`,
    });
    out.push({
      id: 'cross-osint-list',
      category: 'cross',
      prompt: `List every OSINT report (_subtype = 'osint'): author, classification, and the entity_refs it cites.`,
    });
  }
  out.push({
    id: 'cross-events-by-severity',
    category: 'cross',
    prompt: `Count events by severity and _subtype — biggest buckets first.`,
  });

  // ── gaps ─────────────────────────────────────────────────────
  // Filter on numeric / status columns that the data definitely has.
  out.push({
    id: 'gaps-low-fuel',
    category: 'gaps',
    prompt: `List units with battery_pct < 50 OR fuel_pct < 50 — show callsign, status, battery, fuel.`,
  });
  if (events.length > 0) {
    out.push({
      id: 'gaps-critical-events',
      category: 'gaps',
      prompt: `Show every critical-severity event: subtype, description, and the linked entity_id and unit_id.`,
    });
  }
  out.push({
    id: 'gaps-active-objectives',
    category: 'gaps',
    prompt: `List mission objectives where status is 'open' or 'active' — title, priority, target_entity_id.`,
  });

  return out.slice(0, limit);
}
