import * as React from 'react';

import { cn } from '@/components/lib/utils';

// Customized — paired with the Linear-style Button system.
// h-8 (32px) so it lines up with default-size buttons in toolbars,
// hairline border at /70 opacity to match the outline-button border,
// and a soft 1px ground shadow for the same "carved into surface"
// feel. text-[13px] so labels and field text share a single chrome
// type size. Consumers can still override h- per call-site.
const Input = React.forwardRef<HTMLInputElement, React.ComponentProps<'input'>>(
  ({ className, type, ...props }, ref) => {
    return (
      <input
        type={type}
        className={cn(
          'flex h-8 w-full rounded-md border border-border/70 bg-card px-3 text-[13px] text-foreground shadow-[0_1px_2px_-1px_hsl(0_0%_0%/0.04)] ring-offset-background transition-colors file:border-0 file:bg-transparent file:text-[13px] file:font-medium file:text-foreground placeholder:text-muted-foreground/70 focus-visible:border-[hsl(var(--brand-from)/0.6)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[hsl(var(--brand-from)/0.18)] focus-visible:ring-offset-0 disabled:cursor-not-allowed disabled:opacity-50',
          className
        )}
        ref={ref}
        {...props}
      />
    );
  }
);
Input.displayName = 'Input';

export { Input };
