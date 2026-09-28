import React, { useEffect, useState } from 'react';
import { Menu, Search } from 'lucide-react';
import { Outlet, useLocation } from 'react-router-dom';
import Sidebar from './Sidebar';

const pageMeta = {
  '/dashboard': {
    eyebrow: 'Workspace overview',
    title: 'Dashboard',
    description: 'A clear view of your vendor network and procurement activity.',
  },
  '/vendor-list': {
    eyebrow: 'Vendor management',
    title: 'Vendor List',
    description: 'Organize, review, and prepare outreach to the right suppliers.',
  },
};

function DashboardLayout() {
  const { pathname } = useLocation();
  const [navigationOpen, setNavigationOpen] = useState(false);
  const meta = pageMeta[pathname] || pageMeta['/dashboard'];

  useEffect(() => setNavigationOpen(false), [pathname]);

  return (
    <div className="min-h-screen bg-[#f6f7f9] lg:flex">
      {navigationOpen && <button type="button" className="fixed inset-0 z-40 bg-slate-950/55 backdrop-blur-sm lg:hidden" onClick={() => setNavigationOpen(false)} aria-label="Close navigation overlay" />}
      <Sidebar open={navigationOpen} onClose={() => setNavigationOpen(false)} />

      <div className="min-w-0 flex-1">
        <header className="sticky top-0 z-30 border-b border-slate-200/80 bg-white/85 backdrop-blur-xl">
          <div className="mx-auto flex h-16 max-w-[100rem] items-center justify-between gap-4 px-4 sm:px-6 lg:px-8">
            <div className="flex min-w-0 items-center gap-3">
              <button type="button" onClick={() => setNavigationOpen(true)} className="focus-ring rounded-xl border border-slate-200 bg-white p-2.5 text-slate-600 shadow-sm hover:bg-slate-50 lg:hidden" aria-label="Open navigation">
                <Menu size={20} />
              </button>
              <div className="min-w-0 lg:hidden">
                <p className="truncate text-sm font-semibold text-slate-900">{meta.title}</p>
                <p className="truncate text-xs text-slate-500">Supply.ai workspace</p>
              </div>
            </div>
            <div className="hidden items-center gap-2 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-400 md:flex">
              <Search size={16} />
              <span>Everything you need, in one place</span>
            </div>
          </div>
        </header>

        <main className="px-4 py-6 sm:px-6 sm:py-8 lg:px-8 lg:py-10">
          <div className="mx-auto max-w-[100rem]">
            <div className="mb-7 animate-fade-up">
              <p className="text-xs font-semibold uppercase tracking-[.18em] text-brand-600">{meta.eyebrow}</p>
              <div className="mt-2 flex flex-wrap items-end justify-between gap-3">
                <div>
                  <h1 className="text-3xl font-semibold tracking-tight text-ink sm:text-4xl">{meta.title}</h1>
                  <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-500 sm:text-base">{meta.description}</p>
                </div>
                <p className="rounded-full border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-500 shadow-sm">
                  {new Intl.DateTimeFormat('en', { weekday: 'short', day: 'numeric', month: 'short' }).format(new Date())}
                </p>
              </div>
            </div>
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  );
}

export default DashboardLayout;
