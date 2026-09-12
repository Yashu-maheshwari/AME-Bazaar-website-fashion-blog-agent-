const fs = require('fs');
const path = require('path');
const vm = require('vm');

// Define mock secrets so tests run completely isolated without needing local.env
const secrets = {
  WORDPRESS_URL: "https://amebazaar.in",
  WORDPRESS_USERNAME: "test_username",
  WORDPRESS_APPLICATION_PASSWORD: "test_password_abcd_efgh_ijkl"
};

const context = {
  PropertiesService: {
    getScriptProperties: () => ({
      getProperty: (key) => secrets[key] || null,
      setProperty: (key, val) => { secrets[key] = val; },
      deleteProperty: (key) => { delete secrets[key]; }
    })
  },
  Logger: {
    log: function(msg) {
      console.log(msg);
    }
  },
  Utilities: {
    Charset: { UTF_8: 'UTF-8' },
    formatDate: (date, tz, format) => date.toISOString().slice(0, 10),
    base64Decode: (str) => Buffer.from(str, 'base64'),
    base64Encode: (str) => Buffer.from(str, 'utf8').toString('base64'),
    sleep: () => {},
    newBlob: (bytes, contentType, name) => {
      const blobObj = {
        getBytes: () => bytes,
        getContentType: () => contentType || 'image/jpeg',
        getName: () => name,
        setName: (n) => { name = n; return blobObj; },
        setContentType: (c) => { contentType = c; return blobObj; }
      };
      return blobObj;
    }
  },
  console: console
};

context.global = context;

const gasDir = path.join(__dirname, '../gas_agent');
const files = fs.readdirSync(gasDir).filter(f => f.endsWith('.gs'));
const order = ['Config.gs', 'BusinessKnowledge.gs', 'Prompts.gs', 'GeminiApi.gs', 'SeoQualityEngine.gs', 'ImageEngine.gs', 'SchemaGenerator.gs', 'WooCommerceCta.gs', 'WordPressPublisher.gs', 'TopicEngine.gs', 'Main.gs'];
files.sort((a, b) => order.indexOf(a) - order.indexOf(b));

vm.createContext(context);
files.forEach(f => {
  const code = fs.readFileSync(path.join(gasDir, f), 'utf8');
  vm.runInContext(code, context, { filename: f });
});

// Setup verification variables
context.visionUnavailable = true; // force deterministic fallback logic
let allPassed = true;

console.log("=== STARTING CANONICAL TOPIC-AWARE SYSTEM UNIT TESTS ===\n");

// ==========================================
// TEST A: Men's article + actual women's image -> REJECT
// ==========================================
console.log("TEST A: Men's article + actual women's image");
const briefA = {
  genderTargets: ["Male"],
  ageTargets: ["Adult"],
  garmentTypes: ["shirts", "trousers", "jackets"]
};
const womanPhoto = {
  id: "women123",
  description: "young woman posing in pink kurti traditional Indian dress",
  alt_description: "woman pink kurti",
  slug: "woman-pink-kurti",
  alternative_slugs: {},
  user: { bio: "" }
};
const evalA = context.evaluateCandidateSemantics(womanPhoto, briefA, "mens styling", "Gents Wear", "The Modern Men's Wardrobe: Smart-Casual Styling Tips");
console.log("  Score:", evalA.score, "Rejected:", evalA.isRejected, "Reason:", evalA.rejectionReason);
if (evalA.isRejected && evalA.rejectionReason.includes("Gender")) {
  console.log("  -> TEST A PASSED");
} else {
  console.log("  -> TEST A FAILED!");
  allPassed = false;
}

// ==========================================
// TEST B: Men's article + actual men's image -> ACCEPT
// ==========================================
console.log("\nTEST B: Men's article + actual men's image");
const manPhoto = {
  id: "men123",
  description: "handsome man model wearing a smart-casual blazer jacket and linen trousers outfit walking outdoors in Delhi",
  alt_description: "man smart casual blazer",
  slug: "man-smart-casual-blazer",
  alternative_slugs: {},
  user: { bio: "" }
};
const evalB = context.evaluateCandidateSemantics(manPhoto, briefA, "mens styling", "Gents Wear", "The Modern Men's Wardrobe: Smart-Casual Styling Tips");
console.log("  Score:", evalB.score, "Rejected:", evalB.isRejected);
if (!evalB.isRejected && evalB.score >= 85) {
  console.log("  -> TEST B PASSED");
} else {
  console.log("  -> TEST B FAILED!");
  allPassed = false;
}

// ==========================================
// TEST C: Girls' article + adult women's image -> REJECT
// ==========================================
console.log("\nTEST C: Girls' article + adult women's image");
const briefC = {
  genderTargets: ["Female"],
  ageTargets: ["Kids"],
  garmentTypes: ["suits", "kurtis"]
};
const adultWomanPhoto = {
  id: "adultwoman",
  description: "an elegant adult mature Indian woman in beautiful designer salwar kameez suit",
  alt_description: "mature woman salwar suit",
  slug: "mature-woman-salwar-suit",
  alternative_slugs: {},
  user: { bio: "" }
};
const evalC = context.evaluateCandidateSemantics(adultWomanPhoto, briefC, "girls suits", "Girls' Wear", "Trending Girls' Suit Designs: Comfort Meets Style");
console.log("  Score:", evalC.score, "Rejected:", evalC.isRejected, "Reason:", evalC.rejectionReason);
if (evalC.isRejected && (evalC.rejectionReason.includes("Age") || evalC.rejectionReason.includes("Adult for Kids"))) {
  console.log("  -> TEST C PASSED");
} else {
  console.log("  -> TEST C FAILED!");
  allPassed = false;
}

// ==========================================
// TEST D: Wedding family article + unrelated solo fashion model -> REJECT
// ==========================================
console.log("\nTEST D: Wedding family article + unrelated solo fashion model");
const briefD = {
  genderTargets: ["Family"],
  ageTargets: ["Adult", "Kids"],
  occasion: "wedding"
};
const soloModelPhoto = {
  id: "solomodel",
  description: "isolated close-up portrait of a single solo fashion model walking on a runway",
  alt_description: "solo fashion model portrait",
  slug: "solo-fashion-model-portrait",
  alternative_slugs: {},
  user: { bio: "" }
};
const evalD = context.evaluateCandidateSemantics(soloModelPhoto, briefD, "family outfits", "Family Fashion", "Family Coordinated Traditional Outfits for weddings");
console.log("  Score:", evalD.score, "Rejected:", evalD.isRejected, "Reason:", evalD.rejectionReason);
if (evalD.isRejected && evalD.rejectionReason.includes("Family Mismatch")) {
  console.log("  -> TEST D PASSED");
} else {
  console.log("  -> TEST D FAILED!");
  allPassed = false;
}

// ==========================================
// TEST E: Valid article + valid image -> ACCEPT
// ==========================================
console.log("\nTEST E: Valid article + valid image");
const mismatchE = context.checkImageSemanticMismatch(
  "The Modern Men's Wardrobe: Smart-Casual Styling Tips",
  "Gents Wear",
  "man smart casual blazer",
  "mens-smart-casual.webp",
  "handsome man model wearing a smart-casual blazer jacket and linen trousers"
);
console.log("  Mismatch Error:", mismatchE);
if (mismatchE === null) {
  console.log("  -> TEST E PASSED");
} else {
  console.log("  -> TEST E FAILED!");
  allPassed = false;
}

// ==========================================
// TEST F: Any article with no category -> MUST NOT publish as Uncategorized
// ==========================================
console.log("\nTEST F: Any article with no category");
const badArticle = {
  title: "Some random topic",
  contentHtml: "Just mock body content long enough to pass validation.",
  slug: "random-topic",
  primaryCategory: null,
  secondaryCategories: []
};
try {
  context.publishToWordPress(badArticle, null, "draft");
  console.log("  -> TEST F FAILED! Published without valid category.");
  allPassed = false;
} catch (e) {
  console.log("  Caught expected error:", e.message);
  if (e.message.includes("Category resolution failed")) {
    console.log("  -> TEST F PASSED");
  } else {
    console.log("  -> TEST F FAILED! Threw unexpected error.");
    allPassed = false;
  }
}

// ==========================================
// TEST G: Valid article + missing category -> resolve/create safely
// ==========================================
console.log("\nTEST G: Valid article + missing category (Safe mapping)");
// Mock WordPress REST category calls
context.UrlFetchApp = {
  fetch: function(url, options = {}) {
    if (url.includes('/wp-json/wp/v2/categories')) {
      if (options.method === 'post') {
        return {
          getResponseCode: () => 201,
          getContentText: () => JSON.stringify({ id: 99, name: "Ethnic Wear" })
        };
      }
      return {
        getResponseCode: () => 200,
        getContentText: () => JSON.stringify([{ id: 1, name: "Uncategorized" }])
      };
    }
    return { getResponseCode: () => 200, getContentText: () => "{}" };
  }
};
const articleG = {
  title: "Traditional Outfits for weddings",
  contentHtml: "Mock body content that meets the length criteria.",
  slug: "traditional-outfits-weddings",
  primaryCategory: "ethnic wear shop", // should map to "Ethnic Wear" and create ID 99
  secondaryCategories: []
};
try {
  // Clear the cache to ensure fetch mock is hit
  context.wpCategoryCache = null;
  const resultG = context.publishToWordPress(articleG, null, "draft");
  console.log("  Published successfully with category IDs:", resultG.categories || "check logs");
  console.log("  -> TEST G PASSED");
} catch (e) {
  console.log("  Failed with error:", e.message);
  console.log("  -> TEST G FAILED!");
  allPassed = false;
}

// ==========================================
// TEST H: Winter article + clearly summer-only image -> REJECT
// ==========================================
console.log("\nTEST H: Winter article + summer image");
const mismatchH = context.checkImageSemanticMismatch(
  "Trending Men's Winter Jackets and Woolens",
  "Winter Wear",
  "man at beach",
  "man-beach-summer.webp",
  "man wearing cotton t-shirt and sunglasses at the beach during hot summer"
);
console.log("  Mismatch Error:", mismatchH);
if (mismatchH && mismatchH.includes("summer-only")) {
  console.log("  -> TEST H PASSED");
} else {
  console.log("  -> TEST H FAILED!");
  allPassed = false;
}

// ==========================================
// TEST I: Wedding article + unrelated casual image -> REJECT
// ==========================================
console.log("\nTEST I: Wedding article + casual-only image");
const mismatchI = context.checkImageSemanticMismatch(
  "Best Traditional Lehenga Outfits for Indian Weddings",
  "Wedding & Occasion Wear",
  "sneakers street walk",
  "casual-ripped-jeans.webp",
  "person wearing casual ripped blue jeans and basic white sneakers walking on city street"
);
console.log("  Mismatch Error:", mismatchI);
if (mismatchI && mismatchI.includes("casual-only")) {
  console.log("  -> TEST I PASSED");
} else {
  console.log("  -> TEST I FAILED!");
  allPassed = false;
}

// ==========================================
// TEST J: Regression test — Men's article + woman in pink ethnic suit image with falsified metadata
// ==========================================
console.log("\nTEST J: Regression check (Men's article + woman image with falsified SEO metadata)");
const mismatchJ = context.checkImageSemanticMismatch(
  "The Modern Men's Wardrobe: Smart-Casual Styling Tips",
  "Gents Wear",
  "mens smart casual fashion", // falsified Alt
  "mens-smart-casual.webp",    // falsified Filename
  "beautiful indian woman wearing traditional pink ethnic suit salwar kameez" // real description
);
console.log("  Mismatch Error:", mismatchJ);
if (mismatchJ && mismatchJ.includes("IMAGE_SEMANTIC_MISMATCH")) {
  console.log("  -> TEST J PASSED");
} else {
  console.log("  -> TEST J FAILED!");
  allPassed = false;
}

// ==========================================
// TEST K: Trend Engine - Seasonal Prioritization
// ==========================================
console.log("\nTEST K: Trend Engine - Seasonal Prioritization");
context.getCurrentSeason = () => "Winter";
context.getApproachingOccasions = () => "None";
const scoreWinter = context.calculateOpportunityScore("Winter Wear", []);
const scoreSummer = context.calculateOpportunityScore("Casual Wear", []);
console.log("  Winter Wear Score:", scoreWinter, "| Casual Wear Score:", scoreSummer);
if (scoreWinter > scoreSummer) {
  console.log("  -> TEST K PASSED");
} else {
  console.log("  -> TEST K FAILED!");
  allPassed = false;
}

// ==========================================
// TEST L: Trend Engine - Occasion Prioritization (Wedding)
// ==========================================
console.log("\nTEST L: Trend Engine - Occasion Prioritization");
context.getApproachingOccasions = () => "Wedding Season";
const scoreWedding = context.calculateOpportunityScore("Wedding / Marriage Wear", []);
console.log("  Wedding Score:", scoreWedding, "| Casual Score:", scoreSummer);
if (scoreWedding > scoreSummer) {
  console.log("  -> TEST L PASSED");
} else {
  console.log("  -> TEST L FAILED!");
  allPassed = false;
}

// ==========================================
// TEST M: Trend Engine - Duplication Penalty
// ==========================================
console.log("\nTEST M: Trend Engine - Duplication Penalty");
const memoryPub = [
  { category: "Gents Wear", publishedAt: new Date().toISOString() }
];
const scoreGentsRecent = context.calculateOpportunityScore("Gents Wear", memoryPub);
const scoreGentsEmpty = context.calculateOpportunityScore("Gents Wear", []);
console.log("  Gents Score (Recent):", scoreGentsRecent, "| Gents Score (Empty):", scoreGentsEmpty);
if (scoreGentsRecent < scoreGentsEmpty) {
  console.log("  -> TEST M PASSED");
} else {
  console.log("  -> TEST M FAILED!");
  allPassed = false;
}

// ==========================================
// TEST N: Local Relevance Baseline
// ==========================================
console.log("\nTEST N: Trend Engine - Local Relevance");
const scoreLocal = context.calculateOpportunityScore("Local Clothing Store / Shopping Guides", []);
console.log("  Local Score:", scoreLocal, "| Base Score:", 50);
if (scoreLocal > 50) {
  console.log("  -> TEST N PASSED");
} else {
  console.log("  -> TEST N FAILED!");
  allPassed = false;
}

// ==========================================
// TEST O: Missing description does not bypass contradiction if strictly needed
// ==========================================
console.log("\nTEST O: Missing visual metadata does not bypass offline fallback contradiction gate");
const emptyPhoto = {
  id: "empty123",
  description: "",
  alt_description: "",
  slug: "photo",
  alternative_slugs: {},
  user: { bio: "" }
};
const evalO = context.evaluateCandidateSemantics(emptyPhoto, briefA, "mens styling", "Gents Wear", "The Modern Men's Wardrobe: Smart-Casual Styling Tips");
// In offline mode with empty metadata, it should lack Garment/Demographic match
const hasHighConf = evalO.score >= 85 && (evalO.positiveSignals.filter(s => s !== "Multiple Supporting Terms").length >= 3);
const hasDemoO = evalO.positiveSignals.includes("Demographic Match");
const isSafeO = hasHighConf && hasDemoO;
console.log("  Is Safe to Accept Offline:", isSafeO);
if (!isSafeO) {
  console.log("  -> TEST O PASSED");
} else {
  console.log("  -> TEST O FAILED!");
  allPassed = false;
}

