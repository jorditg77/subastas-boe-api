#!/bin/bash
# Despliegue de producción en el servidor doméstico (HP Pavilion 15, Debian 13).
#
# ESTADO REAL DEL DESPLIEGUE (julio 2026) — este script documenta cómo quedó
# montado; no hace falta ejecutarlo entero en un servidor ya configurado:
#
#   1. App bajo PM2 con resurrección automática (systemd pm2-jtull.service):
#        pm2 start src/index.js --name subastas-boe-api --max-memory-restart 3000M
#        pm2 save
#      Rotación de logs (disco pequeño, ~18GB):
#        pm2 install pm2-logrotate
#        pm2 set pm2-logrotate:max_size 10M
#        pm2 set pm2-logrotate:retain 7
#        pm2 set pm2-logrotate:compress true
#
#   2. Cloudflare Tunnel como servicio systemd (token gestionado en el
#      dashboard: Networking > Tunnels > subastas-boe-api):
#        sudo cloudflared service install <TOKEN>
#      IMPORTANTE: la unidad que genera usa Type=notify y TimeoutStartSec=15,
#      que en esta máquina provocaba un bucle de reinicios (cloudflared no
#      emite la señal de listo a tiempo). Corregido editando
#      /etc/systemd/system/cloudflared.service:
#        Type=simple
#        TimeoutStartSec=60
#
#   3. Hostname público: api.subastas.dev -> http://localhost:3000, configurado
#      en el dashboard (Networking > Tunnels > Published application routes).
#
#   4. El .env de producción DEBE tener NODE_ENV=production y un
#      RAPIDAPI_PROXY_SECRET fuerte (openssl rand -hex 32); el servidor se
#      niega a arrancar sin él (fail-closed).

set -e

# Arranque/reinicio rápido de la app (el túnel lo gestiona systemd aparte):
pm2 startOrRestart src/index.js --name subastas-boe-api --max-memory-restart 3000M
pm2 save

echo "App desplegada. Túnel: systemctl status cloudflared. Logs: pm2 logs subastas-boe-api"
