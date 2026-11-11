import { AppTopNavbar } from './AppTopNavbar';
import { Outlet } from 'react-router-dom';
import { AutoTranslate } from '../components/common/AutoTranslate';

export default function AppLayout() {
  return (
    <div className="min-h-screen w-full bg-[#F8FAFC] dark:bg-[#000000] text-[#0A1931] dark:text-[#F8FAFC] flex flex-col font-sans transition-colors duration-200">
      {/* Sleek Top Navbar */}
      <AutoTranslate>
        <AppTopNavbar />
      </AutoTranslate>
      
      {/* Full Width Main App Content */}
      <main className="flex-1 w-full relative overflow-x-clip">
        <AutoTranslate>
          <Outlet />
        </AutoTranslate>
      </main>
    </div>
  );
}
