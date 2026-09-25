/**
 * ==============================================================================
 * AME Bazaar Fashion AI Content Engine - Google Apps Script Port
 * Module: GbpPublisher.gs
 * ==============================================================================
 * Google Business Profile (GBP) Local Post publisher with OAuth2 token refresh.
 */

/**
 * Refreshes the Google OAuth2 access token using the stored refresh token.
 * @returns {string}
 */
function refreshGbpAccessToken() {
  const clientId = getSecret('GOOGLE_CLIENT_ID');
  const clientSecret = getSecret('GOOGLE_CLIENT_SECRET');
  const refreshToken = getSecret('GOOGLE_GBP_REFRESH_TOKEN');

  if (!clientId || !clientSecret || !refreshToken) {
    throw new Error('Missing Google client credentials or refresh token in Script Properties.');
  }

  const payload = {
    client_id: clientId,
    client_secret: clientSecret,
    refresh_token: refreshToken,
    grant_type: 'refresh_token'
  };

  const response = UrlFetchApp.fetch('https://oauth2.googleapis.com/token', {
    method: 'post',
    contentType: 'application/x-www-form-urlencoded',
    payload: payload,
    muteHttpExceptions: true
  });

  if (response.getResponseCode() !== 200) {
    throw new Error(`Token refresh failed with HTTP ${response.getResponseCode()}: ${response.getContentText()}`);
  }

  const data = JSON.parse(response.getContentText());
  Logger.log('[GBP] Google Access Token successfully refreshed.');
  return data.access_token;
}

/**
 * Publishes a local post to Google Business Profile via API with retries.
 * @param {Object} articleData
 * @param {string} publishedUrl
 * @param {number} retries
 * @returns {{success: boolean, postId?: string, error?: string}}
 */
function publishToGoogleBusinessProfile(articleData, publishedUrl, retries = 3) {
  const accountId = getSecret('GOOGLE_GBP_ACCOUNT_ID');
  const locationId = getSecret('GOOGLE_GBP_LOCATION_ID');

  if (!accountId || !locationId) {
    Logger.log('[INFO] Google Business Profile credentials not configured; skipping GBP publish step.');
    return { success: false, error: 'GBP Not Configured' };
  }

  let accessToken = '';
  try {
    accessToken = refreshGbpAccessToken();
  } catch (e) {
    Logger.log(`[WARN] GBP access token refresh failed: ${e.message}`);
    return { success: false, error: e.message };
  }

  const gbpSummary = `${articleData.title}: ${articleData.metaDescription} Read our full Local Delhi Fashion guide here: ${publishedUrl}`;
  const payload = {
    summary: gbpSummary,
    callToAction: {
      actionType: "LEARN_MORE",
      url: publishedUrl
    }
  };


  const url = `https://mybusiness.googleapis.com/v4/accounts/${accountId}/locations/${locationId}/localPosts`;

  // Idempotency check: see if a post with this URL already exists
  try {
    const listRes = UrlFetchApp.fetch(url, {
      method: 'get',
      headers: { 'Authorization': `Bearer ${accessToken}` },
      muteHttpExceptions: true
    });

    if (listRes.getResponseCode() === 200) {
      const listData = JSON.parse(listRes.getContentText());
      if (listData.localPosts && listData.localPosts.length > 0) {
        for (const pt of listData.localPosts) {
          if (pt.summary && pt.summary.includes(publishedUrl)) {
            Logger.log(`[GBP] Idempotency match: Found existing GBP post ${pt.name}. Skipping duplicate.`);
            return { success: true, postId: pt.name };
          }
        }
      }
    }
  } catch (err) {
    Logger.log(`[WARN] GBP idempotency check failed, proceeding to publish: ${err.message}`);
  }


  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      const response = UrlFetchApp.fetch(url, {
        method: 'post',
        contentType: 'application/json',
        headers: { 'Authorization': `Bearer ${accessToken}` },
        payload: JSON.stringify(payload),
        muteHttpExceptions: true
      });

      if (response.getResponseCode() === 200 || response.getResponseCode() === 201) {
        const data = JSON.parse(response.getContentText());
        Logger.log(`[GBP] Google Business Profile post published! ID: ${data.name}`);
        return { success: true, postId: data.name };
      } else {
        throw new Error(`HTTP ${response.getResponseCode()}: ${response.getContentText()}`);
      }
    } catch (err) {
      Logger.log(`[WARN] GBP publish attempt ${attempt} failed: ${err.message}`);
      if (attempt === retries) {
        return { success: false, error: err.message };
      }
      Utilities.sleep(2000 * attempt);
    }
  }

  return { success: false, error: 'Exhausted retries' };
}
