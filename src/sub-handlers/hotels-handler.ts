import { CheerioCrawlingContext } from "@crawlee/cheerio";
import { log } from "apify";
import { getNextPagesRequests, ScrapeSettings } from "../utils.js";

export async function hotelsHandler({ $, crawler, scrapeSettings, request }: CheerioCrawlingContext & { scrapeSettings: ScrapeSettings }) {
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
