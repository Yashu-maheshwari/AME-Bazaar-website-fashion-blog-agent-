const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

// Helper to log to stdout and a log file
const LOG_FILE = path.join(__dirname, '..', 'logs', 'fashion_content_agent.log');
function log(message, level = 'INFO') {
  const timestamp = new Date().toISOString();
  const logLine = `[${timestamp}] [${level}] ${message}`;
  console.log(logLine);
  try {
    fs.mkdirSync(path.dirname(LOG_FILE), { recursive: true });
    fs.appendFileSync(LOG_FILE, logLine + '\n');
  } catch (err) {
    // Ignore log file write errors
  }
}

// Custom env file loader
function loadEnv() {
  const envPaths = [
    path.join(__dirname, '..', 'config', 'local.env'),
    path.join(__dirname, '..', 'local.env'),
    path.join(__dirname, '..', '..', 'local.env')
  ];

  for (const p of envPaths) {
    if (fs.existsSync(p)) {
      const content = fs.readFileSync(p, 'utf-8');
      content.split('\n').forEach(line => {
        const trimmed = line.trim();
        if (!trimmed || trimmed.startsWith('#')) return;
        const firstEquals = trimmed.indexOf('=');
        if (firstEquals === -1) return;
        const key = trimmed.slice(0, firstEquals).trim();
        const value = trimmed.slice(firstEquals + 1).trim();
        process.env[key] = value;
      });
      log(`Loaded environment variables from: ${p}`);
      return;
    }
  }
  log('No local.env file found. Proceeding with existing environment variables.', 'WARN');
}

// Load env
loadEnv();

// Configuration
const WORDPRESS_URL = process.env.WORDPRESS_URL;
const WORDPRESS_USERNAME = process.env.WORDPRESS_USERNAME;
const WORDPRESS_APPLICATION_PASSWORD = process.env.WORDPRESS_APPLICATION_PASSWORD;
const GEMINI_API_KEY = process.env.GEMINI_API_KEY;

// Load Centralized Business Configuration
const businessConfigPath = path.join(__dirname, '..', 'config', 'business_config.json');
if (!fs.existsSync(businessConfigPath)) {
  log(`Centralized business config not found at ${businessConfigPath}. Exiting.`, 'ERROR');
  process.exit(1);
}
const BUSINESS_CONFIG = JSON.parse(fs.readFileSync(businessConfigPath, 'utf-8'));
log(`Loaded business configuration: "${BUSINESS_CONFIG.businessName}"`);

// Check CLI Arguments
const args = process.argv.slice(2);
const isDryRun = args.includes('--dry-run');
const isVerbose = args.includes('--verbose');
const forceTopicIndex = args.indexOf('--force-topic');
const forcedTopicTitle = forceTopicIndex !== -1 ? args[forceTopicIndex + 1] : null;

if (isVerbose) {
  log('Verbose mode enabled.');
}

// Validate credentials unless it is a dry run
if (!isDryRun) {
  if (!WORDPRESS_URL || !WORDPRESS_USERNAME || !WORDPRESS_APPLICATION_PASSWORD) {
    log('Missing WordPress credentials in environment. Set WORDPRESS_URL, WORDPRESS_USERNAME, and WORDPRESS_APPLICATION_PASSWORD.', 'ERROR');
    process.exit(1);
  }
}
if (!GEMINI_API_KEY) {
  log('Missing GEMINI_API_KEY in environment.', 'ERROR');
  process.exit(1);
}

// Setup Windows Task Scheduler trigger automatically
function setupWindowsTaskScheduler() {
  if (process.platform !== 'win32') return;
  try {
    const taskName = "AME_Bazaar_Content_Engine";
    const scriptPath = path.join(__dirname, 'fashion_content_agent.js');
    const check = execSync(`schtasks /query /tn "${taskName}" 2>NUL`, { encoding: 'utf-8' });
    if (check.includes(taskName)) return;
  } catch (e) {
    try {
      const taskName = "AME_Bazaar_Content_Engine";
      const scriptPath = path.join(__dirname, 'fashion_content_agent.js');
      const nodePath = 'node.exe';
      const cmd = `schtasks /create /tn "${taskName}" /tr "\"${nodePath}\" \"${scriptPath}\"" /sc onlogon /rl highest /f`;
      execSync(cmd, { stdio: 'ignore' });
      log("Successfully registered Windows Task Scheduler task to execute Content Engine on user logon.");
    } catch (err) {
      log(`Failed to create Windows Task Scheduler task (requires Admin permissions): ${err.message}`, 'WARN');
    }
  }
}

