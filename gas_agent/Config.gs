/**
 * ==============================================================================
 * AME Bazaar Fashion AI Content Engine - Google Apps Script Port
 * Module: Config.gs
 * ==============================================================================
 * Central configuration, environment secrets management, and default settings.
 */

// Production Publishing Configuration
const WP_POST_STATUS = 'publish';
const WP_DEFAULT_AUTHOR_ID = 2; // User ID 2 corresponds to public identity "AME Bazaar"

/**
 * Retrieves the configured WordPress author ID.
 * Defaults to User ID 2 ("AME Bazaar").
 * @returns {number}
 */
function getAuthorId() {
  const customId = getSecret('WORDPRESS_AUTHOR_ID', '2');
  return parseInt(customId, 10) || WP_DEFAULT_AUTHOR_ID;
}

/**
 * QUALITY GATE INCONSISTENCY NOTICE (Flagged for Approval):
 * - System Prompt requires: >= 600 words
 * - Audit Engine penalty: triggers only if words < 500 (-15 pts)
 * In this implementation, the original algorithm is preserved identically
 * (threshold check at 500 words, target note in prompt at 600+ words).
 */
const SEO_QUALITY_GATE_THRESHOLD = 90;
const SEO_MIN_WORD_COUNT_AUDIT = 500;
const SEO_TARGET_WORD_COUNT = 600;
const MAX_REPAIR_ATTEMPTS = 2;
const MAX_TOPIC_ATTEMPTS = 3;

// Default Centralized Business Information
const DEFAULT_BUSINESS_CONFIG = {
  businessName: "AME Bazaar",
  websiteUrl: "https://amebazaar.in",
  storeAddress: "Mubarakpur Road, Kirari, Delhi - 110086",
  phoneNumber: "+91 99535 69533",
  whatsAppNumber: "+91 99535 69533",
  googleBusinessProfileUrl: "https://g.page/r/amebazaar",
  googleReviewsUrl: "https://g.page/r/amebazaar/review",
  googleMapsUrl: "https://maps.google.com/?q=AME+Bazaar+Kirari+Delhi",
  storeTiming: "10:00 AM - 9:00 PM",
  tailoringServiceInfo: "Bespoke stitching and custom alteration services for men's, women's, and children's clothing.",
  logoUrl: "https://amebazaar.in/wp-content/themes/ame-bazaar/assets/images/logo.png",
  defaultCtaText: "Visit AME Bazaar today to try on clothes, or inquire via Call or WhatsApp!"
};

/**
 * Retrieves the centralized business configuration.
 * Priority: Script Properties (BUSINESS_CONFIG_JSON) -> Default Object.
 */
function getBusinessConfig() {
  const customJson = PropertiesService.getScriptProperties().getProperty('BUSINESS_CONFIG_JSON');
  if (customJson) {
    try {
      return JSON.parse(customJson);
    } catch (e) {
      Logger.log('[WARN] Failed to parse custom BUSINESS_CONFIG_JSON, using defaults.');
    }
  }
  return DEFAULT_BUSINESS_CONFIG;
}

/**
 * Retrieves a script property / secret safely without logging its value.
 * @param {string} key
 * @param {string} defaultValue
 * @returns {string}
 */
function getSecret(key, defaultValue = '') {
  const val = PropertiesService.getScriptProperties().getProperty(key);
  return val !== null && val !== undefined ? val : defaultValue;
}

/**
 * Retrieves the standalone Hostinger image service endpoint URL.
 * Uses Script Properties: 'IMAGE_SERVICE_URL'
 * @returns {string}
 */
function getImageServiceUrl() {
  return getSecret('IMAGE_SERVICE_URL', '').trim();
}

/**
 * Retrieves the standalone Hostinger image service auth secret/token.
 * Uses Script Properties: 'IMAGE_SERVICE_SECRET'
 * @returns {string}
 */
function getImageServiceSecret() {
  return getSecret('IMAGE_SERVICE_SECRET', '').trim();
}

