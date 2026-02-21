import { Outlet } from 'react-router-dom';
import { Navigation } from '../Navigation';
import { FixedChatSidebar } from '../FixedChatSidebar';
import { useChat } from '../../context/ChatContext';

export function UserLayout() {
  const { isOpen } = useChat();

  return (
    <div className="min-h-screen bg-gray-50">
      <Navigation />
      <div className="flex relative">
        {/* Main content - adjust margin for chat sidebar */}
        <main
          className={`flex-1 min-h-[calc(100vh-4rem)] transition-all duration-300 ${
            isOpen ? 'mr-[400px]' : 'mr-16'
          }`}
        >
          <Outlet />
        </main>

        {/* Fixed Chat Sidebar */}
        <FixedChatSidebar />
      </div>
    </div>
  );
}
