import { Outlet } from 'react-router-dom';
import { Navigation } from '../Navigation';

export function ChatLayout() {
  return (
    <div className="min-h-screen bg-gray-50">
      <Navigation />
      <main className="h-[calc(100vh-4rem)]">
        <Outlet />
      </main>
    </div>
  );
}
