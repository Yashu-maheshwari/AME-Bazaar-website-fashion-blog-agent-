# MASTER_PLAN.md - AME Bazaar AI Operating System

- **Last Updated:** 2026-07-14
- **Version:** 1.0.0
- **Owner:** AME Bazaar AI OS Core
- **Purpose:** Single source of truth for the AME Bazaar Digital Platform (AI Operating System). All development, architectural, and business strategies must align with this plan.
- **Dependencies:** None
- **Status:** Approved

---

## 1. Vision

The **AME Bazaar Digital Platform** is designed to transform Apparel Maheshwari Enterprises (AME Bazaar) from a premium offline family garment store in Kirari, Delhi, into a highly scalable, AI-readable, and omnichannel retail ecosystem. 

Rather than just building a website, this project builds the digital foundation for:
- **Local Dominance:** Establishing the absolute local authority in fashion retail.
- **Omnichannel Integration:** Blending physical in-store shopping with online catalog exploration and order systems.
- **AI Readability:** Ensuring the entire codebase and content structure are highly optimized for AI search engines (ChatGPT, Gemini, Perplexity, Google AI Overviews).
- **Scale:** Laying the foundation for future private labels, franchise support, and PAN India e-commerce expansion.

---

## 2. Business Goals

### Short-Term Goals (Months 1–3)
- Build a premium, highly responsive digital presence.
- Establish strong local brand awareness and trust in Kirari, Delhi.
- Drive foot traffic to the physical store using digital discovery.
- Deploy a stable, production-ready WordPress site with an Astra Child Theme.

### Medium-Term Goals (Months 3–6)
- Launch a complete, high-quality digital product catalog.
- Implement WooCommerce for online ordering and checkouts.
- Achieve page-one rankings for local fashion-related searches via Local SEO.
- Integrate WhatsApp business tools for customer service and support.

### Long-Term Goals (Months 6+)
- Become a nationwide household brand for family fashion.
- Establish a franchise model with multi-location support.
- Launch AME Bazaar Private Label garments.
- Roll out national shipping and fulfillment systems.

---

## 3. 2-Month Roadmap

### Month 1: Core Foundation & Shell
- **Week 1: Foundations & Architecture**
  - Verify and organize project structures (`docs/`, `theme/`, `assets/`).
  - Deploy base CSS layout variables and design tokens.
- **Week 2: Global Header & Navigation**
  - Develop accessible (`WCAG 2.2 AA`), mobile-first header.
  - Implement navigation menu, search bar shell, and breadcrumbs.
- **Week 3: Homepage Showcase**
  - Build the Homepage Hero Banner and Category Grid.
  - Integrate responsive grids for Men's, Women's, and Kids' wear.
- **Week 4: Homepage Sections & Footer**
  - Add testimonials, store details, local maps, and FAQ sections.
  - Deploy global footer and complete the homepage shell.

### Month 2: Content, SEO, & E-commerce Prep
- **Week 5: Blog & Information Pages**
  - Implement responsive Blog Archive and Single templates.
  - Set up About Us, Contact, and Policy pages.
- **Week 6: Technical & Local SEO**
  - Build and inject structured data schema (`LocalBusiness`, `Organization`, `Product`).
  - Optimize metadata, Core Web Vitals, sitemaps, and robots.txt.
- **Week 7: WooCommerce Readiness**
  - Pre-configure Astra styles to match WooCommerce components.
  - Test checkout flow templates (disabled in production until requested).
- **Week 8: Performance Audit, QA & Launch**
  - Optimize image loading (lazy loading, WebP).
  - Perform accessibility and browser compatibility checks.
  - Launch stable version to production.

---

## 4. Current Infrastructure Status

The current technology stack is lightweight, secure, and optimized for performance:
- **Core CMS:** WordPress
- **Base Theme:** Astra (with custom Astra Child Theme)
- **Language Stack:** PHP 8+, HTML5, CSS3, Vanilla JavaScript (minimal jQuery)
- **Deployment Pipeline:** Local testing environment deploying to WordPress server.
- **WooCommerce Status:** Inactive (preconfigured in templates but not yet enabled).
- **Framework Constraint:** React, Vue, Next.js, and SPA frameworks are strictly prohibited to ensure long-term stability and ease of WordPress maintainability.

