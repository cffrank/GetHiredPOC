# Creating .dev.vars for Local Chat Development

## Quick Setup

Run these commands with your actual keys:

```bash
cd /home/carl-f-frank/projects/GetHiredPOC/packages/backend

# Create .dev.vars file (replace with your actual keys)
cat > .dev.vars << 'EOF'
# Local Development Environment Variables
# This file is gitignored and will not be committed

# Required for Chat Feature
OPENAI_API_KEY=sk-proj-your-actual-key-here
AI_GATEWAY_TOKEN=your-actual-gateway-token-here

# Optional - for testing other features
# ADZUNA_APP_KEY=your-key
# APIFY_API_TOKEN=your-key
EOF

echo "✅ Created .dev.vars file"
```

## Or Copy/Paste Template

Create file: `packages/backend/.dev.vars`

```env
# Local Development Environment Variables

# Required for Chat Feature
OPENAI_API_KEY=sk-proj-xxxxxxxxxxxxxxxxxxxxxxxxxxxxx
AI_GATEWAY_TOKEN=yyyyyyyyyyyyyyyyyyyyyyyyyyyyyyy

# Account ID is already in wrangler.toml, no need to set here
```

## Security Notes

✅ `.dev.vars` is in `.gitignore` - will NOT be committed
✅ Keep production and development keys separate
⚠️ Never commit API keys to git
⚠️ Don't share keys in screenshots or logs

## After Creating .dev.vars

1. **Restart the backend server:**
   ```bash
   # Stop current backend (Ctrl+C)
   cd packages/backend
   npm run dev
   ```

2. **Verify it's working:**
   - Backend should start without errors about missing keys
   - Check logs for: "OPENAI_API_KEY configured" or similar

3. **Test the chat:**
   - Open http://localhost:5173
   - Click the chat icon on the right
   - Send a message: "Hello"
   - You should get a response from GPT-4o-mini

## Troubleshooting

### Backend won't start
- Check `.dev.vars` is in `packages/backend/` directory
- Check keys have no extra spaces or quotes
- Check file permissions: `chmod 600 .dev.vars`

### Chat returns error about API key
- Verify OPENAI_API_KEY starts with `sk-proj-` or `sk-`
- Test key at: https://platform.openai.com/api-keys
- Check key has sufficient credits

### AI Gateway errors
- Verify token at: https://dash.cloudflare.com/280c58ea17d9fe3235c33bd0a52a256b/ai/ai-gateway
- Check gateway name matches: `jobmatch-ai-gateway-dev`
- Verify token has correct permissions
