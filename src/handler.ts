import { Actor, log } from "apify";
import {
    CheerioCrawlingContext,
    createCheerioRouter,
} from "@crawlee/cheerio";
import {
    getNextPagesRequests,
    HOTELS_COM_HOSTNAME,
    LABEL,
    ScrapeSettings,
    UserData,
    VRBO_COM_HOSTNAME,
} from "./utils.js";
import { vrboHandler } from "./sub-handlers/vrbo-handler.js";
import { hotelsHandler } from "./sub-handlers/hotels-handler.js";
import { pushReviews } from "./pricing.js";

export const router = createCheerioRouter<
    CheerioCrawlingContext & { scrapeSettings: ScrapeSettings }
>();

router.addHandler(
    LABEL.GET_HOTEL_ID,
    async (ctx) => {
        const { request } = ctx;
        if (request.userData.site === VRBO_COM_HOSTNAME) await vrboHandler(ctx);
        if (request.userData.site === HOTELS_COM_HOSTNAME) await hotelsHandler(ctx);
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

        const { chargeLimitReached } = await pushReviews(
            reviews.map((review, i) => ({
                ...review,
                hotelId: request.userData.hotelId,
                reviewPosition: request.userData.startIndex + i + 1,
                customData: request.userData.customData,
            }))
        );
        if (chargeLimitReached) await crawler.autoscaledPool?.abort();

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
