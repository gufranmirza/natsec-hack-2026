'use client';

// Single nav item (flat or collapsible with sub-nav).
// Active-state treatment: indigo icon + default background tint (shadcn sidebar accent).
// Auto-opens when the current route is inside this section; user toggles thereafter.

import * as React from 'react';
import { ChevronRight, type LucideIcon } from 'lucide-react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';

import { cn } from '@/components/lib/utils';
import {
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarMenuSub,
  SidebarMenuSubButton,
  SidebarMenuSubItem,
} from '@/components/ui/sidebar';

export interface NavItemData {
  title: string;
  url: string;
  icon: LucideIcon;
  isActive?: boolean;
  items?: NavSubItemData[];
}

export interface NavSubItemData {
  title: string;
  url: string;
  icon?: LucideIcon;
  isActive?: boolean;
}

export function NavItem({ item }: { item: NavItemData }) {
  const router = useRouter();
  const pathname = usePathname();
  const hasChildren = !!item.items?.length;
  const autoOpen = hasChildren && !!item.isActive;

  // userOpen is null when the user has not explicitly toggled since entering
  // this section. When null, the section follows autoOpen. On manual toggle,
  // userOpen overrides until the route leaves this section.
  const [userOpen, setUserOpen] = React.useState<boolean | null>(null);
  const isOpen = userOpen ?? autoOpen;

  React.useEffect(() => {
    if (!autoOpen) setUserOpen(null);
  }, [autoOpen, pathname]);

  // Parent items with children: toggle the submenu and navigate to the
  // first sub-item. If the parent URL has no page of its own, routing to
  // item.url would 404; the first sub-item is always a real route.
  const handleParentClick = (e: React.MouseEvent) => {
    if (!hasChildren) return;
    e.preventDefault();
    setUserOpen(() => !isOpen);
    const first = item.items?.[0]?.url;
    if (first && !item.isActive) router.push(first);
  };

  return (
    <SidebarMenuItem>
      <SidebarMenuButton
        asChild
        isActive={item.isActive}
        tooltip={item.title}
        className="h-8 font-normal [&>a>svg]:!size-3.5"
      >
        <Link
          href={item.url}
          onClick={hasChildren ? handleParentClick : undefined}
        >
          <item.icon
            className={cn(
              'transition-colors',
              item.isActive ? 'text-primary' : 'text-muted-foreground'
            )}
          />
          <span className="text-sm">{item.title}</span>
          {hasChildren && (
            <ChevronRight
              className={cn(
                'text-muted-foreground/70 ml-auto transition-transform duration-150 ease-out',
                isOpen && 'rotate-90'
              )}
            />
          )}
        </Link>
      </SidebarMenuButton>

      {hasChildren && isOpen && (
        <SidebarMenuSub className="border-sidebar-border/60 mr-0 pr-0">
          {item.items!.map((sub) => (
            <SidebarMenuSubItem key={sub.title}>
              <SidebarMenuSubButton
                asChild
                isActive={sub.isActive}
                className={cn(
                  'h-7 font-normal [&>a>svg]:!size-3.5',
                  sub.isActive && 'text-foreground'
                )}
              >
                <Link href={sub.url}>
                  {sub.icon ? (
                    <sub.icon
                      className={cn(
                        'transition-colors',
                        sub.isActive
                          ? 'text-primary'
                          : 'text-muted-foreground/80'
                      )}
                    />
                  ) : (
                    <span
                      aria-hidden
                      className={cn(
                        'size-1 rounded-full',
                        sub.isActive ? 'bg-primary' : 'bg-muted-foreground/40'
                      )}
                    />
                  )}
                  <span className="text-sm">{sub.title}</span>
                </Link>
              </SidebarMenuSubButton>
            </SidebarMenuSubItem>
          ))}
        </SidebarMenuSub>
      )}
    </SidebarMenuItem>
  );
}
