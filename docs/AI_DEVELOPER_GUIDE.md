# AI Developer Guide for AME Bazaar

This document is the permanent engineering manual for AME Bazaar. It is intended for future AI agents and human developers working in this repository.

## 1. Project Philosophy
- AME Bazaar is a local retail storefront first, not a generic blog or e-commerce theme.
- The project must feel trustworthy, local, human, and conversion-oriented.
- Content should be useful to both users and machines: search engines, AI assistants, and local discovery systems.
- Every change should preserve three priorities:
  1. Storefront usability
  2. SEO / GEO / AI discoverability
  3. Safe, maintainable WordPress architecture
- Prefer modular, reusable, and low-risk changes over wide rewrites.
- Do not introduce unnecessary complexity.

## 2. Folder Responsibilities
- [wp-content/themes/ame-bazaar/functions.php](wp-content/themes/ame-bazaar/functions.php): central bootstrap file that loads modules.
- [wp-content/themes/ame-bazaar/inc](wp-content/themes/ame-bazaar/inc): core logic and business rules.
  - [wp-content/themes/ame-bazaar/inc/setup.php](wp-content/themes/ame-bazaar/inc/setup.php): theme setup, menus, image sizes, theme features.
  - [wp-content/themes/ame-bazaar/inc/enqueue.php](wp-content/themes/ame-bazaar/inc/enqueue.php): CSS and JS loading.
  - [wp-content/themes/ame-bazaar/inc/helpers.php](wp-content/themes/ame-bazaar/inc/helpers.php): shared helpers and reusable utilities.
  - [wp-content/themes/ame-bazaar/inc/admin-operations.php](wp-content/themes/ame-bazaar/inc/admin-operations.php): business settings, admin pages, media manager, custom product fields.
  - [wp-content/themes/ame-bazaar/inc/homepage-functions.php](wp-content/themes/ame-bazaar/inc/homepage-functions.php): homepage section registration.
  - [wp-content/themes/ame-bazaar/inc/woocommerce.php](wp-content/themes/ame-bazaar/inc/woocommerce.php): WooCommerce behavior and custom product loop.
  - [wp-content/themes/ame-bazaar/inc/schema.php](wp-content/themes/ame-bazaar/inc/schema.php): schema output logic.
  - [wp-content/themes/ame-bazaar/inc/seo.php](wp-content/themes/ame-bazaar/inc/seo.php): SEO and metadata output.
  - [wp-content/themes/ame-bazaar/inc/content-framework.php](wp-content/themes/ame-bazaar/inc/content-framework.php): structured content helpers.
  - [wp-content/themes/ame-bazaar/inc/faq-data.php](wp-content/themes/ame-bazaar/inc/faq-data.php): FAQ knowledge base data.
- [wp-content/themes/ame-bazaar/components](wp-content/themes/ame-bazaar/components): reusable UI blocks and page sections.
- [wp-content/themes/ame-bazaar/templates](wp-content/themes/ame-bazaar/templates): full-page templates for specialized pages.
- [wp-content/themes/ame-bazaar/woocommerce](wp-content/themes/ame-bazaar/woocommerce): WooCommerce template overrides.
- [wp-content/themes/ame-bazaar/assets](wp-content/themes/ame-bazaar/assets): theme JS/CSS assets.
- [wp-content/themes/ame-bazaar/style.css](wp-content/themes/ame-bazaar/style.css): theme stylesheet and metadata.

## 3. Coding Standards
- Write clean, readable PHP and WordPress-compatible code.
- Follow existing coding style and indentation patterns already used in the theme.
- Keep functions small and focused.
- Prefer hooks and template parts over hardcoded duplication.
- Reuse existing helpers before creating new ones.
- Escape output consistently.
- Sanitize input and validate user-submitted values.
- Preserve backward compatibility whenever possible.
- Avoid introducing new dependencies unless required and justified.
- Do not make broad architectural changes without documenting intent.

