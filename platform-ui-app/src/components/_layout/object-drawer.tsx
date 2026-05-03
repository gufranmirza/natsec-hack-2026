'use client';

// Object Drawer — right-edge slide-in overlay that renders a detail
// view for any Object handle. The single overlay surface for all
// "show me details about X" interactions: clicked from the map, from
// an Object chip in the chat, from a row in col 2.
//
// Per UI ADR 0001 R-9.

import { ChevronRight, Pencil, X } from 'lucide-react';

import {
  affiliationToken,
  typeStripeColor,
} from '@/components/_ontology/affiliation';
import { ObjectChip } from '@/components/_ontology/object-chip';
import { Button } from '@/components/ui/button';
import { Sheet, SheetContent, SheetTitle } from '@/components/ui/sheet';
import { displayName } from '@/lib/fixtures';
import type {
  AnyObject,
  Entity,
  MissionObjective,
  Recommendation,
  Report,
  Unit,
} from '@/types/ontology';

interface ObjectDrawerProps {
  open: boolean;
  object: AnyObject | null;
  onClose: () => void;
  onSelect?: (o: AnyObject) => void;
  onApprove?: (rec: Recommendation) => void;
  onReject?: (rec: Recommendation) => void;
  onModify?: (rec: Recommendation) => void;
}

export function ObjectDrawer({
  open,
  object,
  onClose,
  onSelect,
  onApprove,
  onReject,
  onModify,
}: ObjectDrawerProps) {
  return (
    <Sheet open={open} onOpenChange={(v) => !v && onClose()}>
      <SheetContent
        side="right"
        className="border-border bg-background w-[420px] max-w-[420px] overflow-y-auto p-0 sm:max-w-[420px]"
      >
        {object ? (
          <DrawerBody
            object={object}
            onSelect={onSelect}
            onApprove={onApprove}
            onReject={onReject}
            onModify={onModify}
          />
        ) : null}
      </SheetContent>
    </Sheet>
  );
}

function DrawerBody({
  object,
  onSelect,
  onApprove,
  onReject,
  onModify,
}: {
  object: AnyObject;
  onSelect?: (o: AnyObject) => void;
  onApprove?: (rec: Recommendation) => void;
  onReject?: (rec: Recommendation) => void;
  onModify?: (rec: Recommendation) => void;
}) {
  const stripe = typeStripeColor(object._type);
  const name = displayName(object);

  return (
    <div className="flex flex-col">
      {/* Header strip — color stripe + _type tag + display name */}
      <div className="border-border relative flex flex-col gap-1 border-b px-5 pb-4 pt-5">
        <div
          aria-hidden
          className="absolute left-0 top-0 h-full w-[3px]"
          style={{ backgroundColor: stripe }}
        />
        <span className="text-muted-foreground label-cap-sm">
          {object._type}
        </span>
        <SheetTitle className="font-serif text-[22px] italic leading-tight tracking-tight">
          {name}
        </SheetTitle>
        <span className="text-muted-foreground font-mono text-[10px]">
          {object._id} · v{object._version}
        </span>
      </div>

      {/* Type-specific body */}
      <div className="px-5 py-4">
        {object._type === 'Entity' && <EntityBody object={object} />}
        {object._type === 'Unit' && <UnitBody object={object} />}
        {object._type === 'Report' && <ReportBody object={object} />}
        {object._type === 'Recommendation' && (
          <RecommendationBody
            object={object}
            onSelect={onSelect}
            onApprove={onApprove}
            onReject={onReject}
            onModify={onModify}
          />
        )}
        {object._type === 'MissionObjective' && (
          <MissionObjectiveBody object={object} />
        )}
      </div>

      {/* Provenance footer */}
      <div className="border-border bg-muted/40 mt-auto border-t px-5 py-3">
        <div className="text-muted-foreground/80 label-cap-sm mb-1.5">
          Provenance
        </div>
        <dl className="grid grid-cols-[80px_1fr] gap-x-3 gap-y-1 text-[11px]">
          <dt className="text-muted-foreground">Source</dt>
          <dd className="text-foreground/90 font-mono">{object._source}</dd>
          {object._source_ref ? (
            <>
              <dt className="text-muted-foreground">Source ref</dt>
              <dd className="text-foreground/90 font-mono">
                {object._source_ref}
              </dd>
            </>
          ) : null}
          <dt className="text-muted-foreground">Observed</dt>
          <dd className="text-foreground/90 font-mono">
            {fmtTime(object._observed_at)}
          </dd>
          <dt className="text-muted-foreground">Ingested</dt>
          <dd className="text-foreground/90 font-mono">
            {fmtTime(object._ingested_at)}
          </dd>
        </dl>
      </div>
    </div>
  );
}

