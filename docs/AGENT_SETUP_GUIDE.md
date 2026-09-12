# AME Bazaar Fashion Content Marketing Agent - Setup & Testing Guide

This guide describes how to configure, run, and verify the AME Bazaar Fashion Content Marketing Agent.

## 1. Environment Configuration

Add the following environment variables to your `config/local.env` file (stored locally and never committed):

```bash
# Gemini API Settings
GEMINI_API_KEY=your_gemini_api_key_here
GEMINI_MODEL=gemini-flash-latest

# WordPress Integration Credentials
WORDPRESS_URL=https://your-wordpress-site.com
WORDPRESS_USERNAME=admin
WORDPRESS_APPLICATION_PASSWORD=xxxx xxxx xxxx xxxx xxxx
```

## 2. Topic and Memory Database

The agent tracks published posts and queuing in [published_topics.json](file:///C:/Users/user/.gemini/antigravity/scratch/ame-bazaar-ai-os/memory/published_topics.json):
- `queue`: Upcoming fashion topics to generate.
- `published`: History of already published posts (to prevent duplicates).

## 3. Verification Commands

### Dry Run (Generate content and verify SEO/GEO structure without publishing)
```bash
node scripts/fashion_content_agent.js --dry-run
```

### Verbose Dry Run (Print LLM inputs and full outputs)
```bash
node scripts/fashion_content_agent.js --dry-run --verbose
```

### Force Topic Generation
```bash
node scripts/fashion_content_agent.js --dry-run --force-topic "Winter Layering Styles for Mubarakpur Shoppers"
```

### Direct WordPress Publish (Production Mode)
```bash
node scripts/fashion_content_agent.js
```

## 4. Scheduling & Automation

To schedule the agent to run automatically:
1. Configure `config/agent_config.json`:
   ```json
   {
     "schedule": "weekly",
     "autoPublish": true
   }
   ```
2. Schedule a Windows Task Scheduler task pointing to `scripts/fashion_content_agent.js` to trigger daily or weekly.
