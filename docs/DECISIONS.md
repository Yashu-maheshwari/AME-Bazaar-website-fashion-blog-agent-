# DECISIONS.md - Architectural Decision Log

- **Last Updated:** 2026-07-14
- **Version:** 1.0.0
- **Owner:** AME Bazaar AI OS Core
- **Purpose:** Historical log of all technical, design, and structural decisions made for the AME Bazaar AI Operating System.
- **Dependencies:** None
- **Status:** Active

---

## Architectural Decisions

### ADR 001: Core Architecture Framework (WordPress & Astra Child Theme)
* **Date:** 2026-07-14
* **Decision:** Reject modern Javascript frameworks (React, Vue, Angular, Next.js, SPAs) in favor of WordPress with an Astra Child Theme.
* **Rationale:** AME Bazaar requires a robust, locally deployable content management system that can easily scale into WooCommerce without requiring high developer maintenance. Standard WordPress meets the requirements for Local SEO, WooCommerce native plugins, stability, and compatibility with AI search spiders (JSON-LD Schema).
* **Status:** Approved / Permanent

### ADR 002: AI Operating System Directory Structure
* **Date:** 2026-07-14
* **Decision:** Establish `/docs`, `/workflows`, `/prompts`, `/memory`, and `/scripts` directory structure to serve as the local execution state and memory for AI agents.
* **Rationale:** By keeping the prompt definitions, business policies, and environment states in local files inside version control, we enable any AI agent (e.g., ChatGPT, Gemini) to immediately sync and resume work on any laptop without context loss.
* **Status:** Approved / Permanent

### ADR 003: Memory Storage Format (JSON Files in `/memory`)
* **Date:** 2026-07-14
* **Decision:** Use simple flat JSON structures in the `/memory` directory for settings, business properties, product configurations, and agent profiles.
* **Rationale:** JSON is lightweight, natively readable/writable by AI agents, and easily tracked under git versions, serving as a clean local state repository.
* **Status:** Approved / Permanent
