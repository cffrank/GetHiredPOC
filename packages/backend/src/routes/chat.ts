import { Hono } from 'hono';
import type { Env } from '../services/db.service';
import { getSession, getCookie } from '../services/auth.service';
import type { User } from '@gethiredpoc/shared';
import {
  sendChatMessage,
  getConversations,
  getConversationWithMessages,
  createConversation,
  deleteConversation
} from '../services/chat.service';

type Variables = {
  env: Env;
};

const chat = new Hono<{ Bindings: Env; Variables: Variables }>();

// Middleware to require auth
async function requireAuth(c: any): Promise<User> {
  const sessionId = getCookie(c.req.raw, "session");
  if (!sessionId) {
    throw new Error('Unauthorized');
  }

  const user = await getSession(c.env, sessionId);
  if (!user) {
    throw new Error('Session expired');
  }

  return user;
}

// POST /api/chat/message - Send a message and get AI response
chat.post('/message', async (c) => {
  try {
    const user = await requireAuth(c);
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
  } catch (error: any) {
    console.error('Error sending chat message:', error);
    if (error.message === 'Unauthorized' || error.message === 'Session expired') {
      return c.json({ error: error.message }, 401);
    }
    if (error.message.includes('ANTHROPIC_API_KEY')) {
      return c.json({ error: error.message }, 500);
    }
    return c.json({ error: error.message || 'Failed to send message' }, 500);
  }
});

// GET /api/chat/conversations - List all conversations
chat.get('/conversations', async (c) => {
  try {
    const user = await requireAuth(c);
    const conversations = await getConversations(c.env, user.id);
    return c.json({ conversations }, 200);
  } catch (error: any) {
    console.error('Error getting conversations:', error);
    if (error.message === 'Unauthorized' || error.message === 'Session expired') {
      return c.json({ error: error.message }, 401);
    }
    return c.json({ error: error.message || 'Failed to get conversations' }, 500);
  }
});

// GET /api/chat/conversations/:id - Get a conversation with messages
chat.get('/conversations/:id', async (c) => {
  try {
    const user = await requireAuth(c);
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
  } catch (error: any) {
    console.error('Error getting conversation:', error);
    if (error.message === 'Unauthorized' || error.message === 'Session expired') {
      return c.json({ error: error.message }, 401);
    }
    return c.json({ error: error.message || 'Failed to get conversation' }, 500);
  }
});

// POST /api/chat/conversations - Create a new conversation
chat.post('/conversations', async (c) => {
  try {
    const user = await requireAuth(c);
    const body = await c.req.json().catch(() => ({}));
    const { title } = body;

    const conversation = await createConversation(c.env, user.id, title);

    return c.json({ conversation }, 201);
  } catch (error: any) {
    console.error('Error creating conversation:', error);
    if (error.message === 'Unauthorized' || error.message === 'Session expired') {
      return c.json({ error: error.message }, 401);
    }
    return c.json({ error: error.message || 'Failed to create conversation' }, 500);
  }
});

// DELETE /api/chat/conversations/:id - Delete a conversation
chat.delete('/conversations/:id', async (c) => {
  try {
    const user = await requireAuth(c);
    const conversationId = c.req.param('id');

    await deleteConversation(c.env, conversationId, user.id);

    return c.json({ success: true }, 200);
  } catch (error: any) {
    console.error('Error deleting conversation:', error);
    if (error.message === 'Unauthorized' || error.message === 'Session expired') {
      return c.json({ error: error.message }, 401);
    }
    return c.json({ error: error.message || 'Failed to delete conversation' }, 500);
  }
});

export default chat;
