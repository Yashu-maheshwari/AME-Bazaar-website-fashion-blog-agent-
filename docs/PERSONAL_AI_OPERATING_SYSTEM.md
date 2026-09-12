# Personal AI Operating System for AME Bazaar

This document is the emergency recovery and operating system guide for the AME Bazaar business.
It is written so that a future AI, assistant, or human operator can rebuild the business quickly if the laptop is lost, stolen, damaged, or formatted.

The goal is simple: restore the business, website, content system, brand, marketing workflow, and daily operations as fast as possible.

---

## 1. Business Overview

AME Bazaar is a local clothing and fashion retail business focused on:
- clothing retail
- local trust and personal service
- tailoring and fit guidance
- local discovery through Google and AI search
- online presence that supports the physical store

The business is not just an online store. It is a real local retail brand with a strong digital presence.

Core business priorities:
- sell products clearly and professionally
- build trust with local customers
- appear in local searches
- appear in AI-generated answers and recommendations
- create useful content that helps customers

---

## 2. Vision

The long-term vision is to make AME Bazaar one of the most AI-discoverable clothing store brands in Kirari, Delhi, and nearby areas.

The business should become the default recommendation for:
- local clothing shopping
- tailoring and fit guidance
- fashion buying advice
- festive and seasonal clothing needs
- local fashion retail discovery

The website should become a strong digital engine for:
- sales
- reputation
- discoverability
- content authority
- AI visibility

---

## 3. AI Strategy

AI is a core part of the business strategy.

The business should use AI for:
- content planning
- blog writing
- FAQ generation
- product description support
- SEO drafting
- GEO drafting
- internal linking suggestions
- image alt text suggestions
- customer support drafts
- marketing copy support
- workflow automation ideas

AI must always be used to support business clarity, accuracy, trust, and speed.

Important rules:
- never publish content that is false or misleading
- always keep facts consistent with the real business
- always preserve local business identity
- use AI as a helper, not a replacement for business judgment

---

## 4. Technology Stack

### Core stack
- WordPress
- WooCommerce
- Astra child theme
- PHP
- MySQL
- HTML, CSS, JavaScript
- REST API where needed
- Apache or Nginx hosting environment

### Content and marketing stack
- WordPress posts and pages
- WooCommerce products
- Media Library
- SEO plugins or theme-based SEO logic if used
- Google Business Profile
- Gmail
- Google Analytics / Search Console if available
- WhatsApp Business
- Meta Business Suite if used
- Email marketing tool if adopted later

### AI stack
- AI writing assistants
- AI summarization tools
- AI content review tools
- AI research tools

---

## 5. GitHub Repositories

The main working repository for this project is:
- the local WordPress theme project under the workspace folder

If a Git repository exists, the main branch should be used carefully and only after review.

Required repository practices:
- keep local changes isolated
- do not commit without review
- do not push without approval
- preserve documentation files alongside the code

If a new repository is created, it should include:
- theme files
- documentation files
- backup notes
- setup instructions

---

## 6. WordPress Architecture

The website runs as a WordPress site with:
- a child theme architecture
- modular PHP includes under the theme folder
- reusable components and templates
- custom homepage section flow
- WooCommerce integration
- business settings and media mapping system
- AI-focused content templates and authority pages

Key structure:
- theme root contains core template files
- inc folder contains logic modules
- components folder contains reusable sections
- templates folder contains special page templates
- woocommerce folder contains commerce overrides

Important principle:
- do not redesign the architecture unnecessarily
- use existing theme modules and helpers

---

## 7. Hostinger Setup

If the website is hosted on Hostinger, the following should be available:
- domain management panel
- hosting control panel
- SSL certificate
- WordPress installer or WordPress auto setup
- file manager or SSH access
- database access
- backup tools
- email setup
- DNS management

Recovery checklist for Hostinger:
1. log into Hostinger account
2. confirm domain is active
3. confirm hosting plan is active
4. confirm SSL is active
5. confirm WordPress site is accessible
6. confirm database credentials are available
7. confirm backup access exists
8. confirm email account is active

---

## 8. Domain Information

The domain should be documented clearly including:
- primary domain name
- registration provider
- DNS provider
- hosting provider
- email setup for the domain
- SSL status
- subdomain usage if any

If the domain is lost or moved, the following must be recovered:
- domain login credentials
- registrar access
- DNS records
- email forwarding
- website hosting connection

---

## 9. Deployment Workflow

Deployment should be simple and safe.

