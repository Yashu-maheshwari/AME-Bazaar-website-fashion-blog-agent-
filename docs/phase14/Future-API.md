# Future API Sync & Integrations

The local authority module is built to connect seamlessly to external APIs.

## REST Endpoint Reference

### Retrieve Store Information
`GET /wp-json/ame-bazaar/v1/gbp`
**Response**:
```json
{
  "store_name": "AME Bazaar",
  "rating": "4.9",
  "reviews_count": 524,
  "place_id": "ChIJTgAADinpDDkRTr27xpunNWM"
}
```

### Save Feedback Form
`POST /wp-json/ame-bazaar/v1/feedback`
**Arguments**:
- `name` (string)
- `rating` (int)
- `feedback` (string)

## Future Sync Implementation Guide
To connect with the official Google Business Profile API:
1. Authenticate using OAuth2 credentials.
2. Schedule a daily cron job calling `GET /v4/accounts/{accountId}/locations/{locationId}/reviews`.
3. Loop through responses and programmatically save reviews.
