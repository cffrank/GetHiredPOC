import { Hono } from 'hono';
import type { Env } from '../services/db.service';
import { requireAuth, type AppVariables } from '../middleware/auth.middleware';
import {
  sendChatMessage,
  getConversations,
  getConversationWithMessages,
  createConversation,
  deleteConversation
} from '../services/chat.service';
import { toMessage } from '../utils/errors';

const chat = new Hono<{ Bindings: Env; Variables: AppVariables }>();

// Apply auth middleware to all routes
chat.use('*', requireAuth);

// POST /api/chat/message - Send a message and get AI response
chat.post('/message', async (c) => {
  try {
    const user = c.get('user');
    const body = await c.req.json();

    const { conversation_id, message } = body;

    if (!message || typeof message !== 'string' || message.trim().length === 0) {
      return c.json({ error: 'Message is required' }, 400);
    }

    const result = await sendChatMessage(
      c.env,
      user.id,
      conversation_id,
      message.trim()
    );

    return c.json(result, 200);
  } catch (error: unknown) {
    console.error('Error sending chat message:', error);
    const msg = toMessage(error);
    if (msg.includes('ANTHROPIC_API_KEY')) {
      return c.json({ error: msg }, 500);
    }
    return c.json({ error: msg || 'Failed to send message' }, 500);
  }
});

// GET /api/chat/conversations - List all conversations
chat.get('/conversations', async (c) => {
  try {
    const user = c.get('user');
    const conversations = await getConversations(c.env, user.id);
    return c.json({ conversations }, 200);
  } catch (error: unknown) {
    console.error('Error getting conversations:', error);
    return c.json({ error: toMessage(error) || 'Failed to get conversations' }, 500);
  }
});

// GET /api/chat/conversations/:id - Get a conversation with messages
chat.get('/conversations/:id', async (c) => {
  try {
    const user = c.get('user');
    const conversationId = c.req.param('id');

    const conversation = await getConversationWithMessages(
      c.env,
      conversationId,
      user.id
    );

    if (!conversation) {
      return c.json({ error: 'Conversation not found' }, 404);
    }

    return c.json({ conversation }, 200);
  } catch (error: unknown) {
    console.error('Error getting conversation:', error);
    return c.json({ error: toMessage(error) || 'Failed to get conversation' }, 500);
  }
});

// POST /api/chat/conversations - Create a new conversation
chat.post('/conversations', async (c) => {
  try {
    const user = c.get('user');
    const body = await c.req.json().catch(() => ({}));
    const { title } = body;

    const conversation = await createConversation(c.env, user.id, title);

    return c.json({ conversation }, 201);
  } catch (error: unknown) {
    console.error('Error creating conversation:', error);
    return c.json({ error: toMessage(error) || 'Failed to create conversation' }, 500);
  }
});

// DELETE /api/chat/conversations/:id - Delete a conversation
chat.delete('/conversations/:id', async (c) => {
  try {
    const user = c.get('user');
    const conversationId = c.req.param('id');

    await deleteConversation(c.env, conversationId, user.id);

    return c.json({ success: true }, 200);
  } catch (error: unknown) {
    console.error('Error deleting conversation:', error);
    return c.json({ error: toMessage(error) || 'Failed to delete conversation' }, 500);
  }
});

export default chat;