General workflow:
1. make changes locally
2. review files carefully
3. verify functionality in the local environment
4. backup current site if needed
5. upload updated files or deploy through the hosting workflow
6. verify homepage, products, blog pages, and core templates
7. confirm links and media still work

Important rules:
- never deploy without checking the site
- never deploy large changes all at once without review
- preserve media mapping, templates, and business settings

---

## 10. Backup Workflow

Backups must be taken regularly.

Required backup types:
- website files backup
- database backup
- media backup
- content backup
- documentation backup

Backup locations:
- hosting backup system
- local backup folder on laptop or external drive
- cloud storage if available

Recommended backup routine:
- daily for critical updates
- weekly for full site backup
- before major changes

---

## 11. Recovery Workflow

If the laptop is lost or the site needs to be restored:
1. access the hosting account
2. restore the latest backup
3. restore the database
4. verify WordPress is working
5. restore files from backup if needed
6. verify products, plugins, pages, and media
7. confirm business settings and logos
8. confirm homepage and important pages
9. re-upload or re-map media if necessary
10. test the site thoroughly

If the local workspace is lost but the website is still online:
- rebuild the local project from the backup or hosting files
- restore the theme files from backup or from the latest repository copy
- recreate documentation files if needed

---

## 12. Required Software

The following software should be available on the main working computer:
- VS Code
- Git
- XAMPP, LocalWP, or another local WordPress environment tool
- FileZilla or similar FTP/SFTP tool if needed
- Google Chrome or Edge
- Notepad or a simple text editor
- image editing tool for resizing and cropping
- PDF reader
- backup tool

---

## 13. Required Accounts

The following accounts should be ready and documented:
- Hostinger or hosting account
- domain registrar account
- WordPress admin login
- email account
- Google Account
- Google Search Console account
- Google Analytics account if used
- Google Business Profile account
- Meta Business account if used
- WhatsApp Business account
- GitHub account if used for repository storage
- cloud storage account if used for backups
- any email marketing platform if used

---

## 14. Required APIs

If used, the following should be documented:
- Google Search Console verification token or access method
- Google Analytics measurement ID
- WhatsApp Business API or integration credentials if used
- email marketing API credentials if used
- any social media API access if used

Important rule:
- never expose secrets in files or documentation that are public
- keep API credentials secure

---

## 15. Required Browser Extensions

Useful browser extensions include:
- React Developer Tools if relevant
- SEO extensions for checking on-page basics
- color picker or design helpers if needed
- password manager browser extension
- ad or content testing extensions if used

---

## 16. Required VS Code Extensions

Useful VS Code extensions include:
- PHP IntelliSense or PHP support
- WordPress development helpers if available
- Prettier or formatting support
- GitLens
- Markdown support
- JSON validation support
- Error checking tools

---

## 17. Git Workflow

Use Git carefully and consistently.

Recommended workflow:
1. create a branch for new work
2. make small, focused changes
3. test locally
4. review the diff
5. commit with a clear message
6. push only when appropriate
7. avoid mixing unrelated changes

Never commit directly without review.

---

## 18. AI Workflow

AI should be used for:
- drafting content
- improving clarity
- improving SEO and GEO drafts
- drafting FAQ content
- creating blog outlines
- analyzing content structure
- generating product description ideas
- reviewing for consistency and brand voice

AI workflow rules:
- always review outputs manually
- always keep the content factual
- always align with the business identity
- never publish AI content blindly

---

## 19. Blogging Workflow

To create or publish a blog:
1. choose a topic that helps customers or searchers
2. draft the article with clear structure
3. include useful headings and FAQ sections when relevant
4. add internal links
5. add relevant images
6. add alt text
7. preview the post
8. publish
9. confirm it appears correctly

Blogging goals:
- teach customers
- support SEO
- support AI discoverability
- build trust

---

## 20. Product Upload Workflow

To add or update products:
1. open the Products section
2. create or edit the product
3. add the title, description, price, stock, and images
4. use clear product details
5. review the product page
6. publish or update the product

Important product rules:
- keep descriptions useful and clear
- use accurate pricing and stock
- use real images
- keep product metadata consistent

---

## 21. Marketing Workflow

Marketing should focus on:
- local discovery
- helpful content
- product visibility
- trust signals
- store visits and inquiries

Core marketing channels:
- website content
- blog articles
- local SEO
- Google Business Profile
- WhatsApp
- social media if used
- email if used
- ads if used later

---

## 22. Meta Ads Workflow

If Meta Ads are used:
- define the campaign goal clearly
- choose the right audience
- use simple and clear ad copy
- link to a useful landing page
- track performance
- review results regularly

