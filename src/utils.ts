import { randomUUID } from "crypto";
import { readFile } from "fs/promises";

export const EXPEDIA_HOSTNAME = "www.expedia.com";
export const HOTELS_COM_HOSTNAME = "www.hotels.com";
export const SITES_CONFIG: Record<
    string,
    { urlRegex: RegExp | null; siteId: number }
> = {
    [EXPEDIA_HOSTNAME]: {
        urlRegex: /\.h(\d+)\./,
        siteId: 1,
    },
    [HOTELS_COM_HOSTNAME]: {
        urlRegex: null,
        siteId: 300000001,
    },
};

export enum LABEL {
    GET_HOTEL_ID = "GET_HOTEL_ID",
    REVIEWS_PAGE = "REVIEWS_PAGE",
}

export enum SortBy {
    MostRelevant = "Most relevant",
    MostRecent = "Most recent",
    HighestGuestRating = "Highest guest rating",
    LowestGuestRating = "Lowest guest rating",
}

const sortByToRequestParamMap: Record<SortBy, string> = {
    [SortBy.MostRelevant]: "NEWEST_TO_OLDEST_BY_LANGUAGE",
    [SortBy.MostRecent]: "NEWEST_TO_OLDEST",
    [SortBy.HighestGuestRating]: "HIGHEST_TO_LOWEST_RATED",
    [SortBy.LowestGuestRating]: "LOWEST_TO_HIGHEST_RATED",
};

export const PAGE_SIZE = 10;
const QUERY = await readFile("src/reviewsQuery.graphql", "utf-8");

export type ScrapeSettings = {
    sortBy: SortBy;
    maxReviewsPerHotel: number;
    minDate: Date;
};

export type UserData = {
    hotelId: string;
    startIndex: number;
    customData: any;
    site: string;
    label: LABEL;
};

const getReviewsPageRequest = (
    hotelId: string,
    scrapeSettings: ScrapeSettings,
    startIndex: number,
    customData: any,
    site: string
): {
    url: string;
    method: "POST";
    uniqueKey: string;
    payload: string;
    headers: Record<string, string>;
    userData: UserData;
} => ({
    url: `https://${site}/graphql`,
    method: "POST",
    uniqueKey: `reviews-${hotelId}?start=${startIndex}`,
    headers: {
        "content-type": "application/json",
        "client-info": "blossom-flex-ui",
    },
    userData: {
        hotelId,
        startIndex,
        customData,
        label: LABEL.REVIEWS_PAGE,
        site,
    },
    payload: JSON.stringify([
        {
            operationName: "PropertyFilteredReviewsQuery",
            variables: {
                context: {
                    siteId: SITES_CONFIG[site].siteId,
                    locale: "en_US",
                    eapid: 0,
                    currency: "USD",
                    device: { type: "DESKTOP" },
                    identity: {
                        duaid: randomUUID(),
                        expUserId: "-1",
                        tuid: "-1",
                        authState: "ANONYMOUS",
                    },
                    privacyTrackingState: "CAN_NOT_TRACK",
                    debugContext: {
                        abacusOverrides: [],
                        alterMode: "RELEASED",
                    },
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
                            {
                                id: "includeRatingsOnlyReviews",
                                value: true,
                            },
                            {
                                id: "overrideEmbargoForIndividualReviews",
                                value: true,
                            },
                        ],
                        counts: [
                            { id: "startIndex", value: startIndex },
                            { id: "size", value: PAGE_SIZE },
                        ],
                        selections: [
                            {
                                id: "sortBy",
                                value: sortByToRequestParamMap[
                                    scrapeSettings.sortBy
                                ],
                            },
                        ],
                    },
                },
            },
            query: QUERY,
        },
    ]),
});

export const getNextPagesRequests = (
    hotelId: string,
    currentIndex: number | null,
    scrapeSettings: ScrapeSettings,
    customData: any,
    site: string
) =>
    new Array(5)
        .fill(undefined)
        .map((_, i) => (currentIndex ?? -PAGE_SIZE) + PAGE_SIZE * (i + 1))
        .filter((startIndex) => startIndex < scrapeSettings.maxReviewsPerHotel)
        .map((startIndex) =>
            getReviewsPageRequest(
                hotelId,
                scrapeSettings,
                startIndex,
                customData,
                site
            )
        );
