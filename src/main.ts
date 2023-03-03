import { Actor, log, ProxyConfigurationOptions } from "apify";
import { CheerioCrawler, RequestList, Source } from "@crawlee/cheerio";
import { router } from "./handler.js";
import { getNextPagesRequests, LABEL, SITES_CONFIG } from "./utils.js";

await Actor.init();

const input = (await Actor.getInput<{
    proxyConfiguration: ProxyConfigurationOptions;
    startUrls: Source[];
    maxReviewsPerHotel: number;
}>())!;

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
                input.maxReviewsPerHotel,
                request.userData,
                site
            )
        );
    }
}

export type ExtraContext = {
    maxReviewsPerHotel: number;
};

router.use((ctx) => {
    ctx.maxReviewsPerHotel = input.maxReviewsPerHotel;
});
const crawler = new CheerioCrawler({
    proxyConfiguration: await Actor.createProxyConfiguration(
        input.proxyConfiguration
    ),
    requestHandler: router as any,
});

await crawler.run(processedRequests);
await Actor.exit();
