# Developer & API Guide

Detailed architecture guide for developers maintaining, extending, or integrating the Local Authority module.

## Hooks and Filters

- **`ame_bazaar_local_business_schema` (filter)**: Filters the parsed LocalBusiness structured data array.
- **`ame_bazaar_reviews_list` (filter)**: Filters the list of reviews before they are output or served via the API.

## Data Access helpers

### Retrieve Settings
```php
$rating = ame_bazaar_get_business_setting( 'google_reviews_rating', '4.9' );
$review_url = ame_bazaar_get_business_setting( 'google_review_url', '#' );
```

### Save Settings
```php
update_option( 'ame_bazaar_google_reviews_rating', '4.9' );
```
