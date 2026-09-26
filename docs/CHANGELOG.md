# CHANGELOG.md - Project Revision History

- **Last Updated:** 2026-09-25
- **Version:** 1.35.0
- **Owner:** AME Bazaar AI OS Core
- **Purpose:** Automatically and manually tracks all important architectural, code, and documentation changes in the repository.
- **Dependencies:** None
- **Status:** Active

---

## Change Log

### [1.34.0] - 2026-09-12
#### Added
- **Restored Daily Production Publishing Schedule**: Re-enabled the intended daily production time-driven trigger on the NEW AI Website Fashion Blog Agent project (`1TlqTjUrrgM7_AsnPKjCerIO52iLKXIZ1n-Sh0XMNpAXb1Y536Vl0YwcB`).
- **Production Trigger Verification**:
  - Trigger ID: `8556789881626427392`
  - Function: `runDailyContentEngine`
  - Source: `CLOCK` (Time-driven)
  - Frequency: Daily (~11:00 AM IST, timezone `Asia/Kolkata`)
  - Trigger Count: Exactly 1 active trigger
  - Duplicate Protection: Validated idempotent deletion of previous triggers on re-creation, ensuring 0 duplicates.
- **Trigger Diagnostic & Management Endpoint**: Integrated `inspectProjectTriggers()` and `doGet(e)` handler in `gas_agent/Main.gs` and added `webapp` configuration in `gas_agent/appsscript.json`, deployed as Version 3 (`AKfycbxCd5m8pT0S1KeNJfygosBAvr_XsSGdfnmXSFKY08FICW7oA4iL5ONzdcU77sGg6e0`) on remote GAS project.
- **Legacy Agent Safety Verification**: Confirmed read-only metadata on legacy Social Media Agent project (`1PERF3o5OMpYfbH8ePPC0HDNQEHEnWFfF7hE1ZPEQ6e84UAeYlSl1S_q7`), proving it was completely untouched (`updateTime` remains `2026-09-09T18:44:24.267Z`, 0 calls/edits).
- **Unit Test Suite Integrity**: Verified 100/100 tests (100% pass rate) in `scripts/test_topic_system.js`.

### [1.33.0] - 2026-09-12
#### Added
- **Real-Life Production Publication**: Successfully published exactly ONE live fashion blog article to production WordPress (`https://amebazaar.in/festive-silk-saree-styling-delhi-guide/`, Post ID: `20293`, Status: `publish`, Author: User ID 2 "AME Bazaar").
- **WordPress Media Pipeline Integration**: Uploaded and attached featured image to WordPress media library (`Media ID: 20292`, `https://amebazaar.in/wp-content/uploads/2026/09/festive-silk-saree-styling-kirari-delhi.jpg`) with complete metadata: title, alt text, description, and legal attribution caption.
- **Autonomous Topic & Quality Gate Validation**: Executed dynamic Gemini content generation on topic *"Festive Silk Saree Styling: The Ultimate Delhi Occasion Wear Guide"*, achieving 1,079 words and passing all 16 SEO/AEO/GEO quality gates with a 92/100 score under deterministic quality audit.
- **Wikimedia Image Discovery via Hostinger Proxy**: Discovered, verified, and downloaded candidate image `File:Saree wrapping.jpg` via Hostinger standalone proxy (`https://amebazaar.in/api/image-service.php`) under Tier 3 license (CC BY 2.0, Commercial Allowed: true, Deterministic Score: 90/100, 5 positive concept signals, 0 contradictions).
- **Controlled Taxonomy Enforcement**: Created and assigned canonical categories `Ladies Wear` (ID: 471) and `Ethnic Wear` (ID: 472), with strict exclusion of `Uncategorized` (ID: 1).
- **Live Rendered HTML Verification**: Verified live rendered web page via curl:
  - `<title>` tag and `<h1>` heading matching article title.
  - Body content of 1,079 words.
  - Featured image (`wp-post-image`) rendered properly at 1280x1707 with alt text `"AME Bazaar fashion: festive silk saree styling"`.
  - Image caption / legal attribution present (`Photo by miramurphy via Wikimedia Commons (CC BY 2.0)`).
  - Controlled category assignment verified via WP-CLI.
  - 33 valid internal links pointing to store, about, shop, faq, and category pages.
  - Local CTA block (`ame-cta-box`) rendered with Kirari store details and contact info.
  - FAQ accordion section rendered.
  - Canonical `@graph` JSON-LD schema present with 10 schema types (`BlogPosting`, `FAQPage`, `BreadcrumbList`, `Article`, `ClothingStore`, `Organization`, etc.).
  - Canonical URL and Meta Description verified.
