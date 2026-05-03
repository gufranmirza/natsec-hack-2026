// Affiliation → token color mapping. MIL-STD-2525 vocabulary.
//   friendly = blue rectangle  (cool steel)
//   hostile  = red diamond     (warm red)
//   unknown  = yellow quatrefoil (warning amber)
//   neutral  = green circle     (success sage)

import type { Affiliation, AnyObject } from '@/types/ontology';

export function affiliationToken(a: Affiliation): {
  fg: string; // Tailwind text-* class
  bg: string; // Tailwind bg-* class
  border: string; // Tailwind border-* class
  hsl: string; // raw HSL var ref for inline SVG
} {
  switch (a) {
    case 'friendly':
      return {
        fg: 'text-friendly',
        bg: 'bg-friendly',
        border: 'border-friendly',
        hsl: 'hsl(var(--friendly))',
      };
    case 'hostile':
      return {
        fg: 'text-threat',
        bg: 'bg-threat',
        border: 'border-threat',
        hsl: 'hsl(var(--threat))',
      };
    case 'unknown':
      return {
        fg: 'text-warning',
        bg: 'bg-warning',
        border: 'border-warning',
        hsl: 'hsl(var(--warning))',
      };
    case 'neutral':
      return {
        fg: 'text-success',
        bg: 'bg-success',
        border: 'border-success',
        hsl: 'hsl(var(--success))',
      };
  }
}

// Resolve an affiliation from any Object — used to color Object chips.
export function objectAffiliation(o: AnyObject): Affiliation {
  switch (o._type) {
    case 'Unit':
      return 'friendly';
    case 'Entity':
      return o.affiliation;
    default:
      return 'neutral';
  }
}

// Object _type → leading color stripe on chips. Distinct from
// affiliation so e.g. a Mission chip is amber regardless of which
// Unit/Entity it references.
export function typeStripeColor(type: AnyObject['_type']): string {
  switch (type) {
    case 'Entity':
      return 'hsl(var(--threat))';
    case 'Unit':
      return 'hsl(var(--friendly))';
    case 'Event':
      return 'hsl(var(--warning))';
    case 'Report':
      return 'hsl(var(--muted-foreground))';
    case 'Recommendation':
    case 'Plan':
    case 'Mission':
    case 'TaskingOrder':
    case 'MissionObjective':
      return 'hsl(var(--primary))';
  }
}
