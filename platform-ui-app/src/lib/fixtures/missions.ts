import type { MissionObjective } from '@/types/ontology';

// Multiple operations open in tabs. The active tab drives the rest
// of the UI. For v1 only OP SILENT EYE has full ontology data; the
// other tabs are placeholders that show an empty-mission state when
// selected. This is enough to demo the multi-mission affordance
// without authoring duplicate fixture sets.
export const MISSIONS: MissionObjective[] = [
  {
    _type: 'MissionObjective',
    _id: 'obj_silent_eye',
    _version: 1,
    _observed_at: '2026-05-02T12:09:38Z',
    _ingested_at: '2026-05-02T12:09:38Z',
    _source: 'operator',
    _source_ref: 'OP-SE-001',
    title: 'OP SILENT EYE',
    description:
      'Maintain persistent ISR over the eastern Ukraine line of contact using DeepState terrain context, drone telemetry, RF cues, and commander-approved tasking. Visual confirmation on any contact entering the inner ring; no engagement without explicit operator authorization.',
    priority: 'P1',
    target_area: [
      [49.05, 37.15],
      [49.05, 38.2],
      [48.35, 38.2],
      [48.35, 37.15],
    ],
    deadline: '2026-05-02T18:00:00Z',
    status: 'active',
  },
  {
    _type: 'MissionObjective',
    _id: 'obj_night_eagle',
    _version: 1,
    _observed_at: '2026-05-02T11:00:00Z',
    _ingested_at: '2026-05-02T11:00:00Z',
    _source: 'operator',
    _source_ref: 'OP-NE-014',
    title: 'OP NIGHT EAGLE',
    description:
      'Long-range ISR over coastal approach, sector D-7. Hand-off to JADE-2 at relief.',
    priority: 'P2',
    deadline: '2026-05-02T22:00:00Z',
    status: 'open',
  },
  {
    _type: 'MissionObjective',
    _id: 'obj_red_horizon',
    _version: 3,
    _observed_at: '2026-05-02T08:00:00Z',
    _ingested_at: '2026-05-02T08:00:00Z',
    _source: 'operator',
    _source_ref: 'OP-RH-007',
    title: 'OP RED HORIZON',
    description: 'Search-and-rescue handoff complete. Awaiting after-action.',
    priority: 'P0',
    status: 'completed',
  },
];

// The active mission for v1 is always OP SILENT EYE (it's the only
// one with full ontology fixture data).
export const ACTIVE_MISSION_ID = 'obj_silent_eye';
