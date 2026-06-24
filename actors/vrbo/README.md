# Vrbo reviews scraper

Scrape guest reviews from any Vrbo vacation rental listing. Input one or more Vrbo property URLs — including search result URLs with a pinned listing (`?selected=`) — and get back clean, normalized [schema.org Review](https://schema.org/Review) objects.

Uses the same mobile API as the official Vrbo app — fast, no browser required.

## Sample output

```json
{
  "@context": "https://schema.org",
  "@type": "Review",
  "author": { "@type": "Person", "name": "Laura K." },
  "datePublished": "2026-05-10",
  "name": "Beautiful house, perfect for families",
  "reviewBody": "Spacious, clean, and exactly as described. We loved the garden.",
  "reviewRating": { "@type": "Rating", "ratingValue": 5, "bestRating": 5, "worstRating": 1 },
  "publisher": { "@type": "Organization", "name": "Vrbo" },
  "itemReviewed": { "@type": "Hotel", "identifier": "33613372", "url": "https://www.vrbo.com/..." },
  "tripType": "Family",
  "verified": true
}
```

## Input

| Field | Type | Default | Description |
|---|---|---|---|
| `startUrls` | array | — | Vrbo property or search URLs. Search URLs with `?selected=` resolve to the pinned listing automatically. |
| `maxReviewsPerProperty` | number | 100 | Max reviews per property |
| `sortBy` | string | Most relevant | `Most relevant`, `Most recent`, `Highest guest rating`, `Lowest guest rating` |

Pass anything as `userData` on a start URL — it appears on every review from that property as `customData`.

## Pricing

Pay per event — you only pay for what you scrape:

- **Actor start** — flat fee per run
- **Review scraped** — per review returned

## Related

- [Vrbo hotel details scraper](https://apify.com/tri_angle/vrbo-details-scraper) — full property profile and live rates
- [Expedia reviews scraper](https://apify.com/tri_angle/expedia-hotels-com-reviews-scraper) — same schema, Expedia source
- [Hotels.com reviews scraper](https://apify.com/tri_angle/hotels-com-reviews-scraper) — same schema, Hotels.com source
