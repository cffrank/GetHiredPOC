// Chat system types for AI assistant

export interface ToolCall {
  id: string;
  type: 'function';
  function: {
    name: string;
    arguments: string; // JSON string
  };
}

export interface ToolResult {
  tool_call_id: string;
  output: string; // JSON string or plain text
  error?: string;
}

// Navigation Actions - for chat-driven UI navigation
export interface NavigationAction {
  type: 'navigate';
  route: string;                    // e.g., '/jobs', '/jobs/:id'
  state?: Record<string, any>;      // React Router state
  filters?: JobFilters;             // For Jobs page filtering
  message?: string;                 // User-facing explanation
}

export interface JobFilters {
  keywords?: string;
  locations?: string[];
  salary_min?: number;
  salary_max?: number;
  experience_levels?: string[];
  remote?: 'any' | 'remote' | 'hybrid' | 'onsite';
  required_skills?: string[];
  job_type?: string[];
}

export interface ChatMessage {
  id: string;
  conversation_id: string;
  role: 'user' | 'assistant';
  content: string;
  tool_calls?: ToolCall[];
  tool_results?: ToolResult[];
  navigation_action?: NavigationAction; // NEW: for chat-driven navigation
  created_at: number;
}

export interface ChatConversation {
  id: string;
  user_id: string;
  title: string;
  created_at: number;
  updated_at: number;
}

export interface ChatConversationWithMessages extends ChatConversation {
  messages: ChatMessage[];
}

// API Request/Response types
export interface SendChatMessageRequest {
  conversation_id?: string; // Optional - creates new conversation if not provided
  message: string;
}

export interface SendChatMessageResponse {
  conversation_id: string;
  user_message: ChatMessage;
  assistant_message: ChatMessage;
}

export interface CreateConversationRequest {
  title?: string;
}

export interface CreateConversationResponse {
  conversation: ChatConversation;
}
