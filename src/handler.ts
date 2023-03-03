import { log } from "apify";
import { CheerioCrawlingContext, Dataset } from "@crawlee/cheerio";
import { getNextPagesRequests } from "./utils.js";

export async function requestHandler(
    { request, json, crawler }: CheerioCrawlingContext,
    { maxReviewsPerHotel }: { maxReviewsPerHotel: number }
) {
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
            request.userData.customData
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
