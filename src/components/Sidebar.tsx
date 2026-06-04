'use client';

import { cn } from '@/lib/utils';
import {
  CheckSquare,
  Compass,
  LayoutGrid,
  Plus,
  Search,
  ShieldCheck,
  type LucideIcon,
} from 'lucide-react';
import Link from 'next/link';
import { useSelectedLayoutSegments } from 'next/navigation';
import React, { useEffect, useState } from 'react';
import Layout from './Layout';
import SettingsButton from './Settings/SettingsButton';

interface Space {
  id: string;
  name: string;
  description?: string;
}

interface NavLink {
  icon: LucideIcon;
  href: string;
  active: boolean;
  label: string;
}

const SidebarLink = ({ link }: { link: NavLink }) => {
  const Icon = link.icon;

  return (
    <Link
      href={link.href}
      className={cn(
        'group flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition duration-200',
        link.active
          ? 'bg-light-200 text-black dark:bg-dark-200 dark:text-white'
          : 'text-black/60 hover:bg-light-200 hover:text-black dark:text-white/60 dark:hover:bg-dark-200 dark:hover:text-white',
      )}
    >
      <Icon
        size={18}
        className={cn(
          'transition duration-200',
          !link.active && 'group-hover:scale-105',
        )}
      />
      <span>{link.label}</span>
    </Link>
  );
};

const SectionTitle = ({ children }: { children: React.ReactNode }) => {
  return (
    <p className="px-3 text-[11px] font-semibold uppercase tracking-[0.18em] text-black/35 dark:text-white/35">
      {children}
    </p>
  );
};

