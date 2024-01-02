# Expedia / Hotels.com reviews scraper

This is a simple scraper to get reviews from URLs hotels, apartments and other accommodations listed on Expedia.com and Hotels.com portals.

For each hotel, input a link to the hotel detail page, which will look something like this:

```raw
https://www.expedia.com/Prague-Hotels-Pentahotel-Prague.h525006.Hotel-Information?chkin=2023-03-17&chkout=2023-03-18&x_pwa=1&rfrr=HSR&pwa_ts=1677850168323&sort=RECOMMENDED&top_dp=82&top_cur=USD&userIntent=
https://www.hotels.com/ho136900/hilton-prague-old-town-prague-czech-republic/?pwaDialogNested=PropertyDetailsReviewsBreakdownDialog
https://www.expedia.it/en/Berchtesgaden-Hotels-Alpensport-Hotel-Seimler.h2692552.Hotel-Information
```

Additionally, you can click on the "Advanced" button in the URL input field and provide any `userData`. Everything provided here will be available on each review as `customData`, to allow later easy identification of which review belongs to which hotel.

You will get raw review data, so individual reviews will look something like this:

```json
{
    "contentDirectFeedbackPromptId": null,
    "id": "123456789abcdef",
    "superlative": "Excellent",
    "locale": "en_GB",
    "title": "",
    "brandType": "Expedia",
    "reviewScoreWithDescription": {
        "label": "10 out of 10 Excellent",
        "value": "10/10 Excellent"
    },
    "text": "Excellent location and value for money. Great service. Clean. ",
    "seeMoreAnalytics": {
        "linkName": "See more reviews",
        "referrerId": "HOT.HIS.See_more."
    },
    "submissionTime": {
        "longDateFormat": "Apr 15, 2022"
    },
    "impressionAnalytics": null,
    "themes": [
        {
            "icon": {
                "id": "sentiment_4"
            },
            "label": "Liked: Cleanliness, staff & service, amenities, property conditions & facilities"
        }
    ],
    "reviewFooter": {
        "messages": [
            {
                "seoStructuredData": {
                    "itemscope": true,
                    "itemprop": "author",
                    "itemtype": "https://schema.org/Person",
                    "content": "John"
                },
                "text": {
                    "text": "Stayed 1 night in Apr 2022"
                }
            }
        ]
    },
    "reviewInteractionSections": [
        {
            "primaryDisplayString": "0",
            "accessibilityLabel": "Mark review 3 as helpful. 0 other users found review 3 helpful.",
            "reviewInteractionType": "HELPFUL_REVIEW",
            "feedbackAnalytics": {
                "linkName": "Helpful review",
                "referrerId": "HOT.HIS.ReviewsOverlay.THUMB_UP.UPVOTE"
            }
        },
        {
            "primaryDisplayString": null,
            "accessibilityLabel": null,
            "reviewInteractionType": "REVIEW_REPORT_FLAG",
            "feedbackAnalytics": null
        }
    ],

    "reviewAuthorAttribution": {
        "text": "John"
    },
    "photoSection": null,
    "photos": [],
    "travelers": ["Traveled with family"],
    "translationInfo": null,
    "propertyReviewSource": null,
    "reviewRegion": null,
    "managementResponses": [
        {
            "id": "3b23cd4c-ac5c-42a7-91f2-89b8d8dec7e2",
            "header": {
                "text": "Response from Jane on Apr 19, 2022"
            },
            "response": "Thank you so much, we appreciate it a lot!"
        }
    ],
    "hotelId": "123456",
    "customData": {
        "userDataKey1": "your custom data here",
        "userDataKey2": ["arbitrary JSON data can be here"]
    }
}
```

Actor icon attribution: [Condominium icons created by Uniconlabs - Flaticon](https://www.flaticon.com/free-icons/condominium)
