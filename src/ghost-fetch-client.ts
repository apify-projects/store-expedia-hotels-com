// HTTP transport via tri_angle/ghost-fetch standby.

const GHOST_FETCH_URL = process.env.GHOST_FETCH_URL ?? 'https://tri_angle--ghost-fetch.apify.actor';

export interface GhostFetchOptions {
    method?: 'GET' | 'POST';
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

export async function ghostFetch(url: string, opts: GhostFetchOptions = {}): Promise<GhostFetchResponse> {
    const token = process.env.APIFY_TOKEN;
    const res = await fetch(`${GHOST_FETCH_URL}/fetch_url`, {
        method: 'POST',
        headers: {
            'content-type': 'application/json',
            ...(token ? { authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({
            url,
            method: opts.method ?? 'GET',
            headers: opts.headers,
            body: opts.body,
            country: opts.country ?? 'US',
            session: opts.session,
        }),
    });
    if (!res.ok) throw new Error(`ghost-fetch gateway ${res.status}: ${await res.text()}`);
    return res.json() as Promise<GhostFetchResponse>;
}
