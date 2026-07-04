@echo off
cd /d C:\Users\chris\Documents\laser_code\Illuminate

set SIMULATOR_URL=ws://DROPLET_IP:3000
set WG_RECEIVER_KEY=CHANGE_ME
set BEYOND_COLOR_MODE=rgb
set BEYOND_HOST=127.0.0.1
set BEYOND_PORT=8000
set SHARD_START=0
set SHARD_END=48
set DEBUG_OSC=1

pnpm dev:receiver
