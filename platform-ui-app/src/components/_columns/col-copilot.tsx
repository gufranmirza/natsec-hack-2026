'use client';

// Column 3 (25%) on the awareness/COP workspace — Recommendations panel
// only (Anduril-shaped action cards). The chat surface that used to live
// here was moved to the AI Intelligence tab; col-3 is now a single-purpose
// HITL approve/reject column.
//
// Built on shadcn primitives: ScrollArea (Radix), Button, Card.

import { useState } from 'react';
import { ChevronDown, ChevronRight, Pencil, X } from 'lucide-react';

import { ObjectChip } from '@/components/_ontology/object-chip';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { lookupObject } from '@/lib/fixtures';
import type { AnyObject, Recommendation } from '@/types/ontology';

// ──────────────────────────────────────────────────────────────────
// Auto-chip helper — converts callsigns ("BOGEY-7", "ROOK-1", ...)
// in plain text to clickable Object chips inline.
// ──────────────────────────────────────────────────────────────────
const CALLSIGN_MAP: Record<string, { _type: AnyObject['_type']; _id: string }> =
  {
    'ROOK-1': { _type: 'Unit', _id: 'unit_rook1' },
    'ROOK-2': { _type: 'Unit', _id: 'unit_rook2' },
    'BRAVO-3': { _type: 'Unit', _id: 'unit_bravo3' },
    'BOGEY-7': { _type: 'Entity', _id: 'ent_bogey7' },
    'V-117': { _type: 'Entity', _id: 'ent_v117' },
    'P-04': { _type: 'Entity', _id: 'ent_p04' },
  };

function withChips(
  text: string,
  onSelect: (o: AnyObject) => void
): React.ReactNode {
  return text.split(/(\b[A-Z][A-Z0-9-]+\b)/).map((part, i) => {
    const objRef = CALLSIGN_MAP[part];
    if (objRef && lookupObject(objRef._id)) {
      return (
        <ObjectChip key={i} objectRef={objRef} onSelect={onSelect} compact />
      );
    }
    return part;
  });
}

interface ColCopilotProps {
  recommendations: Recommendation[];
  onSelect: (o: AnyObject) => void;
  onApprove: (rec: Recommendation) => void;
  onReject: (rec: Recommendation) => void;
  onModify: (rec: Recommendation) => void;
}

export function ColCopilot({
  recommendations,
  onSelect,
  onApprove,
  onReject,
  onModify,
}: ColCopilotProps) {
  return (
    <aside className="bg-background flex h-full min-h-0 flex-col overflow-hidden">
      <RecommendationsPanel
        recommendations={recommendations}
        onSelect={onSelect}
        onApprove={onApprove}
        onReject={onReject}
        onModify={onModify}
      />
    </aside>
  );
}

/* ------------------------------------------------------------------ */
/*  RECOMMENDATIONS PANEL                                             */
/* ------------------------------------------------------------------ */

function RecommendationsPanel({
  recommendations,
  onSelect,
  onApprove,
  onReject,
  onModify,
}: {
  recommendations: Recommendation[];
  onSelect: (o: AnyObject) => void;
  onApprove: (rec: Recommendation) => void;
  onReject: (rec: Recommendation) => void;
  onModify: (rec: Recommendation) => void;
}) {
  const [open, setOpen] = useState(true);
  const pendingCount = recommendations.filter(
    (rec) => rec.status === 'pending'
  ).length;
  return (
    <section
      className={[
        'border-border flex flex-col overflow-hidden border-b',
        open ? 'min-h-0 flex-1' : 'shrink-0',
      ].join(' ')}
    >
      <button
        type="button"
        aria-expanded={open}
        aria-controls="recommendations-panel"
        onClick={() => setOpen((v) => !v)}
        className="border-border hover:bg-muted/30 flex w-full shrink-0 items-baseline justify-between border-b px-3 py-1 text-left transition-colors"
      >
        <span className="flex items-baseline gap-1.5">
          <ChevronDown
            className={[
              'text-muted-foreground/70 size-3 self-center transition-transform',
              open ? '' : '-rotate-90',
            ].join(' ')}
            aria-hidden
          />
          <h2 className="text-foreground/90 label-cap">Recommendations</h2>
        </span>
        <span className="text-muted-foreground/80 font-mono text-[10px]">
          {pendingCount} pending · grounded
        </span>
      </button>

      {open ? (
        recommendations.length === 0 ? (
          <EmptyState message="No recommendations for this mission." />
        ) : (
          <ScrollArea id="recommendations-panel" className="min-h-0 flex-1">
            <div className="p-2">
              {recommendations.map((r, i) => (
                <RecommendationCard
                  key={r._id}
                  rec={r}
                  active={i === 0}
                  onSelect={onSelect}
                  onApprove={onApprove}
                  onReject={onReject}
                  onModify={onModify}
                />
              ))}
            </div>
          </ScrollArea>
        )
      ) : null}
    </section>
  );
}

