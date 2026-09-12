# LOCAL_READINESS_REPORT.md - Local Social Media Agent Readiness Report

This report evaluates the readiness of the local development machine to execute the **AME Bazaar Social Media Agent**.

---

## 1. Executive Summary
- **Workflow Location:** `n8n/workflows/social-media-automation.json`
- **Workflow Status:** **Successfully Imported** into the local n8n instance.
- **n8n Status:** **Running Locally** on port `5678` (`http://localhost:5678`).
- **Environment Status:** **Unconfigured**. No active local environment variables or configuration files are active.
- **Overall Readiness:** 🟥 **Not Ready** (Missing API keys and credentials).

---

## 2. Environment Verification Details

Below is the comparison between variables defined in `.env.example` and the current local environment (verified via file-system search and active shell process checks):

| Variable Group | Environment Variable Name | Required Value/Type | Local Status |
| :--- | :--- | :--- | :---: |
| **System** | `GENERIC_TIMEZONE` | Timezone (e.g., `Asia/Kolkata`) | ❌ Missing |
| **System** | `WEBHOOK_URL` | Public n8n endpoint URL | ❌ Missing |
| **Database** | `DATABASE_URL` | PostgreSQL Connection String | ❌ Missing |
| **Cloudinary** | `CLOUDINARY_CLOUD_NAME` | Cloudinary Account Cloud Name | ❌ Missing |
| **Cloudinary** | `CLOUDINARY_UPLOAD_PRESET`| Cloudinary Preset Folder | ❌ Missing |
| **Cloudinary** | `CLOUDINARY_LOGO_PUBLIC_ID`| Logo Public Overlay ID | ❌ Missing |
| **Gemini AI** | `GEMINI_API_KEY` | Google Gemini Developer Key | ❌ Missing |
| **Google Drive**| `GOOGLE_DRIVE_CLIENT_ID` | Google Console OAuth Client ID | ❌ Missing |
| **Google Drive**| `GOOGLE_DRIVE_CLIENT_SECRET`| Google Console OAuth Client Secret | ❌ Missing |
| **Google Drive**| `GOOGLE_DRIVE_REFRESH_TOKEN`| OAuth Offline Refresh Token | ❌ Missing |
| **Google Drive**| `AME_DRIVE_SOURCE_FOLDER_ID`| Google Drive Source Directory ID | ❌ Missing |
| **Google Drive**| `AME_DRIVE_DONE_FOLDER_ID` | Google Drive Archive Directory ID | ❌ Missing |
| **Meta Graph** | `META_ACCESS_TOKEN` | Facebook Page Access Token | ❌ Missing |
| **Meta Graph** | `IG_USER_ID` | Instagram Professional Account ID | ❌ Missing |
| **Meta Graph** | `FB_PAGE_ID` | Facebook Brand Page ID | ❌ Missing |
| **Threads** | `THREADS_ACCESS_TOKEN` | Threads API Access Token | ❌ Missing |
| **Threads** | `THREADS_USER_ID` | Threads User Identifier | ❌ Missing |
| **Google Business**| `GBP_ACCESS_TOKEN` | GBP Access Bearer Token | ❌ Missing |
| **Google Business**| `GBP_ACCOUNT_ID` | Google Business Account ID | ❌ Missing |
| **Google Business**| `GBP_LOCATION_ID` | Google Business Location ID | ❌ Missing |

---

## 3. Required Steps to Enable Execution

To run the agent locally, you must fulfill these prerequisites:

### Step 1: Initialize Local Env File
1. Copy the environment template to a new `.env` file at the root:
   ```powershell
   Copy-Item .env.example .env
   ```
2. Open `.env` and fill in your developer keys and account credentials. **Do not commit this file to git.**

### Step 2: Establish Tunnels / Webhooks (If testing live triggers)
If you require webhook callbacks to trigger from external platform events:
1. Start the local Cloudflare tunnel:
   ```powershell
   & "startup\Start Cloudflared.bat"
   ```
2. Update the `WEBHOOK_URL` in `.env` to match the generated public tunnel URL.
