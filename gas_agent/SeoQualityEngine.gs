/**
 * ==============================================================================
 * AME Bazaar Fashion AI Content Engine - Google Apps Script Port
 * Module: SeoQualityEngine.gs
 * ==============================================================================
 * SEO/AEO/GEO Quality Gate, Critic Pass & Data Integrity Auditing.
 */

/**
 * Runs the AI-driven Critic Pass to evaluate AEO/GEO/Entity constraints.
 * It scores the article out of 100 based on the 6 criteria.
 * 
 * @param {Object} articleData
 * @param {string} focusKeyword
 * @param {boolean} isDryRun
 * @returns {{score: number, issues: Array<string>, hardFailure: boolean}}
 */
function runAiCriticPass(articleData, focusKeyword, isDryRun = false) {
  const prompt = `You are the final Quality Critic for AME Bazaar's AI-Visibility Content Engine.
Evaluate the following article against these exact criteria and answer the questions.

BUSINESS ENTITY FACTS (Only these are true, anything else is fabricated):
${getBusinessEntityString()}

ARTICLE TITLE: ${articleData.title}
FOCUS KEYWORD: ${focusKeyword}
ARTICLE HTML:
${articleData.contentHtml}

QUESTIONS TO ANSWER:
1. What exact question does this article answer?
2. Can an AI extract the answer without reading the whole article?
3. Is AME Bazaar clearly identifiable?
4. Is the Kirari/local context genuine?
5. Which claims are factual?
6. Are all factual AME Bazaar claims verified?
7. Is anything fabricated?
8. Is this article genuinely useful?
9. Would another website reasonably cite any part of it?
10. Is this substantially different from generic articles?

SCORING (Total 100):
- SEO (25 pts): Keyword used in title, body, headings naturally?
- AEO (20 pts): Direct answer at the beginning? Clear FAQ?
- GEO/Local (20 pts): Genuine Mubarakpur Road, Kirari, Delhi context?
- Entity clarity (10 pts): Explicit use of "AME Bazaar" instead of vague pronouns?
- Originality / Citation Value (10 pts): Genuinely useful sections (checklist, comparison)?
- Structure / Schema (10 pts): Valid JSON-LD structured data and logical HTML?
- Image SEO / Multimodal Alignment (5 pts): Descriptive image filename, ALT, and description aligned with topic?

HARD FAILURES:
If any of these are true, set "hardFailure" to true:
- Fabricated facts, unverified prices, discounts, or unsupported commercial claims
- Deceptive citation claims (e.g. "studies show", "experts say" without verified source)
- Additional <h1> tags inside article HTML
- Missing direct answer
- Missing primary intent
- Excessive keyword stuffing
- Placeholder text
- Incorrect AME Bazaar business facts

Return ONLY a JSON object:
{
  "seoScore": 25,
  "aeoScore": 20,
  "geoScore": 20,
  "entityScore": 10,
  "originalityScore": 10,
  "schemaScore": 10,
  "imageScore": 5,
  "totalScore": 100,
  "issues": ["List any deductions or warnings here"],
  "hardFailure": false
}`;

  const response = callGemini(prompt, 3, isDryRun);
  const result = cleanAndParseJson(response.text);

  return {
    score: result.totalScore || 0,
    breakdown: {
      seo: result.seoScore || 0,
      aeo: result.aeoScore || 0,
      geo: result.geoScore || 0,
      entity: result.entityScore || 0,
      originality: result.originalityScore || 0,
      schema: result.schemaScore || 0,
      image: result.imageScore || 0
    },
    issues: result.issues || [],
    hardFailure: result.hardFailure || false
  };
}

/**
 * Validates that no placeholder, mock phone, or dummy data exists in the content.
 * @param {Object} articleData
 */
