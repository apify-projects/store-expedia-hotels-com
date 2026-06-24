# Expedia, Hotels.com, and Vrbo reviews scraper

Get guest reviews from Expedia, Hotels.com, and Vrbo from a list of property URLs. For each review you get a clean, normalized [schema.org `Review`](https://schema.org/Review): author, date, title, body, rating, trip type, liked and disliked themes, and any management response.

The Actor talks to the same mobile API the official apps use, so it is fast and does not need a headless browser.

## What you get

One [schema.org `Review`](https://schema.org/Review) object per review, for example:

```json
{
  "@context": "https://schema.org",
  "@type": "Review",
  "author": { "@type": "Person", "name": "Sarah" },
  "datePublished": "2026-04-15",
  "name": "Excellent stay",
  "reviewBody": "Excellent location and value for money. Great service. Clean.",
  "reviewRating": { "@type": "Rating", "ratingValue": 10, "bestRating": 10, "worstRating": 1 },
  "publisher": { "@type": "Organization", "name": "Expedia" },
  "itemReviewed": { "@type": "Hotel", "identifier": "525006", "url": "https://www.expedia.com/...h525006..." },
  "tripType": "Couple",
  "verified": true,
  "helpfulVotes": 3
}
```

## Input

| Field | Type | Description |
| --- | --- | --- |
| `startUrls` | array | Property URLs from Expedia, Hotels.com, or Vrbo. Search URLs work too when they pin a listing (Vrbo `?selected=`). |
| `maxReviewsPerProperty` | number | Cap on reviews per property. |
| `sortBy` | string | `Most relevant`, `Most recent`, `Highest guest rating`, or `Lowest guest rating`. |

Each property URL looks something like:

```raw
https://www.expedia.com/Prague-Hotels-Pentahotel-Prague.h525006.Hotel-Information
https://www.hotels.com/ho136900/hilton-prague-old-town-prague-czech-republic/
https://www.vrbo.com/1234567ha
```

You can also pass anything as `userData` on a start URL; it is attached to every review from that property as `customData`, so you can tie reviews back to your own records.

## Pricing

This Actor uses pay per event:

- **Actor start** - a small one-time fee per run.
- **Review scraped** - charged once per review returned.

## Related Actors

- **Expedia, Hotels.com, and Vrbo hotel details scraper** - full property profiles and live room rates.
- **Choice Hotels** scrapers - search, details, and reviews for Choice properties.
