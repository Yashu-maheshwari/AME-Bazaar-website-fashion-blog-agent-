# PROMPT_RULES.md - AI Prompting Standards

- **Last Updated:** 2026-07-14
- **Version:** 1.0.0
- **Owner:** AME Bazaar AI OS Core
- **Purpose:** Outlines the mandatory structures, styles, and guidelines for writing prompts to be executed by AME Bazaar AI agents.
- **Dependencies:** None
- **Status:** Active

---

## AI Prompt Writing Guidelines

All prompts placed in the `/prompts` folder or sent directly to the agent must adhere to the following rules:

### 1. Document Header Requirement
Every prompt script must begin with a clear explanation of its objective, scope, and which documentation files it requires.

### 2. Mandatory Contextual Reading Order
Every prompt must instruct the target AI to read:
1. `docs/PROJECT_CONTEXT.md`
2. `docs/CURRENT_STATUS.md`
3. `docs/BUSINESS_RULES.md`
4. The specific prompt instruction.

### 3. Strict Constraint Definitions
Prompts must clearly define what the AI is **not** allowed to do. Specifically:
- Do not introduce React, Vue, Next.js, or complex JavaScript frameworks.
- Keep the theme lightweight (only Vanilla JS and Astra child styling).
- Do not create placeholders or fake database objects.
- Do not auto-merge or commit to `main` without PR approval.

### 4. Format of Prompts
Every prompt file in `/prompts` should use the following format:
```markdown
# [Prompt Title]
- **Target Role:** (e.g. Frontend developer / Copywriter / SEO Agent)
- **Objective:** Brief summary of execution target
- **Instructions:** Step-by-step implementation guide
- **Output Expectations:** Precise file structures or code snippets expected
```
