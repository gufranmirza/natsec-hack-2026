import type { MissionObjective } from '@/types/ontology';

export const MISSION_OBJECTIVE: MissionObjective = {
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
};
