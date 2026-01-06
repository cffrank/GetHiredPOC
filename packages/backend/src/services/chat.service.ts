import OpenAI from 'openai';
import type { Env } from './db.service';
import type {
  ChatMessage,
  ChatConversation,
  ChatConversationWithMessages,
  ToolCall,
  ToolResult
} from '@gethiredpoc/shared';
import { getJobs, saveJob, getJobById } from './db.service';
import { createApplication } from './db.service';

// OpenAI API message types
interface OpenAIMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
  tool_calls?: OpenAIToolCall[];
}

interface OpenAIToolCall {
  id: string;
  type: 'function';
  function: {
    name: string;
    arguments: string; // JSON string
  };
}

interface OpenAIToolMessage {
  role: 'tool';
  tool_call_id: string;
  content: string;
}

// OpenAI Chat Completions API response format
interface OpenAIResponse {
  choices: Array<{
    message: {
      role: string;
      content: string | null;
      tool_calls?: OpenAIToolCall[];
    };
    finish_reason: string;
  }>;
  usage?: {
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
  };
}

// Tool definitions in OpenAI function calling format
const TOOL_DEFINITIONS = [
  {
    type: 'function',
    function: {
      name: 'search_jobs',
      description: 'Search for job openings by title, location, or remote status. Returns a list of matching jobs.',
      parameters: {
        type: 'object',
        properties: {
          query: {
            type: 'string',
            description: 'Job title or keywords to search for'
          },
          location: {
            type: 'string',
            description: 'Location to search in (e.g., "San Francisco", "Remote")'
          },
          remote: {
            type: 'boolean',
            description: 'Filter for remote jobs only'
          }
        }
      }
    }
  },
  {
    type: 'function',
    function: {
      name: 'save_job',
      description: 'Bookmark/save a job posting for later review. Requires the job_id from search results.',
      parameters: {
        type: 'object',
        properties: {
          job_id: {
            type: 'string',
            description: 'The unique identifier of the job to save'
          }
        },
        required: ['job_id']
      }
    }
  },
  {
    type: 'function',
    function: {
      name: 'get_user_profile',
      description: 'Fetch the current user\'s profile information including name, location, bio, and skills.',
      parameters: {
        type: 'object',
        properties: {}
      }
    }
  },
  {
    type: 'function',
    function: {
      name: 'update_user_profile',
      description: 'Update the user\'s profile information. Can update name, bio, location, or skills.',
      parameters: {
        type: 'object',
        properties: {
          full_name: {
            type: 'string',
            description: 'User\'s full name'
          },
          bio: {
            type: 'string',
            description: 'Professional bio or summary'
          },
          location: {
            type: 'string',
            description: 'User\'s location (city, state, or country)'
          },
          skills: {
            type: 'array',
            items: { type: 'string' },
            description: 'List of professional skills'
          }
        }
      }
    }
  },
  {
    type: 'function',
    function: {
      name: 'get_job_preferences',
      description: 'Fetch the user\'s job search preferences including desired roles, locations, salary range.',
      parameters: {
        type: 'object',
        properties: {}
      }
    }
  },
  {
    type: 'function',
    function: {
      name: 'update_job_preferences',
      description: 'Update the user\'s job search preferences and criteria.',
      parameters: {
        type: 'object',
        properties: {
          desired_roles: {
            type: 'array',
            items: { type: 'string' },
            description: 'List of desired job titles or roles'
          },
          desired_locations: {
            type: 'array',
            items: { type: 'string' },
            description: 'Preferred work locations'
          },
          min_salary: {
            type: 'number',
            description: 'Minimum acceptable salary'
          },
          remote_preference: {
            type: 'string',
            enum: ['remote_only', 'hybrid', 'on_site', 'no_preference'],
            description: 'Remote work preference'
          }
        }
      }
    }
  },
  {
    type: 'function',
    function: {
      name: 'create_application',
      description: 'Apply to a job posting. Creates an application record for tracking.',
      parameters: {
        type: 'object',
        properties: {
          job_id: {
            type: 'string',
            description: 'Job to apply to'
          },
          status: {
            type: 'string',
            enum: ['saved', 'applied', 'interviewing', 'offered', 'rejected'],
            description: 'Application status (default: saved)'
          }
        },
        required: ['job_id']
      }
    }
  },
  {
    type: 'function',
    function: {
      name: 'parse_job_posting',
      description: 'Extract structured data from pasted job posting text. Returns job title, company, requirements, etc.',
      parameters: {
        type: 'object',
        properties: {
          job_text: {
            type: 'string',
            description: 'The full text of the job posting to parse'
          }
        },
        required: ['job_text']
      }
    }
  }
];

