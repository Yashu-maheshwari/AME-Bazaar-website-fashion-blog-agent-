# AME Bazaar Theme Project Summary

This document summarizes the architecture of the AME Bazaar WordPress theme after inspecting the source files in the workspace. No theme logic or template code was changed.

## 1. Project Overview
- The project is a modular Astra child theme located under [wp-content/themes/ame-bazaar](wp-content/themes/ame-bazaar).
- The theme is structured as a storefront system with reusable components, custom templates, and business-logic modules rather than a single monolithic template.
- Its primary goals are local retail presentation, WooCommerce storefront conversion, AI discoverability, schema/SEO enhancement, and business-profile-driven content rendering.

## 2. Folder Architecture
- [wp-content/themes/ame-bazaar/functions.php](wp-content/themes/ame-bazaar/functions.php) is the central bootstrap file.
- [wp-content/themes/ame-bazaar/inc](wp-content/themes/ame-bazaar/inc) contains the core PHP logic modules:
  - [inc/setup.php](wp-content/themes/ame-bazaar/inc/setup.php) for theme support and menus.
  - [inc/enqueue.php](wp-content/themes/ame-bazaar/inc/enqueue.php) for scripts and styles.
  - [inc/helpers.php](wp-content/themes/ame-bazaar/inc/helpers.php) for shared utility functions.
  - [inc/admin-operations.php](wp-content/themes/ame-bazaar/inc/admin-operations.php) for business settings, media manager, and admin dashboards.
  - [inc/woocommerce.php](wp-content/themes/ame-bazaar/inc/woocommerce.php) for storefront and product card customization.
  - [inc/homepage-functions.php](wp-content/themes/ame-bazaar/inc/homepage-functions.php) for homepage section registration.
  - [inc/schema.php](wp-content/themes/ame-bazaar/inc/schema.php), [inc/seo.php](wp-content/themes/ame-bazaar/inc/seo.php), and [inc/content-framework.php](wp-content/themes/ame-bazaar/inc/content-framework.php) for search engine and semantic content support.
- [wp-content/themes/ame-bazaar/components](wp-content/themes/ame-bazaar/components) stores reusable UI sections such as header, footer, reviews, blog, local entity cards, and homepage modules.
- [wp-content/themes/ame-bazaar/templates](wp-content/themes/ame-bazaar/templates) contains template pages for about, FAQ, AI advisor, authority, reviews, and topic-cluster content.
- [wp-content/themes/ame-bazaar/woocommerce](wp-content/themes/ame-bazaar/woocommerce) contains theme overrides for WooCommerce templates and product experience.

## 3. Theme Workflow and Runtime Pattern
- The theme loads its modules from [functions.php](wp-content/themes/ame-bazaar/functions.php) at startup.
- Core runtime hooks are registered through WordPress actions such as `after_setup_theme`, `init`, `wp_head`, and `template_redirect`.
- The homepage is rendered through the `ame_bazaar_homepage` action hook, which pulls in each homepage section in a defined order.
- Non-homepage pages use dedicated template files and shared component parts for consistent rendering.
- The site also creates and maintains custom pages dynamically on initialization, such as AI advisor, FAQ, authority pages, and review request pages.

## 4. Business Settings Design
- Business information is centralized through the `ame_bazaar_get_business_setting()` helper in [inc/admin-operations.php](wp-content/themes/ame-bazaar/inc/admin-operations.php).
- The theme stores many retail values in WordPress options, including store name, phone, address, hours, WhatsApp, maps URLs, Google Business profile fields, and availability toggles.
- A dedicated admin page for “Business Settings” lets the store owner manage the business profile without editing templates.
- The settings system has fallback defaults so the storefront remains functional even when no values are configured.

## 5. Media Mapping and Visual Asset System
- Media assets are managed through a curated option-based mapping system in [inc/admin-operations.php](wp-content/themes/ame-bazaar/inc/admin-operations.php).
- The theme stores attachment IDs for important images such as logos, hero banners, category banners, tailoring imagery, and 404 visuals.
- The admin interface under “Homepage Media Manager” allows the site owner to map uploaded media library items to theme sections.
- Helper functions in [inc/helpers.php](wp-content/themes/ame-bazaar/inc/helpers.php) resolve image URLs and HTML output from those settings.
- The system also includes automatic mapping and metadata optimization for AI and crawler readability.

