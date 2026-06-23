// Direct mobile-HTTP transport via ghost-fetch. The Expedia/Hotels.com/VRBO
// graphql gateway throttles the web client on shared residential pools, but the
// native-app client (`client-info: android.com.expedia.bookings`) rides a
// separate, un-throttled rate bucket and needs no browser/Akamai clearing -
// plain TLS-impersonating HTTP (ghost-fetch Tier 1) returns 200.

const GHOST_FETCH_URL = process.env.GHOST_FETCH_URL ?? "https://tri-angle--ghost-fetch.apify.actor";

// Expedia Android app client identity (captured from com.expedia.bookings 2026.25.0).
export const MOBILE_HEADERS: Record<string, string> = {
    "content-type": "application/json",
    accept: "application/json",
    "client-info": "android.com.expedia.bookings,2026.25.0,external",
    "x-eb-client":
        "PLATFORM:ANDROID;OS_VERSION:12;MANUFACTURER:Google;MODEL:sdk_gphone64_arm64;MODEL_NAME:sdk_gphone64_arm64;UPGRADE:false;APP_VERSION:2026.25.0;LOCALE:en_US;APP_IDENTIFIER:com.expedia.bookings;",
    "user-agent": "ExpediaBookings/2026.25.0 Dalvik/2.1.0 (Linux; U; Android 12; sdk_gphone64_arm64 Build/S2B2.211203.006)",
};

export interface GhostFetchOptions {
    method?: "GET" | "POST";
    headers?: Record<string, string>;
    body?: string;
    country?: string;
    session?: string;
}

export interface GhostFetchResponse {
    content: string;
    status: number;
    blocked: boolean;
    headers: Record<string, string>;
    resolved_via?: string;
    error?: string;
}

// Direct transport: TLS-impersonating HTTP client (impit) through an Apify
// proxy URL (e.g. datacenter). Tests whether the mobile graphql bucket is
// IP-agnostic - if so, datacenter works and is ~10x cheaper than residential.
import { Impit } from "impit";

let _impit: Impit | null = null;
export function initDirect(proxyUrl?: string): void {
    _impit = new Impit({ browser: "chrome", ...(proxyUrl ? { proxyUrl } : {}), timeout: 60000 });
}

export async function directFetch(url: string, opts: GhostFetchOptions = {}): Promise<GhostFetchResponse> {
    if (!_impit) initDirect();
    const res = await _impit!.fetch(url, {
        method: opts.method ?? "GET",
        headers: opts.headers,
        body: opts.body,
    });
    const content = await res.text();
    return { content, status: res.status, blocked: res.status === 403 || res.status === 429, headers: {} };
}

export async function ghostFetch(url: string, opts: GhostFetchOptions = {}): Promise<GhostFetchResponse> {
    const token = process.env.GHOST_FETCH_TOKEN ?? process.env.APIFY_TOKEN;
    const res = await fetch(`${GHOST_FETCH_URL}/fetch_url`, {
        method: "POST",
        headers: {
            "content-type": "application/json",
            ...(token ? { authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({
            url,
            output_format: "html",
            method: opts.method ?? "GET",
            headers: opts.headers,
            body: opts.body,
            country: opts.country ?? "US",
            session: opts.session,
        }),
    });
    if (!res.ok) throw new Error(`ghost-fetch gateway ${res.status}: ${(await res.text()).slice(0, 300)}`);
    return res.json() as Promise<GhostFetchResponse>;
}
