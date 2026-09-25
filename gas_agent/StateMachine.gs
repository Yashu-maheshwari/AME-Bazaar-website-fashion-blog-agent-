/**
 * ==============================================================================
 * AME Bazaar Fashion AI Content Engine - Google Apps Script Port
 * Module: StateMachine.gs
 * ==============================================================================
 * Durable state machine for resumable daily publishing jobs to bypass GAS timeouts.
 */

var JOB_STATES = {
  QUEUED: 'QUEUED',
  TOPIC_SELECTED: 'TOPIC_SELECTED',
  CONTENT_GENERATED: 'CONTENT_GENERATED',
  IMAGE_SELECTED: 'IMAGE_SELECTED',
  QUALITY_PASSED: 'QUALITY_PASSED',
  MEDIA_UPLOADED: 'MEDIA_UPLOADED',
  WP_PUBLISHED: 'WP_PUBLISHED',
  PUBLISH_VERIFIED: 'PUBLISH_VERIFIED',
  DONE: 'DONE',
  RETRY_WAIT: 'RETRY_WAIT',
  FAILED_RETRYABLE: 'FAILED_RETRYABLE',
  FAILED_PERMANENT: 'FAILED_PERMANENT'
};

var DRIVE_FOLDER_NAME = "AME Bazaar AI Website Fashion Blog Agent";
var DRIVE_SUBFOLDER_NAME = "publishing-jobs";

function getOrSetupJobFolder() {
  if (typeof DriveApp === 'undefined') return null; // For local tests

  let rootIter = DriveApp.getFoldersByName(DRIVE_FOLDER_NAME);
  let rootFolder;
  if (rootIter.hasNext()) {
    rootFolder = rootIter.next();
  } else {
    rootFolder = DriveApp.createFolder(DRIVE_FOLDER_NAME);
  }

  let subIter = rootFolder.getFoldersByName(DRIVE_SUBFOLDER_NAME);
  let subFolder;
  if (subIter.hasNext()) {
    subFolder = subIter.next();
  } else {
    subFolder = rootFolder.createFolder(DRIVE_SUBFOLDER_NAME);
  }

  return subFolder;
}

function getJobPropertyKey(jobId) {
  return `AME_JOB_${jobId}`;
}

function loadJobState(jobId) {
  const metaRaw = PropertiesService.getScriptProperties().getProperty(getJobPropertyKey(jobId));
  if (!metaRaw) {
    // Check if an audit record exists (meaning it's DONE and cleaned up)
    const dateStr = jobId.replace("AME-FASHION-BLOG-", "");
    const auditRaw = PropertiesService.getScriptProperties().getProperty(`AME_JOB_AUDIT_${dateStr}`);
    if (auditRaw) {
      return {
        jobId: jobId,
        state: JOB_STATES.DONE,
        finalAudit: JSON.parse(auditRaw),
        jobData: {}
      };
    }
    return null;
  }

  const meta = JSON.parse(metaRaw);
  let jobData = {};

  if (meta.fileId && typeof DriveApp !== 'undefined') {
    try {
      const file = DriveApp.getFileById(meta.fileId);
      jobData = JSON.parse(file.getBlob().getDataAsString());
    } catch (e) {
      Logger.log(`[WARN] Failed to load job payload from Drive for ${jobId}: ${e.message}`);
    }
  } else if (typeof DriveApp === 'undefined' && global && global.mockDriveStorage) {
    if (global.mockDriveStorage[meta.fileId]) {
      jobData = JSON.parse(global.mockDriveStorage[meta.fileId]);
    }
  }

  return {
    jobId: jobId,
    state: meta.state,
    fileId: meta.fileId,
    retryCount: meta.retryCount || 0,
    lastUpdated: meta.lastUpdated,
    workerActive: meta.workerActive || false,
    workerStartedAt: meta.workerStartedAt,
    workerHeartbeatAt: meta.workerHeartbeatAt,
    workerExecutionId: meta.workerExecutionId,
    finalAudit: meta.finalAudit,
    jobData: jobData
  };
}

function saveJobState(job) {
  job.lastUpdated = new Date().toISOString();

  if (typeof DriveApp !== 'undefined') {
    const folder = getOrSetupJobFolder();
    const fileName = `${job.jobId}.json`;
    const payloadStr = JSON.stringify(job.jobData || {});

    if (job.fileId) {
      try {
        const file = DriveApp.getFileById(job.fileId);
        file.setContent(payloadStr);
      } catch (e) {
        Logger.log(`[WARN] Could not update existing file, creating new one. ${e.message}`);
        const file = folder.createFile(fileName, payloadStr, 'application/json');
        job.fileId = file.getId();
      }
    } else {
      const file = folder.createFile(fileName, payloadStr, 'application/json');
      job.fileId = file.getId();
    }
  } else if (typeof DriveApp === 'undefined' && global && global.mockDriveStorage) {
    job.fileId = job.fileId || `mock_file_${job.jobId}`;
    global.mockDriveStorage[job.fileId] = JSON.stringify(job.jobData || {});
  }

  const meta = {
    state: job.state,
    fileId: job.fileId,
    retryCount: job.retryCount,
    lastUpdated: job.lastUpdated,
    workerActive: job.workerActive || false,
    workerStartedAt: job.workerStartedAt,
    workerHeartbeatAt: job.workerHeartbeatAt,
    workerExecutionId: job.workerExecutionId,
    finalAudit: job.finalAudit
  };

  PropertiesService.getScriptProperties().setProperty(getJobPropertyKey(job.jobId), JSON.stringify(meta));
}

function cleanupJobPayload(jobId) {
  const metaRaw = PropertiesService.getScriptProperties().getProperty(getJobPropertyKey(jobId));
  if (!metaRaw) return;
  const meta = JSON.parse(metaRaw);

  if (meta.fileId && typeof DriveApp !== 'undefined') {
    try {
      DriveApp.getFileById(meta.fileId).setTrashed(true);
      Logger.log(`[JOB] Trashed payload file for ${jobId}`);
    } catch(e) {
      Logger.log(`[WARN] Failed to trash file for ${jobId}`);
    }
  }

  // Clean up the main meta property now that audit is retained
  PropertiesService.getScriptProperties().deleteProperty(getJobPropertyKey(jobId));
}

