# Google Business Profile & Local Authority Architecture

This document describes the design pattern of AME Bazaar's Local SEO and review collection system.

## Data Layer & Integrations
All business settings are stored in standard WordPress options (`ame_bazaar_*`) which are abstracted by the central getter function `ame_bazaar_get_business_setting()`. 

```
                               ┌────────────────────────┐
                               │  WordPress Admin Panel │
                               └───────────┬────────────┘
                                           │ (Saves to Options)
                                           ▼
┌────────────────────────┐     ┌────────────────────────┐     ┌────────────────────────┐
│     REST API Server    │◄────┤  wp_options Repository ├────►│  JSON-LD Schema Engine │
└────────────────────────┘     └───────────┬────────────┘     └────────────────────────┘
                                           │
                                           ▼
                               ┌────────────────────────┐
                               │   Frontend Components  │
                               └────────────────────────┘
```

### Key Modules
1. **REST API Namespace (`ame-bazaar/v1`)**: Fully decouples the data layer, rendering reviews, ratings, maps parameters, and private feedback logs available to headless callers and CRM pipelines.
2. **Modular Schema Builders**: Located inside `inc/schema.php`. Separate functions parse coordinates, addresses, and ratings for LocalBusiness, organization metadata, and clothing store structures.
3. **Smart Review Routing Funnel**: An interactive front-end page checks selection and dynamically routes positive reviews to Google direct pages while filtering constructive feedback privately.