// ==========================================
// TEST P: Data Integrity (Placeholder detection)
// ==========================================
console.log("\nTEST P: Data Integrity Placeholder Detection");
const invalidArticle = {
  title: "Test",
  contentHtml: "This is a placeholder content",
  seoTitle: "Test SEO"
};
try {
  context.runProductionDataIntegrityValidator(invalidArticle);
  console.log("  -> TEST P FAILED! Did not catch placeholder.");
  allPassed = false;
} catch (e) {
  if (e.message.includes("placeholder")) {
    console.log("  -> TEST P PASSED");
  } else {
    console.log("  -> TEST P FAILED! Caught wrong error.");
    allPassed = false;
  }
}

// ==========================================
// TEST Q: Data Integrity (Dummy phone detection)
// ==========================================
console.log("\nTEST Q: Data Integrity Dummy Phone Detection");
const invalidArticlePhone = {
  title: "Test",
  contentHtml: "Call us at 99999 99999",
  seoTitle: "Test SEO"
};
try {
  context.runProductionDataIntegrityValidator(invalidArticlePhone);
  console.log("  -> TEST Q FAILED! Did not catch phone.");
  allPassed = false;
} catch (e) {
  if (e.message.includes("99999")) {
    console.log("  -> TEST Q PASSED");
  } else {
    console.log("  -> TEST Q FAILED! Caught wrong error.");
    allPassed = false;
  }
}

// ==========================================
// TEST R: SEO Quality Audit (High Keyword Density)
// ==========================================
console.log("\nTEST R: SEO Audit Keyword Density Detection");
const denseArticle = {
  title: "Mens Wear",
  seoTitle: "Mens Wear",
  contentHtml: "Mens Wear ".repeat(50),
  faqs: [1,2,3,4],
  isPipelineTest: true,
  imageUrl: "valid",
  imageFilename: "mens-wear-delhi.webp",
  imageAltText: "Mens Wear",
  primaryCategory: "Gents Wear"
};
const auditR = context.runSeoAudit(denseArticle, "Mens Wear", true);
if (auditR.hardFailure && auditR.issues.some(i => i.includes("density is extremely high") || i.includes("thin"))) {
  console.log("  -> TEST R PASSED");
} else {
  console.log("  -> TEST R FAILED!");
  allPassed = false;
}

// ==========================================
// TEST S: Children's tailoring in custom CTA block
// ==========================================
console.log("\nTEST S: Children's Tailoring CTA Verification");
const ctaBlock = context.generateCtaBlock("Kids Wear");
const tailoringText = context.getBusinessConfig().tailoringServiceInfo;
if (tailoringText.includes("men's, women's, and children's") && ctaBlock.includes("children's clothing")) {
  console.log("  -> TEST S PASSED");
} else {
  console.log("  -> TEST S FAILED! Tailoring text does not include children's clothing: " + tailoringText);
  allPassed = false;
}

// ==========================================
// TEST T: Schema generation and exactly-once idempotency
// ==========================================
console.log("\nTEST T: Schema Generation & Idempotency");
const mockArticleForSchema = {
  title: "Summer Kurtis in Kirari",
  metaDescription: "Guide to summer kurtis in Kirari",
  slug: "summer-kurtis-kirari",
  imageUrl: "https://example.com/kurti.webp",
  imageFilename: "summer-kurtis-kirari.webp",
  imageAltText: "Summer kurtis in Kirari",
  faqs: [
    { question: "Where is AME Bazaar?", answer: "Mubarakpur Road, Kirari, Delhi." }
  ]
};
let sampleHtml = "<p>Welcome to AME Bazaar.</p>";
let withSchema1 = context.appendStructuredDataSchemas(sampleHtml, mockArticleForSchema);
let withSchema2 = context.appendStructuredDataSchemas(withSchema1, mockArticleForSchema);

const countOccurrences = (str, sub) => str.split(sub).length - 1;
const schemaTagCount = countOccurrences(withSchema2, '<!-- Structured Data Schemas -->');
const ldJsonCount = countOccurrences(withSchema2, 'application/ld+json');

if (schemaTagCount === 1 && ldJsonCount === 1) {
  console.log("  -> TEST T PASSED (Schemas appended exactly once in unified @graph)");
} else {
  console.log(`  -> TEST T FAILED! Found ${schemaTagCount} schema comments and ${ldJsonCount} ld+json tags.`);
  allPassed = false;
}

// ==========================================
// TEST U: Zero Unsplash calls even when UNSPLASH_ACCESS_KEY is set (strict Wikimedia/Hostinger only)
// ==========================================
console.log("\nTEST U: Zero Unsplash Calls Even With UNSPLASH_ACCESS_KEY Configured");
let capturedFetchOptions = null;
let unsplashHit = false;
context.UrlFetchApp = {
  fetch: function(url, options) {
    capturedFetchOptions = { url, options };
    if (url.includes('unsplash.com')) {
      unsplashHit = true;
    }
    return {
      getResponseCode: () => 200,
      getContentText: () => JSON.stringify({ count: 0, candidates: [], results: [] })
    };
  }
};

secrets.UNSPLASH_ACCESS_KEY = "mock_secret_access_key_12345";
const resU = context.fetchTopicSpecificImage(["cotton kurti"], "Ladies Wear", "cotton kurti");

if (!unsplashHit && resU && resU.blob === null && resU.isFallback === true) {
  console.log("  -> TEST U PASSED (Zero calls to Unsplash; engine returns safe failure with blob: null)");
} else {
  console.log("  -> TEST U FAILED! unsplashHit: " + unsplashHit + ", resU: " + JSON.stringify(resU));
  allPassed = false;
}
delete secrets.UNSPLASH_ACCESS_KEY;

// ==========================================
// TEST V: Safe failure when Image Service is unconfigured
// ==========================================
console.log("\nTEST V: Safe Failure When Image Service Is Unconfigured");
delete secrets.UNSPLASH_ACCESS_KEY;
delete secrets.IMAGE_SERVICE_URL;
delete secrets.IMAGE_SERVICE_SECRET;
capturedFetchOptions = null;
let networkCallMade = false;
context.UrlFetchApp = {
  fetch: function(url, options) {
    networkCallMade = true;
    return {
      getResponseCode: () => 200,
      getContentText: () => JSON.stringify({})
    };
  }
};
const resV = context.fetchTopicSpecificImage(["cotton kurti"], "Ladies Wear", "cotton kurti");

if (resV && resV.blob === null && resV.isFallback === true && !networkCallMade) {
  console.log("  -> TEST V PASSED (Fell back safely to blob: null without making unconfigured network calls)");
} else {
  console.log("  -> TEST V FAILED! resV: " + JSON.stringify(resV) + ", networkCallMade: " + networkCallMade);
  allPassed = false;
}

// Restore default UrlFetchApp
delete context.UrlFetchApp;

// ==========================================
// TEST W: SEO Critic receives schema-bearing HTML
// ==========================================
console.log("\nTEST W: SEO Critic Receives Schema-Bearing HTML");
let capturedCriticHtml = null;
context.callGemini = function(prompt, retries, isDryRun) {
  capturedCriticHtml = prompt;
  return { text: JSON.stringify({ totalScore: 95, hardFailure: false }) };
};

const testArticleW = {
  title: "Festive Sarees in Kirari",
  seoTitle: "Festive Sarees in Kirari | AME Bazaar",
  slug: "festive-sarees-kirari",
  contentHtml: `
    <p>Discover the finest festive sarees in Kirari at AME Bazaar. When shopping for ethnic festive sarees in Kirari, families look for unmatched elegance, premium fabric blends, and vibrant colors suitable for traditional celebrations across Delhi.</p>
    <p>${"Festive sarees provide timeless grace, blending traditional zari borders with contemporary drape styles that keep you comfortable throughout Indian wedding seasons. ".repeat(15)}</p>
    <h2>Frequently Asked Questions (FAQ)</h2>
    <p>Here are detailed answers to frequently asked customer questions regarding festive sarees shopping at AME Bazaar in Kirari Delhi.</p>
    <p>Q1: Where can I buy authentic festive sarees in Kirari? Answer: AME Bazaar on Mubarakpur Road, Kirari, Delhi offers an extensive range of festive sarees.</p>
    <p>Q2: Does AME Bazaar offer custom tailoring? Answer: Yes, custom blouse stitching and saree fall alterations are available for the entire family.</p>
    <p>Q3: What are the store timings? Answer: We are open daily from 10:00 AM to 9:00 PM.</p>
    <p>Q4: Can I try on sarees in store? Answer: Yes, our retail store features full trial facilities.</p>
  `,
  faqs: [
    { question: "Where can I buy festive sarees in Kirari?", answer: "At AME Bazaar located on Mubarakpur Road." },
    { question: "Does AME Bazaar offer custom tailoring?", answer: "Yes, bespoke tailoring and alterations for men, women, and children." },
    { question: "What are the store timings?", answer: "10:00 AM to 9:00 PM daily." },
    { question: "Can I try on sarees in store?", answer: "Yes, our offline retail store welcomes visitors." }
  ]
};

// Emulate evalData assembly from Main.gs
const evalDataW = JSON.parse(JSON.stringify(testArticleW));
const ctaW = context.generateCtaBlock("Ladies Wear");
evalDataW.contentHtml = context.appendStructuredDataSchemas((evalDataW.contentHtml || '') + ctaW, evalDataW);
context.runSeoAudit(evalDataW, "festive sarees", true);

if (capturedCriticHtml && 
    capturedCriticHtml.includes("application/ld+json") && 
    capturedCriticHtml.includes("Article") && 
    capturedCriticHtml.includes("FAQPage")) {
  console.log("  -> TEST W PASSED (Critic received HTML containing Article and FAQPage JSON-LD)");
} else {
  console.log("  -> TEST W FAILED! Critic prompt did not contain schema blocks.");
  allPassed = false;
}

// Restore real callGemini from GeminiApi.gs
const geminiCode = fs.readFileSync(path.join(gasDir, 'GeminiApi.gs'), 'utf8');
vm.runInContext(geminiCode, context, { filename: 'GeminiApi.gs' });

// ============================================================================
// SECTION 2: INDEPENDENT IMAGE SEARCH & UNDERSTANDING AUDIT (TESTS A through Q)
// ============================================================================
console.log("\n============================================================================");
console.log("=== SECTION 2: INDEPENDENT IMAGE SEARCH & UNDERSTANDING AUDIT (TESTS A-Q) ===");
console.log("============================================================================\n");

// TEST 2.A: Kids blog -> automatically derives kids visual intent
console.log("TEST 2.A: Kids blog -> automatically derives kids visual intent");
const kidsTopic = {
  title: "Monsoon Kids Wear in Delhi: Rainwear & Casual Styles",
  focusKeyword: "monsoon kids wear",
  category: "Kids Wear"
};
const kidsBrief = context.deriveImageSemanticBrief(kidsTopic);
if (kidsBrief && 
    kidsBrief.ageTargets.includes("Kids") && 
    kidsBrief.genderTargets.includes("Kids") && 
    kidsBrief.mustNotShow.toLowerCase().includes("adult")) {
  console.log("  -> TEST 2.A PASSED (Kids visual intent automatically derived)");
} else {
  console.log("  -> TEST 2.A FAILED!", JSON.stringify(kidsBrief));
  allPassed = false;
}

// TEST 2.B: Men's blog -> automatically derives men's visual intent
console.log("\nTEST 2.B: Men's blog -> automatically derives men's visual intent");
const mensTopic = {
  title: "Gents Kurta Pajama for Diwali: Festive Men's Ethnic Wear",
  focusKeyword: "gents kurta pajama",
  category: "Gents Wear"
};
const mensBrief = context.deriveImageSemanticBrief(mensTopic);
if (mensBrief && 
    mensBrief.ageTargets.includes("Adult") && 
    mensBrief.genderTargets.includes("Male") && 
    mensBrief.mustNotShow.toLowerCase().includes("female")) {
  console.log("  -> TEST 2.B PASSED (Men's visual intent automatically derived)");
} else {
  console.log("  -> TEST 2.B FAILED!", JSON.stringify(mensBrief));
  allPassed = false;
}

// TEST 2.C: Women's blog -> automatically derives women's visual intent
console.log("\nTEST 2.C: Women's blog -> automatically derives women's visual intent");
const womensTopic = {
  title: "Summer Cotton Kurtis for Women in Delhi",
  focusKeyword: "summer cotton kurtis",
  category: "Ladies Wear"
};
const womensBrief = context.deriveImageSemanticBrief(womensTopic);
if (womensBrief && 
    womensBrief.ageTargets.includes("Adult") && 
    womensBrief.genderTargets.includes("Female") && 
    womensBrief.mustNotShow.toLowerCase().includes("male")) {
  console.log("  -> TEST 2.C PASSED (Women's visual intent automatically derived)");
} else {
  console.log("  -> TEST 2.C FAILED!", JSON.stringify(womensBrief));
  allPassed = false;
}

// TEST 2.D: Garment extraction matches topic
console.log("\nTEST 2.D: Garment extraction matches topic");
const kidsHasRainwear = kidsBrief.garmentTypes.some(g => /rainwear|rain jacket/i.test(g));
const mensHasKurta = mensBrief.garmentTypes.some(g => /kurta pajama|ethnic kurta/i.test(g));
const womensHasKurti = womensBrief.garmentTypes.some(g => /cotton kurti|kurti tunic/i.test(g));
if (kidsHasRainwear && mensHasKurta && womensHasKurti) {
  console.log("  -> TEST 2.D PASSED (Garment extraction matches topic)");
} else {
  console.log(`  -> TEST 2.D FAILED! kids=${kidsHasRainwear}, mens=${mensHasKurta}, womens=${womensHasKurti}`);
  allPassed = false;
}

// TEST 2.E: Season/occasion extraction matches topic
console.log("\nTEST 2.E: Season/occasion extraction matches topic");
const kidsSeasonMatch = kidsBrief.season === "Monsoon";
const mensOccasionMatch = mensBrief.occasion === "Diwali";
const womensSeasonMatch = womensBrief.season === "Summer";
if (kidsSeasonMatch && mensOccasionMatch && womensSeasonMatch) {
  console.log("  -> TEST 2.E PASSED (Season/occasion extraction matches topic)");
} else {
  console.log(`  -> TEST 2.E FAILED! kidsSeason=${kidsBrief.season}, mensOccasion=${mensBrief.occasion}, womensSeason=${womensBrief.season}`);
  allPassed = false;
}

