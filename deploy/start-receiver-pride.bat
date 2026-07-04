@echo off
REM Pride receiver — 7x2 grid (14 cannons), connects to port 3001.
REM Run this on the Pride laptop. Replace DROPLET_IP with the server address.
cd /d %~dp0..

set SIMULATOR_URL=ws://DROPLET_IP:3001
set WG_RECEIVER_KEY=CHANGE_ME
set GRID=7x2
set NUM_CANNONS=14
set GRID_COLUMNS=7
set BEYOND_COLOR_MODE=rgb
set BEYOND_HOST=127.0.0.1
set BEYOND_PORT=8000
set SHARD_START=0
set SHARD_END=13
set DEBUG_OSC=1

pnpm dev:receiver
