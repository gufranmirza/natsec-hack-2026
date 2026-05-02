import * as React from 'react';
import { cva, type VariantProps } from 'class-variance-authority';

import { cn } from '@/components/lib/utils';

// Customized: outline-first, smaller, medium weight (not bold).
// Filled variants reserved for status (destructive / success / warning).
// Tone-on-tone tints rather than candy-shop colors.
const badgeVariants = cva(
  'inline-flex items-center gap-1 rounded-md border px-2 py-0.5 text-[11px] font-medium tracking-wide transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2',
  {
    variants: {
      variant: {
        default: 'border-border bg-secondary text-secondary-foreground',
        outline: 'border-border bg-transparent text-foreground/80',
        secondary: 'border-border bg-secondary text-secondary-foreground',
        muted: 'border-transparent bg-muted text-muted-foreground',
        accent: 'border-accent bg-accent text-accent-foreground',
        destructive:
          'border-destructive/40 bg-destructive/10 text-destructive dark:text-destructive-foreground',
        success:
          'border-emerald-500/30 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300',
        warning:
          'border-amber-500/30 bg-amber-500/10 text-amber-700 dark:text-amber-300',
      },
    },
    defaultVariants: {
      variant: 'default',
    },
  }
);

export interface BadgeProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof badgeVariants> {}

function Badge({ className, variant, ...props }: BadgeProps) {
  return (
    <div className={cn(badgeVariants({ variant }), className)} {...props} />
  );
}

export { Badge, badgeVariants };