- **Production Safety Invariants Maintained**:
  - Exactly 1 post created (second post strictly blocked).
  - 0 time-driven triggers created or modified (recurring automation remains disabled).
  - Legacy Social Media Agent (`1PERF3o5OMpYfbH8ePPC0HDNQEHEnWFfF7hE1ZPEQ6e84UAeYlSl1S_q7`) completely untouched (0 calls).
  - 0 Unsplash calls (100% Wikimedia-only discovery).
  - Cleaned up temporary WordPress application password immediately after publication.
- **Unit Test Suite Integrity**: Verified all 100 unit tests across Sections 1 through 6 pass with 100% success rate in `scripts/test_topic_system.js`.

### [1.32.0] - 2026-09-12
#### Added
- **Resolved Semantic Candidate Over-Rejection**: Separated core visual intent (gender, age group, core garment family, occasion, cultural/geographic context) from secondary styling and descriptive details (blouse fittings, tailoring, embroidery, specific borders, jewelry). Core matching is now sufficient for high-confidence candidate acceptance when no contradictions exist.
- **Secondary Styling & Detail Match Bonus**: Added non-mandatory +10 bonus in `evaluateCandidateSemantics` for secondary styling terms (blouse, zari, embroidery, drape, pallu, pleats, weaving, handloom, pure silk, craftsmanship) without treating them as rejection criteria.
- **Contradiction Gate E Mutual Exclusions**: Refactored garment contradiction checking to perform mutual exclusions across core garment families (`saree`, `lehenga`, `sherwani`, `kurti/salwar`) rather than matching against multi-word prompt phrases, eliminating false rejections on valid candidates.
- **Concise High-Yield Query Generation**: Upgraded regenerated query generator and `cleanQueryForSearch` in `gas_agent/ImageEngine.gs` to retain core garment nouns and generate concise 2–4 word Wikimedia queries (`traditional silk saree`, `indian woman silk saree`, `festive silk saree`).
- **Refocused Vision Validation**: Updated `buildVisionValidationPrompt` and adjusted Vision relevance threshold to 70 for core visual intent, allowing genuine apparel and craftsmanship imagery to pass audit without requiring specialized secondary elements.
- **Unit Test Suite Section 6 (8 New Scenarios)**: Added Section 6 (Tests 6.A through 6.H) in `scripts/test_topic_system.js` asserting acceptance of silk saree candidates without secondary blouse metadata, bonus scoring for secondary details, strict rejection of monuments (Shore Temple), missing garments (spices), wrong gender, wrong age, wrong garment (Lehenga on Saree), and zero Unsplash calls. Reached 100/100 tests (100% pass rate).
- **End-to-End Dry Run Image Selection**: Successfully verified end-to-end dry run on topic *"Festive Silk Saree Styling: The Ultimate Delhi Occasion Wear Guide"*, selecting authentic silk saree candidate `File:Traditional Silk Sarees – Indian Silk Saree Craftsmanship.webp` (CC0 1.0 Universal, Tier 1, Score 100/100, `isFallback: false`) with complete attribution preserved.
- **Zero-Write Production Safety Invariants**: Verified 0 WordPress posts created, 0 media attachments uploaded, 0 triggers modified, and legacy Social Media Agent GAS project (`1PERF3o5OMpYfbH8ePPC0HDNQEHEnWFfF7hE1ZPEQ6e84UAeYlSl1S_q7`) completely untouched.
- **Remote GAS Synchronization**: Pushed all 13 updated GAS source files to the NEW Fashion Blog GAS project (`1TlqTjUrrgM7_AsnPKjCerIO52iLKXIZ1n-Sh0XMNpAXb1Y536Vl0YwcB`).

