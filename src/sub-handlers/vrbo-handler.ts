import type { CheerioAPI } from "cheerio";
import { getNextPagesRequests, QueueRequest, ScrapeSettings } from "../utils.js";

export function vrboHandler($: CheerioAPI, req: QueueRequest, scrapeSettings: ScrapeSettings): QueueRequest[] {
    const hotelId = $('meta[itemprop="identifier"], meta[itemProp="identifier"]').attr("content");
    if (!hotelId) throw new Error(`Could not extract hotel ID from ${req.url}`);
    return getNextPagesRequests(hotelId, null, scrapeSettings, req.userData.customData, req.userData.site);
}
