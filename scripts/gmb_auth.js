const fs = require('fs');
const path = require('path');
const http = require('http');
const { exec } = require('child_process');

const PORT = 3000;
const REDIRECT_URI = `http://localhost:${PORT}/callback`;
const SCOPE = 'https://www.googleapis.com/auth/business.manage';

// Load config/local.env
const envPath = path.join(__dirname, '..', 'config', 'local.env');
function appendEnv(key, value) {
  let content = '';
  if (fs.existsSync(envPath)) {
    content = fs.readFileSync(envPath, 'utf8');
  }
  const lines = content.split('\n').filter(line => !line.trim().startsWith(key + '='));
  lines.push(`${key}=${value}`);
  fs.writeFileSync(envPath, lines.join('\n').trim() + '\n', 'utf8');
  console.log(`[SAVED] ${key} stored in config/local.env`);
}

async function run() {
  console.log('=== Google Business Profile OAuth CLI Setup ===\n');
  
  const clientId = process.env.GOOGLE_CLIENT_ID || '';
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET || '';

  if (!clientId || !clientSecret) {
    console.log('Error: Missing GOOGLE_CLIENT_ID or GOOGLE_CLIENT_SECRET in environment.');
    console.log('Please define them temporarily in config/local.env first:');
    console.log('GOOGLE_CLIENT_ID=your_id');
    console.log('GOOGLE_CLIENT_SECRET=your_secret\n');
    process.exit(1);
  }

  const authUrl = `https://accounts.google.com/o/oauth2/v2/auth?response_type=code&client_id=${clientId}&redirect_uri=${encodeURIComponent(REDIRECT_URI)}&scope=${encodeURIComponent(SCOPE)}&access_type=offline&prompt=consent`;

  console.log('Starting local authentication redirect server on port 3000...');
  
  const server = http.createServer(async (req, res) => {
    const url = new URL(req.url, `http://localhost:${PORT}`);
    
    if (url.pathname === '/callback') {
      const code = url.searchParams.get('code');
      if (!code) {
        res.writeHead(400, { 'Content-Type': 'text/html' });
        res.end('<h1>Authentication failed: No code returned.</h1>');
        return;
      }

      res.writeHead(200, { 'Content-Type': 'text/html' });
      res.end('<h1>Success! You can return to the CLI terminal window now.</h1>');
      
      console.log('\n[INFO] Exchanging Authorization Code for Tokens...');
      
      try {
        const tokenRes = await fetch('https://oauth2.googleapis.com/token', {
          method: 'POST',
          headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
          body: new URLSearchParams({
            code,
            client_id: clientId,
            client_secret: clientSecret,
            redirect_uri: REDIRECT_URI,
            grant_type: 'authorization_code'
          })
        });

        if (!tokenRes.ok) {
          throw new Error(`Token exchange failed: ${await tokenRes.text()}`);
        }

        const tokens = await tokenRes.json();
        console.log('[SUCCESS] Tokens successfully acquired!');
        appendEnv('GOOGLE_GBP_ACCESS_TOKEN', tokens.access_token);
        if (tokens.refresh_token) {
          appendEnv('GOOGLE_GBP_REFRESH_TOKEN', tokens.refresh_token);
        }

        // Fetch Accounts
        console.log('\n[INFO] Fetching Google Business Profile accounts...');
        const accRes = await fetch('https://mybusinessbusinessinformation.googleapis.com/v1/accounts', {
          headers: { 'Authorization': `Bearer ${tokens.access_token}` }
        });

        if (accRes.ok) {
          const accData = await accRes.json();
          if (accData.accounts && accData.accounts.length > 0) {
            const acc = accData.accounts[0];
            const accountId = acc.name.split('/')[1];
            console.log(`[INFO] Found Account: ${acc.accountName} (${accountId})`);
            appendEnv('GOOGLE_GBP_ACCOUNT_ID', accountId);

            // Fetch Locations
            console.log('\n[INFO] Fetching locations for account...');
            const locRes = await fetch(`https://mybusinessbusinessinformation.googleapis.com/v1/accounts/${accountId}/locations`, {
              headers: { 'Authorization': `Bearer ${tokens.access_token}` }
            });

            if (locRes.ok) {
              const locData = await locRes.json();
              if (locData.locations && locData.locations.length > 0) {
                const loc = locData.locations[0];
                const locationId = loc.name.split('/')[1];
                console.log(`[INFO] Found Location: ${loc.title} (${locationId})`);
                appendEnv('GOOGLE_GBP_LOCATION_ID', locationId);
              } else {
                console.log('[WARN] No locations found for this account.');
              }
            } else {
              console.log('[ERROR] Failed to fetch locations:', await locRes.text());
            }
          } else {
            console.log('[WARN] No accounts found in Google Business Profile.');
          }
        } else {
          console.log('[ERROR] Failed to fetch accounts:', await accRes.text());
        }

      } catch (err) {
        console.error('[ERROR] Setup failed:', err.message);
      } finally {
        server.close(() => {
          console.log('\nRedirect server closed. CLI session finished.');
          process.exit(0);
        });
      }
    }
  });

  server.listen(PORT, () => {
    console.log(`\nOpen the following link in your browser to authorize access:\n`);
    console.log(authUrl);
    console.log(`\nWaiting for authorization redirect...`);
    
    // Automatically open browser window
    const openCmd = process.platform === 'win32' ? 'start' : 'open';
    exec(`${openCmd} "${authUrl.replace(/&/g, '^&')}"`);
  });
}

// Custom env loader
if (fs.existsSync(envPath)) {
  const content = fs.readFileSync(envPath, 'utf-8');
  content.split('\n').forEach(line => {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) return;
    const firstEquals = trimmed.indexOf('=');
    if (firstEquals === -1) return;
    process.env[trimmed.slice(0, firstEquals).trim()] = trimmed.slice(firstEquals + 1).trim();
  });
}

run();
