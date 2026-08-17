# Expedia / Hotels.com Reviews Scraper

Scrapes guest reviews from any hotel, apartment or other accommodation listed on Expedia, Hotels.com or Vrbo. Give it a property page URL and it returns every review on that property, not just the first page.

## Input

Paste the URL of a property detail page, for example:

```raw
https://www.expedia.com/Prague-Hotels-Hotel-Krystal.h10966026.Hotel-Information
https://www.hotels.com/ho136900/hilton-prague-old-town-prague-czech-republic/
https://www.expedia.it/en/Berchtesgaden-Hotels-Alpensport-Hotel-Seimler.h2692552.Hotel-Information
```

Regional domains of the same brands work too, such as `expedia.it`, `expedia.com.tw`, `de.hotels.com` or `hoteis.com`. Extra query parameters are ignored, so you can paste a link straight from your browser.

| Field                | Description                                                                                                    |
| -------------------- | -------------------------------------------------------------------------------------------------------------- |
| `startUrls`          | Property page URLs. Anything in a URL's `userData` comes back on each of its reviews as `customData`.          |
| `maxReviewsPerHotel` | Cap on reviews per property. Leave empty to take all of them.                                                  |
| `sortBy`             | Most relevant, Most recent, Highest guest rating, or Lowest guest rating.                                      |
| `minDate`            | Skip reviews older than this date. Needs `sortBy` set to Most recent, since only that order runs newest-first. |
| `debugLog`           | Verbose logging, for working out why a run behaved unexpectedly.                                               |

### Tagging reviews with your own data

Open **Advanced** on a start URL and add any JSON under `userData`. It is copied onto every review from that property as `customData`, which makes reviews easy to attribute when one run covers many properties:

```json
{
    "url": "https://www.expedia.com/Prague-Hotels-Hotel-Krystal.h10966026.Hotel-Information",
    "userData": { "internalId": 4711, "city": "Prague" }
}
```

## Output

Each review is one dataset item, keeping the field names Expedia's own API uses:

```json
{
    "id": "63f2848ddb4e6119d60c3d51",
    "title": "",
    "text": "Nice hotel near the airport with a great restaurant. The wifi, however, was non-existent.",
    "superlative": "Good",
    "locale": "fr_BE",
    "disclaimer": "Verified review",
    "highlightedText": null,
    "brandType": null,
    "propertyReviewSource": null,
    "reviewScoreWithDescription": {
        "label": "8 out of 10 Good",
        "value": "8/10 Good"
    },
    "submissionTime": {
        "longDateFormat": "Feb 19, 2023"
    },
    "reviewRegion": null,
    "reviewAuthorAttribution": {
        "text": "Diana"
    },
    "reviewFooter": {
        "messages": [
            {
                "seoStructuredData": { "content": "Diana" },
                "text": "Stayed 1 night in Feb 2023"
            }
        ]
    },
    "reviewInteractionSections": [
        { "primaryDisplayString": "0", "reviewInteractionType": "HELPFUL_REVIEW" },
        { "primaryDisplayString": null, "reviewInteractionType": "REVIEW_REPORT_FLAG" }
    ],
    "themes": [
        {
            "sentimentId": "sentiment_4",
            "label": "Liked: Cleanliness, staff & service, amenities, property conditions & facilities"
        }
    ],
    "photos": [],
    "travelers": [],
    "translationInfo": {
        "targetLocale": null,
        "translatedBy": "Translated by Google"
    },
    "managementResponses": [
        {
            "id": "91281c26-ee90-48f5-babf-386be3979a82",
            "header": "Response from Helena on Mar 6, 2023",
            "response": "Dear Diana, thank you for your feedback! Hotel Krystal"
        }
    ],
    "hotelId": "10966026",
    "reviewPosition": 26,
    "customData": { "internalId": 4711, "city": "Prague" }
}
```

Fields worth pointing out:

- `hotelId` - the property id the reviews belong to. Not the number in a Hotels.com URL, which is a separate listing id.
- `reviewPosition` - the review's rank in the chosen sort order, counted across all pages from 1.
- `customData` - your `userData` for that property, passed through unchanged.
- `reviewScoreWithDescription.value` - the rating, as `"8/10 Good"`. Expedia and Hotels.com both use a 10-point scale.
- `reviewInteractionSections` - the `HELPFUL_REVIEW` entry's `primaryDisplayString` holds the helpful-vote count.
- `managementResponses` - the property owner's replies, empty when there are none.

The API's analytics and tracking payloads (`reviewAnalytics`, `seeMoreAnalytics`, `impressionAnalytics`, `photoSection`, `feedbackAnalytics`, `accessibilityLabel`, `__typename`) are dropped, and four single-value wrappers are unpacked to the value they held: `themes[].icon.id` to `themes[].sentimentId`, `managementResponses[].header.text` to `.header`, `reviewFooter.messages[].text.text` to `.text`, and `translationInfo.translatedBy.description` to `.translatedBy`.

## Notes

**Review order.** Pages of a property are fetched in parallel, so items do not land in the dataset in sort order. Use `reviewPosition` to restore it. `sortBy` still decides which reviews you get when `maxReviewsPerHotel` is set.

**Limits.** `maxReviewsPerHotel` applies per property, and a run-wide limit on results stops the whole run once reached.

**Proxy.** The Actor uses Apify residential proxy. Expedia blocks datacenter IP ranges on the endpoint it reads, which costs whole pages of reviews rather than failing outright.

Actor icon attribution: [Condominium icons created by Uniconlabs - Flaticon](https://www.flaticon.com/free-icons/condominium)
