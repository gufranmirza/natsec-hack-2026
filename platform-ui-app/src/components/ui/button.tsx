import * as React from 'react';
import { Slot } from '@radix-ui/react-slot';
import { cva, type VariantProps } from 'class-variance-authority';

import { cn } from '@/components/lib/utils';

// Customized — Linear-style button system.
//
// Design north stars (vs. shadcn defaults):
//   • Density: default is h-8 (32px), sm is h-7 (28px), lg is h-10
//     (40px). The shadcn h-10 default reads as a touch-screen target;
//     Linear's chrome buttons are notably shorter and denser.
//   • Type: 13px medium for default, 12px for sm. No uppercase, no
//     tracking — clean keyboard-feel labels.
//   • Solids: a 1px inset white highlight at the top + a soft 1px
//     drop shadow gives the "raised key" tactile feel without being
//     skeuomorphic. Hover darkens by /5; active by /10.
//   • Outlines: hairline border at /70 opacity (not the heavy
//     `border-input`), a barely-there 1px ground shadow, and a pale
//     muted hover wash that DOES NOT recolor the text. Hover should
//     feel like the surface is responding, not the label changing.
//   • Ghost: same hover wash, no border, no shadow. Used for tertiary
//     actions that should sit quietly until hovered.
//   • Radius: rounded-md (6px) — tight, modern, not pill.
//
// Why retune the primitive vs. one-off styling on call-sites:
// dropdowns, popovers, dialogs, table actions all reuse Button. Tuning
// at the primitive means the whole app drifts toward the Linear feel
// in one move. Consumers can still override per-instance.
const buttonVariants = cva(
  'inline-flex items-center justify-center gap-1.5 whitespace-nowrap rounded-md text-[13px] font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0',
  {
    variants: {
      variant: {
        default:
          'bg-primary text-primary-foreground shadow-[inset_0_1px_0_0_hsl(0_0%_100%/0.12),0_1px_2px_-1px_hsl(0_0%_0%/0.1)] hover:bg-primary/95 active:bg-primary/90',
        destructive:
          'bg-destructive text-destructive-foreground shadow-[inset_0_1px_0_0_hsl(0_0%_100%/0.10),0_1px_2px_-1px_hsl(0_0%_0%/0.12)] hover:bg-destructive/95 active:bg-destructive/90',
        outline:
          'border border-border/70 bg-card text-foreground shadow-[0_1px_2px_-1px_hsl(0_0%_0%/0.04)] hover:bg-muted/60 hover:text-foreground active:bg-muted',
        secondary:
          'bg-secondary text-secondary-foreground hover:bg-secondary/70 active:bg-secondary/60',
        ghost:
          'text-foreground hover:bg-muted/60 hover:text-foreground active:bg-muted',
        link: 'h-auto p-0 text-primary underline-offset-4 hover:underline',
      },
      size: {
        default: 'h-8 px-3',
        sm: 'h-7 px-2.5 text-[12px]',
        lg: 'h-10 px-4 text-sm',
        icon: 'h-8 w-8',
      },
    },
    defaultVariants: {
      variant: 'default',
      size: 'default',
    },
  }
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean;
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : 'button';
    return (
      <Comp
        className={cn(buttonVariants({ variant, size, className }))}
        ref={ref}
        {...props}
      />
    );
  }
);
Button.displayName = 'Button';

export { Button, buttonVariants };
