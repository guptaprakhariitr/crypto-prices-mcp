// CoinGecko Public API client (free tier; no key required, but generous rate limit
// works better with a Demo API key — supported via env.COINGECKO_API_KEY).

import { KvCache, stableKey } from "./cache";

export interface CoinGeckoEnv {
  CACHE: KVNamespace;
  COINGECKO_BASE: string;
  COINGECKO_API_KEY?: string;
}

export interface PriceQuote {
  id: string;
  symbol: string;
  name: string;
  current_price?: number;
  market_cap?: number;
  market_cap_rank?: number;
  total_volume?: number;
  price_change_24h?: number;
  price_change_percentage_24h?: number;
  ath?: number;
  atl?: number;
  last_updated?: string;
}

export interface MarketChartPoint {
  ts: string;            // ISO
  price: number;
}

export class CoinGeckoClient {
  private cache: KvCache;
  constructor(private env: CoinGeckoEnv) { this.cache = new KvCache(env.CACHE, "cg"); }

  async prices(opts: { ids: string[]; vs: string }): Promise<PriceQuote[]> {
    const key = `prices:${stableKey({ ids: opts.ids.sort(), vs: opts.vs })}`;
    // 5-min TTL on the free CoinGecko tier — they rate-limit to ~5-15 req/min
    // and the cache amortizes across all callers querying the same pair.
    return this.cache.memoize(key, 60 * 5, async () => {
      const params = new URLSearchParams({
        vs_currency: opts.vs,
        ids: opts.ids.join(","),
        order: "market_cap_desc",
        per_page: String(Math.min(opts.ids.length, 250)),
        page: "1",
        sparkline: "false",
        price_change_percentage: "24h",
      });
      const json: any = await this.get(`/coins/markets?${params}`);
      return (json ?? []).map((c: any) => ({
        id: c.id, symbol: c.symbol, name: c.name,
        current_price: c.current_price, market_cap: c.market_cap, market_cap_rank: c.market_cap_rank,
        total_volume: c.total_volume,
        price_change_24h: c.price_change_24h,
        price_change_percentage_24h: c.price_change_percentage_24h,
        ath: c.ath, atl: c.atl,
        last_updated: c.last_updated,
      }));
    });
  }

  async search(query: string): Promise<Array<{ id: string; symbol: string; name: string; market_cap_rank?: number }>> {
    const key = `search:${query.toLowerCase()}`;
    return this.cache.memoize(key, 60 * 60, async () => {
      const json: any = await this.get(`/search?query=${encodeURIComponent(query)}`);
      return (json?.coins ?? []).slice(0, 10).map((c: any) => ({ id: c.id, symbol: c.symbol, name: c.name, market_cap_rank: c.market_cap_rank }));
    });
  }

  async history(opts: { id: string; vs: string; days: number; interval?: "daily" | "hourly" }): Promise<MarketChartPoint[]> {
    const key = `hist:${stableKey({ id: opts.id, vs: opts.vs, days: opts.days, interval: opts.interval ?? "daily" })}`;
    return this.cache.memoize(key, 60 * 60, async () => {
      const params = new URLSearchParams({ vs_currency: opts.vs, days: String(opts.days) });
      if (opts.interval) params.set("interval", opts.interval);
      const json: any = await this.get(`/coins/${opts.id}/market_chart?${params}`);
      return (json?.prices ?? []).map(([ms, price]: [number, number]) => ({
        ts: new Date(ms).toISOString(),
        price,
      }));
    });
  }

  async trending(): Promise<Array<{ id: string; symbol: string; name: string; market_cap_rank?: number; score: number }>> {
    return this.cache.memoize("trending", 60 * 15, async () => {
      const json: any = await this.get(`/search/trending`);
      return (json?.coins ?? []).map((c: any) => ({
        id: c.item?.id, symbol: c.item?.symbol, name: c.item?.name,
        market_cap_rank: c.item?.market_cap_rank, score: c.item?.score,
      }));
    });
  }

  async global(): Promise<any> {
    return this.cache.memoize("global", 60 * 5, async () => this.get("/global"));
  }

  private async get(path: string): Promise<any> {
    const sep = path.includes("?") ? "&" : "?";
    const url = `${this.env.COINGECKO_BASE}${path}${this.env.COINGECKO_API_KEY ? `${sep}x_cg_demo_api_key=${this.env.COINGECKO_API_KEY}` : ""}`;
    // CoinGecko began rejecting requests without a descriptive User-Agent in 2024;
    // a stable identifier prevents 403s on the free tier.
    const r = await fetch(url, {
      headers: {
        Accept: "application/json",
        "User-Agent": "crypto-prices-mcp/0.1 (prakshatechnologies@gmail.com)",
      },
    });
    if (r.status === 429) throw new Error("CoinGecko rate limit; backoff or supply COINGECKO_API_KEY for higher quota.");
    if (!r.ok) throw new Error(`CoinGecko ${r.status}: ${(await r.text()).slice(0, 200)}`);
    return r.json();
  }
}
