import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Send, Loader2, Bot, User, Wrench } from 'lucide-react';
import { apiClient } from '../lib/api-client';
import type { ChatMessage, ToolCall } from '@gethiredpoc/shared';

interface ChatInterfaceProps {
  isOpen: boolean;
}

export function ChatInterface({ isOpen }: ChatInterfaceProps) {
  const navigate = useNavigate();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputValue, setInputValue] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [conversationId, setConversationId] = useState<string | undefined>();
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Focus input when sidebar opens
  useEffect(() => {
    if (isOpen) {
      inputRef.current?.focus();
    }
  }, [isOpen]);

  // Handle navigation actions from chat messages
  useEffect(() => {
    const lastMessage = messages[messages.length - 1];
    if (lastMessage?.role === 'assistant' && lastMessage.navigation_action) {
      const action = lastMessage.navigation_action;

      if (action.type === 'navigate') {
        console.log('[ChatInterface] Navigation action detected:', action);

        // Navigate with state containing filters and message
        navigate(action.route, {
          state: {
            filters: action.filters,
            message: action.message,
            ...action.state
          }
        });
      }
    }
  }, [messages, navigate]);

  const handleSendMessage = async () => {
    if (!inputValue.trim() || isLoading) return;

    const userMessage = inputValue.trim();
    setInputValue('');
    setError(null);

    // Optimistically add user message to UI
    const tempUserMessage: ChatMessage = {
      id: `temp-${Date.now()}`,
      conversation_id: conversationId || '',
      role: 'user',
      content: userMessage,
      created_at: Math.floor(Date.now() / 1000)
    };

    setMessages(prev => [...prev, tempUserMessage]);
    setIsLoading(true);

    try {
      const response = await apiClient.sendChatMessage(conversationId, userMessage);

      // Update conversation ID if this was the first message
      if (!conversationId && response.conversationId) {
        setConversationId(response.conversationId);
      }

      // Replace temp message with real user message and add assistant response
      setMessages(prev => {
        const filtered = prev.filter(m => m.id !== tempUserMessage.id);
        return [...filtered, response.userMessage, response.assistantMessage];
      });
    } catch (err: any) {
      console.error('Error sending message:', err);
      setError(err.message || 'Failed to send message. Please try again.');

      // Remove the temporary message on error
      setMessages(prev => prev.filter(m => m.id !== tempUserMessage.id));
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const formatToolCalls = (toolCalls: ToolCall[] | undefined) => {
    if (!toolCalls || toolCalls.length === 0) return null;

    return (
      <div className="mt-3 space-y-2">
        {toolCalls.map((tool, idx) => {
          const args = JSON.parse(tool.function.arguments);
          return (
            <div
              key={tool.id || idx}
              className="flex items-start gap-2 text-xs text-gray-700 bg-gradient-to-br from-violet/10 to-teal/10 rounded-xl px-3 py-2 border border-violet/20"
            >
              <Wrench className="w-4 h-4 mt-0.5 flex-shrink-0 text-violet" />
              <div>
                <span className="font-bold text-purple-deep">{tool.function.name}</span>
                <span className="text-gray-600 ml-1">
                  ({Object.entries(args).map(([key, val]) =>
                    `${key}: ${typeof val === 'string' ? val : JSON.stringify(val)}`
                  ).join(', ')})
                </span>
              </div>
            </div>
          );
        })}
      </div>
    );
  };

  return (
    <div className="flex flex-col h-full">
      {/* Chat Header */}
      <div className="p-6 border-b-2 border-gray-100 bg-gradient-to-br from-violet/5 to-teal/5">
        <h2 className="text-xl font-extrabold text-purple-deep flex items-center gap-2">
          <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-violet to-teal flex items-center justify-center shadow-3d-sm">
            <Bot className="w-5 h-5 text-white" />
          </div>
          AI Assistant 🤖
        </h2>
        <p className="text-sm text-gray-600 mt-2">
          Ask me to search jobs, update your profile, or help with applications
        </p>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.length === 0 && (
          <div className="text-center text-gray-500 mt-12">
            <div className="w-20 h-20 mx-auto mb-4 rounded-3xl bg-gradient-to-br from-violet to-teal flex items-center justify-center shadow-3d-md animate-bounce-gentle">
              <Bot className="w-10 h-10 text-white" />
            </div>
            <p className="text-base font-bold text-purple-deep mb-2">Start a conversation</p>
            <p className="text-sm text-gray-500">
              Try: "Find me software engineer jobs in SF" 🔍
            </p>
          </div>
        )}

        {messages.map((message) => (
          <div
            key={message.id}
            className={`flex gap-3 ${
              message.role === 'user' ? 'justify-end' : 'justify-start'
            }`}
          >
            {message.role === 'assistant' && (
              <div className="flex-shrink-0 w-10 h-10 rounded-2xl bg-gradient-to-br from-violet to-teal flex items-center justify-center shadow-3d-sm">
                <Bot className="w-5 h-5 text-white" />
              </div>
            )}

            <div
              className={`max-w-[80%] rounded-2xl px-4 py-3 shadow-3d-sm ${
                message.role === 'user'
                  ? 'bg-gradient-to-br from-violet to-teal text-white'
                  : 'bg-white border-2 border-gray-100 text-gray-900'
              }`}
            >
              <div className="text-sm whitespace-pre-wrap break-words">
                {message.content}
              </div>
              {message.role === 'assistant' && formatToolCalls(message.tool_calls)}
            </div>

            {message.role === 'user' && (
              <div className="flex-shrink-0 w-10 h-10 rounded-2xl bg-gray-200 flex items-center justify-center shadow-3d-sm">
                <User className="w-5 h-5 text-gray-600" />
              </div>
            )}
          </div>
        ))}

        {isLoading && (
          <div className="flex gap-3 justify-start">
            <div className="flex-shrink-0 w-10 h-10 rounded-2xl bg-gradient-to-br from-violet to-teal flex items-center justify-center shadow-3d-sm">
              <Bot className="w-5 h-5 text-white" />
            </div>
            <div className="bg-white border-2 border-gray-100 rounded-2xl px-4 py-3 shadow-3d-sm">
              <Loader2 className="w-5 h-5 text-violet animate-spin" />
            </div>
          </div>
        )}

        {error && (
          <div className="bg-gradient-to-br from-red-50 to-red-100 border-2 border-red-200 rounded-2xl p-4 text-sm text-red-700 font-medium shadow-3d-sm">
            {error}
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <div className="p-6 border-t-2 border-gray-100 bg-gradient-to-br from-violet/5 to-teal/5">
        <div className="flex gap-3">
          <input
            ref={inputRef}
            type="text"
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            onKeyPress={handleKeyPress}
            placeholder="Type a message..."
            disabled={isLoading}
            className="flex-1 px-4 py-3 border-2 border-gray-200 rounded-2xl focus:outline-none focus:ring-2 focus:ring-violet focus:border-violet disabled:bg-gray-100 disabled:cursor-not-allowed text-sm shadow-3d-sm transition-all"
          />
          <button
            onClick={handleSendMessage}
            disabled={!inputValue.trim() || isLoading}
            className="px-6 py-3 bg-gradient-to-br from-violet to-teal text-white rounded-2xl hover:shadow-3d-md active:shadow-3d-sm disabled:bg-gray-300 disabled:cursor-not-allowed transition-all flex items-center justify-center shadow-3d-sm hover:-translate-y-0.5 active:translate-y-1"
            aria-label="Send message"
          >
            {isLoading ? (
              <Loader2 className="w-5 h-5 animate-spin" />
            ) : (
              <Send className="w-5 h-5" />
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
