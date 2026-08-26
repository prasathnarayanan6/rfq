import React from 'react';
import {
  BarChart3,
  ClipboardList,
  FileText,
  LayoutDashboard,
  LogIn,
  Settings,
  Users,
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import logo from '../assets/Red_Beige_Minimal_Simple_Typographic_Chic_Logo-removebg-preview.png';

const navigationItems = [
  { label: 'Login', icon: LogIn, path: '/' },
  { label: 'Dashboard', icon: LayoutDashboard },
  { label: 'Vendor List', icon: Users },
  { label: 'Settings', icon: Settings },
  { label: 'Purchase Requests', icon: ClipboardList },
  { label: 'Reports', icon: BarChart3 },
  { label: 'Quotation', icon: FileText },
];

function Sidebar({ activeItem, onItemSelect }) {
  const navigate = useNavigate();

  return (
    <aside className="flex min-h-screen w-72 shrink-0 flex-col border-r border-gray-200 bg-white font-sans">
      <div className="border-b border-gray-100 px-7 py-7">
        <center><img src={logo} alt="Logo" className="h-24 w-auto" /></center>
        <center><p className="mt-1 text-sm text-gray-400">Procurement workspace</p></center>
      </div>

      <nav className="flex-1 space-y-1 px-4 py-6" aria-label="Main navigation">
        {navigationItems.map(({ label, icon: Icon, path }) => {
          const isActive = activeItem === label;

          return (
            <button
              key={label}
              type="button"
              onClick={() => (path ? navigate(path) : onItemSelect(label))}
              className={`flex w-full items-center gap-3 rounded-lg px-4 py-3 text-left text-sm font-medium transition-colors ${
                isActive
                  ? 'bg-red-50 text-[#e90000]'
                  : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
              }`}
              aria-current={isActive ? 'page' : undefined}
            >
              <Icon size={20} strokeWidth={2} />
              <span>{label}</span>
            </button>
          );
        })}
      </nav>
    </aside>
  );
}

export default Sidebar;