setupWindowsTaskScheduler();

// Helper to make API calls to Gemini with retry logic
async function callGemini(promptText, retries = 3) {
  if (process.env.MOCK_GEMINI === 'true') {
    log('MOCK MODE: Returning high-quality mock article matching constraints...');
    let kw = "monsoon kids wear Kirari";
    if (promptText.includes('Focus Keyword:')) {
      const match = promptText.match(/Focus Keyword:\s*([^\r\n]+)/);
      if (match) kw = match[1].trim();
    }
    const mockContent = `
      <h2>Why choosing the right ${kw} is essential</h2>
      <p>When shopping for clothes in Delhi, especially if you are looking at ${kw}, you need fabrics that handle the local climate. Mubarakpur Road in Kirari, Delhi is the prime destination for these custom solutions.</p>
      <h2>Top Tips for selecting ${kw}</h2>
      <ul>
        <li>Choose breathable fabrics that fit perfectly. We offer custom tailoring in Mubarakpur Road, Kirari, Delhi.</li>
        <li>Make sure the focus is on comfort and style. Our ${kw} collection is designed for Delhi shoppers.</li>
      </ul>
      <p>For more details, visit AME Bazaar in Kirari, Delhi. We have the best ${kw} collections for men, women, and kids.</p>
      <p>Repeat of keyword for density: ${kw} is popular. If you buy ${kw}, check quality. Delhi shoppers love ${kw}.</p>
    `.repeat(15); // Make it >600 words

    return {
      text: JSON.stringify({
        seoTitle: `Premium ${kw} Guide in Kirari, Delhi`,
        metaDescription: `Discover the best ${kw} in Mubarakpur Road, Kirari, Delhi.`,
        slug: "monsoon-kids-wear-kirari",
        title: `Best guide for ${kw}`,
        contentHtml: mockContent,
        faqs: [
          { question: `Where to buy ${kw}?`, answer: "Visit AME Bazaar in Kirari, Delhi." }
        ],
        featuredImagePrompt: "A clothing collection",
        tags: ["kids-wear", "monsoon"],
        instagramReelScript: "Visual: Kids playing.",
        instagramCaption: `Check out ${kw}!`,
        facebookPost: `Check out ${kw}!`,
        whatsAppBroadcast: `Monsoon wear alert for ${kw}!`,
        googleBusinessPost: `Kids clothing at Kirari for ${kw}.`,
        pinterestTitle: "Monsoon Kids Wear",
        pinterestDescription: "Best clothing guide.",
        xPost: `Monsoon kids wear in Kirari! ${kw}`,
        youtubeShortScript: `monsoon kids wear guide for ${kw}.`
      }),
      usage: { promptTokens: 100, candidatesTokens: 200 }
    };
  }

  const models = [
    process.env.GEMINI_MODEL || 'gemini-3.6-flash',
    'gemini-flash-latest',
    'gemini-3.5-flash',
    'gemini-1.5-flash-8b'
  ];
  
  if (isVerbose) {
    log(`Prompt sent to Gemini:\n${promptText}\n`, 'DEBUG');
  }

  for (const model of models) {
    for (let attempt = 1; attempt <= retries; attempt++) {
      const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${GEMINI_API_KEY}`;
      try {
        log(`Attempting generation with model: ${model} (attempt ${attempt})...`);
        const response = await fetch(url, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            contents: [
              {
                parts: [{ text: promptText }]
              }
            ],
            generationConfig: {
              responseMimeType: "application/json"
            }
          })
        });

        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status} - ${await response.text()}`);
        }

        const data = await response.json();
        if (data.candidates && data.candidates[0] && data.candidates[0].content && data.candidates[0].content.parts[0]) {
          return {
            text: data.candidates[0].content.parts[0].text,
            usage: data.usageMetadata
          };
        } else {
          throw new Error('Malformed API response structure from Gemini API.');
        }
      } catch (err) {
        log(`Gemini model ${model} attempt ${attempt} failed: ${err.message}`, 'WARN');
        if (err.message.includes('429')) {
          log(`Quota exhausted (429) for model ${model}. Rotating to next fallback model...`);
          break;
        }
        if (attempt === retries && model === models[models.length - 1]) throw err;
        await new Promise(resolve => setTimeout(resolve, 2000 * attempt));
      }
    }
  }
  throw new Error('All fallback Gemini models exhausted or failed.');
}