// Simple system prompt - GPT-4o-mini handles tool calling natively
const SYSTEM_PROMPT = `You are a helpful job search assistant. You help users find jobs, manage their profile, update preferences, and apply to positions.

Be conversational and helpful. Use the available tools when needed to help users accomplish their goals. When you receive tool results, explain them clearly to the user.`;

// Execute a tool call
async function executeTool(
  env: Env,
  userId: string,
  toolName: string,
  toolInput: any
): Promise<string> {
  try {
    switch (toolName) {
      case 'search_jobs': {
        const jobs = await getJobs(env, {
          title: toolInput.query,
          location: toolInput.location,
          remote: toolInput.remote,
          userId
        });

        // Return top 10 results with key info
        const results = jobs.slice(0, 10).map(job => ({
          id: job.id,
          title: job.title,
          company: job.company,
          location: job.location,
          remote: job.remote,
          salary: job.salary_min && job.salary_max
            ? `$${job.salary_min.toLocaleString()} - $${job.salary_max.toLocaleString()}`
            : 'Not specified',
          posted_date: job.posted_date
        }));

        return JSON.stringify({
          count: jobs.length,
          results
        });
      }

      case 'save_job': {
        await saveJob(env, userId, toolInput.job_id);
        const job = await getJobById(env, toolInput.job_id);
        return JSON.stringify({
          success: true,
          message: `Saved job: ${job?.title} at ${job?.company}`
        });
      }

      case 'get_user_profile': {
        const user = await env.DB.prepare('SELECT * FROM users WHERE id = ?')
          .bind(userId)
          .first();

        if (!user) {
          return JSON.stringify({ error: 'User not found' });
        }

        return JSON.stringify({
          full_name: user.full_name,
          email: user.email,
          bio: user.bio,
          location: user.location,
          skills: user.skills ? JSON.parse(user.skills as string) : [],
          linkedin_url: user.linkedin_url,
          address: user.address
        });
      }

      case 'update_user_profile': {
        const fields: string[] = [];
        const params: any[] = [];

        if (toolInput.full_name) {
          fields.push('full_name = ?');
          params.push(toolInput.full_name);
        }
        if (toolInput.bio) {
          fields.push('bio = ?');
          params.push(toolInput.bio);
        }
        if (toolInput.location) {
          fields.push('location = ?');
          params.push(toolInput.location);
        }
        if (toolInput.skills) {
          fields.push('skills = ?');
          params.push(JSON.stringify(toolInput.skills));
        }

        if (fields.length === 0) {
          return JSON.stringify({ error: 'No fields to update' });
        }

        fields.push('updated_at = unixepoch()');
        params.push(userId);

        await env.DB.prepare(`UPDATE users SET ${fields.join(', ')} WHERE id = ?`)
          .bind(...params)
          .run();

        return JSON.stringify({ success: true, message: 'Profile updated successfully' });
      }

      case 'get_job_preferences': {
        const prefs = await env.DB.prepare('SELECT * FROM job_search_preferences WHERE user_id = ?')
          .bind(userId)
          .first();

        if (!prefs) {
          return JSON.stringify({ message: 'No preferences set yet' });
        }

        return JSON.stringify({
          desired_roles: prefs.desired_roles ? JSON.parse(prefs.desired_roles as string) : [],
          desired_locations: prefs.desired_locations ? JSON.parse(prefs.desired_locations as string) : [],
          min_salary: prefs.min_salary,
          max_salary: prefs.max_salary,
          remote_preference: prefs.remote_preference,
          employment_status: prefs.employment_status
        });
      }

      case 'update_job_preferences': {
        const existing = await env.DB.prepare('SELECT id FROM job_search_preferences WHERE user_id = ?')
          .bind(userId)
          .first();

        if (!existing) {
          // Create new preferences
          const fields = ['user_id'];
          const placeholders = ['?'];
          const params = [userId];

          if (toolInput.desired_roles) {
            fields.push('desired_roles');
            placeholders.push('?');
            params.push(JSON.stringify(toolInput.desired_roles));
          }
          if (toolInput.desired_locations) {
            fields.push('desired_locations');
            placeholders.push('?');
            params.push(JSON.stringify(toolInput.desired_locations));
          }
          if (toolInput.min_salary) {
            fields.push('min_salary');
            placeholders.push('?');
            params.push(toolInput.min_salary);
          }
          if (toolInput.remote_preference) {
            fields.push('remote_preference');
            placeholders.push('?');
            params.push(toolInput.remote_preference);
          }

          await env.DB.prepare(
            `INSERT INTO job_search_preferences (${fields.join(', ')}) VALUES (${placeholders.join(', ')})`
          ).bind(...params).run();
        } else {
          // Update existing preferences
          const fields: string[] = [];
          const params: any[] = [];

          if (toolInput.desired_roles) {
            fields.push('desired_roles = ?');
            params.push(JSON.stringify(toolInput.desired_roles));
          }
          if (toolInput.desired_locations) {
            fields.push('desired_locations = ?');
            params.push(JSON.stringify(toolInput.desired_locations));
          }
          if (toolInput.min_salary !== undefined) {
            fields.push('min_salary = ?');
            params.push(toolInput.min_salary);
          }
          if (toolInput.remote_preference) {
            fields.push('remote_preference = ?');
            params.push(toolInput.remote_preference);
          }

          if (fields.length > 0) {
            fields.push('updated_at = unixepoch()');
            params.push(userId);

            await env.DB.prepare(
              `UPDATE job_search_preferences SET ${fields.join(', ')} WHERE user_id = ?`
            ).bind(...params).run();
          }
        }

        return JSON.stringify({ success: true, message: 'Preferences updated successfully' });
      }

      case 'create_application': {
        const application = await createApplication(
          env,
          userId,
          toolInput.job_id,
          toolInput.status || 'saved'
        );

        const job = await getJobById(env, toolInput.job_id);

        return JSON.stringify({
          success: true,
          message: `Application created for ${job?.title} at ${job?.company}`,
          application_id: application.id
        });
      }

      case 'parse_job_posting': {
        // Use AI to parse job posting text
        const prompt = `Extract structured data from this job posting. Return ONLY valid JSON with this structure:
{
  "title": "job title",
  "company": "company name",
  "location": "location",
  "remote": true/false,
  "description": "brief description",
  "requirements": ["requirement 1", "requirement 2"],
  "salary_min": number or null,
  "salary_max": number or null
}

Job posting:
${toolInput.job_text}`;

        const aiResponse = await env.AI.run('@cf/meta/llama-3.1-8b-instruct', {
          prompt,
          temperature: 0.3,
          max_tokens: 800
        });

        return aiResponse.response || JSON.stringify({ error: 'Failed to parse job posting' });
      }

      default:
        return JSON.stringify({ error: `Unknown tool: ${toolName}` });
    }
  } catch (error: any) {
    console.error(`Error executing tool ${toolName}:`, error);
    return JSON.stringify({ error: error.message || 'Tool execution failed' });
  }
}

