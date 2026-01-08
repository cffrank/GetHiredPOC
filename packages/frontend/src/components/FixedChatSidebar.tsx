import { MessageSquare, X, Maximize2, Minimize2 } from 'lucide-react';
import { useChat } from '../context/ChatContext';
import { ChatInterface } from './ChatInterface';

export function FixedChatSidebar() {
  const { isOpen, toggleChat } = useChat();

  return (
    <>
      {/* Fixed Chat Sidebar */}
      <div
        className={`fixed right-0 top-16 bottom-0 bg-white border-l border-gray-200 shadow-lg transition-all duration-300 ease-in-out z-40 ${
          isOpen ? 'w-[400px]' : 'w-16'
        }`}
      >
        {isOpen ? (
          <>
            {/* Chat header with minimize button */}
            <div className="absolute top-2 right-2 z-50">
              <button
                onClick={toggleChat}
                className="p-2 rounded-lg hover:bg-gray-100 transition-colors"
                aria-label="Minimize chat"
              >
                <Minimize2 className="w-4 h-4 text-gray-600" />
              </button>
            </div>

            {/* Chat interface */}
            <ChatInterface isOpen={isOpen} />
          </>
        ) : (
          /* Collapsed state - icon button */
          <div className="h-full flex flex-col items-center pt-4">
            <button
              onClick={toggleChat}
              className="p-3 rounded-lg hover:bg-gray-100 transition-colors relative group"
              aria-label="Open chat"
            >
              <MessageSquare className="w-6 h-6 text-blue-600" />
              <span className="absolute right-full mr-2 top-1/2 -translate-y-1/2 px-2 py-1 bg-gray-900 text-white text-xs rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap">
                Open AI Assistant
              </span>
            </button>

            {/* Vertical text */}
            <div className="mt-8 transform -rotate-90 origin-center">
              <span className="text-xs font-medium text-gray-500 whitespace-nowrap">
                AI Assistant
              </span>
            </div>
          </div>
        )}
      </div>

      {/* Mobile overlay - full screen on small devices */}
      {isOpen && (
        <div className="md:hidden fixed inset-0 bg-white z-50">
          <div className="absolute top-4 right-4 z-50">
            <button
              onClick={toggleChat}
              className="p-2 rounded-lg bg-gray-100 hover:bg-gray-200 transition-colors"
              aria-label="Close chat"
            >
              <X className="w-5 h-5 text-gray-600" />
            </button>
          </div>
          <div className="h-full pt-16">
            <ChatInterface isOpen={isOpen} />
          </div>
        </div>
      )}
    </>
  );
}