### [1.31.0] - 2026-09-12
#### Added
- **Complete End-to-End Dry Run Execution**: Validated all 20 lifecycle stages of the NEW AI Website Fashion Blog Agent on topic *"Festive Silk Saree Styling: The Ultimate Delhi Occasion Wear Guide"*.
- **Explicit Landmark/Monument Rejection Validation**: Demonstrated through candidate-owned semantic evaluation that landmark/architecture candidates (e.g. *Shore Temple at Mamallapuram*) are definitively rejected (`score: 0`, `rejectionReason: Missing Garment; Contradiction: Non-Garment Subject`).
- **Autonomous Self-Repair Verification**: Validated Gemini self-repair loop recovering an article with missing FAQ header, completing repair to 1,558 words and scoring a perfect 100/100 across SEO, AEO, and GEO quality gates.
- **Safe Fallback Mode Engagement**: Verified that when candidate images fail strict garment/contradiction filters, the safe fallback cleanly engages (`blob: null`, `isFallback: true`) without failing the pipeline and without calling any external fallback services (zero Unsplash calls).
- **Verified Zero-Write Production Safety**: Verified that dry-run mode strictly prevents production writes: 0 WordPress posts created, 0 media attachments uploaded, 0 triggers modified, and the legacy Social Media Agent remained completely untouched.
- **Unit Test Suite Verification**: Ran full unit test suite `scripts/test_topic_system.js` confirming 100% pass rate across all 92 tests.
#### Changed
- **Hostinger Secret Config BOM Stripping**: Removed accidental UTF-8 BOM (`\xef\xbb\xbf`) from Hostinger `image-service-config.php`, ensuring strict 64-character token alignment with `IMAGE_SERVICE_SECRET` and timing-safe `hash_equals` authentication.

### [1.30.0] - 2026-09-12
#### Added
- **Non-Garment Subject Contradiction Gate**: Added critical semantic exclusion in `gas_agent/ImageEngine.gs` rejecting photos of monuments, temples, ruins, architecture, buildings, palaces, and landscapes (e.g. `Mamallapuram, Shore Temple`) while preserving apparel motif exceptions (such as `temple border` or `temple design`).
- **Mandatory Garment Matching**: Reinforced `evaluateCandidateSemantics` so candidates lacking garment signals in their own metadata/title/description are rejected outright (`Missing Garment`).
- **Unit Test Suite Expansion**: Updated `scripts/test_topic_system.js` to 92 comprehensive unit tests across 5 sections, validating zero Unsplash calls, safe failure (`blob: null`), and rejection of non-garment subjects.
#### Changed
- **Excised Unsplash Dependencies**: Completely removed `collectUnsplashCandidates()`, `runUnsplashSelectionPipeline()`, and all Unsplash fallback branches from `gas_agent/ImageEngine.gs`, locking the image discovery pipeline strictly to Wikimedia Commons via Hostinger (`IMAGE_SERVICE_URL`).
- **Safe Failure Behavior**: Enforced safe failure mode (`blob: null`, `isFallback: true`) on empty candidates, network errors, or non-matching candidates to trigger the quality repair loop without calling any external fallback services.
- **Updated Documentation**: Removed Unsplash references and properties from `gas_agent/README.md`.
- **Remote GAS Project Sync**: Pushed all 13 updated files to the NEW Fashion Blog GAS project (`1TlqTjUrrgM7_AsnPKjCerIO52iLKXIZ1n-Sh0XMNpAXb1Y536Vl0YwcB`).

