import { Actor, log } from "apify";
import {
    buildReviewsBody,
    hotelIdFromHtml,
    hotelIdFromUrl,
    PAGE_SIZE,
    resolveSite,
    ScrapeSettings,
    SITES_CONFIG,
    SortBy,
} from "./utils.js";
import { chargeEvent, PPE_EVENTS, pushReviews } from "./pricing.js";
import { ghostFetch, MOBILE_HEADERS } from "./ghost-fetch-client.js";

await Actor.init();
await chargeEvent({ eventName: PPE_EVENTS.START, skipIfAlreadyCharged: true });

const input = (await Actor.getInput<{
    startUrls: { url: string; userData?: Record<string, unknown> }[];
    maxReviewsPerHotel: number;
    sortBy: SortBy;
    minDate: string;
    debugLog: boolean;
}>())!;

let minDate = new Date(input.minDate || "1990-01-01");
const DEFAULT_DATE = new Date("1990-01-01");
if (input.sortBy !== SortBy.MostRecent && minDate.toJSON() !== DEFAULT_DATE.toJSON()) {
    minDate = DEFAULT_DATE;
    log.error(`minDate is only supported for SortBy.MostRecent`);
    await Actor.setStatusMessage(`minDate is only supported for SortBy.MostRecent, the field will be ignored`);
}
if (input.debugLog) log.setLevel(log.LEVELS.DEBUG);

const scrapeSettings: ScrapeSettings = {
    sortBy: input.sortBy,
    minDate,
    maxReviewsPerHotel: input.maxReviewsPerHotel || Infinity,
    maxResults: Number(process.env.ACTOR_MAX_PAID_DATASET_ITEMS) || Infinity,
    state: await Actor.useState("STATE", { pushedResults: 0 }),
};

let stop = false;

// Resolve the property id. Expedia/VRBO carry it in the URL; Hotels.com needs a
// page fetch (mobile UA) to read it from the embedded data.
async function resolveHotelId(rawUrl: string, site: string, session: string): Promise<string | null> {
    const url = new URL(rawUrl);
    const fromUrl = hotelIdFromUrl(url, site);
    if (fromUrl) return fromUrl;
    const res = await ghostFetch(rawUrl, { headers: MOBILE_HEADERS, session, country: "US" });
    return hotelIdFromHtml(res.content);
}

async function scrapeHotel(rawUrl: string, customData: Record<string, unknown>) {
    let url: URL;
    try {
        url = new URL(rawUrl.trim());
    } catch {
        log.error(`Invalid URL: ${rawUrl}`);
        return;
    }
    const site = resolveSite(url.hostname);
    if (!SITES_CONFIG[site]) {
        log.error(`Unknown site: ${site} (${rawUrl})`);
        return;
    }
    const session = `exp${site.replace(/[^a-z0-9]/gi, "")}${(url.pathname.match(/\d+/g)?.join("") ?? "").slice(-12)}`;

    const hotelId = await resolveHotelId(rawUrl, site, session);
    if (!hotelId) {
        log.error(`Could not extract hotel ID from ${rawUrl}`);
        return;
    }
    log.info(`Hotel ${hotelId} (${site}) - fetching reviews`);

    let startIndex = 0;
    while (
        !stop &&
        startIndex < scrapeSettings.maxReviewsPerHotel &&
        scrapeSettings.state.pushedResults < scrapeSettings.maxResults
    ) {
        const body = JSON.stringify(buildReviewsBody(hotelId, site, startIndex, scrapeSettings));
        const res = await ghostFetch(`https://${site}/graphql`, {
            method: "POST",
            headers: MOBILE_HEADERS,
            body,
            session,
            country: "US",
        });
        if (res.status !== 200) {
            log.warning(`graphql ${res.status} for hotel ${hotelId} @${startIndex}: ${res.content.slice(0, 160)}`);
            break;
        }
        let parsed: unknown;
        try {
            parsed = JSON.parse(res.content);
        } catch {
            log.error(`graphql non-JSON for hotel ${hotelId} @${startIndex}`);
            break;
        }
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const allReviews: any[] = (parsed as any)?.[0]?.data?.propertyInfo?.reviewInfo?.reviews ?? [];
        if (allReviews.length === 0) {
            log.info(`No more reviews for hotel ${hotelId} at index ${startIndex}`);
            break;
        }

        const remainingPaid = scrapeSettings.maxResults - scrapeSettings.state.pushedResults;
        let hitOldReview = false;
        const dateFiltered = allReviews.filter((x, i) => {
            const value = x.submissionTime?.longDateFormat;
            const d = new Date(`${value} UTC`);
            if (Number.isNaN(d.getTime())) {
                log.warning(`Failed to parse date hotelId=${hotelId};position=${startIndex + i + 1} \`${value}\``);
                return true;
            }
            const keep = d.getTime() >= scrapeSettings.minDate.getTime();
            if (!keep) hitOldReview = true;
            return keep;
        });

        const reviews = dateFiltered
            .slice(0, (scrapeSettings.maxReviewsPerHotel ?? Infinity) - startIndex)
            .slice(0, remainingPaid);

        if (reviews.length > 0) {
            const { chargeLimitReached } = await pushReviews(
                reviews.map((review, i) => ({
                    ...review,
                    hotelId,
                    reviewPosition: startIndex + i + 1,
                    customData,
                })),
            );
            scrapeSettings.state.pushedResults += reviews.length;
            log.info(`Extracted reviews ${startIndex + 1}-${startIndex + reviews.length} for hotel ${hotelId}`);
            if (chargeLimitReached) {
                stop = true;
                await Actor.setStatusMessage("Finishing scraping because we reached Maximum number of paid results");
                break;
            }
        }

        // Reviews are newest-first; once we cross minDate or get a short page, stop.
        if (hitOldReview || allReviews.length < PAGE_SIZE) break;
        startIndex += PAGE_SIZE;
    }
}

// Bounded concurrency over the input hotels.
const sources = (input.startUrls ?? [])
    .map((s) => (typeof s === "string" ? { url: s, userData: {} } : { url: s.url, userData: s.userData ?? {} }))
    .filter((s) => s?.url);

const CONCURRENCY = 3;
let cursor = 0;
async function worker() {
    while (cursor < sources.length && !stop) {
        const s = sources[cursor++];
        try {
            await scrapeHotel(s.url, s.userData as Record<string, unknown>);
        } catch (err) {
            log.error(`Failed ${s.url}: ${(err as Error).message}`);
        }
    }
}
await Promise.all(Array.from({ length: Math.min(CONCURRENCY, sources.length) }, worker));

await Actor.exit();