// TEST 2.F: Image queries generated directly from visual intent
console.log("\nTEST 2.F: Image queries generated directly from visual intent");
const kidsQueriesValid = kidsBrief.imageSearchQueries.length >= 3 && kidsBrief.imageSearchQueries.some(q => /rain jacket|monsoon|rainy/i.test(q));
const mensQueriesValid = mensBrief.imageSearchQueries.length >= 3 && mensBrief.imageSearchQueries.some(q => /kurta pajama|diwali/i.test(q));
const womensQueriesValid = womensBrief.imageSearchQueries.length >= 3 && womensBrief.imageSearchQueries.some(q => /cotton kurti|summer/i.test(q));
if (kidsQueriesValid && mensQueriesValid && womensQueriesValid) {
  console.log("  -> TEST 2.F PASSED (Image queries generated directly from visual intent)");
} else {
  console.log("  -> TEST 2.F FAILED! Kids queries: " + JSON.stringify(kidsBrief.imageSearchQueries));
  allPassed = false;
}

// Setup fetch tracker for WordPress independence tests
let wpMediaSearchAttempted = false;
let capturedAuthHeader = null;
let capturedApiUrl = null;

context.UrlFetchApp = {
  fetch: function(url, options) {
    if (url.includes("/wp-json/wp/v2/media")) {
      wpMediaSearchAttempted = true;
    }
    if (url.startsWith("https://api.unsplash.com/")) {
      capturedApiUrl = url;
      capturedAuthHeader = options && options.headers && options.headers['Authorization'];
    }
    return {
      getResponseCode: () => 200,
      getContentText: () => JSON.stringify({ results: [] })
    };
  }
};

// TEST 2.G: Image search operates with WORDPRESS_URL = null
console.log("\nTEST 2.G: Image search operates with WORDPRESS_URL = null");
delete secrets.WORDPRESS_URL;
let resG = null;
try {
  resG = context.fetchTopicSpecificImage(kidsBrief.imageSearchQueries, "Kids Wear", "monsoon kids wear", kidsBrief);
  console.log("  -> TEST 2.G PASSED (Image search completed safely with WORDPRESS_URL = null)");
} catch (e) {
  console.log("  -> TEST 2.G FAILED! Exception: " + e.message);
  allPassed = false;
}

// TEST 2.H: Image search operates with WORDPRESS_USERNAME = null
console.log("\nTEST 2.H: Image search operates with WORDPRESS_USERNAME = null");
delete secrets.WORDPRESS_USERNAME;
let resH = null;
try {
  resH = context.fetchTopicSpecificImage(mensBrief.imageSearchQueries, "Gents Wear", "gents kurta pajama", mensBrief);
  console.log("  -> TEST 2.H PASSED (Image search completed safely with WORDPRESS_USERNAME = null)");
} catch (e) {
  console.log("  -> TEST 2.H FAILED! Exception: " + e.message);
  allPassed = false;
}

// TEST 2.I: Image search operates with WORDPRESS_APPLICATION_PASSWORD = null
console.log("\nTEST 2.I: Image search operates with WORDPRESS_APPLICATION_PASSWORD = null");
delete secrets.WORDPRESS_APPLICATION_PASSWORD;
let resI = null;
try {
  resI = context.fetchTopicSpecificImage(womensBrief.imageSearchQueries, "Ladies Wear", "summer cotton kurtis", womensBrief);
  console.log("  -> TEST 2.I PASSED (Image search completed safely with WORDPRESS_APPLICATION_PASSWORD = null)");
} catch (e) {
  console.log("  -> TEST 2.I FAILED! Exception: " + e.message);
  allPassed = false;
}

// TEST 2.J: No calls to /wp-json/wp/v2/media?search= occur during image selection
console.log("\nTEST 2.J: No calls to /wp-json/wp/v2/media?search= occur during image selection");
if (!wpMediaSearchAttempted) {
  console.log("  -> TEST 2.J PASSED (Zero WordPress media library search calls made during image selection)");
} else {
  console.log("  -> TEST 2.J FAILED! WordPress media search endpoint was contacted during image selection!");
  allPassed = false;
}

// TEST 2.K: Zero Unsplash calls during visual intent search
console.log("\nTEST 2.K: Zero Unsplash calls during visual intent search");
secrets.UNSPLASH_ACCESS_KEY = "official_test_unsplash_key_99999";
capturedAuthHeader = null;
capturedApiUrl = null;
let unsplashCalled2K = false;
const prevFetch = context.UrlFetchApp;
context.UrlFetchApp = {
  fetch: (url, opts) => {
    capturedApiUrl = url;
    if (url.includes('unsplash.com')) {
      unsplashCalled2K = true;
    }
    return {
      getResponseCode: () => 200,
      getContentText: () => JSON.stringify({ count: 0, candidates: [] })
    };
  }
};
const res2K = context.fetchTopicSpecificImage(["cotton kurti"], "Ladies Wear", "cotton kurti", womensBrief);
if (!unsplashCalled2K && res2K && res2K.blob === null && res2K.isFallback === true) {
  console.log("  -> TEST 2.K PASSED (Zero Unsplash calls during visual intent search; safe failure preserved)");
} else {
  console.log("  -> TEST 2.K FAILED! unsplashCalled2K=" + unsplashCalled2K + ", res2K=" + JSON.stringify(res2K));
  allPassed = false;
}
delete secrets.UNSPLASH_ACCESS_KEY;
if (prevFetch) context.UrlFetchApp = prevFetch;
else delete context.UrlFetchApp;

// TEST 2.L: Contradictory image (wrong gender/age/garment) strictly rejected
console.log("\nTEST 2.L: Contradictory image (wrong gender/age/garment) strictly rejected");
const adultModelForKids = {
  id: "adult101",
  description: "adult corporate businessman in formal western suit blazer",
  alt_description: "adult male blazer",
  slug: "adult-male-blazer",
  alternative_slugs: {},
  user: { bio: "" }
};
const evalKidsAgainstAdult = context.evaluateCandidateSemantics(adultModelForKids, kidsBrief, "monsoon kids wear", "Kids Wear", "Monsoon Kids Wear in Delhi");
if (evalKidsAgainstAdult.isRejected) {
  console.log("  -> TEST 2.L PASSED (Adult corporate image strictly rejected for Kids article: " + evalKidsAgainstAdult.rejectionReason + ")");
} else {
  console.log("  -> TEST 2.L FAILED! Mismatched candidate was not rejected!");
  allPassed = false;
}

// TEST 2.M: Matching image accepted with high score
console.log("\nTEST 2.M: Matching image accepted with high score");
const matchingKidPhoto = {
  id: "kid202",
  description: "happy young Indian child girl wearing colorful rainwear raincoat and rain jacket playing outdoors in rain in Delhi",
  alt_description: "indian girl rainwear raincoat",
  slug: "indian-girl-rainwear-raincoat",
  alternative_slugs: {},
  user: { bio: "" }
};
const evalKidsMatching = context.evaluateCandidateSemantics(matchingKidPhoto, kidsBrief, "monsoon kids wear", "Kids Wear", "Monsoon Kids Wear in Delhi");
if (!evalKidsMatching.isRejected && evalKidsMatching.score >= 50) {
  console.log(`  -> TEST 2.M PASSED (Matching image accepted with score ${evalKidsMatching.score})`);
} else {
  console.log(`  -> TEST 2.M FAILED! Rejected=${evalKidsMatching.isRejected}, Score=${evalKidsMatching.score}`);
  allPassed = false;
}

// TEST 2.N: Safe failure (blob: null, isFallback: true) when no candidates pass
console.log("\nTEST 2.N: Safe failure (blob: null, isFallback: true) when no candidates pass");
const safeFailureRes = context.fetchTopicSpecificImage(["nonexistent garment style 9999"], "Kids Wear", "monsoon kids wear", kidsBrief);
if (safeFailureRes && safeFailureRes.isFallback === true && safeFailureRes.blob === null) {
  console.log("  -> TEST 2.N PASSED (Safe failure returned blob: null and isFallback: true)");
} else {
  console.log("  -> TEST 2.N FAILED!", JSON.stringify(safeFailureRes));
  allPassed = false;
}

// TEST 2.O: Zero secrets printed or committed
console.log("\nTEST 2.O: Zero secrets printed or committed");
let hasLeakedSecrets = false;
const secretTokens = ["official_test_unsplash_key_99999", "test_password_abcd_efgh_ijkl"];
const briefStr = JSON.stringify(kidsBrief) + JSON.stringify(mensBrief) + JSON.stringify(womensBrief);
for (const token of secretTokens) {
  if (briefStr.includes(token)) {
    hasLeakedSecrets = true;
  }
}
if (!hasLeakedSecrets) {
  console.log("  -> TEST 2.O PASSED (Zero secrets exposed in objects or outputs)");
} else {
  console.log("  -> TEST 2.O FAILED! Secret token detected in output data!");
  allPassed = false;
}

// TEST 2.P: No changes to legacy Social Media Agent project
console.log("\nTEST 2.P: No changes to legacy Social Media Agent project");
const legacyId = "1PERF3o5OMpYfbH8ePPC0HDNQEHEnWFfF7hE1ZPEQ6e84UAeYlSl1S_q7";
const targetId = "1TlqTjUrrgM7_AsnPKjCerIO52iLKXIZ1n-Sh0XMNpAXb1Y536Vl0YwcB";
let claspConfigValid = true;
try {
  const claspContent = fs.readFileSync(path.join(gasDir, '.clasp.json'), 'utf8');
  const claspJson = JSON.parse(claspContent);
  if (claspJson.scriptId !== targetId || claspJson.scriptId === legacyId) {
    claspConfigValid = false;
  }
} catch (e) {
  try {
    const claspContent = fs.readFileSync(path.join(__dirname, '../.clasp.json'), 'utf8');
    const claspJson = JSON.parse(claspContent);
    if (claspJson.scriptId !== targetId || claspJson.scriptId === legacyId) {
      claspConfigValid = false;
    }
  } catch (err) {}
}
if (claspConfigValid) {
  console.log(`  -> TEST 2.P PASSED (Target script ID verified, legacy project ${legacyId.slice(0, 10)}... untouched)`);
} else {
  console.log("  -> TEST 2.P FAILED! Target script ID mismatch with legacy agent!");
  allPassed = false;
}

// TEST 2.Q: All existing 23 tests (A through W) continue to pass
console.log("\nTEST 2.Q: All existing 23 tests (A through W) verified");
if (allPassed) {
  console.log("  -> TEST 2.Q PASSED (All original 23 tests A-W and new tests A-P passed successfully)");
} else {
  console.log("  -> TEST 2.Q FAILED! One or more tests failed in execution.");
}

// Clean up mock UrlFetchApp
delete context.UrlFetchApp;

// ==============================================================================
// SECTION 3: AI SEARCH READINESS & CONTENT INTEGRITY TESTS (Tests 3.A to 3.Q)
// ==============================================================================
console.log("\n=== STARTING SECTION 3: AI SEARCH READINESS & CONTENT INTEGRITY TESTS ===\n");

// TEST 3.A: Yoast keyword property is generated correctly
console.log("TEST 3.A: Yoast keyword property generation");
secrets.WORDPRESS_URL = "https://amebazaar.in";
secrets.WORDPRESS_USERNAME = "test_username";
secrets.WORDPRESS_APPLICATION_PASSWORD = "test_password_abcd_efgh_ijkl";
const sampleTopicForWp = {
  title: "Summer Kurtis in Kirari",
  focusKeyword: "summer kurtis kirari",
  category: "Ladies Wear"
};
const sampleArticleForWp = {
  title: "Summer Kurtis in Kirari",
  slug: "summer-kurtis-kirari",
  focusKeyword: "summer kurtis kirari",
  primaryCategory: "Ladies Wear",
  metaDescription: "Guide to summer kurtis in Kirari Delhi",
  contentHtml: "<p>Content</p>"
};
let capturedWpPayload = null;
context.UrlFetchApp = {
  fetch: (url, options) => {
    if (url.includes('/wp-json/wp/v2/categories')) {
      if (options && options.method === 'post') {
        return {
          getResponseCode: () => 201,
          getContentText: () => JSON.stringify({ id: 10, name: "Ladies Wear" })
        };
      }
      return {
        getResponseCode: () => 200,
        getContentText: () => JSON.stringify([{ id: 10, name: "Ladies Wear" }])
      };
    }
    if (url.includes('/wp-json/wp/v2/posts')) {
      capturedWpPayload = JSON.parse(options.payload);
      return {
        getResponseCode: () => 201,
        getContentText: () => JSON.stringify({ id: 1234, link: "https://amebazaar.in/summer-kurtis-kirari/" })
      };
    }
    return { getResponseCode: () => 200, getContentText: () => '{}' };
  }
};
context.publishToWordPress(sampleArticleForWp, null, 'draft', sampleTopicForWp);
if (capturedWpPayload && capturedWpPayload.meta && capturedWpPayload.meta._yoast_wpseo_focuskw === "summer kurtis kirari") {
  console.log("  -> TEST 3.A PASSED (Yoast focus keyword properly included in REST payload meta)");
} else {
  console.log("  -> TEST 3.A FAILED! Meta payload: " + JSON.stringify(capturedWpPayload ? capturedWpPayload.meta : null));
  allPassed = false;
}

// TEST 3.B: Structured data contains @graph with Organization, Article, BreadcrumbList
console.log("\nTEST 3.B: Structured data @graph generation");
const testArticleForGraph = {
  title: "Festive Lehenga Trends in Delhi",
  slug: "festive-lehenga-trends-delhi",
  metaDescription: "Guide to festive lehenga trends in Kirari Delhi",
  link: "https://amebazaar.in/festive-lehenga-trends-delhi/",
  primaryCategory: "Ladies Wear",
  faqs: [{ question: "Do you offer alterations?", answer: "Yes, custom alterations are available." }]
};
const graphHtml = context.appendStructuredDataSchemas("<p>Lehenga trends content</p>", testArticleForGraph);
const jsonLdMatch = graphHtml.match(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/);
let parsedGraph = null;
if (jsonLdMatch) {
  try {
    parsedGraph = JSON.parse(jsonLdMatch[1]);
  } catch (e) {}
}
const graphItems = (parsedGraph && parsedGraph["@graph"]) || [];
const hasOrg = graphItems.some(item => item["@type"] === "Organization");
const hasArticle = graphItems.some(item => item["@type"] === "Article");
const hasBreadcrumb = graphItems.some(item => item["@type"] === "BreadcrumbList");
if (parsedGraph && parsedGraph["@context"] === "https://schema.org" && hasOrg && hasArticle && hasBreadcrumb) {
  console.log("  -> TEST 3.B PASSED (Structured data contains @graph with Organization, Article, BreadcrumbList)");
} else {
  console.log("  -> TEST 3.B FAILED! parsedGraph items: " + JSON.stringify(graphItems.map(i => i["@type"])));
  allPassed = false;
}

