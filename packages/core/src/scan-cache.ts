import type { ScanResult, SessionProvider } from "./provider.js";

type CacheEntry = {
  result: ScanResult;
  expiresAt: number;
};

/**
 * Opt-in TTL wrapper for providers whose scan is expensive.
 * Returns cached results within the window; re-scans after expiry.
 */
export function withScanCache(
  provider: SessionProvider,
  ttlMs: number,
  now: () => number = () => Date.now()
): SessionProvider {
  let cache: CacheEntry | null = null;
  let inFlight: Promise<ScanResult> | null = null;
  let scanSessionsCached: (() => Promise<ScanResult>) | null = null;

  return new Proxy(provider, {
    get(target, prop) {
      if (prop === "scanSessions") {
        if (!scanSessionsCached) {
          scanSessionsCached = async (): Promise<ScanResult> => {
            const t = now();
            if (cache && t < cache.expiresAt) {
              return cache.result;
            }
            if (inFlight) {
              return inFlight;
            }
            inFlight = target.scanSessions().then((result) => {
              cache = { result, expiresAt: now() + ttlMs };
              inFlight = null;
              return result;
            });
            return inFlight;
          };
        }
        return scanSessionsCached;
      }
      const value = Reflect.get(target, prop, target);
      return typeof value === "function"
        ? (value as (...args: unknown[]) => unknown).bind(target)
        : value;
    },
  });
}
