# AI_OS_ARCHITECTURE.md - System Architecture

- **Last Updated:** 2026-07-14
- **Version:** 1.0.0
- **Owner:** AME Bazaar AI OS Core
- **Purpose:** Describes how the local repository operates as a state storage and execution engine for AI agents (AI Operating System).
- **Dependencies:** docs/PROJECT_CONTEXT.md
- **Status:** Active

---

## 1. System Overview
The **AME Bazaar AI Operating System** is a design pattern that structures a Git repository so that autonomous AI agents can read context, track tasks, store execution memory, and verify rules directly from files. This removes the reliance on ephemeral LLM chat history.

```mermaid
graph TD
    subgraph Repo State (Permanent Memory)
        docs[docs/ Context, Status, Rules]
        memory[memory/ JSON State Files]
        prompts[prompts/ Specialized System Prompts]
        workflows[workflows/ Automated Execution Tasks]
    end
    
    subgraph AI Agents (Execution Layer)
        agent[Active AI Agent]
    end
    
    subgraph Production (Target Layer)
        theme[Astra Child Theme / WordPress]
    end

    agent -->|Reads Rules & Tasks| docs
    agent -->|Reads/Writes State| memory
    agent -->|Uses Prompts| prompts
    agent -->|Applies Changes| theme
```

## 2. Directory Functions
- **`/docs` (Core State Engine):** The master configuration, current status, immediate next task, and changelogs.
- **`/memory` (Local Database):** JSON databases storing environment settings, active catalog metadata, business configuration, and agent data.
- **`/workflows` (Task Runner):** Declarative or procedural step descriptions for business/technical pipelines (Marketing, Sales, SEO, WhatsApp).
- **`/prompts` (Prompt Library):** Custom instructions for various agent roles, ensuring consistent execution styles.
- **`/scripts` (System Hooks):** Startup, shutdown, backup, and restore routines.
- **`/backups` (Data Backups):** Database SQL dumps and local backups.
