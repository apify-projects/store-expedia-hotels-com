import { Dictionary } from "@crawlee/cheerio";
import { Actor } from "apify";

export const PPE_EVENTS = {
    START: "start",
    RESULT: "result",
} as const;

type EventName = (typeof PPE_EVENTS)[keyof typeof PPE_EVENTS];

type ChargeEventOptions = {
    eventName: EventName;
    count?: number;
    skipIfAlreadyCharged?: boolean;
};

type SimpleChargeResult = {
    chargeLimitReached: boolean;
};

const isPpeEnabled = (): boolean => {
    return Actor.getChargingManager().getPricingInfo().isPayPerEvent;
};

const getChargedEventCount = (eventName: EventName): number => {
    return Actor.getChargingManager().getChargedEventCount(eventName);
};

export const chargeEvent = async (
    options: ChargeEventOptions
): Promise<SimpleChargeResult> => {
    const { eventName, count, skipIfAlreadyCharged } = options;

    if (
        !isPpeEnabled() ||
        (skipIfAlreadyCharged && getChargedEventCount(eventName) > 0)
    ) {
        return { chargeLimitReached: false };
    }

    const { eventChargeLimitReached } = await Actor.charge({
        eventName,
        count,
    });
    return { chargeLimitReached: eventChargeLimitReached };
};

export const pushReviews = async (
    reviews: Dictionary[]
): Promise<SimpleChargeResult> => {
    if (reviews.length === 0) return { chargeLimitReached: false };

    if (!isPpeEnabled()) {
        await Actor.pushData(reviews);
        return { chargeLimitReached: false };
    }

    const { eventChargeLimitReached, chargedCount } = await Actor.pushData(
        reviews,
        PPE_EVENTS.RESULT
    );

    return {
        chargeLimitReached: eventChargeLimitReached || chargedCount === 0,
    };
};
