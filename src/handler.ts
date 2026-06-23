import { Actor, log } from "apify";
import { load } from "cheerio";
import {
    getNextPagesRequests,
    HOTELS_COM_HOSTNAME,
    LABEL,
    QueueRequest,
    ScrapeSettings,
    VRBO_COM_HOSTNAME,
} from "./utils.js";
import { vrboHandler } from "./sub-handlers/vrbo-handler.js";
import { hotelsHandler } from "./sub-handlers/hotels-handler.js";
import { pushReviews } from "./pricing.js";

let _shouldStop = false;
export const isStopped = () => _shouldStop;

export async function handleGetHotelId(
    req: QueueRequest,
    content: string,
    scrapeSettings: ScrapeSettings,
): Promise<QueueRequest[]> {
    const $ = load(content);
    if (req.userData.site === VRBO_COM_HOSTNAME) return vrboHandler($, req, scrapeSettings);
    if (req.userData.site === HOTELS_COM_HOSTNAME) return hotelsHandler($, req, scrapeSettings);
    return [];
}

export async function handleReviewsPage(
    req: QueueRequest,
    content: string,
    scrapeSettings: ScrapeSettings,
): Promise<QueueRequest[]> {
    const remainingPaidResults = scrapeSettings.maxResults - scrapeSettings.state.pushedResults;
    if (remainingPaidResults <= 0) return [];

    let parsed: any;
    try {
        parsed = JSON.parse(content);
    } catch {
        log.error(`Failed to parse JSON for ${req.url}`);
        return [];
    }

    const allReviews: any[] = parsed[0]?.data?.propertyInfo?.reviewInfo?.reviews ?? [];
    if (!allReviews.length) {
        log.info(`No reviews in response for hotel ${req.userData.hotelId}`);
        return [];
    }

    const startIndex = req.userData.startIndex ?? 0;

    const dateFilteredReviews = allReviews.filter((x, i) => {
        const value = x.submissionTime?.longDateFormat;
        const d = new Date(`${value} UTC`);
        if (Number.isNaN(d.getTime())) {
            log.warning(
                `Failed to parse date for review hotelId=${req.userData.hotelId};position=${startIndex + i + 1} \`${value}\``
            );
            return true;
        }
        return d.getTime() >= scrapeSettings.minDate.getTime();
    });

    const reviews = dateFilteredReviews
        .slice(0, (scrapeSettings.maxReviewsPerHotel ?? Infinity) - startIndex)
        .slice(0, remainingPaidResults);

    if (reviews.length === 0) return [];

    const shouldEnqueueNext = allReviews.length === reviews.length;

    const { chargeLimitReached } = await pushReviews(
        reviews.map((review, i) => ({
            ...review,
            hotelId: req.userData.hotelId,
            reviewPosition: startIndex + i + 1,
            customData: req.userData.customData,
        }))
    );

    if (chargeLimitReached) {
        _shouldStop = true;
        await Actor.setStatusMessage("Finishing scraping because we reached Maximum number of paid results");
        return [];
    }

    scrapeSettings.state.pushedResults += reviews.length;
    log.info(
        `Extracted reviews ${startIndex + 1}-${startIndex + reviews.length} for hotel ${req.userData.hotelId}`
    );

    if (!shouldEnqueueNext) return [];

    return getNextPagesRequests(
        req.userData.hotelId!,
        startIndex,
        scrapeSettings,
        req.userData.customData,
        req.userData.site,
    );
}
