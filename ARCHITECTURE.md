# ARCHITECTURE.md — AME Bazaar AI Agent OS

## Purpose

AME Bazaar AI Agent OS is a cloud-oriented, low-cost multi-agent automation platform. GitHub is the source of truth for code, workflow exports, configuration templates and documentation. n8n is the current orchestration engine; PostgreSQL is the target persistent state layer.

## 1. Current Architecture — Audited

```text
Google Drive source images
        |
        v
n8n Social Media workflow
        |
        +--> Cloudinary upload + poster transformation
        |
        +--> Gemini multimodal caption generation
        |
        +--> Instagram / Facebook / Threads / GBP publishing
        |
        +--> Google Drive DONE folder
```

The repository contains `n8n/workflows/social-media-automation.json`. The workflow export currently visible on `main` contains a schedule-triggered social-media pipeline and the Cloudinary upload is configured as an n8n HTTP Request node using multipart form-data and `CLOUDINARY_UPLOAD_PRESET`. fileciteturn4file0

### Important audit finding

Repository documentation previously described a Render blueprint and PostgreSQL deployment as implemented, but `render.yaml` is not present on the current `main` tree. Therefore cloud deployment is treated as **planned/not yet re-verified**, not as production-ready. The repository's implementation-status document also contains older claims of Render/PostgreSQL implementation that must not be treated as proof of a current live deployment. fileciteturn5file0

The current repository `main` HEAD is `717fbe2859432d5dd925601cb5ce8c9269d7e83d` (2026-08-07). The requested `production-stable-2026-08-13` identifier was not found as a Git commit in the repository during this audit, so it remains an external/project-context checkpoint until verified locally or through Git metadata.

## 2. Target Architecture

```text
                         GitHub
                           |
                           v
                    Cloud deployment
                           |
                           v
                 n8n / Central Orchestrator
                           |
                    +------+------+
                    |             |
                    v             v
              Agent Registry   PostgreSQL
                    |          persistent state
       +------------+------------+-------------+
       |            |            |             |
       v            v            v             v
 Social Media    Blogger      Threads       Future Agents
    Agent          Agent       Agent       Video / SEO / Web
       |
       +--> Google Drive
       +--> Cloudinary
       +--> Gemini
       +--> Meta / Instagram / Facebook
       +--> GBP
```

### Design rule

The central orchestrator decides **when and what agent should run**. Individual agents own their task logic. Adding a new agent should require configuration/module registration rather than rewriting the entire scheduler.

## 3. Scheduler / Orchestrator

The scheduler will use a short periodic recovery check rather than depending on a fragile one-time startup trigger. The existing project context records a 10-minute recovery checker with successful normal-day, late-start, restart, duplicate-protection and future-slot tests.

The orchestrator will:

1. Determine current IST time/date.
2. Load enabled agent schedules.
3. Calculate due/pending work.
4. Generate a deterministic idempotency key.
5. Acquire a database-backed execution lock/state.
6. Dispatch the selected agent.
7. Record RUNNING/SUCCESS/FAILED/SKIPPED.
8. Reconcile uncertain executions after restart/timeouts.
9. Never blindly replay all missed slots.

## 4. Social Media Agent

Current intended slots: **11:00, 14:00, 19:00 IST**.

Category assignment remains dynamic. The agent should select from pending Google Drive images, avoid unnecessary back-to-back category repetition, and never reuse an image already recorded as successfully processed.

Current processing chain:

```text
Pending Drive image
 -> download
 -> Cloudinary upload
 -> branded poster URL
 -> Gemini caption
 -> Instagram/Facebook/Threads/GBP publishing
 -> move image to DONE
 -> persist state
```

The Cloudinary fix has not been considered fully validated until a controlled real execution confirms a successful upload. No real social post is part of this architecture audit.

## 5. PostgreSQL State Model

PostgreSQL should become the authoritative durable state store for both n8n and agent execution metadata. Local files such as `n8n_state.json` must not be the production source of truth.

Initial logical tables:

- `agent_registry` — agent name, enabled state, schedule and version.
- `agent_slots` — date, agent, slot, due status and policy.
- `agent_executions` — execution lifecycle and n8n execution ID.
- `content_items` — Drive file/content identity and processing status.
- `idempotency_keys` — unique execution/content keys preventing duplicate work.
- `publish_results` — platform-level publish identifiers/results.
- `recovery_events` — restart, retry and reconciliation events.

Recommended unique keys include `(agent, scheduled_date, slot)` where appropriate plus a content-specific key such as `(agent, drive_file_id, content_version)`.

## 6. Execution State

Every task uses:

`PENDING -> RUNNING -> SUCCESS`

or

`PENDING -> RUNNING -> FAILED`

with `SKIPPED` for intentionally bypassed work.

Retries must be bounded and idempotent. A duplicate scheduler tick must find an existing SUCCESS record and skip the work.

If an external platform succeeds but the process dies before recording SUCCESS, the recovery layer must reconcile using stored platform/content identifiers before retrying. The system must not assume that a timeout means the external post failed.

## 7. Agent Interface

Each agent should expose a common logical contract:

```text
Input:
  agent_name
  scheduled_at
  execution_key
  context

Output:
  status
  execution_id
  content_id
  platform_results
  error
  timestamps
```

Future agents can therefore subscribe to schedules such as:

```text
10:00 Blogger
11:00 Social + Website
14:00 Social
19:00 Social + Marketing
```

## 8. Cloud Hosting Plan

Preferred implementation path:

- Render or another verified low-cost container host for n8n.
- Supabase PostgreSQL (or another verified PostgreSQL provider) for durable state.
- GitHub for source/configuration/documentation.
- External services remain unchanged unless a verified technical blocker requires change.

Before deployment, current provider limits, sleep/restart behavior, outbound networking, persistent storage requirements, database limits and pricing must be verified from current provider documentation. No assumption that a particular Render Free Cron or free service is permanently available is part of this design.

## 9. Recovery

Recovery is database-driven:

```text
Service starts/restarts
      |
      v
Connect to PostgreSQL
      |
      v
Load unfinished RUNNING/PENDING tasks
      |
      v
Apply missed-slot policy
      |
      +--> future slot: WAIT
      +--> already SUCCESS: SKIP
      +--> due pending: RUN
      +--> uncertain external result: RECONCILE
```

A missed 11:00 and 14:00 slot must not automatically cause two immediate posts at 19:00. The policy will select only work that is still valid and due.

## 10. Security

- Secrets remain outside Git.
- `.env` is never committed.
- `.env.example` contains placeholders only.
- Secrets are injected through the cloud provider's secret/environment system.
- Logs must never print access tokens, API keys or OAuth refresh tokens.
- Existing credentials are retained unless a verified technical reason requires replacement.
- Major changes require a Git checkpoint and rollback path.

## 11. Production Change Boundary

This architecture audit does **not** modify production workflow logic, credentials, or social publishing behavior. The next implementation phase begins with a backup/freeze checkpoint and then introduces persistent state incrementally.
