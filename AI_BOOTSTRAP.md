# AI_BOOTSTRAP.md - AI Operating System Onboarding & Master Rules

> [!IMPORTANT]
> **MANDATORY FOR ALL AI AGENTS:** This is the first file you must read upon entering this workspace. Never assume context. Always read [docs/CURRENT_STATUS.md](file:///C:/Users/user/.gemini/antigravity/scratch/ame-bazaar-ai-os/docs/CURRENT_STATUS.md) and [docs/NEXT_TASK.md](file:///C:/Users/user/.gemini/antigravity/scratch/ame-bazaar-ai-os/docs/NEXT_TASK.md) before making or proposing any changes.

---

## 1. Project Identity & Business Vision
- **Identity**: AME Bazaar AI Operating System (AI OS) - the unified system orchestrating commerce, messaging, marketing, and inventory for Apparel Maheshwari Enterprises (AME Bazaar).
- **Vision**: Transition from a local family fashion retailer in Kirari, Delhi, to a multi-agent omnichannel commerce powerhouse.
  - *Stage 1*: Local dominance via Hyperlocal SEO.
  - *Stage 2*: WhatsApp-based automated shopping catalogs and order management.
  - *Stage 3*: WooCommerce automated transactions and shipping integrations.
  - *Stage 4*: प्राइवेट लेबल (private label) brand scaling and nationwide franchise network.

---

## 2. Repository Architecture
The ecosystem is split into decoupled repositories to enforce structural isolation:
- **`ame-bazaar-ai-os` (Master Repo)**:
  - Single Source of Truth for system infrastructure, orchestration, backups, automation, memory, workflows, and documentation.
- **`ame-bazaar-theme` (Website Repo)**:
  - Strictly limited to WordPress, WooCommerce, child themes, PHP templates, CSS, client-side JS, SEO performance, and UI layout.

---

## 3. Current System State

### Infrastructure
- **Development Environment**: Local Windows sandbox setup.
- **Docker**: Used only for Docker Desktop services.
- **n8n Automation**: Native Windows process running on port `5678`.
- **Cloudflared**: Native Windows quick tunnel client routing to n8n port.
- **Database Memory**: Local JSON databases located in `memory/`.

### Current Milestone
- **Milestone 1**: AI Operating System Core Repository Setup & Decoupling Separation.

### Active AI Agents
- **Codebase Researcher Agent**: Read-only workspace inspection.
- **Chief Architect Agent**: Orchestrating repository migration and decoupling.

### Blockers
- **None** (Decoupling migration awaiting user approval).

### Current Priorities
- Complete physical migration of files from `ame-bazaar-theme` to `ame-bazaar-ai-os` upon approval.
- Finalize verification checks and health rules.

---

## 4. Operational & Git Workflow

### GitHub Rules
1. Never commit code directly to `main` without completing verification checks.
2. Maintain clean commits with conventional commit syntax (e.g. `feat: ...`, `fix: ...`, `refactor: ...`).

### Recovery Rules
- In case of workspace corruption, process crashes, or state conflicts, execute the recovery procedures outlined in [RECOVERY.md](file:///C:/Users/user/.gemini/antigravity/scratch/ame-bazaar-ai-os/RECOVERY.md).

### Prompt Rules
- Keep changes minimal and modular.
- Do not introduce placeholders or incomplete functions.
- Retain all comments, annotations, and docstrings unless explicitly asked otherwise.

---

## 5. Repository Switching Rules (Permanent Routing)

To prevent code pollution and structural bleed, you must strictly work in the correct directory based on the task type:

| If the Task Relates To... | Repository Directory | Rule |
| :--- | :--- | :--- |
| **WordPress, WooCommerce, Astra Theme, PHP templates, custom CSS/JS styling, SEO page tweaks, Website UI, plugins** | `ame-bazaar-theme` | **Switch active workspace immediately.** Never write AI configs, startup scripts, or OS documentation here. |
| **n8n workflows, Cloudflare tunnels, Docker Desktop orchestration, local JSON Memory, recovery manuals, system startup scripts, OS documentation, business operations, agent registries** | `ame-bazaar-ai-os` | **Switch active workspace immediately.** Never write PHP theme templates or style sheets here. |

*Rule:* **Never work in the wrong repository.**
