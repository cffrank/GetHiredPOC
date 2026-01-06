import { useState, useEffect } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';

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
          ${isOpen ? 'w-64' : 'w-0 lg:w-16'}
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
          <div className="p-4">
            {isOpen ? (
              <div className="space-y-4">
                <h2 className="text-lg font-semibold text-gray-900">AI Assistant</h2>
                <p className="text-sm text-gray-500">
                  Chat functionality will be added in Phase 4
                </p>
              </div>
            ) : (
              <div className="flex justify-center pt-2">
                <div className="w-8 h-8 bg-gray-200 rounded-full flex items-center justify-center">
                  <span className="text-xs text-gray-600">AI</span>
                </div>
              </div>
            )}
          </div>
        </div>
      </aside>
    </>
  );
}
