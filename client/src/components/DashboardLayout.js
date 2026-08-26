import React from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import Sidebar from './Sidebar';

const pageTitles = {
  '/dashboard': 'Dashboard',
  '/vendor-list': 'Vendor List',
  '/settings': 'Settings',
  '/purchase-requests': 'Purchase Requests',
  '/reports': 'Reports',
  '/quotation': 'Quotation',
};

function DashboardLayout() {
  const { pathname } = useLocation();
  const pageTitle = pageTitles[pathname] || 'Dashboard';

  return (
    <div className="flex min-h-screen bg-gray-50 font-sans">
      <Sidebar />

      <main className="min-w-0 flex-1 p-8 lg:p-10">
        <div className="mx-auto max-w-7xl">
          <p className="text-sm font-medium text-gray-400">RFQ Portal</p>
          <h1 className="mt-1 text-3xl font-semibold text-gray-800">{pageTitle}</h1>
          <Outlet />
        </div>
      </main>
    </div>
  );
}

export default DashboardLayout;
