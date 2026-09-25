/**
 * ==============================================================================
 * AME Bazaar Fashion AI Content Engine - Google Apps Script Port
 * Module: ImageEngine.gs
 * ==============================================================================
 * Multi-provider Featured Image generator and WordPress Media Uploader.
 */

var visionCallsCount = 0;
var visionUnavailable = false;

/**
 * Memory Storage Helper for Image History.
 * Uses Script Properties: 'AME_IMAGE_HISTORY'
 */
function getImageHistory() {
  const raw = PropertiesService.getScriptProperties().getProperty('AME_IMAGE_HISTORY');
  if (raw) {
    try {
      return JSON.parse(raw);
    } catch (e) {
      Logger.log('[WARN] Corrupted image history, initializing fresh.');
    }
  }
  return [];
}

/**
 * Saves image history back to Script Properties.
 * @param {Array} history
 */
function saveImageHistory(history) {
  PropertiesService.getScriptProperties().setProperty('AME_IMAGE_HISTORY', JSON.stringify(history));
}

/**
 * Searches Wikimedia Commons via Hostinger image-service for a photo matching the structured intent queries.
 * Operates completely independently of WordPress credentials and with zero external Unsplash dependency.
 * Validates against history to prevent duplicates.
 * @param {Array<string>} queries
 * @param {string} fallbackCategory
 * @param {string} focusKeyword
 * @param {Object} brief
 * @param {string} altText
 * @param {string} description
 * @param {string} articleTitle
 * @returns {Object|null} { blob: Blob, mediaId: string, url: string, isFallback: boolean, filename: string, title: string, altText: string, description: string, caption: string }
 */
function fetchTopicSpecificImage(queries, fallbackCategory, focusKeyword = '', brief = null, altText = '', description = '', articleTitle = '') {
  visionCallsCount = 0; // reset for this article run
  visionUnavailable = false; // reset for this article run
  const startTime = new Date().getTime();
  const history = getImageHistory();
  const reusedPasses = [];
  const attemptedQueries = [...queries];
  let regeneratedUsed = false;
  let totalCandidatesRetrieved = 0;
  let totalCandidatesPassedFilter = 0;
  let topCandidatesEvaluated = 0;

  Logger.log(`[IMAGE] Starting FAST 3-STAGE IMAGE PIPELINE (Wikimedia via Hostinger Only)`);
  Logger.log(`[IMAGE] Initial search queries: ${queries.join(', ')}`);

  // Helper function to collect candidates from Wikimedia Commons via Hostinger image-service
  function collectWikimediaCandidates(searchQueries) {
    const serviceUrl = getImageServiceUrl();
    const serviceSecret = getImageServiceSecret();
    if (!serviceUrl || !serviceSecret) {
      Logger.log('[IMAGE] Hostinger image service not configured (IMAGE_SERVICE_URL or IMAGE_SERVICE_SECRET missing). Skipping Wikimedia.');
      return [];
    }

    const collected = [];
    const seenIds = new Set();
    const limitedQueries = searchQueries.slice(0, 3).map(cleanQueryForSearch).filter(Boolean);
    if (limitedQueries.length === 0) return [];

    try {
      const res = UrlFetchApp.fetch(serviceUrl, {
        method: 'post',
        headers: {
          'X-AME-Image-Token': serviceSecret,
          'Content-Type': 'application/json',
          'User-Agent': 'AME-Bazaar-GAS-Agent/1.0'
        },
        payload: JSON.stringify({
          queries: limitedQueries,
          limit: 10
        }),
        muteHttpExceptions: true
      });

      const statusCode = res.getResponseCode();
      Logger.log(`[IMAGE DEBUG] Wikimedia Service Query: [${limitedQueries.join(', ')}] | HTTP Status: ${statusCode}`);
      if (statusCode === 200) {
        const data = JSON.parse(res.getContentText());
        const candidates = data.candidates || [];
        for (const c of candidates) {
          if (!seenIds.has(c.id)) {
            seenIds.add(c.id);
            collected.push(c);
          }
        }
      } else {
        Logger.log(`[WARN] Hostinger image service returned HTTP ${statusCode}`);
      }
    } catch (e) {
      Logger.log(`[WARN] Hostinger image service query failed: ${e.message}`);
    }

    return collected;
  }

  function runWikimediaSelectionPipeline(currentQueries, levelName) {
    const rawCandidates = collectWikimediaCandidates(currentQueries);
    if (rawCandidates.length === 0) return null;

    totalCandidatesRetrieved += rawCandidates.length;
    Logger.log(`[IMAGE DEBUG] [${levelName}] Candidates retrieved from Wikimedia: ${rawCandidates.length}`);

    // Rank candidates by deterministic score and license tier
    const candidatesWithScore = rawCandidates.map(photo => {
      const evalResult = evaluateCandidateSemantics(photo, brief, focusKeyword, fallbackCategory, articleTitle);
      const tier = (photo.license && photo.license.tier) ? photo.license.tier : 5;
      return {
        photo: photo,
        evalResult: evalResult,
        score: evalResult.score,
        tier: tier
      };
    });

    // 1. Separate eligible (non-rejected) candidates from rejected candidates
    const eligibleCandidates = candidatesWithScore.filter(c => !c.evalResult.isRejected);
    totalCandidatesPassedFilter += eligibleCandidates.length;

    if (eligibleCandidates.length === 0) {
      Logger.log(`[IMAGE] All retrieved Wikimedia candidates failed semantic filtering or had contradictions.`);
      return null;
    }

    // 2. Sort eligible candidates: license tier preference (CC0: 1 -> PD: 2 -> CC-BY: 3 -> CC-BY-SA: 4), then by score descending
    eligibleCandidates.sort((a, b) => {
      if (a.tier !== b.tier) {
        return a.tier - b.tier;
      }
      return b.score - a.score;
    });

    // Print concept groups matched for top 5 eligible candidates
    Logger.log(`\n--- Concept Groups & Scores for Top 5 Wikimedia Candidates ---`);
    const top5 = eligibleCandidates.slice(0, 5);
    top5.forEach((c, idx) => {
      const independentSignals = c.evalResult.positiveSignals.filter(s => s !== "Multiple Supporting Terms");
      const licCode = (c.photo.license && c.photo.license.code) || 'unknown';
      Logger.log(`Top Wikimedia Candidate #${idx + 1}: ID ${c.photo.id} (Tier ${c.tier}: ${licCode})`);
      Logger.log(`- Deterministic Score: ${c.score}`);
      Logger.log(`- Concept Groups Matched: [${c.evalResult.positiveSignals.join(', ')}]`);
      Logger.log(`- Contradictions / Negative Signals: [${c.evalResult.negativeSignals.join(', ')}]`);
      Logger.log(`- Total Independent Signals Count: ${independentSignals.length}`);
    });
    Logger.log(`------------------------------------------------------------\n`);

    const highConfCount = eligibleCandidates.filter(c => {
      const independentCount = c.evalResult.positiveSignals.filter(s => s !== "Multiple Supporting Terms").length;
      return c.score >= 85 && independentCount >= 3;
    }).length;

    // Run validation on top 3 eligible candidates
    const top3 = eligibleCandidates.slice(0, 3);
    for (let i = 0; i < top3.length; i++) {
      topCandidatesEvaluated++;
      const candidate = top3[i];
      const photoId = candidate.photo.id;
      const imageUrl = (candidate.photo.urls && candidate.photo.urls.regular) || candidate.photo.url;

      const verification = verifyCandidateImage(candidate.photo, imageUrl, brief, focusKeyword, fallbackCategory, articleTitle, "WIKIMEDIA");

      const independentSignals = candidate.evalResult.positiveSignals.filter(s => s !== "Multiple Supporting Terms");
      Logger.log(`Wikimedia Candidate ID: ${photoId}\nDeterministic Score: ${candidate.score}\nTier: ${candidate.tier}\nPositive Signals: [${candidate.evalResult.positiveSignals.join(', ')}]\nNegative Signals: [${candidate.evalResult.negativeSignals.join(', ')}]\nRejected/Eligible: ${candidate.evalResult.isRejected ? 'Rejected' : 'Eligible'}\nVision Attempted: ${verification.method === "GEMINI_VISION" || verification.reason.includes("Vision") ? "YES" : "NO"}\nVision Result: ${verification.visionScore !== -1 ? (verification.accepted ? "PASSED" : "FAILED") : (verification.reason.includes("Vision") ? "ERROR" : "-")}\nFinal Decision: ${verification.accepted ? "ACCEPTED" : "REJECTED (" + verification.reason + ")"}`);

      if (verification.accepted) {
        const activeBlob = verification.blob;
        const meta = generateActualImageMetadata(activeBlob, brief, articleTitle || focusKeyword, focusKeyword, fallbackCategory);

        history.push(photoId);
        if (history.length > 50) history.shift();
        saveImageHistory(history);

        const elapsed = ((new Date().getTime() - startTime) / 1000).toFixed(2);
        const attribution = candidate.photo.attribution || null;
        const caption = (attribution && attribution.creditHtml) ? attribution.creditHtml : (meta.caption || '');

        logSelectedImage("WIKIMEDIA", photoId, verification.method, candidate.score, independentSignals.length, verification.visionScore, meta);
        logFinalSelectionMetrics(photoId, verification.method, candidate.score, independentSignals.length, elapsed, verification.visionScore, totalCandidatesRetrieved, totalCandidatesPassedFilter, highConfCount, visionCallsCount, visionUnavailable ? "429 / Unavailable" : "Available");

        return {
          blob: activeBlob,
          mediaId: photoId,
          url: imageUrl,
          isFallback: false,
          filename: meta.filename,
          title: meta.title,
          altText: meta.altText,
          description: meta.description,
          caption: caption,
          visionScore: verification.visionScore,
          visionCalls: visionCallsCount,
          verificationMethod: verification.method,
          retrievedCount: totalCandidatesRetrieved,
          filteredCount: totalCandidatesPassedFilter,
          evaluatedCount: topCandidatesEvaluated,
          source: "wikimedia_commons",
          license: candidate.photo.license || null,
          attribution: attribution
        };
      }
    }

    return null;
  }

  // Level 1: Try Wikimedia Commons via Hostinger first
  let selected = runWikimediaSelectionPipeline(queries, 'WIKIMEDIA LEVEL 1');
  if (selected) return selected;

  // Regenerate queries ONCE (DETERMINISTICALLY) from structured image intent
  Logger.log(`[IMAGE] Primary Wikimedia queries returned no passing candidates. Regenerating search queries deterministically from structured intent...`);
  const regeneratedQueries = [];
  if (brief) {
    const rawGarments = (brief.garmentTypes && brief.garmentTypes.length > 0) ? brief.garmentTypes : [];
    let coreGarment = rawGarments.map(g => String(g).toLowerCase().replace(/[-_]/g, ' ').trim()).find(g => g.length > 2) || (fallbackCategory ? fallbackCategory.toLowerCase() : 'ethnic wear');

    // Normalize core garment for maximum Wikimedia discoverability
    if (/\b(sarees?|saris?|pattu|kanchipuram|kanjeevaram|banarasi)\b/i.test(coreGarment) || /\b(sarees?|saris?)\b/i.test(focusKeyword || '') || /\b(sarees?|saris?)\b/i.test(articleTitle || '')) {
      coreGarment = "silk saree";
    } else if (/\b(kurtis?|kurtas?)\b/i.test(coreGarment)) {
      coreGarment = "cotton kurti";
    } else if (/\b(lehengas?)\b/i.test(coreGarment)) {
      coreGarment = "lehenga";
    } else if (/\b(sherwanis?)\b/i.test(coreGarment)) {
      coreGarment = "sherwani";
    } else if (/\b(blazers?|suits?)\b/i.test(coreGarment)) {
      coreGarment = "formal blazer";
    }

    const isKids = (brief.ageTargets && brief.ageTargets.includes("Kids")) || /\bkids\b/i.test(fallbackCategory || '');
    const isMen = (brief.genderTargets && brief.genderTargets.includes("Men")) || /\bgents|men\b/i.test(fallbackCategory || '');
    const demoPrefix = isKids ? 'kids' : (isMen ? 'indian man' : 'indian woman');

    // Generate concise, high-yield queries for Wikimedia Commons
    regeneratedQueries.push(`traditional ${coreGarment}`);
    regeneratedQueries.push(`${demoPrefix} ${coreGarment}`);
    regeneratedQueries.push(`festive ${coreGarment}`);
  }
  
  if (regeneratedQueries.length === 0) {
    regeneratedQueries.push(`${focusKeyword} Indian fashion`);
    regeneratedQueries.push(`${focusKeyword} ethnic wear`);
    regeneratedQueries.push(`${focusKeyword} summer outfit`);
  }

  regeneratedUsed = true;
  Logger.log(`[IMAGE] Regenerated search queries: ${regeneratedQueries.join(', ')}`);

  // Try Wikimedia Commons with regenerated queries
  selected = runWikimediaSelectionPipeline(regeneratedQueries, 'WIKIMEDIA REGENERATED LEVEL');
  if (selected) {
    selected.queryRegeneratedUsed = true;
    return selected;
  }

  // If everything failed, fail safely with blob: null to trigger repair loop.
  Logger.log(`[IMAGE] All visual search and recovery levels failed. Safe failure.`);
  const elapsed = ((new Date().getTime() - startTime) / 1000).toFixed(2);
  Logger.log(`\n=== IMAGE SELECTION METRICS ===`);
  Logger.log(`Candidates retrieved: ${totalCandidatesRetrieved}`);
  Logger.log(`Candidates after deterministic filtering: ${totalCandidatesPassedFilter}`);
  Logger.log(`Candidates sent to Vision: ${visionCallsCount}`);
  Logger.log(`Vision calls actually made: ${visionCallsCount}`);
  Logger.log(`Vision status: ${visionUnavailable ? '429 / Unavailable' : 'Available'}`);
  Logger.log(`Selected image ID: NONE`);
  Logger.log(`Verification method: NONE`);
  Logger.log(`Fallback used: true`);
  Logger.log(`Execution time: ${elapsed}s`);
  Logger.log(`================================\n`);

  return {
    blob: null,
    mediaId: 'failed-' + Date.now(),
    url: '',
    isFallback: true,
    filename: '',
    title: '',
    altText: '',
    description: '',
    caption: '',
    visionScore: 0,
    visionCalls: visionCallsCount,
    queryRegeneratedUsed: regeneratedUsed,
    retrievedCount: totalCandidatesRetrieved,
    filteredCount: totalCandidatesPassedFilter,
    evaluatedCount: topCandidatesEvaluated,
    verificationMethod: "NONE"
  };
}

