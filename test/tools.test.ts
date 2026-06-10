import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { CoinGeckoClient } from "../src/coingecko";
import { McpServer, ToolContext } from "../src/mcp-server";
import { buildTools } from "../src/tools";

class FakeKv {
  store = new Map<string, string>();
  async get(key: string, type?: "text" | "json"): Promise<any> {
    const v = this.store.get(key); if (v === undefined) return null;
    if (type === "json") return JSON.parse(v); return v;
  }
  async put(key: string, value: string): Promise<void> { this.store.set(key, value); }
  async delete(key: string): Promise<void> { this.store.delete(key); }
}

const env = {
  CACHE: new FakeKv() as unknown as KVNamespace,
  USAGE: new FakeKv() as unknown as KVNamespace,
  COINGECKO_BASE: "https://api.coingecko.com/api/v3",
  UPGRADE_URL: "x",
};

beforeEach(() => {
  (env.CACHE as any).store = new Map();
  vi.stubGlobal("fetch", async (url: string | URL) => {
    const u = typeof url === "string" ? url : url.toString();
    if (u.includes("/coins/markets")) {
      return new Response(JSON.stringify([
        { id: "bitcoin", symbol: "btc", name: "Bitcoin", current_price: 67000, market_cap: 1.3e12, market_cap_rank: 1, total_volume: 30e9, price_change_24h: 250, price_change_percentage_24h: 0.37, ath: 73000, atl: 67.81, last_updated: "2026-06-10T00:00:00Z" },
        { id: "ethereum", symbol: "eth", name: "Ethereum", current_price: 3600, market_cap: 4.3e11, market_cap_rank: 2, total_volume: 15e9, price_change_24h: -20, price_change_percentage_24h: -0.55, ath: 4878, atl: 0.43, last_updated: "2026-06-10T00:00:00Z" },
      ]), { status: 200 });
    }
    if (u.includes("/search?query=")) {
      return new Response(JSON.stringify({ coins: [{ id: "solana", symbol: "sol", name: "Solana", market_cap_rank: 5 }] }), { status: 200 });
    }
    if (u.includes("/market_chart")) {
      return new Response(JSON.stringify({ prices: [[1700000000000, 65000], [1700086400000, 66200], [1700172800000, 67000]] }), { status: 200 });
    }
    if (u.endsWith("/search/trending")) {
      return new Response(JSON.stringify({ coins: [{ item: { id: "pepe", symbol: "pepe", name: "Pepe", market_cap_rank: 99, score: 0 } }] }), { status: 200 });
    }
    if (u.endsWith("/global")) {
      return new Response(JSON.stringify({ data: { total_market_cap: { usd: 2.5e12 }, market_cap_percentage: { btc: 52, eth: 17 } } }), { status: 200 });
    }
    return new Response("{}", { status: 200 });
  });
});
afterEach(() => vi.unstubAllGlobals());

describe("CoinGeckoClient.prices", () => {
  it("returns price + market cap for ids", async () => {
    const c = new CoinGeckoClient(env as any);
    const out = await c.prices({ ids: ["bitcoin", "ethereum"], vs: "usd" });
    expect(out.length).toBe(2);
    expect(out[0].current_price).toBe(67000);
    expect(out[1].symbol).toBe("eth");
  });
});

describe("CoinGeckoClient.search", () => {
  it("returns top match", async () => {
    const c = new CoinGeckoClient(env as any);
    const out = await c.search("solana");
    expect(out[0].id).toBe("solana");
  });
});

describe("CoinGeckoClient.history", () => {
  it("returns time-series points with ISO ts", async () => {
    const c = new CoinGeckoClient(env as any);
    const series = await c.history({ id: "bitcoin", vs: "usd", days: 7 });
    expect(series.length).toBe(3);
    expect(series[0].ts).toMatch(/^\d{4}-\d{2}-\d{2}T/);
    expect(series[0].price).toBe(65000);
  });
});

describe("MCP protocol", () => {
  const server = new McpServer({ name: "crypto-prices-mcp", version: "0.1.0" });
  for (const t of buildTools()) server.register(t);
  const ctx: ToolContext = { env: env as any, apiKey: null, tier: "free", callsRemaining: 200 };

  it("lists all 5 tools", async () => {
    const r = await server.handle({ jsonrpc: "2.0", id: 1, method: "tools/list" }, ctx);
    const names = (r!.result as any).tools.map((t: any) => t.name) as string[];
    expect(names).toHaveLength(5);
    expect(names).toContain("crypto_prices");
  });
  it("crypto_prices end-to-end", async () => {
    const r = await server.handle(
      { jsonrpc: "2.0", id: 2, method: "tools/call", params: { name: "crypto_prices", arguments: { ids: ["bitcoin"], vs: "usd" } } }, ctx
    );
    const out = JSON.parse((r!.result as any).content[0].text);
    expect(out.prices[0].current_price).toBe(67000);
  });
});
