// Normalize Expedia's wild PropertyReview graphql shape into a tidy
// schema.org/Review object (https://schema.org/Review), dropping __typename,
// analytics blobs, and UI-only strings.

const SOURCE_NAMES: Record<string, string> = {
    "www.expedia.com": "Expedia",
    "www.hotels.com": "Hotels.com",
    "www.vrbo.com": "Vrbo",
};

const toIsoDate = (long?: string): string | null => {
    if (!long) return null;
    const d = new Date(long);
    return Number.isNaN(d.getTime()) ? null : d.toISOString().slice(0, 10);
};

const ratingFromValue = (v?: string): number | null => {
    const m = (v ?? "").match(/(\d+(?:\.\d+)?)/);
    return m ? Number(m[1]) : null;
};

// "Liked: Cleanliness, staff & service" -> ["Cleanliness","staff & service"]
const themesBySentiment = (themes: any[] | null, prefix: string): string[] => {
    if (!themes) return [];
    return themes
        .map((t) => String(t?.label ?? ""))
        .filter((l) => l.toLowerCase().startsWith(prefix))
        .flatMap((l) => l.split(":")[1]?.split(",").map((s) => s.trim()).filter(Boolean) ?? []);
};

export interface NormalizedReview {
    "@context": string;
    "@type": "Review";
    reviewId: string;
    author: { "@type": "Person"; name: string | null; addressCountry?: string };
    datePublished: string | null;
    reviewBody: string;
    reviewRating: { "@type": "Rating"; ratingValue: number | null; bestRating: number; worstRating: number; description: string | null };
    inLanguage: string | null;
    publisher: { "@type": "Organization"; name: string };
    itemReviewed: { "@type": "Hotel"; name: string | null; identifier: string };
    verified: boolean;
    helpfulVotes: number;
    stayDetail: string | null;
    likedThemes: string[];
    dislikedThemes: string[];
    photos: string[];
    response: { author: string | null; text: string } | null;
    translated: boolean;
    reviewPosition: number;
    customData: Record<string, unknown>;
}

export function normalizeReview(
    raw: any,
    site: string,
    hotelId: string,
    customData: Record<string, unknown>,
    position: number,
): NormalizedReview {
    const footerMsg = raw?.reviewFooter?.messages?.[0];
    const authorName = raw?.reviewAuthorAttribution?.text ?? footerMsg?.seoStructuredData?.content ?? null;
    const helpful = (raw?.reviewInteractionSections ?? []).find(
        (s: any) => s?.reviewInteractionType === "HELPFUL_REVIEW",
    );
    const mgmt = raw?.managementResponses?.[0];

    return {
        "@context": "https://schema.org",
        "@type": "Review",
        reviewId: raw?.id,
        author: {
            "@type": "Person",
            name: authorName,
            ...(raw?.reviewRegion?.id ? { addressCountry: String(raw.reviewRegion.id).toUpperCase() } : {}),
        },
        datePublished: toIsoDate(raw?.submissionTime?.longDateFormat),
        reviewBody: raw?.text ?? "",
        reviewRating: {
            "@type": "Rating",
            ratingValue: ratingFromValue(raw?.reviewScoreWithDescription?.value ?? raw?.reviewScoreWithDescription?.label),
            bestRating: 10,
            worstRating: 1,
            description: raw?.superlative ?? null,
        },
        inLanguage: raw?.locale ?? null,
        publisher: { "@type": "Organization", name: SOURCE_NAMES[site] ?? site },
        itemReviewed: { "@type": "Hotel", name: (customData?.name as string) ?? null, identifier: hotelId },
        verified: raw?.disclaimer === "Verified",
        helpfulVotes: Number(helpful?.primaryDisplayString) || 0,
        stayDetail: footerMsg?.text?.text ?? null,
        likedThemes: themesBySentiment(raw?.themes, "liked"),
        dislikedThemes: themesBySentiment(raw?.themes, "disliked"),
        photos: (raw?.photos ?? []).map((p: any) => p?.url).filter(Boolean),
        response: mgmt ? { author: mgmt?.header?.text ?? null, text: mgmt?.response ?? "" } : null,
        translated: !!raw?.translationInfo,
        reviewPosition: position,
        customData,
    };
}
