/**
 * ==============================================================================
 * AME Bazaar Fashion AI Content Engine - Google Apps Script Port
 * Module: GeminiApi.gs
 * ==============================================================================
 * Gemini API client with multi-model fallback, retry backoff, and JSON parsing.
 */
var exhaustedModels = {};
var geminiCallsCount = 0;

/**
 * Filters models to select only active (non-exhausted) ones, clearing any models
 * whose 60-second cooldown window has elapsed.
 * @param {string[]} models
 * @returns {string[]}
 */
function getActiveModels(models) {
  const now = new Date().getTime();
  const activeModels = models.filter(m => {
    const exhaustedTime = exhaustedModels[m];
    if (!exhaustedTime) return true;
    if (now - exhaustedTime > 60000) {
      delete exhaustedModels[m];
      return true;
    }
    return false;
  });
  return activeModels.length > 0 ? activeModels : models;
}

/**
 * Calls the Gemini API with structured JSON output, multi-model fallback, and execution budget protection.
 * @param {string} promptText
 * @param {number} retries
 * @param {boolean} isDryRun
 * @param {boolean} disableFallback
 * @returns {{text: string, usage: Object}}
 */
function callGemini(promptText, retries = 2, isDryRun = false, disableFallback = false) {
  const apiKey = getSecret('GEMINI_API_KEY');
  if (!apiKey) {
    throw new Error('Missing GEMINI_API_KEY in Script Properties.');
  }

  // Execution Budget Guard: Prevent starting a long LLM call if insufficient time remains
  if (typeof hasExecutionBudget === 'function' && !hasExecutionBudget(GEMINI_MIN_REMAINING_BUDGET_MS)) {
    const remSec = (typeof getRemainingExecutionBudgetMs === 'function' ? getRemainingExecutionBudgetMs() / 1000 : 0).toFixed(1);
    Logger.log(`[GEMINI WARN] Execution budget exhausted (${remSec}s remaining < ${GEMINI_MIN_REMAINING_BUDGET_MS / 1000}s required). Aborting call to protect execution window.`);
    throw new Error(`EXECUTION_BUDGET_EXCEEDED: Insufficient execution budget remaining (${remSec}s).`);
  }

  // Maximum total attempts across all models (strictly bounded to prevent timeout cascade)
  const maxTotalAttempts = disableFallback ? 1 : Math.min(retries, 2);

  // Model fallback hierarchy (bounded to at most 2 candidate models)
  const customModel = getSecret('GEMINI_MODEL', '');
  let models = [
    customModel || 'gemini-3.6-flash',
    'gemini-flash-latest',
    'gemini-1.5-flash'
  ].filter(Boolean);

  if (disableFallback) {
    models = [models[0]];
  } else {
    models = getActiveModels(models).slice(0, 2);
  }

  let totalAttemptsMade = 0;
  let lastError = null;

  for (const model of models) {
    while (totalAttemptsMade < maxTotalAttempts) {
      totalAttemptsMade++;

      // Check remaining execution budget before initiating each attempt
      if (typeof hasExecutionBudget === 'function' && !hasExecutionBudget(20000)) {
        const remSec = (typeof getRemainingExecutionBudgetMs === 'function' ? getRemainingExecutionBudgetMs() / 1000 : 0).toFixed(1);
        Logger.log(`[GEMINI WARN] Execution budget low (${remSec}s remaining). Halting retries.`);
        throw new Error(`EXECUTION_BUDGET_EXCEEDED: Low execution budget before attempt ${totalAttemptsMade} (${remSec}s).`);
      }

      const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;
      const payload = {
        contents: [
          {
            parts: [{ text: promptText }]
          }
        ],
        generationConfig: {
          responseMimeType: "application/json"
        }
      };

      const options = {
        method: 'post',
        contentType: 'application/json',
        payload: JSON.stringify(payload),
        muteHttpExceptions: true
      };

      const startMs = new Date().getTime();
      let statusCode = 0;
      let elapsed = 0;

      try {
        geminiCallsCount++;
        Logger.log(`[GEMINI] Generation attempt ${totalAttemptsMade}/${maxTotalAttempts} with model: ${model}...`);
        const response = UrlFetchApp.fetch(url, options);
        statusCode = response.getResponseCode();

        const endMs = new Date().getTime();
        elapsed = ((endMs - startMs) / 1000).toFixed(2);
        Logger.log(`[GEMINI_CALL] Model: ${model} | Attempt: ${totalAttemptsMade}/${maxTotalAttempts} | Status: ${statusCode} | Elapsed: ${elapsed}s`);

        const responseText = response.getContentText();

        if (statusCode === 429) {
          if (disableFallback) {
            throw new Error(`Quota exhausted (429) for model ${model} with disableFallback set.`);
          }
          exhaustedModels[model] = new Date().getTime();
          Logger.log(`[WARN] Quota exhausted (429) for model ${model}. Rotating candidate model...`);
          break; // Break inner loop to try next model
        }

        if (statusCode === 503) {
          const errMsg = `HTTP 503 - Service Unavailable from model ${model} (Elapsed: ${elapsed}s)`;
          Logger.log(`[GEMINI 503] ${errMsg}. Attempt ${totalAttemptsMade}/${maxTotalAttempts}.`);
          lastError = new Error(errMsg);

          if (totalAttemptsMade < maxTotalAttempts) {
            const sleepMs = 2000;
            if (typeof hasExecutionBudget === 'function' && hasExecutionBudget(sleepMs + 20000)) {
              Logger.log(`[GEMINI] Backing off for ${sleepMs}ms before retry...`);
              Utilities.sleep(sleepMs);
            }
            continue; // Retry with next attempt
          } else {
            throw lastError;
          }
        }

        if (statusCode !== 200) {
          throw new Error(`HTTP ${statusCode} - ${responseText}`);
        }

        const data = JSON.parse(responseText);
        if (data.candidates && data.candidates[0] && data.candidates[0].content && data.candidates[0].content.parts[0]) {
          return {
            text: data.candidates[0].content.parts[0].text,
            usage: data.usageMetadata || {}
          };
        } else {
          throw new Error('Malformed API response structure from Gemini API.');
        }
      } catch (err) {
        lastError = err;
        if (!elapsed) {
          const endMs = new Date().getTime();
          elapsed = ((endMs - startMs) / 1000).toFixed(2);
          Logger.log(`[GEMINI_CALL_ERROR] Model: ${model} | Attempt: ${totalAttemptsMade}/${maxTotalAttempts} | Elapsed: ${elapsed}s | Error: ${err.message}`);
        }

        // If error was budget exhaustion, rethrow immediately without retrying
        if (err.message && err.message.includes('EXECUTION_BUDGET_EXCEEDED')) {
          throw err;
        }

        if (totalAttemptsMade >= maxTotalAttempts) {
          throw err;
        }

        const backoffMs = 2000 * totalAttemptsMade;
        if (typeof hasExecutionBudget === 'function' && hasExecutionBudget(backoffMs + 20000)) {
          Logger.log(`[GEMINI] Sleeping ${backoffMs}ms before retry attempt ${totalAttemptsMade + 1}...`);
          Utilities.sleep(backoffMs);
        }
      }
    }

    if (totalAttemptsMade >= maxTotalAttempts) {
      break;
    }
  }

  throw lastError || new Error('All bounded Gemini attempts exhausted or failed.');
}

