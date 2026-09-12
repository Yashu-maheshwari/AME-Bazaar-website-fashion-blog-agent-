/**
 * ==============================================================================
 * AME Bazaar Fashion AI Content Engine - Google Apps Script Port
 * Module: WooCommerceCta.gs
 * ==============================================================================
 * WooCommerce product lookup and responsive localized CTA Block generation.
 */

/**
 * Fetches matching or general products dynamically from WooCommerce REST API.
 * @param {string} category
 * @returns {Array<{name: string, price: string, link: string, image: string}>}
 */
function getRelatedProducts(category = "General") {
  const wpUrl = getSecret('WORDPRESS_URL').trim().replace(/\/$/, '');
  const authHeader = getWordPressAuthHeader();

  if (!wpUrl || !authHeader) {
    Logger.log('[WARN] WordPress credentials not set; skipping live WooCommerce product query.');
    return [];
  }

  const headers = { 
    'Authorization': authHeader,
    'User-Agent': 'AME-Bazaar-GAS-Agent/1.0'
  };

  try {
    // 1. Search category term ID
    const cleanCat = category.replace(/[^a-zA-Z0-9]/g, '-').toLowerCase();
    const catUrl = `${wpUrl}/wp-json/wp/v2/product_cat?slug=${encodeURIComponent(cleanCat)}`;
    
    let catId = null;
    try {
      const catRes = UrlFetchApp.fetch(catUrl, { headers: headers, muteHttpExceptions: true });
      if (catRes.getResponseCode() === 200) {
        const cats = JSON.parse(catRes.getContentText());
        if (Array.isArray(cats) && cats.length > 0 && cats[0].id) {
          catId = cats[0].id;
          Logger.log(`[WOO] Found matching category ID: ${catId} for "${category}"`);
        }
      }
    } catch (e) {
      Logger.log(`[WARN] Category term lookup failed: ${e.message}`);
    }

    // 2. Query products by category or general
    const productQueryUrl = catId
      ? `${wpUrl}/wp-json/wc/v3/products?category=${catId}&per_page=6`
      : `${wpUrl}/wp-json/wc/v3/products?per_page=6`;

    const prodRes = UrlFetchApp.fetch(productQueryUrl, { headers: headers, muteHttpExceptions: true });
    if (prodRes.getResponseCode() === 200) {
      const prods = JSON.parse(prodRes.getContentText());
      if (Array.isArray(prods) && prods.length > 0) {
        const business = getBusinessConfig();
        return prods.map(p => ({
          name: p.name || 'Fashion Item',
          price: p.price ? `₹${p.price}` : 'Contact Us',
          link: p.permalink || `${business.websiteUrl}/shop`,
          image: (p.images && p.images[0]) ? p.images[0].src : ''
        }));
      }
    }
  } catch (err) {
    Logger.log(`[WARN] WooCommerce live product query error: ${err.message}`);
  }

  return [];
}

/**
 * Generates the complete responsive CTA HTML block.
 * @param {string} category
 * @returns {string} HTML string
 */
function generateCtaBlock(category) {
  const business = getBusinessConfig();
  const products = getRelatedProducts(category);
  let productsSectionHtml = '';

  if (products.length > 0) {
    const productsCardsHtml = products.map(p => `
      <div style="border: 1px solid #e2e8f0; border-radius: 8px; padding: 12px; margin: 8px 0; display: flex; gap: 12px; align-items: center; background: #fff;">
        ${p.image ? `<img src="${p.image}" alt="${p.name}" style="width: 50px; height: 50px; object-fit: cover; border-radius: 4px;" />` : ''}
        <div style="flex: 1;">
          <strong style="color: #1a202c; font-size: 15px; display: block;">${p.name}</strong>
          <span style="color: #e53e3e; font-weight: bold; font-size: 14px;">${p.price}</span>
        </div>
        <a href="${p.link}" target="_blank" style="background: #e53e3e; color: #fff; padding: 6px 12px; border-radius: 4px; text-decoration: none; font-size: 13px; font-weight: bold;">Inquire</a>
      </div>
    `).join('');

    productsSectionHtml = `
      <div style="margin-top: 20px;">
        <h4 style="margin: 0 0 10px; color: #2d3748; font-size: 16px; border-bottom: 1px solid #e2e8f0; padding-bottom: 5px;">🛍️ Related Products in ${category}</h4>
        ${productsCardsHtml}
      </div>
    `;
  }

  const cleanPhone = (business.phoneNumber || '').replace(/[^0-9+]/g, '');
  const cleanWa = (business.whatsAppNumber || '').replace(/[^0-9]/g, '');

  return `
    <hr style="border: 0; border-top: 2px dashed #cbd5e0; margin: 40px 0;" />
    <div id="ame-bazaar-cta-block" style="font-family: system-ui, -apple-system, sans-serif; background: #f7fafc; border: 2px solid #e2e8f0; border-radius: 12px; padding: 24px; max-width: 650px; margin: 30px auto; box-shadow: 0 4px 6px rgba(0,0,0,0.05);">
      <h3 style="margin-top: 0; color: #2d3748; font-size: 22px; text-align: center; border-bottom: 2px solid #e53e3e; padding-bottom: 10px;">🛍️ Visit ${business.businessName}</h3>
      <p style="font-size: 15px; color: #4a5568; line-height: 1.6; text-align: center;">
        ${business.defaultCtaText}
      </p>
      <div style="margin: 20px 0; display: flex; flex-wrap: wrap; gap: 10px; justify-content: center;">
        <a href="tel:${cleanPhone}" style="background: #2b6cb0; color: white; padding: 10px 18px; border-radius: 6px; text-decoration: none; font-weight: bold; font-size: 14px;">📞 Call Store</a>
        <a href="https://wa.me/${cleanWa}?text=I%20am%20interested%20in%20your%20fashion%20catalog" target="_blank" style="background: #38a169; color: white; padding: 10px 18px; border-radius: 6px; text-decoration: none; font-weight: bold; font-size: 14px;">💬 WhatsApp Chat</a>
        <a href="${business.googleReviewsUrl}" target="_blank" style="background: #dd6b20; color: white; padding: 10px 18px; border-radius: 6px; text-decoration: none; font-weight: bold; font-size: 14px;">⭐ Google Reviews</a>
      </div>
      <div style="background: #edf2f7; border-radius: 8px; padding: 15px; margin-bottom: 20px;">
        <h4 style="margin: 0 0 8px; color: #2d3748; font-size: 16px;">👔 Custom Tailoring Service</h4>
        <p style="margin: 0; color: #4a5568; font-size: 14px; line-height: 1.5;">
          ${business.tailoringServiceInfo}
        </p>
      </div>
      ${productsSectionHtml}
      <p style="font-size: 12px; color: #718096; text-align: center; margin: 20px 0 0;">
        📍 Address: ${business.storeAddress}
      </p>
    </div>
  `;
}
