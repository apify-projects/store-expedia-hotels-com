import { CheerioCrawlingContext } from "@crawlee/cheerio";
import { getNextPagesRequests, ScrapeSettings } from "../utils.js";

export async function vrboHandler({ $, request, crawler, scrapeSettings }: CheerioCrawlingContext & { scrapeSettings: ScrapeSettings }) {
    const hotelId = $('meta[itemProp="identifier"]').attr('content');

    if (!hotelId) {
        request.noRetry = true;
        throw new Error(`Could not extract hotel ID from ${request.url}`);
    }

    await crawler.addRequests(
        getNextPagesRequests(
            hotelId,
            null,
            scrapeSettings,
            request.userData.customData,
            request.userData.site,
        )
    );
}
