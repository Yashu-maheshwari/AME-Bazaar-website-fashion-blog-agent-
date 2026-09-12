# AME Bazaar Fashion AI Content Engine — Google Apps Script (GAS) Migration

This standalone Google Apps Script project provides a 100% serverless, cloud-native automated daily content engine for **AME Bazaar** (`https://amebazaar.in`).

---

## 📁 File Structure

| File | Role |
| :--- | :--- |
| **`appsscript.json`** | Project manifest (`Asia/Kolkata` timezone, V8 runtime, required OAuth scopes). |
| **`Config.gs`** | Central configuration, `WP_POST_STATUS` setting, and Script Properties accessors. |
| **`Prompts.gs`** | Exact production topic and content system prompt templates with variable injection. |
| **`GeminiApi.gs`** | Gemini multi-model fallback client (`gemini-3.6-flash`, `gemini-flash-latest`, `gemini-1.5-flash`), exponential backoff, and JSON parser. |
| **`TopicEngine.gs`** | Queue management, deduplication against previously published topics, and dynamic 5-topic generation. |
| **`SeoQualityEngine.gs`** | Deterministic SEO scoring algorithm ($\ge 90$ threshold), keyword density, heading validation, and placeholder regex guards. |
| **`WooCommerceCta.gs`** | Dynamic WooCommerce product category queries & responsive localized HTML CTA block builder. |
| **`ImageEngine.gs`** | Wikimedia Commons image discovery via Hostinger proxy, deterministic demographic/garment/license gates, multimodal Gemini Vision audit, and WordPress Media Library multipart uploader. |
| **`SchemaGenerator.gs`** | Structured Data JSON-LD generators for `Article` and `FAQPage` schemas. |
| **`WordPressPublisher.gs`** | WordPress REST API publisher (`POST /wp-json/wp/v2/posts`) with Basic Authentication and Yoast SEO post meta. |
| **`GbpPublisher.gs`** | Google Business Profile Local Post publisher with OAuth2 token refresh. |
| **`Main.gs`** | Master orchestration pipeline (`runDailyContentEngine`), time-driven trigger setup (`setupDailyTrigger`), and safe test runners. |

---

## ⚙️ Script Properties Configuration

In Google Apps Script, navigate to **Project Settings** (⚙️) $\rightarrow$ **Script Properties** and add the following keys:

| Property Key | Description | Required? |
| :--- | :--- | :--- |
| `GEMINI_API_KEY` | Google Gemini API Key (Model: `gemini-3.6-flash`) | **Yes** |
| `GEMINI_MODEL` | Gemini model name (default: `gemini-3.6-flash`) | Optional |
| `IMAGE_SERVICE_URL` | Standalone Hostinger image service URL (e.g. `https://amebazaar.in/api/image-service.php`) | **Yes** |
| `IMAGE_SERVICE_SECRET` | Authentication token for the Hostinger image service (`X-AME-Image-Token`) | **Yes** |
| `WORDPRESS_URL` | Base URL (e.g. `https://amebazaar.in`) | **Yes** |
| `WORDPRESS_USERNAME` | WordPress Admin / Automation username | **Yes** |
| `WORDPRESS_APPLICATION_PASSWORD` | WordPress Application Password | **Yes** |
| `GOOGLE_CLIENT_ID` | Google OAuth Client ID for GBP | Optional |
| `GOOGLE_CLIENT_SECRET` | Google OAuth Client Secret for GBP | Optional |
| `GOOGLE_GBP_REFRESH_TOKEN` | Google OAuth Refresh Token for GBP | Optional |
| `GOOGLE_GBP_ACCOUNT_ID` | GBP Account ID | Optional |
| `GOOGLE_GBP_LOCATION_ID` | GBP Location ID | Optional |
| `BUSINESS_CONFIG_JSON` | Custom JSON string to override default business facts | Optional |

> **Image Discovery Architecture:**
> 1. **Primary & Exclusive Source (Wikimedia Commons via Hostinger Proxy):** Queries the standalone endpoint `api/image-service.php` using token authentication (`X-AME-Image-Token`). Searches official Wikimedia Commons API for commercially permitted licenses (`CC0`, `Public Domain`, `CC-BY`, `CC-BY-SA`), rejecting non-commercial, no-derivative, and fair-use assets.
> 2. **Direct CDN Blob Download:** GAS downloads the 1024px scaled regular preview directly from Wikimedia CDN into memory (no intermediate file storage on Hostinger).
> 3. **Verification Gates:** Runs deterministic semantic demographic/garment/season gates (with strict mandatory garment matching and non-garment subject exclusion for landmarks/architecture) and multimodal Gemini Vision verification before acceptance.
> 4. **Attribution Preservation:** Legal credit and license metadata are automatically injected into the WordPress media caption upon upload.
> 5. **Safe Failure:** If the Hostinger service is unconfigured, encounters network errors, or no candidate passes semantic and license filters, the engine returns a safe failure (`blob: null`, `isFallback: true`) to trigger the quality repair loop without calling any unverified external image APIs.

> **Note on Initial State:** To pre-seed previously published topics or initial queue, you can optionally set `AME_PUBLISHED_TOPICS_MEMORY` with a JSON string matching `{ "published": [...], "queue": [...] }`. If unset, it initializes automatically.

---

## 🚀 Deployment & Setup Steps

1. **Create a new Google Apps Script Project:**
   - Go to [script.google.com](https://script.google.com) and click **New project**.
   - Name it `AME Bazaar Content Engine`.

2. **Copy the Code:**
   - Copy each `.gs` file and `appsscript.json` from this folder into the Apps Script editor.

3. **Set Script Properties:**
   - Go to **Project Settings** $\rightarrow$ **Script Properties** $\rightarrow$ **Add script property** and input your credentials.

4. **Run Diagnostics (Safe Mode):**
   - In the editor function dropdown, select **`testGeminiConnection`** and click **Run**. Verify `[TEST RESULT]` in the execution log.
   - Select **`testWordPressConnection`** and click **Run**. Verify successful auth.

5. **Run End-to-End Test Draft:**
   - Select **`testEndToEndDraftGeneration`** and click **Run**.
   - This generates a complete article, uploads a featured image, attaches schemas & CTA, and creates **ONE draft post** in WordPress (status: `"draft"`).
   - Check WordPress Admin (`/wp-admin/edit.php`) to confirm the draft post, Yoast SEO fields, and featured media.

6. **Configure Daily Schedule Trigger:**
   - Select **`setupDailyTrigger`** and click **Run**.
   - This sets an automated daily trigger running around **11:00 AM IST** every day.

7. **Switching to Auto-Publish (After User Approval):**
   - In `Config.gs`, change:
     ```javascript
     const WP_POST_STATUS = 'draft';
     ```
     to:
     ```javascript
     const WP_POST_STATUS = 'publish';
     ```