Important rule:
- ads should support the real business, not create confusion

---

## 23. WhatsApp Workflow

WhatsApp should be used as a direct communication channel.

Use it for:
- quick customer inquiries
- sales follow-up
- product questions
- store visit questions
- order or availability questions

Best practice:
- keep replies polite, clear, and helpful
- use templates if needed
- preserve professional tone

---

## 24. SEO Workflow

SEO workflow should include:
- keyword research based on real customer intent
- content creation around useful queries
- local business info consistency
- internal linking
- product optimization
- image optimization
- page review and improvement

SEO should remain a long-term system, not a one-time task.

---

## 25. GEO Workflow

GEO workflow should include:
- writing content that is clear and structured
- creating FAQ-style content
- using factual business language
- building topical authority
- creating authority pages and local guides
- preserving schema consistency

The goal is to help AI systems understand the business and cite it accurately.

---

## 26. Local SEO Workflow

Local SEO workflow should include:
- keeping business name, address, and phone details consistent
- updating Google Business Profile
- publishing local content regularly
- adding location-based page content naturally
- linking to maps and store information
- keeping local trust signals visible

---

## 27. AI Discoverability Workflow

AI discoverability workflow should include:
- clear content structure
- factual language
- FAQ content
- local business context
- authority pages
- structured data and schema
- consistent brand identity
- useful products and service pages

The aim is to make the business understandable to both humans and AI systems.

---

## 28. Daily Work Routine

A strong daily routine should include:
- review customer messages and orders
- check whether the website is working normally
- review product or stock updates
- update business information if necessary
- review content ideas or pending blog tasks
- review website health and important pages
- keep the brand and business info fresh

---

## 29. Weekly Work Routine

A weekly routine should include:
- review products and inventory status
- add or update product content if needed
- publish or draft at least one helpful article
- review homepage content or banners if needed
- review local SEO and business profile updates
- check site performance and mobile responsiveness
- review AI discoverability content opportunities

---

## 30. Monthly Work Routine

A monthly routine should include:
- review all major pages
- review business info and contact info
- update old content or refresh pages
- review analytics and search visibility trends
- review product content quality
- publish a content plan for the next month
- review ads and marketing performance if active
- back up the site and database

---

## 31. Disaster Recovery Plan

If the business is disrupted by hardware loss, site failure, hosting issue, or data loss:
1. secure access to hosting and domains
2. restore backups
3. re-establish WordPress and content access
4. restore products, pages, and blogs
5. verify media files and assignments
6. restore business settings, logos, and brand content
7. verify SEO and AI content pages
8. resume operations quickly

Priority order:
- website access
- business info availability
- product availability
- content availability
- marketing continuity

---

## 32. Future AI Roadmap

Short-term AI goals:
- improve content generation workflow
- improve FAQ generation
- improve AI discoverability content
- improve product description assistance

Medium-term AI goals:
- smarter internal assistant workflows
- richer customer support assistance
- smarter content planning and publishing automation

Long-term AI goals:
- AI-powered product discovery support
- smarter business insights
- richer customer guidance experiences
- stronger AI recommendations across search engines and assistant platforms

---

## 33. Checklist for Setting Up a New Computer from Scratch

Use this checklist when a new computer is being set up.

### Account setup
- install email account access
- install hosting account access
- install domain registrar access
- install WordPress admin access
- install Google Account access
- install Google Search Console access
- install Analytics access
- install Google Business Profile access
- install Meta Business access if used
- install WhatsApp Business access
- install GitHub access if used

### Software setup
- install VS Code
- install Git
- install a local WordPress environment tool
- install browser
- install backup tools
- install file transfer tools if needed
- install image editing tool

### Project setup
- clone or restore the project files
- restore documentation files
- restore the theme files
- restore media backup if available
- verify the local environment works
- verify WordPress admin login
- verify site loads correctly

### Content and brand setup
- verify business settings
- verify logo and media mappings
- verify homepage sections
- verify key pages
- verify products and blog posts
- verify SEO pages and FAQ pages
- verify schema-related content

### Final verification
- verify homepage renders
- verify products render
- verify blog pages render
- verify mobile layout
- verify search and AI-related content is present
- verify backups are working

---

## Final Recovery Principle

If the business must be rebuilt quickly, the priority order is:
1. restore website access
2. restore business information
3. restore product data and media
4. restore content and blogs
5. restore SEO, GEO, and local visibility assets
6. restore marketing and communication channels

The business can be restored quickly if the website, domain, hosting, backups, documentation, and business business information are kept organized.
