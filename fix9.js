const fs = require('fs');
let code = fs.readFileSync('scripts/test_topic_system.js', 'utf8');

const t9Start = code.indexOf('// 9. media exists but unrelated -> do NOT reuse');
const t10Start = code.indexOf('// 10. media exact match -> reuse');

const newTest9 = `// 9. media exists but unrelated -> do NOT reuse
runStateTest("media exists but unrelated -> do NOT reuse", () => {
  let uploaded = false;
  context.UrlFetchApp.fetch = function(url) {
    if (url.includes('media?search')) return { getResponseCode: () => 200, getContentText: () => JSON.stringify([{source_url: "unrelated.webp", slug: "unrelated", id: 111}]) };
    if (url.includes('media')) { uploaded = true; return { getResponseCode: () => 201, getContentText: () => JSON.stringify({id: 888}) }; }
    return { getResponseCode: () => 200, getContentText: () => "{}", getBlob: () => ({ setContentType: () => ({}), getBytes: () => [] }) };
  };
  const job = { jobId: \`AME-FASHION-BLOG-\${context.Utilities.formatDate(new Date(), "Asia/Kolkata", "yyyy-MM-dd")}\`, state: context.JOB_STATES.QUALITY_PASSED, jobData: { finalEvalData: {slug: "test-post", imageFilename: "test.webp"}, imgData: {url: "http://example.com"}, topic: {} } };
  context.saveJobState(job);
  let checks = 0; context.hasExecutionBudget = function() { checks++; return checks < 2; };
  context.processPublishingJob();
  const finalJob = context.loadJobState(job.jobId);
  return uploaded && finalJob.state === context.JOB_STATES.MEDIA_UPLOADED && finalJob.jobData.mediaId === 888;
});

`;

code = code.substring(0, t9Start) + newTest9 + code.substring(t10Start);
fs.writeFileSync('scripts/test_topic_system.js', code);
