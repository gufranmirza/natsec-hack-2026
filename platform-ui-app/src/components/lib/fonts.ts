import { Fraunces, Hanken_Grotesk, JetBrains_Mono } from 'next/font/google';

// Editorial tactical pairing.
//   Fraunces (display serif, variable, with WONK + SOFT axes) —
//     headlines, narrative verbs, hero numerals.
//   Hanken Grotesk (humanist grotesk, variable) — UI chrome, body.
//   JetBrains Mono — coordinates, timestamps, tactical data.
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

const fontMono = JetBrains_Mono({
  subsets: ['latin'],
  weight: ['400', '500', '600'],
  variable: '--font-mono',
  display: 'swap',
});

export const fonts = [fontSans.variable, fontSerif.variable, fontMono.variable];
