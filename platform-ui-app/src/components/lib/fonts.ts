import { Fraunces, Hanken_Grotesk, Space_Mono } from 'next/font/google';

// Editorial tactical pairing — distinctive choices over safe defaults.
//   Fraunces (display serif, variable, with WONK + SOFT axes) — used
//     sparingly: splash + Event verbs in the change feed only.
//   Hanken Grotesk (humanist grotesk, variable) — UI chrome, body.
//   Space Mono — coordinates, timestamps, telemetry. Distinctive
//     typewriter character with long descenders; replaces the
//     overused JetBrains Mono. Reads as "vintage tactical console."
const fontSerif = Fraunces({
  subsets: ['latin'],
  variable: '--font-serif',
  display: 'swap',
  axes: ['SOFT', 'WONK', 'opsz'],
});

const fontSans = Hanken_Grotesk({
  subsets: ['latin'],
  variable: '--font-sans',
  display: 'swap',
});

const fontMono = Space_Mono({
  subsets: ['latin'],
  weight: ['400', '700'],
  variable: '--font-mono',
  display: 'swap',
});

export const fonts = [fontSans.variable, fontSerif.variable, fontMono.variable];
