# Hotels.com reviews scraper

Scrape guest reviews from any Hotels.com property page. Input one or more Hotels.com property URLs and get back clean, normalized [schema.org Review](https://schema.org/Review) objects — author, date, title, body, star rating, trip type, liked and disliked themes, and the hotel management response where one exists.

Uses the same mobile API as the official Hotels.com app — fast, no browser required.

## Sample output

```json
{
  "@context": "https://schema.org",
  "@type": "Review",
  "author": { "@type": "Person", "name": "James T." },
  "datePublished": "2026-03-22",
  "name": "Great central location",
  "reviewBody": "Perfect base for exploring the city. Breakfast was excellent and staff very helpful.",
  "reviewRating": { "@type": "Rating", "ratingValue": 9, "bestRating": 10, "worstRating": 1 },
  "publisher": { "@type": "Organization", "name": "Hotels.com" },
  "itemReviewed": { "@type": "Hotel", "identifier": "136900", "url": "https://www.hotels.com/ho136900/..." },
  "tripType": "Family",
  "verified": true,
  "helpfulVotes": 1
}
```

## Input

| Field | Type | Default | Description |
|---|---|---|---|
| `startUrls` | array | — | Hotels.com property URLs (e.g. `https://www.hotels.com/ho136900/...`) |
| `maxReviewsPerProperty` | number | 100 | Max reviews per property |
| `sortBy` | string | Most relevant | `Most relevant`, `Most recent`, `Highest guest rating`, `Lowest guest rating` |

Pass anything as `userData` on a start URL — it appears on every review from that property as `customData`.

## Pricing

Pay per event — you only pay for what you scrape:

- **Actor start** — flat fee per run
- **Review scraped** — per review returned

## Related

- [Hotels.com hotel details scraper](https://apify.com/tri_angle/hotels-com-details-scraper) — full property profile and live room rates
- [Expedia reviews scraper](https://apify.com/tri_angle/expedia-hotels-com-reviews-scraper) — same schema, Expedia source
- [Vrbo reviews scraper](https://apify.com/tri_angle/vrbo-reviews-scraper) — same schema, Vrbo source