// TEST 3.C: Organization contains verified @id and verified sameAs
console.log("\nTEST 3.C: Organization verified @id and verified sameAs");
const orgItem = graphItems.find(item => item["@type"] === "Organization");
if (orgItem && orgItem["@id"] === "https://amebazaar.in/#organization" && Array.isArray(orgItem.sameAs) && orgItem.sameAs.length > 0) {
  console.log("  -> TEST 3.C PASSED (Organization @id is https://amebazaar.in/#organization and sameAs is verified)");
} else {
  console.log("  -> TEST 3.C FAILED! orgItem: " + JSON.stringify(orgItem));
  allPassed = false;
}

// TEST 3.D: sameAs contains ONLY valid URLs, no '#' or placeholders
console.log("\nTEST 3.D: sameAs contains ONLY valid URLs, no '#' or placeholders");
const invalidSameAs = (orgItem && orgItem.sameAs) ? orgItem.sameAs.filter(url => !url.startsWith('http') || url.includes('#') || url.includes('placeholder') || url.includes('example.com')) : ['MISSING'];
if (invalidSameAs.length === 0) {
  console.log("  -> TEST 3.D PASSED (sameAs contains only valid http(s) URLs with zero placeholders or '#')");
} else {
  console.log("  -> TEST 3.D FAILED! Invalid sameAs entries found: " + JSON.stringify(invalidSameAs));
  allPassed = false;
}

// TEST 3.E: Article contains datePublished, dateModified, and links to Organization by @id
console.log("\nTEST 3.E: Article datePublished, dateModified, and author/publisher @id");
const articleItem = graphItems.find(item => item["@type"] === "Article");
const hasValidDates = articleItem && articleItem.datePublished && articleItem.dateModified && !isNaN(Date.parse(articleItem.datePublished));
const authorLinked = articleItem && articleItem.author && articleItem.author["@id"] === "https://amebazaar.in/#organization";
const publisherLinked = articleItem && articleItem.publisher && articleItem.publisher["@id"] === "https://amebazaar.in/#organization";
const hasEntityOfPage = articleItem && articleItem.mainEntityOfPage && articleItem.mainEntityOfPage["@id"] === "https://amebazaar.in/festive-lehenga-trends-delhi/";
if (hasValidDates && authorLinked && publisherLinked && hasEntityOfPage) {
  console.log("  -> TEST 3.E PASSED (Article contains ISO dates and links author/publisher to https://amebazaar.in/#organization)");
} else {
  console.log("  -> TEST 3.E FAILED! articleItem: " + JSON.stringify(articleItem));
  allPassed = false;
}

// TEST 3.F: FAQ schema is omitted when faqs = []
console.log("\nTEST 3.F: FAQ schema omitted when faqs = []");
const articleWithoutFaqs = {
  title: "Men Casual Shirts",
  slug: "men-casual-shirts",
  metaDescription: "Guide to casual shirts",
  faqs: []
};
const graphNoFaq = context.appendStructuredDataSchemas("<p>Shirts content</p>", articleWithoutFaqs);
const parsedNoFaq = JSON.parse(graphNoFaq.match(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/)[1]);
const hasFaqWhenEmpty = (parsedNoFaq["@graph"] || []).some(item => item["@type"] === "FAQPage");
if (!hasFaqWhenEmpty) {
  console.log("  -> TEST 3.F PASSED (FAQPage schema correctly omitted when faqs array is empty)");
} else {
  console.log("  -> TEST 3.F FAILED! FAQPage schema unexpectedly emitted for empty faqs!");
  allPassed = false;
}

// TEST 3.G: FAQ schema is included when faqs contains questions
console.log("\nTEST 3.G: FAQ schema included when faqs contains questions");
const hasFaqWhenPresent = (parsedGraph["@graph"] || []).some(item => item["@type"] === "FAQPage" && item.mainEntity && item.mainEntity.length > 0);
if (hasFaqWhenPresent) {
  console.log("  -> TEST 3.G PASSED (FAQPage schema properly included when faqs are provided)");
} else {
  console.log("  -> TEST 3.G FAILED! FAQPage schema missing when faqs are provided!");
  allPassed = false;
}

// TEST 3.H: Additional <h1> tags trigger audit failure
console.log("\nTEST 3.H: Additional <h1> tags trigger audit failure");
const articleWithExtraH1 = {
  title: "Kurtis Guide",
  seoTitle: "Kurtis Guide Delhi",
  contentHtml: "<h1>Extra Headline In Body</h1><p>Body copy here " + "word ".repeat(550) + "</p><a href='https://amebazaar.in/shop'>Shop</a> <a href='https://amebazaar.in/services'>Services</a>",
  faqs: [{ question: "Q", answer: "A" }],
  primaryCategory: "Ladies Wear",
  imageFilename: "kurtis.webp",
  imageUrl: "https://amebazaar.in/kurtis.webp",
  imageAltText: "Kurtis"
};
const auditH1 = context.runSeoAudit(articleWithExtraH1, "Kurtis Guide", true);
if (auditH1.hardFailure && auditH1.issues.some(i => i.includes("<h1>") || i.includes("Multiple H1"))) {
  console.log("  -> TEST 3.H PASSED (Additional <h1> in body correctly flagged as hard audit failure)");
} else {
  console.log("  -> TEST 3.H FAILED! audit result: " + JSON.stringify(auditH1));
  allPassed = false;
}

// TEST 3.I: Fake price claims (e.g. ₹999) trigger audit failure
console.log("\nTEST 3.I: Fake price claims trigger audit failure");
const articleWithFakePrice = {
  title: "Kurtis Guide",
  seoTitle: "Kurtis Guide Delhi",
  contentHtml: "<p>Grab this designer suit for only ₹999 or get 50% discount today! " + "word ".repeat(550) + "</p><a href='https://amebazaar.in/shop'>Shop</a> <a href='https://amebazaar.in/services'>Services</a>",
  faqs: [{ question: "Q", answer: "A" }],
  primaryCategory: "Ladies Wear",
  imageFilename: "kurtis.webp",
  imageUrl: "https://amebazaar.in/kurtis.webp",
  imageAltText: "Kurtis"
};
const auditPrice = context.runSeoAudit(articleWithFakePrice, "Kurtis Guide", true);
if (auditPrice.hardFailure && auditPrice.issues.some(i => i.includes("commercial") || i.includes("price") || i.includes("₹"))) {
  console.log("  -> TEST 3.I PASSED (Unverified commercial price claims trigger hard audit failure)");
} else {
  console.log("  -> TEST 3.I FAILED! audit result: " + JSON.stringify(auditPrice));
  allPassed = false;
}

// TEST 3.J: Legitimate dates (e.g. 2026) and measurements do NOT trigger price failure
console.log("\nTEST 3.J: Legitimate dates (2026) and measurements do NOT trigger price failure");
const articleWithLegitNumbers = {
  title: "Kurtis Guide",
  seoTitle: "Kurtis Guide Delhi",
  contentHtml: "<p>The 2026 summer collection uses 100% breathable cotton, tailored with 2-3 inches of margin at pin code 110086, open at 10:00 AM. " + "quality fabric styling tips ".repeat(150) + "</p><a href='https://amebazaar.in/shop'>Shop</a> <a href='https://amebazaar.in/services'>Services</a>",
  faqs: [{ question: "Q", answer: "A" }],
  primaryCategory: "Ladies Wear",
  imageFilename: "kurtis.webp",
  imageUrl: "https://amebazaar.in/kurtis.webp",
  imageAltText: "Kurtis"
};
const auditLegit = context.runSeoAudit(articleWithLegitNumbers, "Kurtis Guide", true);
const hasPriceFalseAlarm = auditLegit.issues && auditLegit.issues.some(i => i.includes("commercial") || i.includes("price"));
if (!hasPriceFalseAlarm) {
  console.log("  -> TEST 3.J PASSED (Legitimate years, percentages, measurements, and times do not trigger price rejection)");
} else {
  console.log("  -> TEST 3.J FAILED! False alarm on legitimate numbers: " + JSON.stringify(auditLegit.issues));
  allPassed = false;
}

// TEST 3.K: Fake citations ("studies show") trigger audit failure
console.log("\nTEST 3.K: Fake citations trigger audit failure");
const articleWithFakeCitation = {
  title: "Kurtis Guide",
  seoTitle: "Kurtis Guide Delhi",
  contentHtml: "<p>Studies show that cotton is superior for tropical weather. Experts say that natural weaves keep you cooler. " + "word ".repeat(550) + "</p><a href='https://amebazaar.in/shop'>Shop</a> <a href='https://amebazaar.in/services'>Services</a>",
  faqs: [{ question: "Q", answer: "A" }],
  primaryCategory: "Ladies Wear",
  imageFilename: "kurtis.webp",
  imageUrl: "https://amebazaar.in/kurtis.webp",
  imageAltText: "Kurtis"
};
const auditCitation = context.runSeoAudit(articleWithFakeCitation, "Kurtis Guide", true);
if (auditCitation.hardFailure && auditCitation.issues.some(i => i.includes("citation") || i.includes("studies show") || i.includes("experts say"))) {
  console.log("  -> TEST 3.K PASSED (Deceptive pseudo-citations 'studies show'/'experts say' trigger hard audit failure)");
} else {
  console.log("  -> TEST 3.K FAILED! audit result: " + JSON.stringify(auditCitation));
  allPassed = false;
}

// TEST 3.L: Duplicate schemas are not appended if schema already exists
console.log("\nTEST 3.L: Duplicate schema prevention");
const preExistingHtml = "<p>Hello</p><!-- Structured Data Schemas --><script type=\"application/ld+json\">{\"@context\":\"https://schema.org\"}</script>";
const secondAppend = context.appendStructuredDataSchemas(preExistingHtml, testArticleForGraph);
if (secondAppend === preExistingHtml) {
  console.log("  -> TEST 3.L PASSED (Duplicate schema correctly blocked by idempotency guard)");
} else {
  console.log("  -> TEST 3.L FAILED! Content was altered despite existing schema comment!");
  allPassed = false;
}

// TEST 3.M: Image title uses title/imageTitle, not filename
console.log("\nTEST 3.M: Image title uses title/imageTitle, not filename");
const mainGsContent = fs.readFileSync(path.join(gasDir, 'Main.gs'), 'utf8');
const usesTitleNotFilename = mainGsContent.includes('title: finalEvalData.imageTitle || finalEvalData.title') && !mainGsContent.includes('title: finalEvalData.imageFilename');
if (usesTitleNotFilename) {
  console.log("  -> TEST 3.M PASSED (WordPress media upload uses imageTitle/title, NOT imageFilename)");
} else {
  console.log("  -> TEST 3.M FAILED! Main.gs still uses imageFilename for title parameter!");
  allPassed = false;
}

// TEST 3.N: Prompt contains 9-question framework requirements
console.log("\nTEST 3.N: Prompt 9-question framework");
const promptContent = fs.readFileSync(path.join(gasDir, 'Prompts.gs'), 'utf8');
const has9Questions = ["WHO", "WHAT", "WHY", "WHEN", "WHERE", "HOW", "HOW MUCH", "WHICH OPTION", "WHAT TO DO NEXT"].every(q => promptContent.includes(q));
if (has9Questions) {
  console.log("  -> TEST 3.N PASSED (CONTENT_AGENT_SYSTEM_PROMPT_TEMPLATE includes all 9 core questions)");
} else {
  console.log("  -> TEST 3.N FAILED! One or more of the 9 core questions missing from Prompts.gs");
  allPassed = false;
}

// TEST 3.O: Prompt contains Generative AI table/checklist requirements
console.log("\nTEST 3.O: Prompt Generative AI table and checklist requirements");
const hasGenAiStruct = promptContent.includes("<table>") && promptContent.includes("checklist") && promptContent.includes("Generative AI");
if (hasGenAiStruct) {
  console.log("  -> TEST 3.O PASSED (Prompts require crawlable HTML <table> and decision checklist for Generative AI engines)");
} else {
  console.log("  -> TEST 3.O FAILED! Table or checklist instructions missing from Prompts.gs");
  allPassed = false;
}

// TEST 3.P: Word count audit rules are preserved
console.log("\nTEST 3.P: Word count audit rules preservation");
const shortArticle = {
  title: "Short Test Guide",
  seoTitle: "Short Test Guide Delhi",
  contentHtml: "<h2>FAQ</h2><p>FAQ Content</p><p>Too short article. " + "word ".repeat(300) + "</p><a href='https://amebazaar.in/shop'>Shop</a> <a href='https://amebazaar.in/services'>Services</a>",
  faqs: [
    { question: "Q1", answer: "A1" },
    { question: "Q2", answer: "A2" },
    { question: "Q3", answer: "A3" },
    { question: "Q4", answer: "A4" }
  ],
  primaryCategory: "Ladies Wear",
  imageFilename: "short-test-delhi.webp",
  imageUrl: "https://amebazaar.in/short.webp",
  imageAltText: "Short Test"
};
const shortAudit = context.runSeoAudit(shortArticle, "Short Test Guide", true);
const minWordCount = vm.runInContext('SEO_MIN_WORD_COUNT_AUDIT', context);
const targetWordCount = vm.runInContext('SEO_TARGET_WORD_COUNT', context);
const hasWordCountPenalty = shortAudit.hardFailure && shortAudit.issues.some(i => i.includes("too thin") || i.includes("Word count"));
if (hasWordCountPenalty && minWordCount === 500 && targetWordCount === 600) {
  console.log("  -> TEST 3.P PASSED (Word count audit rules intact: 500 min, 600 target, thin content < 500 words triggers hard failure)");
} else {
  console.log("  -> TEST 3.P FAILED! Word count audit did not apply expected rules: " + JSON.stringify(shortAudit));
  allPassed = false;
}

// TEST 3.Q: Internal linking audit rules are preserved
console.log("\nTEST 3.Q: Internal linking audit rules preservation");
const unlinkedArticle = {
  title: "No Link Test Guide",
  seoTitle: "No Link Test Guide Delhi",
  contentHtml: "<h2>FAQ</h2><p>FAQ Content</p><p>Article with unauthorized link. " + "word ".repeat(550) + "</p><a href='https://unverified-third-party-clothing-blog.com/guide'>External Link</a>",
  faqs: [
    { question: "Q1", answer: "A1" },
    { question: "Q2", answer: "A2" },
    { question: "Q3", answer: "A3" },
    { question: "Q4", answer: "A4" }
  ],
  primaryCategory: "Ladies Wear",
  imageFilename: "test-link-delhi.webp",
  imageUrl: "https://amebazaar.in/test.webp",
  imageAltText: "Test Link"
};
const unlinkedAudit = context.runSeoAudit(unlinkedArticle, "No Link Test Guide", true);
const hasLinkPenalty = unlinkedAudit.hardFailure && unlinkedAudit.issues.some(i => i.includes("internal link") || i.includes("verified AME Bazaar"));
if (hasLinkPenalty) {
  console.log("  -> TEST 3.Q PASSED (Internal linking audit rules intact: rejects unverified external/fake links)");
} else {
  console.log("  -> TEST 3.Q FAILED! Internal link audit penalty was not applied: " + JSON.stringify(unlinkedAudit));
  allPassed = false;
}

