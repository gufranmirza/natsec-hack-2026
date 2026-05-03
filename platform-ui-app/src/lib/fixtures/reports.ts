import type { Report } from '@/types/ontology';

export const REPORTS: Report[] = [
  {
    _type: 'Report',
    _id: 'rep_001',
    _version: 1,
    _observed_at: '2026-05-02T14:19:12Z',
    _ingested_at: '2026-05-02T14:19:12Z',
    _source: 'voice',
    _source_ref: 'TAC-3',
    _subtype: 'radio',
    author: 'BRAVO-3',
    channel: 'TAC-3',
    text: 'Movement near grid 4E, two figures, possibly armed. Holding position, requesting overwatch.',
    entity_refs: ['ent_p04'],
    classification: 'cui',
  },
  {
    _type: 'Report',
    _id: 'rep_002',
    _version: 1,
    _observed_at: '2026-05-02T14:22:48Z',
    _ingested_at: '2026-05-02T14:22:48Z',
    _source: 'sigint',
    _source_ref: 'SIG-A',
    _subtype: 'sigint',
    author: 'SIG-A',
    channel: 'L-band',
    text: 'Brief L-band emission detected at 38.85N 23.62E. Bursty pattern consistent with UAV control link.',
    entity_refs: ['ent_bogey7'],
    classification: 'confidential',
  },
];
