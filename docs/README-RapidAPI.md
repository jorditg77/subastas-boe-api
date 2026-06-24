# Spain BOE Auctions API - Real Estate Foreclosures & Judicial Auctions

Get clean, consolidated JSON data from Spain's official BOE auction portal (`subastas.boe.es`). Ideal for PropTech, real estate investors, and AI agents via MCP.

## What you get

- **Consolidated data**: General, Authority, Assets, and Bids tabs merged into one JSON object.
- **No headless browser**: fast, lightweight HTTP scraping.
- **Legal calculations**: automatic 50% and 70% reference values and 5% deposit estimate.
- **PII-free**: personal data is redacted to comply with GDPR.
- **MCP-ready**: use it with Claude, Cursor, or any MCP-compatible AI agent.

## Use cases

- Real estate investment dashboards
- Foreclosure opportunity alerts
- AI-powered property hunting agents
- Market research and analytics

## Quick start

```bash
curl -X GET "https://your-api-url/auctions?province=28&status=celebrandose&type=inmuebles" \
  -H "X-RapidAPI-Key: YOUR_KEY"
```

## Plans

- **Free**: 100 requests/month for testing.
- **Starter**: 500 requests/month for individual investors.
- **Pro**: 2,000 requests/month for active monitoring.
- **Business**: 10,000 requests/month with advanced filters and support.

## Disclaimer

This API provides aggregated data from a public source. Always verify information directly on `subastas.boe.es` and with a nota simple before making investment decisions.
