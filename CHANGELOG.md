# Changelog

## [0.1.1] — 2026-06-10 (intra-day patch)

### Fixed
- Added descriptive `User-Agent` header on every CoinGecko request — they began rejecting bare requests with HTTP 403 in 2024.

### Changed
- Live-price cache TTL bumped 60s → 5min to amortize CoinGecko's strict free-tier limit (5–15 req/min depending on edge POP).

### Known limitation
- CoinGecko's free tier rate-limits Cloudflare's shared-IP edges aggressively (the same POP gets hit by many other Workers). Cold queries may surface `-32603 "CoinGecko rate limit…"`. Fully resolved by setting `COINGECKO_API_KEY` via `wrangler secret put COINGECKO_API_KEY` — Demo keys are free at https://www.coingecko.com/en/api/pricing and raise the limit to ~30 req/min + 10k/mo.

## [0.1.0] — 2026-06-10

### Added
- Five tools: `crypto_prices`, `crypto_search`, `crypto_history`, `crypto_trending`, `crypto_market_global`.
- Wraps CoinGecko v3 Public API. Free, no API key required; optional `COINGECKO_API_KEY` (Demo key) raises rate limits.
- 60s cache on live prices, 1h on history, 15min on trending, 5min on global.