function fmtTime(iso: string) {
  return iso.replace('T', ' ').replace('Z', 'Z');
}

function Stat({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-0.5">
      <span className="text-muted-foreground/80 label-cap-sm">{label}</span>
      <span className="text-foreground/95 font-mono text-[12px]">{value}</span>
    </div>
  );
}

function EntityBody({ object }: { object: Entity }) {
  const tone = affiliationToken(object.affiliation);
  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <span className={`size-2 ${tone.bg}`} />
        <span className="text-foreground/90 label-cap">
          {object.affiliation} · {object._subtype}
        </span>
        <span className={`text-foreground/60 ml-auto font-mono text-[10px]`}>
          THREAT&nbsp;
          <span className="text-foreground/90">
            {object.threat_level.toUpperCase()}
          </span>
        </span>
      </div>
      <div className="grid grid-cols-2 gap-x-4 gap-y-3">
        <Stat
          label="Position"
          value={`${object.position[0].toFixed(3)}°N ${object.position[1].toFixed(3)}°E`}
        />
        {object.altitude_m ? (
          <Stat label="Altitude" value={`${object.altitude_m} m`} />
        ) : null}
        {object.heading_deg !== undefined ? (
          <Stat label="Heading" value={`${object.heading_deg}°`} />
        ) : null}
        {object.speed_mps !== undefined ? (
          <Stat label="Speed" value={`${object.speed_mps} m/s`} />
        ) : null}
        <Stat
          label="Confidence"
          value={`${(object.confidence * 100).toFixed(0)}%`}
        />
      </div>
      {object.attributes && Object.keys(object.attributes).length > 0 ? (
        <div className="border-border space-y-1 border-t pt-3">
          <div className="text-muted-foreground/80 label-cap-sm mb-2">
            Attributes
          </div>
          <dl className="grid grid-cols-[100px_1fr] gap-x-3 gap-y-1 text-[11px]">
            {Object.entries(object.attributes).map(([k, v]) => (
              <div key={k} className="contents">
                <dt className="text-muted-foreground">{k}</dt>
                <dd className="text-foreground/90 font-mono">{v}</dd>
              </div>
            ))}
          </dl>
        </div>
      ) : null}
    </div>
  );
}