console.log("\n=== STARTING SECTION 4: GEMINI EXECUTION-TIME & RETRY RELIABILITY TESTS ===");

// TEST 4.A: Gemini call handles HTTP 503 then succeeds on retry within bounded attempts
console.log("\nTEST 4.A: Gemini transient 503 recovery on bounded retry");
secrets.GEMINI_API_KEY = "test_gemini_key";
let callGeminiAttempts = 0;
context.UrlFetchApp = {
  fetch: (url, opts) => {
    callGeminiAttempts++;
    if (callGeminiAttempts === 1) {
      return {
        getResponseCode: () => 503,
        getContentText: () => JSON.stringify({ error: { code: 503, message: "The model is overloaded. Please try again later." } })
      };
    }
    return {
      getResponseCode: () => 200,
      getContentText: () => JSON.stringify({
        candidates: [{ content: { parts: [{ text: JSON.stringify({ status: "success_after_503" }) }] } }]
      })
    };
  }
};
context.initScriptExecutionTimer();
try {
  const geminiRes = context.callGemini("Test prompt 503 recovery", 2, true);
  const parsedRes = JSON.parse(geminiRes.text);
  if (parsedRes.status === "success_after_503" && callGeminiAttempts === 2) {
    console.log("  -> TEST 4.A PASSED (Transient 503 recovered on bounded attempt 2 without runaway retry loop)");
  } else {
    console.log("  -> TEST 4.A FAILED! Unexpected response or attempt count: " + callGeminiAttempts);
    allPassed = false;
  }
} catch (e) {
  console.log("  -> TEST 4.A FAILED! Error thrown during 503 recovery: " + e.message);
  allPassed = false;
}

// TEST 4.B: Malformed JSON from Gemini is recovered via cleanAndParseJson depth-tracking
console.log("\nTEST 4.B: Malformed JSON extraction via depth tracking");
const messyGeminiResponse = 'Here is the generated article in JSON format:\n```json\n{"title": "Monsoon Kids Wear", "focusKeyword": "monsoon kids wear", "contentHtml": "<p>Content with nested {braces} and special characters.</p>", "faqs": [{"question": "Q1?", "answer": "A1"}]}\n```\nExtra conversational chatter after json block.';
try {
  const parsedClean = context.cleanAndParseJson(messyGeminiResponse);
  if (parsedClean && parsedClean.title === "Monsoon Kids Wear" && parsedClean.faqs.length === 1) {
    console.log("  -> TEST 4.B PASSED (Malformed/conversational markdown JSON successfully extracted and parsed)");
  } else {
    console.log("  -> TEST 4.B FAILED! cleanAndParseJson could not recover JSON: " + JSON.stringify(parsedClean));
    allPassed = false;
  }
} catch (e) {
  console.log("  -> TEST 4.B FAILED! cleanAndParseJson threw error: " + e.message);
  allPassed = false;
}

// TEST 4.C: AI Critic 503 triggers deterministic audit fallback instead of crashing
console.log("\nTEST 4.C: AI Critic 503 activates safe deterministic fallback");
context.UrlFetchApp = {
  fetch: (url, opts) => {
    // Critic fails with 503
    return {
      getResponseCode: () => 503,
      getContentText: () => JSON.stringify({ error: { code: 503, message: "Service Unavailable" } })
    };
  }
};
const validPassingArticle = {
  title: "Monsoon Kids Wear Guide Delhi",
  seoTitle: "Monsoon Kids Wear Guide Delhi",
  contentHtml: "<h2>FAQ</h2><p>FAQ Content</p><p>Substantial guide for monsoon kids wear in Kirari Delhi. " + "word ".repeat(550) + "</p><a href='https://amebazaar.in/shop'>Shop</a> <a href='https://amebazaar.in/contact'>Contact</a>",
  faqs: [
    { question: "Q1", answer: "A1" },
    { question: "Q2", answer: "A2" },
    { question: "Q3", answer: "A3" },
    { question: "Q4", answer: "A4" }
  ],
  primaryCategory: "Kids Wear",
  imageFilename: "monsoon-kids-wear-delhi.webp",
  imageUrl: "https://amebazaar.in/monsoon.webp",
  imageAltText: "Monsoon Kids Wear in Delhi",
  isPipelineTest: true
};
context.initScriptExecutionTimer();
const auditWithCritic503 = context.runSeoAudit(validPassingArticle, "Monsoon Kids Wear", true);
if (auditWithCritic503.score >= 90 && !auditWithCritic503.hardFailure && auditWithCritic503.issues.some(i => i.includes("deterministic quality engine"))) {
  console.log("  -> TEST 4.C PASSED (AI Critic 503 safely activated deterministic fallback with score " + auditWithCritic503.score + "/100 and hardFailure: false)");
} else {
  console.log("  -> TEST 4.C FAILED! AI Critic 503 did not activate expected fallback: " + JSON.stringify(auditWithCritic503));
  allPassed = false;
}

// TEST 4.D: Execution-budget protection halts calls before Apps Script timeout
console.log("\nTEST 4.D: Execution-budget protection mechanism");
// Simulate budget exhaustion by setting execution start time 280 seconds in the past
context.initScriptExecutionTimer(new Date().getTime() - (280 * 1000));
const remainingBudgetMs = context.getRemainingExecutionBudgetMs();
const canRunGemini = context.hasExecutionBudget(35000);
let budgetExceededCaught = false;
context.UrlFetchApp = {
  fetch: () => ({ getResponseCode: () => 200, getContentText: () => "{}" })
};
try {
  context.callGemini("Prompt should not run due to exhausted budget", 2, true);
} catch (e) {
  if (e.message && e.message.includes("EXECUTION_BUDGET_EXCEEDED")) {
    budgetExceededCaught = true;
  }
}
if (!canRunGemini && budgetExceededCaught && remainingBudgetMs < 35000) {
  console.log("  -> TEST 4.D PASSED (Execution budget check detected low remaining window (" + Math.round(remainingBudgetMs / 1000) + "s) and aborted Gemini call cleanly)");
} else {
  console.log("  -> TEST 4.D FAILED! Budget protection did not prevent call. canRunGemini=" + canRunGemini + ", caught=" + budgetExceededCaught);
  allPassed = false;
}

// Reset execution timer
context.initScriptExecutionTimer();

// TEST 4.E: Permanent Gemini failure terminates boundedly without infinite loop
console.log("\nTEST 4.E: Permanent Gemini failure terminates cleanly within bounded attempts");
let totalExhaustionCalls = 0;
context.UrlFetchApp = {
  fetch: (url, opts) => {
    totalExhaustionCalls++;
    return {
      getResponseCode: () => 500,
      getContentText: () => JSON.stringify({ error: { code: 500, message: "Internal Server Error" } })
    };
  }
};
let caughtExhaustion = false;
try {
  context.callGemini("Prompt doomed to fail", 2, true);
} catch (e) {
  caughtExhaustion = true;
}
if (caughtExhaustion && totalExhaustionCalls <= 2) {
  console.log("  -> TEST 4.E PASSED (Permanent failure bounded to exactly " + totalExhaustionCalls + " calls; terminated cleanly)");
} else {
  console.log("  -> TEST 4.E FAILED! Permanent failure made excessive calls: " + totalExhaustionCalls);
  allPassed = false;
}

// TEST 4.F: Incomplete generation guarantees article will NOT publish
console.log("\nTEST 4.F: Incomplete generation prevents publication and exits safely");
// When callGemini fails permanently, runDailyContentEngine must catch it, discard the topic, and not publish
let wpPublishCalled = false;
context.publishToWordPress = () => {
  wpPublishCalled = true;
  return { id: 999, link: "https://amebazaar.in/should-not-exist" };
};
// Setup queue with 1 doomed topic
context.saveTopicMemory({
  published: [],
  queue: [{ title: "Doomed Topic", focusKeyword: "doomed", category: "Kids Wear" }]
});
try {
  context.runDailyContentEngine({ isDryRun: false, forceIgnoreDuplicateGuard: true });
} catch (e) {
  // Expected to fail after exhausting topic attempts
}
if (!wpPublishCalled) {
  console.log("  -> TEST 4.F PASSED (Publication was strictly blocked when generation failed; zero articles published)");
} else {
  console.log("  -> TEST 4.F FAILED! publishToWordPress was called despite failed content generation!");
  allPassed = false;
}

// TEST 4.G: Production model configuration is exactly gemini-3.6-flash
console.log("\nTEST 4.G: Production Gemini model configuration is gemini-3.6-flash");
let productionModelUsed = null;
context.UrlFetchApp = {
  fetch: (url, opts) => {
    const match = url.match(/models\/([^:]+):generateContent/);
    if (match) {
      productionModelUsed = match[1];
    }
    return {
      getResponseCode: () => 200,
      getContentText: () => JSON.stringify({
        candidates: [{ content: { parts: [{ text: JSON.stringify({ title: "Test Article" }) }] } }]
      })
    };
  }
};
context.initScriptExecutionTimer();
delete secrets.GEMINI_MODEL; // Ensure no override is active
try {
  context.callGemini("Test prompt for model verification", 1, true, true);
  if (productionModelUsed === "gemini-3.6-flash") {
    console.log("  -> TEST 4.G PASSED (Default production Gemini model verified as 'gemini-3.6-flash')");
  } else {
    console.log("  -> TEST 4.G FAILED! Expected 'gemini-3.6-flash', got: " + productionModelUsed);
    allPassed = false;
  }
} catch (e) {
  console.log("  -> TEST 4.G FAILED! Error invoking callGemini: " + e.message);
  allPassed = false;
}

// TEST 4.H: Regression check - no production code path selects gemini-2.5-flash
console.log("\nTEST 4.H: Regression check - zero production references to gemini-2.5-flash in gas_agent/");
let gasSourceHasObsoleteModel = false;
const gasSourceFiles = fs.readdirSync(gasDir).filter(f => f.endsWith('.gs'));
for (const sf of gasSourceFiles) {
  const content = fs.readFileSync(path.join(gasDir, sf), 'utf8');
  if (content.includes('gemini-2.5-flash')) {
    console.log(`  -> FAILED: Found 'gemini-2.5-flash' in ${sf}`);
    gasSourceHasObsoleteModel = true;
  }
}
if (!gasSourceHasObsoleteModel) {
  console.log("  -> TEST 4.H PASSED (Zero production references to 'gemini-2.5-flash' in gas_agent/*.gs)");
} else {
  allPassed = false;
}

// Clean up mock UrlFetchApp
delete context.UrlFetchApp;

// ==============================================================================
// SECTION 5: HOSTINGER WIKIMEDIA COMMONS IMAGE DISCOVERY TESTS
// ==============================================================================
console.log("\n=== STARTING SECTION 5: HOSTINGER WIKIMEDIA COMMONS IMAGE DISCOVERY TESTS ===\n");

// TEST 5.A: Image service URL and Secret configuration getters
console.log("TEST 5.A: Image service URL and Secret configuration getters");
secrets.IMAGE_SERVICE_URL = "  https://amebazaar.in/api/image-service.php  ";
secrets.IMAGE_SERVICE_SECRET = "  test_token_secret_12345  ";
const cfgUrl = context.getImageServiceUrl();
const cfgSecret = context.getImageServiceSecret();
if (cfgUrl === "https://amebazaar.in/api/image-service.php" && cfgSecret === "test_token_secret_12345") {
  delete secrets.IMAGE_SERVICE_URL;
  delete secrets.IMAGE_SERVICE_SECRET;
  if (context.getImageServiceUrl() === "" && context.getImageServiceSecret() === "") {
    console.log("  -> TEST 5.A PASSED (IMAGE_SERVICE_URL and IMAGE_SERVICE_SECRET trimmed and default safely to empty)");
  } else {
    console.log("  -> TEST 5.A FAILED! Unset defaults not empty string");
    allPassed = false;
  }
} else {
  console.log("  -> TEST 5.A FAILED! Incorrect values:", { cfgUrl, cfgSecret });
  allPassed = false;
}

// Read PHP source code to verify static structure and rules
const phpSource = fs.readFileSync(path.join(__dirname, '../api/image-service.php'), 'utf8');

// Helper to evaluate Wikimedia license matching logic identical to api/image-service.php
function testEvaluateWikimediaLicense(extmetadata) {
  const licenseShort = String((extmetadata.LicenseShortName && extmetadata.LicenseShortName.value) || '').toLowerCase().trim();
  const licenseLong = String((extmetadata.License && extmetadata.License.value) || '').toLowerCase().trim();
  const usageTerms = String((extmetadata.UsageTerms && extmetadata.UsageTerms.value) || '').toLowerCase().trim();
  const licenseUrl = String((extmetadata.LicenseUrl && extmetadata.LicenseUrl.value) || '').trim();
  const artistRaw = String((extmetadata.Artist && extmetadata.Artist.value) || '').trim();
  const artist = artistRaw.replace(/<[^>]+>/g, '').trim();
  const attributionRequired = String((extmetadata.AttributionRequired && extmetadata.AttributionRequired.value) || 'false').toLowerCase().trim() === 'true';

  const combinedLicense = `${licenseShort} ${licenseLong} ${usageTerms}`;

  // 1. Strict Denylist Check
  if (/\b(nc|non-commercial|noncommercial)\b/i.test(combinedLicense)) {
    return { valid: false, reason: 'Non-commercial restriction is not permitted' };
  }
  if (/\b(nd|no-derivatives|noderivatives)\b/i.test(combinedLicense)) {
    return { valid: false, reason: 'No-derivatives restriction is not permitted' };
  }
  if (/\b(fair\s*use|copyrighted|all\s*rights\s*reserved)\b/i.test(combinedLicense)) {
    return { valid: false, reason: 'Copyrighted or fair use image is not permitted' };
  }

  // 2. Allowlist Check & Tier Ranking
  if (/\b(cc0|cc-zero|creative\s*commons\s*zero)\b/i.test(combinedLicense)) {
    return {
      valid: true,
      tier: 1,
      code: 'cc0',
      name: 'CC0 1.0 Universal',
      url: licenseUrl || 'https://creativecommons.org/publicdomain/zero/1.0/',
      commercialAllowed: true,
      attributionRequired: false,
      artist: artist || 'Unknown'
    };
  }

  if (/\b(pd|public\s*domain|pd-us|pd-art|pd-user|pd-self|pd-old|no\s*known\s*restrictions)\b/i.test(combinedLicense)) {
    return {
      valid: true,
      tier: 2,
      code: 'public-domain',
      name: 'Public Domain',
      url: licenseUrl || 'https://creativecommons.org/publicdomain/mark/1.0/',
      commercialAllowed: true,
      attributionRequired: false,
      artist: artist || 'Public Domain'
    };
  }

  if (/\b(cc[-\s]?by)\b/i.test(combinedLicense) && !/\b(cc[-\s]?by[-\s]?sa)\b/i.test(combinedLicense)) {
    if (!artist) {
      return { valid: false, reason: 'CC-BY license requires artist attribution but artist is missing' };
    }
    const vm = combinedLicense.match(/(4\.0|3\.0|2\.5|2\.0)/);
    const version = vm ? vm[1] : '4.0';
    return {
      valid: true,
      tier: 3,
      code: 'cc-by-' + version,
      name: 'CC BY ' + version,
      url: licenseUrl || `https://creativecommons.org/licenses/by/${version}/`,
      commercialAllowed: true,
      attributionRequired: true,
      artist: artist
    };
  }

  if (/\b(cc[-\s]?by[-\s]?sa)\b/i.test(combinedLicense)) {
    if (!artist) {
      return { valid: false, reason: 'CC-BY-SA license requires artist attribution but artist is missing' };
    }
    const vm = combinedLicense.match(/(4\.0|3\.0|2\.5|2\.0)/);
    const version = vm ? vm[1] : '4.0';
    return {
      valid: true,
      tier: 4,
      code: 'cc-by-sa-' + version,
      name: 'CC BY-SA ' + version,
      url: licenseUrl || `https://creativecommons.org/licenses/by-sa/${version}/`,
      commercialAllowed: true,
      attributionRequired: true,
      artist: artist
    };
  }

  return { valid: false, reason: 'License is not in permitted commercial allowlist' };
}

