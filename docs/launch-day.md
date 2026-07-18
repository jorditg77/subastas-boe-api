# Día de lanzamiento — checklist y posts preparados

## Checklist previo (verificar TODO antes de "Publish to Hub")

**Fiabilidad**
- [ ] Soak test: ≥7 días con UptimeRobot >99% (iniciado 16-jul-2026 aprox.; 2 días al 100% a 18-jul)
- [ ] CI en verde en GitHub
- [ ] `curl https://api.subastas.dev/health` → 200

**RapidAPI**
- [ ] Planes BASIC/PRO/ULTRA/MEGA configurados ✅ (hecho 18-jul)
- [ ] Payouts configurados (Settings → método de cobro)
- [ ] Logo subido (usar `landing/logo.png`)
- [ ] Long description pegada ✅ (hecho 18-jul)
- [ ] Probar un endpoint desde la consola del Hub con una key propia

**Legal** ✅ (verificado 18-jul-2026)
- Reutilización permitida, incluso comercial, por la Ley 37/2007 (RISP) y el aviso legal del BOE, sin autorización previa. Condiciones cumplidas: citación con enlace (footer de la landing + `sourceUrl` en cada respuesta), identificación de los campos añadidos como elaboración propia, RGPD (redacción DNI/NIE/IBAN).

## Secuencia del día D

1. RapidAPI → **Publish to Hub**. Copiar la URL pública del listing (rapidapi.com/...).
2. Landing: actualizar el botón `#cta-rapidapi` de `landing/index.html` con esa URL real y quitar el "Próximamente" → push (se redespliega solo).
3. Alta en **Zyla API Hub** (segundo marketplace) con el mismo OpenAPI (`docs/openapi.json`) y copy de `docs/README-RapidAPI.md`.
4. Directorios MCP: enviar con los textos de `docs/mcp-submissions.md` (Glama, MCP.so, Smithery, PR a Awesome MCP Servers, Cursor Directory).
5. Posts de comunidades (abajo), idealmente repartidos en 2-3 días, no todos a la vez.
6. Google Search Console: pedir indexación manual de https://subastas.dev/ (Inspección de URLs → Solicitar indexación).

## Posts preparados

### Reddit r/SpainFIRE (ES)

> **He convertido el portal de subastas del BOE en una API (y en una tool para agentes de IA)**
>
> Los que hayáis mirado alguna vez subastas.boe.es sabréis el dolor: cada subasta está repartida en 4 pestañas, sin API, y para saber si una puja tiene sentido tienes que calcular a mano los umbrales del art. 671 LEC (¿70% o 50% según vivienda habitual?).
>
> He montado una API que lo consolida todo en una llamada JSON: valores, lotes con su economía real, contacto del juzgado, pujas, y el umbral legal aplicable ya calculado. También funciona como servidor MCP, así que puedes conectarla a Claude y preguntarle "búscame garajes en Barcelona que acaben esta semana".
>
> Web: subastas.dev — hay plan gratuito de 100 peticiones/mes para probar. El código es público en GitHub. Feedback muy bienvenido, especialmente de los que invertís en subastas de verdad.

### LinkedIn (ES, tono profesional)

> El portal de subastas del BOE publica miles de oportunidades (ejecuciones hipotecarias, embargos de la AEAT, concursos), pero cada subasta está fragmentada en 4 pestañas sin API oficial.
>
> He lanzado subastas.dev: una API que entrega cada subasta como un único objeto JSON con los umbrales del art. 671 LEC ya calculados, la economía por lote y los datos de la autoridad gestora — con redacción automática de datos personales (RGPD) y citando la fuente oficial conforme a la Ley 37/2007 de reutilización.
>
> Para despachos, inversores y equipos PropTech que hoy hacen este cruce a mano. Y para los que construís con IA: incluye servidor MCP, con lo que cualquier agente (Claude, Cursor) puede consultar subastas desde su contexto.
>
> subastas.dev — plan gratuito para evaluarla.

### X/Twitter — hilo ES (3 tuits)

> 1/ El BOE publica cada subasta judicial repartida en 4 pestañas, sin API. Para evaluar UNA oportunidad: abrir pestañas, copiar cifras, calcular umbrales a mano.
>
> Lo he automatizado: subastas.dev — toda la subasta en un JSON, con el umbral legal (art. 671 LEC) ya calculado.
>
> 2/ Lo mejor: también es un servidor MCP. Conectas Claude o Cursor y le pides "pisos en Madrid que acaben esta semana con umbral por debajo de 100k". El agente usa la API solo.
>
> 3/ Corre en un portátil viejo de 4GB con arquitectura Zero-Disk (todo en RAM, cero navegadores headless). Código público: github.com/jorditg77/subastas-boe-api. Plan gratis para probar.

### X/Twitter — EN (1 tuit, audiencia MCP/builders)

> Spain publishes every judicial foreclosure on a government portal with no API, split across 4 tabs per auction.
>
> I built an MCP server + REST API that consolidates it: ask Claude "find flats in Barcelona ending this week" and it just works.
>
> subastas.dev · open code: github.com/jorditg77/subastas-boe-api

### Product Hunt

- **Name**: Subastas BOE API
- **Tagline**: Spain's judicial property auctions as clean JSON + MCP
- **Description**: Spain's official auction portal (BOE) publishes every judicial foreclosure split across 4 tabs with no API. Subastas BOE API consolidates each auction into one JSON object — legal award thresholds computed (art. 671 LEC), per-lot financials, GDPR-safe output — and ships an MCP server so AI agents can hunt property deals on their own. Free tier available.
- **Topics**: APIs, Real Estate, Artificial Intelligence, Developer Tools

### Indie Hackers (EN, narrativa bootstrapping)

> **I turned Spain's clunkiest government portal into an API business — running on a 12-year-old laptop**
>
> The constraint was the product: an old HP with 4GB RAM behind CG-NAT. No headless browsers (no RAM for that), no database (Zero-Disk: everything in memory), Cloudflare Tunnel for the CG-NAT. Plain fetch + cheerio, LRU cache with byte-accurate sizing, request coalescing so 50 concurrent clients = 1 request to the source.
>
> The data: Spain's official judicial auction portal — high-value property foreclosures locked behind a 4-tab UI with no API. Competitors on Apify charge $3-50 per 1,000 results for messier data.
>
> Monetization: RapidAPI + Zyla marketplaces, MCP server as the differentiator (AI agents are the new API consumers). Landing: subastas.dev. AMA about scraping government portals politely.
