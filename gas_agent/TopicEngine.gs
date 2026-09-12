/**
 * ==============================================================================
 * AME Bazaar Fashion AI Content Engine - Google Apps Script Port
 * Module: TopicEngine.gs
 * ==============================================================================
 * Topic selection, deduplication, and queue management.
 */

const CORE_SEGMENTS = [
  "Ladies Wear", "Gents Wear", "Boys Wear", "Girls Wear", "Kids Wear",
  "Family Fashion", "Ethnic Wear", "Western Wear", "Casual Wear", "Formal Wear",
  "Party Wear", "Wedding / Marriage Wear", "Festive Wear", "Seasonal Wear",
  "Tailoring / Alteration / Fitting", "Garment Care / Styling",
  "Local Clothing Store / Shopping Guides", "Fashion Trends", "Outfit Guides", "Shopping Guides"
];

/**
 * Calculates Topic Opportunity Score based on trend signals.
 * @param {string} segment
 * @param {Array<Object>} publishedTopics
 * @returns {number}
 */
function calculateOpportunityScore(segment, publishedTopics) {
  let score = 50; // Base score
  
  const currentSeason = getCurrentSeason();
  const occasions = getApproachingOccasions();
  
  // Season relevance
  if (currentSeason === "Winter" && ["Winter Wear", "Seasonal Wear", "Garment Care / Styling", "Kids Wear"].includes(segment)) score += 20;
  if (currentSeason === "Summer" && ["Seasonal Wear", "Casual Wear", "Garment Care / Styling"].includes(segment)) score += 20;
  
  // Occasion relevance
  const occLower = occasions.toLowerCase();
  if ((occLower.includes("wedding") || occLower.includes("marriage")) && ["Wedding / Marriage Wear", "Ethnic Wear", "Party Wear", "Tailoring / Alteration / Fitting", "Family Fashion"].includes(segment)) {
    score += 30;
  }
  if (occLower.includes("festiv") || occLower.includes("diwali") || occLower.includes("eid") || occLower.includes("rakhi")) {
    if (["Festive Wear", "Ethnic Wear", "Kids Wear", "Family Fashion"].includes(segment)) {
      score += 25;
    }
  }
  
  // Local/Business relevance
  if (["Local Clothing Store / Shopping Guides", "Tailoring / Alteration / Fitting", "Shopping Guides"].includes(segment)) {
    score += 15;
  }
  
  // Duplication/Repetition penalty
  let segmentCount = 0;
  let lastPublishedDaysAgo = 999;
  const now = new Date();
  
  if (publishedTopics && publishedTopics.length > 0) {
    for (const pt of publishedTopics) {
      if (pt.category === segment || pt.audienceSegment === segment) {
        segmentCount++;
        const pubDate = pt.publishedAt ? new Date(pt.publishedAt) : now;
        const diffDays = Math.floor((now - pubDate) / (1000 * 60 * 60 * 24));
        if (diffDays < lastPublishedDaysAgo) {
          lastPublishedDaysAgo = diffDays;
        }
      }
    }
  }
  
  if (lastPublishedDaysAgo < 7) {
    score -= 40; // Avoid repeating within a week
  } else if (lastPublishedDaysAgo < 14) {
    score -= 20;
  } else if (lastPublishedDaysAgo > 30) {
    score += 10; // Bonus for freshness
  }
  
  if (segmentCount > 5) {
    score -= (segmentCount * 2);
  }
  
  return score;
}

/**
 * Selects the next topic from the queue or generates new ones if queue is empty.
 * @param {string|null} forcedTopicTitle
 * @param {boolean} isDryRun
 * @returns {{topic: Object, memory: Object}}
 */
