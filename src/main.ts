import { Actor, log, ProxyConfigurationOptions } from "apify";
import { CheerioCrawler, RequestList, Source } from "@crawlee/cheerio";
import { requestHandler } from "./handler.js";
import { getNextPagesRequests } from "./utils.js";

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
const RE = /\.h(\d+)\.Hotel-Information/;
while (true) {
    const request = await unprocessedRequestList.fetchNextRequest();
    if (!request) break;

    const match = request.url.match(RE);
    if (!match) {
        log.error(`Could not extract hotel ID from URL: ${request.url}`);
        continue;
    }
    processedRequests.push(
        ...getNextPagesRequests(
            match[1],
            null,
            input.maxReviewsPerHotel,
            request.userData
        )
    );
}

export type ExtraContext = {
    maxReviewsPerHotel: number;
};

const extraContext: ExtraContext = {
    maxReviewsPerHotel: input.maxReviewsPerHotel,
};

const crawler = new CheerioCrawler({
    proxyConfiguration: await Actor.createProxyConfiguration(
        input.proxyConfiguration
    ),
    requestHandler: (ctx) => requestHandler(ctx, extraContext),
});

await crawler.run(processedRequests);
await Actor.exit();
