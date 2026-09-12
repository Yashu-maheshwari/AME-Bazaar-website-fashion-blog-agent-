# ENVIRONMENT_RECOVERY_REPORT.md - Environment Recovery Report

This report documents the search and recovery status of the original environment variables for the AME Bazaar Social Media Agent on this development machine.

---

## 1. Existing Environment Files

A comprehensive search of the workspace, parent directories, global configuration directories, and system shell parameters was conducted. Only the following template/example files exist:

1. [`.env.example`](file:///d:/Projects/AME%20BAZAAR/.env.example) (copied from the agent repository)
2. [`config/local.env.example`](file:///d:/Projects/AME%20BAZAAR/config/local.env.example) (Astra Child Theme environment template)
3. [`config/local.example.env`](file:///d:/Projects/AME%20BAZAAR/config/local.example.env) (WordPress/Google API template)

> [!WARNING]
> No active, credential-containing `.env`, `local.env`, or `runtime.env` files exist in the workspace or system directories. They are fully git-ignored to prevent leaking credentials.

---

## 2. Variable Configuration Mapping

Below is the verification status of the 20 required environment variables:

### A. Pre-Configured / Non-Sensitive Defaults
These variables exist in the template files with valid static defaults and require minimal adjustment:
- `GENERIC_TIMEZONE=Asia/Kolkata`
- `WEBHOOK_URL=https://ame-bazaar-ai-agent.onrender.com` (Render endpoint)
- `DATABASE_URL=postgresql://amebazaaruser:password@localhost:5432/amebazaardb` (Local development fallback)

### B. Missing Credentials (Must be Configured)
These variables have placeholder values only (e.g., `your_cloudinary_cloud_name`) and are currently missing active credentials:
- **Cloudinary:** `CLOUDINARY_CLOUD_NAME`, `CLOUDINARY_UPLOAD_PRESET`, `CLOUDINARY_LOGO_PUBLIC_ID`
- **AI Engine:** `GEMINI_API_KEY`
- **Google Drive OAuth:** `GOOGLE_DRIVE_CLIENT_ID`, `GOOGLE_DRIVE_CLIENT_SECRET`, `GOOGLE_DRIVE_REFRESH_TOKEN`
- **Google Drive Folders:** `AME_DRIVE_SOURCE_FOLDER_ID`, `AME_DRIVE_DONE_FOLDER_ID`
- **Meta (FB & IG):** `META_ACCESS_TOKEN`, `IG_USER_ID`, `FB_PAGE_ID`
- **Threads:** `THREADS_ACCESS_TOKEN`, `THREADS_USER_ID`
- **Google Business Profile:** `GBP_ACCESS_TOKEN`, `GBP_ACCOUNT_ID`, `GBP_LOCATION_ID`

---

## 3. How to Load and Restore the Environment

To load credentials locally without manually recreating or redeploying:

### Step 1: Instantiate Environment Files
The startup scripts (`startup/Start n8n.bat`, `startup/Start AME Bazaar AI.bat`) and local JS agents are pre-coded to load variables automatically from:
- **`.env`** (At the root, for n8n processes)
- **`config/local.env`** (In the `/config/` directory, for local theme scripts)

Create these files from the templates:
```powershell
Copy-Item .env.example .env
Copy-Item config/local.env.example config/local.env
```

### Step 2: Load Variables into Shell Session
To dynamically load these variables into your current PowerShell terminal session for testing:
```powershell
Get-Content .env | Where-Object { $_ -notmatch "^#" -and $_ -ne "" } | ForEach-Object {
    $name, $value = $_ -split '=', 2
    [System.Environment]::SetEnvironmentVariable($name, $value, "Process")
}
```
Once loaded into the process memory, starting n8n via `n8n start` will automatically ingest them.