// Send a chat message and get AI response
export async function sendChatMessage(
  env: Env,
  userId: string,
  conversationId: string | undefined,
  userMessage: string
): Promise<{
  conversationId: string;
  userMessage: ChatMessage;
  assistantMessage: ChatMessage;
}> {
  // Create or get conversation
  let convId = conversationId;
  if (!convId) {
    const result = await env.DB.prepare(
      'INSERT INTO chat_conversations (user_id, title) VALUES (?, ?) RETURNING id'
    )
      .bind(userId, 'New Conversation')
      .first<{ id: string }>();

    convId = result!.id;
  }

  // Save user message
  const userMsgResult = await env.DB.prepare(
    'INSERT INTO chat_messages (conversation_id, role, content) VALUES (?, ?, ?) RETURNING *'
  )
    .bind(convId, 'user', userMessage)
    .first<ChatMessage>();

  if (!userMsgResult) {
    throw new Error('Failed to save user message');
  }

  // Get conversation history (last 20 messages for better context)
  const history = await env.DB.prepare(
    'SELECT * FROM chat_messages WHERE conversation_id = ? ORDER BY created_at DESC LIMIT 20'
  )
    .bind(convId)
    .all<ChatMessage>();

  // Build messages array in OpenAI format (reverse to get chronological order)
  const messages: OpenAIMessage[] = [
    { role: 'system', content: SYSTEM_PROMPT }
  ];

  // Add conversation history in chronological order
  const reversedHistory = (history.results || []).reverse();
  for (const msg of reversedHistory) {
    if (msg.role === 'user' || msg.role === 'assistant') {
      messages.push({
        role: msg.role,
        content: msg.content
      });
    }
  }

  // Validate environment variables
  if (!env.CLOUDFLARE_ACCOUNT_ID) {
    throw new Error('CLOUDFLARE_ACCOUNT_ID not configured');
  }

  if (!env.AI_GATEWAY_TOKEN) {
    throw new Error('AI_GATEWAY_TOKEN not configured. Please run: npx wrangler secret put AI_GATEWAY_TOKEN');
  }

  if (!env.OPENAI_API_KEY) {
    throw new Error('OPENAI_API_KEY not configured. Please run: npx wrangler secret put OPENAI_API_KEY');
  }

  // Tool calling loop with OpenAI GPT-4o-mini through AI Gateway
  let toolCalls: ToolCall[] = [];
  let finalContent = '';
  let iterations = 0;
  const MAX_ITERATIONS = 5; // Prevent infinite loops

  // AI Gateway configuration
  const accountId = env.CLOUDFLARE_ACCOUNT_ID;
  const gatewayId = 'jobmatch-ai-gateway-dev';
  const modelName = 'openai/gpt-4o-mini'; // Unified API requires provider prefix

  // Initialize OpenAI client with AI Gateway using Unified API (compat endpoint)
  const openai = new OpenAI({
    apiKey: env.OPENAI_API_KEY,
    baseURL: `https://gateway.ai.cloudflare.com/v1/${accountId}/${gatewayId}/compat`,
    defaultHeaders: {
      'cf-aig-authorization': `Bearer ${env.AI_GATEWAY_TOKEN}`,
    },
  });

  while (iterations < MAX_ITERATIONS) {
    iterations++;

    try {
      console.log(`[Chat] Iteration ${iterations}, calling OpenAI GPT-4o-mini through AI Gateway...`);

      // Call OpenAI API through Cloudflare AI Gateway using SDK
      const response = await openai.chat.completions.create({
        model: modelName,
        messages: messages as any,
        tools: TOOL_DEFINITIONS as any,
        max_tokens: 2048,
        temperature: 0.7,
      });

      console.log('[Chat] Raw OpenAI response:', JSON.stringify(response, null, 2));

      // Extract the AI's response
      const aiMessage = response.choices[0].message;
      const aiContent = aiMessage.content || '';
      const aiToolCalls = aiMessage.tool_calls || [];

      // Check if AI wants to use tools
      if (aiToolCalls && aiToolCalls.length > 0) {
        console.log(`[Chat] Detected ${aiToolCalls.length} tool calls`);

        // Add assistant message with tool calls to history
        messages.push({
          role: 'assistant',
          content: aiContent,
          tool_calls: aiToolCalls
        });

        // Execute tools and collect results
        for (const toolCall of aiToolCalls) {
          const toolName = toolCall.function.name;
          const toolArgs = JSON.parse(toolCall.function.arguments);

          console.log(`[Chat] Executing tool: ${toolName} with args:`, toolArgs);

          const result = await executeTool(env, userId, toolName, toolArgs);

          // Store tool call for database
          toolCalls.push({
            id: toolCall.id,
            type: 'function',
            function: {
              name: toolName,
              arguments: toolCall.function.arguments
            }
          });

          // Add tool result to messages for next iteration (OpenAI format)
          messages.push({
            role: 'tool',
            tool_call_id: toolCall.id,
            content: result
          } as any);
        }

        // Continue loop to get final response after tool execution
        continue;
      }

      // No more tool calls, we have the final response
      finalContent = aiContent.trim();
      break;

    } catch (error: any) {
      console.error('[Chat] OpenAI API error:', error);
      // Fallback to error message
      finalContent = 'I apologize, but I encountered an error processing your request. Please try again.';
      break;
    }
  }

  // If we hit max iterations, use the last response
  if (iterations >= MAX_ITERATIONS && !finalContent) {
    finalContent = 'I apologize, but I had trouble completing your request. Please try rephrasing or breaking it into smaller steps.';
  }

  // Save assistant message
  const assistantMsgResult = await env.DB.prepare(
    'INSERT INTO chat_messages (conversation_id, role, content, tool_calls, tool_results) VALUES (?, ?, ?, ?, ?) RETURNING *'
  )
    .bind(
      convId,
      'assistant',
      finalContent,
      toolCalls.length > 0 ? JSON.stringify(toolCalls) : null,
      null // Tool results are temporary, we don't need to store them
    )
    .first<ChatMessage>();

  if (!assistantMsgResult) {
    throw new Error('Failed to save assistant message');
  }

  // Update conversation updated_at
  await env.DB.prepare('UPDATE chat_conversations SET updated_at = unixepoch() WHERE id = ?')
    .bind(convId)
    .run();

  // Parse tool_calls from JSON if needed
  const finalAssistantMsg = {
    ...assistantMsgResult,
    tool_calls: assistantMsgResult.tool_calls
      ? JSON.parse(assistantMsgResult.tool_calls as any)
      : undefined
  };

  return {
    conversationId: convId,
    userMessage: userMsgResult,
    assistantMessage: finalAssistantMsg
  };
}

