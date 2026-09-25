/**
 * ==============================================================================
 * AME Bazaar Fashion AI Content Engine - Google Apps Script Port
 * Module: JobWorker.gs
 * ==============================================================================
 * Core worker for processing resilient, resumable daily jobs.
 */




function scheduleContinuation() {
  const triggers = ScriptApp.getProjectTriggers();
  let hasContinuation = false;
  for (const trigger of triggers) {
    if (trigger.getHandlerFunction() === 'processPublishingJob') {
      hasContinuation = true;
      break;
    }
  }
  if (!hasContinuation) {
    ScriptApp.newTrigger('processPublishingJob')
      .timeBased()
      .after(1 * 60 * 1000)
      .create();
    Logger.log('[JOB] Scheduled continuation trigger for processPublishingJob.');
  } else {
    Logger.log('[JOB] Continuation trigger already exists.');
  }
}

function processPublishingJob(e) {
  initScriptExecutionTimer();
  Logger.log('[JOB] Starting processPublishingJob worker...');
  
  const todayStr = Utilities.formatDate(new Date(), "Asia/Kolkata", "yyyy-MM-dd");
  const jobId = `AME-FASHION-BLOG-${todayStr}`;
  let job = loadJobState(jobId);
  
  if (!job) {
    Logger.log(`[JOB] No job found for ${jobId}. Exiting.`);
    return;
  }
  
  if (job.state === JOB_STATES.DONE || job.state === JOB_STATES.FAILED_PERMANENT) {
    Logger.log(`[JOB] Job ${jobId} is already in terminal state ${job.state}. Exiting.`);
    return;
  }
  
  if (job.state === JOB_STATES.RETRY_WAIT) {
    const lastUpdated = new Date(job.lastUpdated).getTime();
    const now = new Date().getTime();
    if (now - lastUpdated < 5 * 60 * 1000) {
      Logger.log(`[JOB] Job ${jobId} is in RETRY_WAIT. Not enough time has passed.`);
      return;
    }
    Logger.log(`[JOB] RETRY_WAIT expired, resuming...`);
    job.state = job.jobData.previousState || JOB_STATES.QUEUED;
  }
  
  try {
    while (job.state !== JOB_STATES.DONE && job.state !== JOB_STATES.FAILED_PERMANENT) {
      // 90-120 seconds reserve
      if (!hasExecutionBudget(100000)) {
        Logger.log(`[JOB] Insufficient execution budget (< 100s). Checkpointing ${job.state} and scheduling continuation...`);
        saveJobState(job);
        scheduleContinuation();
        return;
      }
      
      Logger.log(`[JOB] Processing state: ${job.state}`);
      
      switch(job.state) {
        case JOB_STATES.QUEUED:
          const queueResult = pickTopicFromQueue();
          if (!queueResult || !queueResult.topic) {
             throw new Error("No topics available in queue.");
          }
          job.jobData.topic = queueResult.topic;
          job.jobData.topicAttemptCount = (job.jobData.topicAttemptCount || 0) + 1;
          job.jobData.repairAttempt = 0;
          job.state = JOB_STATES.TOPIC_SELECTED;
          saveJobState(job);
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
          saveJobState(job);
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
             
             // Strip blob out to prevent massive json parsing fail, will refetch dynamically on upload
             if (imgData && imgData.blob) {
                delete imgData.blob;
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
          saveJobState(job);
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
               if (job.jobData.topicAttemptCount >= MAX_TOPIC_ATTEMPTS) {
                 throw new Error(`Failed to generate passing article after ${MAX_TOPIC_ATTEMPTS} topics.`);
               }
               job.state = JOB_STATES.QUEUED;
            } else {
               job.state = JOB_STATES.TOPIC_SELECTED;
            }
          }
          saveJobState(job);
          break;
          
        case JOB_STATES.QUALITY_PASSED:
          let mediaId = null;
          const finalEval = job.jobData.finalEvalData;
          const imgD = job.jobData.imgData;
          
          if (imgD && imgD.url) {
             Logger.log(`[JOB] Fetching blob for upload from: ${imgD.url}`);
             const fetchRes = UrlFetchApp.fetch(imgD.url, {muteHttpExceptions: true});
             if (fetchRes.getResponseCode() === 200) {
               const blobToUpload = fetchRes.getBlob();
               mediaId = uploadMediaToWordPress(
                 blobToUpload,
                 finalEval.imageFilename || `${finalEval.slug}.webp`,
                 {
                   title: finalEval.imageTitle || finalEval.title,
                   altText: finalEval.imageAltText || `Fashion feature for ${finalEval.title}`,
                   caption: (imgD.attribution && imgD.attribution.creditHtml) ? imgD.attribution.creditHtml : (imgD.caption || ''),
                   description: finalEval.imageDescription || ''
                 }
               );
             } else {
               Logger.log(`[WARN] Failed to re-fetch blob. Status: ${fetchRes.getResponseCode()}`);
             }
          }
          job.jobData.mediaId = mediaId;
          job.state = JOB_STATES.MEDIA_UPLOADED;
          saveJobState(job);
          break;
          
        case JOB_STATES.MEDIA_UPLOADED:
          const pFinal = job.jobData.finalEvalData;
          const pTopic = job.jobData.topic;
          pFinal.focusKeyword = pFinal.focusKeyword || pTopic.focusKeyword;
          
          const wpResult = publishToWordPress(pFinal, job.jobData.mediaId, null, pTopic);
          job.jobData.wpResult = wpResult;
          
          job.state = JOB_STATES.WP_PUBLISHED;
          saveJobState(job);
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
          saveJobState(job);
          break;
          
        case JOB_STATES.PUBLISH_VERIFIED:
          job.state = JOB_STATES.DONE;
          saveJobState(job);
          cleanupJobPayload(job.jobId);
          Logger.log(`[JOB] Job ${job.jobId} completed successfully.`);
          break;
      }
    }
  } catch (err) {
    Logger.log(`[JOB] Exception in state ${job.state}: ${err.message}`);
    job.jobData.previousState = job.state;
    job.retryCount = (job.retryCount || 0) + 1;
    
    if (job.retryCount > 3) {
      job.state = JOB_STATES.FAILED_PERMANENT;
      Logger.log(`[JOB] Permanent failure for ${job.jobId} after ${job.retryCount} retries.`);
    } else {
      job.state = JOB_STATES.RETRY_WAIT;
      scheduleContinuation();
    }
    saveJobState(job);
  }
}

function watchdogTrigger() {
  Logger.log('[WATCHDOG] Checking stuck jobs...');
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
  
  const lastUpdated = new Date(job.lastUpdated).getTime();
  const now = new Date().getTime();
  const inactiveMs = now - lastUpdated;
  
  if (inactiveMs > 10 * 60 * 1000) {
    Logger.log(`[WATCHDOG] Job ${jobId} inactive for > 10 mins. Resuming worker...`);
    const triggers = ScriptApp.getProjectTriggers();
    for (const trigger of triggers) {
      if (trigger.getHandlerFunction() === 'processPublishingJob') {
        ScriptApp.deleteTrigger(trigger);
      }
    }
    scheduleContinuation();
  } else {
    Logger.log(`[WATCHDOG] Job ${jobId} is active (last updated ${inactiveMs/1000}s ago).`);
  }
}

