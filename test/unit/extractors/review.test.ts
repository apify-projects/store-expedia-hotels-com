import { describe, expect, it } from 'vitest';

import { extractReview, extractReviewsPage } from '../../../src/extractors/review.js';
import type { ResponseReviewsPage } from '../../../src/types/responses.js';
import { readJsonFixture } from '../../helpers.js';

// Real responses, each trimmed to three reviews. Hotels.com carries management
// responses and a region; Expedia carries themes, photos and translation info.
const hotelsPage = () => readJsonFixture<ResponseReviewsPage>('reviews-page.json');
const expediaPage = () => readJsonFixture<ResponseReviewsPage>('expedia-reviews-page.json');

const context = { hotelId: '21856', reviewPosition: 1, customData: {} };

describe('extractReviewsPage', () => {
    it('reads the reviews and the property total off a Hotels.com response', () => {
        const page = extractReviewsPage(hotelsPage());

        expect(page?.reviews).toHaveLength(3);
        expect(page?.totalCount).toBe(1002);
    });

    it('reads an Expedia response the same way', () => {
        const page = extractReviewsPage(expediaPage());

        expect(page?.reviews).toHaveLength(3);
        expect(page?.totalCount).toBe(236);
    });

    it('reads an empty page without treating it as malformed', () => {
        const response: ResponseReviewsPage = [{ data: { propertyInfo: { reviewInfo: { reviews: [] } } } }];

        expect(extractReviewsPage(response)).toEqual({ reviews: [], totalCount: undefined });
    });

    it('returns undefined when the body carries no reviews array', () => {
        // How a throttled gateway answers under a 200 - the caller must retry rather
        // than record the property as having no reviews.
        expect(extractReviewsPage([{ errors: [{ message: 'Provisioned rate exceeded' }] }])).toBeUndefined();
        expect(extractReviewsPage([{ data: {} }])).toBeUndefined();
        expect(extractReviewsPage([])).toBeUndefined();
    });
});

describe('extractReview', () => {
    it('maps a Hotels.com review, flattening the management response header', () => {
        const [raw] = extractReviewsPage(hotelsPage())!.reviews;
        const review = extractReview(raw!, context);

        expect(review).toMatchObject({
            id: expect.any(String),
            text: expect.any(String),
            disclaimer: 'Verified review',
            submissionTime: { longDateFormat: expect.any(String) },
            reviewScoreWithDescription: { value: expect.stringMatching(/^\d+\/10/) },
            hotelId: '21856',
            reviewPosition: 1,
        });
        expect(review.managementResponses[0]).toMatchObject({
            id: expect.any(String),
            header: expect.stringContaining('Response from'),
            response: expect.any(String),
        });
    });

    it('maps Expedia themes and photos into flat shapes', () => {
        const withThemes = extractReviewsPage(expediaPage())!.reviews.map((raw) => extractReview(raw, context));
        const themed = withThemes.find((review) => review.themes.length > 0);
        const pictured = withThemes.find((review) => review.photos.length > 0);

        expect(themed?.themes[0]).toMatchObject({ sentimentId: expect.any(String), label: expect.any(String) });
        expect(pictured?.photos[0]).toMatchObject({ url: expect.stringContaining('http') });
    });

    it('drops the analytics and tracking blobs the API sends alongside', () => {
        const [raw] = extractReviewsPage(expediaPage())!.reviews;
        const review = extractReview(raw!, context) as Record<string, unknown>;

        for (const key of [
            '__typename',
            'reviewAnalytics',
            'seeMoreAnalytics',
            'impressionAnalytics',
            'photoSection',
            'contentDirectFeedbackPromptId',
        ]) {
            expect(review).not.toHaveProperty(key);
        }
    });

    it('passes the input userData straight through as customData', () => {
        const [raw] = extractReviewsPage(hotelsPage())!.reviews;
        const customData = { hotel: 'Hilton Old Town', tags: ['a', 'b'], nested: { deep: 1 } };

        const review = extractReview(raw!, { hotelId: '21856', reviewPosition: 4, customData });

        expect(review.customData).toEqual(customData);
        expect(review.reviewPosition).toBe(4);
    });

    it('turns a null themes list into an empty array', () => {
        // themes and translationInfo are the fields the API really does send as null
        // (measured on 300 live reviews); the rest are always present.
        const [raw] = extractReviewsPage(hotelsPage())!.reviews;
        const review = extractReview({ ...raw!, themes: null, translationInfo: null }, context);

        expect(review.themes).toEqual([]);
        expect(review.translationInfo).toBeNull();
    });

    it('keeps a null reviewRegion and reviewAuthorAttribution as null', () => {
        // Expedia and Hotels.com each leave a different one of these unset.
        const [raw] = extractReviewsPage(hotelsPage())!.reviews;
        const review = extractReview({ ...raw!, reviewRegion: null, reviewAuthorAttribution: null }, context);

        expect(review.reviewRegion).toBeNull();
        expect(review.reviewAuthorAttribution).toBeNull();
    });
});