/**
 * Helper to initialize or batch-update Script Properties safely.
 * Usage: Run once in GAS Script Editor.
 *
 * @param {Object} props Key-value map of properties
 */
function setBatchScriptProperties(props) {
  if (!props || typeof props !== 'object') {
    throw new Error('Properties must be a valid key-value object.');
  }
  PropertiesService.getScriptProperties().setProperties(props);
  Logger.log('[SUCCESS] Script Properties updated successfully. (Secrets masked)');
}

/**
 * Memory Storage Helper for Topic Queue and Published Topics.
 * Uses Script Properties: 'AME_PUBLISHED_TOPICS_MEMORY'
 */
function getTopicMemory() {
  const raw = PropertiesService.getScriptProperties().getProperty('AME_PUBLISHED_TOPICS_MEMORY');
  if (raw) {
    try {
      return JSON.parse(raw);
    } catch (e) {
      Logger.log('[WARN] Corrupted topic memory, initializing fresh structure.');
    }
  }
  return {
    published: [],
    queue: []
  };
}

/**
 * Saves topic memory back to Script Properties.
 * @param {Object} memory
 */
function saveTopicMemory(memory) {
  PropertiesService.getScriptProperties().setProperty('AME_PUBLISHED_TOPICS_MEMORY', JSON.stringify(memory));
}

/**
 * Daily Execution History Helper.
 * Uses Script Properties: 'AME_DAILY_EXECUTION_HISTORY'
 */
function getDailyExecutionHistory() {
  const raw = PropertiesService.getScriptProperties().getProperty('AME_DAILY_EXECUTION_HISTORY');
  if (raw) {
    try {
      return JSON.parse(raw);
    } catch (e) {
      Logger.log('[WARN] Corrupted daily execution history, initializing fresh.');
    }
  }
  return {};
}

/**
 * Saves daily execution history.
 * @param {Object} history
 */
function saveDailyExecutionHistory(history) {
  PropertiesService.getScriptProperties().setProperty('AME_DAILY_EXECUTION_HISTORY', JSON.stringify(history));
}

/**
 * ==============================================================================
 * Execution Budget & Time Guard Architecture
 * ==============================================================================
 * Google Apps Script has a maximum execution time limit of 360 seconds (6 minutes).
 * We enforce a conservative 300-second (5-minute) ceiling to guarantee safety margins
 * for state updates, rollback, and clean error handling.
 */
const SCRIPT_MAX_EXECUTION_MS = 300 * 1000;
const GEMINI_MIN_REMAINING_BUDGET_MS = 35 * 1000; // Require at least 35s to attempt Gemini call
const CRITIC_MIN_REMAINING_BUDGET_MS = 45 * 1000; // Require at least 45s to attempt AI Critic

var scriptExecutionStartTime = null;

/**
 * Initializes or resets the global execution timer.
 * @param {number} [customStartTimeMs]
 * @returns {number}
 */
function initScriptExecutionTimer(customStartTimeMs) {
  scriptExecutionStartTime = customStartTimeMs || new Date().getTime();
  return scriptExecutionStartTime;
}

/**
 * Returns elapsed milliseconds since execution started.
 * @returns {number}
 */
function getScriptElapsedMs() {
  if (!scriptExecutionStartTime) {
    initScriptExecutionTimer();
  }
  return new Date().getTime() - scriptExecutionStartTime;
}

/**
 * Returns remaining execution budget in milliseconds.
 * @returns {number}
 */
function getRemainingExecutionBudgetMs() {
  const customSec = parseInt(getSecret('MAX_EXECUTION_TIME_SECONDS', '300'), 10);
  const maxLimit = !isNaN(customSec) && customSec > 0 ? customSec * 1000 : SCRIPT_MAX_EXECUTION_MS;
  const elapsed = getScriptElapsedMs();
  return Math.max(0, maxLimit - elapsed);
}

/**
 * Checks whether the execution budget has at least requiredMs remaining.
 * @param {number} requiredMs
 * @returns {boolean}
 */
function hasExecutionBudget(requiredMs = 30000) {
  return getRemainingExecutionBudgetMs() >= requiredMs;
}


