/**
 * ==============================================================================
 * AME Bazaar Fashion AI Content Engine - Google Apps Script Port
 * Module: SchemaGenerator.gs
 * ==============================================================================
 * JSON-LD Structured Data Schema generation (Article & FAQPage).
 */

/**
 * Builds the Organization Schema.org object.
 * @returns {Object}
 */
function buildOrganizationSchema() {
  const business = getBusinessConfig();
  const sameAsList = [];

  // Real verified URLs only - e.g. GBP URL / Google Maps URL
  if (business.googleBusinessProfileUrl && business.googleBusinessProfileUrl.startsWith('http')) {
    sameAsList.push(business.googleBusinessProfileUrl);
  }
  if (business.googleMapsUrl && business.googleMapsUrl.startsWith('http') && !sameAsList.includes(business.googleMapsUrl)) {
    sameAsList.push(business.googleMapsUrl);
  }

  const org = {
    "@context": "https://schema.org",
    "@type": "Organization",
    "@id": "https://amebazaar.in/#organization",
    "name": business.businessName || "AME Bazaar",
    "url": business.websiteUrl || "https://amebazaar.in",
    "logo": {
      "@type": "ImageObject",
      "@id": (business.websiteUrl || "https://amebazaar.in") + "/#logo",
      "url": business.logoUrl || "https://amebazaar.in/wp-content/themes/ame-bazaar/assets/images/logo.png",
      "caption": business.businessName || "AME Bazaar"
    }
  };

  if (sameAsList.length > 0) {
    org.sameAs = sameAsList;
  }

  return org;
}

/**
 * Builds the Article Schema.org object.
 * @param {Object} articleData
 * @returns {Object}
 */
function buildArticleSchema(articleData) {
  const business = getBusinessConfig();
  const baseUrl = business.websiteUrl || "https://amebazaar.in";
  const articleUrl = (articleData.link && articleData.link !== 'DRY_RUN' && articleData.link.startsWith('http'))
    ? articleData.link
    : `${baseUrl}/${articleData.slug ? articleData.slug + '/' : ''}`;

  const nowIso = new Date().toISOString();
  const datePublished = articleData.datePublished || nowIso;
  const dateModified = articleData.dateModified || articleData.datePublished || nowIso;

  return {
    "@context": "https://schema.org",
    "@type": "Article",
    "@id": `${articleUrl}#article`,
    "isPartOf": {
      "@type": "WebPage",
      "@id": articleUrl
    },
    "headline": articleData.title,
    "description": articleData.metaDescription || "",
    "image": {
      "@type": "ImageObject",
      "url": articleData.imageUrl || `${baseUrl}/wp-content/uploads/${articleData.imageFilename || (articleData.slug + '.webp')}`,
      "caption": articleData.imageAltText || articleData.title || ""
    },
    "datePublished": datePublished,
    "dateModified": dateModified,
    "mainEntityOfPage": {
      "@type": "WebPage",
      "@id": articleUrl
    },
    "author": {
      "@id": "https://amebazaar.in/#organization"
    },
    "publisher": {
      "@id": "https://amebazaar.in/#organization"
    }
  };
}

/**
 * Builds the BreadcrumbList Schema.org object.
 * @param {Object} articleData
 * @returns {Object}
 */
function buildBreadcrumbSchema(articleData) {
  const business = getBusinessConfig();
  const baseUrl = business.websiteUrl || "https://amebazaar.in";
  const articleUrl = (articleData.link && articleData.link !== 'DRY_RUN' && articleData.link.startsWith('http'))
    ? articleData.link
    : `${baseUrl}/${articleData.slug ? articleData.slug + '/' : ''}`;

  const categoryName = articleData.primaryCategory || articleData.category || "Fashion";
  const categorySlug = categoryName.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
  const categoryUrl = `${baseUrl}/category/${categorySlug}/`;

  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    "itemListElement": [
      {
        "@type": "ListItem",
        "position": 1,
        "name": "Home",
        "item": baseUrl
      },
      {
        "@type": "ListItem",
        "position": 2,
        "name": categoryName,
        "item": categoryUrl
      },
      {
        "@type": "ListItem",
        "position": 3,
        "name": articleData.title,
        "item": articleUrl
      }
    ]
  };
}

/**
 * Builds the FAQPage Schema.org object.
 * Returns null if no FAQs are present (prevents empty FAQ schema).
 * @param {Array<{question: string, answer: string}>} faqs
 * @returns {Object|null}
 */
function buildFaqSchema(faqs = []) {
  if (!faqs || !Array.isArray(faqs) || faqs.length === 0) {
    return null;
  }
  return {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    "mainEntity": faqs.map(faq => ({
      "@type": "Question",
      "name": faq.question,
      "acceptedAnswer": {
        "@type": "Answer",
        "text": faq.answer
      }
    }))
  };
}

/**
 * Builds unified @graph Schema containing Organization, Article, BreadcrumbList, and optional FAQPage.
 * @param {Object} articleData
 * @returns {Object}
 */
function buildGraphSchema(articleData) {
  const org = buildOrganizationSchema();
  const article = buildArticleSchema(articleData);
  const breadcrumb = buildBreadcrumbSchema(articleData);
  const faq = buildFaqSchema(articleData.faqs || []);

  const orgItem = Object.assign({}, org);
  delete orgItem["@context"];

  const articleItem = Object.assign({}, article);
  delete articleItem["@context"];

  const breadcrumbItem = Object.assign({}, breadcrumb);
  delete breadcrumbItem["@context"];

  const graph = [orgItem, articleItem, breadcrumbItem];

  if (faq) {
    const faqItem = Object.assign({}, faq);
    delete faqItem["@context"];
    graph.push(faqItem);
  }

  return {
    "@context": "https://schema.org",
    "@graph": graph
  };
}

/**
 * Appends JSON-LD script blocks directly to the article HTML.
 * Includes duplicate prevention guard.
 * @param {string} html
 * @param {Object} articleData
 * @returns {string}
 */
function appendStructuredDataSchemas(html, articleData) {
  if (!html) html = '';
  if (html.includes('<!-- Structured Data Schemas -->') || html.includes('application/ld+json')) {
    return html;
  }

  const graphSchema = buildGraphSchema(articleData);

  const schemaHtml = `
    <!-- Structured Data Schemas -->
    <script type="application/ld+json">${JSON.stringify(graphSchema, null, 2)}</script>
  `;

  return html + schemaHtml;
}
