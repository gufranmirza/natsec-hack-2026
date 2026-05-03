// Shared types for the platform-control-plane read API. Mirrors the
// `pageResponse` envelope returned by every typed list endpoint at
// `GET /api/v1/objects/{type}` and the changelog feed.
//
// Every Object Type service in this folder builds on these.

import type { AnyObject } from '@/types/ontology';

// Page<T> is the wire envelope returned by GET /api/v1/objects/{type}.
// `next_cursor` is empty when there's no further page (per CP read
// handler's pageResponse type).
export interface Page<T> {
  items: T[];
  next_cursor?: string;
  count: number;
}

// CommonListParams are filters supported on every Object Type table.
// Per-type *ListParams interfaces extend this with FK / type-specific
// filters that the CP read handler exposes (e.g., entity_id on Event).
export interface CommonListParams {
  subtype?: string[];
  source?: string[];
  source_ref?: string;
  bbox?: BBox;            // [minLat, minLon, maxLat, maxLon]
  observed_after?: string; // RFC3339
  observed_before?: string;
  status?: string[];
  limit?: number;
  cursor?: string;
}

export type BBox = [number, number, number, number];

// buildSearchParams turns a typed params object into the URLSearchParams
// shape the CP expects. Extracted so per-type api files can extend with
// their own FK params (entity_id, unit_id, etc.) without duplicating
// the common-filter serialization.
export function buildCommonParams(p?: CommonListParams): URLSearchParams {
  const sp = new URLSearchParams();
  if (!p) return sp;
  if (p.subtype) p.subtype.forEach(s => sp.append('subtype', s));
  if (p.source) p.source.forEach(s => sp.append('source', s));
  if (p.source_ref) sp.set('source_ref', p.source_ref);
  if (p.bbox) sp.set('bbox', p.bbox.join(','));
  if (p.observed_after) sp.set('observed_after', p.observed_after);
  if (p.observed_before) sp.set('observed_before', p.observed_before);
  if (p.status) p.status.forEach(s => sp.append('status', s));
  if (p.limit) sp.set('limit', String(p.limit));
  if (p.cursor) sp.set('cursor', p.cursor);
  return sp;
}

// commonKey produces a stable, sorted serialization of CommonListParams
// suitable for a TanStack Query cache key. Per-type query files extend
// this with their FK params.
export function commonKey(p?: CommonListParams): string {
  if (!p) return '';
  const parts: string[] = [];
  if (p.subtype && p.subtype.length > 0) parts.push(`st=${[...p.subtype].sort().join(',')}`);
  if (p.source && p.source.length > 0) parts.push(`src=${[...p.source].sort().join(',')}`);
  if (p.source_ref) parts.push(`srcref=${p.source_ref}`);
  if (p.bbox) parts.push(`bb=${p.bbox.join(',')}`);
  if (p.observed_after) parts.push(`oa=${p.observed_after}`);
  if (p.observed_before) parts.push(`ob=${p.observed_before}`);
  if (p.status && p.status.length > 0) parts.push(`s=${[...p.status].sort().join(',')}`);
  if (p.limit) parts.push(`l=${p.limit}`);
  if (p.cursor) parts.push(`c=${p.cursor}`);
  return parts.join('&');
}

// finalize pulls the trimmed query string off a URLSearchParams.
export function qs(sp: URLSearchParams): string {
  const s = sp.toString();
  return s ? `?${s}` : '';
}

// ObjectHandle is what every CP read returns: the typed object plus a
// `_type` discriminator. Casting to AnyObject is safe because the CP
// only emits one of the 9 known types.
export type ObjectHandle<T extends AnyObject = AnyObject> = T;
