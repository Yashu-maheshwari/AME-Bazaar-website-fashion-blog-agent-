# RECOVERY.md - Disaster Recovery Instructions

- **Last Updated:** 2026-07-14
- **Version:** 1.0.0
- **Owner:** AME Bazaar AI OS Core
- **Purpose:** Step-by-step restoration instructions to rebuild the local and production AME Bazaar platform on any target laptop.
- **Dependencies:** docs/INFRASTRUCTURE.md
- **Status:** Active

---

## Disaster Recovery Procedure

This guide outlines how to restore the AME Bazaar AI Operating System and Website onto a new laptop/environment from scratch.

### 1. Prerequisites Setup
Install the following local dependencies on the new target system:
1. **Git:** [Download Git](https://git-scm.com/)
2. **Local WordPress Environment:** LocalWP, XAMPP, or Docker. (LocalWP is highly recommended for easy restoration)
3. **PHP 8.0+ & Web Server (Apache/Nginx)**
4. **Node.js & NPM** (For theme build tools and scripts)

### 2. Codebase Retrieval
1. Clone the GitHub repository to your local scratch directory:
   ```bash
   git clone <repository_url> AME-Bazaar
   cd AME-Bazaar
   ```
2. Verify you are on the `main` branch.

### 3. Theme Restoration
1. Install a fresh WordPress instance in your local environment.
2. Download and install the **Astra Parent Theme** via WordPress Admin Panel -> Appearance -> Themes.
3. Copy or link `/theme/astra-child/` folder from this repository into the local WordPress site's directory:
   ```text
   <wordpress-root>/wp-content/themes/astra-child
   ```
4. Activate the **Astra Child Theme** via WordPress Admin Panel.

### 4. Database & Uploads Restore
1. Locate the latest backup SQL and uploads zip files inside the `/backups/` directory or remote storage.
2. Import the backup SQL file using phpMyAdmin or WP-CLI:
   ```bash
   wp db import backups/latest_db_backup.sql
   ```
3. Extract the media uploads archive into `<wordpress-root>/wp-content/uploads/`.
4. Run search-replace to update URLs to your local domain (e.g., `http://localhost/amebazaar`):
   ```bash
   wp search-replace 'https://amebazaar.com' 'http://localhost/amebazaar'
   ```

### 5. AI OS Activation
1. Point your AI interface or agent workspace to the root directory of this repository.
2. Confirm the agent has successfully read `docs/PROJECT_CONTEXT.md` and `docs/CURRENT_STATUS.md` to verify system health.
