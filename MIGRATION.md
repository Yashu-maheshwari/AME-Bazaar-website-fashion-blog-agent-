# MIGRATION.md — AME Bazaar AI Agent OS

## Goal

Move execution from a laptop-dependent n8n process to a cloud-hosted n8n + persistent PostgreSQL architecture without changing working external APIs unnecessarily and without creating duplicate social posts.

## Migration Principles

1. GitHub is the source of truth.
2. PostgreSQL becomes the durable state source.
3. Container-local files are never treated as production state.
4. Existing API credentials remain unchanged unless a verified blocker requires replacement.
5. Production workflow logic is frozen until the migration design is validated.
6. Every major change has a backup/checkpoint and rollback path.
7. No real social post is used for routine testing.

## Current Freeze

- Repository: `Yashu-maheshwari/ame-bazaar-ai-os`
- Current audited `main` HEAD before this documentation change: `717fbe2859432d5dd925601cb5ce8c9269d7e83d`
- Project-context stable checkpoint: `production-stable-2026-08-13` — not independently found as a Git commit during this audit.
- Current workflow: `n8n/workflows/social-media-automation.json`
- Current local state concept: `n8n_state.json`

## Phase 1 — Audit and Freeze

- Inspect repository, workflow JSON, environment templates and deployment files.
- Record the exact production workflow export.
- Verify the actual Git checkpoint used for rollback.
- Do not alter credentials or workflow behavior.

## Phase 2 — PostgreSQL State Design

Create durable state tables for:

- agents
- schedules/slots
- executions
- content items
- idempotency keys
- platform publish results
- recovery events

The schema must support unique constraints so the same agent/content/slot cannot be successfully executed twice.

## Phase 3 — Supabase PostgreSQL Setup

- Create the PostgreSQL project.
- Obtain the database connection string securely.
- Create schema/migrations in GitHub.
- Run connectivity and schema tests.
- Do not move production execution to the new database yet.

## Phase 4 — Central Orchestrator

Implement a small scheduler layer in n8n that:

- checks every 10 minutes;
- calculates due work in IST;
- consults PostgreSQL before dispatch;
- creates deterministic idempotency keys;
- locks work before execution;
- records state transitions;
- applies the missed-slot policy;
- reconciles uncertain executions.

The orchestrator must remain separate from platform-specific publishing logic.

## Phase 5 — Agent Registry

Register the current Social Media Agent first.

Future modules can then be added without replacing the scheduler:

- Blogger Agent
- Threads Agent
- Video Agent
- Website Agent
- SEO Agent
- Customer/Marketing Agent

Each agent receives a standard execution context and returns a standard result.

## Phase 6 — Cloud Staging

Deploy a staging copy of n8n using the verified provider configuration.

Before using Render, verify current pricing/limits, sleep behavior, restart behavior, persistent-disk requirements, networking and database options from current provider documentation.

Use Supabase PostgreSQL for durable state if it remains the lowest-risk cost-effective choice after verification.

## Phase 7 — Secret Injection

Populate cloud environment variables from the existing secret inventory. Never commit values.

Required families include:

- Google Drive OAuth
- Cloudinary
- Gemini
- Meta/Instagram/Facebook
- Threads
- GBP
- n8n/database/runtime settings

Validate that logs do not expose secret values.

## Phase 8 — Trigger Verification

Verify that the periodic recovery trigger registers and executes after:

- clean startup;
- restart;
- redeploy;
- delayed startup.

Do not rely on a one-time startup trigger as the only recovery mechanism.

## Phase 9 — Pipeline Verification

In staging, test in order:

1. Google Drive list/download.
2. Cloudinary upload with the configured unsigned upload preset.
3. Poster transformation/download.
4. Gemini caption generation.
5. Platform API requests using safe/non-publishing validation where supported.
6. DONE-folder handling.
7. PostgreSQL state persistence.

The Cloudinary correction must receive a new controlled execution before it is considered validated.

## Phase 10 — Recovery Testing

Simulate:

- service restart;
- process termination;
- deployment/recreation;
- missed 11:00 slot;
- missed 14:00 slot with 19:00 still future;
- duplicate scheduler tick;
- timeout after external API success;
- failed external API call.

Expected result: no duplicate successful post.

## Phase 11 — One Controlled Production Post

Only after staging passes all checks:

- freeze the production configuration;
- select exactly one controlled real post;
- record every platform result and state transition;
- verify Drive DONE movement;
- verify PostgreSQL SUCCESS state;
- stop and review before enabling full production automation.

## Phase 12 — Production Enablement

Enable normal 11:00 / 14:00 / 19:00 IST scheduling only after the controlled post and recovery tests pass.

## Rollback

Rollback order:

1. Disable cloud production execution.
2. Restore the last verified n8n workflow export.
3. Restore previous environment configuration without exposing secrets.
4. Keep PostgreSQL state intact for investigation.
5. Re-run only after the first blocker is understood.

Do not delete the previous production workflow or state until the new system has a verified stable period.

## Migration Completion Criteria

Migration is complete only when all are true:

- n8n runs without laptop dependency.
- PostgreSQL contains authoritative execution state.
- Duplicate protection works after restart/retry.
- Missed-slot policy works as designed.
- Google Drive works.
- Cloudinary works with the corrected upload configuration.
- Gemini works.
- Instagram/Facebook publishing works in the controlled production test.
- DONE-folder handling works.
- Secrets are not stored in Git.
- Rollback is documented and tested.
