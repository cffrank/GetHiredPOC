# Phase 4: AI Chat Interface - Setup Guide

## Overview

Phase 4 adds a conversational AI assistant to the sidebar with tool calling capabilities. The assistant can search for jobs, manage applications, update user profiles, and more.

## Prerequisites

1. **Anthropic API Key** (REQUIRED)
   - Get your API key from: https://console.anthropic.com/
   - Create an account if you don't have one
   - Navigate to API Keys section and generate a new key

## Setup Instructions

### 1. Apply Database Migration

Run the migration to create chat tables:

```bash
# Local development
npx wrangler d1 execute gethiredpoc-db --local --file=./migrations/0014_chat_system.sql

# Production (when ready)
npx wrangler d1 execute gethiredpoc-db --remote --file=./migrations/0014_chat_system.sql
```

### 2. Configure Anthropic API Key

**CRITICAL**: The chat feature will not work without this key.

```bash
# Set the API key as a Cloudflare Workers secret
npx wrangler secret put ANTHROPIC_API_KEY
# When prompted, paste your Anthropic API key
```

### 3. Rebuild Shared Package

The chat types need to be compiled:

```bash
cd packages/shared
npm run build
```

### 4. Start Development Servers

```bash
# Terminal 1 - Frontend
cd packages/frontend
npm run dev

# Terminal 2 - Backend
cd packages/backend
npm run dev
```

## Features

### AI Assistant Capabilities

The AI assistant can perform the following actions:

1. **Search Jobs**
   - "Find software engineer jobs in San Francisco"
   - "Show me remote product manager positions"

2. **Save Jobs**
   - "Save this job" (after showing job details)
   - "Bookmark the first job from the search"

3. **View Profile**
   - "Show me my profile"
   - "What are my current skills?"

4. **Update Profile**
   - "Update my location to New York"
   - "Add Python to my skills"

5. **Job Preferences**
   - "Show my job preferences"
   - "Update my minimum salary to 100000"

6. **Create Applications**
   - "Apply to this job"
   - "Create an application for job ID abc123"

7. **Parse Job Postings**
   - "Parse this job posting: [paste job text]"
   - Extracts structured data from unstructured job text

### Technical Details

- **AI Model**: Claude 3.5 Sonnet (claude-3-5-sonnet-20241022)
- **Tool Calling**: Uses Anthropic's native tool calling API
- **Conversation History**: Last 10 messages included in context
- **Max Iterations**: 5 tool call iterations to prevent loops
- **Database Storage**: All messages and conversations persisted

## Usage

1. Open the application
2. The sidebar is visible by default (toggle with chevron button)
3. Type a message in the input box
4. The AI will respond and can call tools to help you
5. Tool calls are shown with a wrench icon
6. Conversations persist across sessions

## API Endpoints

All endpoints require authentication (session cookie).

### POST /api/chat/message
Send a chat message and get AI response.

**Request:**
```json
{
  "conversation_id": "optional-conversation-id",
  "message": "Find me software engineer jobs"
}
```

**Response:**
```json
{
  "conversationId": "conv-123",
  "userMessage": { ... },
  "assistantMessage": { ... }
}
```

### GET /api/chat/conversations
List all user's conversations.

**Response:**
```json
{
  "conversations": [
    {
      "id": "conv-123",
      "user_id": "user-456",
      "title": "New Conversation",
      "created_at": 1234567890,
      "updated_at": 1234567890
    }
  ]
}
```

### GET /api/chat/conversations/:id
Get a conversation with all messages.

**Response:**
```json
{
  "conversation": {
    "id": "conv-123",
    "user_id": "user-456",
    "title": "New Conversation",
    "created_at": 1234567890,
    "updated_at": 1234567890,
    "messages": [ ... ]
  }
}
```

### POST /api/chat/conversations
Create a new conversation.

**Request:**
```json
{
  "title": "Optional Title"
}
```

### DELETE /api/chat/conversations/:id
Delete a conversation (and all its messages).

## Troubleshooting

### Error: "ANTHROPIC_API_KEY not configured"

**Solution:** Run `npx wrangler secret put ANTHROPIC_API_KEY` and paste your API key.

### Error: "Failed to send message"

**Possible causes:**
1. No internet connection
2. Anthropic API is down (check status.anthropic.com)
3. API key is invalid or expired
4. Rate limit exceeded

**Solution:** Check browser console for detailed error messages.

### Chat interface not showing

**Solution:**
1. Ensure sidebar is open (click chevron button)
2. Check browser console for React errors
3. Verify shared package is built: `cd packages/shared && npm run build`

### Tool calls not working

**Solution:**
1. Check that user is authenticated
2. Verify database migration was applied
3. Check backend logs for tool execution errors

## Cost Considerations

- Claude 3.5 Sonnet pricing: ~$3 per million input tokens, ~$15 per million output tokens
- Average chat message: ~500-1000 tokens
- Estimated cost: $0.002 - $0.02 per conversation turn
- For production, consider implementing rate limiting

## Security Notes

1. **API Key Storage**: Stored as Cloudflare Workers secret (encrypted)
2. **Authentication**: All chat endpoints require valid session
3. **Data Isolation**: Users can only access their own conversations
4. **Input Validation**: Message content is validated and trimmed
5. **Tool Authorization**: Tools only operate on authenticated user's data

## Next Steps

- Add conversation management UI (list, rename, delete)
- Implement streaming responses for faster perceived performance
- Add message editing and regeneration
- Create conversation summaries for long chats
- Add export chat history feature
- Implement rate limiting per user

## Support

For issues or questions:
1. Check this documentation
2. Review browser console logs
3. Check backend logs: `npx wrangler tail`
4. Verify all environment variables are set