## 4. Naming Conventions
- Use the theme prefix `ame_bazaar_` for custom functions, hooks, classes, and options.
- Use lowercase snake_case for PHP functions, variables, and option keys.
- Use descriptive names that reflect business or storefront purpose.
- Use WordPress-standard hook names and template part names.
- Prefer explicit names such as `ame_bazaar_get_business_setting()` over vague names.
- Keep option names consistent with the existing pattern, such as `ame_bazaar_media_*` and `ame_bazaar_*`.

## 5. Media Management Workflow
- Media should be managed through the WordPress Media Library and mapped through the media manager workflow in [wp-content/themes/ame-bazaar/inc/admin-operations.php](wp-content/themes/ame-bazaar/inc/admin-operations.php).
- Do not hardcode image URLs when an attachment ID or option-based mapping can be used.
- Use the existing helper functions in [wp-content/themes/ame-bazaar/inc/helpers.php](wp-content/themes/ame-bazaar/inc/helpers.php) for image output.
- When adding new visual assets:
  1. Upload to Media Library
  2. Add or update the appropriate mapping option
  3. Ensure alt text, caption, and description are meaningful
  4. Verify the front-end renders correctly
- Preserve image accessibility and avoid placeholder or generic file names.

## 6. SEO & GEO Rules
- The site must be optimized for both search engines and geographic discovery.
- Keep business information consistent across the site, especially name, address, phone, hours, and maps links.
- Do not contradict the store’s local positioning.
- Prefer factual, local, and useful language over promotional fluff.
- Maintain consistent business details in the admin settings and template output.
- Preserve local relevance in page titles, headings, FAQs, and structured data.

## 7. AI Discoverability Rules
- Content should be understandable to AI systems, search engines, and assistants.
- Favor clear structure, descriptive headings, and FAQ-style content.
- Keep topic clusters and authority pages semantically organized.
- Use the existing AI-focused routes and template patterns rather than inventing new ones.
- Any content intended for AI or assistant consumption should remain factual and well-structured.
- Use schema and FAQ markup where appropriate.

## 8. Schema Rules
- Schema should be added intentionally and semantically, not randomly.
- Use the existing schema layer in [wp-content/themes/ame-bazaar/inc/schema.php](wp-content/themes/ame-bazaar/inc/schema.php) as the primary integration point.
- FAQ content should use appropriate Question/Answer structure when relevant.
- Business, local entity, and product metadata should remain consistent with the rest of the site.
- Avoid duplicate or conflicting schema structures.

## 9. WordPress Best Practices
- Use theme hooks and template parts rather than editing core WordPress behavior.
- Respect WordPress action/filter patterns.
- Keep template logic readable and avoid overloading single files.
- Use `get_template_part()` for reusable sections.
- Use `wp_enqueue_*` for scripts and styles.
- Avoid direct database writes unless absolutely necessary and well justified.
- When creating pages dynamically, do so through WordPress APIs and existing theme hooks.
- Flush rewrites only when necessary and only after page creation or slug changes.

## 10. WooCommerce Rules
- Respect the existing custom storefront experience in [wp-content/themes/ame-bazaar/inc/woocommerce.php](wp-content/themes/ame-bazaar/inc/woocommerce.php).
- Do not break the custom product card, hover actions, or local retail messaging.
- Preserve local commerce cues such as tailoring availability, pickup messaging, and store-based value.
- Product metadata should remain consistent with the admin custom fields and storefront presentation.
- Do not replace the WooCommerce flow with a generic template unless the change is explicitly approved.

## 11. Performance Rules
- Keep page weight reasonable and avoid unnecessary scripts.
- Prefer lightweight templates and optimized images.
- Avoid repeated expensive queries where cached or precomputed data is available.
- When adding logic, consider database and rendering impact.
- Preserve fast rendering for homepage, archives, and product pages.
- Do not add heavy client-side behavior unless it clearly improves UX.

## 12. Security Rules
- Never trust user input.
- Escape output and sanitize input in all cases.
- Avoid exposing sensitive logic or admin operations to unauthenticated users.
- Use WordPress nonces and capability checks for forms and admin actions.
- Do not introduce insecure direct file handling or remote requests without review.
- Keep business settings and media mapping actions restricted to authorized users.

