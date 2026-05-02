import * as React from 'react';
import { type LucideIcon } from 'lucide-react';

export const Ico: LucideIcon = React.forwardRef<
  SVGSVGElement,
  React.SVGProps<SVGSVGElement>
>((props, ref) => (
  <svg
    ref={ref}
    xmlns="http://www.w3.org/2000/svg"
    width="1em"
    height="1em"
    viewBox="0 0 30 30"
    fill="currentColor"
    {...props}
  >
    <path
      d="M3 8 Q9 3 15 8 Q21 13 27 8"
      fill="none"
      stroke="#002b4d"
      strokeWidth="3"
    />
    <path
      d="M3 15 Q9 10 15 15 Q21 20 27 15"
      fill="none"
      stroke="#002b4d"
      strokeWidth="3"
    />
    <path
      d="M3 22 Q9 17 15 22 Q21 27 27 22"
      fill="none"
      stroke="#002b4d"
      strokeWidth="3"
    />

    <circle cx="9" cy="6" r="1.5" fill="#06b6d4" />
    <circle cx="15" cy="12" r="2" fill="#06b6d4" />
    <circle cx="21" cy="6" r="1.5" fill="#06b6d4" />
    <circle cx="9" cy="24" r="1.5" fill="#06b6d4" />
    <circle cx="21" cy="24" r="1.5" fill="#06b6d4" />

    <circle cx="15" cy="15" r="1" fill="#002b4d" />
  </svg>
));

Ico.displayName = 'Ico';
