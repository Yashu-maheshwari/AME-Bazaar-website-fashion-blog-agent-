const fs = require('fs');
let code = fs.readFileSync('scripts/test_topic_system.js', 'utf8');

// Fix 7.20 logging
code = code.replace(
  'finalJob.finalAudit.postId === 333 && finalJob.finalAudit.mediaId === 444;',
  'console.log("FINAL AUDIT:", finalJob.finalAudit); return finalJob.state === context.JOB_STATES.DONE && finalJob.finalAudit && finalJob.finalAudit.postId === 333 && finalJob.finalAudit.mediaId === 444;'
);

// Fix 7.9 getBlob
code = code.replace(
  'if (url.includes(\'media\')) { uploaded = true; return { getResponseCode: () => 201, getContentText: () => JSON.stringify({id: 888}) }; } return { getResponseCode: () => 200, getContentText: () => \'{}\', getBlob: () => ({}) };',
  'if (url.includes(\'media\')) { uploaded = true; return { getResponseCode: () => 201, getContentText: () => JSON.stringify({id: 888}) }; } return { getResponseCode: () => 200, getContentText: () => \'{}\', getBlob: () => ({ setContentType: () => ({}) }) };'
);

// Fix 7.12 getBlob
code = code.replace(
  'if (url.includes(\'media\')) { throw new Error("Timeout simulated during upload"); }\n    return { getResponseCode: () => 200, getContentText: () => "{}" };',
  'if (url.includes(\'media\')) { throw new Error("Timeout simulated during upload"); }\n    return { getResponseCode: () => 200, getContentText: () => "{}", getBlob: () => ({ setContentType: () => ({}) }) };'
);

// Fix watchdog tests 7.3, 7.17, 7.18
code = code.replace(
  'const staleJob = { jobId: `AME-FASHION-BLOG-${context.Utilities.formatDate(new Date(), "Asia/Kolkata", "yyyy-MM-dd")}`, state: context.JOB_STATES.QUEUED, workerActive: true, workerHeartbeatAt: staleTime, jobData: {} };',
  'const staleJob = { jobId: `AME-FASHION-BLOG-${context.Utilities.formatDate(new Date(), "Asia/Kolkata", "yyyy-MM-dd")}`, state: context.JOB_STATES.QUEUED, workerActive: true, lastUpdated: staleTime, workerHeartbeatAt: staleTime, jobData: {} };'
);

code = code.replace(
  'const job = { jobId: `AME-FASHION-BLOG-${context.Utilities.formatDate(new Date(), "Asia/Kolkata", "yyyy-MM-dd")}`, state: context.JOB_STATES.QUEUED, workerActive: true, workerHeartbeatAt: staleTime, jobData: {} };',
  'const job = { jobId: `AME-FASHION-BLOG-${context.Utilities.formatDate(new Date(), "Asia/Kolkata", "yyyy-MM-dd")}`, state: context.JOB_STATES.QUEUED, workerActive: true, lastUpdated: staleTime, workerHeartbeatAt: staleTime, jobData: {} };'
);

code = code.replace(
  'const job = { jobId: `AME-FASHION-BLOG-${context.Utilities.formatDate(new Date(), "Asia/Kolkata", "yyyy-MM-dd")}`, state: context.JOB_STATES.QUEUED, workerActive: false, workerHeartbeatAt: staleTime, jobData: {} };',
  'const job = { jobId: `AME-FASHION-BLOG-${context.Utilities.formatDate(new Date(), "Asia/Kolkata", "yyyy-MM-dd")}`, state: context.JOB_STATES.QUEUED, workerActive: false, lastUpdated: staleTime, workerHeartbeatAt: staleTime, jobData: {} };'
);

// Fix saveJobState replacing lastUpdated
code = code.replace(
  'context.saveJobState(staleJob);',
  'context.saveJobState(staleJob); staleJob.lastUpdated = staleTime; context.saveJobState(staleJob);' // double save to overwrite
);

fs.writeFileSync('scripts/test_topic_system.js', code);