/**
 * Extracts the first complete top-level JSON object/array from a string.
 * It strictly tracks brace nesting depth and string boundaries.
 * @param {string} text
 * @returns {string|null}
 */
function extractTopLevelJson(text) {
  let startIdx = text.indexOf('{');
  const startBracket = text.indexOf('[');
  
  let isOpenBrace = true;
  if (startIdx === -1 || (startBracket !== -1 && startBracket < startIdx)) {
    startIdx = startBracket;
    isOpenBrace = false;
  }
  
  if (startIdx === -1) return null;

  let depth = 0;
  let inString = false;
  let escape = false;

  for (let i = startIdx; i < text.length; i++) {
    const char = text[i];
    
    if (escape) {
      escape = false;
      continue;
    }
    
    if (char === '\\') {
      escape = true;
      continue;
    }
    
    if (char === '"') {
      inString = !inString;
      continue;
    }
    
    if (!inString) {
      if (char === (isOpenBrace ? '{' : '[')) {
        depth++;
      } else if (char === (isOpenBrace ? '}' : ']')) {
        depth--;
        if (depth === 0) {
          return text.substring(startIdx, i + 1);
        }
      }
    }
  }
  
  return null;
}

/**
 * Strips markdown code blocks and safely parses JSON.
 * @param {string} text
 * @returns {Object|Array}
 */