function UnitBody({ object }: { object: Unit }) {
  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <span
          className={`size-2 ${
            object.health === 'healthy'
              ? 'bg-success'
              : object.health === 'limited'
                ? 'bg-warning'
                : 'bg-threat'
          }`}
        />
        <span className="text-foreground/90 label-cap">
          {object.health} · {object._subtype}
        </span>
        <span className="text-foreground/60 ml-auto font-mono text-[10px]">
          STATUS&nbsp;
          <span className="text-foreground/90">
            {object.status.toUpperCase()}
          </span>
        </span>
      </div>
      <div className="grid grid-cols-2 gap-x-4 gap-y-3">
        <Stat
          label="Position"
          value={`${object.position[0].toFixed(3)}°N ${object.position[1].toFixed(3)}°E`}
        />
        {object.altitude_m ? (
          <Stat label="Altitude" value={`${object.altitude_m} m`} />
        ) : null}
        {object.heading_deg !== undefined ? (
          <Stat label="Heading" value={`${object.heading_deg}°`} />
        ) : null}
        {object.speed_mps !== undefined ? (
          <Stat label="Speed" value={`${object.speed_mps} m/s`} />
        ) : null}
        {object.battery_pct !== undefined ? (
          <Stat label="Battery" value={`${object.battery_pct}%`} />
        ) : null}
        {object.fuel_pct !== undefined ? (
          <Stat label="Fuel" value={`${object.fuel_pct}%`} />
        ) : null}
      </div>
      <div className="border-border border-t pt-3">
        <div className="text-muted-foreground/80 label-cap-sm mb-2">
          Capabilities
        </div>
        <div className="flex flex-wrap gap-1.5">
          {object.capabilities.map((c) => (
            <span
              key={c}
              className="border-border text-foreground/85 bg-card border px-1.5 py-0.5 font-mono text-[10px] uppercase tracking-wider"
            >
              {c}
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}

function ReportBody({ object }: { object: Report }) {
  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <span className="text-foreground/90 label-cap">
          {object._subtype} · {object.classification}
        </span>
        {object.author ? (
          <span className="text-muted-foreground ml-auto font-mono text-[10px]">
            FROM&nbsp;
            <span className="text-foreground/90">{object.author}</span>
          </span>
        ) : null}
      </div>
      <p className="text-foreground/95 text-[13px] leading-relaxed">
        {object.text}
      </p>
      {object.entity_refs && object.entity_refs.length > 0 ? (
        <div className="border-border border-t pt-3">
          <div className="text-muted-foreground/80 label-cap-sm mb-2">
            Referenced
          </div>
          <div className="flex flex-wrap gap-1.5">
            {object.entity_refs.map((id) => (
              <ObjectChip
                key={id}
                objectRef={{ _type: 'Entity', _id: id }}
                compact
              />
            ))}
          </div>
        </div>
      ) : null}
    </div>
  );
}

function RecommendationBody({
  object,
  onSelect,
  onApprove,
  onReject,
  onModify,
}: {
  object: Recommendation;
  onSelect?: (o: AnyObject) => void;
  onApprove?: (rec: Recommendation) => void;
  onReject?: (rec: Recommendation) => void;
  onModify?: (rec: Recommendation) => void;
}) {
  const decided =
    object.status === 'accepted' || object.status === 'rejected';
  return (
    <div className="space-y-4">
      <p className="text-foreground/95 text-[14px] leading-snug">
        <span className="text-foreground mr-1.5 font-serif text-[16px] italic">
          {object.verb}
        </span>
        {object.short}
      </p>

      {/* Action row — same buttons as the card so the operator can decide
          straight from the detail panel. Hidden if no handlers wired. */}
      {onApprove || onReject || onModify ? (
        <div className="border-border flex items-center gap-1.5 border-y py-2">
          {onReject ? (
            <Button
              variant="ghost"
              size="sm"
              disabled={decided}
              onClick={() => onReject(object)}
              className="text-threat hover:bg-threat/10 hover:text-threat"
            >
              <X className="size-3.5" />
              Reject
            </Button>
          ) : null}
          {onModify ? (
            <Button
              variant="ghost"
              size="sm"
              disabled={decided}
              onClick={() => onModify(object)}
            >
              <Pencil className="size-3.5" />
              Modify
            </Button>
          ) : null}
          {onApprove ? (
            <Button
              size="sm"
              disabled={decided}
              onClick={() => onApprove(object)}
              className="ml-auto"
            >
              {object.status === 'accepted' ? 'Approved' : 'Approve'}
              <ChevronRight className="size-3.5" />
            </Button>
          ) : null}
        </div>
      ) : null}

      <div className="grid grid-cols-2 gap-x-4 gap-y-3">
        <Stat
          label="Confidence"
          value={`${(object.confidence * 100).toFixed(0)}%`}
        />
        <Stat label="Status" value={object.status} />
        {object.eta ? <Stat label="ETA" value={object.eta} /> : null}
        {object.asset_callsign ? (
          <Stat label="Asset" value={object.asset_callsign} />
        ) : null}
      </div>
      <div className="border-border border-t pt-3">
        <div className="text-muted-foreground/80 label-cap-sm mb-2">
          Rationale
        </div>
        <p className="text-foreground/85 text-[12px] leading-relaxed">
          {object.rationale}
        </p>
      </div>
      <div className="border-border border-t pt-3">
        <div className="text-muted-foreground/80 label-cap-sm mb-2">
          Evidence
        </div>
        <div className="flex flex-wrap gap-1.5">
          {object.evidence_refs.map((id) => {
            const _type = id.startsWith('evt_')
              ? 'Event'
              : id.startsWith('rep_')
                ? 'Report'
                : id.startsWith('ent_')
                  ? 'Entity'
                  : 'Event';
            return (
              <ObjectChip
                key={id}
                objectRef={{ _type, _id: id }}
                onSelect={onSelect}
                compact
              />
            );
          })}
        </div>
      </div>
    </div>
  );
}

function MissionObjectiveBody({ object }: { object: MissionObjective }) {
  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <span className="text-foreground/90 label-cap">
          {object.priority} · {object.status}
        </span>
        {object.deadline ? (
          <span className="text-muted-foreground ml-auto font-mono text-[10px]">
            DUE&nbsp;
            <span className="text-foreground/90">
              {fmtTime(object.deadline)}
            </span>
          </span>
        ) : null}
      </div>
      <p className="text-foreground/95 text-[13px] leading-relaxed">
        {object.description}
      </p>
    </div>
  );
}