const Sidebar = ({ children }: { children: React.ReactNode }) => {
  const segments = useSelectedLayoutSegments();
  const [spaces, setSpaces] = useState<Space[]>([]);

  const activeSpaceId = segments[0] === 'spaces' ? segments[1] : undefined;

  useEffect(() => {
    const fetchSpaces = async () => {
      try {
        const res = await fetch('/api/spaces');

        if (!res.ok) return;

        const data = await res.json();
        setSpaces(Array.isArray(data) ? data : []);
      } catch (err) {
        console.error('Failed to fetch spaces for sidebar:', err);
      }
    };

    fetchSpaces();
  }, []);

  const primaryLinks: NavLink[] = [
    {
      icon: Search,
      href: '/search',
      active: segments.includes('search') || segments.includes('c'),
      label: 'Search',
    },
    {
      icon: Compass,
      href: '/discover',
      active: segments.includes('discover'),
      label: 'Discover',
    },
  ];

  const automationLinks: NavLink[] = [
    {
      icon: CheckSquare,
      href: '/tasks',
      active: segments.includes('tasks'),
      label: 'Automations',
    },
  ];

  const vaultLinks: NavLink[] = [
    {
      icon: ShieldCheck,
      href: '/vault',
      active: segments.includes('vault'),
      label: 'Privacy Vault',
    },
  ];

  const mobileLinks: NavLink[] = [
    ...primaryLinks,
    {
      icon: LayoutGrid,
      href: '/spaces',
      active: segments.includes('spaces'),
      label: 'Spaces',
    },
    ...automationLinks,
    ...vaultLinks,
  ];

  return (
    <div>
      <aside className="hidden lg:fixed lg:inset-y-0 lg:z-50 lg:flex lg:w-72 lg:flex-col border-r border-light-200 dark:border-dark-200">
        <div className="flex h-full grow flex-col bg-light-secondary px-4 py-6 shadow-sm shadow-light-200/10 dark:bg-dark-secondary dark:shadow-black/25">
          <Link
            href="/search"
            className="mb-6 flex items-center gap-3 rounded-2xl p-2 transition duration-200 hover:bg-light-200 dark:hover:bg-dark-200"
          >
            <img
              src="/Etherana_SX_logo.png"
              alt="Etherana SX"
              className="h-10 w-10 object-contain"
            />
            <div>
              <p className="text-sm font-bold leading-tight text-black dark:text-white">
                Etherana SX
              </p>
              <p className="text-xs text-black/45 dark:text-white/45">
                AI workspace
              </p>
            </div>
          </Link>

          <Link
            href="/search"
            className="mb-6 flex items-center justify-center gap-2 rounded-full bg-black px-4 py-2.5 text-sm font-semibold text-white transition duration-200 hover:scale-[1.01] active:scale-[0.99] dark:bg-white dark:text-black"
          >
            <Plus size={16} />
            New Search
          </Link>

          <nav className="flex flex-1 flex-col gap-7 overflow-y-auto">
            <div className="space-y-1">
              {primaryLinks.map((link) => (
                <SidebarLink key={link.href} link={link} />
              ))}
            </div>

            <div className="space-y-2">
              <SectionTitle>Workspaces</SectionTitle>

              <div className="space-y-1">
                <SidebarLink
                  link={{
                    icon: LayoutGrid,
                    href: '/spaces',
                    active: segments.includes('spaces') && !activeSpaceId,
                    label: 'All Spaces',
                  }}
                />

                {spaces.length > 0 ? (
                  <div className="space-y-1 pt-1">
                    {spaces.slice(0, 6).map((space) => {
                      const active = activeSpaceId === space.id;

                      return (
                        <Link
                          key={space.id}
                          href={`/spaces/${space.id}`}
                          className={cn(
                            'block truncate rounded-xl px-3 py-2 text-sm transition duration-200',
                            active
                              ? 'bg-light-200 font-medium text-black dark:bg-dark-200 dark:text-white'
                              : 'text-black/55 hover:bg-light-200 hover:text-black dark:text-white/55 dark:hover:bg-dark-200 dark:hover:text-white',
                          )}
                          title={space.name}
                        >
                          <span className="mr-2 text-black/30 dark:text-white/30">
                            •
                          </span>
                          {space.name}
                        </Link>
                      );
                    })}
                  </div>
                ) : (
                  <Link
                    href="/spaces"
                    className="block rounded-xl px-3 py-2 text-sm text-black/45 transition duration-200 hover:bg-light-200 hover:text-black dark:text-white/45 dark:hover:bg-dark-200 dark:hover:text-white"
                  >
                    Create your first Space
                  </Link>
                )}
              </div>
            </div>

            <div className="space-y-2">
              <SectionTitle>Automation</SectionTitle>

              <div className="space-y-1">
                {automationLinks.map((link) => (
                  <SidebarLink key={link.href} link={link} />
                ))}
              </div>
            </div>

            <div className="space-y-2">
              <SectionTitle>Privacy</SectionTitle>

              <div className="space-y-1">
                {vaultLinks.map((link) => (
                  <SidebarLink key={link.href} link={link} />
                ))}
              </div>
            </div>
          </nav>

          <div className="pt-6">
            <SettingsButton />
          </div>
        </div>
      </aside>

      <div className="fixed bottom-0 z-50 flex w-full flex-row items-center gap-x-2 bg-light-secondary px-3 py-3 shadow-sm dark:bg-dark-secondary lg:hidden">
        {mobileLinks.map((link) => {
          const Icon = link.icon;

          return (
            <Link
              href={link.href}
              key={link.href}
              className={cn(
                'relative flex w-full flex-col items-center space-y-1 rounded-xl py-1.5 text-center text-xs transition duration-200',
                link.active
                  ? 'text-black dark:text-white'
                  : 'text-black/60 dark:text-white/60',
              )}
            >
              {link.active && (
                <div className="absolute top-0 -mt-3 h-1 w-8 rounded-b-lg bg-black dark:bg-white" />
              )}

              <Icon size={20} />
              <p>{link.label}</p>
            </Link>
          );
        })}
      </div>

      <Layout>{children}</Layout>
    </div>
  );
};

export default Sidebar;
