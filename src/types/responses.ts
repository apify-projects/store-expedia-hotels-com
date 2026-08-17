// GraphQL always returns every selected key, so only the fields below typed `| null`
// are ever actually missing a value.

type ResponseTheme = {
    icon: { id: string };
    label: string;
};

type ResponsePhoto = {
    description: string;
    url: string;
};

type ResponseManagementResponse = {
    id: string;
    header: { text: string };
    response: string;
};

type ResponseFooterMessage = {
    seoStructuredData: { content: string } | null;
    text: { text: string };
};

type ResponseInteractionSection = {
    primaryDisplayString: string | null;
    reviewInteractionType: string;
};

export type ResponseReview = {
    id: string;
    title: string;
    text: string;
    superlative: string;
    locale: string;
    disclaimer: string;
    reviewScoreWithDescription: { label: string; value: string };
    submissionTime: { longDateFormat: string };
    reviewFooter: { messages: ResponseFooterMessage[] };
    reviewInteractionSections: ResponseInteractionSection[];
    photos: ResponsePhoto[];
    travelers: string[];
    managementResponses: ResponseManagementResponse[];
    // Expedia and Hotels.com each leave a different half of these null.
    reviewRegion: { id: string } | null;
    reviewAuthorAttribution: { text: string } | null;
    themes: ResponseTheme[] | null;
    translationInfo: { targetLocale: string | null; translatedBy: { description: string } } | null;
    highlightedText: string | null;
    brandType: string | null;
    propertyReviewSource: string | null;
};

/** The API answers a batched operation, hence the array. */
export type ResponseReviewsPage = {
    data?: {
        propertyReviewSummaries?: { totalCount?: { raw?: number } }[];
        propertyInfo?: {
            reviewInfo?: { reviews?: ResponseReview[] };
        };
    };
    errors?: { message?: string }[];
}[];
