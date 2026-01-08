#!/bin/bash

# Setup script for local chat development
# This script helps you configure the required environment variables

set -e

echo "================================================"
echo "Chat Feature Local Development Setup"
echo "================================================"
echo ""

# Check if .dev.vars already exists
if [ -f "packages/backend/.dev.vars" ]; then
    echo "⚠️  .dev.vars file already exists!"
    echo ""
    read -p "Do you want to overwrite it? (yes/no): " overwrite
    if [ "$overwrite" != "yes" ]; then
        echo "Keeping existing .dev.vars file."
        exit 0
    fi
fi

echo "This script will help you set up local chat development."
echo ""
echo "You'll need:"
echo "  1. OpenAI API Key (from https://platform.openai.com/api-keys)"
echo "  2. Cloudflare AI Gateway Token"
echo ""
echo "================================================"
echo ""

# Provide options for getting the secrets
echo "How would you like to proceed?"
echo ""
echo "Option 1: I have my OpenAI API key ready"
echo "Option 2: Help me find my production keys from Cloudflare"
echo "Option 3: I'll create new development keys"
echo "Option 4: Exit (I'll set this up manually)"
echo ""
read -p "Choose an option (1-4): " option

case $option in
    1)
        echo ""
        echo "Great! Let's set up your .dev.vars file."
        echo ""
        read -p "Enter your OpenAI API key (starts with sk-): " openai_key
        read -p "Enter your Cloudflare AI Gateway token: " gateway_token

        # Create .dev.vars file
        cat > packages/backend/.dev.vars << EOF
# Local Development Environment Variables
# This file is gitignored and will not be committed

# Required for Chat Feature
OPENAI_API_KEY=$openai_key
AI_GATEWAY_TOKEN=$gateway_token

# Account ID is already in wrangler.toml
# CLOUDFLARE_ACCOUNT_ID=280c58ea17d9fe3235c33bd0a52a256b
EOF

        echo ""
        echo "✅ Created packages/backend/.dev.vars"
        echo ""
        echo "Next steps:"
        echo "1. Restart your backend server:"
        echo "   cd packages/backend && npm run dev"
        echo ""
        echo "2. Test the chat at http://localhost:5173"
        ;;

    2)
        echo ""
        echo "To retrieve your production keys from Cloudflare:"
        echo ""
        echo "📱 Via Cloudflare Dashboard:"
        echo "1. Open: https://dash.cloudflare.com/$CLOUDFLARE_ACCOUNT_ID/workers-and-pages"
        echo "2. Find your worker (gethiredpoc-backend or similar)"
        echo "3. Click Settings → Variables"
        echo "4. Under 'Encrypted Variables', you'll see:"
        echo "   - OPENAI_API_KEY"
        echo "   - AI_GATEWAY_TOKEN"
        echo ""
        echo "⚠️  Note: Values are hidden for security"
        echo "   - You'll need to create new keys, or"
        echo "   - Check if you saved them elsewhere (password manager, notes, etc.)"
        echo ""
        echo "Once you have the keys, run this script again and choose Option 1."
        ;;

    3)
        echo ""
        echo "Creating new development keys (recommended approach):"
        echo ""
        echo "🔑 For OpenAI API Key:"
        echo "1. Go to: https://platform.openai.com/api-keys"
        echo "2. Click '+ Create new secret key'"
        echo "3. Name it: 'GetHiredPOC Development'"
        echo "4. Copy the key (starts with sk-proj-...)"
        echo "5. ⚠️  IMPORTANT: Save it - you won't see it again!"
        echo ""
        echo "🌐 For Cloudflare AI Gateway Token:"
        echo "1. Go to: https://dash.cloudflare.com/$CLOUDFLARE_ACCOUNT_ID/ai/ai-gateway"
        echo "2. Find or create gateway: 'jobmatch-ai-gateway-dev'"
        echo "3. Get the API token from the gateway settings"
        echo ""
        echo "Once you have both keys, run this script again and choose Option 1."
        ;;

    4)
        echo ""
        echo "Manual setup instructions:"
        echo ""
        echo "1. Create the file: packages/backend/.dev.vars"
        echo "2. Add these lines:"
        echo ""
        echo "   OPENAI_API_KEY=your-openai-key-here"
        echo "   AI_GATEWAY_TOKEN=your-gateway-token-here"
        echo ""
        echo "3. Save and restart backend server"
        echo ""
        echo "Template file created at: packages/backend/.dev.vars.example"
        ;;

    *)
        echo "Invalid option. Exiting."
        exit 1
        ;;
esac

echo ""
echo "================================================"
echo ""
