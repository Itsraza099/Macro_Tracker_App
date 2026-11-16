import { handleApi } from "./api";

declare global {
  interface Window {
    __macroDemoInstalled?: boolean;
  }
}

/** Reads a request body into a plain object (JSON or FormData). */
async function readBody(init?: RequestInit): Promise<unknown> {
  const b = init?.body;
  if (!b) return {};
  if (typeof b === "string") {
    try {
      return JSON.parse(b);
    } catch {
      return {};
    }
  }
  if (b instanceof FormData) {
    const out: Record<string, unknown> = {};
    b.forEach((v, k) => {
      if (typeof v === "string") out[k] = v;
    });
    return out;
  }
  return {};
}

/**
 * Routes every same-origin `/api/*` fetch to the in-browser implementation.
 * Everything else (for example the Open Food Facts barcode lookup) goes to the network.
 */
export function installDemoApi() {
  if (typeof window === "undefined" || window.__macroDemoInstalled) return;
  window.__macroDemoInstalled = true;

  const realFetch = window.fetch.bind(window);
  window.fetch = async (input: RequestInfo | URL, init?: RequestInit) => {
    const raw = typeof input === "string" ? input : input instanceof URL ? input.href : input.url;
    const url = new URL(raw, window.location.origin);

    if (url.origin !== window.location.origin || !url.pathname.startsWith("/api/")) {
      return realFetch(input, init);
    }

    const method = (init?.method || (input instanceof Request ? input.method : "GET")).toUpperCase();
    const body = await readBody(init);
    try {
      const { status, body: payload } = await handleApi(method, url, body);
      return new Response(JSON.stringify(payload), {
        status,
        headers: { "Content-Type": "application/json" },
      });
    } catch (e) {
      console.error("Demo API error:", e);
      return new Response(JSON.stringify({ error: "Internal server error" }), {
        status: 500,
        headers: { "Content-Type": "application/json" },
      });
    }
  };
}
