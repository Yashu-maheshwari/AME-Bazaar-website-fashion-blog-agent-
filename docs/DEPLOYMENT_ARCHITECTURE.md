# AME Bazaar Deployment Architecture

## Purpose

This document defines a safe, production-ready deployment architecture for AME Bazaar using VS Code, Gemini, GitHub, GitHub Actions, and Hostinger. The design prioritizes reliability, rollback safety, minimal downtime, and strong operational controls.

## Guiding Principles

- Protect production with a strict approval process.
- Deploy only from tested, reviewed, and validated code.
- Keep production backups and rollback paths ready at all times.
- Prefer staged deployment over direct production changes.
- Use automation for quality gates and deployment checks.
- Never deploy without a verified backup and rollback plan.

---

## 1. Local Development (VS Code + Gemini)

### Recommended local workflow

- Use VS Code as the primary editor for theme development.
- Use Gemini for implementation suggestions, debugging help, documentation, and review support.
- Keep all work in a local clone of the repository.
- Use a local WordPress environment for testing before any deployment.

### Local environment standards

- PHP version should match production as closely as possible.
- WordPress version should be maintained consistently.
- Use local database snapshots that can be restored quickly.
- Keep theme assets, plugins, and configuration documented.

### Local development rules

- Never edit production files directly.
- Test all changes locally before opening a pull request.
- Capture screenshots and notes for visual regression checks.
- Avoid making database changes locally without a backup.

---

## 2. Git Repository

### Repository structure

- One repository for the WordPress project.
- Keep all production-safe code under version control.
- Store deployment scripts, CI configuration, and documentation in the repository.

### Repository contents

- WordPress core or managed installation files as appropriate.
- Theme files under the active theme directory.
- Plugin-related configuration when required.
- Deployment scripts and GitHub Actions workflow files.
- Documentation and operational runbooks.

### Repository hygiene

- Use clear commit messages.
- Keep commits focused and atomic.
- Do not commit secrets, credentials, or environment-specific values.
- Use .gitignore to exclude local configs, uploads, and temporary files.

---

## 3. GitHub Branching Strategy

### Recommended strategy: GitHub Flow with protection

Use the following branch model:

