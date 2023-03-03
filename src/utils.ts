import { randomUUID } from "crypto";
import { readFile } from "fs/promises";

export const SITES_CONFIG: Record<
    string,
    { urlRegex: RegExp | null; siteId: number }
> = {
    "www.expedia.com": {
        urlRegex: /\.h(\d+)\.Hotel-Information/,
        siteId: 1,
    },
    "www.hotels.com": {
        urlRegex: null,
        siteId: 300000001,
    },
};

export enum LABEL {
    GET_HOTEL_ID = "GET_HOTEL_ID",
    REVIEWS_PAGE = "REVIEWS_PAGE",
}

export const PAGE_SIZE = 10;
const QUERY = await readFile("src/reviewsQuery.graphql", "utf-8");

const getReviewsPageRequest = (
    hotelId: string,
    startIndex: number,
    customData: any,
    site: string
): {
    url: string;
    method: "POST";
    uniqueKey: string;
    payload: string;
    headers: Record<string, string>;
    userData: any;
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
                            { id: "includeRatingsOnlyReviews", value: true },
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
                                value: "NEWEST_TO_OLDEST_BY_LANGUAGE",
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
    maxReviewsPerHotel: number,
    customData: any,
    site: string
) =>
    new Array(3)
        .fill(undefined)
        .map((_, i) => (currentIndex ?? -PAGE_SIZE) + PAGE_SIZE * (i + 1))
        .filter((startIndex) => startIndex < maxReviewsPerHotel)
        .map((startIndex) =>
            getReviewsPageRequest(hotelId, startIndex, customData, site)
        );
