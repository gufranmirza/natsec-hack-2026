'use client';

// Sidebar — renders top-level nav items inside a single unlabeled
// SidebarGroup. Each item delegates to NavItem, which handles flat
// and collapsible cases uniformly.

import * as React from 'react';

import { NavItem, type NavItemData } from '@/components/_layout/nav-item';
import { SidebarGroup, SidebarMenu } from '@/components/ui/sidebar';

interface NavMainProps {
  items: NavItemData[];
}

export function NavMain({ items }: NavMainProps) {
  return (
    <SidebarGroup className="py-1">
      <SidebarMenu>
        {items.map((item) => (
          <NavItem key={item.title} item={item} />
        ))}
      </SidebarMenu>
    </SidebarGroup>
  );
}
