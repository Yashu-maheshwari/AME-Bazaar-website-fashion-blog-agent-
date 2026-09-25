/**
 * ==============================================================================
 * AME Bazaar Fashion AI Content Engine - Google Apps Script Port
 * Module: WordPressPublisher.gs
 * ==============================================================================
 * WordPress REST API client with Basic Auth & Yoast SEO metadata handling.
 */

/**
 * Builds the Basic Auth header with string trimming and explicit UTF-8 charset.
 * @param {string} username
 * @param {string} password
 * @returns {string}
 */
function buildBasicAuthHeader(username, password) {
  const u = (username || '').trim();
  const p = (password || '').trim();
  if (!u || !p) return '';
  return 'Basic ' + Utilities.base64Encode(u + ':' + p, Utilities.Charset.UTF_8);
}

/**
 * Retrieves the primary WordPress Authorization header from Script Properties.
 * @returns {string}
 */
function getWordPressAuthHeader() {
  const username = getSecret('WORDPRESS_USERNAME');
  const password = getSecret('WORDPRESS_APPLICATION_PASSWORD');
  return buildBasicAuthHeader(username, password);
}

/**
 * Tests WordPress REST API Basic Authentication with safe multi-variant normalization.
 * Does NOT expose or log any credentials.
 * @returns {{success: boolean, username?: string, error?: string, diagnostics?: Object}}
 */
function testWordPressAuth() {
  const rawUrl = getSecret('WORDPRESS_URL', '');
  const rawUser = getSecret('WORDPRESS_USERNAME', '');
  const rawPw = getSecret('WORDPRESS_APPLICATION_PASSWORD', '');

  const diag = {
    urlPresent: !!rawUrl.trim(),
    usernamePresent: !!rawUser.trim(),
    usernameLength: rawUser.trim().length,
    passwordPresent: !!rawPw.trim(),
    passwordLength: rawPw.trim().length,
    variantsTested: 0,
    results: []
  };

  Logger.log(`[DIAGNOSTIC] Config Check: URL=${diag.urlPresent}, User=${diag.usernamePresent} (len:${diag.usernameLength}), Pass=${diag.passwordPresent} (len:${diag.passwordLength})`);

  if (!diag.urlPresent || !diag.usernamePresent || !diag.passwordPresent) {
    const missing = [];
    if (!diag.urlPresent) missing.push('WORDPRESS_URL');
    if (!diag.usernamePresent) missing.push('WORDPRESS_USERNAME');
    if (!diag.passwordPresent) missing.push('WORDPRESS_APPLICATION_PASSWORD');
    const err = `Missing required Script Properties: ${missing.join(', ')}`;
    Logger.log(`[ERROR] ${err}`);
    return { success: false, error: err, diagnostics: diag };
  }

  const wpUrl = rawUrl.trim().replace(/\/$/, '');
  const endpoint = `${wpUrl}/wp-json/wp/v2/users/me`;

  // Build candidate username variants across site users
  const candidateUsers = [
    rawUser.trim(),
    'aapparelmaheshwarienterprises@gmail.com',
    'aapparelmaheshwarienterprisesgmail-com',
    'cute.yashu09@gmail.com',
    'cute-yashu09gmail-com'
  ].filter((v, i, a) => v && a.indexOf(v) === i);

  const cleanPwNoSpaces = rawPw.replace(/\s+/g, '').trim();
  const spaced4444 = cleanPwNoSpaces.match(/.{1,4}/g) ? cleanPwNoSpaces.match(/.{1,4}/g).join(' ') : cleanPwNoSpaces;

  const pwVariants = [
    { label: 'Raw trimmed', val: rawPw.trim() },
    { label: 'Whitespace stripped', val: cleanPwNoSpaces },
    { label: '4-4-4-4 formatted', val: spaced4444 }
  ];

  // Test variants across all candidate usernames
  for (const u of candidateUsers) {
    for (const pObj of pwVariants) {
      diag.variantsTested++;
      const authHeader = buildBasicAuthHeader(u, pObj.val);

      try {
        const res = UrlFetchApp.fetch(endpoint, {
          method: 'get',
          headers: {
            'Authorization': authHeader,
            'User-Agent': 'AME-Bazaar-GAS-Agent/1.0'
          },
          muteHttpExceptions: true
        });

        const status = res.getResponseCode();
        diag.results.push({ variant: pObj.label, usernameTested: u, status: status });

        if (status === 200) {
          const data = JSON.parse(res.getContentText());
          const authedName = data.name || data.slug || u;
          Logger.log(`[SUCCESS] WordPress Authentication verified (HTTP 200)! Matched User: "${u}" (${authedName})`);
          
          // Auto-sync the verified working username into Script Properties
          PropertiesService.getScriptProperties().setProperty('WORDPRESS_USERNAME', u);
          Logger.log(`[CONFIG] Updated Script Property WORDPRESS_USERNAME to "${u}" automatically.`);

          return {
            success: true,
            username: authedName,
            matchedUserLogin: u,
            httpStatus: 200,
            workingVariant: pObj.label,
            diagnostics: diag
          };
        } else {
          Logger.log(`[WARN] User "${u}" with "${pObj.label}" returned HTTP ${status}`);
        }
      } catch (err) {
        diag.results.push({ variant: pObj.label, usernameTested: u, error: err.message });
        Logger.log(`[ERROR] Auth attempt exception for "${u}": ${err.message}`);
      }
    }
  }

  const lastStatus = diag.results.length > 0 ? diag.results[0].status : 'UNKNOWN';
  return {
    success: false,
    error: `WordPress REST API returned HTTP ${lastStatus} for all tested credential formats.`,
    httpStatus: lastStatus,
    diagnostics: diag
  };
}

