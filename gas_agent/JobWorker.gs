/**
 * ==============================================================================
 * AME Bazaar Fashion AI Content Engine - Google Apps Script Port
 * Module: JobWorker.gs
 * ==============================================================================
 * Core worker for processing resilient, resumable daily jobs.
 */

function calculateBackoffDelay(retryCount) {
  // 1m, 2m, 5m, 10m, 20m, 30m, 60m capped at 60m
  const delays = [1, 2, 5, 10, 20, 30, 60];
  const mins = delays[Math.min(retryCount, delays.length - 1)];
  return mins * 60 * 1000;
}

function scheduleContinuation(delayMs) {
  const triggers = ScriptApp.getProjectTriggers();
  let hasContinuation = false;
  for (const trigger of triggers) {
    if (trigger.getHandlerFunction() === 'processPublishingJob') {
      hasContinuation = true;
      break;
    }
  }
  if (!hasContinuation) {
    const defaultDelay = 1 * 60 * 1000;
    const finalDelay = delayMs || defaultDelay;
    ScriptApp.newTrigger('processPublishingJob')
      .timeBased()
      .after(finalDelay)
      .create();
    Logger.log(`[JOB] Scheduled continuation trigger for processPublishingJob after ${finalDelay}ms.`);
  } else {
    Logger.log('[JOB] Continuation trigger already exists.');
  }
}

function updateHeartbeat(job) {
  job.workerHeartbeatAt = new Date().toISOString();
  saveJobState(job);
}

