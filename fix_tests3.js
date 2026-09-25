const fs = require('fs');
let code = fs.readFileSync('scripts/test_topic_system.js', 'utf8');

// The tests for watchdog (7.3, 7.17, 7.18) overwrite lastUpdated on saveJobState. Let's fix this manually in the secrets obj.
code = code.replace(
  'context.saveJobState(staleJob);\n  context.watchdogTrigger();',
  'context.saveJobState(staleJob); let str = secrets["AME_JOB_" + staleJob.jobId]; let obj = JSON.parse(str); obj.lastUpdated = staleTime; obj.workerHeartbeatAt = staleTime; secrets["AME_JOB_" + staleJob.jobId] = JSON.stringify(obj); context.watchdogTrigger();'
);

code = code.replace(
  'context.saveJobState(job);\n  context.watchdogTrigger();',
  'context.saveJobState(job); let str = secrets["AME_JOB_" + job.jobId]; let obj = JSON.parse(str); obj.lastUpdated = staleTime; obj.workerHeartbeatAt = staleTime; secrets["AME_JOB_" + job.jobId] = JSON.stringify(obj); context.watchdogTrigger();'
);

fs.writeFileSync('scripts/test_topic_system.js', code);
