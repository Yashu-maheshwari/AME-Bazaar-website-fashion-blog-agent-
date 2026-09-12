# INFRASTRUCTURE.md - System Infrastructure & Services

- **Last Updated:** 2026-07-14
- **Version:** 1.0.0
- **Owner:** AME Bazaar AI OS Core
- **Purpose:** Documents the underlying server environments, hosting setups, and database systems.
- **Dependencies:** None
- **Status:** Active

---

## 1. Hosting Environment
- **Platform:** WordPress Hosting
- **PHP Version:** 8.0+
- **Database Engine:** MySQL 8.0+ / MariaDB 10.5+
- **SSL Certificate:** Let's Encrypt Wildcard SSL (HTTPS enforced)

## 2. WordPress Theme & Core Stack
- **CMS:** WordPress Core (WordPress 6.x+)
- **Parent Theme:** Astra Theme (Latest Stable Version)
- **Child Theme:** Astra Child Theme (`theme/astra-child/`)
- **Key Plugins (Future):** RankMath SEO, WooCommerce, WhatsApp Business Chat.

## 3. Deployment Pipeline
1. **Local Development:** Developers edit files locally or inside AI workspaces.
2. **Version Control:** All revisions pushed to feature branches on GitHub.
3. **Continuous Integration:** Github Actions verify CSS/PHP syntax (Future).
4. **Staging / Production Sync:** Manual/automated SFTP or Git sync deployment to hosting server.