function cleanAndParseJson(text) {
  if (!text) throw new Error('Empty JSON response from LLM.');

  Logger.log(`[JSON] Raw response length: ${text.length}`);
  const hasFence = /```json/i.test(text) || /```/.test(text);
  Logger.log(`[JSON] Fence detected: ${hasFence ? 'yes' : 'no'}`);

  let cleaned = text;
  
  // Fix bad JSON escape sequences (any backslash not followed by valid JSON escape character)
  cleaned = cleaned.replace(/\\(?!["\\/bfnrt]|u[0-9a-fA-F]{4})/g, '\\\\');

  if (hasFence) {
    const match = text.match(/```(?:json)?\s*([\s\S]*?)\s*```/i);
    if (match && match[1]) {
      cleaned = match[1].trim();
    } else {
      cleaned = text.replace(/```json/gi, '').replace(/```/g, '').trim();
    }
  }

  Logger.log('[JSON] Parse attempt: primary');
  try {
    const result = JSON.parse(cleaned);
    Logger.log('[JSON] Parse success: yes');
    Logger.log('[JSON] Recovery used: no');
    return result;
  } catch (err) {
    Logger.log(`[JSON] Parse failure on primary attempt: ${err.message}`);
    Logger.log(`[JSON ERROR DUMP] Text length: ${cleaned.length}`);
    Logger.log(`[JSON ERROR DUMP] Start: ${cleaned.substring(0, 300)}`);
    Logger.log(`[JSON ERROR DUMP] End: ${cleaned.substring(Math.max(0, cleaned.length - 300))}`);
    Logger.log('[JSON] Parse attempt: depth-tracking recovery');
    
    // Recovery 1: Depth tracking extraction (avoids trailing extra characters or braces)
    const extracted = extractTopLevelJson(cleaned);
    if (!extracted) {
      Logger.log('[JSON] Parse success: no');
      Logger.log('[JSON] Recovery used: failed (no valid JSON object found)');
      throw new Error(`JSON parse error: Could not locate complete top-level JSON object. (Original error: ${err.message})`);
    }

    // Secondary Cleanup on the extracted string (for internal format issues)
    let recovered = extracted
      .replace(/,\s*([\}\]])/g, '$1')     // Remove trailing commas before closing braces
      .replace(/[\n\r\t]/g, ' ')          // Safely replace actual literal newlines/tabs with space
      .replace(/[\u0000-\u001F]+/g, '');  // Remove any remaining unprintable control chars

    try {
      const result2 = JSON.parse(recovered);
      Logger.log('[JSON] Parse success: yes');
      Logger.log('[JSON] Recovery used: yes (extracted)');
      return result2;
    } catch (err2) {
      Logger.log('[JSON] Parse success: no');
      Logger.log('[JSON] Recovery used: failed (extraction was not enough)');
      Logger.log(`[JSON ERROR DUMP] Start: ${cleaned.substring(0, 150)} ... End: ${cleaned.substring(cleaned.length - 150)}`);
      throw new Error(`JSON parse error after recovery: ${err2.message}`);
    }
  }
}


/**
 * Calls the Gemini Vision API to evaluate image content.
 * @param {string} promptText
 * @param {GoogleAppsScript.Base.Blob} imageBlob
 * @param {number} retries
 * @param {boolean} isDryRun
 * @param {boolean} disableFallback
 * @returns {{text: string}}
 */
function callGeminiVision(promptText, imageBlob, retries = 3, isDryRun = false, disableFallback = false) {
  const apiKey = getSecret('GEMINI_API_KEY');
  if (!apiKey) {
    throw new Error('Missing GEMINI_API_KEY in Script Properties.');
  }

  if (typeof hasExecutionBudget === 'function' && !hasExecutionBudget(typeof GEMINI_MIN_REMAINING_BUDGET_MS !== 'undefined' ? GEMINI_MIN_REMAINING_BUDGET_MS : 35000)) {
    const elapsed = typeof getScriptElapsedMs === 'function' ? (getScriptElapsedMs() / 1000).toFixed(1) : '?';
    Logger.log(`[GEMINI_VISION_BUDGET_EXCEEDED] Script elapsed: ${elapsed}s. Aborting vision call to protect Apps Script runtime.`);
    throw new Error('EXECUTION_BUDGET_EXCEEDED: Insufficient time remaining in Apps Script budget for Gemini Vision API call.');
  }

  const customModel = getSecret('GEMINI_MODEL', '');
  let models = [
    customModel || 'gemini-3.6-flash',
    'gemini-flash-latest',
    'gemini-flash-lite-latest',
    'gemini-3.5-flash',
    'gemini-3.1-flash-lite'
  ].filter(Boolean);

  if (disableFallback) {
    models = [models[0]];
  } else {
    models = getActiveModels(models);
  }

  // Bound candidate models to at most 2 active models
  if (models.length > 2) {
    models = models.slice(0, 2);
  }

  const maxTotalAttempts = disableFallback ? 1 : Math.min(retries, 2);
  let totalAttemptsMade = 0;
  let lastError = null;

  const base64Data = Utilities.base64Encode(imageBlob.getBytes());
  const mimeType = imageBlob.getContentType() || 'image/jpeg';

  for (const model of models) {
    for (let attempt = 1; attempt <= maxTotalAttempts; attempt++) {
      totalAttemptsMade++;
      if (typeof hasExecutionBudget === 'function' && !hasExecutionBudget(20000)) {
        Logger.log(`[GEMINI_VISION_BUDGET_EXCEEDED] Aborting vision retry ${totalAttemptsMade}. Script execution window running low.`);
        throw new Error('EXECUTION_BUDGET_EXCEEDED: Cannot retry Gemini Vision due to remaining execution budget.');
      }

      const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;
      const payload = {
        contents: [
          {
            parts: [
              { text: promptText },
              {
                inlineData: {
                  mimeType: mimeType,
                  data: base64Data
                }
              }
            ]
          }
        ],
        generationConfig: {
          responseMimeType: "application/json"
        }
      };

      const options = {
        method: 'post',
        contentType: 'application/json',
        payload: JSON.stringify(payload),
        muteHttpExceptions: true
      };

      const startMs = new Date().getTime();
      let elapsed = null;

      try {
        geminiCallsCount++;
        Logger.log(`[GEMINI VISION] Attempting audit with model: ${model} (attempt ${totalAttemptsMade}/${maxTotalAttempts})...`);
        const response = UrlFetchApp.fetch(url, options);
        const endMs = new Date().getTime();
        elapsed = ((endMs - startMs) / 1000).toFixed(2);
        const statusCode = response.getResponseCode();
        const responseText = response.getContentText();

        if (statusCode === 429) {
          exhaustedModels[model] = new Date().getTime();
          Logger.log(`[WARN] Quota exhausted (429) for vision model ${model} after ${elapsed}s. Rotating model.`);
          lastError = new Error(`HTTP 429 Quota Exhausted on ${model}`);
          break;
        }

        if (statusCode === 503 || statusCode === 500) {
          lastError = new Error(`HTTP ${statusCode} Server Unavailable on ${model} after ${elapsed}s`);
          Logger.log(`[WARN] Gemini Vision API transient error HTTP ${statusCode} on model ${model} after ${elapsed}s.`);
          if (totalAttemptsMade >= maxTotalAttempts) {
            throw lastError;
          }
        }

        if (statusCode !== 200) {
          throw new Error(`HTTP ${statusCode} - ${responseText}`);
        }

        const data = JSON.parse(responseText);
        if (data.candidates && data.candidates[0] && data.candidates[0].content && data.candidates[0].content.parts[0]) {
          return {
            text: data.candidates[0].content.parts[0].text
          };
        } else {
          throw new Error('Malformed Vision API response.');
        }
      } catch (err) {
        lastError = err;
        if (!elapsed) {
          const endMs = new Date().getTime();
          elapsed = ((endMs - startMs) / 1000).toFixed(2);
          Logger.log(`[GEMINI_VISION_ERROR] Model: ${model} | Attempt: ${totalAttemptsMade}/${maxTotalAttempts} | Elapsed: ${elapsed}s | Error: ${err.message}`);
        }

        if (err.message && err.message.includes('EXECUTION_BUDGET_EXCEEDED')) {
          throw err;
        }

        if (totalAttemptsMade >= maxTotalAttempts) {
          throw err;
        }

        const backoffMs = 2000 * totalAttemptsMade;
        if (typeof hasExecutionBudget === 'function' && hasExecutionBudget(backoffMs + 20000)) {
          Logger.log(`[GEMINI VISION] Sleeping ${backoffMs}ms before retry...`);
          Utilities.sleep(backoffMs);
        }
      }
    }

    if (totalAttemptsMade >= maxTotalAttempts) {
      break;
    }
  }

  throw lastError || new Error('All bounded Gemini Vision attempts exhausted or failed.');
}