/**
 * Publishes an article draft (or published post) to WordPress.
 * @param {Object} articleData
 * @param {number|null} mediaId
 * @param {string|null} statusOverride
 * @returns {{id: number, link: string, status: string}}
 */
function publishToWordPress(articleData, mediaId = null, statusOverride = null, topic = null) {
  const wpUrl = getSecret('WORDPRESS_URL').trim().replace(/\/$/, '');
  const authHeader = getWordPressAuthHeader();

  if (!wpUrl || !authHeader) {
    throw new Error('Missing WordPress credentials in Script Properties.');
  }

  // Resolve and map Categories to Controlled Taxonomy
  const categoryNames = [];
  if (articleData.primaryCategory) {
    categoryNames.push(mapToControlledTaxonomy(articleData.primaryCategory));
  }
  if (Array.isArray(articleData.secondaryCategories)) {
    articleData.secondaryCategories.forEach(c => {
      categoryNames.push(mapToControlledTaxonomy(c));
    });
  }
  
  const categoryIds = [];
  const uniqueNames = [...new Set(categoryNames)];
  uniqueNames.forEach(name => {
    const cid = getOrCreateWordPressCategory(name);
    if (cid && cid !== 1) { // ID 1 is Uncategorized
      categoryIds.push(cid);
    }
  });

  if (categoryIds.length === 0) {
    throw new Error('Category resolution failed: No valid controlled category resolved and Uncategorized is prohibited.');
  }

  Logger.log(`[WP] Resolved category IDs for publishing: ${categoryIds.join(', ')}`);

  // Idempotency: Reconcile using deterministic slug before creating a post.
  const slugToCheck = articleData.slug;
  const searchUrl = `${wpUrl}/wp-json/wp/v2/posts?slug=${encodeURIComponent(slugToCheck)}&status=any`;
  try {
    const searchRes = UrlFetchApp.fetch(searchUrl, {
      method: 'get',
      headers: {
        'Authorization': authHeader,
        'User-Agent': 'AME-Bazaar-GAS-Agent/1.0'
      },
      muteHttpExceptions: true
    });
    
    if (searchRes.getResponseCode() === 200) {
      const existingPosts = JSON.parse(searchRes.getContentText());
      if (existingPosts && existingPosts.length > 0) {
        const existing = existingPosts[0];
        Logger.log(`[WP] Reconciled existing post found by slug "${slugToCheck}". Post ID: ${existing.id}. Skipping duplicate creation.`);
        return {
          id: existing.id,
          link: existing.link,
          status: existing.status,
          author: existing.author
        };
      }
    }
  } catch (err) {
    Logger.log(`[WARN] Idempotency post search failed: ${err.message}`);
  }

  const postStatus = statusOverride || WP_POST_STATUS;
  const url = `${wpUrl}/wp-json/wp/v2/posts`;

  const payload = {
    title: articleData.title,
    content: articleData.contentHtml,
    slug: articleData.slug,
    status: postStatus,
    author: getAuthorId(), // Always assigns public author to User ID 2 ("AME Bazaar")
    featured_media: mediaId,
    categories: categoryIds,
    meta: {
      _yoast_wpseo_title: articleData.seoTitle || articleData.title,
      _yoast_wpseo_metadesc: articleData.metaDescription || '',
      _yoast_wpseo_focuskw: articleData.focusKeyword || (topic && topic.focusKeyword) || ''
    }
  };

  const res = UrlFetchApp.fetch(url, {
    method: 'post',
    headers: {
      'Authorization': authHeader,
      'Content-Type': 'application/json',
      'User-Agent': 'AME-Bazaar-GAS-Agent/1.0'
    },
    payload: JSON.stringify(payload),
    muteHttpExceptions: true
  });

  const statusCode = res.getResponseCode();
  const resText = res.getContentText();

  if (statusCode !== 201 && statusCode !== 200) {
    throw new Error(`WordPress REST API returned status ${statusCode}: ${resText}`);
  }

  const result = JSON.parse(resText);
  Logger.log(`[WP] Article post successfully created! Post ID: ${result.id}, Author ID: ${result.author}, Status: ${result.status}, Link: ${result.link}`);

  return {
    id: result.id,
    link: result.link,
    status: result.status,
    author: result.author
  };
}

