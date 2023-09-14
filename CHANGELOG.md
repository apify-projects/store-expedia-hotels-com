### 2023-09-14 (0.0.11)

_Fixes_

-   Fixed hotelId detection for hotels.com (Actor was previously failing with `Error: Could not extract hotel ID from https://www.hotels.com/...`

### 2023-09-14 (0.0.9)

_Added_

-   Input option `sortBy`: sort reviews by Most relevant, Most recent or Highest/lowest rating  
    **Note**: setting this will not affect the order of reviews in the dataset, since review items are scraped in parallel, so later pages might finish before previous ones. However, it helps in the case you are limiting maximum number of reviews per hotel.
-   Output field `reviewPosition`: indicates how the review was ranked (starting with 1, counted across all pages)
