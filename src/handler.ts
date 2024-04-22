import { Actor, log } from "apify";
import {
    CheerioCrawlingContext,
    createCheerioRouter,
} from "@crawlee/cheerio";
import {
    getNextPagesRequests,
    LABEL,
    ScrapeSettings,
    UserData,
} from "./utils.js";

export const router = createCheerioRouter<
    CheerioCrawlingContext & { scrapeSettings: ScrapeSettings }
>();

router.addHandler(
    LABEL.GET_HOTEL_ID,
    async ({ request, crawler, $, scrapeSettings }) => {
        const hotelIdsFound = $("script")
            .toArray()
            .flatMap((script) => {
                const text = $(script).text();
                const match = text.match(
                    /"propertyId\\\\\\"\s*:\s*\\\\\\"(\d+)\\\\\\"/
                );
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
                scrapeSettings,
                request.userData.customData,
                request.userData.site
            )
        );
    }
);

router.addHandler<UserData>(
    LABEL.REVIEWS_PAGE,
    async ({ request, json, crawler, scrapeSettings }) => {
        const remainingPaidResults =
            scrapeSettings.maxResults - scrapeSettings.state.pushedResults;
        if (remainingPaidResults <= 0) return;

        const allReviews: any[] = json[0].data.propertyInfo.reviewInfo.reviews;

        const dateFilteredReviews = allReviews.filter((x, i) => {
            const value = x.submissionTime.longDateFormat;
            const d = new Date(`${value} UTC`);
            if (Number.isNaN(d.getTime())) {
                log.warning(
                    `Failed to parse date for review hotelId=${
                        request.userData.hotelId
                    };position=${
                        request.userData.startIndex + i + 1
                    } \`${value}\``
                );
                return true;
            }
            return d.getTime() >= scrapeSettings.minDate.getTime();
        });

        const reviews = dateFilteredReviews
            .slice(
                0,
                scrapeSettings.maxReviewsPerHotel - request.userData.startIndex
            )
            .slice(0, remainingPaidResults);

        if (reviews.length === 0) return;
        // only search further if we didn't remove any reviews due to date/count limits
        const shouldEnqueueNext = allReviews.length === reviews.length;

        await Actor.pushData(
            reviews.map((review, i) => ({
                ...review,
                hotelId: request.userData.hotelId,
                reviewPosition: request.userData.startIndex + i + 1,
                customData: request.userData.customData,
            }))
        );
        scrapeSettings.state.pushedResults += reviews.length;

        log.info(
            `Extracted reviews ${request.userData.startIndex + 1}-${
                request.userData.startIndex + reviews.length
            } for hotel ${request.userData.hotelId}`
        );

        if (shouldEnqueueNext)
            await crawler.addRequests(
                getNextPagesRequests(
                    request.userData.hotelId,
                    request.userData.startIndex,
                    scrapeSettings,
                    request.userData.customData,
                    request.userData.site
                )
            );

        if (scrapeSettings.state.pushedResults >= scrapeSettings.maxResults) {
            await Actor.setStatusMessage(
                `Finishing scraping because we reached Maximum number of paid results`
            );
            await crawler.teardown();
        }
    }
);
