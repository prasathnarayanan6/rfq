import React from 'react';
import { LayoutDashboard, LogOut, Users, X } from 'lucide-react';
import { useLocation, useNavigate } from 'react-router-dom';
import logo from '../assets/Red_Beige_Minimal_Simple_Typographic_Chic_Logo-removebg-preview.png';

const navigationItems = [
  { label: 'Dashboard', description: 'Workspace overview', icon: LayoutDashboard, path: '/dashboard' },
  { label: 'Vendor List', description: 'Manage your network', icon: Users, path: '/vendor-list' },
];

function Sidebar({ open = false, onClose = () => {} }) {
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const userName = sessionStorage.getItem('user_name') || 'Workspace user';
  const initials = userName.split(/\s+/).filter(Boolean).slice(0, 2).map((part) => part[0]).join('').toUpperCase() || 'U';

  const goTo = (path) => {
    navigate(path);
    onClose();
  };

  const logout = () => {
    localStorage.removeItem('user_token');
    localStorage.removeItem('people_id');
    sessionStorage.removeItem('user_name');
    navigate('/', { replace: true });
  };

  return (
    <aside className={`fixed inset-y-0 left-0 z-50 flex h-screen w-[18rem] shrink-0 transform flex-col border-r border-slate-800 bg-[#111827] text-white shadow-2xl transition-transform duration-300 lg:sticky lg:top-0 lg:z-20 lg:translate-x-0 lg:shadow-none ${open ? 'translate-x-0' : '-translate-x-full'}`}>
      <div className="flex h-24 items-center justify-between border-b border-white/10 px-6">
        <button type="button" onClick={() => goTo('/dashboard')} className="focus-ring rounded-xl bg-white px-3 py-2 shadow-lg shadow-black/20" aria-label="Go to dashboard">
          <img src={logo} alt="Supply.ai" className="h-8 w-auto" />
        </button>
        <button type="button" onClick={onClose} className="focus-ring rounded-lg p-2 text-slate-400 hover:bg-white/10 hover:text-white lg:hidden" aria-label="Close navigation">
          <X size={20} />
        </button>
      </div>

      <div className="px-6 pb-3 pt-7">
        <p className="text-[11px] font-semibold uppercase tracking-[.18em] text-slate-500">Workspace</p>
      </div>
      <nav className="flex-1 space-y-2 px-4" aria-label="Main navigation">
        {navigationItems.map(({ label, description, icon: Icon, path }) => {
          const isActive = pathname === path;
          return (
            <button
              key={label} type="button" onClick={() => goTo(path)} aria-current={isActive ? 'page' : undefined}
              className={`focus-ring group relative flex w-full items-center gap-3 rounded-xl px-3 py-3 text-left transition ${isActive ? 'bg-white text-slate-900 shadow-lg shadow-black/10' : 'text-slate-300 hover:bg-white/5 hover:text-white'}`}
            >
              <span className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-lg transition ${isActive ? 'bg-brand-50 text-brand-600' : 'bg-white/5 text-slate-400 group-hover:bg-white/10 group-hover:text-white'}`}>
                <Icon size={19} strokeWidth={2} />
              </span>
              <span className="min-w-0">
                <span className="block text-sm font-semibold">{label}</span>
                <span className={`mt-0.5 block truncate text-xs ${isActive ? 'text-slate-500' : 'text-slate-500'}`}>{description}</span>
              </span>
              {isActive && <span className="absolute -right-1 h-7 w-1 rounded-full bg-brand-600" />}
            </button>
          );
        })}
      </nav>

      <div className="border-t border-white/10 p-4">
        <div className="mb-2 flex items-center gap-3 rounded-xl px-3 py-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-brand-600 text-sm font-bold text-white">{initials}</div>
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-semibold text-white">{userName}</p>
            <p className="text-xs text-slate-500">Authenticated session</p>
          </div>
        </div>
        <button type="button" onClick={logout} className="focus-ring flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium text-slate-400 transition hover:bg-red-500/10 hover:text-red-300">
          <LogOut size={18} /> Sign out
        </button>
      </div>
    </aside>
  );
}

export default Sidebar;
