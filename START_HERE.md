# START_HERE.md - AI & Developer Onboarding

- **Last Updated:** 2026-07-14
- **Version:** 1.2.0
- **Owner:** AME Bazaar AI OS Core
- **Purpose:** Onboarding guide for humans and AI agents to understand the project structure, vision, rules, and status in under five minutes.
- **Dependencies:** None
- **Status:** Approved

---

## 1. Quick Launch
To start the entire AME Bazaar AI Operating System environment locally:
1. Run `startup/Start AME Bazaar AI.bat` (or use the created Desktop launcher shortcut).
2. The script orchestrates:
   - Ensuring Docker Desktop is running.
   - Launching native `n8n` in a separate window (detects and reuses if port 5678 is already active).
   - Launching native `cloudflared` tunnel in a separate window (detects and reuses if already running).
   - Auto-opening the n8n console at `http://localhost:5678`.

## 2. What This Project Is
This repository (`ame-bazaar-ai-os`) is the **Single Source of Truth** for the AME Bazaar AI Operating System. It contains the core system architecture, startup orchestration, backups, automation workflows, AI prompts, and business operational manuals.

The client-facing website and WooCommerce theme are located in the sister repository `ame-bazaar-theme`.

## 3. Business Vision
To scale **AME Bazaar** (Apparel Maheshwari Enterprises) from a trusted offline family garment retailer in Kirari, Delhi, into an omnichannel fashion platform. The business model transitions through four stages:
1. **Local Dominance:** Drive physical store foot traffic using Hyperlocal SEO and AI Search Optimization.
2. **WhatsApp commerce:** Catalogs and order placement routed directly via WhatsApp.
3. **WooCommerce Transactions:** Full-scale automated e-commerce.
4. **Scale:** Private label products and nationwide franchise networks.

## 4. Project Stage & Milestone
- **Current Stage:** Phase 1 (Theme Foundation Setup Completed).
- **Current Milestone:** Milestone 1: AI Operating System Core Repository Setup (Decoupled & Separated).
- **Active Branch:** `main`

## 5. Project Memory Location
- **Local Database State:** Stored inside [/memory/](file:///C:/Users/user/.gemini/antigravity/scratch/ame-bazaar-ai-os/memory/) (`business.json`, `products.json`, `customers.json`, `campaigns.json`, `settings.json`, `ai_agents.json`).
- **Project Tracking:** Active status and checklist live in [docs/CURRENT_STATUS.md](file:///C:/Users/user/.gemini/antigravity/scratch/ame-bazaar-ai-os/docs/CURRENT_STATUS.md).

## 6. Mandatory Reading Order
Before making *any* code edits or writing documentation, humans and AI agents **MUST** read:
1. [AI_BOOTSTRAP.md](file:///C:/Users/user/.gemini/antigravity/scratch/ame-bazaar-ai-os/AI_BOOTSTRAP.md)
2. [docs/MASTER_PLAN.md](file:///C:/Users/user/.gemini/antigravity/scratch/ame-bazaar-ai-os/docs/MASTER_PLAN.md)
3. [docs/CURRENT_STATUS.md](file:///C:/Users/user/.gemini/antigravity/scratch/ame-bazaar-ai-os/docs/CURRENT_STATUS.md)
4. [docs/NEXT_TASK.md](file:///C:/Users/user/.gemini/antigravity/scratch/ame-bazaar-ai-os/docs/NEXT_TASK.md)
5. [docs/PROJECT_CONTEXT.md](file:///C:/Users/user/.gemini/antigravity/scratch/ame-bazaar-ai-os/docs/PROJECT_CONTEXT.md)

## 7. How Future AI Should Continue Development
1. Read the onboarding rules in [AI_BOOTSTRAP.md](file:///C:/Users/user/.gemini/antigravity/scratch/ame-bazaar-ai-os/AI_BOOTSTRAP.md).
2. Check the active next task in [docs/NEXT_TASK.md](file:///C:/Users/user/.gemini/antigravity/scratch/ame-bazaar-ai-os/docs/NEXT_TASK.md).
3. Switch active workspace to `ame-bazaar-theme` or `ame-bazaar-ai-os` based on the switching rules.
4. Perform the development following the rules in [docs/PROMPT_RULES.md](file:///C:/Users/user/.gemini/antigravity/scratch/ame-bazaar-ai-os/docs/PROMPT_RULES.md) and [.agents/AGENTS.md](file:///C:/Users/user/.gemini/antigravity/scratch/ame-bazaar-ai-os/.agents/AGENTS.md).
5. Open a Draft Pull Request (do not merge to main directly).
6. Update `CURRENT_STATUS.md`, `CHANGELOG.md`, and `NEXT_TASK.md` under `ame-bazaar-ai-os`.

## 8. Recovery Entry Point
In the event of system failure, local laptop crashes, or environment corruption, execute the playbook in the root [RECOVERY.md](file:///C:/Users/user/.gemini/antigravity/scratch/ame-bazaar-ai-os/RECOVERY.md).
