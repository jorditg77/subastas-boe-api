# Textos preparados para directorios de servidores MCP (Fase 12)

Enviar DESPUÉS de publicar en RapidAPI (para que todos los enlaces estén vivos).
Enlaces canónicos: repo https://github.com/jorditg77/subastas-boe-api · landing https://subastas.dev

## Descripción corta (EN, reutilizable en todos)

> MCP server for Spain's official BOE auction portal: search judicial foreclosures, notarial and tax-agency auctions, get consolidated per-auction detail (assets, lots, bids, authority contacts) and computed legal thresholds (art. 671 LEC). Clean JSON, GDPR-safe, no headless browser.

## Tools que expone

- `search_auctions` — search by province / status / asset type
- `get_auction_detail` — full consolidated detail of one auction
- `calculate_auction_metrics` — 50%/70% thresholds + 5% deposit for a given value
- `list_provinces` — Spanish province codes for the search filter

## Instalación (bloque para READMEs de directorios)

```json
{
  "mcpServers": {
    "subastas-boe": {
      "command": "node",
      "args": ["/path/to/subastas-boe-api/src/mcp/server.js"]
    }
  }
}
```

Requires Node >= 20. Clone the repo and `npm install` first.

## Dónde enviar

| Directorio | Cómo | Nota |
|---|---|---|
| Glama (glama.ai/mcp/servers) | Formulario/PR según indiquen | Enlazar al repo de GitHub |
| MCP.so | Alta en su web | Categoría: Real Estate / Data / Finance |
| Smithery (smithery.ai) | Alta con el repo | Evaluar su hosting gestionado |
| Awesome MCP Servers (github.com/punkpeye/awesome-mcp-servers) | PR añadiendo una línea | Ver texto abajo |
| Cursor Directory (cursor.directory) | Alta en su web | Mismo copy |

## Línea para el PR de Awesome MCP Servers

Categoría sugerida: Finance / Real Estate (la que exista más cercana):

```
- [subastas-boe-api](https://github.com/jorditg77/subastas-boe-api) - Spanish BOE auction portal (judicial foreclosures, notarial & tax-agency auctions): search, consolidated detail and legal threshold calculations. 🇪🇸
```

## Post de lanzamiento corto (r/mcp, r/ClaudeAI — EN)

> **I built an MCP server for Spain's official property-auction portal (BOE)**
>
> Spain publishes every judicial foreclosure on subastas.boe.es, but each auction is split across 4 tabs with no API. My MCP server lets Claude/Cursor search auctions by province, pull a consolidated JSON detail (assets, lots, bids, court contacts) and compute the legal award thresholds (art. 671 LEC) — so you can literally ask "find flats in Barcelona ending this week below 100k".
>
> Stack: Node 20, zero headless browsers (plain fetch + cheerio), runs on a 4GB laptop. Code: github.com/jorditg77/subastas-boe-api
