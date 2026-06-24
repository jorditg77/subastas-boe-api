# Subastas BOE API

![Status](https://img.shields.io/badge/status-en%20desarrollo%20activo-yellow)
![Node](https://img.shields.io/badge/node-%3E%3D20-brightgreen)
![License](https://img.shields.io/badge/license-PolyForm%20Noncommercial%201.0.0-blue)

API REST + servidor MCP que consolida en un único JSON limpio los datos dispersos en las cuatro pestañas (**General**, **Autoridad**, **Bienes**, **Pujas**) del portal oficial de subastas judiciales, notariales y tributarias del Estado español: [subastas.boe.es](https://subastas.boe.es).

Pensada para alimentar agentes de IA (vía [Model Context Protocol](https://modelcontextprotocol.io)), paneles de PropTech y flujos de análisis de inversión inmobiliaria, sin depender de navegadores headless ni de bases de datos pesadas.

## Por qué existe este proyecto

El portal del BOE publica datos públicos de alto valor (tasaciones, depósitos, cargas, pujas) pero los reparte en pestañas independientes por activo, sin una API oficial. Cruzar esa información a mano —y calcular a la vez los umbrales legales de adjudicación directa— es lento y propenso a errores. Esta API hace ese cruce automáticamente y expone el resultado como JSON listo para consumir.

## Restricción de diseño: arquitectura Zero-Disk

El servicio está pensado para correr en un equipo doméstico muy limitado (Intel Core i3 de 3ª generación, 4 GB de RAM, disco duro mecánico, conexión residencial tras CG-NAT). Esa restricción, en lugar de ser una limitación a esconder, es la decisión de diseño central del proyecto:

- **Sin disco**: ninguna petición a la API toca el disco mecánico. Todo el ciclo de vida (fetch → parseo → caché) ocurre en memoria.
- **Sin navegadores headless**: el HTML del BOE es ligero, así que basta con peticiones HTTP asíncronas (`undici`) y parseo con `cheerio`, evitando los cientos de MB que consumiría Puppeteer/Playwright.
- **Caché LRU en RAM** con TTL (2-6 h, acorde al ritmo real de actualización de una subasta) y un *memory-pressure guard* que se autolimpia si el proceso se acerca al límite de memoria disponible.
- **Exposición vía Cloudflare Tunnel**, que resuelve el CG-NAT y descarga la terminación TLS de la CPU del servidor.

```mermaid
sequenceDiagram
    participant C as Cliente (RapidAPI / Agente IA vía MCP)
    participant CF as Cloudflare Tunnel
    participant API as Fastify (Node.js)
    participant Cache as Caché LRU (RAM)
    participant BOE as subastas.boe.es

    C->>CF: HTTPS request
    CF->>API: HTTP plano (TLS ya terminado)
    API->>Cache: ¿Hit en caché?
    alt Cache hit
        Cache-->>API: JSON consolidado
    else Cache miss
        API->>BOE: GET General / Autoridad / Bienes / Pujas
        BOE-->>API: HTML
        API->>API: Parseo (Cheerio) + cálculos legales + redacción PII
        API->>Cache: Guardar (TTL 2-6h)
    end
    API-->>CF: JSON
    CF-->>C: HTTPS response
```

## Estado actual del proyecto

Este repositorio se está desarrollando de forma incremental y pública. Estado a fecha de la última actualización:

**Hecho**
- [x] Servidor Fastify con OpenAPI/Swagger, rutas (`/health`, `/provinces`, `/auctions`) y caché en memoria conectada.
- [x] Cliente HTTP con reintentos y backoff exponencial hacia el BOE.
- [x] Cálculos legales automáticos (umbrales del 50%/70% del valor de tasación, depósito del 5%) y redacción de PII (NIF/DNI/NIE) para cumplir RGPD, con tests unitarios.
- [x] Fixtures HTML reales del portal descargados para el desarrollo del parser.
- [x] Control de versiones, licencia y documentación legal básica.

**En progreso (ver desglose completo en la sección Roadmap)**
- [ ] Parseo real del HTML del BOE en `search.js` y `detail.js` (hoy son placeholders).
- [ ] Servidor MCP (`src/mcp/`).
- [ ] Despliegue en producción y publicación en RapidAPI.

## Características principales (objetivo de diseño)

- **Zero-Disk:** todo el scraping, parseo y caché ocurre en RAM.
- **Sin navegadores headless:** parseo eficiente con Cheerio.
- **Multi-tab:** consolida General, Autoridad, Bienes y Pujas en un solo objeto JSON.
- **MCP-ready:** pensada para exponerse como servidor MCP a agentes de IA.
- **Cálculos legales automáticos:** umbrales del 50% y 70%, depósito del 5%.
- **Filtrado de PII:** elimina datos personales para cumplir RGPD.

## Stack técnico

Node.js (ESM) · Fastify · Cheerio · undici · quick-lru · pino · Zod · `@modelcontextprotocol/sdk` · PM2 · Cloudflare Tunnel.

## Requisitos

- Node.js >= 20
- 4 GB RAM (recomendado; es el objetivo de diseño, no un mínimo arbitrario)
- Cloudflare Tunnel para exposición tras CG-NAT
- PM2 (opcional, recomendado para producción)

## Instalación rápida

```bash
npm install
cp .env.example .env
# Edita .env con tu configuración (ver comentarios en el propio archivo)
npm run dev
```

## API REST

| Método | Ruta              | Descripción                                  |
|--------|--------------------|-----------------------------------------------|
| GET    | `/health`          | Estado del servicio.                          |
| GET    | `/provinces`        | Listado de las 52 provincias españolas con su código BOE. |
| GET    | `/auctions`         | Búsqueda de subastas (filtros: provincia, estado, tipo de bien, rango de valor, paginación). |
| GET    | `/auctions/:id`     | Detalle consolidado de una subasta (General + Autoridad + Bienes + Pujas). |

La documentación interactiva (Swagger UI) está disponible en `/docs` una vez el servidor está corriendo.

```bash
curl "http://localhost:3000/auctions?province=28&type=inmuebles&status=celebrandose"
```

Estructura de respuesta de `/auctions/:id` (esquema; los valores se completan con datos reales del BOE conforme avanza el parser — ver Roadmap):

```json
{
  "id": "SUB-AT-2026-26R0886001165",
  "type": "JUDICIAL EN VÍA DE APREMIO",
  "status": "Celebrandose",
  "general": {
    "description": "string",
    "auctionValue": 0,
    "appraisalValue": 0,
    "reference70": 0,
    "reference50": 0,
    "deposit": 0
  },
  "authority": { "name": null, "code": null, "address": null, "phone": null, "email": null },
  "assets": [],
  "bids": { "currentMaxBid": null, "totalBids": null, "requiresDeposit": true },
  "documents": [],
  "metadata": { "sourceUrl": "string", "scrapedAt": "ISO-8601", "cached": false }
}
```

## Servidor MCP

Planificado en el roadmap (ver más abajo). Expondrá como *tools* MCP la búsqueda de subastas, el detalle consolidado y el cálculo de umbrales legales, reutilizando la misma capa de caché que la API REST, para que agentes como Claude o Cursor puedan consultar subastas del BOE directamente desde su contexto.

## Exposición con Cloudflare Tunnel

```bash
cloudflared tunnel --no-autoupdate run --token <TU_TOKEN>
```

Ver [scripts/deploy-cloudflare.sh](scripts/deploy-cloudflare.sh) para el script de despliegue completo (túnel + PM2).

## Estructura del proyecto

```
src/
├── api/
│   ├── middleware/   # logger (pino), errorHandler
│   ├── routes/       # health, provinces, auctions
│   └── server.js     # bootstrap de Fastify + Swagger
├── cache/
│   └── memory.js     # caché LRU en RAM con TTL y memory-pressure guard
├── config/           # env vars, constantes del BOE, planes de precio
├── scrapers/
│   ├── search.js     # búsqueda de subastas
│   ├── detail.js     # detalle consolidado (4 pestañas)
│   └── utils/        # fetch con reintentos, cálculos legales, redacción PII
└── index.js           # entry point
tests/
├── fixtures/          # HTML real descargado de subastas.boe.es
└── parsers.test.js
```

## Roadmap

Proyecto dividido en dos bloques: completar el producto técnico y, después, marketing/SEO/adquisición de clientes para la monetización vía RapidAPI.

**Bloque 1 — Producto técnico**
1. Mapeo de selectores reales sobre los fixtures HTML descargados.
2. Parseo real en `search.js` y `detail.js` + límite de concurrencia hacia el BOE.
3. Tests de parseo contra los fixtures reales.
4. Servidor MCP en `src/mcp/`.
5. Pruebas de memoria/concurrencia en el hardware real y hardening de errores.
6. Despliegue en producción (Cloudflare Tunnel + PM2) y CI/CD básico.

**Bloque 2 — Monetización**
7. Publicación en RapidAPI con los planes Free / Starter / Pro / Business.
8. Ficha optimizada para SEO, landing propia, presencia en directorios de servidores MCP y comunidades del sector inmobiliario/PropTech.

## Legal

- Los datos provienen del portal oficial del BOE y están sujetos a sus condiciones de reutilización de información pública. Esta API no sustituye la consulta directa en `subastas.boe.es` ni constituye asesoramiento legal o de inversión.
- Ver [docs/PRIVACY.md](docs/PRIVACY.md) y [docs/TERMS.md](docs/TERMS.md) para el tratamiento de datos personales y los términos de uso del servicio.

## Licencia

Código fuente disponible bajo **[PolyForm Noncommercial License 1.0.0](LICENSE)**: puedes leerlo, estudiarlo y usarlo con fines no comerciales (educativos, de investigación, portfolio). El uso comercial del código —incluido desplegar una instancia propia del servicio— no está permitido sin autorización expresa del autor. El servicio en sí se ofrece comercialmente a través de RapidAPI.
