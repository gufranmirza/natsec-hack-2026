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
    'Maintain persistent surveillance of suspected hostile incursion in northern Aegean territorial waters. Visual confirmation on any contact entering the inner ring; no engagement without explicit operator authorization.',
  priority: 'P1',
  target_area: [
    [38.96, 23.15],
    [38.96, 23.85],
    [38.46, 23.85],
    [38.46, 23.15],
  ],
  deadline: '2026-05-02T18:00:00Z',
  status: 'active',
};
