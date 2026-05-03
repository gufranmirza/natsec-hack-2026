// Mock fixtures shaped per ADR 0002. Single source of truth for the
// /home view until the real `ws-gateway` is wired up. The shape is
// production-correct so a swap to live data is path-only.

export { MISSION_OBJECTIVE } from './mission-objective';
export { MISSIONS, ACTIVE_MISSION_ID } from './missions';
export { UNITS } from './units';
export { ENTITIES } from './entities';
export { REPORTS } from './reports';
export { EVENTS } from './events';
export { RECOMMENDATIONS } from './recommendations';

import { ENTITIES } from './entities';
import { EVENTS } from './events';
import { MISSION_OBJECTIVE } from './mission-objective';
import { MISSIONS } from './missions';
import { RECOMMENDATIONS } from './recommendations';
import { REPORTS } from './reports';
import { UNITS } from './units';

import type { AnyObject } from '@/types/ontology';

// Flat lookup table — used by Object chips to resolve {_type, _id}
// references inline in narrative text. Indexed by _id only because
// _id is globally unique across types.
export const ALL_OBJECTS: Record<string, AnyObject> = Object.fromEntries(
  [
    MISSION_OBJECTIVE,
    ...MISSIONS,
    ...UNITS,
    ...ENTITIES,
    ...REPORTS,
    ...EVENTS,
    ...RECOMMENDATIONS,
  ].map((o) => [o._id, o as AnyObject])
);

export function lookupObject(id: string): AnyObject | undefined {
  return ALL_OBJECTS[id];
}

export function displayName(o: AnyObject): string {
  switch (o._type) {
    case 'Unit':
      return o.callsign;
    case 'Entity':
      return o.name ?? o._id;
    case 'MissionObjective':
    case 'Plan':
      return o.title;
    case 'Mission':
      return o.intent.slice(0, 40);
    case 'Report':
      return `${o.author ?? 'Report'} · ${o._subtype}`;
    case 'Event': {
      // Show "<subtype> — <gist>" so the row says what HAPPENED.
      // Bare verb ("Reported.", "Lost.") doesn't identify the event.
      const desc = o.description?.trim() ?? '';
      const tail = desc.length > 40 ? `${desc.slice(0, 40)}…` : desc;
      return tail ? `${o._subtype} — ${tail}` : o._subtype;
    }
    case 'Recommendation':
      return `${o.verb} ${o.short}`;
    case 'TaskingOrder':
      return o.command_type;
  }
}
