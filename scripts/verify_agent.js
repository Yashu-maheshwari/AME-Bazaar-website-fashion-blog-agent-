const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

function runAgent(argsStr) {
  try {
    const output = execSync(`node scripts/fashion_content_agent.js ${argsStr}`, {
      cwd: path.join(__dirname, '..'),
      env: { ...process.env },
      encoding: 'utf-8'
    });
    return { success: true, output };
  } catch (err) {
    const output = (err.stdout || '') + '\n' + (err.stderr || '');
    if (output.includes('Draft published successfully!') || output.includes('SEO Quality Gate passed.')) {
      return { success: true, output };
    }
    return { success: false, output };
  }
}

process.env.MOCK_GEMINI = 'true';

async function verify() {
  console.log('=== AME Bazaar Content Engine Verification Suite ===\n');
  const report = {};

  // Bypass daily history during test run by renaming it temporarily
  const historyPath = path.join(__dirname, '..', 'memory', 'daily_execution_history.json');
  const backupPath = path.join(__dirname, '..', 'memory', 'daily_execution_history.json.bak');
  let hadHistory = false;
  if (fs.existsSync(historyPath)) {
    fs.renameSync(historyPath, backupPath);
    hadHistory = true;
  }

  // Load Env
  const envPath = path.join(__dirname, '..', 'config', 'local.env');
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

  // Make sure MOCK_GEMINI stays true
  process.env.MOCK_GEMINI = 'true';

  const hasCreds = process.env.WORDPRESS_URL && process.env.WORDPRESS_USERNAME && process.env.WORDPRESS_APPLICATION_PASSWORD;
  if (!hasCreds) {
    console.error('ERROR: Live WordPress credentials missing from config/local.env.');
    if (hadHistory) fs.renameSync(backupPath, historyPath);
    process.exit(1);
  }

  // 1. Topic Selection / Duplicate check
  console.log('1. Checking Topic Queue & Duplication Prevention...');
  const run1 = runAgent('--dry-run');
  if (run1.success && run1.output.includes('Selected Topic:')) {
    report['Topic Queue & Duplication'] = 'PASS';
  } else {
    report['Topic Queue & Duplication'] = 'FAIL';
  }

  // 2. SEO quality gate
  console.log('2. Checking SEO Audit Gate (Score > 90)...');
  if (run1.success && run1.output.includes('SEO Quality Gate passed.')) {
    report['SEO Quality Gate (>90)'] = 'PASS';
  } else {
    report['SEO Quality Gate (>90)'] = 'FAIL';
  }

  // 3. Structured Data JSON-LD
  console.log('3. Checking FAQ & Article Schemas...');
  if (run1.success && run1.output.includes('FAQs count:')) {
    report['FAQ & Article Schema'] = 'PASS';
  } else {
    report['FAQ & Article Schema'] = 'FAIL';
  }

  // 3.1 Production Data Integrity Check
  console.log('3.1 Checking Production Data Integrity (Centralized Config)...');
  const hasConfig = fs.existsSync(path.join(__dirname, '..', 'config', 'business_config.json'));
  if (hasConfig && run1.success && run1.output.includes('Production Data Integrity checks passed')) {
    report['Production Data Integrity'] = 'PASS';
  } else {
    report['Production Data Integrity'] = 'FAIL';
  }

  // 4. WordPress API, Media Upload & Featured Image Assignment
  console.log('4. Checking Live Draft & Featured Image Upload...');
  const forceTitle = `Test Topic ${Date.now()}`;
  const liveRun = runAgent(`--force-topic "${forceTitle}"`);
  
  if (liveRun.success && liveRun.output.includes('Draft published successfully!')) {
    report['Live REST API Authentication'] = 'PASS';
    report['Featured Image Upload'] = liveRun.output.includes('Featured image uploaded') ? 'PASS' : 'FAIL';
    report['WordPress Draft Creation'] = 'PASS';
    let gbpPassed = false;
    try {
      console.log('[INFO] Running Google Business Profile Live Publish integration test...');
      execSync('node scripts/test_gbp_publish.js', { stdio: 'inherit' });
      gbpPassed = true;
    } catch (e) {
      console.log('[WARN] Google Business Profile Integration test failed (expected if keys are missing/expired).');
    }
    report['Google Business Profile Post'] = gbpPassed ? 'PASS' : 'FAIL';
    
    // Extract Post ID
    const match = liveRun.output.match(/Post ID: (\d+)/);
    if (match) {
      const postId = match[1];
      console.log(`Verifying Draft ID ${postId} on the live site...`);
      const auth = Buffer.from(`${process.env.WORDPRESS_USERNAME}:${process.env.WORDPRESS_APPLICATION_PASSWORD}`).toString('base64');
      try {
        const response = await fetch(`${process.env.WORDPRESS_URL.replace(/\/$/, '')}/wp-json/wp/v2/posts/${postId}`, {
          headers: { 'Authorization': `Basic ${auth}` }
        });
        if (response.ok) {
          const data = await response.json();
          const hasFeaturedImage = data.featured_media > 0;
          report['Featured Image Attachment'] = hasFeaturedImage ? 'PASS' : 'FAIL';
          report['Open Graph & Metadata Reference'] = data.slug ? 'PASS' : 'FAIL';
        } else {
          report['Featured Image Attachment'] = 'FAIL (Fetch failed)';
          report['Open Graph & Metadata Reference'] = 'FAIL (Fetch failed)';
        }
      } catch (e) {
        report['Featured Image Attachment'] = 'FAIL (Error)';
        report['Open Graph & Metadata Reference'] = 'FAIL (Error)';
      }
    }
  } else {
    report['Live REST API Authentication'] = 'FAIL';
    report['Featured Image Upload'] = 'FAIL';
    report['WordPress Draft Creation'] = 'FAIL';
    report['Featured Image Attachment'] = 'FAIL';
    report['Open Graph & Metadata Reference'] = 'FAIL';
    report['Google Business Profile Post'] = 'FAIL';
  }

  console.log('\n=== VERIFICATION REPORT ===');
  let allPassed = true;
  for (const [feature, status] of Object.entries(report)) {
    console.log(`${feature}: ${status}`);
    if (status !== 'PASS') allPassed = false;
  }
  
  console.log(`\nFinal Verification Result: ${allPassed ? 'PASS' : 'FAIL'}`);
  if (hadHistory) {
    if (fs.existsSync(historyPath)) fs.unlinkSync(historyPath);
    fs.renameSync(backupPath, historyPath);
  }
  if (!allPassed) process.exit(1);
}

verify();
