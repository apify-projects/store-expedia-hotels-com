import type { Review } from '../types/output.js';
import type { ResponseReview, ResponseReviewsPage } from '../types/responses.js';

type ReviewsPage = {
    reviews: ResponseReview[];
    totalCount?: number;
};

export const extractReviewsPage = (response: ResponseReviewsPage): ReviewsPage | undefined => {
    const page = response?.[0];
    const reviews = page?.data?.propertyInfo?.reviewInfo?.reviews;

    if (!Array.isArray(reviews)) return undefined;

    return { reviews, totalCount: page?.data?.propertyReviewSummaries?.[0]?.totalCount?.raw };
};

type ReviewContext = {
    hotelId: string;
    reviewPosition: number;
    customData: Record<string, unknown>;
};

export const extractReview = (review: ResponseReview, context: ReviewContext): Review => ({
    id: review.id,
    title: review.title,
    text: review.text,
    superlative: review.superlative,
    locale: review.locale,
    disclaimer: review.disclaimer,
    highlightedText: review.highlightedText,
    brandType: review.brandType,
    propertyReviewSource: review.propertyReviewSource,
    reviewScoreWithDescription: review.reviewScoreWithDescription,
    submissionTime: review.submissionTime,
    reviewRegion: review.reviewRegion,
    reviewAuthorAttribution: review.reviewAuthorAttribution,
    reviewFooter: {
        messages: review.reviewFooter.messages.map((message) => ({
            seoStructuredData: message.seoStructuredData,
            text: message.text.text,
        })),
    },
    reviewInteractionSections: review.reviewInteractionSections.map((section) => ({
        primaryDisplayString: section.primaryDisplayString,
        reviewInteractionType: section.reviewInteractionType,
    })),
    themes: (review.themes ?? []).map((theme) => ({ sentimentId: theme.icon.id, label: theme.label })),
    photos: review.photos,
    travelers: review.travelers,
    translationInfo: review.translationInfo && {
        targetLocale: review.translationInfo.targetLocale,
        translatedBy: review.translationInfo.translatedBy.description,
    },
    managementResponses: review.managementResponses.map((response) => ({
        id: response.id,
        header: response.header.text,
        response: response.response,
    })),
    ...context,
});
