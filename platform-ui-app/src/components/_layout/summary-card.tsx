import { ReactNode } from 'react';

import { Card } from '@/components/ui/card';

interface SummaryCardProps {
  icon: ReactNode;
  /** Legacy hook — kept for callers; ignored visually. The new
   *  card system uses the icon's own intrinsic color. */
  iconBg?: string;
  value: number | string;
  label: string;
  /** Legacy hook — kept for callers; ignored. Numbers always
   *  render in `text-foreground` for hierarchy clarity. */
  valueClass?: string;
  secondary?: { primary?: string; secondary?: string; primaryClass?: string };
}

// Premium stat card. Generous whitespace, subtle gradient surface
// (.surface-card via the base Card), single-tone icon, and tabular
// numerics for clean alignment in a row of cards. The label is
// uppercase + xs + tracked, never bold — the number does the heavy
// lifting visually.
export function SummaryCard({
  icon,
  value,
  label,
  secondary,
}: SummaryCardProps) {
  return (
    <Card className="px-5 py-4">
      <div className="flex items-start justify-between gap-4">
        <div className="flex min-w-0 flex-1 flex-col gap-3">
          <div className="text-muted-foreground flex items-center gap-1.5 text-[11px] font-medium uppercase tracking-wide">
            <span className="opacity-70">{icon}</span>
            <span>{label}</span>
          </div>
          <div className="text-foreground text-3xl font-semibold tabular-nums tracking-tight">
            {value}
          </div>
        </div>
        {secondary ? (
          <div className="text-right">
            {secondary.primary ? (
              <p className="text-muted-foreground text-xs">
                {secondary.primary}
              </p>
            ) : null}
            {secondary.secondary ? (
              <p className="text-muted-foreground/70 text-[11px]">
                {secondary.secondary}
              </p>
            ) : null}
          </div>
        ) : null}
      </div>
    </Card>
  );
}
