'use client';

import { typeStripeColor } from './affiliation';

import { cn } from '@/components/lib/utils';
import { displayName, lookupObject } from '@/lib/fixtures';
import type { AnyObject } from '@/types/ontology';

// Compact display name for the _type tag. Three-letter codes read as
// stencil tags; full names ("Recommendation") would crowd the chip.
const TYPE_TAG: Record<AnyObject['_type'], string> = {
  Entity: 'ENT',
  Unit: 'UNT',
  Event: 'EVT',
  Report: 'RPT',
  Recommendation: 'REC',
  MissionObjective: 'OBJ',
  Plan: 'PLN',
  Mission: 'MIS',
  TaskingOrder: 'TSK',
};

export interface ObjectChipProps {
  /** Inline object reference. Pass either an `_id` to look up in
   *  fixtures, or a full Object to render.
   *  NOTE: this prop is named `objectRef` — `ref` is reserved by React. */
  objectRef?: { _type: AnyObject['_type']; _id: string };
  object?: AnyObject;
  /** Override display label (default: derived from object). */
  label?: string;
  /** Click handler. Default behavior is wired by the parent (open Drawer). */
  onSelect?: (o: AnyObject) => void;
  /** Compact: smaller padding, no _type tag. Used in dense surfaces. */
  compact?: boolean;
  className?: string;
}

/**
 * Object chip — the visible signature of OAG. A square-edged stencil
 * tag with a leading 3px color stripe keyed to the Object _type, a
 * 9px tracked-uppercase _type code, and the display name in mono.
 *
 * Reads as a shipping label, not a Material pill. Click opens the
 * Object Drawer (right edge).
 */
export function ObjectChip({
  objectRef,
  object,
  label,
  onSelect,
  compact = false,
  className,
}: ObjectChipProps) {
  const o = object ?? (objectRef ? lookupObject(objectRef._id) : undefined);

  if (!o) {
    // Fallback: render an unknown chip rather than crash.
    return (
      <span
        className={cn(
          'border-border text-muted-foreground bg-card inline-flex items-baseline gap-1.5 border px-1.5 py-0.5 align-baseline font-mono text-[11px]',
          className
        )}
      >
        <span className="label-cap-sm">UNK</span>
        <span>{objectRef?._id ?? '—'}</span>
      </span>
    );
  }

  const tag = TYPE_TAG[o._type];
  const stripe = typeStripeColor(o._type);
  const name = label ?? displayName(o);

  // stopPropagation so a chip click inside a clickable parent (e.g. a
  // recommendation card) doesn't bubble up and overwrite the selection
  // with the parent's object.
  const handleClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    onSelect?.(o);
  };

  return (
    <button
      type="button"
      onClick={onSelect ? handleClick : undefined}
      className={cn(
        'border-border bg-card text-foreground hover:bg-secondary group inline-flex items-baseline gap-1.5 border align-baseline transition-colors',
        compact ? 'py-0.5 pl-1 pr-1.5' : 'py-0.5 pl-1.5 pr-2',
        onSelect ? 'cursor-pointer' : 'cursor-default',
        className
      )}
      aria-label={`Open ${o._type} ${name}`}
    >
      {/* Leading 3px color stripe — keyed to _type, not affiliation */}
      <span
        aria-hidden
        className="self-stretch"
        style={{ width: 3, backgroundColor: stripe, marginRight: 2 }}
      />
      {!compact && (
        <span
          className="text-muted-foreground/80 label-cap-sm"
          style={{ marginTop: 1 }}
        >
          {tag}
        </span>
      )}
      <span className="font-mono text-[11px] tracking-tight">{name}</span>
    </button>
  );
}
