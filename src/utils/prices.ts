// Shared CoinGecko price lookup with a small in-memory TTL cache.
//
// The free CoinGecko tier (no API key) is easily rate-limited (HTTP 429),
// which would otherwise leave demos with empty price data. Caching successful
// responses for a short window keeps repeated requests fast and avoids 429s.
// Failed lookups are NOT cached, so they retry on the next call.

const COINGECKO_IDS: Record<string, string> = {
  ETH: "ethereum", WETH: "ethereum",
  MATIC: "matic-network", WMATIC: "matic-network",
  BNB: "binancecoin", WBNB: "binancecoin",
  USDC: "usd-coin", USDT: "tether", DAI: "dai",
  WBTC: "wrapped-bitcoin",
  PHRS: "pharos-network", PROS: "pharos-network",
};

const CACHE_TTL_MS = 45_000;

interface CacheEntry {
  prices: Record<string, number>;
  expires: number;
}

const priceCache = new Map<string, CacheEntry>();

/**
 * Returns USD prices for the given token symbols, keyed by symbol.
 * Results are cached in-memory for {@link CACHE_TTL_MS}. Returns an empty
 * object (never throws) when no ids resolve or the upstream request fails.
 */
export async function fetchUsdPrices(
  symbols: string[]
): Promise<Record<string, number>> {
  const ids = [...new Set(symbols.map((s) => COINGECKO_IDS[s]).filter(Boolean))];
  if (ids.length === 0) return {};

  const cacheKey = ids.slice().sort().join(",");
  const cached = priceCache.get(cacheKey);
  if (cached && cached.expires > Date.now()) return cached.prices;

  try {
    const res = await fetch(
      `https://api.coingecko.com/api/v3/simple/price?ids=${ids.join(
        ","
      )}&vs_currencies=usd`,
      { signal: AbortSignal.timeout(8000) }
    );
    if (!res.ok) return {};
    const data = (await res.json()) as Record<string, { usd: number }>;
    const prices: Record<string, number> = {};
    for (const [id, { usd }] of Object.entries(data)) {
      const sym = Object.entries(COINGECKO_IDS).find(([, v]) => v === id)?.[0];
      if (sym) prices[sym] = usd;
    }
    priceCache.set(cacheKey, { prices, expires: Date.now() + CACHE_TTL_MS });
    return prices;
  } catch {
    return {};
  }
}