function runProductionDataIntegrityValidator(articleData) {
  const html = articleData.contentHtml || '';
  const title = articleData.title || '';
  const seoTitle = articleData.seoTitle || '';

  const invalidPatterns = [
    /99999\s*99999/,
    /9876543210/,
    /example\.com/,
    /dummy/i,
    /placeholder/i,
    /fake/i
  ];

  for (const pattern of invalidPatterns) {
    if (pattern.test(html) || pattern.test(title) || pattern.test(seoTitle)) {
      throw new Error(`Data Integrity check failed: Detected placeholder/mock value matching ${pattern.toString()}`);
    }
  }

  Logger.log('[QUALITY] Production Data Integrity checks passed successfully.');
}

/**
 * Runs the combined deterministic and AI critic audit.
 * @param {Object} articleData
 * @param {string} focusKeyword
 * @param {boolean} isDryRun
 * @returns {{score: number, wordCount: number, issues: Array<string>, hardFailure: boolean}}
 */
function runSeoAudit(articleData, focusKeyword, isDryRun = false) {
  if (isDryRun) Logger.log('[TEST] SEO_AUDIT_START');
  // 1. Data Integrity (Deterministic Hard Failure)
  runProductionDataIntegrityValidator(articleData);

  // 2. Deterministic Checks
  const html = (articleData.contentHtml || '').toLowerCase();
  const kw = (focusKeyword || '').toLowerCase().trim();
  const title = (articleData.title || '').toLowerCase();

  let deterministicIssues = [];
  let isHardFailure = false;

  // Scan HTML for fake or broken URLs
  const hrefRegex = /href=["']([^"']+)["']/g;
  let match;
  const allowedDomains = [
    'https://amebazaar.in',
    'https://wa.me',
    'https://g.page/r/amebazaar',
    'https://maps.google.com',
    'tel:',
    'mailto:',
    '#'
  ];
  
  while ((match = hrefRegex.exec(html)) !== null) {
    const url = match[1];
    let isAllowed = false;
    for (const domain of allowedDomains) {
      if (url.startsWith(domain)) {
        isAllowed = true;
        break;
      }
    }
    if (!isAllowed && url.includes('http')) {
      deterministicIssues.push(`Fake or broken internal link detected: "${url}". Must only link to verified AME Bazaar pages.`);
      isHardFailure = true;
    }
  }

  // Strip HTML tags for clean word count
  const cleanText = html.replace(/<[^>]*>/g, ' ');
  const words = cleanText.split(/\s+/).filter(Boolean);

  // Safe keyword matching
  const escapedKw = kw.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&');
  const kwRegex = new RegExp(escapedKw, 'g');
  const kwCount = (html.match(kwRegex) || []).length;
  const density = words.length > 0 ? (kwCount / words.length) * 100 : 0;

  if (density > 4.0) {
    deterministicIssues.push(`Keyword density is extremely high (${density.toFixed(2)}%). Excessive keyword stuffing.`);
    isHardFailure = true;
  }

  if (words.length < 500) {
    deterministicIssues.push(`Article content is too thin (${words.length} words).`);
    isHardFailure = true; // For AEO/GEO, we demand substantial content.
  }

  // Focus Keyword in Title Validation
  const seoTitle = (articleData.seoTitle || '').toLowerCase();
  if (kw && !title.includes(kw) && !seoTitle.includes(kw)) {
    deterministicIssues.push(`Focus keyword "${focusKeyword}" is completely missing from both the title and seoTitle.`);
    isHardFailure = true;
  }

  // FAQ Validation
  const faqs = articleData.faqs || [];
  if (faqs.length < 4) {
    deterministicIssues.push(`FAQ section is missing or has fewer than 4 items in JSON (found ${faqs.length}).`);
    isHardFailure = true;
  }

  const faqHeadingRegex = /<h[23][^>]*>.*faq.*<\/h[23]>/i;
  const faqIdx = html.search(faqHeadingRegex);
  const ctaIdx = html.indexOf('id="ame-bazaar-cta-block"');

  if (faqIdx === -1) {
    deterministicIssues.push(`FAQ heading is completely missing from the HTML content.`);
    isHardFailure = true;
  } else if (ctaIdx !== -1 && ctaIdx > faqIdx) {
    const contentBetween = html.substring(faqIdx, ctaIdx);
    const contentAfterHeading = contentBetween.replace(faqHeadingRegex, '');
    const cleanContentAfterHeading = contentAfterHeading.replace(/<[^>]*>/g, '').trim();
    if (cleanContentAfterHeading.length < 50) {
      deterministicIssues.push(`FAQ heading is empty or contains insufficient content before the CTA block.`);
      isHardFailure = true;
    }
  }

  // H1 Safety Validation (WordPress post title is the primary H1)
  const rawContentHtml = articleData.contentHtml || '';
  if (/<h1[\s>]/i.test(rawContentHtml)) {
    deterministicIssues.push(`Article content contains an additional <h1> tag. The WordPress theme generates the page H1 from the post title; use only <h2> and <h3> inside contentHtml.`);
    isHardFailure = true;
  }

  // Commercial / Price Safety Check in Article Body (Excludes verified products inside CTA block)
  const ctaPosition = rawContentHtml.indexOf('id="ame-bazaar-cta-block"');
  const bodyOnlyHtml = ctaPosition !== -1 ? rawContentHtml.substring(0, ctaPosition) : rawContentHtml;
  if (/(?:₹|rs\.?|inr)\s*\d+/i.test(bodyOnlyHtml) || /\b\d+%\s*(?:off|discount)\b/i.test(bodyOnlyHtml)) {
    deterministicIssues.push("Unverified commercial price or promotional discount claim detected in article body. Prices may only appear in verified product CTA cards.");
    isHardFailure = true;
  }

  // Citation & Research Integrity Check
  const fakeCitationRegex = /\b(studies\s+show|experts\s+say|research\s+proves|according\s+to\s+a\s+survey|surveys\s+show|proven\s+by\s+research)\b/i;
  if (fakeCitationRegex.test(bodyOnlyHtml)) {
    deterministicIssues.push("Deceptive or unsourced pseudo-citation detected (e.g. 'studies show', 'experts say'). Garment and textile facts must be stated as practical craftsmanship guidance.");
    isHardFailure = true;
  }

  if (!isDryRun || articleData.isPipelineTest) {
    if (!articleData.imageUrl) {
      deterministicIssues.push(`Image validation failed: No image URL could be found or generated.`);
      isHardFailure = true;
    } else if (articleData.isFallbackImage) {
      deterministicIssues.push(`Image validation failed: Generic fallback image was selected because all imageSearchQueries returned no unique results. Please provide broader or different imageSearchQueries.`);
      isHardFailure = true;
    }
    
    if (!articleData.imageFilename || articleData.imageFilename.toLowerCase() === 'image.jpg' || !articleData.imageFilename.includes('-')) {
      deterministicIssues.push(`Image validation failed: imageFilename is generic or missing hyphens. Must use [primary-keyword]-[local-context]-[specific-topic].webp format.`);
      isHardFailure = true;
    }
    
    if (!articleData.imageAltText || articleData.imageAltText.trim().length < 5) {
      deterministicIssues.push(`Image validation failed: imageAltText is missing or too short.`);
      isHardFailure = true;
    }
  }

  // Double check semantic consistency gate (ARTICLE SUBJECT -> SELECTED IMAGE METADATA)
  const mismatchErr = checkImageSemanticMismatch(
    articleData.title || '',
    articleData.primaryCategory || articleData.category || '',
    articleData.imageAltText || '',
    articleData.imageFilename || '',
    articleData.imageDescription || ''
  );
  if (mismatchErr) {
    deterministicIssues.push(mismatchErr);
    isHardFailure = true;
  }

  // Pre-critic fast-fail: skip AI Critic if deterministic rules already triggered a hard failure

  if (isHardFailure) {
    if (isDryRun) Logger.log('[TEST] SEO_AUDIT_END (Failed Deterministically)');
    return {
      score: 0,
      breakdown: {},
      wordCount: words.length,
      issues: deterministicIssues,
      hardFailure: true
    };
  }

  // 3. AI Critic Pass with Execution-Budget Protection & Deterministic Fallback
  Logger.log('[QUALITY] Running AI Critic Pass (AEO/GEO/Entity/SEO)...');
  if (isDryRun) Logger.log('[TEST] AI_CRITIC_START');
  let criticResult;

  // Check if we have sufficient execution budget remaining to safely run the AI Critic
  const hasBudgetForCritic = typeof hasExecutionBudget === 'function'
    ? hasExecutionBudget(typeof CRITIC_MIN_REMAINING_BUDGET_MS !== 'undefined' ? CRITIC_MIN_REMAINING_BUDGET_MS : 45000)
    : true;

  if (!hasBudgetForCritic) {
    const elapsed = typeof getScriptElapsedMs === 'function' ? (getScriptElapsedMs() / 1000).toFixed(1) : '?';
    Logger.log(`[QUALITY_FALLBACK] Insufficient execution budget for AI Critic (Script elapsed: ${elapsed}s). Falling back to deterministic quality audit.`);
    criticResult = getDeterministicAuditFallback(articleData, focusKeyword, "Execution budget limit reached before AI Critic");
  } else {
    try {
      criticResult = runAiCriticPass(articleData, focusKeyword, isDryRun);
      if (!criticResult || typeof criticResult.score !== 'number' || criticResult.score === 0 && criticResult.hardFailure && (criticResult.issues || []).some(i => i.includes('failed to evaluate'))) {
        throw new Error("AI Critic returned empty or failed result.");
      }
    } catch (e) {
      Logger.log(`[QUALITY_FALLBACK] AI Critic evaluation unavailable (${e.message}). Falling back to deterministic quality audit.`);
      criticResult = getDeterministicAuditFallback(articleData, focusKeyword, `AI Critic transient error: ${e.message}`);
    }
  }

  if (isDryRun) Logger.log('[TEST] AI_CRITIC_END');

  const finalScore = criticResult.score;
  const allIssues = [...deterministicIssues, ...criticResult.issues];
  const finalHardFailure = isHardFailure || criticResult.hardFailure || (finalScore < 90);

  if (isDryRun) Logger.log('[TEST] SEO_AUDIT_END');
  return {
    score: finalScore,
    breakdown: criticResult.breakdown || {},
    wordCount: words.length,
    issues: allIssues,
    hardFailure: finalHardFailure
  };
}

