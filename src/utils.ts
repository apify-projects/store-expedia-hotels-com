import { randomUUID } from "crypto";
import { readFile } from "fs/promises";

export const PAGE_SIZE = 10;
const QUERY = await readFile("src/reviewsQuery.graphql", "utf-8");

const getReviewsPageRequest = (
    hotelId: string,
    startIndex: number,
    customData: any
): {
    url: string;
    method: "POST";
    uniqueKey: string;
    payload: string;
    headers: Record<string, string>;
    userData: {
        hotelId: string;
        startIndex: number;
        customData: any;
    };
} => ({
    url: "https://www.expedia.com/graphql",
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
    },
    payload: JSON.stringify([
        {
            operationName: "PropertyFilteredReviewsQuery",
            variables: {
                context: {
                    siteId: 1,
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
    customData: any
) =>
    new Array(3)
        .fill(undefined)
        .map((_, i) => (currentIndex ?? -PAGE_SIZE) + PAGE_SIZE * (i + 1))
        .filter((startIndex) => startIndex < maxReviewsPerHotel)
        .map((startIndex) =>
            getReviewsPageRequest(hotelId, startIndex, customData)
        );
