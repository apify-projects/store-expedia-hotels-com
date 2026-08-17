import { EXPEDIA_HOST, HOTELS_HOST, PAGE_SIZE, SITE_CONFIGS, VRBO_HOST } from '../consts.js';
import type { SiteHost } from '../types/common.js';

/** Regional domains (expedia.it, de.hotels.com, hoteis.com) all serve the same API under one host per brand. */
export const resolveSiteHost = (hostname: string): SiteHost | undefined => {
    const host = hostname.toLowerCase();

    if (host.endsWith('hotels.com') || host.endsWith('hoteis.com')) return HOTELS_HOST;
    if (host.includes('vrbo')) return VRBO_HOST;
    if (host.includes('expedia')) return EXPEDIA_HOST;

    return undefined;
};

export const findPropertyIdInUrl = (url: URL, site: SiteHost): string | undefined => {
    const { propertyIdPattern } = SITE_CONFIGS[site];

    return propertyIdPattern ? url.pathname.match(propertyIdPattern)?.[1] : undefined;
};

export const buildRemainingStartIndexes = (totalCount: number, maxReviewsPerHotel = Infinity): number[] => {
    const reviewsToScrape = Math.min(totalCount, maxReviewsPerHotel);
    const startIndexes: number[] = [];

    for (let startIndex = PAGE_SIZE; startIndex < reviewsToScrape; startIndex += PAGE_SIZE) {
        startIndexes.push(startIndex);
    }

    return startIndexes;
};
