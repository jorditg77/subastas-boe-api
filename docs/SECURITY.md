# Modelo de amenazas y controles de seguridad

Auditoría del backend (`api.subastas.dev`). Resume las decisiones de seguridad,
qué protege cada capa y qué riesgos se asumen de forma consciente.

## Arquitectura de confianza

```
Cliente final → Marketplace (RapidAPI/Zyla) → Cloudflare (TLS + DDoS) → Túnel → Node (127.0.0.1:3000) → BOE
```

- El backend **solo** es alcanzable a través del túnel de Cloudflare: escucha en
  `127.0.0.1`, no en la LAN (`HOST=127.0.0.1`). Un equipo de la red local no
  puede saltarse el túnel.
- El marketplace es la pasarela de facturación: cobra al cliente y reenvía la
  petición al backend con una **cabecera secreta** (`X-RapidAPI-Proxy-Secret` o
  `X-Gateway-Secret`).

## Control de acceso / autenticación

- **Todas** las rutas salvo `/health` exigen un secreto válido. Sin él → `401`.
- El secreto se compara en **tiempo constante** (`crypto.timingSafeEqual`) para
  no filtrarlo por diferencias de tiempo.
- Se admiten varios secretos (uno por marketplace) para poder **rotarlos por
  separado** (`RAPIDAPI_PROXY_SECRET`, `GATEWAY_EXTRA_SECRETS`).
- **Fail-closed**: en producción el servidor se niega a arrancar sin al menos un
  secreto, para no exponerse por un despliegue mal configurado.
- El secreto vive solo en el `.env` del servidor (git verificado: nunca
  versionado). No hay secretos en el repositorio.

### Amenaza: secreto filtrado

Si el secreto se filtrara, un atacante podría llamar al backend saltándose la
facturación. Defensa:
1. El rate limit por IP (abajo) topa el abuso desde una IP concreta.
2. **Rotación**: cambiar el valor en el `.env` del servidor y en la config del
   marketplace (< 2 min), invalida el secreto filtrado al instante.

La cuota por plan la sigue garantizando el marketplace; el backend no la
duplica (sería confiar en headers no autenticados, ver abajo).

## Rate limiting

- Techo de **300 req/min por IP real** (`CF-Connecting-IP`), configurable.
- Corre **antes** de la validación del secreto: protege incluso ese chequeo de
  un flood, y encarece la fuerza bruta del secreto (que además es inviable por
  la entropía del secreto + comparación en tiempo constante).
- El store de contadores está **acotado** (`cache: 10000`) para no crecer sin
  límite ante muchas IPs distintas.

### Por qué la clave es la IP y NO el usuario del marketplace

Se consideró usar `X-RapidAPI-User` como clave (un cubo por suscriptor, evitando
que clientes que comparten la IP de salida del gateway compartan cubo). **Se
descartó por inseguro**: ese header llega sin autenticar y el rate limit corre
antes de validar el secreto, así que un atacante podría enviar el usuario de una
víctima y agotar su cubo, provocándole un `429` (DoS dirigido). La IP no es
falsificable a través de Cloudflare.

**Contrapartida asumida**: los clientes tras un mismo gateway comparten cubo. Se
mitiga con un límite holgado (300/min) y con el hecho de que el recurso caro (el
portal del BOE) ya está protegido por el limitador de concurrencia `boeLimit`.

## Protección del recurso externo (BOE)

- `boeLimit`: máximo de peticiones **concurrentes** al BOE global (por defecto 3),
  compartido entre búsqueda y detalle. Evita el bloqueo de la IP doméstica.
- **Single-flight**: peticiones concurrentes a la misma clave comparten una única
  petición al BOE (anti *cache stampede*).
- **Timeout** por petición al BOE (20 s): una conexión colgada no retiene un slot
  del limitador de forma indefinida.
- Caché en RAM acotada por **bytes reales** con TTL, más una válvula de presión de
  memoria. Nada toca el disco (arquitectura Zero-Disk).

## Validación de entrada

- `province`: exactamente 2 dígitos. `status`/`type`: enums cerrados.
- `page`/`limit`: enteros acotados (limit ≤ 100).
- `id` de subasta: regex estricta **con longitud máxima** (`≤ 50`), evita inflar
  memoria (clave de caché/URL) con un identificador enorme.
- No hay SSRF: el host de destino está fijado en el código; el `id` validado solo
  rellena el parámetro `idSub`. No se aceptan URLs del usuario.

## Otras medidas

- `X-Content-Type-Options: nosniff` en todas las respuestas.
- Swagger UI **deshabilitado en producción** (los clientes usan la doc del
  marketplace); reduce superficie de ataque.
- Errores 4xx/429 se registran como `info`, no como `error` (evita ruido y
  llenado del disco). Los 5xx sí como `error`.
- Handlers globales de `unhandledRejection`/`uncaughtException`: un fallo raro de
  parseo no tumba el proceso en silencio.
- PII: DNI/NIE/IBAN redactados de todas las respuestas (RGPD).

## Riesgos aceptados / conscientes

1. **Redirects del BOE**: `undici.fetch` sigue redirects. Como el host es fijo, el
   TLS se verifica y el BOE es un host gubernamental de confianza, el riesgo de
   SSRF por redirect es muy bajo y el servidor doméstico no tiene servicios
   internos de valor que alcanzar. Vía de mejora futura: validar el host final.
2. **Cubo de rate limit compartido por gateway**: ver sección de rate limiting.
3. **Cuota**: la garantiza el marketplace, no el backend (por diseño).

## Procedimiento de rotación del secreto (si se sospecha filtración)

1. Generar uno nuevo: `openssl rand -hex 32`.
2. Actualizar `RAPIDAPI_PROXY_SECRET` en el `.env` del servidor.
3. `pm2 restart subastas-boe-api --update-env`.
4. Actualizar el *Proxy Secret* en la configuración de la API en el marketplace.
