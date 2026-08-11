# Migration Manifest

## Original source
`Yashu-maheshwari/ame-bazaar-ai-os`

## Dedicated target
`Yashu-maheshwari/AME-Bazaar-website-fashion-blog-agent-`

## Core files from the original implementation

| Source path | Role | Target status |
|---|---|---|
| `scripts/fashion_content_agent.js` | Production content orchestrator | Source of truth retained in original repo; physical mirror pending |
| `scripts/verify_agent.js` | Verification suite | Source of truth retained in original repo; physical mirror pending |
| `scripts/gmb_auth.js` | GBP OAuth + account/location discovery | Source of truth retained in original repo; physical mirror pending |
| `scripts/test_gbp_publish.js` | GBP temporary publish test | Source of truth retained in original repo; physical mirror pending |
| `scripts/run-qa.js` | QA automation | Source of truth retained in original repo; physical mirror pending |
| `prompts/seo/content_agent_system_prompt.txt` | Article/campaign generation contract | Source of truth retained in original repo; physical mirror pending |
| `prompts/seo/topic_generator_prompt.txt` | Topic generation contract | Source of truth retained in original repo; physical mirror pending |
| `config/business_config.json` | Centralized business facts | **Copied to target** |
| `config/local.env` | Runtime secrets | **Must remain local; never copy into Git** |
| `config/local.env.example` | Environment template | Source of truth retained in original repo; physical mirror pending |
| `memory/published_topics.json` | Topic queue + published registry | Source of truth retained in original repo; physical mirror pending |
| `memory/daily_execution_history.json` | Daily duplicate guard | Source of truth retained in original repo; physical mirror pending |
| `projects/content-marketing/` | Generated campaign artifacts | Source of truth retained in original repo; physical mirror pending |
| `logs/` | Runtime logs | Do not treat logs as source code |
| `startup/` | Windows launch helpers | Source of truth retained in original repo; physical mirror pending |

## Documentation added to target

- `read.me` — human + AI onboarding and operational overview
- `PROJECT_CONTEXT.md` — permanent architecture, decisions, integrations, known issues and recovery logic
- `MIGRATION_MANIFEST.md` — migration tracking
- `config/business_config.json` — centralized business configuration

## Important rule
Do not copy `config/local.env` or any real credential-bearing file into the public/dedicated repository. Runtime secrets must be recreated locally from the environment template.

## Future migration completion rule
The migration is complete only when the target contains the required source scripts, prompts, safe configuration templates, persistent memory required for continuity, verification utilities, and relevant documentation. After copying, run the verification suite from the target repository and compare behavior against the original source snapshot.
