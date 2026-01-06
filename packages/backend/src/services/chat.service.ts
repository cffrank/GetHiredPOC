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

// Workers AI message types
interface AIMessage {
  role: 'user' | 'assistant' | 'system';
  content: string;
}

interface WorkersAIResponse {
  response: string;
}

// Tool invocation parsed from AI response
interface ParsedToolCall {
  id: string;
  name: string;
  args: any;
}

// Tool definitions - simplified for prompt engineering approach
const TOOLS = [
  {
    name: 'search_jobs',
    description: 'Search for job openings by title, location, or remote status. Returns a list of matching jobs.',
    parameters: 'query (string, optional): Job title or keywords; location (string, optional): Location to search in; remote (boolean, optional): Filter for remote jobs only',
    example: 'TOOL: search_jobs\nARGS: {"query": "software engineer", "location": "San Francisco", "remote": true}'
  },
  {
    name: 'save_job',
    description: 'Bookmark/save a job posting for later review. Requires the job_id from search results.',
    parameters: 'job_id (string, REQUIRED): The unique identifier of the job to save',
    example: 'TOOL: save_job\nARGS: {"job_id": "abc123"}'
  },
  {
    name: 'get_user_profile',
    description: 'Fetch the current user\'s profile information including name, location, bio, and skills.',
    parameters: 'None',
    example: 'TOOL: get_user_profile\nARGS: {}'
  },
  {
    name: 'update_user_profile',
    description: 'Update the user\'s profile information. Can update name, bio, location, or skills.',
    parameters: 'full_name (string, optional): User\'s full name; bio (string, optional): Professional bio; location (string, optional): User\'s location; skills (array of strings, optional): List of skills',
    example: 'TOOL: update_user_profile\nARGS: {"bio": "Experienced software engineer", "skills": ["JavaScript", "React"]}'
  },
  {
    name: 'get_job_preferences',
    description: 'Fetch the user\'s job search preferences including desired roles, locations, salary range.',
    parameters: 'None',
    example: 'TOOL: get_job_preferences\nARGS: {}'
  },
  {
    name: 'update_job_preferences',
    description: 'Update the user\'s job search preferences and criteria.',
    parameters: 'desired_roles (array, optional): Job titles; desired_locations (array, optional): Preferred locations; min_salary (number, optional): Minimum salary; remote_preference (string, optional): "remote_only", "hybrid", "on_site", or "no_preference"',
    example: 'TOOL: update_job_preferences\nARGS: {"desired_roles": ["Software Engineer"], "remote_preference": "remote_only"}'
  },
  {
    name: 'create_application',
    description: 'Apply to a job posting. Creates an application record for tracking.',
    parameters: 'job_id (string, REQUIRED): Job to apply to; status (string, optional): "saved", "applied", "interviewing", "offered", or "rejected" (default: "saved")',
    example: 'TOOL: create_application\nARGS: {"job_id": "abc123", "status": "applied"}'
  },
  {
    name: 'parse_job_posting',
    description: 'Extract structured data from pasted job posting text. Returns job title, company, requirements, etc.',
    parameters: 'job_text (string, REQUIRED): The full text of the job posting to parse',
    example: 'TOOL: parse_job_posting\nARGS: {"job_text": "Software Engineer at TechCorp..."}'
  }
];

// Build system prompt with tool descriptions
function buildSystemPrompt(): string {
  const toolDescriptions = TOOLS.map((tool, index) =>
    `${index + 1}. ${tool.name}: ${tool.description}
   Parameters: ${tool.parameters}
   Example usage:
   ${tool.example}`
  ).join('\n\n');

  return `You are a helpful job search assistant. You help users find jobs, manage their applications, and optimize their profile for job searching.

You have access to these tools:

${toolDescriptions}

IMPORTANT INSTRUCTIONS FOR USING TOOLS:

1. When you need to use a tool, respond with EXACTLY this format:
   TOOL: tool_name
   ARGS: {"arg1": "value1", "arg2": value2}

2. You can call multiple tools in sequence by repeating the TOOL/ARGS pattern.

3. After tool results are provided to you, respond naturally to the user explaining what happened.

4. DO NOT make up tool results - wait for the actual results to be provided.

5. Be conversational, helpful, and proactive. When users ask about jobs, search for them. When they want to save a job or apply, use the appropriate tools. Always confirm actions after completing them.

6. The ARGS must be valid JSON. Use double quotes for strings.`;
}