// Multi-provider Image Generator
async function generateFeaturedImage(promptText, category = 'General') {
  if (process.env.OPENAI_API_KEY) {
    log('Attempting OpenAI DALL-E image generation...');
    try {
      const res = await fetch('https://api.openai.com/v1/images/generations', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`
        },
        body: JSON.stringify({
          prompt: promptText,
          n: 1,
          size: "1024x1024",
          response_format: "b64_json"
        })
      });
      if (res.ok) {
        const data = await res.json();
        return Buffer.from(data.data[0].b64_json, 'base64');
      }
    } catch (e) {
      log(`OpenAI Image generation failed: ${e.message}`, 'WARN');
    }
  }

  log('Using Unsplash fallback...');
  const categoryUrls = {
    "Monsoon kids wear Kirari": "https://images.unsplash.com/photo-1503919545889-aef636e10ad4?w=800&auto=format&fit=crop&q=80",
    "Men's Wear": "https://images.unsplash.com/photo-1617137968427-85924c800a22?w=800&auto=format&fit=crop&q=80",
    "Women's Wear": "https://images.unsplash.com/photo-1610030469983-98e550d6193c?w=800&auto=format&fit=crop&q=80",
    "Casual Wear": "https://images.unsplash.com/photo-1544441893-675973e31985?w=800&auto=format&fit=crop&q=80",
    "Ethnic Wear": "https://images.unsplash.com/photo-1583391733956-3750e0ff4e8b?w=800&auto=format&fit=crop&q=80"
  };
  const fallbackUrl = categoryUrls[category] || "https://images.unsplash.com/photo-1490481651871-ab68de25d43d?w=800&auto=format&fit=crop&q=80";
  
  try {
    const res = await fetch(fallbackUrl);
    if (res.ok) {
      const arrayBuffer = await res.arrayBuffer();
      return Buffer.from(arrayBuffer);
    }
  } catch (err) {
    log(`Unsplash fallback download failed: ${err.message}`, 'WARN');
  }
  return null;
}

// Helper to upload media to WordPress
async function uploadMediaToWordPress(imageBuffer, filename, metadata) {
  const authString = Buffer.from(`${WORDPRESS_USERNAME}:${WORDPRESS_APPLICATION_PASSWORD}`).toString('base64');
  const uploadUrl = `${WORDPRESS_URL.replace(/\/$/, '')}/wp-json/wp/v2/media`;

  try {
    const response = await fetch(uploadUrl, {
      method: 'POST',
      headers: {
        'Authorization': `Basic ${authString}`,
        'Content-Disposition': `attachment; filename=${filename}`,
        'Content-Type': 'image/jpeg'
      },
      body: imageBuffer
    });

    if (!response.ok) return null;
    const data = await response.json();
    const mediaId = data.id;

    // Update metadata
    const updateUrl = `${uploadUrl}/${mediaId}`;
    await fetch(updateUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Basic ${authString}`
      },
      body: JSON.stringify({
        title: metadata.title,
        alt_text: metadata.altText,
        caption: metadata.caption,
        description: metadata.description
      })
    });

    return mediaId;
  } catch (err) {
    return null;
  }
}

// Fetch relevant products dynamically from WooCommerce REST API
async function getRelatedProducts(category = "General") {
  if (isDryRun) {
    log(`Dry run mode: Bypassing WooCommerce live product queries.`);
    return [];
  }

  const authString = Buffer.from(`${WORDPRESS_USERNAME}:${WORDPRESS_APPLICATION_PASSWORD}`).toString('base64');
  const baseUrl = WORDPRESS_URL.replace(/\/$/, '');

  try {
    // Step 1: Find category term ID matching category slug
    const cleanCat = category.replace(/[^a-zA-Z0-9]/g, '-').toLowerCase();
    log(`Searching WooCommerce category for: "${category}" (slug: "${cleanCat}")...`);
    const catRes = await fetch(`${baseUrl}/wp-json/wp/v2/product_cat?slug=${cleanCat}`, {
      headers: { 'Authorization': `Basic ${authString}` }
    });

    let catId = null;
    if (catRes.ok) {
      const cats = await catRes.json();
      if (cats && cats[0]) {
        catId = cats[0].id;
        log(`Found matching WooCommerce category ID: ${catId}`);
      }
    }

    // Step 2: Fetch products by category ID, fallback to general products if empty
    const productQueryUrl = catId 
      ? `${baseUrl}/wp-json/wc/v3/products?category=${catId}&per_page=6`
      : `${baseUrl}/wp-json/wc/v3/products?per_page=6`;

    log(`Querying WooCommerce products: ${productQueryUrl}`);
    const prodRes = await fetch(productQueryUrl, {
      headers: { 'Authorization': `Basic ${authString}` }
    });

    if (prodRes.ok) {
      const prods = await prodRes.json();
      if (Array.isArray(prods) && prods.length > 0) {
        log(`Retrieved ${prods.length} products dynamically from WooCommerce.`);
        return prods.map(p => ({
          name: p.name,
          price: p.price ? `₹${p.price}` : 'Contact Us',
          link: p.permalink || `${BUSINESS_CONFIG.websiteUrl}/shop`,
          image: (p.images && p.images[0]) ? p.images[0].src : ''
        }));
      }
    }
  } catch (err) {
    log(`WooCommerce product query failed: ${err.message}. Hiding Related Products catalog.`, 'WARN');
  }

  return []; // Return empty if failed or no products exist
}