/**
 * Updates an existing WordPress post's author ID.
 * @param {number} postId
 * @param {number} authorId
 * @returns {boolean}
 */
function updatePostAuthor(postId, authorId) {
  const wpUrl = getSecret('WORDPRESS_URL').trim().replace(/\/$/, '');
  const authHeader = getWordPressAuthHeader();
  if (!wpUrl || !authHeader || !postId) return false;

  const url = `${wpUrl}/wp-json/wp/v2/posts/${postId}`;
  const res = UrlFetchApp.fetch(url, {
    method: 'post',
    headers: {
      'Authorization': authHeader,
      'Content-Type': 'application/json',
      'User-Agent': 'AME-Bazaar-GAS-Agent/1.0'
    },
    payload: JSON.stringify({ author: authorId }),
    muteHttpExceptions: true
  });

  const ok = res.getResponseCode() === 200;
  Logger.log(`[WP] Updated Post ID ${postId} author to User ID ${authorId}: HTTP ${res.getResponseCode()}`);
  return ok;
}

/**
 * Updates a WordPress user's public bio/description.
 * @param {number} userId
 * @param {string} bioText
 * @returns {boolean}
 */
function updateUserBio(userId, bioText) {
  const wpUrl = getSecret('WORDPRESS_URL').trim().replace(/\/$/, '');
  const authHeader = getWordPressAuthHeader();
  if (!wpUrl || !authHeader || !userId) return false;

  const url = `${wpUrl}/wp-json/wp/v2/users/${userId}`;
  const res = UrlFetchApp.fetch(url, {
    method: 'post',
    headers: {
      'Authorization': authHeader,
      'Content-Type': 'application/json',
      'User-Agent': 'AME-Bazaar-GAS-Agent/1.0'
    },
    payload: JSON.stringify({ description: bioText }),
    muteHttpExceptions: true
  });

  const ok = res.getResponseCode() === 200;
  Logger.log(`[WP] Updated User ID ${userId} bio: HTTP ${res.getResponseCode()}`);
  return ok;
}

/**
 * One-time setup utility to fix existing Post ID 7845 and configure User 2 author bio.
 */
function fixExistingPostAuthor() {
  Logger.log('=== Updating Public Author for Post 7845 and User 2 Bio ===');
  const bio = "AME Bazaar Fashion Team — sharing local fashion trends, styling ideas, fabric guidance, and family fashion inspiration for Delhi shoppers.";
  
  // 1. Update User 2 Bio
  const userOk = updateUserBio(2, bio);
  
  // 2. Update Post 7845 Author to User 2 ("AME Bazaar")
  const postOk = updatePostAuthor(7845, 2);

  const result = {
    userBioUpdated: userOk,
    postAuthorUpdated: postOk,
    authorName: "AME Bazaar",
    authorId: 2
  };
  Logger.log(`[RESULT] Fix Existing Post Author: ${JSON.stringify(result)}`);
  return result;
}

/**
 * Permanently deletes a WordPress post by ID.
 * @param {number} postId
 * @returns {boolean}
 */
function deleteWordPressPost(postId) {
  const wpUrl = getSecret('WORDPRESS_URL').trim().replace(/\/$/, '');
  const authHeader = getWordPressAuthHeader();

  if (!wpUrl || !authHeader || !postId) return false;

  const url = `${wpUrl}/wp-json/wp/v2/posts/${postId}?force=true`;
  const res = UrlFetchApp.fetch(url, {
    method: 'delete',
    headers: {
      'Authorization': authHeader,
      'User-Agent': 'AME-Bazaar-GAS-Agent/1.0'
    },
    muteHttpExceptions: true
  });

  return res.getResponseCode() === 200;
}

let wpCategoryCache = null;

/**
 * Maps any input category string to our 16 canonical controlled categories.
 * @param {string} catName
 * @returns {string}
 */
