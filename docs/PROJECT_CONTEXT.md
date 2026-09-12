# PROJECT_CONTEXT.md - System Overview

- **Last Updated:** 2026-08-31
- **Version:** 1.1.0
- **Owner:** AME Bazaar AI OS Core
- **Purpose:** High-level project summary to onboard any new AI agent or developer in under five minutes.
- **Dependencies:** Google Apps Script, WordPress REST API, Unsplash API, Gemini API
- **Status:** Active

---

## 1. Executive Summary
- **Client:** Apparel Maheshwari Enterprises (AME Bazaar)
- **Business Type:** Premium Offline Family Garment Retail Store (Men, Women, Kids)
- **Location:** Kirari, Delhi, India
- **Core Technology:** WordPress (CMS) + Astra Child Theme + PHP 8+ + HTML5/CSS3 + Vanilla JS
- **Core Strategy:** Drive local foot traffic to the physical store using search visibility (SEO & AI Search), transition into WooCommerce e-commerce, and lay foundations for private labels and franchise models.

## 2. Directory Layout & Architecture
This repository is configured as a local execution state ("AI Operating System") for AI development:
- `/docs`: Single source of truth documents (Master Plan, Context, Changelogs, Decisions).
- `/workflows`: Logical automated tasks and steps (Marketing, Sales, Customer Service).
- `/prompts`: Structured system and specialized prompt files for AI agent runs.
- `/memory`: Local JSON files storing configuration and dynamic settings.
- `/scripts`: Shell/PowerShell scripts for backup, recovery, startup, shutdown, and tests.
- `/gas_agent`: Source code for the Google Apps Script Fashion AI Content Engine.
- `/theme/astra-child/`: Custom child theme containing Astra CSS styles and layout custom functions.

## 3. AI Website Fashion Blog Agent (Fashion AI Content Engine)
Located under `/gas_agent/`, this named agent automates daily content planning, creation, and publishing inside the AME Bazaar AI Agent ecosystem:
- **Topic Generator (`TopicEngine.gs`, `Prompts.gs`)**: Seasonally adaptive (Delhi Monsoon, Winter, Summer) and festival-aware (Diwali, Eid, weddings) topic generation rotating among 10 business segments to maintain balanced coverage.
- **Image Engine (`ImageEngine.gs`)**: Fetches target-matching imagery via Unsplash API, uses a two-tier evaluation system:
  1. *Tier 1: Deterministic Semantic Verification* (alt/desc checks validating demographic gender/age parameters).
  2. *Tier 2: Gemini Vision* (multimodal visual validation).
- **Quality Gate (`SeoQualityEngine.gs`)**: Enforces strict Yoast SEO, AEO, and GEO quality audits. Features a zero-bypass semantic mismatch gate comparing article topics with the actual visual description of selected images to prohibit cross-gender/age errors (e.g. Men's wardrobe article matched to a female image).
- **WordPress Publisher (`WordPressPublisher.gs`)**: Translates topics into the 16-tier Controlled Taxonomy categories (Ladies Wear, Gents Wear, Kids Wear, etc.), resolving or creating them synchronously via the WP REST API, completely preventing `Uncategorized` publishing.

## 4. Environment Secrets & Settings
Configure these inside the Google Apps Script script properties or local `.env`:
- `GEMINI_API_KEY`: API token for Gemini content/critic calls.
- `UNSPLASH_ACCESS_KEY` / `UNSPLASH_SECRET_KEY`: Client access tokens for Unsplash search.
- `WORDPRESS_URL`: Root URL of the target WordPress installation.
- `WORDPRESS_USERNAME`: Authorized username for the REST endpoint.
- `WORDPRESS_APPLICATION_PASSWORD`: WP application password.

## 5. Testing Method
Unit tests are located in `/scripts/test_topic_system.js`. To execute the isolated diagnostic suite locally:
```bash
node scripts/test_topic_system.js
```
The test suite covers:
- Rejecting wrong-gender images (TEST A, TEST J)
- Rejecting adult/kids mismatches (TEST C, TEST D)
- Enforcing winter/summer/wedding seasonal constraints (TEST H, TEST I)
- Asserting category resolution rules (TEST F, TEST G)

## 6. High-Priority Constraints (Read Before Writing Code)
1. **No Javascript Frameworks:** React, Next.js, Vue, SPAs, and heavy frontend state libraries are strictly banned.
2. **Mobile First:** Over 80% of customer traffic is mobile. Styling must prioritize viewport scales.
3. **No Placeholders:** Code, pages, or content must be production-ready and functional. No "lorem ipsum" or dummy routes.
4. **Git Branch Workflow:** Commit only to `feature/<name>` branches and open Draft Pull Requests for human review.
5. **Image subject matches Article subject:** Never accept an image with wrong visual demographics simply because its generated SEO alt tags or filename were spoofed. Ground truth description is the final authority.
6. **No Uncategorized Posts:** A valid controlled category must always be mapped and resolved.