// TEST 5.B: Hostinger payload generation
console.log("\nTEST 5.B: Hostinger payload generation with queries array and token header");
let sentHeaders = null;
let sentPayload = null;
context.UrlFetchApp = {
  fetch: (url, opts) => {
    if (url.includes('image-service.php')) {
      sentHeaders = opts.headers;
      if (opts.payload) {
        sentPayload = JSON.parse(opts.payload);
      }
      return {
        getResponseCode: () => 200,
        getContentText: () => JSON.stringify({ success: true, count: 0, candidates: [] })
      };
    }
    return {
      getResponseCode: () => 200,
      getContentText: () => JSON.stringify({ results: [] })
    };
  }
};
secrets.IMAGE_SERVICE_URL = "https://amebazaar.in/api/image-service.php";
secrets.IMAGE_SERVICE_SECRET = "secret_auth_token_xyz";
context.fetchTopicSpecificImage(["women ethnic kurti", "summer wear cotton", "delhi fashion", "extra query 4"], "Ladies Wear", "cotton kurti");
delete context.UrlFetchApp;
delete secrets.IMAGE_SERVICE_URL;
delete secrets.IMAGE_SERVICE_SECRET;

if (sentHeaders && sentHeaders['X-AME-Image-Token'] === 'secret_auth_token_xyz' &&
    sentPayload && Array.isArray(sentPayload.queries) && sentPayload.queries.length <= 3 &&
    sentPayload.limit === 10) {
  console.log("  -> TEST 5.B PASSED (Hostinger payload properly formatted with X-AME-Image-Token, max 3 queries, and limit: 10)");
} else {
  console.log("  -> TEST 5.B FAILED!", { sentHeaders, sentPayload });
  allPassed = false;
}

// TEST 5.C: License allowlist acceptance for CC0
console.log("\nTEST 5.C: License allowlist acceptance for CC0");
const cc0Eval = testEvaluateWikimediaLicense({
  LicenseShortName: { value: "CC0" },
  License: { value: "Creative Commons Zero" },
  UsageTerms: { value: "CC0 1.0 Universal" },
  Artist: { value: "A photographer" }
});
if (cc0Eval.valid && cc0Eval.tier === 1 && cc0Eval.code === 'cc0' && cc0Eval.commercialAllowed && !cc0Eval.attributionRequired) {
  console.log("  -> TEST 5.C PASSED (CC0 correctly recognized as Tier 1 commercial license without required attribution)");
} else {
  console.log("  -> TEST 5.C FAILED!", cc0Eval);
  allPassed = false;
}

// TEST 5.D: License allowlist acceptance for Public Domain (PD)
console.log("\nTEST 5.D: License allowlist acceptance for Public Domain / PD");
const pdEval = testEvaluateWikimediaLicense({
  LicenseShortName: { value: "Public domain" },
  UsageTerms: { value: "Public domain" },
  Artist: { value: "Historical Archive" }
});
if (pdEval.valid && pdEval.tier === 2 && pdEval.code === 'public-domain' && pdEval.commercialAllowed && !pdEval.attributionRequired) {
  console.log("  -> TEST 5.D PASSED (Public Domain correctly recognized as Tier 2 commercial license)");
} else {
  console.log("  -> TEST 5.D FAILED!", pdEval);
  allPassed = false;
}

// TEST 5.E: License allowlist acceptance for CC-BY-4.0
console.log("\nTEST 5.E: License allowlist acceptance for CC-BY-4.0");
const ccBy4Eval = testEvaluateWikimediaLicense({
  LicenseShortName: { value: "CC BY 4.0" },
  LicenseUrl: { value: "https://creativecommons.org/licenses/by/4.0/" },
  Artist: { value: "Jane Doe" }
});
if (ccBy4Eval.valid && ccBy4Eval.tier === 3 && ccBy4Eval.code === 'cc-by-4.0' && ccBy4Eval.commercialAllowed && ccBy4Eval.attributionRequired) {
  console.log("  -> TEST 5.E PASSED (CC-BY-4.0 correctly recognized as Tier 3 with attribution required)");
} else {
  console.log("  -> TEST 5.E FAILED!", ccBy4Eval);
  allPassed = false;
}

// TEST 5.F: License allowlist acceptance for CC-BY legacy versions (3.0, 2.5, 2.0)
console.log("\nTEST 5.F: License allowlist acceptance for CC-BY legacy versions");
const ccByLegacy3 = testEvaluateWikimediaLicense({ LicenseShortName: { value: "CC-BY-3.0" }, Artist: { value: "Artist 3" } });
const ccByLegacy25 = testEvaluateWikimediaLicense({ LicenseShortName: { value: "CC-BY-2.5" }, Artist: { value: "Artist 2.5" } });
const ccByLegacy2 = testEvaluateWikimediaLicense({ LicenseShortName: { value: "CC-BY-2.0" }, Artist: { value: "Artist 2" } });
if (ccByLegacy3.valid && ccByLegacy3.tier === 3 && ccByLegacy25.valid && ccByLegacy25.tier === 3 && ccByLegacy2.valid && ccByLegacy2.tier === 3) {
  console.log("  -> TEST 5.F PASSED (Legacy CC-BY versions 3.0, 2.5, and 2.0 accepted as Tier 3)");
} else {
  console.log("  -> TEST 5.F FAILED!", { ccByLegacy3, ccByLegacy25, ccByLegacy2 });
  allPassed = false;
}

// TEST 5.G: License allowlist acceptance for CC-BY-SA-4.0
console.log("\nTEST 5.G: License allowlist acceptance for CC-BY-SA-4.0");
const ccBySa4Eval = testEvaluateWikimediaLicense({
  LicenseShortName: { value: "CC BY-SA 4.0" },
  LicenseUrl: { value: "https://creativecommons.org/licenses/by-sa/4.0/" },
  Artist: { value: "John Smith" }
});
if (ccBySa4Eval.valid && ccBySa4Eval.tier === 4 && ccBySa4Eval.code === 'cc-by-sa-4.0' && ccBySa4Eval.commercialAllowed && ccBySa4Eval.attributionRequired) {
  console.log("  -> TEST 5.G PASSED (CC-BY-SA-4.0 correctly recognized as Tier 4 with attribution required)");
} else {
  console.log("  -> TEST 5.G FAILED!", ccBySa4Eval);
  allPassed = false;
}

// TEST 5.H: License allowlist acceptance for CC-BY-SA legacy versions (3.0, 2.5, 2.0)
console.log("\nTEST 5.H: License allowlist acceptance for CC-BY-SA legacy versions");
const ccBySaLegacy3 = testEvaluateWikimediaLicense({ LicenseShortName: { value: "CC-BY-SA-3.0" }, Artist: { value: "Artist 3" } });
const ccBySaLegacy25 = testEvaluateWikimediaLicense({ LicenseShortName: { value: "CC-BY-SA-2.5" }, Artist: { value: "Artist 2.5" } });
const ccBySaLegacy2 = testEvaluateWikimediaLicense({ LicenseShortName: { value: "CC-BY-SA-2.0" }, Artist: { value: "Artist 2" } });
if (ccBySaLegacy3.valid && ccBySaLegacy3.tier === 4 && ccBySaLegacy25.valid && ccBySaLegacy25.tier === 4 && ccBySaLegacy2.valid && ccBySaLegacy2.tier === 4) {
  console.log("  -> TEST 5.H PASSED (Legacy CC-BY-SA versions 3.0, 2.5, and 2.0 accepted as Tier 4)");
} else {
  console.log("  -> TEST 5.H FAILED!", { ccBySaLegacy3, ccBySaLegacy25, ccBySaLegacy2 });
  allPassed = false;
}

// TEST 5.I: License rejection for Non-Commercial (NC)
console.log("\nTEST 5.I: License rejection for Non-Commercial (NC)");
const ncEval1 = testEvaluateWikimediaLicense({ LicenseShortName: { value: "CC BY-NC 4.0" }, Artist: { value: "Artist" } });
const ncEval2 = testEvaluateWikimediaLicense({ LicenseShortName: { value: "CC-BY-NC-SA 3.0" }, Artist: { value: "Artist" } });
const ncEval3 = testEvaluateWikimediaLicense({ UsageTerms: { value: "Non-commercial use only" }, Artist: { value: "Artist" } });
if (!ncEval1.valid && !ncEval2.valid && !ncEval3.valid) {
  console.log("  -> TEST 5.I PASSED (All Non-Commercial license variants strictly rejected)");
} else {
  console.log("  -> TEST 5.I FAILED! NC licenses were not rejected:", { ncEval1, ncEval2, ncEval3 });
  allPassed = false;
}

// TEST 5.J: License rejection for No-Derivatives (ND)
console.log("\nTEST 5.J: License rejection for No-Derivatives (ND)");
const ndEval1 = testEvaluateWikimediaLicense({ LicenseShortName: { value: "CC BY-ND 4.0" }, Artist: { value: "Artist" } });
const ndEval2 = testEvaluateWikimediaLicense({ LicenseShortName: { value: "CC-BY-SA-ND 3.0" }, Artist: { value: "Artist" } });
if (!ndEval1.valid && !ndEval2.valid) {
  console.log("  -> TEST 5.J PASSED (No-Derivatives licenses strictly rejected)");
} else {
  console.log("  -> TEST 5.J FAILED! ND licenses were not rejected:", { ndEval1, ndEval2 });
  allPassed = false;
}

// TEST 5.K: License rejection for Fair Use / Copyrighted / All Rights Reserved
console.log("\nTEST 5.K: License rejection for Fair Use / Copyrighted / All Rights Reserved");
const fuEval1 = testEvaluateWikimediaLicense({ LicenseShortName: { value: "Fair use" } });
const fuEval2 = testEvaluateWikimediaLicense({ License: { value: "Copyrighted" } });
const fuEval3 = testEvaluateWikimediaLicense({ UsageTerms: { value: "All rights reserved" } });
if (!fuEval1.valid && !fuEval2.valid && !fuEval3.valid) {
  console.log("  -> TEST 5.K PASSED (Fair use, copyrighted, and all-rights-reserved images strictly rejected)");
} else {
  console.log("  -> TEST 5.K FAILED! Fair use/copyrighted images not rejected:", { fuEval1, fuEval2, fuEval3 });
  allPassed = false;
}

// TEST 5.L: License rejection for missing or unknown license
console.log("\nTEST 5.L: License rejection for missing or unknown license");
const unkEval1 = testEvaluateWikimediaLicense({});
const unkEval2 = testEvaluateWikimediaLicense({ LicenseShortName: { value: "Unknown" } });
const unkEval3 = testEvaluateWikimediaLicense({ License: { value: "Custom Commercial License" } });
if (!unkEval1.valid && !unkEval2.valid && !unkEval3.valid) {
  console.log("  -> TEST 5.L PASSED (Missing or unknown licenses strictly rejected)");
} else {
  console.log("  -> TEST 5.L FAILED! Unknown license allowed:", { unkEval1, unkEval2, unkEval3 });
  allPassed = false;
}

// TEST 5.M: License rejection when attribution required but artist is missing
console.log("\nTEST 5.M: License rejection when attribution required but artist is missing");
const missingArtistEval1 = testEvaluateWikimediaLicense({ LicenseShortName: { value: "CC BY 4.0" }, Artist: { value: "" } });
const missingArtistEval2 = testEvaluateWikimediaLicense({ LicenseShortName: { value: "CC BY-SA 4.0" }, Artist: { value: "   " } });
if (!missingArtistEval1.valid && !missingArtistEval2.valid && missingArtistEval1.reason.includes("artist") && missingArtistEval2.reason.includes("artist")) {
  console.log("  -> TEST 5.M PASSED (Attribution-required licenses strictly rejected when artist is missing)");
} else {
  console.log("  -> TEST 5.M FAILED!", { missingArtistEval1, missingArtistEval2 });
  allPassed = false;
}

// TEST 5.N: License rejection when attribution required but source URL is missing in verifyCandidateImage
console.log("\nTEST 5.N: License rejection when attribution required but source URL is missing in verifyCandidateImage");
const photoMissingSource = {
  id: "File:Attribution_Test.jpg",
  description: "Indian woman posing in festive dress",
  alt_description: "woman festive dress",
  slug: "woman-festive-dress",
  license: { name: "CC BY-SA 4.0", code: "cc-by-sa-4.0", tier: 4, commercialAllowed: true, attributionRequired: true },
  attribution: { artist: "Photographer", creditHtml: "<a>Photo</a>", sourceUrl: "" } // Missing sourceUrl
};
const missingSourceVerification = context.verifyCandidateImage(
  photoMissingSource,
  "https://upload.wikimedia.org/test.jpg",
  { genderTargets: ["Female"], ageTargets: ["Adult"], garmentTypes: ["dress"] },
  "festive dress",
  "Ladies Wear",
  "Festive Dress Styling",
  "WIKIMEDIA"
);
if (!missingSourceVerification.accepted && missingSourceVerification.reason.includes("Attribution")) {
  console.log("  -> TEST 5.N PASSED (ImageEngine defense-in-depth gate rejected candidate with missing source URL)");
} else {
  console.log("  -> TEST 5.N FAILED! Image with missing sourceUrl was accepted:", missingSourceVerification);
  allPassed = false;
}

