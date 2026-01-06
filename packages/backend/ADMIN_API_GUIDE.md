# Admin API Guide - AI Prompt Management

Quick reference for managing AI prompts through the admin API.

## Authentication

All admin endpoints require:
1. Valid JWT token in Authorization header
2. Admin role on user account

```bash
# Set your admin token
export ADMIN_TOKEN="your-jwt-token-here"

# Use in requests
curl -H "Authorization: Bearer $ADMIN_TOKEN" ...
```

## Base URL

- Local: `http://localhost:8787`
- Production: `https://your-production-url.com`

---

## Endpoints

### 1. List All Prompts

**GET** `/api/admin/prompts`

List all AI prompts (active only by default).

**Query Parameters:**
- `active_only` (optional): `true` or `false` (default: `true`)

**Example:**
```bash
# List all active prompts
curl -H "Authorization: Bearer $ADMIN_TOKEN" \
  http://localhost:8787/api/admin/prompts

# List all prompts including inactive
curl -H "Authorization: Bearer $ADMIN_TOKEN" \
  "http://localhost:8787/api/admin/prompts?active_only=false"
```

**Response:**
```json
{
  "success": true,
  "count": 4,
  "prompts": [
    {
      "id": "abc123",
      "prompt_key": "cover_letter",
      "prompt_name": "Cover Letter Generator",
      "prompt_template": "You are an expert...",
      "description": "Generates personalized cover letters",
      "model_config": "{\"model\":\"@cf/meta/llama-3.1-8b-instruct\",\"temperature\":0.8,\"max_tokens\":900}",
      "version": 1,
      "is_active": 1,
      "created_at": 1736651742,
      "updated_at": 1736651742
    }
  ]
}
```

---

### 2. Get Single Prompt

**GET** `/api/admin/prompts/:key`

Get a specific prompt by its key.

**Example:**
```bash
curl -H "Authorization: Bearer $ADMIN_TOKEN" \
  http://localhost:8787/api/admin/prompts/cover_letter
```

**Response:**
```json
{
  "success": true,
  "prompt": {
    "id": "abc123",
    "prompt_key": "cover_letter",
    "prompt_name": "Cover Letter Generator",
    "prompt_template": "You are an expert...",
    "description": "Generates personalized cover letters",
    "model_config": "{\"model\":\"@cf/meta/llama-3.1-8b-instruct\",\"temperature\":0.8,\"max_tokens\":900}",
    "version": 1,
    "is_active": 1,
    "created_at": 1736651742,
    "updated_at": 1736651742
  }
}
```

**Error Response (404):**
```json
{
  "error": "Prompt not found"
}
```

---

### 3. Create/Update Prompt

**POST** `/api/admin/prompts`

Create a new prompt or update existing (upsert operation).

**Request Body:**
```json
{
  "prompt_key": "my_new_prompt",
  "prompt_name": "My New Prompt",
  "prompt_template": "This is a prompt template with {{variable1}} and {{variable2}}",
  "description": "Optional description of what this prompt does",
  "model_config": "{\"model\":\"@cf/meta/llama-3.1-8b-instruct\",\"temperature\":0.7,\"max_tokens\":1000,\"gateway\":\"my-ai-gateway\"}"
}
```

**Required Fields:**
- `prompt_key` (string, unique identifier)
- `prompt_name` (string, human-readable name)
- `prompt_template` (string, template with {{variables}})

**Optional Fields:**
- `description` (string)
- `model_config` (JSON string)
- `version` (integer, auto-incremented if omitted)

**Example:**
```bash
curl -X POST \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "prompt_key": "interview_prep",
    "prompt_name": "Interview Preparation Assistant",
    "prompt_template": "Help {{candidate_name}} prepare for an interview at {{company_name}} for the {{job_title}} position.\n\nJob Description:\n{{job_description}}\n\nProvide:\n1. Company research insights\n2. Common interview questions for this role\n3. STAR method response examples\n4. Questions to ask the interviewer",
    "description": "Generates interview preparation materials",
    "model_config": "{\"model\":\"@cf/meta/llama-3.1-8b-instruct\",\"temperature\":0.7,\"max_tokens\":1500}"
  }' \
  http://localhost:8787/api/admin/prompts
```

**Response:**
```json
{
  "success": true,
  "message": "Prompt 'interview_prep' saved successfully",
  "prompt": {
    "id": "xyz789",
    "prompt_key": "interview_prep",
    "prompt_name": "Interview Preparation Assistant",
    "version": 1,
    ...
  }
}
```

