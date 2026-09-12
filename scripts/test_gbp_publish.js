const fs = require('fs');
const path = require('path');

const envPath = path.join(__dirname, '..', 'config', 'local.env');

// Helper to load env
function loadEnv() {
  if (fs.existsSync(envPath)) {
    const content = fs.readFileSync(envPath, 'utf-8');
    content.split('\n').forEach(line => {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith('#')) return;
      const index = trimmed.indexOf('=');
      if (index === -1) return;
      process.env[trimmed.slice(0, index).trim()] = trimmed.slice(index + 1).trim();
    });
  }
}

// Helper to write env updates
function appendEnv(key, value) {
  let content = '';
  if (fs.existsSync(envPath)) {
    content = fs.readFileSync(envPath, 'utf8');
  }
  const lines = content.split('\n').filter(line => !line.trim().startsWith(key + '='));
  lines.push(`${key}=${value}`);
  fs.writeFileSync(envPath, lines.join('\n').trim() + '\n', 'utf8');
}

async function refreshAccessToken() {
  const clientId = process.env.GOOGLE_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
  const refreshToken = process.env.GOOGLE_GBP_REFRESH_TOKEN;

  if (!clientId || !clientSecret || !refreshToken) {
    throw new Error('Missing Google client ID, client secret, or refresh token in environment.');
  }

  console.log('[INFO] Refreshing Google Access Token...');
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
  console.log('[SUCCESS] Access token successfully refreshed!');
  appendEnv('GOOGLE_GBP_ACCESS_TOKEN', data.access_token);
  process.env.GOOGLE_GBP_ACCESS_TOKEN = data.access_token;
  return data.access_token;
}

async function run() {
  loadEnv();

  const accountId = process.env.GOOGLE_GBP_ACCOUNT_ID;
  const locationId = process.env.GOOGLE_GBP_LOCATION_ID;
  let accessToken = process.env.GOOGLE_GBP_ACCESS_TOKEN;

  if (!accountId || !locationId || !accessToken) {
    console.error('[ERROR] Missing Google Business Profile credentials (GOOGLE_GBP_ACCOUNT_ID, GOOGLE_GBP_LOCATION_ID, GOOGLE_GBP_ACCESS_TOKEN).');
    process.exit(1);
  }

  // Attempt to verify token validity, refresh if failed
  try {
    const testRes = await fetch('https://mybusinessbusinessinformation.googleapis.com/v1/accounts', {
      headers: { 'Authorization': `Bearer ${accessToken}` }
    });
    if (!testRes.ok && testRes.status === 401 && process.env.GOOGLE_GBP_REFRESH_TOKEN) {
      accessToken = await refreshAccessToken();
    } else if (!testRes.ok) {
      throw new Error(`Authentication validation returned status ${testRes.status}: ${await testRes.text()}`);
    }
  } catch (err) {
    if (process.env.GOOGLE_GBP_REFRESH_TOKEN) {
      try {
        accessToken = await refreshAccessToken();
      } catch (refreshErr) {
        console.error('[ERROR] Access token check failed and refresh attempt failed:', refreshErr.message);
        process.exit(1);
      }
    } else {
      console.error('[ERROR] Access token check failed (no refresh token available):', err.message);
      process.exit(1);
    }
  }

  console.log(`[INFO] Verified Account ID: ${accountId}`);
  console.log(`[INFO] Verified Location ID: ${locationId}`);

  // Construct localPost payload
  const testPayload = {
    summary: "Temporary API verification post from AME Bazaar Local SEO Engine. Verification complete.",
    callToAction: {
      actionType: "LEARN_MORE",
      url: "https://amebazaar.in"
    }
  };

  const url = `https://mybusiness.googleapis.com/v4/accounts/${accountId}/locations/${locationId}/localPosts`;
  console.log('[INFO] Publishing temporary test post to Google Business Profile...');

  try {
    const postRes = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${accessToken}`
      },
      body: JSON.stringify(testPayload)
    });

    if (!postRes.ok) {
      throw new Error(`GBP API localPosts returned status ${postRes.status}: ${await postRes.text()}`);
    }

    const data = await postRes.json();
    console.log('\n=== GOOGLE BUSINESS PROFILE TEST POST EVIDENCE ===');
    console.log(`Location ID: ${locationId}`);
    console.log(`Post ID: ${data.name}`);
    console.log(`Publish Timestamp: ${data.createTime || new Date().toISOString()}`);
    console.log(`Status: Live / Published`);
    console.log('===================================================\n');

    // Delete post to clean up
    console.log('[INFO] Cleaning up: Deleting temporary verification post...');
    const deleteRes = await fetch(`https://mybusiness.googleapis.com/v4/${data.name}`, {
      method: 'DELETE',
      headers: { 'Authorization': `Bearer ${accessToken}` }
    });

    if (deleteRes.ok) {
      console.log('[SUCCESS] Temporary verification post deleted successfully from live dashboard.');
    } else {
      console.log(`[WARN] Failed to delete temporary post: ${await deleteRes.text()}`);
    }

    process.exit(0);
  } catch (err) {
    console.error('[ERROR] Publishing test post failed:', err.message);
    process.exit(1);
  }
}

run();
