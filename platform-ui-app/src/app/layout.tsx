import '@/styles/globals.css';

import { PropsWithChildren } from 'react';
import { Toaster } from 'sonner';

import { Metadata } from '@/app/manifest';
import { AppSidebar } from '@/components/_layout/app-sidebar';
import { ThemeProvider } from '@/components/_layout/theme-provider';
import { ThemeSwitcher } from '@/components/_layout/theme-switcher';
import { fonts } from '@/components/lib/fonts';
import { cn } from '@/components/lib/utils';
import Providers from '@/components/providers/query-provider';
import { SidebarInset, SidebarProvider } from '@/components/ui/sidebar';
import { TooltipProvider } from '@/components/ui/tooltip';

export const metadata = Metadata;
export const dynamic = 'force-dynamic';

export default function RootLayout({ children }: PropsWithChildren) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={cn('min-h-screen font-sans', fonts)}>
        <ThemeProvider attribute="class">
          <Providers>
            <TooltipProvider delayDuration={200}>
              <Toaster />
              <SidebarProvider>
                <AppSidebar />
                <SidebarInset>
                  <div className="flex h-full flex-col">{children}</div>
                </SidebarInset>
              </SidebarProvider>
              <div className="fixed bottom-6 right-6 z-[100] flex gap-2">
                <ThemeSwitcher />
              </div>
            </TooltipProvider>
          </Providers>
        </ThemeProvider>
      </body>
    </html>
  );
}
