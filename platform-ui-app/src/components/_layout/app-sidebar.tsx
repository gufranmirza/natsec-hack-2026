'use client';

import * as React from 'react';
import { Radar } from 'lucide-react';
import { usePathname } from 'next/navigation';

import type { NavItemData } from '@/components/_layout/nav-item';
import { NavMain } from '@/components/_layout/nav-main';
import { NavUser } from '@/components/_layout/nav-user';
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
} from '@/components/ui/sidebar';

const navItems: NavItemData[] = [
  {
    title: 'Home',
    url: '/home',
    icon: Radar,
  },
];

export function AppSidebar({ ...props }: React.ComponentProps<typeof Sidebar>) {
  const pathname = usePathname();

  const user = {
    name: 'Commander',
    email: '',
    avatar: '',
  };

  const isActivePath = (url: string) => {
    if (url === '/') return pathname === '/';
    return pathname === url || pathname.startsWith(url + '/');
  };

  const items: NavItemData[] = navItems.map((item) => ({
    ...item,
    isActive: isActivePath(item.url),
  }));

  return (
    <Sidebar
      collapsible="icon"
      className="text-foreground bg-background border-border/60 border-r"
      {...props}
    >
      <SidebarHeader />
      <SidebarContent className="gap-0">
        <NavMain items={items} />
      </SidebarContent>
      <SidebarFooter>
        <NavUser user={user} />
      </SidebarFooter>
    </Sidebar>
  );
}