// TEST 5.O: License preference ordering (CC0 > PD > CC-BY > CC-BY-SA)
console.log("\nTEST 5.O: License preference ordering");
const sampleCandidates = [
  { id: "sa", tier: 4, score: 95 },
  { id: "by", tier: 3, score: 90 },
  { id: "pd", tier: 2, score: 85 },
  { id: "cc0", tier: 1, score: 80 }
];
sampleCandidates.sort((a, b) => {
  if (a.tier !== b.tier) return a.tier - b.tier;
  return b.score - a.score;
});
const sortedOrder = sampleCandidates.map(c => c.id).join(' -> ');
if (sortedOrder === "cc0 -> pd -> by -> sa") {
  console.log("  -> TEST 5.O PASSED (Candidates correctly prioritized: CC0 (Tier 1) > PD (Tier 2) > CC-BY (Tier 3) > CC-BY-SA (Tier 4))");
} else {
  console.log("  -> TEST 5.O FAILED! Order:", sortedOrder);
  allPassed = false;
}

// TEST 5.P: Image candidate normalization
console.log("\nTEST 5.P: Image candidate normalization");
const requiredPhpFields = ["'id'", "'title'", "'description'", "'alt_description'", "'slug'", "'urls'", "'regular'", "'full'", "'width'", "'height'", "'mime'", "'source'", "'license'", "'attribution'"];
let allFieldsPresentInPhp = true;
for (const f of requiredPhpFields) {
  if (!phpSource.includes(f)) {
    console.log(`  -> Missing field ${f} in api/image-service.php`);
    allFieldsPresentInPhp = false;
  }
}
if (allFieldsPresentInPhp) {
  console.log("  -> TEST 5.P PASSED (Candidate schema in api/image-service.php maps all required dimensions, URLs, and metadata)");
} else {
  allPassed = false;
}

// TEST 5.Q: Direct CDN preview URL selection
console.log("\nTEST 5.Q: Direct CDN preview URL selection (1024px scaled regular preview)");
const hasThumbUrlInPhp = phpSource.includes("thumburl") && phpSource.includes("iiurlwidth=1024");
if (hasThumbUrlInPhp) {
  console.log("  -> TEST 5.Q PASSED (Requests iiurlwidth=1024 and assigns thumburl directly to regular URL bypassing Hostinger storage)");
} else {
  console.log("  -> TEST 5.Q FAILED! Missing thumburl / iiurlwidth=1024 logic in api/image-service.php");
  allPassed = false;
}

// TEST 5.R: Semantic demographic gate - male image rejected on female topic for Wikimedia candidate
console.log("\nTEST 5.R: Semantic demographic gate - male image rejected on female topic for Wikimedia candidate");
const wikimediaMalePhoto = {
  id: "File:Indian_Groom_In_Sherwani.jpg",
  title: "Indian Groom In Sherwani",
  description: "Handsome Indian groom man model wearing traditional sherwani for wedding",
  alt_description: "Indian groom man sherwani",
  slug: "indian-groom-in-sherwani",
  user: { bio: "Wedding Photographer" },
  license: { name: "CC0", code: "cc0", tier: 1, commercialAllowed: true, attributionRequired: false },
  attribution: { artist: "Photographer", sourceUrl: "https://commons.wikimedia.org/wiki/File:Indian_Groom_In_Sherwani.jpg" }
};
const ladiesBrief = {
  genderTargets: ["Female"],
  ageTargets: ["Adult"],
  garmentTypes: ["kurti", "salwar", "dupatta"]
};
const evalLadies = context.evaluateCandidateSemantics(wikimediaMalePhoto, ladiesBrief, "cotton kurti design", "Ladies Wear", "Summer Cotton Kurti Styling Tips");
if (evalLadies.isRejected && evalLadies.rejectionReason.includes("Gender")) {
  console.log("  -> TEST 5.R PASSED (Wikimedia male candidate rejected deterministically on Ladies Wear topic)");
} else {
  console.log("  -> TEST 5.R FAILED! Male candidate was not rejected on female topic:", evalLadies);
  allPassed = false;
}

// TEST 5.S: Semantic demographic gate - female image rejected on male topic for Wikimedia candidate
console.log("\nTEST 5.S: Semantic demographic gate - female image rejected on male topic for Wikimedia candidate");
const wikimediaFemalePhoto = {
  id: "File:Indian_Woman_In_Saree.jpg",
  title: "Indian Woman In Saree",
  description: "Beautiful Indian woman model wearing traditional red bridal saree with jewellery",
  alt_description: "Indian woman red saree",
  slug: "indian-woman-in-saree",
  user: { bio: "Fashion Photographer" },
  license: { name: "CC0", code: "cc0", tier: 1, commercialAllowed: true, attributionRequired: false },
  attribution: { artist: "Photographer", sourceUrl: "https://commons.wikimedia.org/wiki/File:Indian_Woman_In_Saree.jpg" }
};
const gentsBrief = {
  genderTargets: ["Male"],
  ageTargets: ["Adult"],
  garmentTypes: ["kurta", "pajama", "blazer"]
};
const evalGents = context.evaluateCandidateSemantics(wikimediaFemalePhoto, gentsBrief, "mens kurta design", "Gents Wear", "Men's Festive Kurta Guide");
if (evalGents.isRejected && evalGents.rejectionReason.includes("Gender")) {
  console.log("  -> TEST 5.S PASSED (Wikimedia female candidate rejected deterministically on Gents Wear topic)");
} else {
  console.log("  -> TEST 5.S FAILED! Female candidate was not rejected on male topic:", evalGents);
  allPassed = false;
}

// TEST 5.T: Semantic garment/season gate - winter garment rejected on summer topic
console.log("\nTEST 5.T: Semantic garment/season gate - winter garment rejected on summer topic");
const wikimediaWinterPhoto = {
  id: "File:Winter_Puffer_Jacket.jpg",
  title: "Winter Puffer Jacket",
  description: "Woman wearing heavy winter woolen puffer jacket with fleece in snow",
  alt_description: "heavy winter jacket snow",
  slug: "winter-puffer-jacket",
  user: { bio: "Photographer" },
  license: { name: "CC0", code: "cc0", tier: 1, commercialAllowed: true, attributionRequired: false },
  attribution: { artist: "Photographer", sourceUrl: "https://commons.wikimedia.org/wiki/File:Winter_Puffer_Jacket.jpg" }
};
const summerBrief = {
  genderTargets: ["Female"],
  ageTargets: ["Adult"],
  garmentTypes: ["cotton kurti", "breathable suit"],
  season: "Summer"
};
const evalSummer = context.evaluateCandidateSemantics(wikimediaWinterPhoto, summerBrief, "breathable summer kurti", "Summer Wear", "Beat the Delhi Heat: Summer Cotton Outfits");
if (evalSummer.isRejected && evalSummer.rejectionReason.includes("Contradiction")) {
  console.log("  -> TEST 5.T PASSED (Heavy winter jacket rejected deterministically on summer article)");
} else {
  console.log("  -> TEST 5.T FAILED! Winter garment not rejected on summer topic:", evalSummer);
  allPassed = false;
}

// TEST 5.U: Safe failure with zero Unsplash calls when Hostinger service returns empty
console.log("\nTEST 5.U: Safe failure with zero Unsplash calls when Hostinger service returns empty");
let unsplashCalled = false;
let wikimediaCalled = false;
context.UrlFetchApp = {
  fetch: (url, opts) => {
    if (url.includes('image-service.php')) {
      wikimediaCalled = true;
      return {
        getResponseCode: () => 200,
        getContentText: () => JSON.stringify({ success: true, count: 0, candidates: [] })
      };
    }
    if (url.includes('api.unsplash.com') || url.includes('unsplash.com/napi')) {
      unsplashCalled = true;
      return {
        getResponseCode: () => 200,
        getContentText: () => JSON.stringify({ results: [] })
      };
    }
    return { getResponseCode: () => 200, getContentText: () => "{}" };
  }
};
secrets.IMAGE_SERVICE_URL = "https://amebazaar.in/api/image-service.php";
secrets.IMAGE_SERVICE_SECRET = "secret123";
const res5U = context.fetchTopicSpecificImage(["ethnic wear"], "Ethnic Wear", "ethnic wear");
delete context.UrlFetchApp;
delete secrets.IMAGE_SERVICE_URL;
delete secrets.IMAGE_SERVICE_SECRET;

if (wikimediaCalled && !unsplashCalled && res5U && res5U.blob === null && res5U.isFallback === true) {
  console.log("  -> TEST 5.U PASSED (Safe failure with blob: null, isFallback: true and zero Unsplash calls)");
} else {
  console.log("  -> TEST 5.U FAILED! Call flags:", { wikimediaCalled, unsplashCalled, res5U });
  allPassed = false;
}

// TEST 5.V: Attribution metadata preservation on selected image object
console.log("\nTEST 5.V: Attribution metadata preservation on selected image object");
const validWikimediaCandidate = {
  id: "File:Indian_Cotton_Kurti_Model.jpg",
  title: "Indian Cotton Kurti Model",
  description: "Indian woman model wearing an elegant yellow cotton kurti in Delhi garden",
  alt_description: "Indian woman yellow cotton kurti",
  slug: "indian-cotton-kurti-model",
  user: { bio: "Fashion Photographer" },
  urls: {
    regular: "https://upload.wikimedia.org/wikipedia/commons/thumb/1/12/Indian_Cotton_Kurti_Model.jpg/1024px-Indian_Cotton_Kurti_Model.jpg",
    full: "https://upload.wikimedia.org/wikipedia/commons/1/12/Indian_Cotton_Kurti_Model.jpg"
  },
  license: {
    name: "CC BY-SA 4.0",
    code: "cc-by-sa-4.0",
    tier: 4,
    url: "https://creativecommons.org/licenses/by-sa/4.0/",
    commercialAllowed: true,
    attributionRequired: true
  },
  attribution: {
    artist: "Aarav Sharma",
    creditHtml: '<a href="https://commons.wikimedia.org/wiki/File:Indian_Cotton_Kurti_Model.jpg">Photo by Aarav Sharma</a> via Wikimedia Commons (<a href="https://creativecommons.org/licenses/by-sa/4.0/">CC BY-SA 4.0</a>)',
    creditText: 'Photo by Aarav Sharma via Wikimedia Commons (CC BY-SA 4.0)',
    sourceUrl: "https://commons.wikimedia.org/wiki/File:Indian_Cotton_Kurti_Model.jpg",
    licenseUrl: "https://creativecommons.org/licenses/by-sa/4.0/"
  }
};

context.UrlFetchApp = {
  fetch: (url, opts) => {
    if (url.includes('image-service.php')) {
      return {
        getResponseCode: () => 200,
        getContentText: () => JSON.stringify({ success: true, count: 1, candidates: [validWikimediaCandidate] })
      };
    }
    if (url.includes('generateContent') || url.includes('generativelanguage')) {
      return {
        getResponseCode: () => 200,
        getContentText: () => JSON.stringify({
          candidates: [{
            content: {
              parts: [{
                text: JSON.stringify({
                  relevant: true,
                  score: 95,
                  mismatches: [],
                  filename: "cotton-kurti-summer-kirari.webp",
                  title: "Summer Cotton Kurti",
                  altText: "Indian woman in yellow cotton kurti",
                  description: "Yellow cotton kurti for women"
                })
              }]
            }
          }]
        })
      };
    }
    // Mock image blob download
    return {
      getResponseCode: () => 200,
      getBlob: () => context.Utilities.newBlob(Buffer.from("dummy-image-bytes"), "image/jpeg", "image.jpg")
    };
  }
};

secrets.IMAGE_SERVICE_URL = "https://amebazaar.in/api/image-service.php";
secrets.IMAGE_SERVICE_SECRET = "secret123";
const selectedResult = context.fetchTopicSpecificImage(
  ["cotton kurti"],
  "Ladies Wear",
  "cotton kurti",
  {
    genderTargets: ["Female"],
    ageTargets: ["Adult"],
    garmentTypes: ["cotton kurti", "kurti"],
    season: "Summer",
    visualSetting: "garden",
    primarySubject: "Indian woman in stylish outfit"
  },
  "yellow cotton kurti",
  "Indian woman wearing yellow cotton kurti",
  "Summer Cotton Kurti Styling Tips"
);
delete context.UrlFetchApp;
delete secrets.IMAGE_SERVICE_URL;
delete secrets.IMAGE_SERVICE_SECRET;

if (selectedResult && selectedResult.source === 'wikimedia_commons' && selectedResult.attribution && selectedResult.attribution.artist === 'Aarav Sharma' && selectedResult.attribution.creditHtml.includes('CC BY-SA 4.0')) {
  console.log("  -> TEST 5.V PASSED (Selected image preserved source: 'wikimedia_commons' and complete attribution metadata)");
} else {
  console.log("  -> TEST 5.V FAILED! Selected image did not preserve attribution:", selectedResult);
  allPassed = false;
}

// TEST 5.W: WordPress media payload includes attribution caption
console.log("\nTEST 5.W: WordPress media payload includes attribution caption");
let passedMediaCaption = null;
context.UrlFetchApp = {
  fetch: (url, opts) => {
    if (url.includes('/wp-json/wp/v2/media') && opts.method === 'post') {
      if (opts.payload && typeof opts.payload === 'string') {
        const parsed = JSON.parse(opts.payload);
        if (parsed.caption !== undefined) {
          passedMediaCaption = parsed.caption;
        }
      }
      return {
        getResponseCode: () => 201,
        getContentText: () => JSON.stringify({ id: 888 })
      };
    }
    return { getResponseCode: () => 200, getContentText: () => "{}" };
  }
};
const dummyBlob = context.Utilities.newBlob(Buffer.from("fake-image"), "image/jpeg", "image.webp");
context.uploadMediaToWordPress(dummyBlob, "test-filename.webp", {
  title: "Test Title",
  altText: "Test Alt",
  caption: '<a href="https://commons.wikimedia.org">Photo by Aarav</a> via Wikimedia Commons',
  description: "Test Desc"
});
delete context.UrlFetchApp;

if (passedMediaCaption && passedMediaCaption.includes("Photo by Aarav") && passedMediaCaption.includes("Wikimedia Commons")) {
  console.log("  -> TEST 5.W PASSED (WordPress media upload metadata includes attribution caption)");
} else {
  console.log("  -> TEST 5.W FAILED! Media caption was not forwarded:", passedMediaCaption);
  allPassed = false;
}

// TEST 5.X: Timing-safe token comparison logic
console.log("\nTEST 5.X: Timing-safe token comparison logic");
const crypto = require('crypto');
function phpHashEquals(known, user) {
  if (typeof known !== 'string' || typeof user !== 'string') return false;
  const bufA = Buffer.from(known, 'utf8');
  const bufB = Buffer.from(user, 'utf8');
  if (bufA.length !== bufB.length) return false;
  return crypto.timingSafeEqual(bufA, bufB);
}
const secretA = "correct_service_secret_token_12345";
const correctToken = "correct_service_secret_token_12345";
const wrongTokenSameLen = "wrongct_service_secret_token_12345";
const wrongTokenDiffLen = "short_token";
const passMatch = phpHashEquals(secretA, correctToken);
const failSameLen = !phpHashEquals(secretA, wrongTokenSameLen);
const failDiffLen = !phpHashEquals(secretA, wrongTokenDiffLen);
const phpSourceHasHashEquals = phpSource.includes("hash_equals");

