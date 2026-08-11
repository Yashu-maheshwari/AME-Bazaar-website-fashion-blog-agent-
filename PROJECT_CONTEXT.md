# PROJECT_CONTEXT.md — AME Bazaar Fashion Content Agent

## 1. Identity
This project is the dedicated repository for the AME Bazaar autonomous fashion-content engine. Original implementation location: `Yashu-maheshwari/ame-bazaar-ai-os`.

## 2. Why it exists
The agent was built to reduce manual content work while improving AME Bazaar's local SEO, GEO/AI discoverability, trust, store visits and product discovery.

## 3. Architecture
`fashion_content_agent.js` is the orchestrator. It depends on:
- Gemini for topic/article/campaign generation.
- WordPress REST API for draft creation and media upload.
- WooCommerce REST API for related product discovery.
- OpenAI image generation when an OpenAI key is configured.
- Unsplash image fallback when OpenAI image generation is unavailable.
- Google Business Profile API for local-post publishing.
- JSON memory for topic queue, published topics and daily duplicate prevention.
- Windows Task Scheduler for unattended execution.

## 4. Generation contract
The content prompt is stored separately from code. Topic generation and article generation must remain prompt-driven so content rules can be changed without rewriting the orchestrator.

The article contract includes SEO/GEO-friendly structure, FAQs, social content, GBP content, featured-image prompt and other campaign assets.

## 5. Quality gates
The production path is intentionally fail-closed around important checks:
- required environment validation
- JSON parsing of Gemini response
- SEO score gate (current code blocks below 90)
- keyword density checks
- title keyword check
- H2 presence
- minimum content length
- production placeholder/mock-data rejection
- daily duplicate protection

## 6. CTA and commerce integration
The CTA block is generated from centralized business configuration. It can include phone, WhatsApp, Google Reviews, tailoring information, store address and dynamically retrieved WooCommerce products.

This is deliberately centralized so business facts are not duplicated throughout prompts/code.

## 7. WordPress behavior
Normal production execution creates a **draft**, not an immediately published article. The draft contains generated HTML, featured media and Yoast title/meta description fields.

Generated campaign assets are also stored locally under `projects/content-marketing/<slug>/`.

## 8. Google Business Profile behavior
OAuth token acquisition and local-post publishing are separate concerns.

`gmb_auth.js` obtains OAuth tokens and then attempts to discover the Business Profile account and location IDs. `test_gbp_publish.js` validates the IDs and tests temporary local-post creation/deletion. The production agent uses the same IDs.

Historical blocker: Google Cloud quota for the account-management/business-information API prevented account/location discovery even though OAuth succeeded. Never infer GBP health from OAuth alone.

## 9. Windows scheduling history
The task name is `AME_Bazaar_Content_Engine`.

The historical failure had two causes:
1. `schtasks` command quoting broke when `C:\Program Files\nodejs\node.exe` was used.
2. Creating the task with `/rl highest` required administrator rights.

A later recovery created the task successfully using the short Node path `C:\Progra~1\nodejs\node.exe` and a daily 09:00 schedule.

## 10. Verification history
The project has a dedicated `verify_agent.js` suite and QA script. Earlier work verified local topic selection/duplicate prevention, SEO/GEO HTML generation and schema logic. Live WordPress checks can fail when WordPress application credentials are unavailable; that is an environment issue, not proof that local generation logic is broken.

## 11. Secrets
Real values belong in `config/local.env` only. Never commit:
- Gemini API keys
- OpenAI API keys
- Google client secrets
- Google access/refresh tokens
- GBP account/location credentials if treated as sensitive
- WordPress application passwords

Keep only `.example` templates in Git.

## 12. Future AI workflow
Before changing anything:
1. Read `read.me`.
2. Read this file.
3. Inspect the current code and prompt files.
4. Inspect current verification/status information.
5. Identify whether the requested change affects code, prompts, memory, credentials, scheduler, WordPress, GBP or QA.
6. Make the smallest change that solves the requirement.
7. Run the narrowest relevant verification.
8. Update documentation when behavior or architecture changes.

## 13. Important implementation decisions
- Keep business configuration centralized.
- Keep prompts outside JavaScript.
- Keep topic memory persistent.
- Prevent accidental same-day duplicate campaigns.
- Use dry-run mode for safe generation testing.
- Use forced-topic mode for controlled testing.
- Do not silently publish low-quality content.
- Do not use placeholder/mock business data in production output.
- Continue the main workflow even when GBP publishing fails after retries; GBP is an auxiliary publishing channel rather than a reason to discard the WordPress draft.
- Keep generated campaign assets for audit/recovery.

## 14. Repository migration status
The target repository was initially empty except for a one-character `read.me`. The `read.me`, `PROJECT_CONTEXT.md`, and centralized `config/business_config.json` have now been added.

The original source repository remains the authoritative implementation snapshot until the remaining source files are physically mirrored here. Do not delete or modify the original source repository as part of this migration.
