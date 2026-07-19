# Spain BOE Auctions — Property Foreclosures & Judicial Auctions

Scrape Spain's official BOE auction portal (`subastas.boe.es`) — judicial foreclosures, notarial auctions and tax-agency (AEAT) auctions — into clean, consolidated JSON.

Unlike a raw scraper, this Actor merges the portal's four separate tabs (General, Authority, Assets/Lots, Bids) into one object per auction and adds:

- **Legal thresholds computed**: 50% and 70% reference values and a 5% deposit estimate. For judicial auctions, the applicable award threshold under art. 671 LEC (based on the debtor's primary-residence flag published by the BOE).
- **Per-lot financials** in multi-lot auctions.
- **GDPR-safe output**: Spanish ID numbers (DNI/NIE) and IBANs are redacted.

Alternative to `spain-auction-scout` and `spain-subastas-boe-catastro`, with the data already consolidated and the legal calculations included.

## Input

| Field | Type | Description |
|-------|------|-------------|
| `province` | string | 2-digit province code (e.g. `28` = Madrid). Empty = all. |
| `status` | enum | `proxima`, `celebrandose`, `suspendida`, `cancelada`, `concluida`, `finalizada`. |
| `type` | enum | `inmuebles`, `vehiculos`, `muebles`, `todos`. |
| `maxResults` | integer | Max auctions to return (0 = no limit). |
| `includeDetails` | boolean | Fetch full consolidated detail per auction (slower). Off = fast listing. |

### Example input

```json
{
  "province": "28",
  "status": "celebrandose",
  "type": "inmuebles",
  "maxResults": 50,
  "includeDetails": true
}
```

## Output

Each dataset item is either an auction summary (fast mode) or a full consolidated
auction object (with `general`, `authority`, `lots`, `bids`). See the source and
schema at [github.com/jorditg77/subastas-boe-api](https://github.com/jorditg77/subastas-boe-api).

## Disclaimer

Data comes from a public official source (reused under Spanish Law 37/2007). This
is orientative and not legal or investment advice: always verify against
`subastas.boe.es` and a registry extract (*nota simple*) before bidding.
