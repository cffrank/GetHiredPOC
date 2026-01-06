import { Outlet } from 'react-router-dom';
import { Navigation } from '../Navigation';
import { Sidebar } from '../Sidebar';

export function UserLayout() {
  return (
    <div className="min-h-screen bg-gray-50">
      <Navigation />
      <div className="flex">
        <Sidebar />
        <main className="flex-1 min-h-[calc(100vh-4rem)]">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
