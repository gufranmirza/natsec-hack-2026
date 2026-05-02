import '@/styles/globals.css';

import { PropsWithChildren } from 'react';
import { Toaster } from 'sonner';

import { Metadata } from '@/app/manifest';
import { ThemeProvider } from '@/components/_layout/theme-provider';
import { fonts } from '@/components/lib/fonts';
import { cn } from '@/components/lib/utils';
import Providers from '@/components/providers/query-provider';
import { TooltipProvider } from '@/components/ui/tooltip';

export const metadata = Metadata;
export const dynamic = 'force-dynamic';

export default function RootLayout({ children }: PropsWithChildren) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={cn('h-screen overflow-hidden font-sans', fonts)}>
        <ThemeProvider attribute="class">
          <Providers>
            <TooltipProvider delayDuration={200}>
              <Toaster />
              {children}
            </TooltipProvider>
          </Providers>
        </ThemeProvider>
      </body>
    </html>
  );
}
