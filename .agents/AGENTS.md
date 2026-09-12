# AME Bazaar AI OS Rules

## Mandatory Task Lifecycle Rules

### 1. Pre-Task Reading Requirement
Before starting any development, refactoring, or content task, the agent **MUST** read the following files in order:
1. `docs/MASTER_PLAN.md`
2. `docs/CURRENT_STATUS.md`
3. `docs/NEXT_TASK.md`
4. `docs/PROJECT_CONTEXT.md`

Never start any implementation without reading these files first.

### 2. Post-Task State Update
Immediately upon completing any task, the agent **MUST** automatically update:
- `docs/CURRENT_STATUS.md` (Update project status, tasks completed, pending tasks, and blockers)
- `docs/CHANGELOG.md` (Record changes under the active version)
- `docs/NEXT_TASK.md` (Define the next immediate action)

This lifecycle rule is mandatory and governs the lifetime of the project.
