import { Inter, JetBrains_Mono } from 'next/font/google';

// Inter (sans) + JetBrains Mono (mono) — the working baseline.
// We tried Geist; it didn't render the way the team wanted. Inter
// has wider weight coverage and more predictable rendering across
// browsers, which matters more for a SOC tool than typographic
// novelty.
const fontSans = Inter({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700'],
  variable: '--font-sans',
  display: 'swap',
  preload: true,
  fallback: ['system-ui', 'sans-serif'],
});

const fontMono = JetBrains_Mono({
  subsets: ['latin'],
  weight: ['400', '500', '600'],
  variable: '--font-mono',
  display: 'swap',
  preload: true,
  fallback: ['ui-monospace', 'monospace'],
});

export const fonts = [fontSans.variable, fontMono.variable];
