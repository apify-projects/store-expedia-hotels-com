import { Actor, log, ProxyConfigurationOptions } from "apify";
import { CheerioCrawler, RequestList, Source } from "@crawlee/cheerio";
import { router } from "./handler.js";
import {
    getNextPagesRequests,
    LABEL,
    ScrapeSettings,
    SITES_CONFIG,
    SortBy,
} from "./utils.js";

await Actor.init();

const input = (await Actor.getInput<{
    proxyConfiguration: ProxyConfigurationOptions;
    startUrls: Source[];
    maxReviewsPerHotel: number;
    maxRequestRetries: number;
    debugLog: boolean;
    sortBy: SortBy;
    minDate: string;
}>())!;

let minDate = new Date(input.minDate || "1990-01-01");
const DEFAULT_DATE = new Date("1990-01-01");

if (
    input.sortBy !== SortBy.MostRecent &&
    minDate.toJSON() !== DEFAULT_DATE.toJSON()
) {
    minDate = DEFAULT_DATE;
    log.error(`minDate is only supported for SortBy.MostRecent`);
    await Actor.setStatusMessage(
        `minDate is only supported for SortBy.MostRecent, the field will be ignored`
    );
}

if (input.debugLog) log.setLevel(log.LEVELS.DEBUG);

const scrapeSettings: ScrapeSettings = {
    sortBy: input.sortBy,
    maxReviewsPerHotel: input.maxReviewsPerHotel,
    minDate,
};

const unprocessedRequestList = await RequestList.open(
    "start-urls",
    input.startUrls
);
const processedRequests = [];
while (true) {
    const request = await unprocessedRequestList.fetchNextRequest();
    if (!request) break;

    const site = new URL(request.url).hostname;
    const config = SITES_CONFIG[site];
    if (config === undefined) {
        log.error(`Unknown site: ${site}`);
        continue;
    }
    if (config.urlRegex === null) {
        processedRequests.push({
            url: request.url,
            userData: {
                site,
                label: LABEL.GET_HOTEL_ID,
                customData: request.userData,
            },
        });
    } else {
        const match = request.url.match(config.urlRegex);
        if (!match) {
            log.error(`Could not extract hotel ID from URL: ${request.url}`);
            continue;
        }
        processedRequests.push(
            ...getNextPagesRequests(
                match[1],
                null,
                scrapeSettings,
                request.userData,
                site
            )
        );
    }
}

router.use((ctx) => {
    ctx.scrapeSettings = scrapeSettings;
});

const crawler = new CheerioCrawler({
    proxyConfiguration: await Actor.createProxyConfiguration(
        input.proxyConfiguration
    ),
    // temporary workaround for https://github.com/apify/crawlee/issues/1994
    additionalMimeTypes: ["application/octet-stream"],
    maxRequestRetries: input.maxRequestRetries,
    requestHandler: router as any,
});

await crawler.run(processedRequests);
await Actor.exit();
