# RECOVERY.md - Disaster Recovery Playbook

- **Last Updated:** 2026-07-14
- **Version:** 1.0.0
- **Owner:** AME Bazaar AI OS Core
- **Purpose:** Full disaster recovery guide to restore the local development environment, workflows, and server connections following laptop failures or operating system re-installs.
- **Dependencies:** None
- **Status:** Approved

---

## 1. Laptop Failure & OS Reinstall Recovery
In the event of a total hardware failure or Windows clean installation, apply the following setup phases:
1. Re-install all foundational software listed in [SETUP.md](file:///C:/Users/user/.gemini/antigravity/scratch/ame-bazaar-git/SETUP.md) (Git, Node.js, Docker, LocalWP).
2. Configure environmental paths to point to the scratch workspace:
   `C:\Users\user\.gemini\antigravity\scratch\`

---

## 2. Codebase & Repository Recovery
1. Re-clone the repository from GitHub:
   ```bash
   git clone https://github.com/Yashu-maheshwari/ame-bazaar-theme.git ame-bazaar-git
   ```
2. Checkout the current active branch (refer to the latest state in `docs/CURRENT_STATUS.md`).

---

## 3. WordPress Database & Uploads Recovery
1. Launch a new local server instance via LocalWP.
2. Locate database backup SQL dumps inside the `/backups/` folder.
3. Import the backup SQL using CLI or database administration manager:
   ```bash
   wp db import backups/latest_db_backup.sql
   ```
4. Copy media files from remote backups to `<wordpress-root>/wp-content/uploads/`.
5. Re-link the Astra Child Theme folder (`/theme/astra-child/`) into the theme folder of the fresh site installation.

---

## 4. Workflows & MCP Server Recovery
1. **n8n RESTORATION:**
   - Import active n8n workflows from the `/workflows/` directory.
   - Verify local Docker n8n instance is running.
2. **MCP Servers Configuration:**
   - Restore the MCP JSON definitions inside `C:\Users\user\.gemini\antigravity\mcp\`.
   - Re-establish authorization tokens for `github-mcp-server` and `n8n-mcp`.

---

## 5. Secrets Restoration
1. Access the secure cloud secrets manager to retrieve production API keys.
2. Re-create the local `.env` file in the root of the repository.
3. Verify connection states for:
   - Google Business Profile API Integration
   - WhatsApp Cloud API Credentials
   - WooCommerce payment gateway sandboxes

---

## 6. Disaster Recovery Validation Checklist
- [ ] Local site loads correctly without 404 URL faults.
- [ ] Git history reflects the latest remote origin state.
- [ ] Active n8n engine executes webhook requests.
- [ ] GitHub connection successfully handles commit push/pull commands.
- [ ] AI operating agents successfully parse the workspace files.
