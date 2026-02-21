import { z } from 'zod'

// Matches fields extracted by POST /chat/message handler:
// { conversation_id?, message }
// conversation_id is optional (undefined starts a new conversation)
export const chatMessageSchema = z.object({
  message: z.string().min(1, 'Message is required'),
  conversation_id: z.string().optional(),
})

// Matches fields extracted by POST /chat/conversations handler:
// { title? }
export const createConversationSchema = z.object({
  title: z.string().optional(),
})