## 13. Git Workflow
- Do not make changes to existing code without first understanding the current implementation.
- Keep edits scoped and intentional.
- Prefer small, reviewable changes.
- If a change is risky or broad, document it before implementing.
- Do not commit or push unless explicitly requested.
- Before finalizing work, review the changed files and confirm they match the intended scope.

## 14. Deployment Workflow
- Treat the local workspace as the source of truth until deployment is requested.
- Verify changes locally before any deployment step.
- Preserve theme structure, media mappings, and content assumptions during deployment.
- Ensure that any new page templates, media mappings, or settings are compatible with the deployment environment.
- Avoid deploying without validating the storefront and key templates.

## 15. How to Add a New Feature Safely
1. Read the relevant existing module before editing.
2. Identify the correct hook, template part, or helper.
3. Add the feature in the smallest possible surface area.
4. Preserve existing UX, SEO, and schema behavior.
5. Verify that the feature does not break the homepage, WooCommerce, or dynamic pages.
6. Document the feature if it introduces new business logic or admin settings.

## 16. How to Update the Homepage Safely
- The homepage should be updated through the section hook system in [wp-content/themes/ame-bazaar/inc/homepage-functions.php](wp-content/themes/ame-bazaar/inc/homepage-functions.php).
- Do not bypass the modular structure unless absolutely necessary.
- Preserve ordering, spacing, and component consistency.
- Ensure any new homepage section still supports responsive behavior and local brand messaging.
- Verify the change in the context of the front page template [wp-content/themes/ame-bazaar/front-page.php](wp-content/themes/ame-bazaar/front-page.php).

## 17. How to Add Blogs Safely
- Blog content should follow the topic-cluster and local-entity patterns already used in the theme.
- Use the existing blog-related components and templates rather than creating ad hoc page markup.
- Preserve internal linking, related content, and FAQ integration.
- Keep article structure readable, factual, and aligned with the store’s retail identity.
- If a new blog requires special page behavior, use the existing topic-cluster template pattern.

## 18. How to Update Products Safely
- Product updates should preserve the existing WooCommerce custom loop and product metadata flow.
- Review custom product fields and any product-related SEO logic before editing.
- Keep product descriptions aligned with the store’s local business facts.
- Avoid changing pricing logic, inventory behavior, or cart flow without careful review.
- Maintain consistency between product data, templates, and schema signals.

## 19. Files That Should Never Be Modified Without Review
These files are central to the theme’s architecture and should be treated as high-impact:
- [wp-content/themes/ame-bazaar/functions.php](wp-content/themes/ame-bazaar/functions.php)
- [wp-content/themes/ame-bazaar/inc/admin-operations.php](wp-content/themes/ame-bazaar/inc/admin-operations.php)
- [wp-content/themes/ame-bazaar/inc/homepage-functions.php](wp-content/themes/ame-bazaar/inc/homepage-functions.php)
- [wp-content/themes/ame-bazaar/inc/woocommerce.php](wp-content/themes/ame-bazaar/inc/woocommerce.php)
- [wp-content/themes/ame-bazaar/inc/schema.php](wp-content/themes/ame-bazaar/inc/schema.php)
- [wp-content/themes/ame-bazaar/inc/seo.php](wp-content/themes/ame-bazaar/inc/seo.php)
- [wp-content/themes/ame-bazaar/front-page.php](wp-content/themes/ame-bazaar/front-page.php)
- [wp-content/themes/ame-bazaar/style.css](wp-content/themes/ame-bazaar/style.css)
- [wp-content/themes/ame-bazaar/templates/template-ai-advisor.php](wp-content/themes/ame-bazaar/templates/template-ai-advisor.php)
- [wp-content/themes/ame-bazaar/templates/template-authority.php](wp-content/themes/ame-bazaar/templates/template-authority.php)

## 20. Future Roadmap for AME Bazaar
- Continue strengthening local SEO and structured data coverage.
- Expand AI discoverability through richer FAQ, authority, and topic-cluster content.
- Improve homepage modularity while preserving visual consistency.
- Improve media management and automated asset mapping.
- Deepen WooCommerce merchandising and product storytelling.
- Keep the theme aligned with local retail operations and conversion goals.
- Preserve maintainability for future AI and human contributors.
