import { Actor, log } from "apify";
import { CheerioCrawler, NonRetryableError, RequestList, Source } from "@crawlee/cheerio";
import { router } from "./handler.js";
import {
    EXPEDIA_HOSTNAME,
    getNextPagesRequests,
    HOTELS_COM_HOSTNAME,
    LABEL,
    ScrapeSettings,
    SITES_CONFIG,
    SortBy,
} from "./utils.js";

await Actor.init();

const input = (await Actor.getInput<{
    startUrls: Source[];
    maxReviewsPerHotel: number;
    sortBy: SortBy;
    minDate: string;

    // not in schema
    debugLog: boolean;
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
    minDate,
    maxReviewsPerHotel: input.maxReviewsPerHotel || Infinity,
    maxResults: Number(process.env.ACTOR_MAX_PAID_DATASET_ITEMS) || Infinity,
    totalPushedResults: await Actor.getValue('TOTAL_PUSHED_RESULTS') || 0,
};

const saveState = () => Actor.setValue('TOTAL_PUSHED_RESULTS', scrapeSettings.totalPushedResults);
Actor.on('persistState', saveState);
Actor.on('aborting', saveState);

const unprocessedRequestList = await RequestList.open(
    "start-urls",
    input.startUrls
);
const processedRequests = [];
while (true) {
    const request = await unprocessedRequestList.fetchNextRequest();
    if (!request) break;

    const url = new URL(request.url);
    let site = url.hostname;

    if (site.endsWith("hotels.com") || site.endsWith("hoteis.com"))
        site = HOTELS_COM_HOSTNAME;
    if (site.includes("expedia")) site = EXPEDIA_HOSTNAME;

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
        const match = url.pathname.match(config.urlRegex);
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
    proxyConfiguration: await Actor.createProxyConfiguration({
        groups: ["RESIDENTIAL"],
    }),
    maxRequestRetries: 8,
    requestHandler: router as any,
    preNavigationHooks: [async () => {
        const maxLimitReached = scrapeSettings.totalPushedResults >= scrapeSettings.maxResults;

        if (maxLimitReached) {
            const errorMessage = `Reached limit of max crawled places for this search term, skipping all next requests in the queue for this search `
                + `(this might take a while, don't mind the errors). [Draining request queue]`;
            if (!scrapeSettings.startedDrainingState === true) {
                await Actor.setStatusMessage(errorMessage);
            }

            // We don't want anything to override our status message
            // @ts-expect-error - this is a hack to override the status message
            crawler.setStatusMessage = () => { /* do nothing */ };

            scrapeSettings.startedDrainingState = true
            throw new NonRetryableError(errorMessage);
        }
    }],
});

await crawler.run(processedRequests);
await Actor.exit();
