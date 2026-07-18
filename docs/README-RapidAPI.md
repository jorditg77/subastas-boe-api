# Spain BOE Auctions API — Property Foreclosures & Judicial Auctions

Clean, consolidated JSON from Spain's official BOE auction portal (`subastas.boe.es`): judicial foreclosures, notarial auctions and tax-agency (AEAT) auctions. Live at `https://api.subastas.dev` · Landing: [subastas.dev](https://subastas.dev)

## Why this API vs. scraping it yourself

The official portal splits every auction across **4 separate tabs** (General, Authority, Assets, Bids), has no official API, and hides key economics inside per-lot sub-pages. This API does the consolidation for you and adds the analysis layer investors actually need:

- **Legal thresholds, computed**: 50% and 70% reference values and a 5% deposit estimate. `metricsBasedOn` tells you whether they were computed over the official appraisal or the auction value (the BOE doesn't always publish an appraisal).
- **`applicableThreshold`**: for judicial auctions, *which* threshold (50% or 70%) legally applies for an award without bidders under art. 671 LEC, driven by the "primary residence" flag the BOE itself publishes per asset. Non-judicial auctions return `null` with an explanatory note instead of a guess.
- **Multi-lot support**: per-lot value, deposit and thresholds, exactly as the BOE structures them.
- **GDPR-safe by default**: Spanish IDs (DNI/NIE) and IBANs are redacted before every response.
- **Fast and considerate**: in-memory cache (2–4 h TTL) with request coalescing — repeated and paginated queries never re-hit the BOE. Typical cached responses < 100 ms; cold detail fetches take a few seconds (4 portal tabs).
- **Auditable**: the source code is public ([GitHub](https://github.com/jorditg77/subastas-boe-api), non-commercial license).

## Endpoints

| Method | Path | Description |
|---|---|---|
| GET | `/auctions` | Search by `province` (2-digit code), `status`, `type`, with instant pagination |
| GET | `/auctions/{id}` | Full consolidated detail: general + authority + lots/assets + bids |
| GET | `/provinces` | The 52 Spanish provinces and their codes |
| GET | `/health` | Service status |

### Quick start

```bash
curl "https://spain-boe-auctions-property-foreclosures.p.rapidapi.com/auctions?province=28&type=inmuebles&status=celebrandose" \
  -H "X-RapidAPI-Key: YOUR_KEY"
```

### Example detail response (abridged, real data)

```json
{
  "id": "SUB-JA-2026-260225",
  "general": {
    "auctionType": "JUDICIAL EN VÍA DE APREMIO",
    "endDate": "2026-06-25T18:00:00+02:00",
    "appraisalValue": 267000,
    "reference70": 186900,
    "reference50": 133500,
    "deposit": 13350,
    "metricsBasedOn": "tasacion",
    "applicableThreshold": {
      "value": 186900,
      "basis": "reference70",
      "note": "Vivienda habitual del deudor: umbral del 70% (art. 671 LEC)."
    }
  },
  "authority": { "name": "Sección Civil TI Granollers. Plz.n 2", "email": "sce.granollers@xij.gencat.cat" },
  "lots": [{ "idLote": "1", "assets": [{ "label": "Bien 1 - Inmueble (Vivienda)", "locality": "GRANOLLERS" }] }],
  "bids": { "currentMaxBid": null, "totalBids": 0, "requiresDeposit": true }
}
```

## AI agents (MCP)

The backend ships an MCP server (`search_auctions`, `get_auction_detail`, `calculate_auction_metrics`, `list_provinces`) so Claude, Cursor or any MCP-compatible agent can query Spanish auctions from context. Setup instructions in the [GitHub README](https://github.com/jorditg77/subastas-boe-api#servidor-mcp).

## Use cases

- **Foreclosure alerts**: poll `/auctions` per province and notify when new opportunities appear below your threshold.
- **Investment dashboards**: feed consolidated auctions into PropTech dashboards or AVM models without building a scraper.
- **Due diligence**: authority contact data, registry entries and document links in one call.
- **AI property scouts**: give an agent the MCP tools and ask "find garages in Barcelona ending this week".

## Data freshness & expectations

- Source: the official public BOE portal, fetched on demand and cached 2–4 h (auction lifecycles span weeks; sub-hour freshness adds no value and would hammer a public service).
- Search results include everything the portal publishes in listings; per-auction economics require the detail endpoint (that's how the BOE structures its data).
- No value-range filter is offered because the BOE listing doesn't expose values — any API claiming otherwise is fetching every detail behind the scenes.

## Plans

- **Free**: 100 requests/month — test the API and integrations.
- **Starter ($9.90)**: 500/month — individual investor, single-province alerts.
- **Pro ($29.90)**: 2,000/month — active multi-province monitoring.
- **Business ($89)**: 10,000/month — PropTech products, law firms, dashboards.

Hard quotas: when you run out, requests pause until next month (never surprise overage charges).

## Disclaimer

Data comes from a public official source and is provided as-is for analysis. This is **not legal or investment advice**. Always verify on `subastas.boe.es` and with a registry extract (*nota simple*) before bidding.
