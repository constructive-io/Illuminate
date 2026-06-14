# @wavegrid/webgl

WebGL 3D viewer for the 7×7 laser installation at San Francisco's Civic Center Plaza. Built with Three.js + postprocessing bloom.

**This is a viewer only** — all beam state comes from the Simulator via WebSocket. The controller UI (`@wavegrid/ui`) drives the animations, scenes, and audio; this package just renders the 3D result.

## Quick Start

```sh
# From repo root
pnpm dev:sim    # start Simulator on :3000
pnpm dev:webgl  # start 3D viewer on :3004
```

Open `http://localhost:3004` and the viewer connects to the Simulator automatically.

## Scene

- **San Francisco Civic Center Plaza** with City Hall (dome, portico, steps, window glow), surrounding civic buildings, lawns, walkways, tree rows, street lamps, bollards
- **7×7 aluminum truss** with cross braces, support legs, base plates, ballast blocks
- **49 volumetric laser beams** with additive blending, bloom postprocessing, per-beam color/intensity
- **Human silhouettes** for scale reference
- **Day / Dusk / Night** modes with appropriate lighting, fog, and building window emissives

## Controls

| Control | Description |
|---------|-------------|
| **Camera presets** | 7 viewpoints: under beams, civic axis, reverse, aerial, drone, close-up, skyline |
| **Time of day** | Day, Dusk, Night |
| **Brightness** | Global beam brightness (0–2) |
| **Haze** | Fog/atmospheric density (0–1) |
| **Beam Height** | Visible beam length (100–3000 ft) |
| **Beam Width** | Beam diameter scale (0.2–3) |
| **Debug overlay** | Footprint outline + beam position markers |
| **Hover** | Shows beam ID, row/col, RGB, intensity |
| **Orbit** | Click and drag to orbit the scene |

## WebSocket Protocol

Connects to the Simulator at `ws://localhost:3000` (same as Canvas and UI). Receives:

```json
{ "type": "state", "grid": [{ "h": 220, "s": 90, "b": 80 }, ...] }
```

The `grid` array contains 49 HSB values which are converted to RGB for the 3D beams.

## Architecture

```
src/
  installation/   BeamState types, LaserArray (volumetric beams), TrussGrid
  scene/          CivicCenterScene, CityHall, Plaza, Trees, CivicBuildings, Silhouettes
  control/        StateController, MessageReceiver (WebSocket)
  ui/             CameraPresets
  main.ts         Entry point — wires everything together
```

## Configurable Dimensions

| Parameter | Default | Description |
|-----------|---------|-------------|
| `footprintFt` | 60 | Truss footprint width/depth in feet |
| `trussHeightFt` | 14 | Height of truss above ground |
| `beamHeightFt` | 1500 | Visible beam length |
| `numCannons` | 49 | Total beams |
| `gridColumns` | 7 | Grid columns |