// Generate beautiful responsive CTA HTML block using central business config
async function generateCtaBlock(category) {
  const products = await getRelatedProducts(category);
  let productsSectionHtml = '';

  if (products.length > 0) {
    const productsCardsHtml = products.map(p => `
      <div style="border: 1px solid #e2e8f0; border-radius: 8px; padding: 12px; margin: 8px 0; display: flex; gap: 12px; align-items: center; background: #fff;">
        ${p.image ? `<img src="${p.image}" alt="${p.name}" style="width: 50px; height: 50px; object-fit: cover; border-radius: 4px;" />` : ''}
        <div style="flex: 1;">
          <strong style="color: #1a202c; font-size: 15px; display: block;">${p.name}</strong>
          <span style="color: #e53e3e; font-weight: bold; font-size: 14px;">${p.price}</span>
        </div>
        <a href="${p.link}" target="_blank" style="background: #e53e3e; color: #fff; padding: 6px 12px; border-radius: 4px; text-decoration: none; font-size: 13px; font-weight: bold;">Inquire</a>
      </div>
    `).join('');

    productsSectionHtml = `
      <div style="margin-top: 20px;">
        <h4 style="margin: 0 0 10px; color: #2d3748; font-size: 16px; border-bottom: 1px solid #e2e8f0; padding-bottom: 5px;">🛍️ Related Products in ${category}</h4>
        ${productsCardsHtml}
      </div>
    `;
  }

  const cleanPhone = BUSINESS_CONFIG.phoneNumber.replace(/[^0-9+]/g, '');
  const cleanWa = BUSINESS_CONFIG.whatsAppNumber.replace(/[^0-9]/g, '');

  return `
    <hr style="border: 0; border-top: 2px dashed #cbd5e0; margin: 40px 0;" />
    <div id="ame-bazaar-cta-block" style="font-family: system-ui, -apple-system, sans-serif; background: #f7fafc; border: 2px solid #e2e8f0; border-radius: 12px; padding: 24px; max-width: 650px; margin: 30px auto; box-shadow: 0 4px 6px rgba(0,0,0,0.05);">
      <h3 style="margin-top: 0; color: #2d3748; font-size: 22px; text-align: center; border-bottom: 2px solid #e53e3e; padding-bottom: 10px;">🛍️ Visit ${BUSINESS_CONFIG.businessName}</h3>
      <p style="font-size: 15px; color: #4a5568; line-height: 1.6; text-align: center;">
        ${BUSINESS_CONFIG.defaultCtaText}
      </p>
      <div style="margin: 20px 0; display: flex; flex-wrap: wrap; gap: 10px; justify-content: center;">
        <a href="tel:${cleanPhone}" style="background: #2b6cb0; color: white; padding: 10px 18px; border-radius: 6px; text-decoration: none; font-weight: bold; font-size: 14px;">📞 Call Store</a>
        <a href="https://wa.me/${cleanWa}?text=I%20am%20interested%20in%20your%20fashion%20catalog" target="_blank" style="background: #38a169; color: white; padding: 10px 18px; border-radius: 6px; text-decoration: none; font-weight: bold; font-size: 14px;">💬 WhatsApp Chat</a>
        <a href="${BUSINESS_CONFIG.googleReviewsUrl}" target="_blank" style="background: #dd6b20; color: white; padding: 10px 18px; border-radius: 6px; text-decoration: none; font-weight: bold; font-size: 14px;">⭐ Google Reviews</a>
      </div>
      <div style="background: #edf2f7; border-radius: 8px; padding: 15px; margin-bottom: 20px;">
        <h4 style="margin: 0 0 8px; color: #2d3748; font-size: 16px;">👔 Custom Tailoring Service</h4>
        <p style="margin: 0; color: #4a5568; font-size: 14px; line-height: 1.5;">
          ${BUSINESS_CONFIG.tailoringServiceInfo}
        </p>
      </div>
      ${productsSectionHtml}
      <p style="font-size: 12px; color: #718096; text-align: center; margin: 20px 0 0;">
        📍 Address: ${BUSINESS_CONFIG.storeAddress}
      </p>
    </div>
  `;
}