## 6. AI Discoverability and Semantic Authority Layer
- The theme includes a dedicated AI fashion advisor experience in [templates/template-ai-advisor.php](wp-content/themes/ame-bazaar/templates/template-ai-advisor.php).
- The AI advisor uses curated FAQ content and structured markup to make the store’s knowledge base more understandable to crawlers and AI systems.
- Semantic authority pages are generated through [templates/template-authority.php](wp-content/themes/ame-bazaar/templates/template-authority.php), which uses slug-based content mapping and dynamic FAQ selection.
- The blog content workflow also supports topic-cluster posts via [templates/template-topic-cluster.php](wp-content/themes/ame-bazaar/templates/template-topic-cluster.php), with internal linking and related article navigation.
- The site exposes a dynamic [llms.txt](wp-content/themes/ame-bazaar/llms.txt) route and an AI-focused content profile for machine readability.

## 7. Schema and SEO Architecture
- Schema output is handled by [inc/schema.php](wp-content/themes/ame-bazaar/inc/schema.php) and related SEO hooks in [inc/seo.php](wp-content/themes/ame-bazaar/inc/seo.php).
- The theme injects business metadata, Open Graph tags, and structured FAQ/Question/Answer markup.
- Product SEO is dynamically enhanced using manual admin meta overrides (`_ame_seo_title`, `_ame_seo_desc`, `_ame_canonical_url`, and `_ame_og_image`) on single product views to bypass generic fallbacks when set.
- A custom `Product` entity is built and dynamically hooked into the connected JSON-LD `@graph` during product page loading. All 30+ custom specifications (GSM, pattern, fit, wash instructions, whatsapp commerce status, local availability) are mapped as machine-readable `additionalProperty` nodes for AI search agent discoverability.
- The FAQ templates and authority pages are intentionally built to be both user-facing and machine-readable.

## 8. Homepage Architecture
- The homepage entry point is [front-page.php](front-page.php), which outputs the main homepage shell.
- The actual section order is registered by [inc/homepage-functions.php](inc/homepage-functions.php) through the `ame_bazaar_homepage` action.
- The homepage features modular components, including the custom-styled `Boys Wear` and `Girls Wear` categories (split from the unified `Kids Wear`), and the premium `Local Trust Section` (incorporating 8 dynamic trust cards and a compact AI Authority badges row linked to GBP review forms, Google Maps navigation, and WhatsApp ordering).
- This architecture keeps the homepage modular and easy to rearrange by changing hook priorities or swapping template parts.

## 9. WooCommerce Architecture
- Renders product listings using a custom `ame-product-card` structure.
- Displays discount badges, bestseller flags, and stock status indicators.
- Integrates a production-grade 8-parent category hierarchy (Men, Women, Boys, Girls Wear, Sarees, Accessories, Footwear, and Tailoring Services) complete with semantic child sub-categories for navigation and search.
- Surfaces 30+ manual custom fields organized into 6 admin panels (Basic Product, Garment Specifications, Sizing & Pricing, Manufacturing & Care, SEO, and AI & GEO) under the product options general tab.
- Standardizes metadata properties (Gender, Age Group, Fit, Sleeve, Neck, Pattern, Occasion, Season, Fabric, and Price Segment) using select dropdown arrays to ensure absolute consistency for database storage and future n8n automation syncing.
- The theme replaces the default product loop markup with a custom card structure, hover actions, badges, and local retail messaging.
- Product pages and archives are enhanced with recently viewed products, mini-cart behavior, and a premium empty-state experience.
- Single product page template experience is fully overhauled with a dynamic highlights summary box, custom-rendered specifications table, conditional sizing charts, store guarantees, metadata-driven FAQs, and a mobile-first sticky purchase bar with WhatsApp inquiry CTA.
- Breadcrumbs dynamically resolve the complete ancestors hierarchy for both products and taxonomy archives.
- Category listings pages (PLP) feature an advanced Category Hero (name, desc, SEO intro, count), an automated multi-level Child Category Discovery grid (with count, desc, badges, starting prices), a horizontal Quick-Filters chip bar (New, Best, price range, fabric, season), a side-by-side specifications filters sidebar, dynamic looping cards with gallery hovers, trust badges, discount calculators, and a custom empty state with Notify Me alert hooks.

## 10. Dynamic Page Generation and Maintenance Guide
- The theme creates important pages and templates on initialization, including AI advisor, FAQ, authority pages, contact, and review-request pages.
- It also injects theme-level defaults and flushes rewrite rules when these pages are added or updated.
- Maintenance should focus on three areas:
  1. Business settings and media mappings in the admin panel.
  2. FAQ content and authority page content for AI/discovery relevance.
  3. WooCommerce product metadata and custom fields for product SEO and merchandising.
- When editing this theme, the safest entry points are [functions.php](wp-content/themes/ame-bazaar/functions.php), [inc/admin-operations.php](wp-content/themes/ame-bazaar/inc/admin-operations.php), [inc/homepage-functions.php](wp-content/themes/ame-bazaar/inc/homepage-functions.php), and [inc/woocommerce.php](wp-content/themes/ame-bazaar/inc/woocommerce.php).
