'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { 
  LayoutDashboard, 
  Users, 
  Search, 
  Sparkles, 
  Globe, 
  LogOut, 
  Bot, 
  ShieldCheck,
  Menu,
  X
} from 'lucide-react';
import { cn } from '@/lib/utils';

export function Sidebar({ user }: { user?: { name: string; email: string; role: string } | null }) {
  const pathname = usePathname();
  const router = useRouter();
  const [isMobileDrawerOpen, setIsMobileDrawerOpen] = useState(false);

  const navItems = [
    {
      label: 'Dashboard',
      href: '/crm',
      icon: LayoutDashboard,
      active: pathname === '/crm',
    },
    {
      label: 'Leads & Pipeline',
      href: '/crm/leads',
      icon: Users,
      active: pathname.startsWith('/crm/leads'),
    },
    {
      label: 'Lead Gen Territoriale',
      href: '/crm/lead-gen',
      icon: Search,
      active: pathname === '/crm/lead-gen',
    },
    {
      label: 'Enrichment AI',
      href: '/crm/enrichment',
      icon: Sparkles,
      active: pathname === '/crm/enrichment',
    },
  ];

  const handleLogout = async () => {
    await fetch('/api/auth/logout', { method: 'POST' });
    router.push('/login');
    router.refresh();
  };

  const closeDrawer = () => {
    setIsMobileDrawerOpen(false);
  };

  return (
    <>
      {/* 1. TOP MOBILE HEADER BAR (md:hidden) */}
      <header className="md:hidden sticky top-0 z-30 flex items-center justify-between px-4 py-3 bg-slate-950/95 border-b border-slate-800 backdrop-blur-md">
        <Link href="/crm" className="flex items-center gap-2.5">
          <div className="h-8 w-8 rounded-lg bg-gradient-to-tr from-blue-600 to-indigo-600 flex items-center justify-center shadow-md shadow-blue-500/20">
            <Bot className="h-4 w-4 text-white" />
          </div>
          <div>
            <h1 className="text-sm font-bold tracking-tight text-white leading-tight">AI Agency CRM</h1>
            <span className="text-[9px] text-blue-400 font-medium tracking-wider uppercase block">v1.0 Suite</span>
          </div>
        </Link>

        <div className="flex items-center gap-2">
          <div className="h-7 w-7 rounded-full bg-slate-800 border border-slate-700 flex items-center justify-center font-bold text-[10px] text-blue-400">
            {user?.name ? user.name.slice(0, 2).toUpperCase() : 'AG'}
          </div>
          <button
            type="button"
            onClick={() => setIsMobileDrawerOpen(!isMobileDrawerOpen)}
            className="p-1.5 rounded-lg bg-slate-900 border border-slate-800 text-slate-300 hover:text-white"
            aria-label="Apri menu"
          >
            {isMobileDrawerOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
        </div>
      </header>

      {/* 2. MOBILE DRAWER SLIDE-OVER (md:hidden) */}
      {isMobileDrawerOpen && (
        <div className="md:hidden fixed inset-0 z-50 flex">
          {/* Backdrop */}
          <div 
            className="fixed inset-0 bg-black/70 backdrop-blur-sm transition-opacity animate-in fade-in"
            onClick={closeDrawer}
          />

          {/* Drawer Panel */}
          <div className="relative w-72 max-w-[85vw] bg-slate-950 border-r border-slate-800 flex flex-col justify-between h-full shadow-2xl z-10 animate-in slide-in-from-left duration-200">
            <div>
              {/* Drawer Brand Header */}
              <div className="p-4 border-b border-slate-800/80 flex items-center justify-between">
                <Link href="/crm" onClick={closeDrawer} className="flex items-center gap-2.5">
                  <div className="h-8 w-8 rounded-lg bg-gradient-to-tr from-blue-600 to-indigo-600 flex items-center justify-center shadow-md shadow-blue-500/20">
                    <Bot className="h-4 w-4 text-white" />
                  </div>
                  <div>
                    <h1 className="text-sm font-bold tracking-tight text-white leading-tight">AI Agency CRM</h1>
                    <span className="text-[9px] text-blue-400 font-medium tracking-wider uppercase">Menu Admin</span>
                  </div>
                </Link>
                <button
                  type="button"
                  onClick={closeDrawer}
                  className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-900"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              {/* Navigation Links */}
              <nav className="p-3 space-y-1">
                <div className="px-3 py-1.5 text-[10px] font-semibold uppercase tracking-wider text-slate-400">
                  Principale
                </div>
                {navItems.map((item) => {
                  const Icon = item.icon;
                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      onClick={closeDrawer}
                      className={cn(
                        'flex items-center gap-3 px-3 py-2.5 rounded-lg text-xs font-medium transition-colors',
                        item.active
                          ? 'bg-blue-600/15 text-blue-400 border border-blue-500/30'
                          : 'text-slate-400 hover:text-slate-100 hover:bg-slate-900/80'
                      )}
                    >
                      <Icon className={cn('h-4 w-4', item.active ? 'text-blue-400' : 'text-slate-400')} />
                      <span>{item.label}</span>
                    </Link>
                  );
                })}

                <div className="pt-4 px-3 py-1.5 text-[10px] font-semibold uppercase tracking-wider text-slate-400">
                  Collegamenti
                </div>
                <Link
                  href="/"
                  target="_blank"
                  onClick={closeDrawer}
                  className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-xs font-medium text-slate-400 hover:text-slate-100 hover:bg-slate-900/80 transition-colors"
                >
                  <Globe className="h-4 w-4 text-slate-400" />
                  <span>Sito Pubblico & Demo</span>
                </Link>
              </nav>
            </div>

            {/* Mobile Drawer Footer with User & Logout */}
            <div className="p-4 border-t border-slate-800/80 bg-slate-900/50">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <div className="h-8 w-8 rounded-full bg-slate-800 border border-slate-700 flex items-center justify-center font-bold text-xs text-blue-400">
                    {user?.name ? user.name.slice(0, 2).toUpperCase() : 'AG'}
                  </div>
                  <div className="overflow-hidden">
                    <p className="text-xs font-semibold text-slate-200 truncate">{user?.name || 'Operatore'}</p>
                    <div className="flex items-center gap-1 text-[10px] text-slate-400">
                      <ShieldCheck className="h-3 w-3 text-emerald-400" />
                      <span className="capitalize">{user?.role || 'admin'}</span>
                    </div>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={handleLogout}
                  title="Esci"
                  className="p-2 text-slate-400 hover:text-rose-400 hover:bg-rose-950/30 rounded-lg transition-colors"
                >
                  <LogOut className="h-4 w-4" />
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 3. MOBILE BOTTOM NAVIGATION BAR (md:hidden) */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-slate-950/95 border-t border-slate-800 backdrop-blur-md px-2 py-1.5 flex items-center justify-around shadow-lg">
        {navItems.map((item) => {
          const Icon = item.icon;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                'flex flex-col items-center gap-0.5 py-1 px-2 rounded-lg text-[10px] font-medium transition-colors',
                item.active
                  ? 'text-blue-400 font-semibold'
                  : 'text-slate-400 hover:text-slate-200'
              )}
            >
              <Icon className={cn('h-4 w-4', item.active ? 'text-blue-400' : 'text-slate-400')} />
              <span className="truncate max-w-[60px] text-center">{item.label.split(' ')[0]}</span>
            </Link>
          );
        })}

        <button
          type="button"
          onClick={() => setIsMobileDrawerOpen(true)}
          className="flex flex-col items-center gap-0.5 py-1 px-2 rounded-lg text-[10px] font-medium text-slate-400 hover:text-slate-200"
        >
          <Menu className="h-4 w-4 text-slate-400" />
          <span>Altro</span>
        </button>
      </nav>

      {/* 4. DESKTOP PERMANENT SIDEBAR (hidden md:flex) */}
      <aside className="hidden md:flex w-64 border-r border-slate-800 bg-slate-950/90 flex-col justify-between h-screen sticky top-0 backdrop-blur-md shrink-0">
        <div>
          {/* Brand */}
          <div className="p-6 border-b border-slate-800/80 flex items-center justify-between">
            <Link href="/crm" className="flex items-center gap-3">
              <div className="h-9 w-9 rounded-xl bg-gradient-to-tr from-blue-600 to-indigo-600 flex items-center justify-center shadow-md shadow-blue-500/20">
                <Bot className="h-5 w-5 text-white" />
              </div>
              <div>
                <h1 className="text-base font-bold tracking-tight text-white">AI Agency CRM</h1>
                <span className="text-[10px] text-blue-400 font-medium tracking-wider uppercase">v1.0 Suite</span>
              </div>
            </Link>
          </div>

          {/* Navigation */}
          <nav className="p-4 space-y-1.5">
            <div className="px-3 py-2 text-[11px] font-semibold uppercase tracking-wider text-slate-400">
              Principale
            </div>
            {navItems.map((item) => {
              const Icon = item.icon;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={cn(
                    'flex items-center gap-3 px-3.5 py-2.5 rounded-lg text-sm font-medium transition-colors',
                    item.active
                      ? 'bg-blue-600/15 text-blue-400 border border-blue-500/30'
                      : 'text-slate-400 hover:text-slate-100 hover:bg-slate-900/80'
                  )}
                >
                  <Icon className={cn('h-4 w-4', item.active ? 'text-blue-400' : 'text-slate-400')} />
                  <span>{item.label}</span>
                </Link>
              );
            })}

            <div className="pt-5 px-3 py-2 text-[11px] font-semibold uppercase tracking-wider text-slate-400">
              Collegamenti
            </div>
            <Link
              href="/"
              target="_blank"
              className="flex items-center gap-3 px-3.5 py-2.5 rounded-lg text-sm font-medium text-slate-400 hover:text-slate-100 hover:bg-slate-900/80 transition-colors"
            >
              <Globe className="h-4 w-4 text-slate-400" />
              <span>Sito Pubblico & Demo</span>
            </Link>
          </nav>
        </div>

        {/* User Footer */}
        <div className="p-4 border-t border-slate-800/80 bg-slate-900/40">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="h-9 w-9 rounded-full bg-slate-800 border border-slate-700 flex items-center justify-center font-bold text-xs text-blue-400">
                {user?.name ? user.name.slice(0, 2).toUpperCase() : 'AG'}
              </div>
              <div className="overflow-hidden">
                <p className="text-xs font-semibold text-slate-200 truncate">{user?.name || 'Operatore'}</p>
                <div className="flex items-center gap-1 text-[10px] text-slate-400">
                  <ShieldCheck className="h-3 w-3 text-emerald-400" />
                  <span className="capitalize">{user?.role || 'admin'}</span>
                </div>
              </div>
            </div>

            <button
              type="button"
              onClick={handleLogout}
              title="Esci"
              className="p-2 text-slate-400 hover:text-rose-400 hover:bg-rose-950/30 rounded-lg transition-colors"
            >
              <LogOut className="h-4 w-4" />
            </button>
          </div>
        </div>
      </aside>
    </>
  );
}
