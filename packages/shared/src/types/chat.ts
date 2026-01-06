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

export interface ChatMessage {
  id: string;
  conversation_id: string;
  role: 'user' | 'assistant';
  content: string;
  tool_calls?: ToolCall[];
  tool_results?: ToolResult[];
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