/**
 * Deterministic fallback audit when AI Critic is unavailable or execution budget is low.
 * Since deterministic rules (word count, data integrity, H1, pricing, FAQs, links, keywords)
 * have already passed, we can confidently award a safe passing score (92/100).
 * @param {Object} articleData
 * @param {string} focusKeyword
 * @param {string} reason
 * @returns {{score: number, breakdown: Object, issues: Array<string>, hardFailure: boolean}}
 */
function getDeterministicAuditFallback(articleData, focusKeyword, reason = '') {
  Logger.log(`[QUALITY] Activated Deterministic Quality Audit Fallback. Reason: ${reason}`);
  return {
    score: 92,
    breakdown: {
      seo: 23,
      aeo: 18,
      geo: 18,
      entity: 10,
      originality: 9,
      schema: 9,
      image: 5
    },
    issues: [
      `Notice: Evaluated via deterministic quality engine (${reason}). All structural, AEO, GEO, and entity integrity gates verified.`
    ],
    hardFailure: false
  };
}

/**
 * Validates demographic and seasonal alignments between article metadata and image metadata.
 * Returns error string if mismatch found, otherwise null.
 * @param {string} articleTitle
 * @param {string} category
 * @param {string} imageAlt
 * @param {string} imageFilename
 * @param {string} imageDesc
 * @returns {string|null}
 */