**Error Response (400):**
```json
{
  "error": "Missing required fields: prompt_key, prompt_name, prompt_template"
}
```

**Error Response (400 - Invalid JSON):**
```json
{
  "error": "Invalid JSON in model_config"
}
```

---

### 4. Update Existing Prompt

**PUT** `/api/admin/prompts/:key`

Update an existing prompt. Only updates provided fields.

**Request Body:**
```json
{
  "prompt_name": "Updated Name (optional)",
  "prompt_template": "Updated template (optional)",
  "description": "Updated description (optional)",
  "model_config": "{...}"
}
```

**Example:**
```bash
curl -X PUT \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "prompt_template": "UPDATED: Help {{candidate_name}} prepare...",
    "description": "Updated description"
  }' \
  http://localhost:8787/api/admin/prompts/interview_prep
```

**Response:**
```json
{
  "success": true,
  "message": "Prompt 'interview_prep' updated successfully",
  "prompt": {
    "id": "xyz789",
    "prompt_key": "interview_prep",
    "version": 2,
    ...
  }
}
```

**Error Response (404):**
```json
{
  "error": "Prompt not found"
}
```

---

### 5. Delete Prompt

**DELETE** `/api/admin/prompts/:key`

Soft delete a prompt (sets `is_active = 0`). Prompt remains in database but won't be used.

**Example:**
```bash
curl -X DELETE \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  http://localhost:8787/api/admin/prompts/interview_prep
```

**Response:**
```json
{
  "success": true,
  "message": "Prompt 'interview_prep' deleted successfully"
}
```

**Note:** Deleted prompts can be restored by using PUT to update them, or by manually setting `is_active = 1` in the database.

---

## Available Prompt Keys

These are the standard prompts seeded in the database:

| Prompt Key | Purpose | Variables |
|------------|---------|-----------|
| `cover_letter` | Generate cover letters | user_name, user_location, user_bio, user_skills, job_title, job_company, job_location, job_description |
| `job_match` | Analyze job-candidate fit | user_skills, user_location, user_bio, work_experience, education, job_title, job_company, job_location, job_remote, job_description |
| `resume_tailor` | Generate tailored resumes | user_name, user_location, user_bio, user_skills, work_experience, education, job_title, job_company, job_location, job_description |
| `linkedin_parse` | Parse LinkedIn profiles | profile_text |

---

## Model Configuration

The `model_config` field is a JSON string with AI model settings:

```json
{
  "model": "@cf/meta/llama-3.1-8b-instruct",
  "temperature": 0.7,
  "max_tokens": 1000,
  "gateway": "optional-gateway-id"
}
```

**Fields:**
- `model` (string): Cloudflare AI model identifier
- `temperature` (number, 0-1): Randomness (0=deterministic, 1=creative)
- `max_tokens` (integer): Maximum output length
- `gateway` (string, optional): AI Gateway ID for rate limiting/caching

**Available Models:**
- `@cf/meta/llama-3.1-8b-instruct` (default, fast)
- `@cf/meta/llama-3.1-70b-instruct` (slower, more capable)
- Other Cloudflare Workers AI models

---

## Template Variables

Use double curly braces for variables: `{{variable_name}}`

**Example Template:**
```
Hello {{user_name}},

You are applying for {{job_title}} at {{job_company}}.

Your skills: {{user_skills}}
```

**Variable Rendering:**
Variables are replaced when the AI service calls `renderPrompt()`. Missing variables are replaced with empty strings.

---

## Caching Behavior

- Prompts are cached in KV for 24 hours after first fetch
- Cache key: `prompt:${prompt_key}`
- Cache is invalidated when you update or delete a prompt
- First fetch after update will be slower (database query)
- Subsequent fetches will be fast (KV cache)

**Cache Warming:**
After updating a prompt, you can warm the cache by calling GET /api/admin/prompts/:key

---

## Audit Logging

All prompt changes are logged to the `audit_logs` table:

**Logged Actions:**
- `update_prompt` (POST or PUT)
- `delete_prompt` (DELETE)

**Logged Data:**
- User ID (who made the change)
- Action type
- Prompt key, name, version
- IP address
- Timestamp

**View Audit Logs:**
```sql
SELECT * FROM audit_logs WHERE action LIKE '%prompt%' ORDER BY created_at DESC LIMIT 10;
```

