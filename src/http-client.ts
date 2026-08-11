// Mobile-HTTP client for the Expedia/Hotels.com/VRBO graphql gateway.
// The web client is throttled on shared residential pools, but the native-app
// client (`client-info: android.com.expedia.bookings`) rides a separate,
// un-throttled bucket - plain TLS-impersonating HTTP (impit) through an Apify
// residential proxy returns 200.

import { Impit } from "impit";

// Expedia Android app client identity (captured from com.expedia.bookings 2026.25.0).
export const MOBILE_HEADERS: Record<string, string> = {
    "content-type": "application/json",
    accept: "application/json",
    "client-info": "android.com.expedia.bookings,2026.25.0,external",
    "x-eb-client":
        "PLATFORM:ANDROID;OS_VERSION:12;MANUFACTURER:Google;MODEL:sdk_gphone64_arm64;MODEL_NAME:sdk_gphone64_arm64;UPGRADE:false;APP_VERSION:2026.25.0;LOCALE:en_US;APP_IDENTIFIER:com.expedia.bookings;",
    "user-agent": "ExpediaBookings/2026.25.0 Dalvik/2.1.0 (Linux; U; Android 12; sdk_gphone64_arm64 Build/S2B2.211203.006)",
};

export interface FetchOptions {
    method?: "GET" | "POST";
    headers?: Record<string, string>;
    body?: string;
}

export interface FetchResponse {
    content: string;
    status: number;
    blocked: boolean;
}

let client: Impit | null = null;

export function initClient(proxyUrl?: string): void {
    client = new Impit({ browser: "chrome", ...(proxyUrl ? { proxyUrl } : {}), timeout: 60000 });
}

export async function fetchMobile(url: string, opts: FetchOptions = {}): Promise<FetchResponse> {
    if (!client) initClient();
    const res = await client!.fetch(url, {
        method: opts.method ?? "GET",
        headers: opts.headers,
        body: opts.body,
    });
    const content = await res.text();
    return { content, status: res.status, blocked: res.status === 403 || res.status === 429 };
}