function processPublishingJob(e) {
  initScriptExecutionTimer();
  Logger.log('[JOB] Starting processPublishingJob worker...');

  const lock = LockService.getScriptLock();
  try {
    if (!lock.tryLock(10000)) { // 10 seconds wait
      Logger.log('[JOB] Another worker is active. Could not acquire lock. Exiting immediately.');
      return;
    }
  } catch (err) {
    Logger.log('[JOB] LockService error, but proceeding in dry-run/test mode if applicable: ' + err.message);
  }

  const executionId = Utilities.getUuid ? Utilities.getUuid() : Math.random().toString(36).substring(2);
  const todayStr = Utilities.formatDate(new Date(), "Asia/Kolkata", "yyyy-MM-dd");
  const jobId = `AME-FASHION-BLOG-${todayStr}`;
  let job = loadJobState(jobId);

  if (!job) {
    Logger.log(`[JOB] No job found for ${jobId}. Exiting.`);
    if (typeof lock.releaseLock === 'function') lock.releaseLock();
    return;
  }

  if (job.state === JOB_STATES.DONE || job.state === JOB_STATES.FAILED_PERMANENT) {
    Logger.log(`[JOB] Job ${jobId} is already in terminal state ${job.state}. Exiting.`);
    if (typeof lock.releaseLock === 'function') lock.releaseLock();
    return;
  }

  const now = new Date().getTime();

  if (job.state === JOB_STATES.RETRY_WAIT) {
    const lastUpdated = new Date(job.lastUpdated).getTime();
    const delayMs = calculateBackoffDelay(job.retryCount || 0);
    if (now - lastUpdated < delayMs) {
      Logger.log(`[JOB] Job ${jobId} is in RETRY_WAIT. Backoff of ${delayMs/60000}m not yet elapsed.`);
      if (typeof lock.releaseLock === 'function') lock.releaseLock();
      return;
    }
    Logger.log(`[JOB] RETRY_WAIT expired, resuming...`);
    job.state = job.jobData.previousState || JOB_STATES.QUEUED;
  }

  // Acquire lease
  job.workerActive = true;
  job.workerStartedAt = new Date().toISOString();
  job.workerHeartbeatAt = job.workerStartedAt;
  job.workerExecutionId = executionId;
  saveJobState(job);

  try {
    while (job.state !== JOB_STATES.DONE && job.state !== JOB_STATES.FAILED_PERMANENT) {
      // 90-120 seconds reserve
      if (!hasExecutionBudget(100000)) {
        Logger.log(`[JOB] Insufficient execution budget (< 100s). Checkpointing ${job.state} and scheduling continuation...`);
        job.workerActive = false; // Relinquish lease before exiting cleanly
        saveJobState(job);
        scheduleContinuation(1000); // Resume shortly
        if (typeof lock.releaseLock === 'function') lock.releaseLock();
        return;
      }

      updateHeartbeat(job);
      Logger.log(`[JOB] Processing state: ${job.state}`);

      switch(job.state) {
        case JOB_STATES.QUEUED:
          const queueResult = selectNextTopic();
          if (!queueResult || !queueResult.topic) {
             throw new Error("No topics available in queue.");
          }
          job.jobData.topic = queueResult.topic;
          job.jobData.topicAttemptCount = (job.jobData.topicAttemptCount || 0) + 1;
          job.jobData.repairAttempt = 0;
          job.state = JOB_STATES.TOPIC_SELECTED;
          updateHeartbeat(job);
          break;

        case JOB_STATES.TOPIC_SELECTED:
        case JOB_STATES.FAILED_RETRYABLE:
          const topic = job.jobData.topic;
          const repairAttempt = job.jobData.repairAttempt || 0;
          let generated = null;
          let articleData = null;

          if (repairAttempt === 0) {
            const systemPrompt = buildContentPrompt(topic);
            generated = callGemini(systemPrompt, 3, false);
            articleData = cleanAndParseJson(generated.text);
          } else {
             let rawJsonStr = JSON.stringify(job.jobData.articleData || {});
             const repairPrompt = buildRepairPrompt(topic, job.jobData.seoIssues || [], rawJsonStr);
             generated = callGemini(repairPrompt, 2, false);
             articleData = cleanAndParseJson(generated.text);
             const oldData = job.jobData.articleData || {};
             for (const k in articleData) { oldData[k] = articleData[k]; }
             articleData = oldData;
          }

          if (!articleData.primaryCategory && topic.category) {
            articleData.primaryCategory = topic.category;
          }
          if ((!articleData.secondaryCategories || articleData.secondaryCategories.length === 0) && topic.secondaryCategories) {
            articleData.secondaryCategories = topic.secondaryCategories;
          }

          job.jobData.articleData = articleData;
          job.state = JOB_STATES.CONTENT_GENERATED;
          updateHeartbeat(job);
          break;

        case JOB_STATES.CONTENT_GENERATED:
          const aData = job.jobData.articleData;
          const t = job.jobData.topic;
          if (!aData.imageSemanticBrief) {
             aData.imageSemanticBrief = deriveImageSemanticBrief(t, aData);
          }
          const queries = (aData.imageSemanticBrief && aData.imageSemanticBrief.imageSearchQueries) || aData.imageSearchQueries || [t.focusKeyword + ' ' + t.category];

          let imgData = job.jobData.imgData;
          if (!imgData || imgData.isFallback) {
             imgData = fetchTopicSpecificImage(queries, t.category, t.focusKeyword, aData.imageSemanticBrief, aData.imageAltText, aData.imageDescription, t.title);

             if (imgData && imgData.blob) {
                delete imgData.blob; // Strip blob out to prevent massive json parsing fail
             }
             job.jobData.imgData = imgData;
          }

          if (imgData) {
            aData.imageUrl = imgData.url;
            aData.isFallbackImage = imgData.isFallback;
            if (imgData.filename) {
               aData.imageFilename = imgData.filename;
               aData.imageAltText = imgData.altText;
               aData.imageDescription = imgData.description;
               aData.imageTitle = imgData.title;
            }
          }
          job.jobData.articleData = aData;
          job.state = JOB_STATES.IMAGE_SELECTED;
          updateHeartbeat(job);
          break;

        case JOB_STATES.IMAGE_SELECTED:
          const evalAData = job.jobData.articleData;
          const evalT = job.jobData.topic;

          const evalDataClone = JSON.parse(JSON.stringify(evalAData));
          const ctaBlockHtml = generateCtaBlock(evalT.category);
          evalDataClone.contentHtml = appendStructuredDataSchemas((evalDataClone.contentHtml || '') + ctaBlockHtml, evalDataClone);

          const seoReport = runSeoAudit(evalDataClone, evalT.focusKeyword, false);
          job.jobData.seoReport = seoReport;
          job.jobData.seoIssues = seoReport.issues || [];

          if (seoReport.score >= 90 && !seoReport.hardFailure) {
            job.jobData.finalEvalData = evalDataClone;
            job.state = JOB_STATES.QUALITY_PASSED;
          } else {
            job.jobData.repairAttempt = (job.jobData.repairAttempt || 0) + 1;
            if (job.jobData.repairAttempt > MAX_REPAIR_ATTEMPTS) {
               Logger.log(`[JOB] Topic failed quality after ${MAX_REPAIR_ATTEMPTS} repairs. Discarding topic.`);
               Logger.log(`[JOB] Attempt count for today is now ${job.jobData.topicAttemptCount}. Re-queueing for fresh topic.`);
               job.state = JOB_STATES.QUEUED;
            } else {
               job.state = JOB_STATES.TOPIC_SELECTED;
            }
          }
          updateHeartbeat(job);
          break;

        case JOB_STATES.QUALITY_PASSED:
          let mediaId = null;
          const finalEval = job.jobData.finalEvalData;
          const imgD = job.jobData.imgData;

          if (imgD && imgD.url) {
             const targetFilename = finalEval.imageFilename || `${finalEval.slug}.webp`;

             Logger.log(`[JOB] Idempotency check for media: ${targetFilename}`);
             const checkUrl = `${getWordPressUrl()}/wp-json/wp/v2/media?search=${encodeURIComponent(targetFilename)}`;
             const headers = getWordPressHeaders();
             const checkRes = UrlFetchApp.fetch(checkUrl, { headers: headers, muteHttpExceptions: true });
             let mediaExists = false;
             if (checkRes.getResponseCode() === 200) {
                 const mediaList = JSON.parse(checkRes.getContentText());
                 for (const m of mediaList) {
                     // Verify exact match on title or filename logic
                     if (m.source_url && m.source_url.indexOf(targetFilename) !== -1 && m.slug === targetFilename.replace(/\.[^/.]+$/, "")) {
                         mediaId = m.id;
                         mediaExists = true;
                         Logger.log(`[JOB] Media EXACT MATCH already exists with ID: ${mediaId}. Reusing.`);
                         break;
                     }
                 }
             }

             if (!mediaExists) {
               Logger.log(`[JOB] Fetching blob for upload from: ${imgD.url}`);
               const fetchRes = UrlFetchApp.fetch(imgD.url, {muteHttpExceptions: true});
               if (fetchRes.getResponseCode() === 200) {
                 const blobToUpload = fetchRes.getBlob();
                 mediaId = uploadMediaToWordPress(
                   blobToUpload,
                   targetFilename,
                   {
                     title: finalEval.imageTitle || finalEval.title,
                     altText: finalEval.imageAltText || `Fashion feature for ${finalEval.title}`,
                     caption: (imgD.attribution && imgD.attribution.creditHtml) ? imgD.attribution.creditHtml : (imgD.caption || ''),
                     description: finalEval.imageDescription || ''
                   }
                 );
               } else {
                 throw new Error(`Failed to re-fetch blob. Status: ${fetchRes.getResponseCode()}`);
               }
             }
          }
          job.jobData.mediaId = mediaId;
          job.state = JOB_STATES.MEDIA_UPLOADED;
          updateHeartbeat(job);
          break;

        case JOB_STATES.MEDIA_UPLOADED:
          const pFinal = job.jobData.finalEvalData;
          const pTopic = job.jobData.topic;
          pFinal.focusKeyword = pFinal.focusKeyword || pTopic.focusKeyword;

          let postId = null;
          let postLink = null;

          Logger.log(`[JOB] Idempotency check for post slug: ${pFinal.slug}`);
          const postCheckUrl = `${getWordPressUrl()}/wp-json/wp/v2/posts?slug=${encodeURIComponent(pFinal.slug)}&status=any`;
          const pHeaders = getWordPressHeaders();
          const pCheckRes = UrlFetchApp.fetch(postCheckUrl, { headers: pHeaders, muteHttpExceptions: true });
          if (pCheckRes.getResponseCode() === 200) {
             const postList = JSON.parse(pCheckRes.getContentText());
             for (const pt of postList) {
                 if (pt.slug === pFinal.slug) {
                     postId = pt.id;
                     postLink = pt.link;
                     Logger.log(`[JOB] Post EXACT MATCH already exists with ID: ${postId}. Reusing.`);
                     break;
                 }
             }
          }

          let wpResult = null;
          if (postId && postLink) {
              wpResult = { id: postId, link: postLink };
          } else {
              wpResult = publishToWordPress(pFinal, job.jobData.mediaId, null, pTopic);
          }

          job.jobData.wpResult = wpResult;
          job.state = JOB_STATES.WP_PUBLISHED;
          updateHeartbeat(job); // IMMEDIATELY update after post creation
          break;

        case JOB_STATES.WP_PUBLISHED:
          const finalWp = job.jobData.wpResult;
          const finalTopic = job.jobData.topic;

          let gbpResult = { success: false, postId: "NONE" };
          if (finalWp && finalWp.link) {
            gbpResult = publishToGoogleBusinessProfile(job.jobData.finalEvalData, finalWp.link);
          }

          const dailyHistory = getDailyExecutionHistory();
          dailyHistory[todayStr] = {
            publishedAt: new Date().toISOString(),
            topic: finalTopic.title,
            postId: finalWp.id,
            link: finalWp.link,
            gbpPostId: gbpResult.postId || "NONE"
          };
          saveDailyExecutionHistory(dailyHistory);

          recordPublishedTopic(finalTopic, {
            postId: finalWp.id,
            link: finalWp.link,
            gbpPostId: gbpResult.postId || "NONE"
          });

          job.state = JOB_STATES.PUBLISH_VERIFIED;
          updateHeartbeat(job);
          break;

        case JOB_STATES.PUBLISH_VERIFIED:
          const jDate = new Date();
          const finalAudit = {
            jobId: job.jobId,
            targetDate: todayStr,
            topic: job.jobData.topic ? job.jobData.topic.title : "UNKNOWN",
            focusKeyword: job.jobData.topic ? job.jobData.topic.focusKeyword : "UNKNOWN",
            postId: job.jobData.wpResult ? job.jobData.wpResult.id : null,
            postUrl: job.jobData.wpResult ? job.jobData.wpResult.link : null,
            mediaId: job.jobData.mediaId,
            publishedAt: job.jobData.wpResult ? jDate.toISOString() : null,
            finalState: "DONE",
            attemptCount: job.jobData.topicAttemptCount || 1,
            completedAt: jDate.toISOString()
          };

          job.state = JOB_STATES.DONE;
          job.workerActive = false;
          job.finalAudit = finalAudit;

          PropertiesService.getScriptProperties().setProperty(
            `AME_JOB_AUDIT_${todayStr}`,
            JSON.stringify(finalAudit)
          );

          saveJobState(job);

          cleanupJobPayload(job.jobId);
          Logger.log(`[JOB] Job ${job.jobId} completed successfully.`);
          break;
      }
    }
  } catch (err) {
    Logger.log(`[JOB] Exception in state ${job.state}: ${err.message}`);

    if (err.message.includes("(Unrecoverable validation)")) {
       job.state = JOB_STATES.FAILED_PERMANENT;
       job.workerActive = false;
       saveJobState(job);
       Logger.log(`[JOB] Permanent failure for ${job.jobId}: ${err.message}`);
    } else {
       job.jobData.previousState = job.state;
       job.retryCount = (job.retryCount || 0) + 1;
       job.state = JOB_STATES.RETRY_WAIT;
       job.workerActive = false;
       saveJobState(job);

       const delayMs = calculateBackoffDelay(job.retryCount);
       scheduleContinuation(delayMs);
    }
  } finally {
    if (job.workerActive) {
      job.workerActive = false;
      saveJobState(job);
    }
    if (typeof lock.releaseLock === 'function') {
      lock.releaseLock();
    }
  }
}