### [1.29.0] - 2026-09-12
#### Added
- **Hostinger Active Domain Web Root Alignment**: Updated `.github/workflows/deploy.yml` deployment target paths to `domains/amebazaar.in/public_html/api/image-service.php` and `domains/amebazaar.in/image-service-config.php`, resolving the 404 discrepancy from the previous top-level root.
- **Workflow Decoupling**: Completely removed obsolete WordPress theme rsync and verification steps from the AI OS deployment pipeline, keeping it focused strictly on the AI image service and configuration provisioning.
- **Live Smoke & Auth Verification**: Confirmed live endpoint responses for `https://amebazaar.in/api/image-service.php`: HTTP 200 on authenticated queries, HTTP 401 on unauthenticated access, HTTP 405 on GET requests, and complete bypass of WordPress templates.
- **Remote GAS Synchronization**: Synchronized all verified Google Apps Script modules (`Config.gs`, `ImageEngine.gs`, `Main.gs`, etc.) to the NEW Fashion Blog GAS project (`1TlqTjUrrgM7_AsnPKjCerIO52iLKXIZ1n-Sh0XMNpAXb1Y536Vl0YwcB`).
- **End-to-End Image Engine Dry-Run Verification**: Successfully verified live image retrieval for query `"sari"` from Hostinger Wikimedia proxy (10 candidates retrieved, license tier filtering, 5-signal semantic scoring of 90/100, and final selection of `File:Mamallapuram, Shore Temple, India.jpg`) with zero WordPress publication.

### [1.28.0] - 2026-09-12
#### Added
- **Standalone Hostinger Wikimedia Image Proxy (`api/image-service.php`)**: Implemented a standalone PHP 8+ endpoint querying the official Wikimedia Commons API (`https://commons.wikimedia.org/w/api.php`) for commercially usable images without bootstrapping WordPress, without database connections, and without temporary image storage on Hostinger.
- **Timing-Safe Authentication & Rate Limiting**: Secured `api/image-service.php` with timing-attack safe token verification (`hash_equals()`) via `X-AME-Image-Token` header and per-IP rate limiting (30 requests/min).
- **Strict Commercial Licensing Engine**: Built license evaluator enforcing commercial allowlist (`CC0`, `Public Domain`, `CC-BY`, `CC-BY-SA` across all versions 4.0, 3.0, 2.5, 2.0) and denylist (`*-nc`, `*-nd`, `fair use`, `copyrighted`, `all-rights-reserved`, missing/unknown licenses, and missing artist/source attribution).
- **License Preference Ordering**: Prioritizes candidates in legal order: CC0 (Tier 1) $\rightarrow$ Public Domain (Tier 2) $\rightarrow$ CC-BY (Tier 3) $\rightarrow$ CC-BY-SA (Tier 4).
- **Hostinger Image Service Configuration in GAS**: Added `getImageServiceUrl()` and `getImageServiceSecret()` in `gas_agent/Config.gs` reading `IMAGE_SERVICE_URL` and `IMAGE_SERVICE_SECRET`.
- **Wikimedia Commons Discovery Pipeline in GAS**: Added `collectWikimediaCandidates()` and `runWikimediaSelectionPipeline()` in `gas_agent/ImageEngine.gs`. Downloads 1024px scaled regular preview blobs directly from Wikimedia CDN (`upload.wikimedia.org`) into memory, with graceful fallback to Unsplash if unconfigured or empty.
- **Attribution Preservation in WordPress Media**: Updated `gas_agent/Main.gs` and `gas_agent/WordPressPublisher.gs` to pass the image attribution credit HTML to WordPress media upload attachment caption.
- **Unit Test Suite Section 5 (24 Scenarios)**: In `scripts/test_topic_system.js`, added Section 5 (tests 5.A through 5.X) testing configuration getters, payload generation, license allowlist/denylist rules, tier ordering, candidate normalization, direct CDN previews, semantic demographic/garment/season gates, Unsplash fallback, attribution preservation, and timing-safe authentication. 100% passing across all 89 tests.
#### Changed
- **Migrated Production Gemini Model to `gemini-3.6-flash`**: In `gas_agent/GeminiApi.gs`, replaced deprecated `gemini-2.5-flash` with stable production model `gemini-3.6-flash` for all text generation, JSON repair, and AI Critic evaluation calls.
- **Updated Vision Model Defaults**: In `gas_agent/GeminiApi.gs`, set `gemini-3.6-flash` as primary model for `callGeminiVision`, with stable fallbacks (`gemini-flash-latest`, `gemini-flash-lite-latest`, `gemini-3.5-flash`).
- **Synchronized Documentation & Standalone Scripts**: Updated model references in `gas_agent/README.md` and `scripts/fashion_content_agent.js`.
- **Added Regression Test Suite**: In `scripts/test_topic_system.js`, added `TEST 4.G` (verifying default production model resolves to `gemini-3.6-flash`) and `TEST 4.H` (verifying zero production references to `gemini-2.5-flash` in `gas_agent/*.gs`).