function RecommendationCard({
  rec,
  active,
  onSelect,
  onApprove,
  onReject,
  onModify,
}: {
  rec: Recommendation;
  active?: boolean;
  onSelect: (o: AnyObject) => void;
  onApprove: (rec: Recommendation) => void;
  onReject: (rec: Recommendation) => void;
  onModify: (rec: Recommendation) => void;
}) {
  const conf = Math.round(rec.confidence * 8);
  const confTone =
    rec.confidence >= 0.8
      ? 'bg-primary'
      : rec.confidence >= 0.6
        ? 'bg-success'
        : 'bg-muted-foreground/60';

  const decided = rec.status === 'accepted' || rec.status === 'rejected';

  return (
    <Card
      role="button"
      tabIndex={0}
      onClick={() => onSelect(rec)}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          onSelect(rec);
        }
      }}
      className={[
        'hover:border-primary/60 mb-2 cursor-pointer px-2.5 py-2.5 text-left transition-colors last:mb-0',
        active && rec.status === 'pending' ? 'brackets relative' : '',
        rec.status === 'accepted' ? 'border-success/70 bg-success/5' : '',
        rec.status === 'rejected' ? 'opacity-55' : '',
      ].join(' ')}
    >
      <div className="flex items-baseline justify-between gap-3">
        <p className="text-foreground/95 text-[13px] leading-snug">
          <span className="text-foreground mr-1 font-serif text-[15px] italic">
            {rec.verb}
          </span>
          {withChips(rec.short, onSelect)}
        </p>
        <div className="flex shrink-0 flex-col items-end gap-0.5">
          <div className="flex items-center gap-[2px]">
            {Array.from({ length: 8 }).map((_, i) => (
              <span
                key={i}
                className={`block h-2.5 w-[3px] ${i < conf ? confTone : 'bg-border'}`}
              />
            ))}
          </div>
          <span className="text-muted-foreground font-mono text-[9px]">
            {(rec.confidence * 100).toFixed(0)}%
          </span>
        </div>
      </div>

      <div className="text-muted-foreground mt-2 flex flex-wrap items-center gap-x-2 gap-y-1 text-[10px]">
        {rec.eta ? <span className="font-mono">{rec.eta}</span> : null}
      </div>

      {rec.why && rec.why.length > 0 ? (
        <div className="mt-2 flex flex-wrap gap-1">
          {rec.why.map((w) => (
            <span
              key={w}
              className="border-border bg-muted/40 text-foreground/80 border px-1.5 py-0.5 font-mono text-[10px]"
            >
              {w}
            </span>
          ))}
        </div>
      ) : null}

      <div className="border-border mt-3 flex items-center justify-between border-t pt-2.5">
        <div className="flex items-center gap-1.5">
          <span
            className={`size-1.5 ${
              rec.status === 'accepted'
                ? 'bg-success'
                : rec.status === 'rejected'
                  ? 'bg-threat'
                  : rec.gating === 'auto'
                    ? 'bg-success'
                    : rec.gating === 'confirm'
                      ? 'bg-warning'
                      : 'bg-threat'
            }`}
          />
          <span className="text-muted-foreground label-cap-sm">
            {rec.status === 'pending' ? rec.gating : rec.status}
          </span>
        </div>
        <div
          className="flex items-center gap-1"
          onClick={(e) => e.stopPropagation()}
        >
          <Button
            variant="ghost"
            size="icon"
            aria-label="Reject"
            disabled={decided}
            onClick={() => onReject(rec)}
          >
            <X className="size-3" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            disabled={decided}
            onClick={() => onModify(rec)}
          >
            <Pencil className="size-3" />
            Modify
          </Button>
          <Button size="sm" disabled={decided} onClick={() => onApprove(rec)}>
            {rec.status === 'accepted' ? 'Approved' : 'Approve'}
            <ChevronRight className="size-3" />
          </Button>
        </div>
      </div>
      {rec.status === 'accepted' ? (
        <div className="border-success/50 bg-success/10 text-success mt-2 border px-2 py-1 text-center font-mono text-[10px] font-bold uppercase">
          Approved · command written to mission audit
        </div>
      ) : null}
    </Card>
  );
}

/* ------------------------------------------------------------------ */
/*  EMPTY STATE                                                       */
/* ------------------------------------------------------------------ */

function EmptyState({ message }: { message: string }) {
  return (
    <div className="text-muted-foreground/70 flex min-h-0 flex-1 items-center justify-center px-6 text-center font-mono text-[11px]">
      {message}
    </div>
  );
}
