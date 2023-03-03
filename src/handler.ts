import { log } from "apify";
import {
    CheerioCrawlingContext,
    createCheerioRouter,
    Dataset,
} from "@crawlee/cheerio";
import { getNextPagesRequests, LABEL } from "./utils.js";
import { ExtraContext } from "./main.js";

export const router = createCheerioRouter<
    CheerioCrawlingContext & ExtraContext
>();

router.addHandler(
    LABEL.GET_HOTEL_ID,
    async ({ request, crawler, $, maxReviewsPerHotel }) => {
        const hotelIdsFound = $("script")
            .toArray()
            .flatMap((script) => {
                const text = $(script).text();
                const match = text.match(/\\"hotelId\\"\s*:\s*(\d+)/);
                if (match) return [match[1]];
                return [];
            });
        if (hotelIdsFound.length === 0) {
            request.noRetry = true;
            throw new Error(`Could not extract hotel ID from ${request.url}`);
        }
        if (hotelIdsFound.length > 1) {
            log.warning(
                `Found multiple hotel IDs on ${
                    request.url
                }: ${hotelIdsFound.join(", ")}`
            );
        } else {
            log.info(`Found hotel ID ${hotelIdsFound[0]} on ${request.url}`);
        }
        await crawler.addRequests(
            getNextPagesRequests(
                hotelIdsFound[0],
                null,
                maxReviewsPerHotel,
                request.userData.customData,
                request.userData.site
            )
        );
    }
);

router.addHandler(
    LABEL.REVIEWS_PAGE,
    async ({ request, json, crawler, maxReviewsPerHotel }) => {
        const reviews = json[0].data.propertyInfo.reviewInfo.reviews.slice(
            0,
            maxReviewsPerHotel - request.userData.startIndex
        );
        if (reviews.length === 0) return;
        await crawler.addRequests(
            getNextPagesRequests(
                request.userData.hotelId,
                request.userData.startIndex,
                maxReviewsPerHotel,
                request.userData.customData,
                request.userData.site
            )
        );
        await Dataset.pushData(
            reviews.map((review: any) => ({
                ...review,
                hotelId: request.userData.hotelId,
                customData: request.userData.customData,
            }))
        );
        log.info(
            `Extracted reviews ${request.userData.startIndex + 1}-${
                request.userData.startIndex + reviews.length
            } for hotel ${request.userData.hotelId}`
        );
    }
);