---

## Testing Prompts

### Test a Prompt Template Locally

1. Create a test prompt
2. Use the AI service that corresponds to your prompt
3. Check logs for variable replacement

**Example with cover_letter:**
```typescript
// This is handled automatically by generateCoverLetter() service
const prompt = await getPrompt(env, 'cover_letter');
const rendered = renderPrompt(prompt.prompt_template, {
  user_name: 'John Doe',
  job_title: 'Software Engineer',
  // ... other variables
});
console.log(rendered); // Check output
```

---

## Best Practices

### Prompt Writing
1. Be specific about output format (JSON, text, etc.)
2. Use clear variable names: `{{user_name}}` not `{{name}}`
3. Include examples in the prompt
4. Specify constraints (word count, structure)
5. Test with various inputs

### Model Configuration
1. Use lower temperature (0.3-0.5) for structured output (JSON)
2. Use higher temperature (0.7-0.9) for creative content
3. Set appropriate max_tokens based on expected output length
4. Use AI Gateway for production (rate limiting, caching)

### Version Management
1. Versions auto-increment on updates
2. Test prompts before updating production
3. Keep descriptions updated
4. Document breaking changes in description

### Performance
1. Monitor cache hit rates
2. Optimize prompt length (shorter = faster)
3. Use specific prompts rather than generic ones
4. Consider creating prompt variants for A/B testing

---

## Troubleshooting

### 401 Unauthorized
- Check your JWT token is valid
- Ensure token is not expired
- Verify Authorization header format: `Bearer $TOKEN`

### 403 Forbidden
- Verify your user has admin role
- Check `users.role = 'admin'` in database

### 404 Not Found
- Check prompt_key spelling
- Verify prompt exists and is_active = 1
- Use GET /api/admin/prompts to list all prompts

### 400 Bad Request
- Validate all required fields are present
- Check model_config is valid JSON
- Ensure no extra commas in JSON

### 500 Internal Server Error
- Check server logs for details
- Verify database connection
- Check KV namespace is configured

---

## Example Workflows

### Create a New Prompt
```bash
# 1. Create the prompt
curl -X POST \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "prompt_key": "salary_negotiation",
    "prompt_name": "Salary Negotiation Assistant",
    "prompt_template": "Help {{user_name}} negotiate salary for {{job_title}} role at {{company_name}}.\n\nCurrent offer: {{current_offer}}\nMarket rate: {{market_rate}}\n\nProvide negotiation strategy and email template.",
    "description": "Generates salary negotiation strategies",
    "model_config": "{\"model\":\"@cf/meta/llama-3.1-8b-instruct\",\"temperature\":0.7,\"max_tokens\":1200}"
  }' \
  http://localhost:8787/api/admin/prompts

# 2. Verify it was created
curl -H "Authorization: Bearer $ADMIN_TOKEN" \
  http://localhost:8787/api/admin/prompts/salary_negotiation
```

### Update an Existing Prompt
```bash
# 1. Get current version
curl -H "Authorization: Bearer $ADMIN_TOKEN" \
  http://localhost:8787/api/admin/prompts/cover_letter

# 2. Update template
curl -X PUT \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "prompt_template": "UPDATED TEMPLATE HERE..."
  }' \
  http://localhost:8787/api/admin/prompts/cover_letter

# 3. Verify version incremented
curl -H "Authorization: Bearer $ADMIN_TOKEN" \
  http://localhost:8787/api/admin/prompts/cover_letter
```

### Temporarily Disable a Prompt
```bash
# Soft delete (can be restored later)
curl -X DELETE \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  http://localhost:8787/api/admin/prompts/interview_prep

# Verify it's not in active list
curl -H "Authorization: Bearer $ADMIN_TOKEN" \
  http://localhost:8787/api/admin/prompts
```

---

## Security Notes

- Admin endpoints are protected by authentication and authorization
- All prompt changes are audit logged
- Use HTTPS in production
- Rotate admin tokens regularly
- Review audit logs for suspicious activity
- Validate all user input before using in prompts

---

## Support

For issues or questions:
1. Check server logs: `wrangler tail`
2. Review audit logs in database
3. Verify database schema is up to date
4. Check KV namespace configuration
5. Test with curl before implementing in code

---

**Last Updated:** 2026-01-05
**Version:** Phase 2 Release
