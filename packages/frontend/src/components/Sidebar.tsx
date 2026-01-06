import { useState, useEffect } from 'react';
import { ChevronLeft, ChevronRight, Bot, Menu, X } from 'lucide-react';
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
      {/* Mobile Hamburger Button - Fixed at top */}
      <button
        onClick={toggleSidebar}
        className="fixed top-20 left-4 z-[60] lg:hidden bg-white border border-gray-200 rounded-full p-3 shadow-soft hover:bg-gray-50 min-h-touch min-w-touch"
        aria-label={isOpen ? 'Close sidebar' : 'Open sidebar'}
      >
        {isOpen ? (
          <X className="w-5 h-5 text-gray-600" />
        ) : (
          <Menu className="w-5 h-5 text-gray-600" />
        )}
      </button>

      {/* Mobile Overlay */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-black bg-opacity-50 z-40 lg:hidden transition-opacity duration-300"
          onClick={toggleSidebar}
        />
      )}

      {/* Sidebar */}
      <aside
        className={`
          fixed top-16 left-0 h-[calc(100vh-4rem)] bg-white border-r border-gray-200 shadow-soft-lg z-50
          transition-all duration-300 ease-in-out
          ${isOpen ? 'translate-x-0 w-full sm:w-96' : '-translate-x-full w-0'}
          lg:translate-x-0 lg:relative lg:top-0 lg:h-screen lg:w-96
        `}
      >
        {/* Desktop Toggle Button */}
        <button
          onClick={toggleSidebar}
          className="hidden lg:block absolute -right-3 top-6 bg-white border border-gray-200 rounded-full p-1 shadow-soft hover:bg-gray-50 z-10 min-h-touch min-w-touch"
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
              <div className="w-8 h-8 bg-primary-100 rounded-full flex items-center justify-center">
                <Bot className="w-4 h-4 text-primary-600" />
              </div>
            </div>
          )}
        </div>
      </aside>
    </>
  );
}