// Helper to refresh access token using refresh token
async function refreshAccessToken() {
  const clientId = process.env.GOOGLE_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
  const refreshToken = process.env.GOOGLE_GBP_REFRESH_TOKEN;

  if (!clientId || !clientSecret || !refreshToken) {
    throw new Error('Missing Google client ID, client secret, or refresh token in environment.');
  }

  log('[INFO] Refreshing Google Access Token...');
  const response = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      client_id: clientId,
      client_secret: clientSecret,
      refresh_token: refreshToken,
      grant_type: 'refresh_token'
    })
  });

  if (!response.ok) {
    throw new Error(`Token refresh failed: ${await response.text()}`);
  }

  const data = await response.json();
  log('[SUCCESS] Access token successfully refreshed!');
  
  // Save back to local.env
  const envPath = path.join(__dirname, '..', 'config', 'local.env');
  let content = '';
  if (fs.existsSync(envPath)) {
    content = fs.readFileSync(envPath, 'utf8');
  }
  const lines = content.split('\n').filter(line => !line.trim().startsWith('GOOGLE_GBP_ACCESS_TOKEN='));
  lines.push(`GOOGLE_GBP_ACCESS_TOKEN=${data.access_token}`);
  fs.writeFileSync(envPath, lines.join('\n').trim() + '\n', 'utf8');

  process.env.GOOGLE_GBP_ACCESS_TOKEN = data.access_token;
  return data.access_token;
}

