export type ReviewTheme = {
    sentimentId: string;
    label: string;
};

export type ReviewPhoto = {
    description: string;
    url: string;
};

export type ManagementResponse = {
    id: string;
    header: string;
    response: string;
};

export type ReviewFooterMessage = {
    seoStructuredData: { content: string } | null;
    text: string;
};

export type ReviewInteractionSection = {
    primaryDisplayString: string | null;
    reviewInteractionType: string;
};

export type Review = {
    id: string;
    title: string;
    text: string;
    superlative: string;
    locale: string;
    disclaimer: string;
    highlightedText: string | null;
    brandType: string | null;
    propertyReviewSource: string | null;
    reviewScoreWithDescription: { label: string; value: string };
    submissionTime: { longDateFormat: string };
    reviewRegion: { id: string } | null;
    reviewAuthorAttribution: { text: string } | null;
    reviewFooter: { messages: ReviewFooterMessage[] };
    reviewInteractionSections: ReviewInteractionSection[];
    themes: ReviewTheme[];
    photos: ReviewPhoto[];
    travelers: string[];
    translationInfo: { targetLocale: string | null; translatedBy: string } | null;
    managementResponses: ManagementResponse[];
    hotelId: string;
    reviewPosition: number;
    customData: Record<string, unknown>;
};
