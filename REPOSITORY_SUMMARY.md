# REPOSITORY_SUMMARY.md - AME Bazaar AI Agent Library

## 1. Overview
The `Yashu-maheshwari/ame-bazaar-ai-agent` repository is the master repository hosting the multi-agent automation framework for **Apparel Maheshwari Enterprises (AME Bazaar)**. 
The core objective of this library is to automate marketing, content management, and business growth tasks using **n8n** as the orchestrator, deployed to **Render** with a persistent **PostgreSQL** database.

---

## 2. Directory Layout
The repository is structured as follows:

```text
ame-bazaar-ai-agent/
├── agents/                   # Target directory for specialized sub-agents
│   ├── analytics/            # Analytics reporting agent (placeholder)
│   ├── blog/                 # WordPress blog posting agent (placeholder)
│   ├── reviews/              # Customer review responder agent (placeholder)
│   ├── seo/                  # Search engine optimization agent (placeholder)
│   ├── social-media/         # Social media poster agent (placeholder)
│   └── whatsapp/             # WhatsApp customer response agent (placeholder)
├── assets/                   # Brand assets, watermarks, logo overlays, and media
├── backups/                  # Automated database and workflow backups
├── docs/                     # Setup guides and internal agent documentation
├── knowledge/                # Permanent AI brand guidelines and context
│   ├── brand-voice.md        # Tone and style requirements (Hinglish, premium)
│   ├── business-context.md   # High-level details of AME Bazaar (Kirari, Delhi)
│   ├── marketing-rules.md    # Posting rules and restricted details
│   ├── posting-strategy.md   # Posting frequencies and active platforms
│   └── sop.md                # Error-handling and escalation guidelines
├── memory/                   # Local logs tracking runtime executions
│   ├── daily-log.md          # Chronological daily status log
│   ├── error-log.md          # Failures and unexpected runtime logs
│   ├── execution-history.md  # Historical runs and task logs
│   └── posted-content.md     # Index of successfully published posts
├── n8n/
│   └── workflows/
│       └── social-media-automation.json  # Production Social Media Automation Engine workflow
├── .env.example              # Environment variables template
├── .gitignore                # Git ignore configuration
├── Dockerfile                # Deployment container blueprint for n8n
├── README.md                 # Primary library documentation
└── render.yaml               # Infrastructure blueprint for Render Web Service + PostgreSQL
```

---

## 3. Key Core Capabilities
- **Automated Social Media Post Generation:** Publishes products automatically from Google Drive to Instagram Feed/Stories, Facebook Pages, Threads, and Google Business Profile.
- **Dynamic Image Branding:** Automates watermark overlays and image dimensions formatting using Cloudinary before publishing.
- **AI Content Copywriting:** Utilizes Google Gemini 1.5 Pro Vision to write high-engagement Hinglish captions based on the product image.
- **Enterprise-Ready Infrastructure:** Self-hosts n8n on Render via Docker, backed by PostgreSQL, ensuring stateless operation with stateful logs.