function watchdogTrigger() {
  if (typeof repairTriggers === 'function') {
    repairTriggers();
  }
  Logger.log('[WATCHDOG] Checking stuck jobs...');

  const lock = LockService.getScriptLock();
  try {
    if (!lock.tryLock(5000)) { // 5 seconds wait
      Logger.log('[WATCHDOG] Watchdog lock could not be acquired. Exiting.');
      return;
    }
  } catch (err) {
    Logger.log('[WATCHDOG] LockService error, but proceeding in dry-run/test mode if applicable.');
  }

  try {
    const todayStr = Utilities.formatDate(new Date(), "Asia/Kolkata", "yyyy-MM-dd");
    const jobId = `AME-FASHION-BLOG-${todayStr}`;
    const job = loadJobState(jobId);

    if (!job) {
      Logger.log('[WATCHDOG] No job found for today. Exiting.');
      return;
    }

    if (job.state === JOB_STATES.DONE || job.state === JOB_STATES.FAILED_PERMANENT) {
      Logger.log(`[WATCHDOG] Job is in terminal state ${job.state}.`);
      return;
    }

    const now = new Date().getTime();

    if (job.state === JOB_STATES.RETRY_WAIT && !job.workerActive) {
       const lastUpdated = new Date(job.lastUpdated).getTime();
       const delayMs = calculateBackoffDelay(job.retryCount || 0);
       if (now - lastUpdated >= delayMs) {
          Logger.log(`[WATCHDOG] Job ${jobId} RETRY_WAIT elapsed but no active worker. Ensuring continuation...`);
          const triggers = ScriptApp.getProjectTriggers();
          for (const trigger of triggers) {
            if (trigger.getHandlerFunction() === 'processPublishingJob') {
              ScriptApp.deleteTrigger(trigger);
            }
          }
          scheduleContinuation(1000);
       }
       return;
    }

    if (job.workerActive) {
       const heartbeatTime = new Date(job.workerHeartbeatAt || job.workerStartedAt || job.lastUpdated).getTime();
       const inactiveMs = now - heartbeatTime; Logger.log('[DEBUG WATCHDOG] heartbeatTime: ' + heartbeatTime + ' inactiveMs: ' + inactiveMs + ' workerActive: ' + job.workerActive);

       if (inactiveMs > 8 * 60 * 1000) {
         Logger.log(`[WATCHDOG] Job ${jobId} active but heartbeat stale for > 8 mins. Clearing lease and resuming...`);
         job.workerActive = false;
         saveJobState(job);

         const triggers = ScriptApp.getProjectTriggers();
         for (const trigger of triggers) {
           if (trigger.getHandlerFunction() === 'processPublishingJob') {
             ScriptApp.deleteTrigger(trigger);
           }
         }
         scheduleContinuation(1000);
       } else {
         Logger.log(`[WATCHDOG] Job ${jobId} has healthy active worker (heartbeat ${inactiveMs/1000}s ago).`);
       }
    } else {
       const heartbeatTime = new Date(job.workerHeartbeatAt || job.workerStartedAt || job.lastUpdated).getTime();
       const inactiveMs = now - heartbeatTime;
       if (inactiveMs > 10 * 60 * 1000) {
         Logger.log(`[WATCHDOG] Job ${jobId} is not DONE but has no active worker. Resuming...`);
         const triggers = ScriptApp.getProjectTriggers();
         for (const trigger of triggers) {
           if (trigger.getHandlerFunction() === 'processPublishingJob') {
             ScriptApp.deleteTrigger(trigger);
           }
         }
         scheduleContinuation(1000);
       }
    }
  } finally {
    if (typeof lock.releaseLock === 'function') {
      lock.releaseLock();
    }
  }
}
