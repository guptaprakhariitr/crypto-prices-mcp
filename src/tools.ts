import { Tool } from "./mcp-server";
import { CoinGeckoClient, CoinGeckoEnv } from "./coingecko";

export function buildTools(): Tool[] {
  return [
    {
      name: "crypto_prices",
      description:
        "Current prices for one or more cryptocurrencies. Pass the CoinGecko `id` (e.g. 'bitcoin', 'ethereum', 'solana') — use `crypto_search` if you only have a symbol or name. `vs` is the quote currency (default 'usd'; also 'inr', 'eur', 'jpy', etc.). Returns price, 24h change, market cap, volume.",
      inputSchema: {
        type: "object",
        properties: {
          ids: { type: "array", items: { type: "string" }, minItems: 1, maxItems: 50 },
          vs: { type: "string", default: "usd" },
        },
        required: ["ids"],
      },
      handler: async (args, ctx) => {
        const c = new CoinGeckoClient(ctx.env as unknown as CoinGeckoEnv);
        const out = await c.prices({ ids: args.ids, vs: args.vs ?? "usd" });
        return { count: out.length, prices: out };
      },
    },

    {
      name: "crypto_search",
      description: "Search for a coin by name or symbol. Returns up to 10 matches with their CoinGecko `id` (which is what you pass to crypto_prices).",
      inputSchema: { type: "object", properties: { query: { type: "string" } }, required: ["query"] },
      handler: async (args, ctx) => {
        const c = new CoinGeckoClient(ctx.env as unknown as CoinGeckoEnv);
        const out = await c.search(args.query);
        return { count: out.length, matches: out };
      },
    },

    {
      name: "crypto_history",
      description: "Historical price series for a coin. `days` = lookback in days (1, 7, 14, 30, 90, 180, 365, 'max'). `interval` may be 'daily' or 'hourly' (free tier daily-only beyond 90 days).",
      inputSchema: {
        type: "object",
        properties: {
          id: { type: "string" },
          vs: { type: "string", default: "usd" },
          days: { type: "integer", default: 30 },
          interval: { type: "string", enum: ["daily", "hourly"] },
        },
        required: ["id"],
      },
      handler: async (args, ctx) => {
        const c = new CoinGeckoClient(ctx.env as unknown as CoinGeckoEnv);
        const series = await c.history({ id: args.id, vs: args.vs ?? "usd", days: args.days ?? 30, interval: args.interval });
        return { count: series.length, series };
      },
    },

    {
      name: "crypto_trending",
      description: "Top trending coins on CoinGecko in the last 24h (community/search-volume signal).",
      inputSchema: { type: "object", properties: {}, required: [] },
      handler: async (_args, ctx) => {
        const c = new CoinGeckoClient(ctx.env as unknown as CoinGeckoEnv);
        const out = await c.trending();
        return { count: out.length, coins: out };
      },
    },

    {
      name: "crypto_market_global",
      description: "Global crypto market snapshot: total market cap, 24h volume, BTC dominance, active cryptocurrencies, etc.",
      inputSchema: { type: "object", properties: {}, required: [] },
      handler: async (_args, ctx) => {
        const c = new CoinGeckoClient(ctx.env as unknown as CoinGeckoEnv);
        return await c.global();
      },
    },
  ];
}