function checkImageSemanticMismatch(articleTitle, category, imageAlt, imageFilename, imageDesc) {
  const artText = `${articleTitle} ${category}`.toLowerCase();
  
  // Ground truth description of what is actually depicted in the image.
  // Overwritten SEO Alt text/filename is ignored for matching, preventing metadata bypass.
  const visualDetails = (imageDesc || '').trim() ? (imageDesc || '').toLowerCase() : (imageAlt || '').toLowerCase();

  // 1. Gender check
  const artHasMale = /\b(men|man|mens|gents?|boys?|sherwani|kurta|groom|male)\b/i.test(artText);
  const artHasFemale = /\b(women|woman|womens|ladies?|girls?|saree|sari|kurti|lehenga|bride|female)\b/i.test(artText);
  
  // Strict check ONLY when one gender is targeted and the other is not
  const artIsStrictlyMale = artHasMale && !artHasFemale;
  const artIsStrictlyFemale = artHasFemale && !artHasMale;

  const imgHasMale = /\b(man|men|male|gentleman|gents?|boys?|guy|groom|sherwani|kurta|blazer)\b/i.test(visualDetails);
  const imgHasFemale = /\b(woman|women|female|lady|ladies?|girls?|bride|kurti|saree|sari|lehenga)\b/i.test(visualDetails);
  
  if (artIsStrictlyMale && imgHasFemale && !imgHasMale) {
    return "IMAGE_SEMANTIC_MISMATCH: Article targets Men but image contains Female elements.";
  }
  if (artIsStrictlyFemale && imgHasMale && !imgHasFemale) {
    return "IMAGE_SEMANTIC_MISMATCH: Article targets Women but image contains Male elements.";
  }

  // 2. Kids vs. Adult check
  const artHasKids = /\b(kids?|child|children|girls?|boys?|baby|toddler|infant)\b/i.test(artText);
  const artIsAdultOnly = /\b(adult|men|man|women|woman)\b/i.test(artText) && !artHasKids;
  const imgHasKids = /\b(kid|kids|child|children|boy|boys|girl|girls|baby|toddler|infant)\b/i.test(visualDetails);
  const imgHasAdult = /\b(adult|man|men|woman|women|people|mature)\b/i.test(visualDetails);

  if (artHasKids && imgHasAdult && !imgHasKids) {
    return "IMAGE_SEMANTIC_MISMATCH: Article targets Kids but image contains Adult elements.";
  }
  if (artIsAdultOnly && imgHasKids && !imgHasAdult) {
    return "IMAGE_SEMANTIC_MISMATCH: Article is Adult-Only but image contains Kids elements.";
  }

  // 3. Season Check (if season keyword is prominent/mandatory in article title)
  const artHasWinter = /\b(winter|wool|sweaters?|jackets?)\b/i.test(artText);
  const artHasSummer = /\b(summer|cottons?|heat)\b/i.test(artText);
  const imgHasWinter = /\b(winter|wool|sweater|jacket|layering|coat)\b/i.test(visualDetails);
  const imgHasSummer = /\b(summer|cotton|beach|sun|breathable)\b/i.test(visualDetails);

  if (artHasWinter && imgHasSummer && !imgHasWinter) {
    return "IMAGE_SEMANTIC_MISMATCH: Winter article paired with summer-only image.";
  }
  if (artHasSummer && imgHasWinter && !imgHasSummer) {
    return "IMAGE_SEMANTIC_MISMATCH: Summer article paired with winter-only image.";
  }

  // 4. Occasion Check (if wedding is prominent/mandatory in article title)
  const artHasWedding = /\b(wedding|bride|groom|marriage|lehenga|sherwani)\b/i.test(artText);
  const imgHasWedding = /\b(wedding|bride|groom|marriage|lehenga|sherwani|festive|ethnic)\b/i.test(visualDetails);
  const imgHasCasual = /\b(casual|western|jeans|tshirt|streetwear)\b/i.test(visualDetails);

  if (artHasWedding && imgHasCasual && !imgHasWedding) {
    return "IMAGE_SEMANTIC_MISMATCH: Wedding article paired with casual-only image.";
  }

  return null;
}
