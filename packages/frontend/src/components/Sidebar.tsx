import { useState, useEffect } from 'react';
import { ChevronLeft, ChevronRight, Bot } from 'lucide-react';
import { ChatInterface } from './ChatInterface';

export function Sidebar() {
  const [isOpen, setIsOpen] = useState(() => {
    const saved = localStorage.getItem('sidebar-open');
    return saved !== null ? JSON.parse(saved) : true;
  });

  useEffect(() => {
    localStorage.setItem('sidebar-open', JSON.stringify(isOpen));
  }, [isOpen]);

  const toggleSidebar = () => {
    setIsOpen(!isOpen);
  };

  return (
    <>
      {/* Mobile Overlay */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-black bg-opacity-50 z-20 lg:hidden"
          onClick={toggleSidebar}
        />
      )}

      {/* Sidebar */}
      <aside
        className={`
          fixed top-16 left-0 h-[calc(100vh-4rem)] bg-white border-r border-gray-200 z-30
          transition-all duration-300 ease-in-out
          ${isOpen ? 'w-96' : 'w-0 lg:w-16'}
          lg:relative lg:top-0 lg:h-screen
        `}
      >
        {/* Toggle Button */}
        <button
          onClick={toggleSidebar}
          className="absolute -right-3 top-6 bg-white border border-gray-200 rounded-full p-1 shadow-sm hover:bg-gray-50 z-10"
          aria-label={isOpen ? 'Close sidebar' : 'Open sidebar'}
        >
          {isOpen ? (
            <ChevronLeft className="w-4 h-4 text-gray-600" />
          ) : (
            <ChevronRight className="w-4 h-4 text-gray-600" />
          )}
        </button>

        {/* Sidebar Content */}
        <div
          className={`
            h-full overflow-hidden transition-opacity duration-300
            ${isOpen ? 'opacity-100' : 'opacity-0 lg:opacity-100'}
          `}
        >
          {isOpen ? (
            <ChatInterface isOpen={isOpen} />
          ) : (
            <div className="flex justify-center pt-2">
              <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                <Bot className="w-4 h-4 text-blue-600" />
              </div>
            </div>
          )}
        </div>
      </aside>
    </>
  );
}