// Get all conversations for a user
export async function getConversations(
  env: Env,
  userId: string
): Promise<ChatConversation[]> {
  const result = await env.DB.prepare(
    'SELECT * FROM chat_conversations WHERE user_id = ? ORDER BY updated_at DESC'
  )
    .bind(userId)
    .all<ChatConversation>();

  return result.results || [];
}

// Get a conversation with its messages
export async function getConversationWithMessages(
  env: Env,
  conversationId: string,
  userId: string
): Promise<ChatConversationWithMessages | null> {
  const conversation = await env.DB.prepare(
    'SELECT * FROM chat_conversations WHERE id = ? AND user_id = ?'
  )
    .bind(conversationId, userId)
    .first<ChatConversation>();

  if (!conversation) {
    return null;
  }

  const messages = await env.DB.prepare(
    'SELECT * FROM chat_messages WHERE conversation_id = ? ORDER BY created_at ASC'
  )
    .bind(conversationId)
    .all<ChatMessage>();

  // Parse tool_calls from JSON strings
  const parsedMessages = (messages.results || []).map(msg => ({
    ...msg,
    tool_calls: msg.tool_calls ? JSON.parse(msg.tool_calls as any) : undefined,
    tool_results: msg.tool_results ? JSON.parse(msg.tool_results as any) : undefined
  }));

  return {
    ...conversation,
    messages: parsedMessages
  };
}

// Create a new conversation
export async function createConversation(
  env: Env,
  userId: string,
  title?: string
): Promise<ChatConversation> {
  const result = await env.DB.prepare(
    'INSERT INTO chat_conversations (user_id, title) VALUES (?, ?) RETURNING *'
  )
    .bind(userId, title || 'New Conversation')
    .first<ChatConversation>();

  if (!result) {
    throw new Error('Failed to create conversation');
  }

  return result;
}

// Delete a conversation
export async function deleteConversation(
  env: Env,
  conversationId: string,
  userId: string
): Promise<void> {
  await env.DB.prepare(
    'DELETE FROM chat_conversations WHERE id = ? AND user_id = ?'
  )
    .bind(conversationId, userId)
    .run();
}
