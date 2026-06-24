# Expedia reviews scraper

Scrape guest reviews from any Expedia hotel page. Input one or more Expedia property URLs and get back clean, normalized [schema.org Review](https://schema.org/Review) objects — author, date, title, body, star rating, trip type, liked and disliked themes, and the hotel management response where one exists.

Uses the same mobile API as the official Expedia app — fast, no browser required.

## Sample output

```json
{
  "@context": "https://schema.org",
  "@type": "Review",
  "author": { "@type": "Person", "name": "Sarah M." },
  "datePublished": "2026-04-15",
  "name": "Excellent stay in Prague",
  "reviewBody": "Excellent location and great value. Staff were friendly and the room was spotless.",
  "reviewRating": { "@type": "Rating", "ratingValue": 10, "bestRating": 10, "worstRating": 1 },
  "publisher": { "@type": "Organization", "name": "Expedia" },
  "itemReviewed": { "@type": "Hotel", "identifier": "525006", "url": "https://www.expedia.com/...h525006..." },
  "tripType": "Couple",
  "verified": true,
  "helpfulVotes": 3,
  "likedThemes": ["Location", "Value"],
  "dislikedThemes": [],
  "response": { "text": "Thank you for staying with us!", "date": "2026-04-16" }
}
```

## Input

| Field | Type | Default | Description |
|---|---|---|---|
| `startUrls` | array | — | Expedia hotel URLs (e.g. `https://www.expedia.com/...h525006...`) |
| `maxReviewsPerProperty` | number | 100 | Max reviews per property |
| `sortBy` | string | Most relevant | `Most relevant`, `Most recent`, `Highest guest rating`, `Lowest guest rating` |

Pass anything as `userData` on a start URL — it appears on every review from that property as `customData`.

## Pricing

Pay per event — you only pay for what you scrape:

- **Actor start** — flat fee per run
- **Review scraped** — per review returned

## Related

- [Expedia hotel details scraper](https://apify.com/tri_angle/expedia-details-scraper) — full property profile and live room rates
- [Hotels.com reviews scraper](https://apify.com/tri_angle/hotels-com-reviews-scraper) — same schema, Hotels.com source
- [Vrbo reviews scraper](https://apify.com/tri_angle/vrbo-reviews-scraper) — same schema, Vrbo source
