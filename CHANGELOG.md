# Changelog

## [0.1.0] — 2026-06-10

### Added
- Five tools: `crypto_prices`, `crypto_search`, `crypto_history`, `crypto_trending`, `crypto_market_global`.
- Wraps CoinGecko v3 Public API. Free, no API key required; optional `COINGECKO_API_KEY` (Demo key) raises rate limits.
- 60s cache on live prices, 1h on history, 15min on trending, 5min on global.
