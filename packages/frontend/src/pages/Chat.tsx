import { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import {
  Send,
  Loader2,
  Bot,
  User,
  Wrench,
  Briefcase,
  MapPin,
  DollarSign,
  Building,
  Calendar,
  Bookmark,
  FileText,
  TrendingUp,
  ChevronRight,
  Plus,
  MessageSquare,
  Trash2,
  ExternalLink
} from 'lucide-react';
import { apiClient } from '../lib/api-client';
import type { ChatMessage, ChatConversation, ToolCall } from '@gethiredpoc/shared';

// Job card component for rich rendering
function JobCard({ job }: { job: any }) {
  return (
    <div className="bg-white border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow">
      <div className="flex justify-between items-start">
        <div className="flex-1">
          <h4 className="font-semibold text-gray-900">{job.title}</h4>
          <div className="flex items-center gap-2 text-sm text-gray-600 mt-1">
            <Building className="w-4 h-4" />
            <span>{job.company}</span>
          </div>
          <div className="flex items-center gap-2 text-sm text-gray-500 mt-1">
            <MapPin className="w-4 h-4" />
            <span>{job.location}</span>
            {job.remote && (
              <span className="bg-green-100 text-green-700 text-xs px-2 py-0.5 rounded">Remote</span>
            )}
          </div>
          {job.salary && job.salary !== 'Not specified' && (
            <div className="flex items-center gap-2 text-sm text-gray-500 mt-1">
              <DollarSign className="w-4 h-4" />
              <span>{job.salary}</span>
            </div>
          )}
        </div>
        <span className="text-xs text-gray-400 bg-gray-100 px-2 py-1 rounded font-mono">
          ID: {job.id?.substring(0, 8)}...
        </span>
      </div>
    </div>
  );
}

// Match analysis card
function MatchCard({ match }: { match: any }) {
  const scoreColor = match.match_score >= 80 ? 'text-green-600' : match.match_score >= 60 ? 'text-yellow-600' : 'text-red-600';
  const scoreBg = match.match_score >= 80 ? 'bg-green-100' : match.match_score >= 60 ? 'bg-yellow-100' : 'bg-red-100';

  return (
    <div className="bg-white border border-gray-200 rounded-lg p-4">
      <div className="flex justify-between items-start mb-3">
        <div>
          <h4 className="font-semibold text-gray-900">{match.job_title}</h4>
          <p className="text-sm text-gray-600">{match.company}</p>
        </div>
        <div className={`${scoreBg} ${scoreColor} font-bold text-lg px-3 py-1 rounded`}>
          {match.match_score}%
        </div>
      </div>

      {match.strengths && match.strengths.length > 0 && (
        <div className="mb-3">
          <p className="text-sm font-medium text-green-700 mb-1">Strengths:</p>
          <ul className="text-sm text-gray-600 list-disc list-inside">
            {match.strengths.slice(0, 3).map((s: string, i: number) => (
              <li key={i}>{s}</li>
            ))}
          </ul>
        </div>
      )}

      {match.gaps && match.gaps.length > 0 && (
        <div>
          <p className="text-sm font-medium text-orange-700 mb-1">Areas to Improve:</p>
          <ul className="text-sm text-gray-600 list-disc list-inside">
            {match.gaps.slice(0, 3).map((g: string, i: number) => (
              <li key={i}>{g}</li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

// Resume preview card
function ResumeCard({ resume }: { resume: any }) {
  return (
    <div className="bg-white border border-gray-200 rounded-lg p-4">
      <div className="flex items-center gap-2 mb-3">
        <FileText className="w-5 h-5 text-blue-600" />
        <h4 className="font-semibold text-gray-900">Generated Resume</h4>
      </div>

      <div className="space-y-3">
        <div>
          <p className="text-sm font-medium text-gray-700">Summary:</p>
          <p className="text-sm text-gray-600">{resume.summary}</p>
        </div>

        {resume.skills && resume.skills.length > 0 && (
          <div>
            <p className="text-sm font-medium text-gray-700">Key Skills:</p>
            <div className="flex flex-wrap gap-1 mt-1">
              {resume.skills.slice(0, 8).map((skill: string, i: number) => (
                <span key={i} className="bg-blue-100 text-blue-700 text-xs px-2 py-0.5 rounded">
                  {skill}
                </span>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// Parse tool results to extract structured data
function parseToolResult(toolCall: ToolCall, content: string) {
  try {
    // Try to find JSON in the content
    const jsonMatch = content.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      return JSON.parse(jsonMatch[0]);
    }
    return null;
  } catch {
    return null;
  }
}

// Rich message rendering
function RichMessage({ message, toolResults }: { message: ChatMessage; toolResults?: Record<string, any> }) {
  const renderToolCalls = () => {
    if (!message.tool_calls || message.tool_calls.length === 0) return null;

    return (
      <div className="mt-3 space-y-2">
        {message.tool_calls.map((tool: ToolCall, idx: number) => {
          const toolName = tool.function.name;
          const result = toolResults?.[tool.id];

          // Render rich cards for certain tool results
          if (result) {
            if (toolName === 'search_jobs' && result.results) {
              return (
                <div key={tool.id} className="space-y-2">
                  <div className="flex items-center gap-2 text-xs text-gray-500">
                    <Wrench className="w-3 h-3" />
                    <span>Found {result.count} jobs</span>
                  </div>
                  <div className="grid gap-2">
                    {result.results.slice(0, 5).map((job: any, i: number) => (
                      <JobCard key={i} job={job} />
                    ))}
                  </div>
                </div>
              );
            }

            if (toolName === 'get_saved_jobs' && result.saved_jobs) {
              return (
                <div key={tool.id} className="space-y-2">
                  <div className="flex items-center gap-2 text-xs text-gray-500">
                    <Bookmark className="w-3 h-3" />
                    <span>{result.count} saved jobs</span>
                  </div>
                  <div className="grid gap-2">
                    {result.saved_jobs.slice(0, 5).map((job: any, i: number) => (
                      <JobCard key={i} job={job} />
                    ))}
                  </div>
                </div>
              );
            }

            if (toolName === 'analyze_job_match' && result.match_score !== undefined) {
              return (
                <div key={tool.id}>
                  <MatchCard match={result} />
                </div>
              );
            }

            if (toolName === 'generate_resume' && result.resume) {
              return (
                <div key={tool.id}>
                  <ResumeCard resume={result.resume} />
                </div>
              );
            }
          }

          // Default tool call display
          const args = JSON.parse(tool.function.arguments);
          return (
            <div
              key={tool.id || idx}
              className="flex items-start gap-2 text-xs text-gray-600 bg-gray-100 rounded px-2 py-1"
            >
              <Wrench className="w-3 h-3 mt-0.5 flex-shrink-0" />
              <div>
                <span className="font-medium">{tool.function.name}</span>
                <span className="text-gray-500 ml-1">
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
    <div className="text-sm whitespace-pre-wrap break-words">
      {message.content}
      {message.role === 'assistant' && renderToolCalls()}
    </div>
  );
}

export default function Chat() {
  const navigate = useNavigate();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [conversations, setConversations] = useState<ChatConversation[]>([]);
  const [currentConversationId, setCurrentConversationId] = useState<string | undefined>();
  const [inputValue, setInputValue] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showSidebar, setShowSidebar] = useState(true);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  // Auto-scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Load conversations on mount
  useEffect(() => {
    loadConversations();
  }, []);

  // Focus input on load
  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  const loadConversations = async () => {
    try {
      const response = await apiClient.getChatConversations();
      setConversations(response.conversations || []);
    } catch (err) {
      console.error('Failed to load conversations:', err);
    }
  };

  const loadConversation = async (conversationId: string) => {
    try {
      const response = await apiClient.getChatConversation(conversationId);
      if (response.conversation) {
        setCurrentConversationId(conversationId);
        setMessages(response.conversation.messages || []);
      }
    } catch (err) {
      console.error('Failed to load conversation:', err);
    }
  };

  const startNewConversation = () => {
    setCurrentConversationId(undefined);
    setMessages([]);
    inputRef.current?.focus();
  };

  const deleteConversation = async (conversationId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      await apiClient.deleteChatConversation(conversationId);
      setConversations(prev => prev.filter(c => c.id !== conversationId));
      if (currentConversationId === conversationId) {
        startNewConversation();
      }
    } catch (err) {
      console.error('Failed to delete conversation:', err);
    }
  };

  const handleSendMessage = async () => {
    if (!inputValue.trim() || isLoading) return;

    const userMessage = inputValue.trim();
    setInputValue('');
    setError(null);

    // Optimistically add user message
    const tempUserMessage: ChatMessage = {
      id: `temp-${Date.now()}`,
      conversation_id: currentConversationId || '',
      role: 'user',
      content: userMessage,
      created_at: Math.floor(Date.now() / 1000)
    };

    setMessages(prev => [...prev, tempUserMessage]);
    setIsLoading(true);

    try {
      const response = await apiClient.sendChatMessage(currentConversationId, userMessage);

      if (!currentConversationId && response.conversationId) {
        setCurrentConversationId(response.conversationId);
        loadConversations(); // Refresh conversation list
      }

      setMessages(prev => {
        const filtered = prev.filter(m => m.id !== tempUserMessage.id);
        return [...filtered, response.userMessage, response.assistantMessage];
      });
    } catch (err: any) {
      console.error('Error sending message:', err);
      setError(err.message || 'Failed to send message. Please try again.');
      setMessages(prev => prev.filter(m => m.id !== tempUserMessage.id));
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  // Auto-resize textarea
  const handleTextareaChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setInputValue(e.target.value);
    e.target.style.height = 'auto';
    e.target.style.height = Math.min(e.target.scrollHeight, 200) + 'px';
  };

  const suggestedPrompts = [
    "Find me software engineer jobs in San Francisco",
    "Show my saved jobs",
    "What are my qualifications for a product manager role?",
    "Help me update my profile skills",
    "Generate a resume for my top job match",
    "Show my job applications",
  ];

  return (
    <div className="flex h-[calc(100vh-4rem)] bg-gray-50">
      {/* Conversation Sidebar */}
      <div className={`${showSidebar ? 'w-72' : 'w-0'} flex-shrink-0 bg-white border-r border-gray-200 transition-all duration-300 overflow-hidden`}>
        <div className="h-full flex flex-col">
          {/* New Chat Button */}
          <div className="p-4 border-b border-gray-200">
            <button
              onClick={startNewConversation}
              className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              <Plus className="w-4 h-4" />
              New Chat
            </button>
          </div>

          {/* Conversation List */}
          <div className="flex-1 overflow-y-auto">
            {conversations.length === 0 ? (
              <div className="p-4 text-center text-gray-500 text-sm">
                No conversations yet
              </div>
            ) : (
              <div className="py-2">
                {conversations.map(conv => (
                  <button
                    key={conv.id}
                    onClick={() => loadConversation(conv.id)}
                    className={`w-full text-left px-4 py-3 hover:bg-gray-100 transition-colors group flex items-center justify-between ${
                      currentConversationId === conv.id ? 'bg-blue-50 border-r-2 border-blue-600' : ''
                    }`}
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      <MessageSquare className="w-4 h-4 text-gray-400 flex-shrink-0" />
                      <span className="text-sm text-gray-700 truncate">
                        {conv.title || 'New Conversation'}
                      </span>
                    </div>
                    <button
                      onClick={(e) => deleteConversation(conv.id, e)}
                      className="opacity-0 group-hover:opacity-100 p-1 hover:bg-gray-200 rounded transition-opacity"
                    >
                      <Trash2 className="w-4 h-4 text-gray-400 hover:text-red-500" />
                    </button>
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Main Chat Area */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Chat Header */}
        <div className="bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setShowSidebar(!showSidebar)}
              className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <ChevronRight className={`w-5 h-5 text-gray-600 transition-transform ${showSidebar ? 'rotate-180' : ''}`} />
            </button>
            <div className="flex items-center gap-2">
              <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                <Bot className="w-6 h-6 text-blue-600" />
              </div>
              <div>
                <h1 className="text-lg font-semibold text-gray-900">GetHired AI</h1>
                <p className="text-xs text-gray-500">Your intelligent job search assistant</p>
              </div>
            </div>
          </div>

          {/* Quick Actions */}
          <div className="flex items-center gap-2">
            <Link
              to="/jobs"
              className="flex items-center gap-1 px-3 py-1.5 text-sm text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <Briefcase className="w-4 h-4" />
              Browse Jobs
            </Link>
            <Link
              to="/profile"
              className="flex items-center gap-1 px-3 py-1.5 text-sm text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <User className="w-4 h-4" />
              Profile
            </Link>
          </div>
        </div>

        {/* Messages Area */}
        <div className="flex-1 overflow-y-auto p-6">
          {messages.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center max-w-2xl mx-auto">
              <div className="w-20 h-20 bg-blue-100 rounded-full flex items-center justify-center mb-6">
                <Bot className="w-10 h-10 text-blue-600" />
              </div>
              <h2 className="text-2xl font-bold text-gray-900 mb-2">Welcome to GetHired AI</h2>
              <p className="text-gray-600 text-center mb-8">
                I'm your intelligent job search assistant. I can help you find jobs, create resumes,
                write cover letters, track applications, and more. Just ask!
              </p>

              {/* Suggested Prompts */}
              <div className="w-full">
                <p className="text-sm text-gray-500 mb-3 text-center">Try asking:</p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {suggestedPrompts.map((prompt, idx) => (
                    <button
                      key={idx}
                      onClick={() => {
                        setInputValue(prompt);
                        inputRef.current?.focus();
                      }}
                      className="text-left px-4 py-3 bg-white border border-gray-200 rounded-lg hover:border-blue-300 hover:bg-blue-50 transition-colors text-sm text-gray-700"
                    >
                      {prompt}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          ) : (
            <div className="max-w-3xl mx-auto space-y-6">
              {messages.map((message) => (
                <div
                  key={message.id}
                  className={`flex gap-4 ${message.role === 'user' ? 'flex-row-reverse' : ''}`}
                >
                  <div className={`flex-shrink-0 w-10 h-10 rounded-full flex items-center justify-center ${
                    message.role === 'user' ? 'bg-gray-200' : 'bg-blue-100'
                  }`}>
                    {message.role === 'user' ? (
                      <User className="w-5 h-5 text-gray-600" />
                    ) : (
                      <Bot className="w-5 h-5 text-blue-600" />
                    )}
                  </div>

                  <div className={`flex-1 max-w-[80%] ${message.role === 'user' ? 'text-right' : ''}`}>
                    <div
                      className={`inline-block rounded-2xl px-4 py-3 ${
                        message.role === 'user'
                          ? 'bg-blue-600 text-white'
                          : 'bg-white border border-gray-200 text-gray-900'
                      }`}
                    >
                      <RichMessage message={message} />
                    </div>
                  </div>
                </div>
              ))}

              {isLoading && (
                <div className="flex gap-4">
                  <div className="flex-shrink-0 w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center">
                    <Bot className="w-5 h-5 text-blue-600" />
                  </div>
                  <div className="bg-white border border-gray-200 rounded-2xl px-4 py-3">
                    <div className="flex items-center gap-2 text-gray-500">
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span className="text-sm">Thinking...</span>
                    </div>
                  </div>
                </div>
              )}

              {error && (
                <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-sm text-red-700">
                  {error}
                </div>
              )}

              <div ref={messagesEndRef} />
            </div>
          )}
        </div>

        {/* Input Area */}
        <div className="bg-white border-t border-gray-200 p-4">
          <div className="max-w-3xl mx-auto">
            <div className="flex gap-3">
              <div className="flex-1 relative">
                <textarea
                  ref={inputRef}
                  value={inputValue}
                  onChange={handleTextareaChange}
                  onKeyDown={handleKeyDown}
                  placeholder="Ask me anything about your job search..."
                  disabled={isLoading}
                  rows={1}
                  className="w-full px-4 py-3 pr-12 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:bg-gray-100 disabled:cursor-not-allowed resize-none overflow-hidden"
                  style={{ minHeight: '48px', maxHeight: '200px' }}
                />
                <button
                  onClick={handleSendMessage}
                  disabled={!inputValue.trim() || isLoading}
                  className="absolute right-2 bottom-2 p-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors"
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
            <p className="text-xs text-gray-400 mt-2 text-center">
              Press Enter to send, Shift+Enter for new line
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