- main: production-ready branch
- develop: integration branch for pre-production work
- feature/*: short-lived branches for individual tasks
- hotfix/*: urgent production fixes
- release/*: optional branch for staged release preparation

### Branching rules

- Feature branches branch from develop.
- Pull requests are required before merging into develop or main.
- main is protected and cannot be pushed to directly.
- Production changes must pass CI and manual review before merge.

### Safest production policy

- Merge to develop first for testing.
- Merge to main only when release is approved.
- Use a release branch if a larger batch of changes will be deployed together.

---

## 4. GitHub Actions Workflow

### Core CI/CD workflow

GitHub Actions should automate the following stages:

1. Checkout repository
2. Install dependencies and tooling
3. Run static validation and linting
4. Run automated tests
5. Run browser tests
6. Run Lighthouse checks
7. Build deployment artifact
8. Deploy to staging or production after approval

### Recommended workflow jobs

- validate: PHP linting, JSON validation, file checks
- test: Playwright smoke and regression tests
- performance: Lighthouse audits
- deploy-staging: deploy to staging environment automatically on develop
- deploy-production: deploy to production only after manual approval

### Deployment safety controls

- Require at least one approving reviewer for production deployment.
- Prevent deployment from running if quality checks fail.
- Use environment protections for production.
- Store deployment secrets in GitHub Secrets.

---

## 5. Automated Quality Gate

The quality gate should be mandatory before deployment.

### Required checks

- PHP syntax validation
- WordPress-specific validation checks
- Theme file existence and structure checks
- Playwright smoke tests
- Lighthouse budget checks
- Optional broken-link checks

### Quality gate policy

- No deployment if any required check fails.
- Failure should block deployment and notify the team.
- Successful checks should produce a deployment-ready artifact.

### Suggested pass criteria

- No PHP syntax errors
- No major Playwright failures
- Lighthouse performance score above target threshold
- No critical accessibility or SEO regressions

---

## 6. Playwright Testing

### Purpose

Playwright should be used to validate critical user journeys in a realistic browser environment.

### Recommended coverage

- Homepage loads correctly
- Navigation works
- Product pages render properly
- Cart and checkout paths are functional
- Contact and lead-generation forms submit correctly
- Blog pages load and display correctly
- Key templates render without layout errors

### Test strategy

- Use smoke tests for every deployment
- Use regression tests for major feature changes
- Run tests against a staging environment before production
- Capture screenshots and traces on failure

### Best practice

- Keep Playwright tests stable and non-flaky
- Avoid overtesting minor visual differences
- Prefer a small number of high-value journeys

---

## 7. Lighthouse Testing

### Purpose

Lighthouse should be used to monitor performance, accessibility, SEO, and best practices.

### Recommended thresholds

- Performance: 85+ for production-ready pages
- Accessibility: 90+
- Best Practices: 90+
- SEO: 90+

### Pages to audit

- Homepage
- Product listing page
- Product detail page
- Blog index and article pages
- Contact or lead-generation templates

### Deployment rule

- Production deployment should fail if Lighthouse drops below threshold on critical pages.
- If a known temporary regression exists, document a waiver and review it before release.

---

## 8. PHP Linting

### Purpose

PHP linting ensures there are no syntax errors before deployment.

### Recommended validation

- Run php -l against all PHP files in the theme and custom modules
- Validate PHP files in both the theme and any custom includes
- Fail the build on any syntax issue

### Best practice

- Run linting on every pull request and deployment workflow
- Keep linting fast and simple

---

## 9. WordPress Validation

### What to validate

- Theme files follow expected WordPress structure
- Template files exist where referenced
- Required WordPress hooks are used correctly
- Theme functions load without fatal errors
- Custom post types, meta fields, and admin hooks are not broken

### Suggested checks

- Validate theme header and style.css structure
- Check for PHP fatal errors in a test environment
- Verify that templates render without critical warnings
- Confirm critical WordPress functions are available

### Production rule

- Do not deploy if a validation step reveals a fatal or blocking issue.

---

## 10. Automatic Deployment to Hostinger

### Deployment target

Hostinger should receive deployment packages through a secure automation path.

### Recommended deployment approach

- Use SSH-based deployment from GitHub Actions
- Deploy to a staging directory first, then promote to public production
- Use a release artifact or Git checkout strategy rather than direct file editing
- Preserve shared files and writable directories safely

### Recommended deployment flow

1. Build deployment artifact from the release branch or main branch
2. Transfer files securely to Hostinger using SSH
3. Run post-deployment checks
4. Refresh caches
5. Verify the site responds correctly

### Hostinger-specific safety recommendations

- Keep deployment scripts in a dedicated folder
- Avoid deploying directly from local machine to production
- Use a deployment user with limited permissions
- Store SSH keys in GitHub Secrets, not in the repo

---

## 11. Rollback Strategy

### Rollback objective

Rollback must be fast, simple, and reliable.

### Recommended rollback method

- Maintain previous deployment archives on the server
- Keep the last known good release available
- Use a deployment marker or release tag for version identification
- If a deployment fails, revert to the previous known good release quickly

### Rollback process

1. Stop deployment pipeline
2. Restore the previous release package
3. Revert database changes if needed
4. Clear caches
5. Validate the site

### Rollback safety rule

- Production deployment should never be considered complete until the site is verified after the release.

---

## 12. Backup Strategy

### Backup layers

- Daily automated backups of the website files
- Daily automated backups of the database
- Weekly off-site storage of critical backup archives
- Versioned deployment artifacts retained for rollback

### Recommended backup contents

- WordPress files
- Database export
- Theme and plugin files
- Uploads directory
- Configuration files and deployment scripts

### Backup retention

- Keep multiple recent backups
- Keep at least one weekly backup for recovery history
- Keep at least one monthly backup for long-term retention

---

## 13. Emergency Recovery

### Emergency recovery objective

Restore the site quickly if production becomes unavailable or is compromised.

### Recovery steps

1. Confirm the incident and scope
2. Disable or isolate the affected deployment if necessary
3. Restore the latest known-good backup
4. Revert to the last working release if database integrity is in question
5. Re-enable services and verify functionality
6. Document the incident and follow up with a fix

### Recovery readiness

- Keep recovery credentials documented securely
- Maintain access to hosting control panel and database tools
- Keep a checklist for re-enabling plugins, themes, and caches
- Test recovery procedures periodically

---

## 14. Production Checklist

Before each production deployment, confirm the following:

- The release branch is reviewed and approved
- CI checks passed successfully
- Playwright tests passed on staging
- Lighthouse results are within target thresholds
- Backup is completed and verified
- Deployment artifact is ready
- Production secrets are available
- Rollback plan is confirmed
- Stakeholders are notified of the deployment window

### Post-deployment checklist

- Verify homepage loads
- Verify key templates render correctly
- Verify forms and commerce flows function
- Check analytics and monitoring for errors
- Confirm caches are healthy
- Review logs for warnings or failures

---

## 15. Security Checklist

### Core security controls

- Use SSH keys rather than passwords for deployment
- Store secrets only in GitHub Secrets or host-managed secret storage
- Restrict server access to trusted users
- Keep WordPress core, themes, and plugins updated
- Disable unused admin accounts and weak credentials
- Use HTTPS everywhere
- Protect the wp-config.php and sensitive files from public access
- Restrict file permissions appropriately
- Monitor for suspicious login activity and unusual file changes

### Deployment security rules

- Never expose credentials in workflow logs
- Never commit environment variables or API keys
- Review dependency changes carefully
- Use least-privilege deployment accounts

---

## 16. Monitoring

### Monitoring areas

- Uptime and server availability
- PHP errors and fatal errors
- WordPress admin and frontend health
- Performance regressions
- Broken links and failed page loads
- Form submission failures
- Search and SEO crawl issues

### Recommended monitoring tools

- Hosting panel alerts
- Error logging and application logs
- Uptime monitoring service
- Performance monitoring tool
- Optional analytics and conversion monitoring

### Operational response

- Set alerts for failed deployments and elevated error rates
- Review logs after every production release
- Track incidents and recovery actions for future improvement

---

## 17. Future CI/CD Improvements

### Recommended next steps

- Add a staging environment that mirrors production closely
- Add deployment approval workflows with environment protection rules
- Introduce automatic visual regression testing
- Add dependency vulnerability scanning
- Add scheduled health checks for production pages
- Add release notes generation from merged pull requests
- Add database migration checks for larger changes
- Add more granular feature flags for safe rollout

### Long-term goal

Move toward a fully automated, low-risk deployment pipeline where staging is the standard gate for every production change.

---

## Recommended Safest Production Workflow

The safest production workflow for AME Bazaar is:

1. Develop locally in VS Code using a local WordPress environment.
2. Create a feature branch for each change.
3. Open a pull request into develop.
4. Run the full automated quality gate:
   - PHP linting
   - WordPress validation
   - Playwright tests
   - Lighthouse checks
5. Deploy to staging first.
6. Review staging results manually.
7. Merge to main only after approval.
8. Deploy to production through GitHub Actions with manual approval.
9. Verify the live site immediately after deployment.
10. Keep backups and rollback artifacts available until the release is confirmed stable.

This workflow minimizes risk, preserves a clean release history, and provides a strong fallback path if anything goes wrong.