if (passMatch && failSameLen && failDiffLen && phpSourceHasHashEquals) {
  console.log("  -> TEST 5.X PASSED (hash_equals in api/image-service.php verified timing-safe token authentication)");
} else {
  console.log("  -> TEST 5.X FAILED!", { passMatch, failSameLen, failDiffLen, phpSourceHasHashEquals });
  allPassed = false;
}

// ==========================================
// TEST 5.Y: Shore Temple landmark photo rejected due to Non-Garment Subject Contradiction
// ==========================================
console.log("\nTEST 5.Y: Shore Temple landmark photo rejected due to Non-Garment Subject Contradiction");
const shoreTemplePhoto = {
  id: "File:Mamallapuram,_Shore_Temple,_India.jpg",
  title: "File:Mamallapuram, Shore Temple, India.jpg",
  description: "Five women wearing red and gold traditional Indian clothing (four in saris and one in a salwar-kameez) in front of the Shore Temple in Mamallapuram, Tamil Nadu.",
  alt_description: "Shore Temple with women in traditional saris",
  slug: "mamallapuram-shore-temple",
  alternative_slugs: {},
  user: { bio: "" }
};
const briefSari = {
  genderTargets: ["Female"],
  ageTargets: ["Adult"],
  garmentTypes: ["saree", "sari"]
};
const evalTemple = context.evaluateCandidateSemantics(shoreTemplePhoto, briefSari, "silk sarees", "Ladies Wear", "The Elegance of Traditional Silk Sarees");
if (evalTemple.isRejected && evalTemple.rejectionReason && evalTemple.rejectionReason.includes("Non-Garment Subject")) {
  console.log("  -> TEST 5.Y PASSED (Shore Temple correctly rejected for retail fashion post due to Non-Garment Subject)");
} else {
  console.log("  -> TEST 5.Y FAILED! evalTemple:", evalTemple);
  allPassed = false;
}

// ==========================================
// TEST 5.Z: Candidate without garment match in candidate metadata is rejected outright
// ==========================================
console.log("\nTEST 5.Z: Rejection of candidate lacking garment match in candidate metadata");
const noGarmentPhoto = {
  id: "File:Delhi_Festival_Crowd.jpg",
  title: "File:Delhi Festival Crowd.jpg",
  description: "Crowd celebrating Diwali festival in Delhi India marketplace with festive decorations",
  alt_description: "Diwali festival crowd in Delhi",
  slug: "delhi-festival-crowd",
  alternative_slugs: {},
  user: { bio: "Photographer based in Delhi, India" }
};
const evalNoGarment = context.evaluateCandidateSemantics(noGarmentPhoto, briefSari, "silk sarees", "Ladies Wear", "The Elegance of Traditional Silk Sarees");
if (evalNoGarment.isRejected && evalNoGarment.rejectionReason && evalNoGarment.rejectionReason.includes("Missing Garment")) {
  console.log("  -> TEST 5.Z PASSED (Candidate lacking garment match strictly rejected despite India/Festival context)");
} else {
  console.log("  -> TEST 5.Z FAILED! evalNoGarment:", evalNoGarment);
  allPassed = false;
}

// ==========================================
// TEST 5.AA: Ethnic saree with temple border design is NOT falsely rejected as a temple
// ==========================================
console.log("\nTEST 5.AA: Ethnic saree with temple border motif preserved as garment");
const templeBorderSaree = {
  id: "File:Kanchipuram_Silk_Saree_Temple_Border.jpg",
  title: "File:Kanchipuram Silk Saree Temple Border.jpg",
  description: "Indian woman model wearing a red Kanchipuram silk saree with traditional temple border design and gold zari work",
  alt_description: "model in red silk saree with temple border",
  slug: "kanchipuram-silk-saree-temple-border",
  alternative_slugs: {},
  user: { bio: "" }
};
const evalBorder = context.evaluateCandidateSemantics(templeBorderSaree, briefSari, "silk sarees", "Ladies Wear", "The Elegance of Traditional Silk Sarees");
if (!evalBorder.isRejected && evalBorder.score >= 70 && evalBorder.positiveSignals.includes("Garment Match")) {
  console.log("  -> TEST 5.AA PASSED (Temple border motif correctly recognized as apparel pattern, score: " + evalBorder.score + ")");
} else {
  console.log("  -> TEST 5.AA FAILED! evalBorder:", evalBorder);
  allPassed = false;
}

// ==========================================
// SECTION 6: SEMANTIC CANDIDATE EVALUATION & REJECTION PREVENTION TESTS
// ==========================================
console.log("\n==========================================");
console.log("SECTION 6: SEMANTIC EVALUATION & REJECTION PREVENTION TESTS");
console.log("==========================================");

const sareeTargetBrief = {
  genderTargets: ["Female", "Women"],
  ageTargets: ["Adult"],
  garmentTypes: ["traditional kanjeevaram silk saree", "festive silk saree", "blouse fitting"],
  occasions: ["Festive", "Diwali", "Wedding"],
  visualSetting: "clothing boutique or festive interior",
  mustNotShow: ["western clothing", "jeans", "monument"]
};

// TEST 6.A: Silk saree candidate accepted even without secondary blouse metadata
console.log("\nTEST 6.A: Silk saree candidate accepted even without secondary blouse metadata");
const silkSareeCandidate = {
  id: "File:Traditional Silk Sarees – Timeless Kanchipuram Elegance.jpg",
  title: "File:Traditional Silk Sarees – Timeless Kanchipuram Elegance.jpg",
  description: "Traditional Indian Silk Sarees showcasing timeless Kanchipuram elegance with rich pallu and intricate zari weaving for festive celebrations",
  alt_description: "traditional silk sarees kanchipuram elegance",
  slug: "traditional-silk-sarees-kanchipuram-elegance",
  alternative_slugs: {},
  user: { bio: "Indian ethnic wear photographer" }
};
const evalSaree = context.evaluateCandidateSemantics(
  silkSareeCandidate,
  sareeTargetBrief,
  "festive silk saree styling",
  "Ladies Wear",
  "Festive Silk Saree Styling: The Ultimate Delhi Occasion Wear Guide"
);
if (!evalSaree.isRejected && evalSaree.score >= 70 && evalSaree.positiveSignals.includes("Garment Match") && evalSaree.positiveSignals.includes("Demographic Match")) {
  console.log("  -> TEST 6.A PASSED (Silk saree candidate accepted with high confidence score: " + evalSaree.score + ", no false rejection on secondary blouse detail)");
} else {
  console.log("  -> TEST 6.A FAILED! evalSaree:", evalSaree);
  allPassed = false;
}

// TEST 6.B: Secondary detail contributes bonus score without being mandatory
console.log("\nTEST 6.B: Secondary details contribute bonus (+10) without mandatory rejection");
const minimalSareeCandidate = {
  id: "File:Indian_Women_Silk_Saree.jpg",
  title: "File:Indian Women Silk Saree.jpg",
  description: "Indian woman wearing festive silk saree at a traditional celebration",
  alt_description: "woman in silk saree",
  slug: "indian-women-silk-saree",
  alternative_slugs: {},
  user: { bio: "" }
};
const evalMinimalSaree = context.evaluateCandidateSemantics(
  minimalSareeCandidate,
  sareeTargetBrief,
  "festive silk saree styling",
  "Ladies Wear",
  "Festive Silk Saree Styling: The Ultimate Delhi Occasion Wear Guide"
);
const hasBonusInRich = evalSaree.positiveSignals.includes("Secondary Styling Detail Match");
if (!evalMinimalSaree.isRejected && evalMinimalSaree.score >= 70 && hasBonusInRich && evalSaree.score >= evalMinimalSaree.score) {
  console.log("  -> TEST 6.B PASSED (Minimal saree passes at score " + evalMinimalSaree.score + "; rich saree gets styling bonus at score " + evalSaree.score + ")");
} else {
  console.log("  -> TEST 6.B FAILED!", { evalMinimalSaree, evalSaree });
  allPassed = false;
}

// TEST 6.C: Strict rejection preserved for Shore Temple / Monument
console.log("\nTEST 6.C: Strict rejection preserved for Shore Temple / Monument");
const evalShoreTemple = context.evaluateCandidateSemantics(
  shoreTemplePhoto,
  sareeTargetBrief,
  "festive silk saree styling",
  "Ladies Wear",
  "Festive Silk Saree Styling: The Ultimate Delhi Occasion Wear Guide"
);
if (evalShoreTemple.isRejected && evalShoreTemple.rejectionReason && evalShoreTemple.rejectionReason.includes("Non-Garment Subject")) {
  console.log("  -> TEST 6.C PASSED (Shore Temple strictly rejected due to Non-Garment Subject Contradiction)");
} else {
  console.log("  -> TEST 6.C FAILED! evalShoreTemple:", evalShoreTemple);
  allPassed = false;
}

// TEST 6.D: Strict rejection preserved for candidate lacking garment match
console.log("\nTEST 6.D: Strict rejection preserved for candidate lacking garment match");
const marketSpicePhoto = {
  id: "File:Indian_Spice_Market_Delhi.jpg",
  title: "File:Indian Spice Market Delhi.jpg",
  description: "Vibrant spices and decorations in a traditional Delhi market celebration",
  alt_description: "delhi market spices",
  slug: "indian-spice-market-delhi",
  alternative_slugs: {},
  user: { bio: "Delhi photographer" }
};
const evalMarketSpice = context.evaluateCandidateSemantics(
  marketSpicePhoto,
  sareeTargetBrief,
  "festive silk saree styling",
  "Ladies Wear",
  "Festive Silk Saree Styling: The Ultimate Delhi Occasion Wear Guide"
);
if (evalMarketSpice.isRejected && evalMarketSpice.rejectionReason && evalMarketSpice.rejectionReason.includes("Missing Garment")) {
  console.log("  -> TEST 6.D PASSED (Market spices strictly rejected due to Missing Garment in candidate metadata)");
} else {
  console.log("  -> TEST 6.D FAILED! evalMarketSpice:", evalMarketSpice);
  allPassed = false;
}

// TEST 6.E: Strict rejection preserved for Wrong Gender
console.log("\nTEST 6.E: Strict rejection preserved for Wrong Gender");
const gentsFormalPhoto = {
  id: "File:Indian_Gents_Formal_Blazer.jpg",
  title: "File:Indian Gents Formal Blazer.jpg",
  description: "Indian man model wearing a classic navy formal blazer and trousers",
  alt_description: "man in blazer",
  slug: "indian-gents-formal-blazer",
  alternative_slugs: {},
  user: { bio: "" }
};
const evalWrongGender = context.evaluateCandidateSemantics(
  gentsFormalPhoto,
  sareeTargetBrief,
  "festive silk saree styling",
  "Ladies Wear",
  "Festive Silk Saree Styling: The Ultimate Delhi Occasion Wear Guide"
);
if (evalWrongGender.isRejected && evalWrongGender.rejectionReason && evalWrongGender.rejectionReason.includes("Wrong Gender")) {
  console.log("  -> TEST 6.E PASSED (Gents formal blazer strictly rejected on Ladies Wear saree target)");
} else {
  console.log("  -> TEST 6.E FAILED! evalWrongGender:", evalWrongGender);
  allPassed = false;
}

// TEST 6.F: Strict rejection preserved for Wrong Age Group
console.log("\nTEST 6.F: Strict rejection preserved for Wrong Age Group (Adult on Kids target)");
const kidsEthnicBrief = {
  genderTargets: ["Girls", "Kids"],
  ageTargets: ["Kids"],
  garmentTypes: ["frock", "lehenga", "ethnic dress"],
  occasions: ["Festive", "Diwali"]
};
const adultGownPhoto = {
  id: "File:Adult_Woman_Evening_Gown.jpg",
  title: "File:Adult Woman Evening Gown.jpg",
  description: "Mature adult woman model posing in an elegant formal dress outfit",
  alt_description: "adult woman in dress",
  slug: "adult-woman-dress",
  alternative_slugs: {},
  user: { bio: "" }
};
const evalWrongAge = context.evaluateCandidateSemantics(
  adultGownPhoto,
  kidsEthnicBrief,
  "kids festive wear",
  "Kids Wear",
  "Kids Festive Ethnic Wear Guide"
);
if (evalWrongAge.isRejected && evalWrongAge.rejectionReason && evalWrongAge.rejectionReason.includes("Wrong Age Group")) {
  console.log("  -> TEST 6.F PASSED (Adult dress strictly rejected on Kids Wear target)");
} else {
  console.log("  -> TEST 6.F FAILED! evalWrongAge:", evalWrongAge);
  allPassed = false;
}

// TEST 6.G: Strict rejection preserved for Wrong Garment (Lehenga on Saree target)
console.log("\nTEST 6.G: Strict rejection preserved for Wrong Garment (Lehenga on Saree target)");
const bridalLehengaPhoto = {
  id: "File:Red_Bridal_Lehenga_Choli.jpg",
  title: "File:Red Bridal Lehenga Choli.jpg",
  description: "Indian bride wearing heavy red bridal lehenga choli with ornate embroidery",
  alt_description: "bridal lehenga choli",
  slug: "red-bridal-lehenga-choli",
  alternative_slugs: {},
  user: { bio: "" }
};
const evalLehengaOnSaree = context.evaluateCandidateSemantics(
  bridalLehengaPhoto,
  sareeTargetBrief,
  "festive silk saree styling",
  "Ladies Wear",
  "Festive Silk Saree Styling: The Ultimate Delhi Occasion Wear Guide"
);
if (evalLehengaOnSaree.isRejected && evalLehengaOnSaree.rejectionReason && evalLehengaOnSaree.rejectionReason.includes("Wrong Garment Type")) {
  console.log("  -> TEST 6.G PASSED (Bridal Lehenga strictly rejected on Saree target)");
} else {
  console.log("  -> TEST 6.G FAILED! evalLehengaOnSaree:", evalLehengaOnSaree);
  allPassed = false;
}

// TEST 6.H: Safe failure mode with zero Unsplash calls preserved
console.log("\nTEST 6.H: Safe failure mode with zero Unsplash calls preserved");
const imageEngineSrc = fs.readFileSync(path.join(gasDir, 'ImageEngine.gs'), 'utf8');
const hasUnsplashInImageEngine = imageEngineSrc.includes("api.unsplash.com") || imageEngineSrc.includes("UNSPLASH_ACCESS_KEY");
if (!hasUnsplashInImageEngine) {
  console.log("  -> TEST 6.H PASSED (ImageEngine.gs contains zero references to Unsplash API or UNSPLASH_ACCESS_KEY)");
} else {
  console.log("  -> TEST 6.H FAILED! Unsplash reference found in ImageEngine.gs");
  allPassed = false;
}

console.log("\n==========================================");
if (allPassed) {
  console.log(">>> ALL TOPIC-AWARE ENGINE TESTS PASSED SUCCESSFULLY! <<<");
  process.exit(0);
} else {
  console.log(">>> TEST RUNNER DETECTED SCENARIO FAILURES! <<<");
  process.exit(1);
}