function mapToControlledTaxonomy(catName) {
  const c = (catName || '').toLowerCase().trim();
  
  if (c.includes("ladies") || c.includes("women") || c.includes("female")) {
    return "Ladies Wear";
  }
  if (c.includes("gents") || c.includes("men") || c.includes("male") || c.includes("groom")) {
    return "Gents Wear";
  }
  if (c.includes("boys") || c.includes("boy")) {
    return "Boys Wear";
  }
  if (c.includes("girls") || c.includes("girl")) {
    return "Girls Wear";
  }
  if (c.includes("kids") || c.includes("kid") || c.includes("children")) {
    return "Kids Wear";
  }
  if (c.includes("family")) {
    return "Family Fashion";
  }
  if (c.includes("ethnic") || c.includes("traditional") || c.includes("salwar") || c.includes("kurti") || c.includes("saree") || c.includes("sari")) {
    return "Ethnic Wear";
  }
  if (c.includes("western") || c.includes("smart casual") || c.includes("casual")) {
    return "Western Wear";
  }
  if (c.includes("winter") || c.includes("sweater") || c.includes("wool")) {
    return "Winter Wear";
  }
  if (c.includes("summer") || c.includes("cotton") || c.includes("heat")) {
    return "Summer Wear";
  }
  if (c.includes("wedding") || c.includes("occasion") || c.includes("festive") || c.includes("celebration")) {
    return "Wedding & Occasion Wear";
  }
  if (c.includes("trends")) {
    return "Fashion Trends";
  }
  if (c.includes("styling") || c.includes("tips") || c.includes("guides")) {
    return "Styling Tips";
  }
  if (c.includes("tailoring") || c.includes("alteration") || c.includes("stitching") || c.includes("fit")) {
    return "Tailoring & Alterations";
  }
  if (c.includes("care") || c.includes("wash") || c.includes("laundry")) {
    return "Garment Care";
  }
  if (c.includes("local") || c.includes("kirari") || c.includes("mubarakpur") || c.includes("delhi")) {
    return "Local Fashion / Kirari";
  }
  
  return "Fashion Trends"; // fallback
}

/**
 * Fetches categories from WordPress to populate a case-insensitive name-to-ID cache.
 * @returns {Object}
 */
function fetchAllWordPressCategories() {
  if (wpCategoryCache) return wpCategoryCache;
  const wpUrl = getSecret('WORDPRESS_URL').trim().replace(/\/$/, '');
  const authHeader = getWordPressAuthHeader();
  if (!wpUrl || !authHeader) return {};

  const url = `${wpUrl}/wp-json/wp/v2/categories?per_page=100`;
  try {
    const res = UrlFetchApp.fetch(url, {
      method: 'get',
      headers: { 'Authorization': authHeader, 'User-Agent': 'AME-Bazaar-GAS-Agent/1.0' },
      muteHttpExceptions: true
    });
    if (res.getResponseCode() === 200) {
      const cats = JSON.parse(res.getContentText());
      const cache = {};
      cats.forEach(c => {
        cache[c.name.toLowerCase()] = c.id;
      });
      wpCategoryCache = cache;
      return wpCategoryCache;
    }
  } catch (e) {
    Logger.log(`[WARN] Failed to fetch WordPress categories: ${e.message}`);
  }
  return {};
}

/**
 * Resolves a category name to a WordPress category ID (creating it if absent).
 * @param {string} name
 * @returns {number|null}
 */
function getOrCreateWordPressCategory(name) {
  if (!name) return null;
  const cache = fetchAllWordPressCategories();
  const lowerName = name.toLowerCase();
  if (cache[lowerName]) {
    return cache[lowerName];
  }

  const wpUrl = getSecret('WORDPRESS_URL').trim().replace(/\/$/, '');
  const authHeader = getWordPressAuthHeader();
  if (!wpUrl || !authHeader) return null;

  const url = `${wpUrl}/wp-json/wp/v2/categories`;
  try {
    Logger.log(`[WP] Category "${name}" not found. Creating it...`);
    const res = UrlFetchApp.fetch(url, {
      method: 'post',
      headers: {
        'Authorization': authHeader,
        'Content-Type': 'application/json',
        'User-Agent': 'AME-Bazaar-GAS-Agent/1.0'
      },
      payload: JSON.stringify({ name: name }),
      muteHttpExceptions: true
    });
    const status = res.getResponseCode();
    if (status === 201 || status === 200) {
      const data = JSON.parse(res.getContentText());
      Logger.log(`[WP] Category "${name}" created successfully. ID: ${data.id}`);
      cache[lowerName] = data.id;
      return data.id;
    } else {
      Logger.log(`[WARN] Failed to create WP category "${name}": HTTP ${status} - ${res.getContentText()}`);
    }
  } catch (e) {
    Logger.log(`[WARN] Exception while creating WP category "${name}": ${e.message}`);
  }
  return null;
}

