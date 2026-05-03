#!/usr/bin/env node
// Compiles silent-eye.events.jsonl into the TS fixtures shape the UI
// already reads (src/lib/fixtures/{entities,units,events,reports,...}.ts).
//
// Per UI ADR 0002 §15.3: the JSONL is the canonical artifact; the TS
// fixtures are a build output regenerated from it.
//
// Run: node sim/scenarios/silent-eye-20260502/compile-to-fixtures.mjs
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = resolve(__dirname, '..', '..', '..');
const JSONL = resolve(__dirname, 'silent-eye.events.jsonl');
const FIXTURES = resolve(REPO_ROOT, 'platform-ui-app/src/lib/fixtures');

const SCENARIO_INGEST_AT = '2026-05-02T06:25:00.000Z';

const rows = readFileSync(JSONL, 'utf-8')
  .split('\n')
  .filter(l => l.trim())
  .map(l => JSON.parse(l));

// Stamp the fields that the server normally provides at ingest time
// so the static fixtures look "ingested" to the UI.
for (const r of rows) {
  r._version = r._version ?? 1;
  r._ingested_at = r._ingested_at ?? r._observed_at;
}

// For Entity / Unit / MissionObjective we may re-emit the same _id
// over time (drone moves, entity reclassifies). The static TS fixture
// represents a snapshot, so dedupe keeping the LATEST _observed_at.
// Events / Reports / Recommendations are append-only — keep all rows.
const DEDUPE_TYPES = new Set(['Entity', 'Unit', 'MissionObjective', 'Plan', 'Mission', 'TaskingOrder']);

const byType = {};
for (const r of rows) {
  const bucket = (byType[r._type] ??= []);
  if (DEDUPE_TYPES.has(r._type)) {
    const existing = bucket.findIndex(x => x._id === r._id);
    if (existing >= 0) {
      // Keep whichever has the later _observed_at.
      if ((r._observed_at ?? '') > (bucket[existing]._observed_at ?? '')) {
        bucket[existing] = r;
      }
      continue;
    }
  }
  bucket.push(r);
}

// Sort each group by _observed_at descending (newest first) — matches
// existing fixture convention for events.ts.
for (const t of Object.keys(byType)) {
  byType[t].sort((a, b) => (b._observed_at ?? '').localeCompare(a._observed_at ?? ''));
}

const TS_TYPE_BY_KIND = {
  Entity: 'Entity',
  Event: 'Event',
  Report: 'Report',
  Unit: 'Unit',
  Recommendation: 'Recommendation',
  MissionObjective: 'MissionObjective',
  Plan: 'Plan',
  Mission: 'Mission',
  TaskingOrder: 'TaskingOrder',
};

function stringify(obj) {
  // Use JSON.stringify with 2-space indent then strip outer quotes from
  // keys to produce TS object literal style.
  const json = JSON.stringify(obj, null, 2);
  return json.replace(/^(\s*)"([a-z_][a-zA-Z0-9_]*)":/gm, '$1$2:');
}

function emitFixture(kind, exportName, filename) {
  const items = byType[kind] ?? [];
  const tsType = TS_TYPE_BY_KIND[kind];
  const banner = [
    `// Auto-generated from sim/scenarios/silent-eye-20260502/silent-eye.events.jsonl`,
    `// Do not edit by hand — re-run sim/.../compile-to-fixtures.mjs`,
    ``,
    `import type { ${tsType} } from '@/types/ontology';`,
    ``,
  ].join('\n');

  const body = items.length === 0
    ? `export const ${exportName}: ${tsType}[] = [];\n`
    : `export const ${exportName}: ${tsType}[] = ${stringify(items)};\n`;

  const outPath = resolve(FIXTURES, filename);
  mkdirSync(dirname(outPath), { recursive: true });
  writeFileSync(outPath, banner + body, 'utf-8');
  console.log(`  ${filename}: ${items.length} rows`);
}

console.log(`Compiling ${rows.length} JSONL rows → TS fixtures:`);

emitFixture('Entity',           'ENTITIES',         'entities.ts');
emitFixture('Unit',             'UNITS',            'units.ts');
emitFixture('Event',            'EVENTS',           'events.ts');
emitFixture('Report',           'REPORTS',          'reports.ts');
emitFixture('Recommendation',   'RECOMMENDATIONS',  'recommendations.ts');

// MissionObjective records: the active one becomes MISSION_OBJECTIVE
// (single export, used as the active objective in the UI), and the
// full list becomes MISSIONS (array, drives the mission tabs row).
// ACTIVE_MISSION_ID points at whichever has status=active.
const objectives = byType['MissionObjective'] ?? [];
const active = objectives.find(o => o.status === 'active') ?? objectives[0];
{
  const banner = [
    `// Auto-generated from sim/scenarios/silent-eye-20260502/silent-eye.events.jsonl`,
    `// Do not edit by hand — re-run sim/.../compile-to-fixtures.mjs`,
    ``,
    `import type { MissionObjective } from '@/types/ontology';`,
    ``,
  ].join('\n');
  writeFileSync(
    resolve(FIXTURES, 'mission-objective.ts'),
    banner + `export const MISSION_OBJECTIVE: MissionObjective = ${stringify(active)};\n`,
    'utf-8',
  );
  console.log(`  mission-objective.ts: 1 (active = ${active._id})`);

  // Missions tab row — list of MissionObjectives, with ACTIVE_MISSION_ID
  // pointing at the live one (matches existing UI contract).
  const sortedTabs = [...objectives].sort((a, b) =>
    (a.status === 'active' ? -1 : b.status === 'active' ? 1 : 0)
  );
  writeFileSync(
    resolve(FIXTURES, 'missions.ts'),
    banner +
      `export const MISSIONS: MissionObjective[] = ${stringify(sortedTabs)};\n\n` +
      `export const ACTIVE_MISSION_ID = '${active._id}';\n`,
    'utf-8',
  );
  console.log(`  missions.ts: ${sortedTabs.length} (tabs)`);
}

// Plan + TaskingOrder live from CP; emit empty arrays so existing
// index.ts imports continue to typecheck if anything references them.
emitFixture('Plan',             'PLANS',            'plans.ts');
emitFixture('TaskingOrder',     'TASKING_ORDERS',   'tasking-orders.ts');

console.log('Done.');