// Publish local post to Google Business Profile via API with retry and fallback
async function publishToGoogleBusinessProfile(articleData, publishedUrl, retries = 3) {
  const accountId = process.env.GOOGLE_GBP_ACCOUNT_ID;
  const locationId = process.env.GOOGLE_GBP_LOCATION_ID;
  let accessToken = process.env.GOOGLE_GBP_ACCESS_TOKEN;

  if (process.env.GOOGLE_GBP_REFRESH_TOKEN) {
    try {
      accessToken = await refreshAccessToken();
    } catch (e) {
      log(`Auto-refresh token failed: ${e.message}`, 'WARN');
    }
  }

  const gbpSummary = `${articleData.title}: ${articleData.metaDescription} Read our full Local Delhi Fashion guide here: ${publishedUrl}`;
  const payload = {
    summary: gbpSummary,
    callToAction: {
      actionType: "LEARN_MORE",
      url: publishedUrl
    }
  };

  log(`Attempting to publish post to Google Business Profile...`);

  if (!accountId || !locationId || !accessToken) {
    log(`Missing Google Business Profile API keys (GOOGLE_GBP_ACCOUNT_ID, GOOGLE_GBP_LOCATION_ID, GOOGLE_GBP_ACCESS_TOKEN). Aborting publishing check.`, 'ERROR');
    return { success: false, error: 'Missing Credentials' };
  }

  const url = `https://mybusiness.googleapis.com/v4/accounts/${accountId}/locations/${locationId}/localPosts`;

  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${accessToken}`
        },
        body: JSON.stringify(payload)
      });

      if (!response.ok) {
        throw new Error(`GBP API returned status ${response.status}: ${await response.text()}`);
      }

      const data = await response.json();
      log(`Google Business Profile post successfully published! ID: ${data.name}`);
      return { success: true, postId: data.name };
    } catch (err) {
      log(`GBP Publish attempt ${attempt} failed: ${err.message}`, 'WARN');
      if (attempt === retries) {
        log(`Failed to publish to Google Business Profile after ${retries} attempts. Continuing remaining workflow.`, 'ERROR');
        return { success: false, error: err.message };
      }
      await new Promise(resolve => setTimeout(resolve, 2000 * attempt));
    }
  }
}

// Production Data Integrity Validator
function runProductionDataIntegrityValidator(articleData) {
  const html = articleData.contentHtml;

  // Placeholder check rules
  const invalidPatterns = [
    /99999\s*99999/,
    /9876543210/,
    /example\.com/,
    /dummy/,
    /placeholder/,
    /fake/i
  ];

  for (const pattern of invalidPatterns) {
    if (pattern.test(html) || pattern.test(articleData.title) || pattern.test(articleData.seoTitle)) {
      throw new Error(`Data Integrity check failed: Detected placeholder/mock value matching ${pattern.toString()}`);
    }
  }

  log("Production Data Integrity checks passed successfully.");
}

// SEO Audit engine
function runSeoAudit(articleData, focusKeyword) {
  const html = articleData.contentHtml.toLowerCase();
  const kw = focusKeyword.toLowerCase();
  const title = articleData.title.toLowerCase();

  let score = 100;
  const issues = [];

  const words = html.replace(/<[^>]*>/g, ' ').split(/\s+/).filter(Boolean);
  const kwCount = (html.match(new RegExp(kw, 'g')) || []).length;
  const density = (kwCount / words.length) * 100;

  if (density < 0.5) {
    score -= 10;
    issues.push(`Keyword density is too low (${density.toFixed(2)}%). Target: 0.5% - 2.5%`);
  } else if (density > 3.0) {
    score -= 10;
    issues.push(`Keyword density is too high (${density.toFixed(2)}%). Warning: Keyword stuffing.`);
  }

  if (!title.includes(kw)) {
    score -= 10;
    issues.push(`Focus keyword not found in the main H1 title.`);
  }

  if (!html.includes('<h2')) {
    score -= 15;
    issues.push(`Article is missing H2 headings.`);
  }

  if (words.length < 500) {
    score -= 15;
    issues.push(`Article content is too thin (${words.length} words). Target: >600 words.`);
  }

  return {
    score: Math.max(0, score),
    wordCount: words.length,
    keywordDensity: density,
    issues
  };
}

// Master execution pipeline
async function main() {
  const startTime = Date.now();
  const todayStr = new Date().toISOString().split('T')[0];

  // Daily Run Tracker Quality Gate Check
  const dailyHistoryPath = path.join(__dirname, '..', 'memory', 'daily_execution_history.json');
  let dailyHistory = {};
  if (fs.existsSync(dailyHistoryPath)) {
    try {
      dailyHistory = JSON.parse(fs.readFileSync(dailyHistoryPath, 'utf-8'));
    } catch (e) {
      dailyHistory = {};
    }
  }

  if (dailyHistory[todayStr] && !forcedTopicTitle) {
    log(`Blog campaign for today (${todayStr}) has already been generated. Exiting execution.`);
    process.exit(0);
  }

  const memoryPath = path.join(__dirname, '..', 'memory', 'published_topics.json');
  if (!fs.existsSync(memoryPath)) {
    log(`Memory file not found at ${memoryPath}`, 'ERROR');
    process.exit(1);
  }

  const memory = JSON.parse(fs.readFileSync(memoryPath, 'utf-8'));
  let selectedTopic = null;

  if (forcedTopicTitle) {
    log(`Forced topic title specified: "${forcedTopicTitle}"`);
    selectedTopic = {
      title: forcedTopicTitle,
      focusKeyword: forcedTopicTitle,
      category: "Casual Wear",
      brief: "Forced generation of this topic."
    };
  } else {
    if (!memory.queue || memory.queue.length === 0) {
      log('Queue is empty. Generating new topics via LLM...');
      const topicPromptTemplate = fs.readFileSync(path.join(__dirname, '..', 'prompts', 'seo', 'topic_generator_prompt.txt'), 'utf-8');
      const publishedTitles = memory.published.map(p => `"- ${p.title}"`).join('\n');
      const topicPrompt = topicPromptTemplate.replace('{{PUBLISHED_TOPICS}}', publishedTitles || "None");

      const generated = await callGemini(topicPrompt);
      const cleanedText = generated.text.replace(/```json|```/g, '').trim();
      const newTopics = JSON.parse(cleanedText);

      if (Array.isArray(newTopics)) {
        log(`Generated ${newTopics.length} new topics. Appending to queue.`);
        memory.queue = memory.queue ? memory.queue.concat(newTopics) : newTopics;
        fs.writeFileSync(memoryPath, JSON.stringify(memory, null, 2), 'utf-8');
      } else {
        throw new Error('Failed to generate valid topics array from Gemini.');
      }
    }

    selectedTopic = memory.queue.shift();
    log(`Selected Topic: "${selectedTopic.title}" (Focus Keyword: "${selectedTopic.focusKeyword}")`);
  }

  // Generate the actual article
  const systemPromptTemplate = fs.readFileSync(path.join(__dirname, '..', 'prompts', 'seo', 'content_agent_system_prompt.txt'), 'utf-8');
  const systemPrompt = systemPromptTemplate
    .replace('{{TOPIC_TITLE}}', selectedTopic.title)
    .replace('{{FOCUS_KEYWORD}}', selectedTopic.focusKeyword)
    .replace('{{CATEGORY}}', selectedTopic.category)
    .replace('{{BRIEF}}', selectedTopic.brief || "No description provided.");

  log('Requesting content & campaign generation from Gemini API...');
  const generatedContent = await callGemini(systemPrompt);
  
  // Parse response
  const cleanedContent = generatedContent.text.replace(/```json|```/g, '').trim();
  let articleData;
  try {
    articleData = JSON.parse(cleanedContent);
    log(`FAQs count: ${articleData.faqs ? articleData.faqs.length : 0}`);
  } catch (err) {
    log(`JSON parsing of generated content failed. Raw content printed in verbose mode.`, 'ERROR');
    if (isVerbose) console.log(generatedContent.text);
    throw new Error(`JSON parse error: ${err.message}`);
  }

  // Generate and append CTA block
  const ctaBlockHtml = await generateCtaBlock(selectedTopic.category);
  articleData.contentHtml += ctaBlockHtml;

  // Run SEO Quality Gate Audit
  log('Running SEO Quality Gate audit checks...');
  const seoReport = runSeoAudit(articleData, selectedTopic.focusKeyword);
  log(`SEO Score: ${seoReport.score}/100, Word Count: ${seoReport.wordCount}`);

  if (seoReport.score < 90) {
    log(`SEO score did not pass the Quality Gate! Issues:\n${seoReport.issues.join('\n')}`, 'ERROR');
    if (!forcedTopicTitle) {
      memory.queue.unshift(selectedTopic);
      fs.writeFileSync(memoryPath, JSON.stringify(memory, null, 2), 'utf-8');
    }
    process.exit(1);
  }

  log('SEO Quality Gate passed.');

  // Run Production Data Integrity Checks
  runProductionDataIntegrityValidator(articleData);

  // Create local marketing assets directories
  const assetsDir = path.join(__dirname, '..', 'projects', 'content-marketing', articleData.slug);
  fs.mkdirSync(assetsDir, { recursive: true });

  // Generate image and upload
  let mediaId = null;
  const imgBuffer = await generateFeaturedImage(articleData.featuredImagePrompt, selectedTopic.focusKeyword);
  if (imgBuffer) {
    fs.writeFileSync(path.join(assetsDir, 'featured_image.jpg'), imgBuffer);
    if (!isDryRun) {
      mediaId = await uploadMediaToWordPress(imgBuffer, `${articleData.slug}.jpg`, {
        title: articleData.title,
        altText: `Fashion feature for ${articleData.title}`,
        caption: `Featured image for AME Bazaar article: ${articleData.title}`,
        description: articleData.metaDescription
      });
      log(`Featured image uploaded and saved locally. Media ID: ${mediaId}`);
    }
  }

  // Append Structured Data Schema JSON-LD tags
  const articleSchema = {
    "@context": "https://schema.org",
    "@type": "Article",
    "headline": articleData.title,
    "description": articleData.metaDescription,
    "image": `https://amebazaar.in/wp-content/uploads/${articleData.slug}.jpg`,
    "author": {
      "@type": "Organization",
      "name": "AME Bazaar"
    },
    "publisher": {
      "@type": "Organization",
      "name": "AME Bazaar"
    }
  };

  const faqSchema = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    "mainEntity": articleData.faqs.map(faq => ({
      "@type": "Question",
      "name": faq.question,
      "acceptedAnswer": {
        "@type": "Answer",
        "text": faq.answer
      }
    }))
  };

  articleData.contentHtml += `
    <!-- Structured Data Schemas -->
    <script type="application/ld+json">${JSON.stringify(articleSchema, null, 2)}</script>
    <script type="application/ld+json">${JSON.stringify(faqSchema, null, 2)}</script>
  `;

  // Write all asset files locally
  fs.writeFileSync(path.join(assetsDir, 'blog.html'), articleData.contentHtml || "");
  fs.writeFileSync(path.join(assetsDir, 'blog.md'), `# ${articleData.title}\n\n${articleData.contentHtml || ""}`);
  fs.writeFileSync(path.join(assetsDir, 'instagram.txt'), `--- INSTAGRAM REEL SCRIPT ---\n${articleData.instagramReelScript || ""}\n\n--- INSTAGRAM CAPTION ---\n${articleData.instagramCaption || ""}`);
  fs.writeFileSync(path.join(assetsDir, 'facebook.txt'), articleData.facebookPost || "");
  fs.writeFileSync(path.join(assetsDir, 'whatsapp.txt'), articleData.whatsAppBroadcast || "");
  fs.writeFileSync(path.join(assetsDir, 'gbp.txt'), articleData.googleBusinessPost || "");
  fs.writeFileSync(path.join(assetsDir, 'x.txt'), articleData.xPost || "");
  fs.writeFileSync(path.join(assetsDir, 'youtube_short.txt'), articleData.youtubeShortScript || "");
  fs.writeFileSync(path.join(assetsDir, 'featured_image_prompt.txt'), articleData.featuredImagePrompt || "");
  fs.writeFileSync(path.join(assetsDir, 'seo_report.json'), JSON.stringify(seoReport, null, 2));

  log(`Saved all marketing campaign assets locally under: /projects/content-marketing/${articleData.slug}/`);

  let publishedUrl = '';
  let gbpResult = { success: false };

  if (isDryRun) {
    log('--- DRY RUN MODE ---');
    if (!forcedTopicTitle) memory.queue.unshift(selectedTopic);
  } else {
    log('Publishing draft to WordPress REST API...');
    const authString = Buffer.from(`${WORDPRESS_USERNAME}:${WORDPRESS_APPLICATION_PASSWORD}`).toString('base64');
    const url = `${WORDPRESS_URL.replace(/\/$/, '')}/wp-json/wp/v2/posts`;

    const payload = {
      title: articleData.title,
      content: articleData.contentHtml,
      slug: articleData.slug,
      status: 'draft',
      featured_media: mediaId,
      meta: {
        _yoast_wpseo_title: articleData.seoTitle,
        _yoast_wpseo_metadesc: articleData.metaDescription
      }
    };

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Basic ${authString}`
      },
      body: JSON.stringify(payload)
    });

    if (!response.ok) {
      throw new Error(`WordPress REST API returned status ${response.status}: ${await response.text()}`);
    }

    const result = await response.json();
    publishedUrl = result.link;
    log(`Draft published successfully! Post ID: ${result.id}, Link: ${publishedUrl}`);

    // Publish to Google Business Profile automatically
    gbpResult = await publishToGoogleBusinessProfile(articleData, publishedUrl);

    // Update daily execution history to prevent duplicate runs today
    if (!forcedTopicTitle) {
      dailyHistory[todayStr] = {
        publishedAt: new Date().toISOString(),
        topic: selectedTopic.title,
        postId: result.id,
        link: publishedUrl,
        gbpPostId: gbpResult.postId || "MOCK_OR_FAILED"
      };
      fs.writeFileSync(dailyHistoryPath, JSON.stringify(dailyHistory, null, 2), 'utf-8');
      
      // Update published topics registry
      memory.published.push({
        title: selectedTopic.title,
        focusKeyword: selectedTopic.focusKeyword,
        category: selectedTopic.category,
        publishedAt: new Date().toISOString(),
        postId: result.id,
        link: publishedUrl,
        gbpPostId: gbpResult.postId || "MOCK_OR_FAILED",
        assetsPath: `/projects/content-marketing/${articleData.slug}/`
      });
      fs.writeFileSync(memoryPath, JSON.stringify(memory, null, 2), 'utf-8');
      log('Updated daily execution and published topics memory.');
    }
  }

  const executionTime = ((Date.now() - startTime) / 1000).toFixed(2);
  log(`Execution complete. Time: ${executionTime}s. API usage details logged.`);
  
  const summaryReport = {
    success: true,
    executionTimeSeconds: parseFloat(executionTime),
    publishedUrl: publishedUrl || 'DRY_RUN',
    gbpPostId: gbpResult.postId || 'DRY_RUN_OR_FAILED',
    seoScore: seoReport.score,
    wordCount: seoReport.wordCount,
    slug: articleData.slug,
    usage: generatedContent.usage
  };
  fs.writeFileSync(path.join(assetsDir, 'execution_summary.json'), JSON.stringify(summaryReport, null, 2));
  process.exit(0);
}

main().catch(err => {
  log(`Execution failed: ${err.message}`, 'ERROR');
  process.exit(1);
});
