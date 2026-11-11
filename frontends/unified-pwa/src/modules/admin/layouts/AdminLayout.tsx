import React from 'react';
import { Outlet } from 'react-router-dom';
import { AppTopNavbar } from '../../../layouts/AppTopNavbar';

export const AdminLayout: React.FC = () => {
  return (
    <div className="min-h-screen bg-[#fafbfc] dark:bg-[#000000] text-[#0a0a0a] dark:text-zinc-100 font-['Onest',system-ui,sans-serif] selection:bg-[#2563c9] selection:text-white flex flex-col w-full max-w-full overflow-x-hidden transition-colors duration-200">
      {/* Universal Top Navbar Alone */}
      <AppTopNavbar />

      {/* Main Workbench Canvas */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-4 sm:p-6 lg:p-8 space-y-6 min-w-0">
        <Outlet />
      </main>

      {/* Minimal Footer */}
      <footer className="border-t border-[#e6e8ec] dark:border-zinc-800 bg-white dark:bg-[#09090b] py-4 px-6 text-center text-xs text-[#717784] dark:text-zinc-500">
        TrustHyre Operations Console • Authenticated Administrator Environment
      </footer>
    </div>
  );
};
