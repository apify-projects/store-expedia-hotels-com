import { Actor, log } from "apify";
import {
    EXPEDIA_HOSTNAME,
    getNextPagesRequests,
    HOTELS_COM_HOSTNAME,
    LABEL,
    QueueRequest,
    ScrapeSettings,
    SITES_CONFIG,
    SortBy,
    VRBO_COM_HOSTNAME,
} from "./utils.js";
import { chargeEvent, PPE_EVENTS } from "./pricing.js";
import { ghostFetch } from "./ghost-fetch-client.js";
import { handleGetHotelId, handleReviewsPage, isStopped } from "./handler.js";

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

// Build initial queue from startUrls.
const queue: QueueRequest[] = [];
const seen = new Set<string>();

function enqueue(req: QueueRequest): void {
    const key = req.uniqueKey ?? req.url;
    if (seen.has(key)) return;
    seen.add(key);
    queue.push(req);
}

for (const source of (input.startUrls ?? [])) {
    const rawUrl = typeof source === "string" ? source : source.url;
    if (!rawUrl) continue;

    let url: URL;
    try {
        url = new URL(rawUrl.trim());
    } catch {
        log.error(`Invalid URL: ${rawUrl}`);
        continue;
    }

    let site = url.hostname;
    if (site.endsWith("hotels.com") || site.endsWith("hoteis.com")) site = HOTELS_COM_HOSTNAME;
    if (site.includes("expedia")) site = EXPEDIA_HOSTNAME;
    if (site.includes("vrbo")) site = VRBO_COM_HOSTNAME;

    const config = SITES_CONFIG[site];
    if (config === undefined) {
        log.error(`Unknown site: ${site}`);
        continue;
    }

    const customData = typeof source === "string" ? {} : (source.userData ?? {});

    if (config.urlRegex === null) {
        enqueue({ url: rawUrl, userData: { site, label: LABEL.GET_HOTEL_ID, customData } });
    } else {
        const match = url.pathname.match(config.urlRegex);
        if (!match) {
            log.error(`Could not extract hotel ID from URL: ${rawUrl}`);
            continue;
        }
        for (const req of getNextPagesRequests(match[1], null, scrapeSettings, customData, site)) {
            enqueue(req);
        }
    }
}

const CONCURRENCY = 10;
const MAX_RETRIES = 3;

async function processRequest(req: QueueRequest): Promise<void> {
    if (isStopped()) return;

    let gfRes;
    try {
        gfRes = await ghostFetch(req.url, {
            method: req.method ?? "GET",
            headers: req.headers,
            body: req.body,
            country: "US",
            session: req.userData.hotelId
                ? `expedia-${req.userData.site}-${req.userData.hotelId}`
                : `expedia-${req.userData.site}-init`,
        });
    } catch (err) {
        const retries = req.retries ?? 0;
        if (retries < MAX_RETRIES) {
            queue.push({ ...req, retries: retries + 1 });
        } else {
            log.error(`ghost-fetch error after ${MAX_RETRIES} retries: ${req.url}: ${err}`);
        }
        return;
    }

    if (gfRes.blocked || gfRes.status >= 400) {
        const retries = req.retries ?? 0;
        if (retries < MAX_RETRIES) {
            log.warning(`Retrying (${retries + 1}/${MAX_RETRIES}) ${req.url} status=${gfRes.status} blocked=${gfRes.blocked}`);
            queue.push({ ...req, retries: retries + 1 });
        } else {
            log.error(`Failed after ${MAX_RETRIES} retries: ${req.url} status=${gfRes.status}`);
        }
        return;
    }

    try {
        const newRequests = req.userData.label === LABEL.GET_HOTEL_ID
            ? await handleGetHotelId(req, gfRes.content, scrapeSettings)
            : await handleReviewsPage(req, gfRes.content, scrapeSettings);

        for (const newReq of newRequests) enqueue(newReq);
    } catch (err) {
        log.error(`Handler error for ${req.url}: ${err}`);
    }
}

// Process queue in rounds of CONCURRENCY until drained or shouldStop.
while (queue.length > 0) {
    if (isStopped()) break;

    const batch = queue.splice(0, CONCURRENCY);
    await Promise.all(batch.map(processRequest));
}

await Actor.exit();
