# SETUP.md - Workspace Installation & Setup Guide

- **Last Updated:** 2026-07-14
- **Version:** 1.2.0
- **Owner:** AME Bazaar AI OS Core
- **Purpose:** Comprehensive local development workspace environment configuration for a brand-new laptop.
- **Dependencies:** None
- **Status:** Approved

---

## 1. Required Software Installation

To fully restore the AME Bazaar AI OS on a new machine, download and install the following toolchain:

### 1.1 Git
- **Installation:** Download and install [Git for Windows](https://git-scm.com/).
- **Configuration:** Set up global credentials:
  ```bash
  git config --global user.name "Your Name"
  git config --global user.email "your.email@example.com"
  ```

### 1.2 Docker Desktop
- **Installation:** Download [Docker Desktop](https://www.docker.com/products/docker-desktop/) for Windows. Enforce WSL2 backend installation when prompted.
- **Purpose:** Used to orchestrate local WordPress environments and support agent node testing.

### 1.3 Node.js & NPM
- **Installation:** Install the latest Node.js LTS release (v20+ recommended) via [NodeJS Installer](https://nodejs.org/).
- **Verification:** Run `node -v` and `npm -v` in shell to verify successful installation.

### 1.4 LocalWP (WordPress Local Server)
- **Installation:** Download [LocalWP](https://localwp.com/).
- **Purpose:** Hosts the local development instance of the WordPress server and Astra Child theme.

---

## 2. AI OS Orchestration Tools

### 2.1 n8n Automation Engine
- **Local Deployment:** Runs natively on Windows. Set the location and configuration inside `config/local.env` (copied from `config/local.env.example`).
- **Orchestration:** Use `scripts/startup/Start AME Bazaar AI.bat` to automate local start of n8n, Docker, and Cloudflared.
- **Web Console:** Accessible at `http://localhost:5678`.

### 2.2 Model Context Protocol (MCP) Servers
The AI Operating System utilizes MCP servers to interface with external APIs (GitHub, n8n):
- **Location:** Configured under `C:\Users\user\.gemini\antigravity\mcp\`
- Ensure server definitions exist for:
  - `github-mcp-server`
  - `n8n-mcp`

### 2.3 Antigravity & Agent Environment
- **Path Config:** Local agents expect workspace scratch space at `C:\Users\user\.gemini\antigravity\scratch\`.
- Make sure local environment profiles allow the AI Studio workspace access.

---

## 3. Clone Repository & Setup Workspace

1. Open PowerShell and navigate to the scratch directory:
   ```powershell
   cd C:\Users\user\.gemini\antigravity\scratch\
   ```
2. Clone the repository:
   ```bash
   git clone https://github.com/Yashu-maheshwari/ame-bazaar-theme.git ame-bazaar-git
   cd ame-bazaar-git
   ```

---

## 4. Environment Variables Configuration

Create a `.env` file in the repository root containing:
```env
DB_NAME=local_wordpress_db
DB_USER=root
DB_PASSWORD=root
DB_HOST=localhost
WP_HOME=http://localhost/amebazaar
WP_SITEURL=http://localhost/amebazaar
GITHUB_TOKEN=your_github_token_here
N8N_API_KEY=your_n8n_api_key_here
```

---

## 5. Verification Checklist

- [ ] Command `git --version` executes.
- [ ] Command `docker --version` executes.
- [ ] Command `node --version` executes.
- [ ] LocalWP is running and local site loads.
- [ ] Local n8n dashboard is accessible at `http://localhost:5678`.
- [ ] Antigravity agents successfully read [START_HERE.md](file:///C:/Users/user/.gemini/antigravity/scratch/ame-bazaar-git/START_HERE.md).
