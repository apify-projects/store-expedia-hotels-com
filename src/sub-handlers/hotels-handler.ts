import type { CheerioAPI } from "cheerio";
import { log } from "apify";
import { getNextPagesRequests, QueueRequest, ScrapeSettings } from "../utils.js";

export function hotelsHandler($: CheerioAPI, req: QueueRequest, scrapeSettings: ScrapeSettings): QueueRequest[] {
    const hotelIdsFound = $("script")
        .toArray()
        .flatMap((script) => {
            const text = $(script).text();
            const match = text.match(/"propertyId\\\\\\"\s*:\s*\\\\\\"(\d+)\\\\\\"/);
            if (match) return [match[1]];
            return [];
        });
    if (hotelIdsFound.length === 0) throw new Error(`Could not extract hotel ID from ${req.url}`);
    if (hotelIdsFound.length > 1) {
        log.warning(`Found multiple hotel IDs on ${req.url}: ${hotelIdsFound.join(", ")}`);
    } else {
        log.info(`Found hotel ID ${hotelIdsFound[0]} on ${req.url}`);
    }
    return getNextPagesRequests(hotelIdsFound[0], null, scrapeSettings, req.userData.customData, req.userData.site);
}
