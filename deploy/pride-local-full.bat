@echo off
cd /d %~dp0..

REM Pride instance (7x2). The server serves the UI + API + WebSocket on its own
REM port, so there is no separate UI process — just server + receiver.
set WAVEGRID_PORT=3001
set WAVEGRID_LAYOUT=grid-7x2
set SIMULATOR_URL=ws://localhost:3001
set BEYOND_HOST=127.0.0.1
set BEYOND_PORT=8000
set BEYOND_COLOR_MODE=rgb
set SHARD_START=0
set SHARD_END=13
set DEBUG_OSC=1

start "" /B cmd /c "set WAVEGRID_PORT=3001&& set WAVEGRID_LAYOUT=grid-7x2&& pnpm dev:server"
timeout /t 3 /nobreak >nul
start "" /B cmd /c "set SIMULATOR_URL=ws://localhost:3001&& set WAVEGRID_LAYOUT=grid-7x2&& set BEYOND_HOST=127.0.0.1&& set BEYOND_PORT=8000&& set BEYOND_COLOR_MODE=rgb&& set SHARD_START=0&& set SHARD_END=13&& set DEBUG_OSC=1&& pnpm dev:receiver"
