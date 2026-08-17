import { randomUUID } from 'node:crypto';

import type { RequestOptions } from '@crawlee/cheerio';
import { log } from 'apify';

import { LABELS, PAGE_SIZE, SITE_CONFIGS, SORT_MAP } from './consts.js';
import { REVIEWS_QUERY } from './reviews-query.js';
import type { Input } from './types/input.js';
import type { BaseUserData, PropertyIdUserData, ReviewsUserData } from './types/user-data.js';
import { getMinDate } from './utils/dates.js';
import { findPropertyIdInUrl, resolveSiteHost } from './utils/urls.js';

const CLIENT_INFO = { name: 'android.com.expedia.bookings', version: '2026.25.0' };

/** The web client is rate-limited at the gateway; this native-app identity rides a separate bucket. */
const MOBILE_HEADERS = {
    'content-type': 'application/json',
    accept: 'application/json',
    'client-info': `${CLIENT_INFO.name},${CLIENT_INFO.version},external`,
    'x-eb-client':
        'PLATFORM:ANDROID;OS_VERSION:12;MANUFACTURER:Google;MODEL:sdk_gphone64_arm64;MODEL_NAME:sdk_gphone64_arm64;UPGRADE:false;APP_VERSION:2026.25.0;LOCALE:en_US;APP_IDENTIFIER:com.expedia.bookings;',
    'user-agent':
        'ExpediaBookings/2026.25.0 Dalvik/2.1.0 (Linux; U; Android 12; sdk_gphone64_arm64 Build/S2B2.211203.006)',
};

const buildReviewsPayload = ({ site, propertyId, startIndex, sortBy }: ReviewsUserData) => [
    {
        operationName: 'PropertyFilteredReviewsQuery',
        variables: {
            context: {
                siteId: SITE_CONFIGS[site].siteId,
                locale: 'en_US',
                eapid: 1,
                currency: 'USD',
                device: { type: 'APP_PHONE' },
                identity: { duaid: randomUUID(), authState: 'ANONYMOUS' },
                privacyTrackingState: 'CAN_NOT_TRACK',
                debugContext: { abacusOverrides: [] },
                clientInfo: CLIENT_INFO,
            },
            propertyId,
            searchCriteria: {
                primary: { dateRange: null, rooms: [], destination: { regionId: null } },
                secondary: {
                    booleans: [
                        { id: 'includeRecentReviews', value: true },
                        { id: 'includeRatingsOnlyReviews', value: true },
                        { id: 'overrideEmbargoForIndividualReviews', value: true },
                    ],
                    counts: [
                        { id: 'startIndex', value: startIndex },
                        { id: 'size', value: PAGE_SIZE },
                    ],
                    selections: [{ id: 'sortBy', value: SORT_MAP[sortBy] }],
                },
            },
        },
        query: REVIEWS_QUERY,
    },
];

export const buildReviewsRequest = (userData: ReviewsUserData): RequestOptions<ReviewsUserData> => ({
    url: `https://${userData.site}/graphql`,
    method: 'POST',
    label: LABELS.REVIEWS,
    headers: MOBILE_HEADERS,
    payload: JSON.stringify(buildReviewsPayload(userData)),
    // Every page POSTs the same URL, so without this the queue dedupes them into one.
    uniqueKey: `reviews-${userData.site}-${userData.propertyId}-${userData.startIndex}`,
    userData,
});

export const buildStartRequests = (input: Input): RequestOptions<PropertyIdUserData | ReviewsUserData>[] => {
    const settings = {
        sortBy: input.sortBy,
        maxReviewsPerHotel: input.maxReviewsPerHotel,
        minDate: getMinDate(input.sortBy, input.minDate),
    };

    return (input.startUrls ?? []).flatMap((source): RequestOptions<PropertyIdUserData | ReviewsUserData>[] => {
        const rawUrl = typeof source === 'string' ? source : source?.url;
        if (!rawUrl) return [];

        let url: URL;
        try {
            url = new URL(rawUrl.trim());
        } catch {
            log.warning(`Skipping an invalid URL: ${rawUrl}`);
            return [];
        }

        const site = resolveSiteHost(url.hostname);
        if (!site) {
            log.warning(`Skipping a URL that is not an Expedia, Hotels.com or Vrbo property: ${rawUrl}`);
            return [];
        }

        const customData = (typeof source === 'string' ? {} : source.userData) ?? {};
        const userData: BaseUserData = { ...settings, site, customData };
        const propertyId = findPropertyIdInUrl(url, site);

        if (propertyId) {
            return [buildReviewsRequest({ ...userData, propertyId, startIndex: 0 })];
        }

        return [{ url: url.toString(), label: LABELS.PROPERTY_ID, userData }];
    });
};
