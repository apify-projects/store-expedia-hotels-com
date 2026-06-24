import { randomUUID } from "crypto";
import { readFile } from "fs/promises";

export const EXPEDIA_HOSTNAME = "www.expedia.com";
export const HOTELS_COM_HOSTNAME = "www.hotels.com";
export const VRBO_COM_HOSTNAME = "www.vrbo.com";

export const SITES_CONFIG: Record<
    string,
    { urlRegex: RegExp | null; siteId: number }
> = {
    [EXPEDIA_HOSTNAME]: { urlRegex: /\.h(\d+)\./, siteId: 1 },
    [HOTELS_COM_HOSTNAME]: { urlRegex: null, siteId: 300000001 },
    [VRBO_COM_HOSTNAME]: { urlRegex: /\/(\d+)/, siteId: 9001001 },
};

export enum SortBy {
    MostRelevant = "Most relevant",
    MostRecent = "Most recent",
    HighestGuestRating = "Highest guest rating",
    LowestGuestRating = "Lowest guest rating",
}

export const sortByToRequestParamMap: Record<SortBy, string> = {
    [SortBy.MostRelevant]: "NEWEST_TO_OLDEST_BY_LANGUAGE",
    [SortBy.MostRecent]: "NEWEST_TO_OLDEST",
    [SortBy.HighestGuestRating]: "HIGHEST_TO_LOWEST_RATED",
    [SortBy.LowestGuestRating]: "LOWEST_TO_HIGHEST_RATED",
};

export const PAGE_SIZE = 100;
export const QUERY = await readFile("src/reviewsQuery.graphql", "utf-8");

export type ScrapeSettings = {
    sortBy: SortBy;
    maxReviewsPerHotel: number;
    minDate: Date;
    maxResults: number;
    state: { pushedResults: number };
};

// The GraphQL operation body for one page of property reviews. Built in Node
// and handed to page.evaluate(), which issues it as an in-page fetch so the
// request rides the loaded page's browser realm (Expedia's gateway rejects the
// same request when replayed outside a real browser context).
export const buildReviewsBody = (
    hotelId: string,
    site: string,
    startIndex: number,
    scrapeSettings: ScrapeSettings,
) => [
    {
        operationName: "PropertyFilteredReviewsQuery",
        variables: {
            context: {
                siteId: SITES_CONFIG[site].siteId,
                locale: "en_US",
                eapid: 1,
                currency: "USD",
                device: { type: "APP_PHONE" },
                identity: { duaid: randomUUID(), authState: "ANONYMOUS" },
                privacyTrackingState: "CAN_NOT_TRACK",
                debugContext: { abacusOverrides: [] },
                clientInfo: { name: "android.com.expedia.bookings", version: "2026.25.0" },
            },
            propertyId: hotelId,
            searchCriteria: {
                primary: {
                    dateRange: null,
                    rooms: [],
                    destination: { regionId: null },
                },
                secondary: {
                    booleans: [
                        { id: "includeRecentReviews", value: true },
                        { id: "includeRatingsOnlyReviews", value: true },
                        { id: "overrideEmbargoForIndividualReviews", value: true },
                    ],
                    counts: [
                        { id: "startIndex", value: startIndex },
                        { id: "size", value: PAGE_SIZE },
                    ],
                    selections: [
                        {
                            id: "sortBy",
                            value: sortByToRequestParamMap[scrapeSettings.sortBy],
                        },
                    ],
                },
            },
        },
        query: QUERY,
    },
];

// Resolve the property/hotel id for a source URL. Expedia and VRBO carry it in
// the path; Hotels.com needs it pulled from the loaded page HTML. The id can
// also ride in a query param — Vrbo search URLs pin the chosen listing as
// ?selected= (also pinnedPropertyId / propertyId) — so check those first.
export const hotelIdFromUrl = (url: URL, site: string): string | null => {
    for (const key of ["selected", "pinnedPropertyId", "propertyId"]) {
        const v = url.searchParams.get(key);
        if (v && /^\d{3,}$/.test(v)) return v;
    }
    const regex = SITES_CONFIG[site]?.urlRegex;
    if (!regex) return null;
    const match = url.pathname.match(regex);
    return match ? match[1] : null;
};

export const hotelIdFromHtml = (html: string): string | null => {
    const match = html.match(/"propertyId\\?":\\?"(\d+)\\?"/) ?? html.match(/propertyId["\\:\s]+(\d{4,})/);
    return match ? match[1] : null;
};

export const resolveSite = (hostname: string): string => {
    if (hostname.endsWith("hotels.com") || hostname.endsWith("hoteis.com")) return HOTELS_COM_HOSTNAME;
    if (hostname.includes("expedia")) return EXPEDIA_HOSTNAME;
    if (hostname.includes("vrbo")) return VRBO_COM_HOSTNAME;
    return hostname;
};