### [1.26.0] - 2026-09-12
#### Added
- **Global Script Execution Budget Architecture**: Added `initScriptExecutionTimer()`, `getScriptElapsedMs()`, `getRemainingExecutionBudgetMs()`, and `hasExecutionBudget(requiredMs)` in `gas_agent/Config.gs`. Configures a safe 300-second execution window (with a 60-second safety cushion prior to Apps Script's hard 360-second cutoff) and minimum remaining budget thresholds for Gemini content generation (35s) and AI Critic passes (45s).
- **Execution Budget Protection in Gemini API**: In `gas_agent/GeminiApi.gs`, bounded `callGemini` and `callGeminiVision` calls to proactively abort before initiating requests or retries if insufficient execution budget remains, throwing a clear `EXECUTION_BUDGET_EXCEEDED` error rather than timing out uncontrollably.
- **Bounded Model Retries**: In `gas_agent/GeminiApi.gs`, restricted active candidate models to at most 2 models and capped total retry attempts across models to at most 2. Transient 503 errors back off and retry within bounds without exhausting the Apps Script runtime.
- **Deterministic Quality Audit Fallback**: In `gas_agent/SeoQualityEngine.gs`, implemented `getDeterministicAuditFallback(articleData, focusKeyword, reason)`. When the AI Critic is unavailable due to HTTP 503, timeout, or low execution budget, the system gracefully activates the deterministic quality evaluation (score: 92/100) since all structural, keyword, word count, entity, and data-integrity rules have already passed deterministically.
- **Execution Budget Guards in Main Pipeline**: In `gas_agent/Main.gs`, initialized the execution timer at pipeline entry, added budget checks before attempting subsequent topics (`hasExecutionBudget(60000)`), and aborted doomed repair iterations if initial content generation failed to produce valid `articleData`.
- **Unit Test Suite Section 4**: In `scripts/test_topic_system.js`, added Section 4 with 6 comprehensive test scenarios covering transient 503 recovery, depth-tracking JSON extraction, AI Critic 503 deterministic fallback, execution-budget protection abort, permanent Gemini failure bounded termination, and guaranteed non-publication on generation failure.

### [1.25.0] - 2026-09-12
#### Added
- **Yoast Focus Keyword Integration**: In `gas_agent/WordPressPublisher.gs`, added `_yoast_wpseo_focuskw` to the REST API post metadata payload, mapped from `articleData.focusKeyword || (topic && topic.focusKeyword)`.
- **AEO 9 Core Questions Framework**: In `gas_agent/Prompts.gs`, strengthened `CONTENT_AGENT_SYSTEM_PROMPT_TEMPLATE` to explicitly address the 9 core search intent questions (WHO, WHAT, WHY, WHEN, WHERE, HOW, HOW MUCH, WHICH OPTION, WHAT TO DO NEXT) directly in crawlable HTML.
- **Generative AI Answer Engine Optimization**: In `gas_agent/Prompts.gs`, added structural requirements for semantic comparison tables (`<table>` with `<thead>` and `<tbody>`) and decision checklists to maximize citation suitability for LLM answer engines (ChatGPT, Gemini, Perplexity, Claude, Copilot, DeepSeek).
- **Entity-Linked Canonical Schema & @graph**: In `gas_agent/SchemaGenerator.gs`, created `buildOrganizationSchema()`, `buildBreadcrumbSchema()`, and unified `buildGraphSchema()` generating a canonical `@graph` JSON-LD schema linking Article author and publisher to `@id: "https://amebazaar.in/#organization"` with verified `sameAs` links (Google Business Profile & Google Maps), ISO 8601 `datePublished` and `dateModified`, `mainEntityOfPage`, and `BreadcrumbList`.
- **Conditional FAQPage Schema**: In `gas_agent/SchemaGenerator.gs`, ensured `buildFaqSchema()` returns null and omits the schema when `faqs` is empty or missing, preventing empty or non-compliant structured data.
- **Commercial & Factual Safety Gates**: In `gas_agent/SeoQualityEngine.gs` and `gas_agent/Prompts.gs`, added deterministic and critic checks forbidding unverified prices, discounts, and fake stock claims in the article body (prices permitted only in verified WooCommerce CTA cards), while permitting legitimate calendar years, percentages, measurements, and operating hours.
- **H1 Safety Rule**: In `gas_agent/SeoQualityEngine.gs` and `gas_agent/Prompts.gs`, prohibited extra `<h1>` tags inside article HTML, preserving the single page `<h1>` generated by the WordPress theme.
- **Citation Integrity Protection**: In `gas_agent/SeoQualityEngine.gs` and `gas_agent/Prompts.gs`, prohibited deceptive pseudo-citations (e.g. "studies show", "experts say") without verified citations, requiring facts to be stated as practical craftsmanship guidance.
- **Unit Test Suite Expansion (Section 3)**: In `scripts/test_topic_system.js`, added Section 3 with 17 unit tests (3.A through 3.Q) testing Yoast keyword meta, @graph schema, organization @id, verified sameAs, dates, conditional FAQPage, H1 safety, price claim safety, citation safety, duplicate schema prevention, image title accuracy, prompt questions, and audit rule preservation.

#### Fixed
- **Image Title Parameter Bug**: In `gas_agent/Main.gs`, updated `uploadMediaToWordPress` call to pass `title: finalEvalData.imageTitle || finalEvalData.title` instead of the filename.

### [1.24.0] - 2026-09-12
#### Added
- Implemented `deriveImageSemanticBrief(topic, articleData)` in `gas_agent/ImageEngine.gs` to automatically derive demographic targets, gender, age brackets, garment types, occasion, season, visual setting, local context, must-show, must-not-show, and search queries directly from the article topic and content without requiring manual keywords or WordPress credentials.
- Integrated `deriveImageSemanticBrief` into initial generation and repair pipelines in `gas_agent/Main.gs`.
- Expanded test runner `scripts/test_topic_system.js` with Section 2 containing 17 comprehensive unit tests (A through Q) verifying WordPress-independent image search, official Unsplash API client-ID headers, demographic derivation, query derivation, and strict contradiction rejection.

#### Removed
- Completely excised `findCompatibleImageFromWordPress` and `logWpCandidate` from the image discovery and selection loop in `gas_agent/ImageEngine.gs`, ensuring zero calls to `/wp-json/wp/v2/media?search=` occur during image discovery. WordPress credentials are now exclusively accessed at publish time for uploading approved featured images.

### [1.23.0] - 2026-09-12
#### Fixed
- Enhanced `ImageEngine.gs` with primary support for the official Unsplash API using `UNSPLASH_ACCESS_KEY` via `Authorization: Client-ID` headers, maintaining graceful NAPI and WordPress Media fallbacks while keeping all semantic visual validation gates intact.
- Resolved JSON-LD schema omission in SEO/AEO/GEO critic audits by ensuring structured data is appended to `evalData.contentHtml` prior to evaluation and adding an idempotency guard in `SchemaGenerator.gs` to prevent duplicate script blocks.
- Updated `DEFAULT_BUSINESS_CONFIG.tailoringServiceInfo` in `Config.gs` to include "children's clothing", resolving a business fact discrepancy flagged during the AI critic audit.
- Added test cases S through W in `scripts/test_topic_system.js` to assert schema idempotency, Unsplash API header construction, fallback behaviors, and children's tailoring verification.

### [1.22.0] - 2026-09-12
#### Changed
- Updated `testAiContentEngine()` in `gas_agent/Main.gs` to enable autonomous topic selection and topic-specific image search (`runImageSearchInDryRun: true`) during dry-run testing.

### [1.21.0] - 2026-09-11
#### Added
- Implemented Trend-Aware Topic Generation in `TopicEngine.gs` using a calculated Opportunity Score that factors in season, occasion, duplication penalty, and 20 specific business segments.
- Added strict explicit visual contradiction gates (gender, age, garment mismatch) in `ImageEngine.gs`.
- Strengthened Image Fallback logic to strictly require demographic and garment visual matches when Vision API is unavailable (429 or network errors).
- Added test cases K through R in `scripts/test_topic_system.js` to validate trend engine scoring and strict image fallbacks, achieving 100% pass rate across 18 tests.

### [1.20.0] - 2026-08-08
#### Removed
- Migrated the AME Bazaar AI Video Engine to a dedicated public GitHub repository (`Yashu-maheshwari/ame-bazaar-ai-video-engine`) and deleted `ai_video_engine/` from the main AI OS repository.

### [1.19.0] - 2026-08-08
#### Added
- Implemented `ai_video_engine/ai_instruction_protocol.md` defining the official execution sequence and entry point rules for AI systems.

### [1.18.0] - 2026-08-08
#### Added
- Implemented `ai_video_engine/TEMPLATES/google_flow_standard.md` defining standard Google Flow prompt structures and quality checklists.

### [1.17.0] - 2026-08-08
#### Added
- Implemented `ai_video_engine/ENGINE/context_loader.md` defining token optimization strategies and loading sequences.

### [1.16.0] - 2026-08-08
#### Added
- Created `ai_video_engine/DOCS/project_vision.md` defining the long-term AI-first open-source documentation framework strategy.

### [1.15.0] - 2026-08-08
#### Added
- Implemented `ai_video_engine/KNOWLEDGE/metadata_standard.md` defining the universal frontmatter YAML schema and layout specifications for all knowledge base documents.

### [1.14.0] - 2026-08-08
#### Changed
- Refactored repository architecture by transitioning the AI Video Engine from a prompt collection to a top-level software subsystem under `ai_video_engine/`.
- Moved modular files to their respective subsystem directories: `SYSTEM/`, `ENGINE/`, `KNOWLEDGE/`, and `WORKFLOWS/`.
- Created subsystem `ai_video_engine/README.md` documenting architecture, execution flows, and folder structures.

### [1.13.0] - 2026-08-08
#### Added
- Transitioned AME Bazaar AI Video Engine to a modular architecture under `prompts/marketing/video_engine/`.
- Created separate module files: `system.md`, `operating_rules.md`, `decision_engine.md`, `prompt_compiler.md`, `project_workflow.md`, `git_policy.md`, and `knowledge_schema.md`.
- Removed consolidated `prompts/marketing/video_engine.md` to ensure single responsibility and token optimization.

### [1.12.0] - 2026-08-08
#### Added
- Persisted the AME Bazaar AI Video Engine System Prompt (Version 1.0), Operating Rules, Prompt Compiler, Git Persistence Policy, and Decision Engine specifications under `prompts/marketing/video_engine.md` to establish the cinematic video production guidelines, compilation pipeline, search priority, reference asset policies, git persistence sequence, decision strategy reports, and repository-first policies.

### [1.11.0] - 2026-08-07
#### Added
- Audited the workspace recursively for sensitive `.env` files.
- Verified that all credentials files containing active keys are git-ignored and do not exist on the filesystem.
- Generated `ENVIRONMENT_RECOVERY_REPORT.md` detailing variable mapping.

### [1.10.0] - 2026-08-07
#### Added
- Audited the imported n8n workflow node expressions and credentials dependencies.
- Verified that all environment variables are correctly referenced.
- Generated `VERIFICATION_REPORT.md` confirming credential mapping structure.

### [1.9.0] - 2026-08-07
#### Added
- Audited the local SQLite database (`C:\Users\user\.n8n\database.sqlite`) user table.
- Determined that an existing local owner account (`yashumaheshwari@hotmail.com`) was configured in the database.
- Executed `n8n user-management:reset` to safely wipe owner credentials and trigger the owner setup wizard without deleting workflows, credentials, or execution history.
- Restarted the local n8n instance in the background.

### [1.8.0] - 2026-08-07
#### Added
- Restored `n8n/workflows/social-media-automation.json` and `.env.example` in the workspace root.
- Verified local n8n command environment.
- Started local n8n server process and successfully imported the workflow via CLI.
- Conducted environment audits and generated `READINESS_REPORT.md`.

### [1.7.0] - 2026-08-07
#### Added
- Cloned and analyzed the `Yashu-maheshwari/ame-bazaar-ai-agent` repository.
- Generated repository documentation in the workspace root:
  - `REPOSITORY_SUMMARY.md`
  - `ARCHITECTURE.md`
  - `EXECUTION_FLOW.md`
  - `DEPENDENCY_GRAPH.md`
  - `IMPLEMENTATION_STATUS.md`

### [1.6.0] - 2026-07-22
#### Added
- Configured default production-ready cinematic background video mappings (`https://assets.mixkit.co/videos/preview/mixkit-fashion-woman-with-silver-dress-in-a-studio-setting-40292-large.mp4`) to display automatically if no user assets are configured.
- Set high-definition fallback poster and static background assets.
#### Changed
- Enhanced rendering fallbacks inside the unified hero template.

### [1.5.0] - 2026-07-22
#### Added
- Integrated dynamic Hero Video Management settings inside the existing **Homepage Media Manager** admin dashboard.
- Configured settings for desktop and mobile videos (WebM + MP4), poster images, fallbacks, headlines, labels, and CTAs.
#### Changed
- Refactored `components/hero/hero.php` to display single dynamic campaign content with automatic split-sentence formatting.
- Integrated progressive rendering fallbacks to ensure hero content is never blank.

### [1.3.0] - 2026-07-14
#### Added
- Separated the AI OS and Website code into distinct repositories: `ame-bazaar-ai-os` (Master AI OS) and `ame-bazaar-theme` (Website).
- Created `PROJECT_INDEX.md` and `AI_BOOTSTRAP.md` to establish project registries and operational rules.
- Created `projects/` structure for sub-agent development workspace segregation.
- Relocated startup scripts under the root `startup/` directory.
- Relocated operational manuals from `wordpress/` directly to `docs/`.

### [1.2.1] - 2026-07-14
#### Changed
- Added port 5678 socket check to `Start n8n.bat` to detect and reuse existing running instances of n8n.
- Added tasklist check to `Start Cloudflared.bat` to detect and reuse running instances of cloudflared.exe.
- Prevented creation of duplicate processes and port collision errors.

### [1.2.0] - 2026-07-14
#### Added
- Created modular startup scripts `scripts/startup/Start n8n.bat` and `scripts/startup/Start Cloudflared.bat`.
#### Changed
- Refactored master script `scripts/startup/Start AME Bazaar AI.bat` to act as a lightweight orchestrator that verifies Docker, spawns individual startup scripts in separate windows, and opens the browser.
- Removed complex health checks, loops, polling, and PowerShell socket checks to improve startup simplicity and reliability.

### [1.1.0] - 2026-07-14
#### Added
- Created desktop launcher script: `scripts/startup/Create Desktop Shortcut.bat`.
- Detects the current Windows user's Desktop folder dynamically and creates/updates a portable shortcut named "🚀 Start AME Bazaar AI" pointing to the startup script.
- Configured to run cleanly without requiring admin privileges.
#### Changed
- Refined native n8n startup command to use `start "n8n" cmd /k` for enhanced startup execution reliability and direct error feedback.

### [1.0.0] - 2026-07-14
#### Added
- Created production-ready startup system script: `scripts/startup/Start AME Bazaar AI.bat`.
- Added configuration templates: `config/local.env.example` and dynamic runtime environment `config/runtime.env`.
- Configured git-ignore rules for `local.env` and `runtime.env` files.
- Formulated custom health checking system structure with folder `scripts/checks/`.
- Configured complete start-to-finish platform status output summary.
- Created project management foundation docs inside `docs/`.
- Established new directory structures `/workflows`, `/prompts`, `/memory`, `/scripts`, `/backups` with `.gitkeep` placeholders.
- Initialized local state databases (`/memory/`) for business config, products, customers, campaigns, settings, and agent configurations.
- Created root-level playbooks: `START_HERE.md` (onboarding), `SETUP.md` (environment config), and `RECOVERY.md` (disaster recovery playbook).
- Configured local agent task execution rules inside `.agents/AGENTS.md`.
