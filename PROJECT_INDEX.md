# PROJECT_INDEX.md - AME Bazaar Repository & Project Index

This document tracks all repositories, modules, and sub-systems comprising the AME Bazaar commerce and automation ecosystem.

---

## Repository Index

### 1. `ame-bazaar-ai-os`
- **Purpose**: Master repository and Single Source of Truth (SSOT) for the AME Bazaar AI Operating System. Contains all core automation scripts, n8n workflows, prompt systems, business memory databases, recovery plans, and cross-project orchestration.
- **GitHub Repository**: `https://github.com/Yashu-maheshwari/ame-bazaar-ai-os`
- **Technology**: Markdown (Documentation), Windows Batch (Startup/Orchestration scripts), JSON (Memory DBs), n8n JSON schemas.
- **Current Status**: Milestone 1 (AI Operating System Core Setup & Separation) - Active.
- **Owner**: AME Bazaar AI OS Core Team / Chief Architect Agent.
- **Dependencies**: None.

### 2. `ame-bazaar-theme`
- **Purpose**: Hosts the client-facing website, WooCommerce e-commerce integration, style sheets, templates, and customized child theme.
- **GitHub Repository**: `https://github.com/Yashu-maheshwari/ame-bazaar-theme`
- **Technology**: WordPress (Astra Child Theme), PHP, CSS (Vanilla), Javascript, WooCommerce, LocalWP.
- **Current Status**: Phase 2 (Header & Drawer navigation menu design ready for execution).
- **Owner**: Frontend & Website Team.
- **Dependencies**: WordPress Core, WooCommerce Plugin, Astra Theme.

### 3. `ame-bazaar-ai-agent`
- **Purpose**: Autonomous agents acting as workers for specialized tasks (e.g. WhatsApp Agent, Marketing Agent, Inventory Agent, Finance Agent).
- **GitHub Repository**: `https://github.com/Yashu-maheshwari/ame-bazaar-ai-agent` (Planned)
- **Technology**: Model Context Protocol (MCP), Node.js, Python, OpenAI/Gemini SDKs.
- **Current Status**: Planned for Milestone 2.
- **Owner**: Agent Orchestration Team.
- **Dependencies**: `ame-bazaar-ai-os` (Memory, workflows).

### 4. `ame-bazaar-spin-wheel`
- **Purpose**: Custom gamification web application/module designed to drive customer engagement, collect email/contact details, and issue promotional coupon codes.
- **GitHub Repository**: `https://github.com/Yashu-maheshwari/ame-bazaar-spin-wheel` (Planned)
- **Technology**: HTML5 Canvas, Vanilla CSS, Javascript.
- **Current Status**: Planned.
- **Owner**: Engagement/Marketing Team.
- **Dependencies**: WooCommerce REST API (for coupon validation).

### 5. `n8n`
- **Purpose**: Core orchestration engine for routing data between the agents, WhatsApp Business API, Google Sheets, WordPress WooCommerce, and memory stores.
- **GitHub Repository**: Native local instance and workflows managed in `ame-bazaar-ai-os`.
- **Technology**: Node.js, n8n automation framework.
- **Current Status**: Setup completed, workflows structured.
- **Owner**: Automation Team.
- **Dependencies**: Docker (Optional for server hosting, though n8n is run natively on Windows).
