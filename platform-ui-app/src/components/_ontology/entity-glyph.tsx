// MIL-STD-2525-style entity glyphs (simplified).
//
//   friendly = blue rectangle (slightly elongated horizontally)
//   hostile  = red diamond (rotated square)
//   unknown  = yellow quatrefoil (4-leaf clover, square rotated 45° with
//             rounded top — approximated here as a soft diamond)
//   neutral  = green circle
//
// All glyphs render at a nominal 14px viewBox. Caller scales via SVG
// viewport. Heading-aware leader line is drawn separately so the glyph
// can be reused for stationary entities.

import { affiliationToken } from './affiliation';

import type { Affiliation } from '@/types/ontology';

interface EntityGlyphProps {
  affiliation: Affiliation;
  /** Coarse subtype to pick rectangle vs diamond vs circle, etc. */
  shape?: 'air' | 'ground' | 'sea' | 'person';
  size?: number;
  /** SVG x/y of glyph center. */
  cx: number;
  cy: number;
  /** If provided, draws a short leader line in the heading direction. */
  heading_deg?: number;
  /** Optional speed-leader length (px). Default 18. */
  leaderLength?: number;
}

export function EntityGlyph({
  affiliation,
  shape = 'air',
  size = 14,
  cx,
  cy,
  heading_deg,
  leaderLength = 18,
}: EntityGlyphProps) {
  const tone = affiliationToken(affiliation);
  const r = size / 2;

  // Pick shape primitive by affiliation × physical kind.
  // MIL-STD-2525 says affiliation drives shape (friendly=rect, hostile=diamond,
  // unknown=quatrefoil, neutral=circle), with an inner symbol for kind.
  // We follow the affiliation-shape rule and skip the inner symbol for
  // hackathon clarity.

  let primitive: React.ReactNode = null;

  switch (affiliation) {
    case 'friendly': {
      // Rectangle — slightly elongated horizontally
      const w = size * 1.15;
      const h = size * 0.85;
      primitive = (
        <rect
          x={cx - w / 2}
          y={cy - h / 2}
          width={w}
          height={h}
          fill="hsl(var(--background))"
          stroke={tone.hsl}
          strokeWidth={1.6}
        />
      );
      break;
    }
    case 'hostile': {
      // Diamond — rotated square
      primitive = (
        <polygon
          points={`${cx},${cy - r} ${cx + r},${cy} ${cx},${cy + r} ${cx - r},${cy}`}
          fill="hsl(var(--background))"
          stroke={tone.hsl}
          strokeWidth={1.6}
        />
      );
      break;
    }
    case 'unknown': {
      // Quatrefoil — approximate with a square rotated 45° plus
      // rounded "lobes." We render as a soft diamond with extra
      // rounded corners for legibility at small sizes.
      const lobe = r * 0.55;
      primitive = (
        <g>
          <path
            d={`
              M ${cx} ${cy - r}
              C ${cx + lobe} ${cy - r}, ${cx + r} ${cy - lobe}, ${cx + r} ${cy}
              C ${cx + r} ${cy + lobe}, ${cx + lobe} ${cy + r}, ${cx} ${cy + r}
              C ${cx - lobe} ${cy + r}, ${cx - r} ${cy + lobe}, ${cx - r} ${cy}
              C ${cx - r} ${cy - lobe}, ${cx - lobe} ${cy - r}, ${cx} ${cy - r}
              Z
            `}
            fill="hsl(var(--background))"
            stroke={tone.hsl}
            strokeWidth={1.6}
          />
        </g>
      );
      break;
    }
    case 'neutral': {
      primitive = (
        <circle
          cx={cx}
          cy={cy}
          r={r}
          fill="hsl(var(--background))"
          stroke={tone.hsl}
          strokeWidth={1.6}
        />
      );
      break;
    }
  }

  // Heading leader line (speed-leader) — short tick from glyph edge
  // in the heading direction.
  let leader: React.ReactNode = null;
  if (heading_deg !== undefined) {
    const rad = ((heading_deg - 90) * Math.PI) / 180;
    const x2 = cx + Math.cos(rad) * leaderLength;
    const y2 = cy + Math.sin(rad) * leaderLength;
    leader = (
      <line
        x1={cx}
        y1={cy}
        x2={x2}
        y2={y2}
        stroke={tone.hsl}
        strokeWidth={1.2}
        opacity={0.85}
      />
    );
  }

  // Tiny inner kind dot — hints at physical kind without using the
  // full MIL-STD inner symbol vocabulary.
  let inner: React.ReactNode = null;
  const innerR = 1.4;
  if (shape === 'air') {
    inner = <circle cx={cx} cy={cy} r={innerR} fill={tone.hsl} opacity={0.9} />;
  } else if (shape === 'ground') {
    inner = (
      <rect
        x={cx - innerR}
        y={cy - innerR}
        width={innerR * 2}
        height={innerR * 2}
        fill={tone.hsl}
        opacity={0.9}
      />
    );
  } else if (shape === 'sea') {
    inner = (
      <line
        x1={cx - r * 0.5}
        y1={cy}
        x2={cx + r * 0.5}
        y2={cy}
        stroke={tone.hsl}
        strokeWidth={1.4}
        opacity={0.9}
      />
    );
  } else if (shape === 'person') {
    inner = <circle cx={cx} cy={cy} r={1.6} fill={tone.hsl} opacity={0.9} />;
  }

  return (
    <g>
      {leader}
      {primitive}
      {inner}
    </g>
  );
}