// Parse tool calls from AI response using prompt engineering markers
function parseToolCalls(response: string): ParsedToolCall[] {
  const toolCalls: ParsedToolCall[] = [];

  // Match TOOL: name followed by ARGS: {...}
  const toolPattern = /TOOL:\s*(\w+)\s*\n\s*ARGS:\s*(\{[^}]*\})/g;
  let match;

  while ((match = toolPattern.exec(response)) !== null) {
    const [, name, argsJson] = match;
    try {
      const args = JSON.parse(argsJson);
      toolCalls.push({
        id: `tool_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        name: name.trim(),
        args
      });
    } catch (error) {
      console.error(`Failed to parse tool args for ${name}:`, argsJson, error);
    }
  }

  return toolCalls;
}

// Remove tool call markers from response to get clean text
function stripToolMarkers(response: string): string {
  return response.replace(/TOOL:\s*\w+\s*\n\s*ARGS:\s*\{[^}]*\}/g, '').trim();
}

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

  // Get conversation history (last 10 messages)
  const history = await env.DB.prepare(
    'SELECT * FROM chat_messages WHERE conversation_id = ? ORDER BY created_at ASC LIMIT 10'
  )
    .bind(convId)
    .all<ChatMessage>();

  // Build conversation context for Workers AI
  // Workers AI models work better with a single prompt containing full context
  let conversationContext = '';
  for (const msg of history.results || []) {
    if (msg.role === 'user') {
      conversationContext += `User: ${msg.content}\n\n`;
    } else if (msg.role === 'assistant') {
      conversationContext += `Assistant: ${msg.content}\n\n`;
    }
  }

  // Tool calling loop - using prompt engineering approach
  let toolCalls: ToolCall[] = [];
  let finalContent = '';
  let iterations = 0;
  const MAX_ITERATIONS = 5; // Prevent infinite loops

  // Model configuration - using a more capable model for chat
  const modelName = '@cf/meta/llama-3.1-70b-instruct'; // Larger model for better tool use
  const systemPrompt = buildSystemPrompt();

  while (iterations < MAX_ITERATIONS) {
    iterations++;

    // Build the full prompt with system instructions and conversation context
    const fullPrompt = `${systemPrompt}

${conversationContext}

Remember: If you need to use a tool, respond with TOOL: tool_name followed by ARGS: {...} on the next line. Otherwise, respond naturally to help the user.`;

    try {
      console.log(`[Chat] Iteration ${iterations}, calling Workers AI...`);

      const response = await env.AI.run(modelName as any, {
        prompt: fullPrompt,
        max_tokens: 2048,
        temperature: 0.7,
        gateway: {
          id: 'jobmatch-ai-gateway-dev'
        }
      });

      const aiResponse = (response as WorkersAIResponse).response;

      // Check if AI wants to use tools
      const parsedToolCalls = parseToolCalls(aiResponse);

      if (parsedToolCalls.length === 0) {
        // No tools to call, we're done
        finalContent = aiResponse.trim();
        break;
      }

      console.log(`[Chat] Detected ${parsedToolCalls.length} tool calls`);

      // Execute tools and collect results
      let toolResultsText = '\n\nTool Results:\n';

      for (const toolCall of parsedToolCalls) {
        const result = await executeTool(env, userId, toolCall.name, toolCall.args);

        toolCalls.push({
          id: toolCall.id,
          type: 'function',
          function: {
            name: toolCall.name,
            arguments: JSON.stringify(toolCall.args)
          }
        });

        toolResultsText += `\nResult for ${toolCall.name}:\n${result}\n`;
      }

      // Add tool results to conversation context for next iteration
      conversationContext += `Assistant: ${stripToolMarkers(aiResponse)}\n\n`;
      conversationContext += toolResultsText + '\n';
      conversationContext += 'User: Please respond naturally based on the tool results above.\n\n';
    } catch (error: any) {
      console.error('[Chat] Workers AI error:', error);
      // Fallback to a simple error message
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