/**
 * Helper to call Gemini and return structured query list.
 */
function generateQueriesFromGemini(promptText) {
  try {
    const res = callGemini(promptText, 1, false, true);
    const parsed = cleanAndParseJson(res.text);
    if (Array.isArray(parsed)) {
      return parsed.map(q => String(q).trim()).filter(Boolean);
    }
  } catch (e) {
    Logger.log(`[WARN] Failed to generate queries: ${e.message}`);
  }
  return [];
}

/**
 * Automatically derives structured visual intent and image search queries
 * directly from the article topic and content, completely independent of WordPress.
 * 
 * @param {Object} topic
 * @param {Object} [articleData]
 * @returns {Object} imageSemanticBrief
 */
function deriveImageSemanticBrief(topic, articleData = null) {
  topic = topic || {};
  articleData = articleData || {};

  const title = (articleData.title || topic.title || '').trim();
  const keyword = (topic.focusKeyword || '').trim();
  const category = (articleData.primaryCategory || topic.category || '').trim();
  const rawContent = articleData.contentHtml ? articleData.contentHtml.replace(/<[^>]+>/g, ' ').slice(0, 1500) : '';
  const fullText = `${title} ${keyword} ${category} ${topic.seasonalContext || ''} ${topic.occasionContext || ''} ${rawContent}`.toLowerCase();

  // 1. Target Demographics & Gender & Age
  const isKids = /\b(kids|kid|child|children|boys?|girls?|baby|toddler|infant|youths?)\b/i.test(fullText) ||
                 /\b(kids wear|boys wear|girls wear)\b/i.test(category);
  const isMen = !isKids && (/\b(men|man|mens|gents?|groom|male|gentleman)\b/i.test(fullText) || /\b(gents wear|men's wear)\b/i.test(category));
  const isWomen = !isKids && !isMen && (/\b(women|woman|womens|ladies|lady|female|bride)\b/i.test(fullText) || /\b(ladies wear|women's wear)\b/i.test(category));

  let genderTargets = ["Unisex"];
  let ageTargets = ["Adult"];
  let primarySubject = "Indian fashion model in stylish outfit";
  let mustShow = "authentic Indian attire, high quality garment details";
  let mustNotShow = "generic western clothing, blurry subjects, inappropriate styling";

  if (isKids) {
    ageTargets = ["Kids"];
    if (/\b(girl|girls|daughter)\b/i.test(fullText)) {
      genderTargets = ["Kids", "Female"];
      primarySubject = "Indian young girl in comfortable children's clothing";
    } else if (/\b(boy|boys|son)\b/i.test(fullText)) {
      genderTargets = ["Kids", "Male"];
      primarySubject = "Indian young boy in smart casual children's wear";
    } else {
      genderTargets = ["Kids", "Unisex"];
      primarySubject = "Indian children wearing vibrant stylish kids fashion";
    }
    mustShow = "child model or children clothing, bright colors, age-appropriate styling";
    mustNotShow = "adult models, corporate formal suits, heavy bridal wear";
  } else if (isMen) {
    ageTargets = ["Adult"];
    genderTargets = ["Male"];
    primarySubject = "Indian man wearing tailored menswear";
    mustShow = "male model, crisp tailoring, authentic menswear styling";
    mustNotShow = "female models, women's dresses, sarees, kurtis, kids clothing";
  } else if (isWomen) {
    ageTargets = ["Adult"];
    genderTargets = ["Female"];
    primarySubject = "Indian woman in elegant ethnic attire";
    mustShow = "female model, graceful drape, authentic ethnic design";
    mustNotShow = "male models, western menswear, kids clothing";
  }

  // 2. Garment Types
  const garmentTypes = [];
  if (/\b(rainwear|raincoat|rain jacket|waterproof)\b/i.test(fullText)) {
    garmentTypes.push("rainwear", "rain jacket");
  }
  if (/\b(kurta pajama|kurta|kurtas)\b/i.test(fullText)) {
    garmentTypes.push("kurta pajama", "ethnic kurta");
  }
  if (/\b(cotton kurti|kurti|kurtis)\b/i.test(fullText)) {
    garmentTypes.push("cotton kurti", "kurti tunic");
  }
  if (/\b(saree|saris|sarees)\b/i.test(fullText)) {
    garmentTypes.push("saree", "festive saree");
  }
  if (/\b(lehenga|lehengas)\b/i.test(fullText)) {
    garmentTypes.push("lehenga choli");
  }
  if (/\b(sherwani|sherwanis)\b/i.test(fullText)) {
    garmentTypes.push("sherwani");
  }
  if (/\b(salwar|salwar suit|suit|kameez)\b/i.test(fullText)) {
    garmentTypes.push("salwar suit", "ethnic suit");
  }
  if (/\b(blazer|blazers|coat|suit)\b/i.test(fullText) && !garmentTypes.includes("salwar suit")) {
    garmentTypes.push("blazer", "formal suit");
  }
  if (garmentTypes.length === 0) {
    if (isKids) garmentTypes.push("casual kids outfits", "festive kids wear");
    else if (isMen) garmentTypes.push("menswear outfit", "ethnic kurta");
    else if (isWomen) garmentTypes.push("ethnic wear", "cotton kurti");
    else garmentTypes.push("fashion clothing");
  }

  // 3. Season
  let season = "All-Season";
  if (/\b(monsoon|rain|rainy|monsoons)\b/i.test(fullText)) {
    season = "Monsoon";
  } else if (/\b(summer|heat|hot|sunny)\b/i.test(fullText)) {
    season = "Summer";
  } else if (/\b(winter|cold|warm|wool)\b/i.test(fullText)) {
    season = "Winter";
  } else if (/\b(festive|diwali|wedding|eid)\b/i.test(fullText)) {
    season = "Festive Season";
  }

  // 4. Occasion
  let occasion = "Casual";
  if (/\b(diwali)\b/i.test(fullText)) {
    occasion = "Diwali";
  } else if (/\b(eid)\b/i.test(fullText)) {
    occasion = "Eid";
  } else if (/\b(wedding|marriage|shaadi|reception)\b/i.test(fullText)) {
    occasion = "Wedding";
  } else if (/\b(party|celebration|festive|festival)\b/i.test(fullText)) {
    occasion = "Festive";
  } else if (/\b(monsoon|rain|rainy)\b/i.test(fullText)) {
    occasion = "Monsoon Rainy Season";
  } else if (/\b(office|formal|work|business)\b/i.test(fullText)) {
    occasion = "Formal Office";
  }

  // 5. Visual Setting & Local Context
  let visualSetting = "outdoor day setting with vibrant local context";
  if (season === "Monsoon") {
    visualSetting = "outdoor monsoon street with raindrops, colorful umbrella or wet reflections";
  } else if (season === "Summer") {
    visualSetting = "bright sunny outdoor daylight with light breathable atmosphere";
  } else if (occasion === "Wedding" || occasion === "Diwali") {
    visualSetting = "warmly lit festive celebration setting or traditional courtyard";
  }

  // 6. Generate Search Queries from Visual Intent
  const primaryGarment = garmentTypes[0] || "fashion clothing";
  const searchQueries = [];

  if (isKids) {
    if (season === "Monsoon") {
      searchQueries.push("indian child rain jacket");
      searchQueries.push("kids monsoon clothing delhi");
      searchQueries.push("children rainy day fashion");
    } else if (occasion === "Diwali" || occasion === "Festive") {
      searchQueries.push("indian kids traditional festive dress");
      searchQueries.push("children ethnic diwali clothing");
      searchQueries.push("kids ethnic wear delhi");
    } else {
      searchQueries.push(`indian child ${primaryGarment}`);
      searchQueries.push(`kids ${primaryGarment} fashion`);
      searchQueries.push(`children stylish ${season.toLowerCase()} wear`);
    }
  } else if (isMen) {
    if (occasion === "Diwali" || occasion === "Festive") {
      searchQueries.push("indian man festive kurta pajama diwali");
      searchQueries.push("mens ethnic kurta pajama traditional");
      searchQueries.push("gents diwali festive kurta delhi");
    } else {
      searchQueries.push(`indian man wearing ${primaryGarment}`);
      searchQueries.push(`mens stylish ${primaryGarment} ${season.toLowerCase()}`);
      searchQueries.push(`gents ${primaryGarment} fashion delhi`);
    }
  } else if (isWomen) {
    if (season === "Summer") {
      searchQueries.push("indian woman wearing cotton kurti summer");
      searchQueries.push("breathable cotton kurti summer style");
      searchQueries.push("women cotton ethnic kurti delhi");
    } else if (occasion === "Wedding" || occasion === "Diwali") {
      searchQueries.push(`indian woman festive ${primaryGarment}`);
      searchQueries.push(`women ethnic festive ${primaryGarment} traditional`);
      searchQueries.push(`traditional ${primaryGarment} delhi fashion`);
    } else {
      searchQueries.push(`indian woman wearing ${primaryGarment}`);
      searchQueries.push(`women stylish ${primaryGarment} ${season.toLowerCase()}`);
      searchQueries.push(`ladies ${primaryGarment} fashion delhi`);
    }
  } else {
    searchQueries.push(`${keyword} Indian fashion`);
    searchQueries.push(`${keyword} ethnic wear`);
    searchQueries.push(`${keyword} clothing delhi`);
  }

  return {
    primarySubject: primarySubject,
    secondarySubjects: [visualSetting],
    garmentTypes: garmentTypes,
    genderTargets: genderTargets,
    ageTargets: ageTargets,
    occasion: occasion,
    season: season,
    fabricContext: /\b(cotton)\b/i.test(fullText) ? "cotton" : (/\b(silk)\b/i.test(fullText) ? "silk" : "all-weather fabric"),
    visualSetting: visualSetting,
    localContext: "Delhi / Kirari",
    commercialIntent: "retail fashion discovery",
    mustShow: mustShow,
    mustNotShow: mustNotShow,
    visualPriority: `${primaryGarment} aesthetic`,
    imageSearchQueries: searchQueries
  };
}

/**
 * Generate Level 2 queries.
 */
function generateLevel2Queries(title, focusKeyword, category, brief, attemptedQueries) {
  const prompt = `You are an AI Image Search Strategy Optimizer.
We need to find a highly relevant image for this article:
Title: "${title}"
Focus Keyword: "${focusKeyword}"
Category: "${category}"
Semantic Brief: ${JSON.stringify(brief)}

We tried these queries but they failed to find a relevant unique image: ${attemptedQueries.join(', ')}

Generate 3 new alternative search queries for image search that deliberately change the search strategy rather than simply repeating the same queries.
For example, change demographic descriptions, settings, or search terms to capture the target concept.
Return ONLY a JSON array of strings:
["new query 1", "new query 2", "new query 3"]`;
  return generateQueriesFromGemini(prompt);
}

/**
 * Generate Level 4 queries.
 */
function generateLevel4Queries(title, focusKeyword, category, brief) {
  const prompt = `You are an AI Image Search Strategy Optimizer.
We need to find a broader but still semantically constrained image for this article:
Title: "${title}"
Focus Keyword: "${focusKeyword}"
Category: "${category}"
Semantic Brief: ${JSON.stringify(brief)}

Generate 3 new broader but still semantically constrained search queries.
DO NOT use generic terms like "fashion", "clothing", "kids", "women", "men", "ethnic wear" alone. The queries must retain the article's specific semantic intent.
Return ONLY a JSON array of strings:
["broader query 1", "broader query 2", "broader query 3"]`;
  return generateQueriesFromGemini(prompt);
}

/**
 * Generates metadata from the actual image + semantic brief.
 */
function generateActualImageMetadata(imageBlob, brief, title, focusKeyword, category) {
  const prompt = `You are a Multimodal AI Image Metadata Generator for AME Bazaar.
We have selected an image for this article:
Title: "${title}"
Focus Keyword: "${focusKeyword}"
Category: "${category}"
Semantic Brief: ${JSON.stringify(brief)}

You must analyze what is ACTUALLY visible in the image and generate contextually accurate, natural language metadata.

CRITICAL RULES:
- DO NOT keyword stuff.
- DO NOT invent visual facts. Do NOT claim the location is Delhi/Kirari, a specific fabric, a specific garment, a specific gender/age group, custom tailoring services, or a store interior unless you can clearly verify from the image content itself that it is actually visible or depicted.
- Filename format MUST be: [primary-keyword]-[specific-visual]-[local-context].webp (lowercase, hyphen-separated, descriptive). Do NOT include random numbers, IDs, or file extensions other than .webp. Example: breathable-cotton-kurti-summer-women-kirari.webp. Avoid generic names like image.webp.

Return ONLY a JSON object:
{
  "filename": "descriptive-filename.webp",
  "title": "WordPress Media Title",
  "altText": "Descriptive ALT text (must describe what is actually visible)",
  "description": "Descriptive Media Description",
  "caption": "Short user-facing caption (optional)"
}`;

  try {
    const res = callGeminiVision(prompt, imageBlob, 1, false, true);
    const meta = cleanAndParseJson(res.text);
    
    let filename = (meta.filename || '').toLowerCase().replace(/[^a-z0-9\-\.]/g, '');
    if (!filename || filename === 'image.webp') {
      filename = `${focusKeyword.toLowerCase().replace(/[^a-z0-9]+/g, '-')}-delhi.webp`;
    }
    if (!filename.endsWith('.webp')) {
      filename = filename.replace(/\.[^/.]+$/, "") + ".webp";
    }

    return {
      filename: filename,
      title: meta.title || title,
      altText: meta.altText || focusKeyword,
      description: meta.description || meta.altText || '',
      caption: meta.caption || ''
    };
  } catch (e) {
    Logger.log(`[WARN] Failed to generate actual image metadata: ${e.message}. Using fallback metadata.`);
    let safeKw = focusKeyword.toLowerCase().replace(/[^a-z0-9]+/g, '-');
    return {
      filename: `${safeKw}-kirari-delhi.webp`,
      title: title,
      altText: `AME Bazaar fashion: ${focusKeyword}`,
      description: `Feature image showcasing ${focusKeyword} at AME Bazaar Kirari, Delhi.`,
      caption: ''
    };
  }
}

/**
 * Builds the vision audit prompt.
 */
function buildVisionValidationPrompt(brief, altText, description) {
  return `Evaluate this image against the following Semantic Brief and Metadata.

SEMANTIC BRIEF:
- Primary Subject: ${brief.primarySubject || ''}
- Core Garment: ${(brief.garmentTypes || []).join(', ')}
- Target Demographic: ${(brief.genderTargets || []).join(', ')} ${(brief.ageTargets || []).join(', ')}
- Occasion: ${brief.occasion || ''}
- Cultural / Geographic Context: Indian fashion / ethnic wear
- Must Not Show: ${brief.mustNotShow || ''}

CRITERIA FOR EVALUATION:
Focus on CORE VISUAL INTENT:
1. Does the image depict the core garment (e.g. silk saree, ethnic dress) or authentic apparel?
2. Does the image avoid forbidden elements (monuments, architecture, scenery, western casuals)?
3. Does the image have appropriate Indian cultural context?
Note: Do NOT penalize or reject for secondary styling details (such as missing custom blouse tailoring, jewelry accessories, or specific background interiors) if the core garment and ethnic context are authentic.

Return ONLY a JSON object:
{
  "relevant": true,
  "score": 85,
  "mismatches": []
}`;
}



/**
 * Uploads an image Blob to the WordPress Media Library and sets metadata.
 * @param {GoogleAppsScript.Base.Blob} imageBlob
 * @param {string} filename
 * @param {{title: string, altText: string, caption: string, description: string}} metadata
 * @returns {number|null} WordPress Media ID
 */
function uploadMediaToWordPress(imageBlob, filename, metadata) {
  if (!imageBlob) return null;

  let wpUrl = getSecret('WORDPRESS_URL');
  if (!wpUrl) return null;
  wpUrl = wpUrl.trim();
  if (wpUrl.endsWith('/')) {
    wpUrl = wpUrl.slice(0, -1);
  }
  const authHeader = getWordPressAuthHeader();
  if (!authHeader) {
    Logger.log('[WARN] Missing WordPress credentials for media upload.');
    return null;
  }

  // Ensure extension matches blob content type if it's webp
  if (filename && !filename.endsWith('.webp')) {
      filename = filename.replace(/\.[^/.]+$/, "") + ".webp";
  }
  
  // WP API expects standard image/jpeg or image/webp based on blob
  imageBlob.setContentType('image/webp');
  if (typeof imageBlob.setName === 'function') {
    imageBlob.setName(filename);
  }

  // Idempotency check: see if media already exists
  const searchUrl = `${wpUrl}/wp-json/wp/v2/media?search=${encodeURIComponent(metadata.title || filename)}`;
  try {
    const searchRes = UrlFetchApp.fetch(searchUrl, {
      method: 'get',
      headers: { 'Authorization': authHeader, 'User-Agent': 'AME-Bazaar-GAS-Agent/1.0' },
      muteHttpExceptions: true
    });
    if (searchRes.getResponseCode() === 200) {
      const existingMedia = JSON.parse(searchRes.getContentText());
      if (existingMedia && existingMedia.length > 0) {
        for (const m of existingMedia) {
          if (m.slug && m.slug.includes(filename.replace(/\.[^/.]+$/, ""))) {
            Logger.log(`[WP] Reconciled existing media found by search. Media ID: ${m.id}. Skipping duplicate upload.`);
            return m.id;
          }
        }
      }
    }
  } catch (err) {
    Logger.log(`[WARN] Idempotency media search failed: ${err.message}`);
  }

  const uploadUrl = `${wpUrl}/wp-json/wp/v2/media`;

  try {
    const uploadRes = UrlFetchApp.fetch(uploadUrl, {
      method: 'post',
      headers: {
        'Authorization': authHeader,
        'Content-Disposition': `attachment; filename="${filename}"`,
        'User-Agent': 'AME-Bazaar-GAS-Agent/1.0'
      },
      contentType: 'image/webp',
      payload: imageBlob.getBytes(),
      muteHttpExceptions: true
    });

    if (uploadRes.getResponseCode() !== 201 && uploadRes.getResponseCode() !== 200) {
      Logger.log(`[WARN] Media upload failed with status ${uploadRes.getResponseCode()}: ${uploadRes.getContentText()}`);
      return null;
    }

    const data = JSON.parse(uploadRes.getContentText());
    const mediaId = data.id;

    // Set Alt text, Caption, Description, Title
    const updateUrl = `${uploadUrl}/${mediaId}`;
    UrlFetchApp.fetch(updateUrl, {
      method: 'post',
      headers: {
        'Authorization': authHeader,
        'Content-Type': 'application/json'
      },
      payload: JSON.stringify({
        title: metadata.title || filename,
        alt_text: metadata.altText || metadata.title,
        caption: metadata.caption || '',
        description: metadata.description || metadata.altText
      }),
      muteHttpExceptions: true
    });

    Logger.log(`[IMAGE] Featured media uploaded successfully. WP ID: ${mediaId}`);
    return mediaId;
  } catch (err) {
    Logger.log(`[WARN] WordPress media upload exception: ${err.message}`);
    return null;
  }
}

/**
 * Evaluates semantic relevance and contradictions, computing a score and signal counts.
 */
function evaluateCandidateSemantics(photo, brief, focusKeyword, category, articleTitle = '', searchQueries = []) {
  const title = (photo.title || '').replace(/^file:/i, '').replace(/\.[a-z0-9]+$/i, '').replace(/[-_]/g, ' ').toLowerCase();
  const description = (photo.description || '').toLowerCase();
  const altDescription = (photo.alt_description || '').toLowerCase();
  const slugText = (photo.slug || '').replace(/[-_]/g, ' ').toLowerCase();
  const altSlugs = photo.alternative_slugs ? Object.values(photo.alternative_slugs).join(' ').replace(/[-_]/g, ' ').toLowerCase() : '';
  const photographerBio = (photo.user && photo.user.bio || '').toLowerCase();
  
  // Consolidated visual metadata of the image (strictly candidate-owned, never synthetic filenames or generated article data)
  const visualEvidence = `${title} ${description} ${altDescription} ${slugText} ${altSlugs}`.toLowerCase();
  
  // Full evidence including bio (for weak/bonus signals like local context only)
  const fullEvidence = `${visualEvidence} ${photographerBio}`.toLowerCase();
  
  const genderContext = brief && brief.genderTargets ? brief.genderTargets.join(' ') : '';
  const ageContext = brief && brief.ageTargets ? brief.ageTargets.join(' ') : '';
  const garmentContext = brief && brief.garmentTypes ? brief.garmentTypes.join(' ') : '';
  const searchContext = `${focusKeyword} ${articleTitle} ${category} ${brief && brief.occasion || ''} ${brief && brief.season || ''} ${genderContext} ${ageContext} ${garmentContext}`.toLowerCase();
  
  let score = 0;
  const positiveSignals = [];
  const negativeSignals = [];
  let isRejected = false;
  let rejectionReason = "";

  // Helper to check match on visual evidence
  function checkPositiveVisual(regex, points, label) {
    if (regex.test(visualEvidence)) {
      score += points;
      positiveSignals.push(label);
      return true;
    }
    return false;
  }

  function checkNegativeVisual(regex, penalty, label, isCritical = false) {
    if (regex.test(visualEvidence)) {
      score -= penalty;
      negativeSignals.push(label);
      if (isCritical) {
        isRejected = true;
        rejectionReason = rejectionReason ? `${rejectionReason}; Contradiction: ${label}` : `Contradiction: ${label}`;
      }
      return true;
    }
    return false;
  }

  // --- 1. DEMOGRAPHIC MATCH (+25) ---
  let demographicMatch = false;
  const hasKidsTarget = /\b(kids|kid|child|children|girls|girl|boys|boy|baby|toddler|infant|youths?)\b/i.test(searchContext);
  const isKidsTarget = hasKidsTarget;
  const hasMenTarget = /\b(men|man|mens|male|groom|gentleman|gentlemen)\b/i.test(searchContext);
  const hasWomenTarget = /\b(women|woman|womens|female|lady|ladies|bride)\b/i.test(searchContext);

  if (hasKidsTarget && /\b(girl|girls|child|children|kid|kids|young girl|daughter|baby|toddler|infant|youths?|sons?|boys?|frocks?|rompers?)\b/i.test(visualEvidence)) {
    demographicMatch = true;
  }
  if (hasMenTarget && /\b(man|men|male|gentleman|gentlemen|groom|brothers?|husbands?|fathers?|sons?|guys?|sherwanis?)\b/i.test(visualEvidence)) {
    demographicMatch = true;
  }
  if (hasWomenTarget && /\b(woman|women|female|lady|ladies|bride|bridal|sisters?|wifes?|mothers?|daughters?|sarees?|saris?|lehengas?|kurtis?)\b/i.test(visualEvidence)) {
    demographicMatch = true;
  }
  
  if (demographicMatch) {
    score += 25;
    positiveSignals.push("Demographic Match");
  }

  // --- 2. GARMENT MATCH (+25, MANDATORY) ---
  let garmentMatch = false;
  const isEthnicTarget = /\b(ethnic|traditional|festive|wedding|suits?|salwars?|kameez|kurtas?|kurtis?|sarees?|saris?|lehengas?|sherwanis?|palazzos?|shararas?)\b/i.test(searchContext);
  const isWesternSuitTarget = /\b(blazers?|suits?|coats?|jackets?|formal|tuxedos?|corporate|office)\b/i.test(searchContext) && !/\b(salwars?|kameez|kurtas?|kurtis?|sarees?|saris?|lehengas?)\b/i.test(searchContext);

  if (isEthnicTarget) {
    if (/\b(suits?|salwars?|salwar suits?|kameez|kurtas?|kurtis?|ethnic wears?|traditional dress(es)?|indian dress(es)?|indian clothings?|festive wears?|lehengas?|sarees?|saris?|sherwanis?|palazzos?|shararas?|pattu)\b/i.test(visualEvidence)) {
      garmentMatch = true;
    }
  } else if (isWesternSuitTarget) {
    if (/\b(blazers?|suits?|coats?|jackets?|formal wears?|tuxedos?|suit designs?|menswears?|clothings?)\b/i.test(visualEvidence)) {
      garmentMatch = true;
    }
  } else {
    if (/\b(clothings?|apparels?|dress(es)?|garments?|wears?|outfits?)\b/i.test(visualEvidence)) {
      garmentMatch = true;
    }
  }

  // Also check explicit core garment words from brief
  if (!garmentMatch && brief && Array.isArray(brief.garmentTypes) && brief.garmentTypes.length > 0) {
    for (const g of brief.garmentTypes) {
      const cleanG = String(g).toLowerCase().replace(/[-_]/g, ' ').trim();
      if (cleanG && visualEvidence.includes(cleanG)) {
        garmentMatch = true;
        break;
      }
    }
  }

  if (garmentMatch) {
    score += 25;
    positiveSignals.push("Garment Match");
  } else {
    // Selection must be based strictly on candidate metadata matching actual garments.
    // If no garment match is found in candidate's own text, reject outright.
    isRejected = true;
    rejectionReason = rejectionReason ? `${rejectionReason}; Missing Garment: No garment match in candidate metadata` : "Missing Garment: No garment match in candidate metadata";
  }

  // --- 3. FASHION/CLOTHING MATCH (+15) ---
  checkPositiveVisual(/\b(fashion|outfit|clothing|apparel|dresses?|garments?|portrait|model|modeling|wear|silks?|pattu)\b/i, 15, "Fashion/Clothing Match");

  // --- 4. OCCASION MATCH (+10) ---
  let occasionMatch = false;
  const isEthnicOccasion = /\b(festive|wedding|celebration|ethnic|traditional|occasion|party|eid|diwali)\b/i.test(searchContext);
  if (isEthnicOccasion) {
    if (/\b(festive|wedding|celebration|ethnic|traditional|occasion|party|eid|diwali|ceremony|festivals?)\b/i.test(visualEvidence)) {
      occasionMatch = true;
    }
  } else {
    if (/\b(casual|formal|daily|season|summer|winter|spring|autumn|monsoon|office|professional)\b/i.test(visualEvidence)) {
      occasionMatch = true;
    }
  }

  if (occasionMatch) {
    score += 10;
    positiveSignals.push("Occasion Match");
  }

  // --- 5. SETTING MATCH (+10) ---
  checkPositiveVisual(/\b(boutique|clothing store|fashion store|shop|showroom|indoor|retail|wardrobe|closet|rack|display|interior)\b/i, 10, "Setting Match");

  // --- 6. LOCAL/INDIA CONTEXT (+5) ---
  let localMatch = /\b(delhi|kirari|mubarakpur|india|indian|ethnic|kanchipuram|kanjeevaram|banarasi|south indian|north indian)\b/i.test(visualEvidence);
  if (!localMatch && /\b(delhi|kirari|mubarakpur|india|indian|ethnic)\b/i.test(photographerBio)) {
    localMatch = true;
  }
  if (localMatch) {
    score += 5;
    positiveSignals.push("Local/India Context Match");
  }

  // --- 7. SECONDARY STYLING & DETAIL MATCH (+10 bonus) ---
  // Rewards secondary styling details (blouse, border, zari, embroidery, drape, pallu, pleats, fabric texture)
  // without making them mandatory rejection criteria
  if (/\b(blouse|blouses|zari|embroidery|embroidered|border|borders|drape|draping|pallu|pleats|weaving|handloom|pure silk|motifs?|craftsmanship|tailoring|fitting)\b/i.test(visualEvidence)) {
    score += 10;
    positiveSignals.push("Secondary Styling Detail Match");
  }

  // --- 8. MULTIPLE SUPPORTING TERMS (+10) ---
  const independentCount = positiveSignals.filter(s => s !== "Multiple Supporting Terms").length;
  if (independentCount >= 3) {
    score += 10;
    positiveSignals.push("Multiple Supporting Terms");
  }

  // --- CONTRADICTION GATE (Strictly on visualEvidence, completely ignoring photographer bio) ---

  // A. Explicit negative constraint violation (-50, critical)
  if (brief && brief.mustNotShow) {
    let forbidden = [];
    if (Array.isArray(brief.mustNotShow)) {
      forbidden = brief.mustNotShow.map(t => String(t).toLowerCase());
    } else if (typeof brief.mustNotShow === 'string') {
      forbidden = brief.mustNotShow.toLowerCase().split(/\s*,\s*/).map(t => t.trim());
    }
    for (const term of forbidden) {
      if (term && visualEvidence.includes(term)) {
        checkNegativeVisual(new RegExp(term, 'i'), 50, `Negative Constraint: ${term}`, true);
      }
    }
  }

  // B. Gender check (-30, critical)
  const isStrictlyFemale = hasWomenTarget && !hasMenTarget && !hasKidsTarget;
  const isStrictlyMale = hasMenTarget && !hasWomenTarget && !hasKidsTarget;
  const hasFemaleKeywords = /\b(woman|women|girl|girls|female|lady|ladies|bride|sister|wife|mother|daughter|kurti|saree|sari|lehenga)\b/i.test(visualEvidence);
  const hasMaleKeywords = /\b(man|men|boy|boys|male|gentleman|gentlemen|guy|guys|groom|brother|husband|father|son|sherwani|kurta|blazer)\b/i.test(visualEvidence);

  if (isStrictlyFemale && hasMaleKeywords && !hasFemaleKeywords) {
    checkNegativeVisual(/\b(man|men|male|gentleman|groom)\b/i, 30, "Wrong Gender (Male found for Female target)", true);
  }
  if (isStrictlyMale && hasFemaleKeywords && !hasMaleKeywords) {
    checkNegativeVisual(/\b(woman|women|female|lady|bride|kurti|saree)\b/i, 30, "Wrong Gender (Female found for Male target)", true);
  }

  // C. Age check (-30, critical)
  const isAdultOnlyTarget = /\b(men|man|women|woman|adult|formal|office|corporate)\b/i.test(searchContext) && !hasKidsTarget;
  const hasKidsKeywords = /\b(kid|kids|child|children|boy|girl|baby|toddler|infant|son|daughter|childhood|youth|young)\b/i.test(visualEvidence);
  const hasAdultKeywords = /\b(adult|man|woman|people|mature|business|professional|corporate)\b/i.test(visualEvidence);

  if (hasKidsTarget && !hasKidsKeywords && hasAdultKeywords) {
    checkNegativeVisual(/\b(adult|mature|business|corporate)\b/i, 30, "Wrong Age Group (Adult found for Kids target)", true);
  }
  if (isAdultOnlyTarget && hasKidsKeywords && !hasAdultKeywords) {
    checkNegativeVisual(/\b(kid|kids|child|children|baby|toddler)\b/i, 30, "Wrong Age Group (Kids found for Adult target)", true);
  }

  // D. Family target contradiction (-40, critical)
  const isFamily = /\bfamily\b/i.test(searchContext);
  if (isFamily) {
    const hasFamilySignals = /\b(family|people|together|group|couple|parents|children|crowd)\b/i.test(visualEvidence);
    const hasSinglePersonOnly = /\b(single|portrait|solo|alone|isolated)\b/i.test(visualEvidence);
    if (!hasFamilySignals || hasSinglePersonOnly) {
      checkNegativeVisual(/\b(single|portrait|solo|alone|isolated)\b/i, 40, "Family Mismatch (Single person found)", true);
    }
  }

  // E. Wrong garment type contradiction (-30, critical)
  // Ensures mutually exclusive core ethnic garment families are not cross-matched.
  // Secondary details (e.g. blouse fitting, borders, embroidery, jewelry) contribute to score, not rejection.
  if (isEthnicTarget) {
    const targetHasSaree = /\b(sarees?|saris?|pattu|banarasi|kanchipuram|kanjeevaram)\b/i.test(searchContext);
    const targetHasLehenga = /\b(lehengas?|ghagras?|cholis?)\b/i.test(searchContext) && !targetHasSaree;
    const targetHasSherwani = /\b(sherwanis?)\b/i.test(searchContext);
    const targetHasKurtiSalwar = /\b(kurtis?|kurtas?|salwars?|kameez|anarkalis?|palazzos?|shararas?)\b/i.test(searchContext) && !targetHasSaree && !targetHasLehenga && !targetHasSherwani;

    const candidateHasSaree = /\b(sarees?|saris?|pattu|kanchipuram|kanjeevaram|banarasi)\b/i.test(visualEvidence);
    const candidateHasLehenga = /\b(lehengas?|ghagras?|cholis?)\b/i.test(visualEvidence);
    const candidateHasSherwani = /\b(sherwanis?)\b/i.test(visualEvidence);
    const candidateHasKurtiSalwar = /\b(kurtis?|kurtas?|salwars?|kameez|anarkalis?|palazzos?|shararas?)\b/i.test(visualEvidence);

    // If target is specifically Saree, reject if candidate is strictly Lehenga or Sherwani without any Saree signals
    if (targetHasSaree && !candidateHasSaree) {
      if (candidateHasLehenga) {
        checkNegativeVisual(/\b(lehengas?|ghagras?|cholis?)\b/i, 30, "Wrong Garment Type (Lehenga found for Saree target)", true);
      } else if (candidateHasSherwani) {
        checkNegativeVisual(/\b(sherwanis?)\b/i, 30, "Wrong Garment Type (Sherwani found for Saree target)", true);
      }
    }

    // If target is specifically Lehenga, reject if candidate is strictly Saree or Sherwani without any Lehenga signals
    if (targetHasLehenga && !candidateHasLehenga) {
      if (candidateHasSaree) {
        checkNegativeVisual(/\b(sarees?|saris?|pattu)\b/i, 30, "Wrong Garment Type (Saree found for Lehenga target)", true);
      } else if (candidateHasSherwani) {
        checkNegativeVisual(/\b(sherwanis?)\b/i, 30, "Wrong Garment Type (Sherwani found for Lehenga target)", true);
      }
    }

    // If target is specifically Sherwani, reject if candidate is strictly Women's ethnic wear without Sherwani signals
    if (targetHasSherwani && !candidateHasSherwani) {
      if (candidateHasSaree || candidateHasLehenga || candidateHasKurtiSalwar) {
        checkNegativeVisual(/\b(sarees?|saris?|lehengas?|kurtis?|kurtas?|salwars?)\b/i, 30, "Wrong Garment Type (Women's ethnic wear found for Sherwani target)", true);
      }
    }

    // If target is specifically Kurti/Salwar, reject if candidate is strictly Saree, Lehenga, or Sherwani without Kurti/Salwar signals
    if (targetHasKurtiSalwar && !candidateHasKurtiSalwar) {
      if (candidateHasSaree) {
        checkNegativeVisual(/\b(sarees?|saris?|pattu)\b/i, 30, "Wrong Garment Type (Saree found for Kurti/Salwar target)", true);
      } else if (candidateHasLehenga) {
        checkNegativeVisual(/\b(lehengas?|ghagras?|cholis?)\b/i, 30, "Wrong Garment Type (Lehenga found for Kurti/Salwar target)", true);
      } else if (candidateHasSherwani) {
        checkNegativeVisual(/\b(sherwanis?)\b/i, 30, "Wrong Garment Type (Sherwani found for Kurti/Salwar target)", true);
      }
    }
  }

  // F. Western-only Contradiction for Ethnic target (-30, critical)
  if (isEthnicTarget) {
    const hasEthnicKeywords = /\b(indian|ethnic|kurti|kurta|saree|sari|lehenga|salwar|suit|tradition|traditional|festive|wedding|diwali|eid)\b/i.test(visualEvidence);
    const hasWesternOnlyKeywords = /\b(jeans|denim|t-shirt|tshirt|shirt|blazer|jacket|sweater|hoodie|coat|corporate|office|business|casual)\b/i.test(visualEvidence);
    if (!hasEthnicKeywords && hasWesternOnlyKeywords) {
      checkNegativeVisual(/\b(jeans|denim|t-shirt|tshirt|shirt|blazer)\b/i, 30, "Garment Mismatch (Western clothing found)", true);
    }
  }

  // G. Wrong Setting Contradiction when setting is mandatory (-40, critical)
  const isSettingMandatory = brief && brief.visualSetting ? /\b(mandatory|must|required|inside a|in the shop|in the store|tailoring shop|boutique setting)\b/i.test(brief.visualSetting) : false;
  if (isSettingMandatory) {
    const hasOutdoorOnly = /\b(street|road|mountain|lake|river|forest|park|nature|outdoor|sky|beach|landscape)\b/i.test(visualEvidence) && 
                           !/\b(shop|store|boutique|interior|rack|hangers|retail|room|display|cabinet|counter)\b/i.test(visualEvidence);
    if (hasOutdoorOnly) {
      checkNegativeVisual(/\b(street|road|mountain|lake|river|forest|park|nature|outdoor|sky|beach|landscape)\b/i, 40, "Setting Contradiction (Outdoor found for Interior target)", true);
    }
  }

  // H. Explicit contradiction (-40, critical)
  if (isKidsTarget) {
    if (/\b(adult|mature|senior)\b/i.test(visualEvidence) && !/\b(kid|kids|child|children|boy|girl|baby)\b/i.test(visualEvidence)) {
      checkNegativeVisual(/\b(adult|mature)\b/i, 40, "Explicit Contradiction (Adult for Kids target)", true);
    }
  }

  // I. Seasonal Contradiction (-30, critical)
  const isSummerTarget = /\b(summer|heat|cotton|breathable)\b/i.test(searchContext);
  const isWinterTarget = /\b(winter|cold|wool|woolen|sweater|jacket|snow)\b/i.test(searchContext);
  const hasWinterVisual = /\b(winter|snow|woolen|wool|puffer|sweater|fleece|heavy coat|overcoat)\b/i.test(visualEvidence);
  const hasSummerVisual = /\b(summer|beach|cotton|sun|sleeveless|shorts)\b/i.test(visualEvidence);

  if (isSummerTarget && !isWinterTarget && hasWinterVisual && !hasSummerVisual) {
    checkNegativeVisual(/\b(winter|snow|woolen|wool|puffer|sweater|fleece|heavy coat|overcoat)\b/i, 30, "Seasonal Contradiction (Winter clothing found for Summer target)", true);
  }
  if (isWinterTarget && !isSummerTarget && hasSummerVisual && !hasWinterVisual) {
    checkNegativeVisual(/\b(summer|beach|sleeveless|shorts)\b/i, 30, "Seasonal Contradiction (Summer clothing found for Winter target)", true);
  }

  // J. Non-Garment Subject Contradiction (-50, critical)
  // Rejects photos of monuments, temples, architecture, landscapes, scenery, statues, etc.
  // Handles apparel motif exceptions like "temple border" or "temple design"
  const isTemplePlace = /\b(temples?)\b/i.test(visualEvidence) && !/\btemple\s+(border|design|motif|pattern|work|jewellery|jewelry)\b/i.test(visualEvidence);
  const isOtherNonGarment = /\b(monument|monuments|ruin|ruins|architecture|architectural|archaeological|building|buildings|palace|palaces|fort|forts|tomb|tombs|mosque|mosques|church|churches|shrine|shrines|sculpture|sculptures|statue|statues|landscape|landscapes|scenery|mountain|mountains|river|rivers|lake|lakes|forest|forests|wildlife|animal|animals|bird|birds|coin|coins|currency|stamp|stamps|flag|flags|map|maps|diagram|diagrams)\b/i.test(visualEvidence);
  if (isTemplePlace || isOtherNonGarment) {
    checkNegativeVisual(new RegExp(isTemplePlace ? 'temple' : 'monument|ruin|architecture|building|landscape', 'i'), 50, "Non-Garment Subject (Monument/Temple/Architecture/Scenery)", true);
  }

  // Normalize and cap score
  score = Math.max(0, Math.min(100, score));

  return {
    score: score,
    positiveSignals: positiveSignals,
    negativeSignals: negativeSignals,
    isRejected: isRejected,
    rejectionReason: rejectionReason
  };
}

/**
 * Validates a candidate photo against the semantic brief to prevent obvious mismatches.
 */
function passesDeterministicFilter(photo, brief, focusKeyword = '', articleTitle = '', category = '') {
  const evalResult = evaluateCandidateSemantics(photo, brief, focusKeyword, category, articleTitle);
  if (evalResult.isRejected) {
    Logger.log(`[DETERMINISTIC REJECT] Candidate ID ${photo.id}: ${evalResult.rejectionReason}`);
    return false;
  }
  return true;
}

/**
 * Calculates a relevance score for a photo based on semantic brief attributes.
 */
function getDeterministicScore(photo, brief, focusKeyword, category, articleTitle = '') {
  const evalResult = evaluateCandidateSemantics(photo, brief, focusKeyword, category, articleTitle);
  return evalResult.score;
}

/**
 * Logs the final selection metrics to execution output.
 */
function logFinalSelectionMetrics(selectedId, verificationMethod, detScore, positiveSignalsCount, elapsedSeconds, visionScore, retrievedCount, filteredCount, highConfCount, visionCalls, visionStatus) {
  Logger.log(`\n=== IMAGE SELECTION METRICS ===`);
  Logger.log(`Candidates Retrieved: ${retrievedCount}`);
  Logger.log(`After Filter: ${filteredCount}`);
  Logger.log(`High Confidence Candidates: ${highConfCount}`);
  Logger.log(`Vision Calls: ${visionCalls}`);
  Logger.log(`Vision Status: ${visionStatus}`);
  Logger.log(`Selected ID: ${selectedId}`);
  Logger.log(`Verification Method: ${verificationMethod}`);
  Logger.log(`Final Score: ${visionScore !== -1 ? visionScore : detScore}`);
  Logger.log(`Positive Signal Count: ${positiveSignalsCount}`);
  Logger.log(`Execution Time: ${elapsedSeconds}s`);
  Logger.log(`Total Gemini Calls: ${geminiCallsCount}`);
  Logger.log(`================================\n`);
}

/**
 * Clean a search query by removing stop words and local context, keeping it short and unique.
 */
function cleanQueryForSearch(query) {
  if (!query) return '';
  const stopWords = new Set([
    'wearing', 'a', 'an', 'the', 'in', 'on', 'at', 'for', 'with', 'and', 'or', 'of', 'to', 
    'inside', 'bright', 'comfortable', 'kirari', 'mubarakpur', 'delhi', 'guide', 'styling',
    'setup', 'details', 'look', 'looks', 'best', 'ultimate', 'close', 'up', 'tips', 'customized', 'tailored'
  ]);
  const words = query.toLowerCase()
    .replace(/[^a-zA-Z0-9\s]/g, ' ')
    .split(/\s+/)
    .filter(w => w.length > 2 && !stopWords.has(w));
  
  const uniqueWords = [...new Set(words)];
  const garmentKeywords = ['saree', 'sarees', 'sari', 'saris', 'kurti', 'kurtis', 'lehenga', 'lehengas', 'sherwani', 'sherwanis', 'blazer', 'suit', 'suits', 'salwar', 'pattu'];
  const foundGarment = uniqueWords.find(w => garmentKeywords.includes(w));

  let selectedWords = uniqueWords.slice(0, 4);
  if (foundGarment && !selectedWords.includes(foundGarment)) {
    selectedWords[3] = foundGarment;
  }
  return selectedWords.join(' ');
}

/**
 * Verifies a candidate image from Unsplash using the unified two-tier quality gate.
 * @param {Object} photo
 * @param {string|Blob} imageSource URL string or image Blob
 * @param {Object} brief
 * @param {string} focusKeyword
 * @param {string} category
 * @param {string} articleTitle
 * @param {string} sourceName "UNSPLASH", "WIKIMEDIA", or "WORDPRESS_MEDIA"
 * @returns {Object} { accepted: boolean, method: string, evalResult: Object, visionScore: number, reason: string, blob: Blob }
 */
function verifyCandidateImage(photo, imageSource, brief, focusKeyword, category, articleTitle, sourceName) {
  const history = getImageHistory();
  const photoId = String(photo.id);
  
  // 1. Uniqueness check
  const isUnique = !history.includes(photoId);
  if (!isUnique) {
    return {
      accepted: false,
      method: "NONE",
      evalResult: { score: 0, positiveSignals: [], negativeSignals: ["Duplicate"] },
      visionScore: -1,
      reason: "Duplicate image (already in history)",
      blob: null
    };
  }

  // 1.b License Compliance Check (Defense-in-depth for Wikimedia Commons candidates)
  if (photo.license) {
    const lic = photo.license;
    if (!lic.commercialAllowed || !lic.tier || lic.tier > 4) {
      return {
        accepted: false,
        method: "NONE",
        evalResult: { score: 0, positiveSignals: [], negativeSignals: ["Invalid License"] },
        visionScore: -1,
        reason: "Rejected: License not permitted for commercial use",
        blob: null
      };
    }
    if (lic.attributionRequired) {
      const attr = photo.attribution;
      if (!attr || !attr.artist || !attr.sourceUrl) {
        return {
          accepted: false,
          method: "NONE",
          evalResult: { score: 0, positiveSignals: [], negativeSignals: ["Missing Attribution"] },
          visionScore: -1,
          reason: "Rejected: Attribution required but artist or source URL is missing",
          blob: null
        };
      }
    }
  }

  // 2. Deterministic semantic check (Tier 1)
  const evalResult = evaluateCandidateSemantics(photo, brief, focusKeyword, category, articleTitle);
  const detScore = evalResult.score;
  const independentSignalsCount = evalResult.positiveSignals.filter(s => s !== "Multiple Supporting Terms").length;
  
  if (evalResult.isRejected) {
    return {
      accepted: false,
      method: "NONE",
      evalResult: evalResult,
      visionScore: -1,
      reason: `Rejected: ${evalResult.rejectionReason}`,
      blob: null
    };
  }

  // 3. Vision check or Fallback
  const downloadBlob = () => {
    if (imageSource && typeof imageSource !== 'string') {
      return imageSource;
    }
    if (typeof imageSource === 'string') {
      try {
        const imgRes = UrlFetchApp.fetch(imageSource, { muteHttpExceptions: true });
        if (imgRes.getResponseCode() === 200) {
          return imgRes.getBlob();
        }
      } catch (e) {
        Logger.log(`[WARN] Failed to download image from ${imageSource}: ${e.message}`);
      }
    }
    return null;
  };

  if (visionUnavailable || visionCallsCount >= 3) {
    // Vision unavailable: deterministic fallback rule
    // We MUST be absolutely sure it's the right image.
    // Must have High Confidence AND must explicitly match Demographic and Garment if applicable.
    const hasHighConfidence = detScore >= 85 && independentSignalsCount >= 3;
    const hasDemographicMatch = evalResult.positiveSignals.includes("Demographic Match");
    const hasGarmentMatch = evalResult.positiveSignals.includes("Garment Match");
    
    // If demographic or garment is critical but missing, reject under offline mode
    const needsDemographic = /\b(girls|girl|women|woman|female|lady|ladies|bride|boys|boy|men|man|male|gentleman|gentlemen|groom|kids|child|children|baby)\b/i.test(focusKeyword + ' ' + category + ' ' + articleTitle);
    
    const isSafeToAccept = hasHighConfidence && (!needsDemographic || hasDemographicMatch) && hasGarmentMatch;

    if (isSafeToAccept) {
      const activeBlob = downloadBlob();
      if (!activeBlob) {
        return {
          accepted: false,
          method: "NONE",
          evalResult: evalResult,
          visionScore: -1,
          reason: "Image download failed during fallback acceptance",
          blob: null
        };
      }
      return {
        accepted: true,
        method: "DETERMINISTIC_HIGH_CONFIDENCE",
        evalResult: evalResult,
        visionScore: -1,
        reason: "Accepted deterministically due to Vision unavailability (Strict Demographic/Garment Match)",
        blob: activeBlob
      };
    } else {
      return {
        accepted: false,
        method: "NONE",
        evalResult: evalResult,
        visionScore: -1,
        reason: `Insufficient score/signals or missing demographic/garment match (${detScore}/${independentSignalsCount}) under Vision offline fallback`,
        blob: null
      };
    }
  }

  // Vision is available: run Gemini Vision verification
  const activeBlob = downloadBlob();
  if (!activeBlob) {
    return {
      accepted: false,
      method: "NONE",
      evalResult: evalResult,
      visionScore: -1,
      reason: "Image download failed before Vision validation",
      blob: null
    };
  }

  try {
    const auditPrompt = buildVisionValidationPrompt(brief, '', '');
    visionCallsCount++;
    Logger.log(`[IMAGE] Vision attempted for ${sourceName} ID ${photoId}`);
    
    const auditRes = callGeminiVision(auditPrompt, activeBlob, 1, false, true);
    const auditData = cleanAndParseJson(auditRes.text);
    const visionScore = auditData.score || 0;
    const isRelevant = auditData.relevant === true;
    const mismatches = auditData.mismatches || [];
    
    let hasCriticalMismatch = false;
    const lowercaseMismatches = mismatches.map(m => m.toLowerCase());
    for (const m of lowercaseMismatches) {
      if (m.includes('gender') || m.includes('sex') || m.includes('man') || m.includes('woman') || m.includes('girl') || m.includes('boy')) {
        hasCriticalMismatch = true;
      }
      if (m.includes('age') || m.includes('adult') || m.includes('kid') || m.includes('child')) {
        hasCriticalMismatch = true;
      }
      if (m.includes('garment') || m.includes('clothing') || m.includes('kurta') || m.includes('dress') || m.includes('suit')) {
        hasCriticalMismatch = true;
      }
      if (m.includes('single') || m.includes('one person') || m.includes('family') || m.includes('two women') || m.includes('no child')) {
        hasCriticalMismatch = true;
      }
      if (m.includes('setting') || m.includes('background') || m.includes('park') || m.includes('studio') || m.includes('runway') || m.includes('rack')) {
        hasCriticalMismatch = true;
      }
      if (m.includes('occasion') || m.includes('eid') || m.includes('wedding')) {
        hasCriticalMismatch = true;
      }
    }
    
    if (visionScore >= 70 && isRelevant && !hasCriticalMismatch) {
      return {
        accepted: true,
        method: "GEMINI_VISION",
        evalResult: evalResult,
        visionScore: visionScore,
        reason: "Passed vision relevance audit",
        blob: activeBlob
      };
    } else {
      return {
        accepted: false,
        method: "NONE",
        evalResult: evalResult,
        visionScore: visionScore,
        reason: `Failed vision audit (Score: ${visionScore}, Relevant: ${isRelevant}, Mismatches: ${mismatches.join('; ')})`,
        blob: null
      };
    }
  } catch (err) {
    visionUnavailable = true;
    Logger.log(`[IMAGE] Vision error caught for ${sourceName} ID ${photoId}: ${err.message}. Triggering offline fallback.`);
    
    // Catch Vision 429 / error: fallback deterministically
    const hasHighConfidence = detScore >= 85 && independentSignalsCount >= 3;
    const hasDemographicMatch = evalResult.positiveSignals.includes("Demographic Match");
    const hasGarmentMatch = evalResult.positiveSignals.includes("Garment Match");
    const needsDemographic = /\b(girls|girl|women|woman|female|lady|ladies|bride|boys|boy|men|man|male|gentleman|gentlemen|groom|kids|child|children|baby)\b/i.test(focusKeyword + ' ' + category + ' ' + articleTitle);
    
    const isSafeToAccept = hasHighConfidence && (!needsDemographic || hasDemographicMatch) && hasGarmentMatch;

    if (isSafeToAccept) {
      return {
        accepted: true,
        method: "DETERMINISTIC_HIGH_CONFIDENCE",
        evalResult: evalResult,
        visionScore: -1,
        reason: "Accepted deterministically after Vision error fallback (Strict Demographic/Garment Match)",
        blob: activeBlob
      };
    } else {
      return {
        accepted: false,
        method: "NONE",
        evalResult: evalResult,
        visionScore: -1,
        reason: `Vision offline (429) fallback failed due to insufficient score/signals or missing demographic/garment match (${detScore}/${independentSignalsCount})`,
        blob: null
      };
    }
  }
}


/**
 * Log selected image details.
 */
function logSelectedImage(source, photoId, method, detScore, signals, visionScore, meta) {
  Logger.log(`[IMAGE SELECTED]`);
  Logger.log(`Source: ${source}`);
  Logger.log(`ID: ${photoId}`);
  Logger.log(`Verification Method: ${method}`);
  Logger.log(`Deterministic Score: ${detScore}`);
  Logger.log(`Independent Signals: ${signals}`);
  Logger.log(`Vision Score: ${visionScore !== -1 ? visionScore : "-"}`);
  Logger.log(`Filename: ${meta.filename}`);
  Logger.log(`Alt: ${meta.altText}`);
  Logger.log(`Title: ${meta.title}`);
  Logger.log(`Description: ${meta.description}`);
}

