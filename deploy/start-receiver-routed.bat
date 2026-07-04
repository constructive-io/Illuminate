@echo off
cd /d C:\Users\chris\Documents\laser_code\Illuminate

REM Routed mode: dispatches OSC directly to both PCs using routing config.
REM Use this instead of start-receiver.bat when PC1 cannot master PC2,
REM or when you want independent per-cannon routing to each BEYOND instance.

set SIMULATOR_URL=ws://DROPLET_IP:3000
set WG_RECEIVER_KEY=CHANGE_ME
set ROUTING_CONFIG=examples\routing-production.json
set DEBUG_OSC=1

pnpm dev:receiver