---

## 5. AI Agent Backlog

The following backlog defines the sequential phases for AI development:
1. `[x]` **Phase 1: Theme Foundation:** Define styling variables, custom functions, and theme directories.
2. `[ ]` **Phase 2: Global Header:** Build the header component, mobile drawer, and menu.
3. `[ ]` **Phase 3: Hero Section:** Implement the responsive home hero layout.
4. `[ ]` **Phase 4: Homepage Sections:** Build the category grids, promo areas, and reviews.
5. `[ ]` **Phase 5: Global Footer:** Code the footers with store details and quick links.
6. `[ ]` **Phase 6: Blog Templates:** Create custom templates for posts and archives.
7. `[ ]` **Phase 7: WooCommerce Setup:** Configure custom e-commerce product layouts.
8. `[ ]` **Phase 8: Technical SEO:** Inject Schema.org markup and build clean XML sitemaps.
9. `[ ]` **Phase 9: Core Web Vitals:** Minify CSS/JS assets and ensure 90+ Lighthouse performance scores.
10. `[ ]` **Phase 10: Final QA & Handover:** Conduct WCAG 2.2 accessibility validation and cross-browser testing.

---

## 6. Income Pipeline Priorities

To ensure sustainable growth, capitalization is prioritized in the following order:
1. **Tier 1: Physical Store Conversions:** Drive high-intent local traffic into the physical storefront using location-based content and Google Business Profile mapping.
2. **Tier 2: WhatsApp Catalog Ordering:** Allow customers to browse online and place orders/inquiries directly via WhatsApp before full checkout is live.
3. **Tier 3: WooCommerce Transactions:** Direct e-commerce sales with online payment gateways.
4. **Tier 4: Private Label & Franchising:** Premium margins from in-house apparel lines and franchise licensing fees.

---

## 7. Rules for Future Development

- **Workflow:** Developers/AI must create a feature branch (`feature/<name>` or `fix/<name>`), work on exactly one feature, compile changes, push to remote, and open a Draft Pull Request. Never merge directly to `main`.
- **CSS Standard:** Mobile-first design, modular stylesheets, no inline CSS, and strict adherence to defined design tokens.
- **PHP/JS Standard:** Secure inputs (sanitize/escape), use WordPress native APIs, and write lightweight vanilla JS over bloated external libraries.
- **Accessibility:** Ensure `WCAG 2.2 AA` compliance. Keyboard navigation and screen reader support are mandatory.
- **AI-Readability:** Maintain clean, structured content hierarchies (H1 -> H2 -> H3) and robust Schema JSON-LD metadata for AI indexing.

---

## 8. Recovery Strategy

To protect the platform against critical errors, the recovery protocol is defined as:
- **Git Rollback:** If a deployment fails, immediately revert the `main` branch to the last tagged stable commit and redeploy.
- **Automated Backups:** Daily database and file backups to a secure remote storage location.
- **Staging Verification:** A staging environment must be used to test database upgrades, new plugins, or theme code before push to production.

---

## 9. GitHub Repository Structure

The codebase is organized as follows:

```text
AME-Bazaar/
├── .github/                   # GitHub Actions workflows and settings
├── assets/                    # Official brand assets (logos, typography, raw images)
│   ├── logo/
│   ├── icons/
│   └── images/
├── docs/                      # Single source of truth documentation (01-15)
├── prompts/                   # Reusable development prompts for AI assistance
├── references/                # UI/UX design references (never copied directly)
├── screenshots/               # Visual records of tested pages
├── theme/
│   └── astra-child/           # Astra Child Theme root
│       ├── style.css          # Theme metadata and primary imports
│       ├── functions.php      # Custom functions and theme setup
│       ├── assets/            # CSS, JS, and image assets utilized by child theme
│       ├── components/        # Reusable PHP UI templates
│       ├── inc/               # Setup files (enqueue, SEO, helpers, security)
│       └── templates/         # Page-specific PHP layout templates
└── README.md                  # Project landing page
```
