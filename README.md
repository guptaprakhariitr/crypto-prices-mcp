# crypto-prices-mcp

> Live + historical cryptocurrency prices, trending coins, and global market snapshots for AI agents. Wraps CoinGecko's free Public API.

**Endpoint:** `https://crypto-prices-mcp.prakhar-cognizance.workers.dev/mcp`

## Tools

- `crypto_prices(ids[], vs?)` — current prices + 24h change + market cap + volume
- `crypto_search(query)` — find a coin's `id` by name/symbol
- `crypto_history(id, vs?, days?, interval?)` — historical price series
- `crypto_trending()` — top trending coins (24h)
- `crypto_market_global()` — total market cap, BTC dominance, etc.

## Pricing

| Tier | Price | Calls/mo |
|---|---|---|
| Free | $0 | 200 |
| Solo | $9/mo | 3,000 |
| Team | $29/mo | 15,000 |
| Pro | $79/mo | 75,000 |
