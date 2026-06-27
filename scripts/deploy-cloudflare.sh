#!/bin/bash
# Script de ejemplo para arrancar Cloudflare Tunnel en el servidor doméstico
# Requiere: cloudflared instalado y token configurado

set -e

TUNNEL_TOKEN=${TUNNEL_TOKEN:-""}

if [ -z "$TUNNEL_TOKEN" ]; then
  echo "Error: TUNNEL_TOKEN no está definido"
  echo "Obtén el token desde el dashboard de Cloudflare Zero Trust: Networks > Tunnels"
  exit 1
fi

# Arrancar el tunnel en segundo plano
cloudflared tunnel --no-autoupdate run --token "$TUNNEL_TOKEN" &

# Arrancar la API con PM2. max-memory-restart no acepta decimales (PM2 7.x),
# de ahí 3000M en vez de "2.5G". Es un backstop duro por encima del umbral de
# presión de memoria interno de la app (memoria/index.js), que ya debería
# liberar memoria antes de llegar aquí.
pm2 start src/index.js --name subastas-boe-api --max-memory-restart 3000M
pm2 save

echo "Servicio desplegado. Monitoreo: pm2 logs subastas-boe-api"