function selectNextTopic(forcedTopicTitle = null, isDryRun = false) {
  const memory = getTopicMemory();

  if (forcedTopicTitle) {
    Logger.log(`[TOPIC] Forced topic title specified: "${forcedTopicTitle}"`);
    let focusKeyword = forcedTopicTitle;
    let category = "Fashion Trends"; // controlled taxonomy fallback
    let secondaryCategories = [];
    
    const titleLower = forcedTopicTitle.toLowerCase();
    if (titleLower.includes("girls' suit") || titleLower.includes("girls suit")) {
      focusKeyword = "girls suits";
      category = "Girls Wear";
      secondaryCategories = ["Ethnic Wear"];
    } else if (titleLower.includes("men's") || titleLower.includes("gents")) {
      focusKeyword = "mens styling";
      category = "Gents Wear";
      secondaryCategories = ["Garment Care / Styling"];
    } else if (titleLower.includes("local clothing store") || titleLower.includes("most trusted local clothing store")) {
      focusKeyword = "local clothing store";
      category = "Local Clothing Store / Shopping Guides";
      secondaryCategories = ["Fashion Trends"];
    } else if (titleLower.includes("kids")) {
      focusKeyword = "kids wear";
      category = "Kids Wear";
    } else if (titleLower.includes("wedding") || titleLower.includes("lehenga")) {
      focusKeyword = "wedding outfits";
      category = "Wedding / Marriage Wear";
      secondaryCategories = ["Ladies Wear"];
    }

    const forcedTopic = {
      title: forcedTopicTitle,
      focusKeyword: focusKeyword,
      category: category,
      secondaryCategories: secondaryCategories,
      brief: "Forced generation of this topic."
    };
    return { topic: forcedTopic, memory: memory };
  }

  if (!memory.queue || memory.queue.length === 0) {
    Logger.log('[TOPIC] Queue is empty. Scoring segments and generating 5 new topics via Gemini...');
    
    const published = memory.published || [];
    const segmentScores = CORE_SEGMENTS.map(seg => ({
      segment: seg,
      score: calculateOpportunityScore(seg, published)
    }));
    
    segmentScores.sort((a, b) => b.score - a.score);
    const topSegments = segmentScores.slice(0, 5).map(s => s.segment);
    
    Logger.log(`[TOPIC] Top scored segments: ${topSegments.join(', ')}`);
    
    const prompt = buildTopicPrompt(published, topSegments);

    const generated = callGemini(prompt, 3, isDryRun);
    const newTopics = cleanAndParseJson(generated.text);

    if (Array.isArray(newTopics) && newTopics.length > 0) {
      Logger.log(`[TOPIC] Generated ${newTopics.length} new topics. Appending to queue.`);
      memory.queue = memory.queue ? memory.queue.concat(newTopics) : newTopics;
      saveTopicMemory(memory);
    } else {
      throw new Error('Failed to generate valid topics array from Gemini.');
    }
  }

  const selectedTopic = memory.queue.shift();
  saveTopicMemory(memory);
  Logger.log(`[TOPIC] Selected Topic: "${selectedTopic.title}" (Focus Keyword: "${selectedTopic.focusKeyword}")`);

  return { topic: selectedTopic, memory: memory };
}

/**
 * Pushes a topic back to the front of the queue if quality gate or downstream fails.
 * @param {Object} topic
 */
function rollbackTopicToQueue(topic) {
  if (!topic) return;
  const memory = getTopicMemory();
  memory.queue = memory.queue || [];
  memory.queue.unshift(topic);
  saveTopicMemory(memory);
  Logger.log(`[TOPIC] Rolled back topic "${topic.title}" to the front of the queue.`);
}

/**
 * Records a successfully published topic into historical memory.
 * @param {Object} topic
 * @param {Object} metadata
 */
function recordPublishedTopic(topic, metadata = {}) {
  const memory = getTopicMemory();
  memory.published = memory.published || [];
  memory.published.push({
    title: topic.title,
    focusKeyword: topic.focusKeyword,
    category: topic.category,
    publishedAt: new Date().toISOString(),
    postId: metadata.postId || null,
    link: metadata.link || '',
    gbpPostId: metadata.gbpPostId || 'NONE'
  });
  saveTopicMemory(memory);
  Logger.log(`[TOPIC] Recorded topic "${topic.title}" into published registry.`);
}
