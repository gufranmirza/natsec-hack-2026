import {
  ArrowUpRight,
  ChevronRight,
  Crosshair,
  Mic,
  Radio,
  Wifi,
} from 'lucide-react';
import { Metadata } from 'next';

export const metadata: Metadata = { title: 'Operational Picture' };

export default function Page() {
  return (
    <div className="bg-background relative flex h-full flex-1 flex-col overflow-hidden">
      <HeaderBar />
      <main className="bg-border grid flex-1 grid-cols-12 gap-px overflow-hidden">
        <section className="invert-surface col-span-12 overflow-hidden lg:col-span-8">
          <MapPane />
        </section>
        <aside className="bg-background col-span-12 flex flex-col overflow-hidden lg:col-span-4">
          <ChangeFeed />
          <Recommendations />
        </aside>
      </main>
      <VoiceAffordance />
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  HEADER                                                            */
/* ------------------------------------------------------------------ */

function HeaderBar() {
  return (
    <header className="border-border/60 bg-background relative z-10 flex h-[68px] shrink-0 items-stretch border-b">
      {/* Brand block — flush left, mono mark + serif name */}
      <div className="border-border/60 flex w-[260px] items-center gap-3 border-r px-5">
        <div
          aria-hidden
          className="bg-primary text-primary-foreground grid size-8 place-items-center rounded-sm"
        >
          <Crosshair className="size-4" strokeWidth={2.4} />
        </div>
        <div className="flex flex-col leading-tight">
          <span className="text-foreground font-serif text-[15px] italic tracking-tight">
            Mission Commander
          </span>
          <span className="label-cap text-muted-foreground">
            Edge Console · v0
          </span>
        </div>
      </div>

      {/* Mission identity strip — center, dramatic */}
      <div className="flex flex-1 items-center px-8">
        <div className="flex items-baseline gap-5">
          <span className="label-cap text-muted-foreground/80">Operation</span>
          <h1 className="text-foreground font-serif text-[26px] italic leading-none tracking-tight">
            Silent&nbsp;Eye
          </h1>
          <span
            aria-hidden
            className="text-muted-foreground/40 font-serif text-2xl italic"
          >
            ·
          </span>
          <span className="text-muted-foreground font-mono text-[12px]">
            38.71°N&nbsp;&nbsp;23.50°E
          </span>
          <span
            aria-hidden
            className="text-muted-foreground/40 font-serif text-2xl italic"
          >
            ·
          </span>
          <span className="text-muted-foreground font-mono text-[12px]">
            Bearing&nbsp;088°
          </span>
        </div>
      </div>

      {/* Status rail — pills + clock, right side */}
      <div className="flex items-center gap-4 px-6">
        <StatusPill
          icon={<Wifi className="size-3" />}
          label="Edge"
          value="Synced"
          tone="ok"
        />
        <StatusPill
          icon={<Radio className="size-3" />}
          label="Comms"
          value="92ms"
          tone="ok"
        />
        <StatusPill label="Assets" value="2 / 3" tone="amber" />

        <div className="bg-card hairline ml-2 flex flex-col items-end rounded-sm border px-4 py-1.5">
          <span className="text-foreground font-mono text-[18px] tracking-tight">
            14:23<span className="text-muted-foreground">:</span>47
            <span className="text-muted-foreground/60 ml-1 text-[11px]">Z</span>
          </span>
          <span className="label-cap text-muted-foreground -mt-0.5">
            Mission&nbsp;T+02:14:09
          </span>
        </div>
      </div>
    </header>
  );
}

function StatusPill({
  icon,
  label,
  value,
  tone,
}: {
  icon?: React.ReactNode;
  label: string;
  value: string;
  tone: 'ok' | 'amber' | 'threat';
}) {
  const dot =
    tone === 'ok'
      ? 'bg-success'
      : tone === 'amber'
        ? 'bg-warning'
        : 'bg-threat';
  return (
    <div className="hairline flex items-center gap-2 rounded-sm border border-transparent bg-transparent px-3 py-1.5">
      <span className={`size-1.5 rounded-full ${dot}`} aria-hidden />
      {icon ? <span className="text-muted-foreground">{icon}</span> : null}
      <span className="label-cap text-muted-foreground">{label}</span>
      <span className="text-foreground font-mono text-[11px]">{value}</span>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  MAP PANE                                                          */
/* ------------------------------------------------------------------ */

function MapPane() {
  return (
    <div className="topo relative size-full overflow-hidden">
      {/* Map SVG — hand-drawn topographic & tactical layer */}
      <TacticalMap />

      {/* Top-left: layer chips — what's visible */}
      <div className="absolute left-6 top-6 flex flex-col gap-1.5">
        <LayerChip label="Friendly tracks" tone="friendly" active />
        <LayerChip label="Threat contacts" tone="threat" active />
        <LayerChip label="OSINT cues" tone="amber" />
        <LayerChip label="Terrain shading" tone="muted" />
      </div>

      {/* Top-right: scale & projection — solid card so lat/lon
       * SVG labels don't bleed through behind it. */}
      <div className="bg-card border-border absolute right-6 top-6 rounded-md border px-3.5 py-2.5 shadow-[0_2px_8px_-4px_hsl(0_0%_0%/0.5)]">
        <div className="label-cap text-muted-foreground">Projection</div>
        <div className="text-foreground/95 font-mono text-[11px]">
          WGS-84 · UTM 35S
        </div>
        <div className="bg-border my-2 h-px" />
        <div className="flex items-center gap-2">
          <div className="bg-foreground/70 h-px w-12" />
          <span className="text-muted-foreground font-mono text-[10px]">
            5&nbsp;NM
          </span>
        </div>
      </div>

      {/* Bottom-left: compass rose */}
      <div className="absolute bottom-6 left-6">
        <CompassRose />
      </div>

      {/* Bottom-right: selected entity card */}
      <SelectedEntityCard />
    </div>
  );
}

function LayerChip({
  label,
  tone,
  active = false,
}: {
  label: string;
  tone: 'friendly' | 'threat' | 'amber' | 'muted';
  active?: boolean;
}) {
  const dotClass =
    tone === 'friendly'
      ? 'bg-friendly'
      : tone === 'threat'
        ? 'bg-threat'
        : tone === 'amber'
          ? 'bg-warning'
          : 'bg-muted-foreground/50';
  return (
    <div
      className={[
        'border-border flex w-fit items-center gap-2 rounded-md border px-2.5 py-1.5 shadow-[0_2px_8px_-4px_hsl(0_0%_0%/0.5)] transition-colors',
        active ? 'bg-card text-foreground' : 'bg-card/85 text-muted-foreground',
      ].join(' ')}
    >
      <span className={`size-1.5 rounded-full ${dotClass}`} />
      <span className="label-cap">{label}</span>
    </div>
  );
}

function CompassRose() {
  return (
    <div className="bg-card border-border grid size-20 place-items-center rounded-full border shadow-[0_2px_8px_-4px_hsl(0_0%_0%/0.5)]">
      <svg viewBox="0 0 100 100" className="size-16">
        <g
          transform="translate(50,50)"
          stroke="hsl(38 25% 75% / 0.6)"
          fill="none"
          strokeWidth="0.6"
        >
          <circle r="32" />
          <circle r="22" strokeDasharray="1.5 3" opacity="0.5" />
          {[0, 45, 90, 135, 180, 225, 270, 315].map((a) => (
            <line
              key={a}
              x1="0"
              y1="-32"
              x2="0"
              y2="-29"
              transform={`rotate(${a})`}
              strokeWidth={a % 90 === 0 ? 1.4 : 0.6}
            />
          ))}
        </g>
        <g
          transform="translate(50,50)"
          fill="hsl(28 75% 60%)"
          stroke="hsl(28 75% 60%)"
        >
          <polygon points="0,-26 5,0 0,4 -5,0" />
        </g>
        <text
          x="50"
          y="14"
          textAnchor="middle"
          fontSize="9"
          fontFamily="var(--font-mono)"
          fill="hsl(38 28% 92%)"
        >
          N
        </text>
      </svg>
    </div>
  );
}

function SelectedEntityCard() {
  return (
    <div className="surface-card-elevated border-border absolute bottom-6 right-6 w-[320px] rounded-md border p-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="label-cap text-threat">Hostile · Selected</div>
          <div className="text-foreground mt-1 font-serif text-2xl italic leading-tight tracking-tight">
            BOGEY‑7
          </div>
          <div className="text-muted-foreground mt-0.5 font-mono text-[11px]">
            Class&nbsp;II UAV · est.&nbsp;low‑observable
          </div>
        </div>
        <button
          type="button"
          className="text-muted-foreground hover:text-foreground transition-colors"
          aria-label="Open detail"
        >
          <ArrowUpRight className="size-4" />
        </button>
      </div>

      <div className="border-border/60 mt-3 grid grid-cols-2 gap-x-4 gap-y-2 border-t pt-3">
        <Stat label="Position" value="38.74°N 23.55°E" mono />
        <Stat label="Altitude" value="3,200 ft" mono />
        <Stat label="Heading" value="225°" mono />
        <Stat label="Speed" value="118 kt" mono />
        <Stat label="Confidence" value="0.87" mono />
        <Stat label="First seen" value="T+02:09:43" mono />
      </div>

      <div className="border-border/60 mt-3 flex items-center justify-between border-t pt-3">
        <span className="label-cap text-muted-foreground">Recommend</span>
        <span className="text-foreground/90 font-serif text-[14px] italic">
          Vector&nbsp;ROOK‑1&nbsp;to&nbsp;intercept.
        </span>
      </div>
    </div>
  );
}

function Stat({
  label,
  value,
  mono,
}: {
  label: string;
  value: string;
  mono?: boolean;
}) {
  return (
    <div className="flex flex-col">
      <span className="label-cap text-muted-foreground/80">{label}</span>
      <span
        className={`text-foreground/95 ${mono ? 'font-mono text-[12px]' : 'text-[13px]'}`}
      >
        {value}
      </span>
    </div>
  );
}

function TacticalMap() {
  return (
    <svg
      viewBox="0 0 1000 700"
      preserveAspectRatio="xMidYMid slice"
      className="absolute inset-0 size-full"
    >
      {/* — Hairline grid (10 NM cells) */}
      <g stroke="hsl(38 20% 70% / 0.06)" strokeWidth="0.6">
        {Array.from({ length: 21 }).map((_, i) => (
          <line key={`v${i}`} x1={i * 50} y1="0" x2={i * 50} y2="700" />
        ))}
        {Array.from({ length: 15 }).map((_, i) => (
          <line key={`h${i}`} x1="0" y1={i * 50} x2="1000" y2={i * 50} />
        ))}
      </g>
      {/* — Heavier grid every 100 NM */}
      <g stroke="hsl(38 20% 70% / 0.12)" strokeWidth="0.7">
        {Array.from({ length: 11 }).map((_, i) => (
          <line key={`V${i}`} x1={i * 100} y1="0" x2={i * 100} y2="700" />
        ))}
        {Array.from({ length: 8 }).map((_, i) => (
          <line key={`H${i}`} x1="0" y1={i * 100} x2="1000" y2={i * 100} />
        ))}
      </g>

      {/* — Lat/Lon tick labels in monospace */}
      <g
        fontFamily="var(--font-mono)"
        fontSize="9"
        fill="hsl(38 18% 60% / 0.7)"
      >
        {[0, 100, 200, 300, 400, 500, 600, 700, 800, 900, 1000].map((x, i) => (
          <text key={`tx${x}`} x={x + 4} y={11}>
            {(38.5 + i * 0.05).toFixed(2)}°N
          </text>
        ))}
        {[100, 200, 300, 400, 500, 600].map((y, i) => (
          <text key={`ty${y}`} x={4} y={y + 12}>
            {(23.7 - i * 0.07).toFixed(2)}°E
          </text>
        ))}
      </g>

      {/* — Topographic contour curves (Bezier, faint) */}
      <g fill="none" stroke="hsl(28 40% 65% / 0.18)" strokeWidth="1.1">
        <path d="M -20 220 Q 180 160, 360 240 T 760 200 T 1020 260" />
        <path
          d="M -20 280 Q 180 230, 360 310 T 760 270 T 1020 330"
          strokeWidth="0.9"
          opacity="0.65"
        />
        <path
          d="M -20 340 Q 180 310, 360 380 T 760 350 T 1020 410"
          strokeWidth="0.7"
          opacity="0.5"
        />
      </g>

      {/* — Coastline (heavier ink line dividing land/sea) */}
      <g>
        <path
          d="M -20 460 C 80 420, 220 480, 320 440 S 540 470, 660 430 S 880 450, 1020 410"
          fill="none"
          stroke="hsl(38 25% 78% / 0.55)"
          strokeWidth="1.4"
        />
        {/* — Sea wash below coastline */}
        <path
          d="M -20 460 C 80 420, 220 480, 320 440 S 540 470, 660 430 S 880 450, 1020 410 L 1020 720 L -20 720 Z"
          fill="hsl(210 50% 28% / 0.08)"
        />
      </g>

      {/* — Inland labels */}
      <g
        fontFamily="var(--font-serif)"
        fontStyle="italic"
        fill="hsl(38 25% 75% / 0.55)"
      >
        <text x="190" y="180" fontSize="14">
          Limnos
        </text>
        <text x="640" y="170" fontSize="14">
          Imbros
        </text>
        <text x="380" y="600" fontSize="13">
          Aegean Sea
        </text>
      </g>

      {/* — Friendly tracks (dashed gradient lines from prior waypoint) */}
      <defs>
        <linearGradient id="trackFriendly" x1="0" x2="1" y1="0" y2="0">
          <stop offset="0%" stopColor="hsl(200 50% 68%)" stopOpacity="0" />
          <stop offset="100%" stopColor="hsl(200 50% 68%)" stopOpacity="0.85" />
        </linearGradient>
        <linearGradient id="trackThreat" x1="0" x2="1" y1="0" y2="0">
          <stop offset="0%" stopColor="hsl(12 78% 60%)" stopOpacity="0" />
          <stop offset="100%" stopColor="hsl(12 78% 60%)" stopOpacity="0.9" />
        </linearGradient>
      </defs>

      {/* Track for ROOK-1 (friendly drone heading east-southeast) */}
      <path
        d="M 220 380 Q 320 350, 420 360 T 580 330"
        fill="none"
        stroke="url(#trackFriendly)"
        strokeWidth="1.6"
        strokeDasharray="3 4"
      />
      {/* Track for ROOK-2 (friendly drone heading northwest) */}
      <path
        d="M 720 520 Q 640 480, 560 470 T 420 480"
        fill="none"
        stroke="url(#trackFriendly)"
        strokeWidth="1.6"
        strokeDasharray="3 4"
      />
      {/* Threat track (BOGEY-7) — incoming */}
      <path
        d="M 820 220 Q 740 250, 680 280 T 600 320"
        fill="none"
        stroke="url(#trackThreat)"
        strokeWidth="1.6"
        strokeDasharray="2 3"
      />

      {/* — Threat: pulsing target ring (selected) */}
      <g transform="translate(600 320)">
        <circle
          r="22"
          className="pulse-ring"
          fill="hsl(12 78% 60% / 0.22)"
          stroke="hsl(12 78% 60% / 0.6)"
          strokeWidth="1"
        />
        <circle
          r="14"
          fill="hsl(222 32% 7%)"
          stroke="hsl(12 78% 60%)"
          strokeWidth="1.4"
        />
        <polygon
          points="0,-7 6,5 -6,5"
          fill="hsl(12 78% 60%)"
          stroke="hsl(222 32% 7%)"
          strokeWidth="0.5"
        />
        <text
          x="20"
          y="-8"
          fontFamily="var(--font-mono)"
          fontSize="11"
          fontWeight="600"
          fill="hsl(12 78% 70%)"
        >
          BOGEY‑7
        </text>
        <text
          x="20"
          y="6"
          fontFamily="var(--font-mono)"
          fontSize="9"
          fill="hsl(38 18% 65%)"
        >
          UAV · 3.2k · 118kt
        </text>
      </g>

      {/* — Friendly: ROOK-1 (with heading triangle) */}
      <g transform="translate(580 330) rotate(95)">
        <circle
          r="9"
          fill="hsl(222 32% 7%)"
          stroke="hsl(200 50% 68%)"
          strokeWidth="1.4"
        />
        <polygon points="0,-13 4,-7 -4,-7" fill="hsl(200 50% 68%)" />
      </g>
      <text
        x="595"
        y="328"
        fontFamily="var(--font-mono)"
        fontSize="10"
        fontWeight="600"
        fill="hsl(200 50% 78%)"
      >
        ROOK‑1
      </text>
      <text
        x="595"
        y="342"
        fontFamily="var(--font-mono)"
        fontSize="9"
        fill="hsl(38 18% 65%)"
      >
        088° · 102kt
      </text>

      {/* — Friendly: ROOK-2 */}
      <g transform="translate(420 480) rotate(290)">
        <circle
          r="9"
          fill="hsl(222 32% 7%)"
          stroke="hsl(200 50% 68%)"
          strokeWidth="1.4"
        />
        <polygon points="0,-13 4,-7 -4,-7" fill="hsl(200 50% 68%)" />
      </g>
      <text
        x="436"
        y="478"
        fontFamily="var(--font-mono)"
        fontSize="10"
        fontWeight="600"
        fill="hsl(200 50% 78%)"
      >
        ROOK‑2
      </text>
      <text
        x="436"
        y="492"
        fontFamily="var(--font-mono)"
        fontSize="9"
        fill="hsl(38 18% 65%)"
      >
        215° · 88kt
      </text>

      {/* — Vehicle V-117 (ground/water-craft, square) */}
      <g transform="translate(280 540)">
        <rect
          x="-7"
          y="-7"
          width="14"
          height="14"
          fill="hsl(222 32% 7%)"
          stroke="hsl(35 88% 62%)"
          strokeWidth="1.3"
        />
        <line
          x1="-7"
          y1="-7"
          x2="7"
          y2="7"
          stroke="hsl(35 88% 62%)"
          strokeWidth="0.8"
          opacity="0.7"
        />
        <text
          x="14"
          y="-3"
          fontFamily="var(--font-mono)"
          fontSize="10"
          fontWeight="600"
          fill="hsl(35 88% 75%)"
        >
          V‑117
        </text>
        <text
          x="14"
          y="10"
          fontFamily="var(--font-mono)"
          fontSize="9"
          fill="hsl(38 18% 65%)"
        >
          deviation 12°
        </text>
      </g>

      {/* — Person of interest P-04 (small dot) */}
      <g transform="translate(150 250)">
        <circle
          r="4"
          fill="hsl(35 88% 62%)"
          stroke="hsl(222 32% 7%)"
          strokeWidth="1.2"
        />
        <text
          x="10"
          y="3"
          fontFamily="var(--font-mono)"
          fontSize="9"
          fill="hsl(38 18% 65%)"
        >
          P‑04
        </text>
      </g>

      {/* — Live blip near ROOK-1: a faint scanning shimmer */}
      <g transform="translate(580 330)">
        <circle
          r="38"
          fill="none"
          stroke="hsl(200 50% 68% / 0.18)"
          strokeWidth="0.7"
          className="blip"
        />
      </g>
    </svg>
  );
}

/* ------------------------------------------------------------------ */
/*  CHANGE FEED                                                       */
/* ------------------------------------------------------------------ */

const FEED: {
  t: string;
  tDelta: string;
  verb: string;
  body: React.ReactNode;
  source: string;
  tone: 'threat' | 'amber' | 'friendly' | 'muted';
  fresh?: boolean;
}[] = [
  {
    t: '14:23:01',
    tDelta: '46s ago',
    verb: 'Detected.',
    body: (
      <>
        ROOK‑1 sensor track on unidentified aircraft at{' '}
        <span className="font-mono text-[12px]">38.74°N&nbsp;23.55°E</span>.
        Classifier: low‑observable UAV · 0.87.
      </>
    ),
    source: 'ROOK‑1 · onboard EO/IR',
    tone: 'threat',
    fresh: true,
  },
  {
    t: '14:21:44',
    tDelta: '2m 03s ago',
    verb: 'Deviated.',
    body: (
      <>
        Vessel <span className="font-mono text-[12px]">V‑117</span> off filed
        course by 12°. Course held for 4m 12s before re‑acquisition.
      </>
    ),
    source: 'AIS · cross‑checked OFAC',
    tone: 'amber',
  },
  {
    t: '14:19:12',
    tDelta: '4m 35s ago',
    verb: 'Reported.',
    body: (
      <>
        Radio chatter near grid{' '}
        <span className="font-mono text-[12px]">4E</span>: “movement, two
        figures, possibly armed.” Origin: BRAVO‑3 dismount.
      </>
    ),
    source: 'Voice · BRAVO‑3',
    tone: 'amber',
  },
  {
    t: '14:18:30',
    tDelta: '5m 17s ago',
    verb: 'Returned.',
    body: (
      <>
        ROOK‑2 RTB nominal. Fuel{' '}
        <span className="font-mono text-[12px]">84%</span>, bay clear, ready for
        re‑task.
      </>
    ),
    source: 'ROOK‑2 · telemetry',
    tone: 'friendly',
  },
  {
    t: '14:14:02',
    tDelta: '9m 45s ago',
    verb: 'Recovered.',
    body: (
      <>
        AIS gap on V‑117 cleared (4m 12s outage). Sensor fusion held identity
        through gap.
      </>
    ),
    source: 'Edge · fusion',
    tone: 'muted',
  },
];

function ChangeFeed() {
  return (
    <div className="border-border/60 flex min-h-0 flex-1 flex-col border-b">
      <div className="border-border/60 flex shrink-0 items-baseline justify-between gap-4 border-b px-6 py-4">
        <div>
          <div className="label-cap text-muted-foreground">Last 5 minutes</div>
          <h2 className="text-foreground mt-0.5 font-serif text-[22px] italic leading-none tracking-tight">
            What changed.
          </h2>
        </div>
        <div className="flex items-center gap-2">
          <FilterChip label="All" active />
          <FilterChip label="Threat" />
          <FilterChip label="Friendly" />
        </div>
      </div>
      <ol className="min-h-0 flex-1 overflow-y-auto px-6 py-2">
        {FEED.map((e, i) => (
          <li
            key={`${e.t}-${i}`}
            className={[
              'border-border/60 group relative flex gap-5 border-b py-4 last:border-b-0',
              e.fresh ? 'feed-enter' : '',
            ].join(' ')}
          >
            {/* Timeline rail dot */}
            <div className="flex w-[80px] shrink-0 flex-col items-end pr-2 pt-0.5">
              <span className="text-foreground/85 font-mono text-[11px]">
                {e.t}
              </span>
              <span className="text-muted-foreground mt-0.5 font-mono text-[10px]">
                {e.tDelta}
              </span>
            </div>
            <div
              aria-hidden
              className="border-border/60 relative shrink-0 border-l pr-2"
              style={{ marginLeft: -18 }}
            >
              <span
                className={[
                  'absolute top-1.5 size-2 rounded-full ring-2',
                  e.tone === 'threat'
                    ? 'bg-threat ring-threat/15'
                    : e.tone === 'amber'
                      ? 'bg-warning ring-warning/15'
                      : e.tone === 'friendly'
                        ? 'bg-friendly ring-friendly/15'
                        : 'bg-muted-foreground/60 ring-muted-foreground/15',
                ].join(' ')}
                style={{ left: -5 }}
              />
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-foreground/95 text-[13.5px] leading-relaxed">
                <span
                  className={[
                    'mr-2 font-serif text-[15px] italic',
                    e.tone === 'threat'
                      ? 'text-threat'
                      : e.tone === 'amber'
                        ? 'text-warning'
                        : e.tone === 'friendly'
                          ? 'text-friendly'
                          : 'text-foreground',
                  ].join(' ')}
                >
                  {e.verb}
                </span>
                {e.body}
              </p>
              <div className="text-muted-foreground/90 mt-1.5 flex items-center gap-2 text-[11px]">
                <span className="label-cap">Source</span>
                <span className="font-mono">{e.source}</span>
              </div>
            </div>
          </li>
        ))}
      </ol>
    </div>
  );
}

function FilterChip({ label, active }: { label: string; active?: boolean }) {
  return (
    <button
      type="button"
      className={[
        'rounded-sm border px-2 py-1 text-[11px] transition-colors',
        active
          ? 'border-border bg-card text-foreground'
          : 'border-transparent text-muted-foreground hover:bg-card/50 hover:text-foreground',
      ].join(' ')}
    >
      {label}
    </button>
  );
}

/* ------------------------------------------------------------------ */
/*  RECOMMENDATIONS                                                   */
/* ------------------------------------------------------------------ */

const RECS = [
  {
    verb: 'Vector',
    rest: 'ROOK‑1 to intercept BOGEY‑7.',
    asset: 'ROOK‑1',
    eta: 'Intercept ETA 4m 02s · fuel margin +18%',
    confidence: 0.87,
    why: ['Track persists 46s', 'Heading converges', 'Match vs known sigs'],
  },
  {
    verb: 'Re‑task',
    rest: 'ROOK‑2 for visual confirmation of V‑117.',
    asset: 'ROOK‑2',
    eta: 'On‑station in 6m 18s',
    confidence: 0.64,
    why: ['Course deviation', 'OFAC partial match'],
  },
  {
    verb: 'Hand‑off',
    rest: 'P‑04 cue to ground unit BRAVO‑3.',
    asset: 'BRAVO‑3',
    eta: 'Bearing 311° · 1.2 NM',
    confidence: 0.52,
    why: ['Single radio report'],
  },
];

function Recommendations() {
  return (
    <div className="flex min-h-0 shrink-0 flex-col">
      <div className="border-border/60 flex items-baseline justify-between border-b px-6 py-3">
        <div className="flex items-baseline gap-3">
          <h2 className="text-foreground font-serif text-[18px] italic tracking-tight">
            Recommendations
          </h2>
          <span className="label-cap text-muted-foreground">
            Edge · grounded
          </span>
        </div>
        <span className="text-muted-foreground font-mono text-[10px]">
          3 candidates
        </span>
      </div>

      <ul className="p-3">
        {RECS.map((r, i) => (
          <li
            key={r.verb + i}
            className="surface-card hairline group hover:border-primary/60 mb-2 rounded-md border p-3.5 transition-colors last:mb-0"
          >
            <div className="flex items-start justify-between gap-4">
              <div className="min-w-0">
                <p className="text-foreground text-[14px] leading-snug">
                  <span className="text-foreground mr-1 font-serif text-[16px] italic">
                    {r.verb}
                  </span>
                  {r.rest}
                </p>
                <div className="text-muted-foreground mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px]">
                  <span className="font-mono">{r.eta}</span>
                  <span aria-hidden className="text-muted-foreground/40">
                    ·
                  </span>
                  <span>
                    Why:{' '}
                    {r.why.map((w, idx) => (
                      <span key={w} className="text-foreground/80">
                        {w}
                        {idx < r.why.length - 1 ? (
                          <span className="text-muted-foreground/40"> · </span>
                        ) : null}
                      </span>
                    ))}
                  </span>
                </div>
              </div>
              <div className="flex shrink-0 flex-col items-end gap-1">
                <ConfidenceMeter v={r.confidence} />
                <span className="text-muted-foreground font-mono text-[10px]">
                  {(r.confidence * 100).toFixed(0)}%
                </span>
              </div>
            </div>
            <div className="mt-3 flex items-center justify-between">
              <div className="flex items-center gap-1.5">
                <span className="bg-friendly size-1.5 rounded-full" />
                <span className="text-muted-foreground label-cap">
                  Asset · {r.asset}
                </span>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  className="text-muted-foreground hover:text-foreground hover:border-border rounded-sm border border-transparent px-2 py-1 text-[11px] transition-colors"
                >
                  Modify
                </button>
                <button
                  type="button"
                  className="bg-primary text-primary-foreground hover:bg-primary/90 inline-flex items-center gap-1 rounded-sm px-3 py-1 text-[12px] font-medium shadow-[inset_0_1px_0_0_hsl(0_0%_100%/0.2)] transition-colors"
                >
                  Approve
                  <ChevronRight className="size-3" />
                </button>
              </div>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}

function ConfidenceMeter({ v }: { v: number }) {
  // Eight-segment confidence bar. Filled segments scale with v; the
  // top half lights amber when over 0.75 (high), green-ish at >0.6,
  // muted otherwise.
  const filled = Math.round(v * 8);
  const tone =
    v >= 0.8
      ? 'bg-primary'
      : v >= 0.6
        ? 'bg-success'
        : 'bg-muted-foreground/60';
  return (
    <div className="flex items-center gap-[2px]">
      {Array.from({ length: 8 }).map((_, i) => (
        <span
          key={i}
          className={`block h-2.5 w-1 rounded-[1px] ${i < filled ? tone : 'bg-border/80'}`}
        />
      ))}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  VOICE AFFORDANCE                                                  */
/* ------------------------------------------------------------------ */

function VoiceAffordance() {
  return (
    <div className="pointer-events-none fixed bottom-7 right-7 z-50 flex flex-col items-end gap-2">
      <div className="bg-background/85 hairline rounded-full border px-3 py-1.5 backdrop-blur-md">
        <span className="text-muted-foreground font-mono text-[10px]">
          Hold&nbsp;
          <kbd className="hairline bg-card text-foreground rounded-sm border px-1.5 py-0.5 text-[10px]">
            space
          </kbd>
          &nbsp;to&nbsp;speak
        </span>
      </div>
      <button
        type="button"
        aria-label="Push to talk"
        className="mic-breath bg-primary text-primary-foreground pointer-events-auto grid size-14 place-items-center rounded-full transition-transform hover:scale-105 active:scale-95"
      >
        <Mic className="size-6" strokeWidth={2.2} />
      </button>
    </div>
  );
}
