import { useCallback, useState } from 'react';

import { ControlGroup } from './control-grid';
import { MiniGridPreview } from './mini-grid-preview';

interface PatternDef {
  name: string;
  gradient: string;
  code: string;
}

const PRESETS: PatternDef[] = [
  // ── Originals ──────────────────────────────────────────────
  {
    name: 'Color Cycle',
    gradient: 'conic-gradient(from 0deg, #e33, #ee0, #3a5, #35e, #e33)',
    code: `({
  render(ctx) {
    ctx.fill(ctx.t * 30 % 360, 100, 80);
  },
  meta: { name: 'color-cycle' }
})`
  },
  {
    name: 'Noise Field',
    gradient: 'linear-gradient(135deg, #1a2a3a, #3a5a2a, #2a1a4a)',
    code: `({
  render(ctx) {
    for (let i = 0; i < ctx.count; i++) {
      const [u, v] = ctx.uv(i);
      const n = ctx.noise(u * 3, v * 3, ctx.t * 0.5);
      ctx.set(i, n * 360, 80, n * 100);
    }
  },
  meta: { name: 'noise-field' }
})`
  },
  {
    name: 'Radial Pulse',
    gradient: 'radial-gradient(circle, #3a7ad8, #1a2a5a, #0a1a3a)',
    code: `({
  render(ctx) {
    for (let i = 0; i < ctx.count; i++) {
      const [r] = ctx.polar(i);
      const w = Math.sin(r * 6 - ctx.t * 3) * 0.5 + 0.5;
      ctx.set(i, 200 + w * 60, 90, w * 100);
    }
  },
  meta: { name: 'radial-pulse' }
})`
  },
  {
    name: 'Matrix Rain',
    gradient: 'linear-gradient(180deg, #001a00, #00cc00, #001a00)',
    code: `({
  render(ctx) {
    for (let i = 0; i < ctx.count; i++) {
      const [x, y] = ctx.xy(i);
      const phase = (ctx.t * 2 + x * 2.3 + x * x * 0.7) % ctx.rows;
      const dist = Math.abs(y - phase);
      const b = dist < 1.5 ? 90 - dist * 30 : 5;
      ctx.set(i, 120, 90, b);
    }
  },
  meta: { name: 'matrix-rain' }
})`
  },
  {
    name: 'Checkerboard',
    gradient: 'repeating-conic-gradient(#555 0% 25%, #e8e8e8 0% 50%) 50% / 36px 36px',
    code: `({
  render(ctx) {
    for (let i = 0; i < ctx.count; i++) {
      const [x, y] = ctx.xy(i);
      const checker = ((x + y + Math.floor(ctx.t * 2)) % 2 === 0);
      ctx.set(i, ctx.t * 20 % 360, 90, checker ? 90 : 10);
    }
  },
  meta: { name: 'checkerboard' }
})`
  },
  {
    name: 'Spiral',
    gradient: 'conic-gradient(from 0deg, #e33, #ee0, #3a5, #35e, transparent)',
    code: `({
  render(ctx) {
    for (let i = 0; i < ctx.count; i++) {
      const [r, theta] = ctx.polar(i);
      const spiral = Math.sin(theta * 3 - r * 8 + ctx.t * 2);
      const b = ctx.smoothstep(-0.2, 0.8, spiral) * 100;
      const h = (theta / (Math.PI * 2) * 360 + ctx.t * 30) % 360;
      ctx.set(i, h, 90, b);
    }
  },
  meta: { name: 'spiral' }
})`
  },
  {
    name: 'Lava',
    gradient: 'linear-gradient(135deg, #ff4500, #cc0000, #ff8c00, #ff4500)',
    code: `({
  render(ctx) {
    for (let i = 0; i < ctx.count; i++) {
      const [u, v] = ctx.uv(i);
      const n1 = ctx.noise(u * 2, v * 2, ctx.t * 0.3);
      const n2 = ctx.noise(u * 4, v * 4, ctx.t * 0.5 + 10);
      const h = 10 + n1 * 30;
      const b = 40 + n2 * 60;
      ctx.set(i, h, 100, b);
    }
  },
  meta: { name: 'lava' }
})`
  },
  {
    name: 'Aurora',
    gradient: 'linear-gradient(135deg, #00ff88, #0088ff, #8800ff, #00ff88)',
    code: `({
  render(ctx) {
    for (let i = 0; i < ctx.count; i++) {
      const [u, v] = ctx.uv(i);
      const wave = Math.sin(u * 4 + ctx.t) * 0.2;
      const n = ctx.noise(u * 2, v + wave, ctx.t * 0.2);
      const h = 120 + n * 180;
      const b = Math.max(5, n * 100);
      ctx.set(i, h, 80, b);
    }
  },
  meta: { name: 'aurora' }
})`
  },

  // ── New patterns ───────────────────────────────────────────
  {
    name: 'Fire Flicker',
    gradient: 'linear-gradient(180deg, #ff0000, #cc0000, #ff6600)',
    code: `({
  render(ctx) {
    for (let i = 0; i < ctx.count; i++) {
      const [u, v] = ctx.uv(i);
      const flicker = ctx.noise(u * 5, v * 3, ctx.t * 3);
      const isYellow = flicker > 0.75;
      const h = isYellow ? 45 + flicker * 10 : 0 + flicker * 15;
      const s = isYellow ? 100 : 100;
      const b = 50 + flicker * 50;
      ctx.set(i, h, s, b * (1 - v * 0.3));
    }
  },
  meta: { name: 'fire-flicker' }
})`
  },
  {
    name: 'Ocean Waves',
    gradient: 'linear-gradient(180deg, #001a4d, #0055aa, #00aadd)',
    code: `({
  render(ctx) {
    for (let i = 0; i < ctx.count; i++) {
      const [u, v] = ctx.uv(i);
      const wave1 = Math.sin(u * 8 + ctx.t * 1.5) * 0.3;
      const wave2 = Math.sin(u * 5 - ctx.t * 0.8 + v * 3) * 0.2;
      const depth = v + wave1 + wave2;
      const h = 190 + depth * 30;
      const b = 30 + (1 - depth) * 60;
      ctx.set(i, h, 80, Math.max(10, b));
    }
  },
  meta: { name: 'ocean-waves' }
})`
  },
  {
    name: 'Fireflies',
    gradient: 'linear-gradient(135deg, #0a0a20, #1a1a00, #0a0a20)',
    code: `({
  render(ctx) {
    for (let i = 0; i < ctx.count; i++) {
      const [u, v] = ctx.uv(i);
      const n = ctx.noise(u * 4 + ctx.t * 0.3, v * 4 - ctx.t * 0.2, ctx.t * 2);
      const glow = Math.pow(Math.max(0, n - 0.55) / 0.45, 3);
      ctx.set(i, 55, 100, glow * 100);
    }
  },
  meta: { name: 'fireflies' }
})`
  },
  {
    name: 'Plasma',
    gradient: 'linear-gradient(135deg, #ff00ff, #00ffff, #ff8800, #ff00ff)',
    code: `({
  render(ctx) {
    for (let i = 0; i < ctx.count; i++) {
      const [u, v] = ctx.uv(i);
      const v1 = Math.sin(u * 10 + ctx.t);
      const v2 = Math.sin(v * 10 + ctx.t * 1.3);
      const v3 = Math.sin((u + v) * 7 + ctx.t * 0.7);
      const v4 = Math.sin(Math.sqrt(u * u + v * v) * 8 - ctx.t * 2);
      const sum = (v1 + v2 + v3 + v4) / 4;
      ctx.set(i, (sum + 1) * 180, 90, 60 + sum * 40);
    }
  },
  meta: { name: 'plasma' }
})`
  },
  {
    name: 'Starfield',
    gradient: 'radial-gradient(circle, #ffffff, #000033, #000000)',
    code: `({
  render(ctx) {
    for (let i = 0; i < ctx.count; i++) {
      const [r, theta] = ctx.polar(i);
      const twinkle = ctx.noise(theta * 10, r * 5, ctx.t * 4);
      const star = twinkle > 0.7 ? (twinkle - 0.7) / 0.3 : 0;
      ctx.set(i, 220 + star * 40, 20, star * 100);
    }
  },
  meta: { name: 'starfield' }
})`
  },
  {
    name: 'Sunset',
    gradient: 'linear-gradient(180deg, #1a0033, #cc3300, #ff9900, #ffcc00)',
    code: `({
  render(ctx) {
    for (let i = 0; i < ctx.count; i++) {
      const [u, v] = ctx.uv(i);
      const shift = Math.sin(u * 3 + ctx.t * 0.3) * 0.1;
      const band = v + shift;
      const h = band < 0.3 ? 270 + band * 100 : band < 0.6 ? 20 - band * 20 : 30 + band * 20;
      const b = 40 + (1 - band) * 60;
      ctx.set(i, h, 90, b);
    }
  },
  meta: { name: 'sunset' }
})`
  },
  {
    name: 'Lightning',
    gradient: 'linear-gradient(180deg, #1a1a3a, #ffffff, #3a3a6a)',
    code: `({
  render(ctx) {
    for (let i = 0; i < ctx.count; i++) {
      const [u, v] = ctx.uv(i);
      const bolt = ctx.noise(u * 2, ctx.t * 8, 0);
      const flash = bolt > 0.85 ? Math.pow((bolt - 0.85) / 0.15, 2) : 0;
      const ambient = ctx.noise(u * 3, v * 3, ctx.t * 0.5) * 15;
      ctx.set(i, 240, flash > 0 ? 10 : 60, ambient + flash * 100);
    }
  },
  meta: { name: 'lightning' }
})`
  },
  {
    name: 'Candy',
    gradient: 'linear-gradient(135deg, #ff69b4, #ff1493, #da70d6, #ff69b4)',
    code: `({
  render(ctx) {
    for (let i = 0; i < ctx.count; i++) {
      const [u, v] = ctx.uv(i);
      const stripe = Math.sin((u + v) * 12 - ctx.t * 2) * 0.5 + 0.5;
      const h = stripe > 0.5 ? 330 : 300;
      ctx.set(i, h, 80, 50 + stripe * 50);
    }
  },
  meta: { name: 'candy' }
})`
  },
  {
    name: 'Deep Sea',
    gradient: 'linear-gradient(180deg, #000022, #003366, #006688)',
    code: `({
  render(ctx) {
    for (let i = 0; i < ctx.count; i++) {
      const [u, v] = ctx.uv(i);
      const n = ctx.noise(u * 2, v * 2, ctx.t * 0.2);
      const caustic = Math.pow(Math.sin(n * 12) * 0.5 + 0.5, 4);
      ctx.set(i, 200 + n * 40, 70, 10 + caustic * 60);
    }
  },
  meta: { name: 'deep-sea' }
})`
  },
  {
    name: 'Neon Grid',
    gradient: 'linear-gradient(135deg, #000000, #ff00ff, #00ffff, #000000)',
    code: `({
  render(ctx) {
    for (let i = 0; i < ctx.count; i++) {
      const [x, y] = ctx.xy(i);
      const gx = Math.abs(Math.sin((x + 0.5) * Math.PI));
      const gy = Math.abs(Math.sin((y + 0.5) * Math.PI));
      const grid = Math.max(gx, gy);
      const pulse = Math.sin(ctx.t * 2) * 0.3 + 0.7;
      const h = x > ctx.cols / 2 ? 180 : 300;
      ctx.set(i, h, 100, grid * pulse * 100);
    }
  },
  meta: { name: 'neon-grid' }
})`
  },
  {
    name: 'Heartbeat',
    gradient: 'radial-gradient(circle, #ff0040, #800020, #200010)',
    code: `({
  render(ctx) {
    const beat = Math.pow(Math.sin(ctx.t * 3) * 0.5 + 0.5, 8);
    for (let i = 0; i < ctx.count; i++) {
      const [r] = ctx.polar(i);
      const wave = Math.max(0, 1 - r * 2) * (0.3 + beat * 0.7);
      ctx.set(i, 350, 90, wave * 100);
    }
  },
  meta: { name: 'heartbeat' }
})`
  },
  {
    name: 'Ice Crystal',
    gradient: 'linear-gradient(135deg, #e0f0ff, #80c0ff, #4080cc, #e0f0ff)',
    code: `({
  render(ctx) {
    for (let i = 0; i < ctx.count; i++) {
      const [r, theta] = ctx.polar(i);
      const facets = Math.cos(theta * 6 + ctx.t) * Math.cos(r * 5 - ctx.t * 0.5);
      const shimmer = ctx.noise(r * 3, theta * 2, ctx.t * 2) * 0.3;
      ctx.set(i, 200 + facets * 20, 40 + shimmer * 30, 50 + (facets + shimmer) * 40);
    }
  },
  meta: { name: 'ice-crystal' }
})`
  },
  {
    name: 'Galaxy',
    gradient: 'radial-gradient(ellipse, #1a0033, #330066, #000011)',
    code: `({
  render(ctx) {
    for (let i = 0; i < ctx.count; i++) {
      const [r, theta] = ctx.polar(i);
      const arm = Math.sin(theta * 2 - r * 6 + ctx.t * 0.5);
      const star = ctx.noise(theta * 8, r * 4, ctx.t) > 0.7 ? 1 : 0;
      const h = 260 + arm * 40;
      const b = arm * 0.5 + 0.5;
      ctx.set(i, h, 70 - star * 50, (b * 50 + star * 80));
    }
  },
  meta: { name: 'galaxy' }
})`
  },
  {
    name: 'Emerald Wave',
    gradient: 'linear-gradient(135deg, #004d00, #00cc44, #88ff88, #004d00)',
    code: `({
  render(ctx) {
    for (let i = 0; i < ctx.count; i++) {
      const [u, v] = ctx.uv(i);
      const wave = Math.sin(u * 6 + ctx.t * 2) * Math.cos(v * 4 - ctx.t);
      ctx.set(i, 140 + wave * 20, 80, 30 + (wave + 1) * 35);
    }
  },
  meta: { name: 'emerald-wave' }
})`
  },
  {
    name: 'Copper Glow',
    gradient: 'linear-gradient(135deg, #331a00, #cc6600, #ffaa33, #331a00)',
    code: `({
  render(ctx) {
    for (let i = 0; i < ctx.count; i++) {
      const [u, v] = ctx.uv(i);
      const n = ctx.noise(u * 3, v * 3, ctx.t * 0.4);
      const h = 25 + n * 15;
      const b = 30 + n * 60 + Math.sin(ctx.t + i * 0.1) * 10;
      ctx.set(i, h, 90, Math.min(100, b));
    }
  },
  meta: { name: 'copper-glow' }
})`
  },
  {
    name: 'Breathing Blue',
    gradient: 'radial-gradient(circle, #0066ff, #003399, #001a4d)',
    code: `({
  render(ctx) {
    const breath = Math.sin(ctx.t * 0.8) * 0.4 + 0.6;
    for (let i = 0; i < ctx.count; i++) {
      const [r] = ctx.polar(i);
      const fade = Math.max(0, 1 - r * 1.5);
      ctx.set(i, 220, 90, fade * breath * 100);
    }
  },
  meta: { name: 'breathing-blue' }
})`
  },
  {
    name: 'Confetti',
    gradient: 'linear-gradient(135deg, #ff0066, #ffcc00, #00ccff, #66ff00)',
    code: `({
  render(ctx) {
    for (let i = 0; i < ctx.count; i++) {
      const seed = i * 137.508;
      const t = ctx.t * 2 + seed;
      const flash = Math.sin(t) * Math.sin(t * 1.7) * Math.sin(t * 2.3);
      const on = flash > 0.6;
      const h = (seed * 57.29) % 360;
      ctx.set(i, h, on ? 90 : 0, on ? 90 : 5);
    }
  },
  meta: { name: 'confetti' }
})`
  },
  {
    name: 'Toxic',
    gradient: 'linear-gradient(135deg, #001a00, #33ff00, #99ff00, #001a00)',
    code: `({
  render(ctx) {
    for (let i = 0; i < ctx.count; i++) {
      const [u, v] = ctx.uv(i);
      const bubble = ctx.noise(u * 4, v * 4 - ctx.t * 0.5, ctx.t * 0.3);
      const drip = Math.sin(v * 8 + ctx.t * 3 + u * 5) * 0.5 + 0.5;
      const h = 90 + bubble * 40;
      ctx.set(i, h, 100, (bubble * 0.6 + drip * 0.4) * 100);
    }
  },
  meta: { name: 'toxic' }
})`
  },
  {
    name: 'Blood Moon',
    gradient: 'radial-gradient(circle, #cc0000, #660000, #1a0000)',
    code: `({
  render(ctx) {
    for (let i = 0; i < ctx.count; i++) {
      const [r, theta] = ctx.polar(i);
      const moon = Math.max(0, 1 - r * 2.5);
      const haze = ctx.noise(theta * 3, r * 2, ctx.t * 0.3) * 0.4;
      const h = 0 + haze * 20;
      ctx.set(i, h, 90, (moon + haze * 0.5) * 100);
    }
  },
  meta: { name: 'blood-moon' }
})`
  },
  {
    name: 'Diamonds',
    gradient: 'linear-gradient(45deg, #222, #aaa, #fff, #aaa, #222)',
    code: `({
  render(ctx) {
    for (let i = 0; i < ctx.count; i++) {
      const [x, y] = ctx.xy(i);
      const cx = x - ctx.cols / 2 + 0.5;
      const cy = y - ctx.rows / 2 + 0.5;
      const d = (Math.abs(cx) + Math.abs(cy)) * 2;
      const ring = Math.sin(d - ctx.t * 3) * 0.5 + 0.5;
      ctx.set(i, 200 + ring * 60, 20, ring * 90);
    }
  },
  meta: { name: 'diamonds' }
})`
  },
  {
    name: 'Magma Flow',
    gradient: 'linear-gradient(180deg, #1a0000, #cc2200, #ff6600, #ffcc00)',
    code: `({
  render(ctx) {
    for (let i = 0; i < ctx.count; i++) {
      const [u, v] = ctx.uv(i);
      const flow = ctx.noise(u * 2, v * 2 - ctx.t * 0.4, ctx.t * 0.2);
      const heat = 1 - v + flow * 0.4;
      const h = heat > 0.7 ? 40 : heat > 0.4 ? 15 : 0;
      ctx.set(i, h, 100, Math.min(100, heat * 100));
    }
  },
  meta: { name: 'magma-flow' }
})`
  },
  {
    name: 'Lavender Dream',
    gradient: 'linear-gradient(135deg, #e6ccff, #9966cc, #4d0099, #e6ccff)',
    code: `({
  render(ctx) {
    for (let i = 0; i < ctx.count; i++) {
      const [u, v] = ctx.uv(i);
      const drift = Math.sin(u * 3 + ctx.t * 0.5) * Math.cos(v * 2 + ctx.t * 0.3);
      const n = ctx.noise(u * 2, v * 2, ctx.t * 0.2);
      const h = 270 + drift * 20 + n * 15;
      ctx.set(i, h, 50 + n * 30, 40 + drift * 30 + 30);
    }
  },
  meta: { name: 'lavender-dream' }
})`
  },
  {
    name: 'Solar Flare',
    gradient: 'radial-gradient(circle, #ffff00, #ff8800, #ff0000, #330000)',
    code: `({
  render(ctx) {
    for (let i = 0; i < ctx.count; i++) {
      const [r, theta] = ctx.polar(i);
      const flare = ctx.noise(theta * 4, ctx.t * 3, r * 2);
      const burst = Math.max(0, flare - 0.3) / 0.7;
      const h = 30 + burst * 30;
      const base = Math.max(0, 1 - r * 2);
      ctx.set(i, h, 100, (base + burst * 0.8) * 100);
    }
  },
  meta: { name: 'solar-flare' }
})`
  },
  {
    name: 'Tidal Pool',
    gradient: 'linear-gradient(135deg, #004466, #00aacc, #66dddd, #004466)',
    code: `({
  render(ctx) {
    for (let i = 0; i < ctx.count; i++) {
      const [u, v] = ctx.uv(i);
      const ripple1 = Math.sin(Math.sqrt((u-0.3)*(u-0.3)+(v-0.4)*(v-0.4)) * 15 - ctx.t * 3);
      const ripple2 = Math.sin(Math.sqrt((u-0.7)*(u-0.7)+(v-0.6)*(v-0.6)) * 12 - ctx.t * 2.5);
      const combined = (ripple1 + ripple2) * 0.5;
      ctx.set(i, 180 + combined * 30, 70, 40 + combined * 40);
    }
  },
  meta: { name: 'tidal-pool' }
})`
  },
  {
    name: 'Campfire',
    gradient: 'linear-gradient(180deg, #1a0500, #cc3300, #ff8800, #ffdd00)',
    code: `({
  render(ctx) {
    for (let i = 0; i < ctx.count; i++) {
      const [u, v] = ctx.uv(i);
      const heat = (1 - v) * (0.7 + ctx.noise(u * 5, ctx.t * 4, 0) * 0.3);
      const flicker = ctx.noise(u * 8, v * 3, ctx.t * 6) * 0.3;
      const intensity = heat + flicker;
      const h = intensity > 0.8 ? 45 : intensity > 0.5 ? 25 : 5;
      ctx.set(i, h, 100, Math.min(100, intensity * 100));
    }
  },
  meta: { name: 'campfire' }
})`
  },
  {
    name: 'Warp Speed',
    gradient: 'radial-gradient(circle, #ffffff, #4444ff, #000033)',
    code: `({
  render(ctx) {
    for (let i = 0; i < ctx.count; i++) {
      const [r, theta] = ctx.polar(i);
      const streak = Math.sin(theta * 20 + r * 3 - ctx.t * 8);
      const b = streak > 0.85 ? 100 : streak > 0.7 ? 40 : 2;
      const s = b > 50 ? 10 : 60;
      ctx.set(i, 230, s, b);
    }
  },
  meta: { name: 'warp-speed' }
})`
  },
  {
    name: 'Peppermint',
    gradient: 'conic-gradient(from 0deg, #ff0000, #ffffff, #ff0000, #ffffff, #ff0000)',
    code: `({
  render(ctx) {
    for (let i = 0; i < ctx.count; i++) {
      const [r, theta] = ctx.polar(i);
      const stripe = Math.sin(theta * 5 + r * 3 - ctx.t * 1.5) > 0;
      ctx.set(i, stripe ? 0 : 0, stripe ? 100 : 0, stripe ? 80 : 95);
    }
  },
  meta: { name: 'peppermint' }
})`
  },
  {
    name: 'Northern Lights',
    gradient: 'linear-gradient(180deg, #000022, #00aa44, #00ddaa, #aa00ff)',
    code: `({
  render(ctx) {
    for (let i = 0; i < ctx.count; i++) {
      const [u, v] = ctx.uv(i);
      const curtain = ctx.noise(u * 1.5, ctx.t * 0.3, 0) * 2;
      const shimmer = ctx.noise(u * 6, v * 2 + ctx.t * 0.5, ctx.t * 1.5);
      const visible = Math.abs(v - 0.3 - curtain * 0.2) < 0.25;
      const h = 140 + shimmer * 100;
      ctx.set(i, h, 80, visible ? shimmer * 90 : 2);
    }
  },
  meta: { name: 'northern-lights' }
})`
  },
  {
    name: 'Glitch',
    gradient: 'linear-gradient(90deg, #ff0000, #000000, #00ff00, #000000, #0000ff)',
    code: `({
  render(ctx) {
    for (let i = 0; i < ctx.count; i++) {
      const [x, y] = ctx.xy(i);
      const glitchY = Math.floor(ctx.noise(0, y * 0.5, Math.floor(ctx.t * 8)) * 3);
      const offset = glitchY > 1 ? Math.sin(ctx.t * 50 + x) * 3 : 0;
      const band = (y + offset + ctx.t * 2) % 3;
      const h = band < 1 ? 0 : band < 2 ? 120 : 240;
      const flicker = ctx.noise(x, y, ctx.t * 12) > 0.4 ? 1 : 0.2;
      ctx.set(i, h, 100, flicker * 80);
    }
  },
  meta: { name: 'glitch' }
})`
  },
  {
    name: 'Golden Hour',
    gradient: 'linear-gradient(135deg, #cc8800, #ffcc44, #ffee88, #cc8800)',
    code: `({
  render(ctx) {
    for (let i = 0; i < ctx.count; i++) {
      const [u, v] = ctx.uv(i);
      const glow = Math.sin(u * 2 + ctx.t * 0.4) * 0.3 + 0.7;
      const n = ctx.noise(u * 3, v * 3, ctx.t * 0.3);
      const h = 38 + n * 15;
      ctx.set(i, h, 80, glow * (60 + n * 40));
    }
  },
  meta: { name: 'golden-hour' }
})`
  },
  {
    name: 'Cyberpunk',
    gradient: 'linear-gradient(135deg, #ff00ff, #0a0a2a, #00ffff, #0a0a2a)',
    code: `({
  render(ctx) {
    for (let i = 0; i < ctx.count; i++) {
      const [u, v] = ctx.uv(i);
      const line = Math.sin(v * 20 - ctx.t * 4) > 0.8 ? 1 : 0;
      const scan = Math.sin(v * 40 + ctx.t * 10) > 0.95 ? 0.5 : 0;
      const hue = u > 0.5 ? 300 : 180;
      const n = ctx.noise(u * 5, v * 2, ctx.t);
      ctx.set(i, hue + n * 20, 100, (line + scan + n * 0.2) * 100);
    }
  },
  meta: { name: 'cyberpunk' }
})`
  },
  {
    name: 'Zen Garden',
    gradient: 'linear-gradient(135deg, #2a3a2a, #5a7a5a, #8aaa8a, #2a3a2a)',
    code: `({
  render(ctx) {
    for (let i = 0; i < ctx.count; i++) {
      const [u, v] = ctx.uv(i);
      const ripple = Math.sin(u * 12 + Math.sin(v * 4 + ctx.t * 0.3) * 2);
      const h = 130 + ripple * 15;
      const b = 20 + (ripple + 1) * 20;
      ctx.set(i, h, 30, b);
    }
  },
  meta: { name: 'zen-garden' }
})`
  },
  {
    name: 'Volcano',
    gradient: 'linear-gradient(180deg, #000000, #330000, #ff3300, #ffaa00)',
    code: `({
  render(ctx) {
    for (let i = 0; i < ctx.count; i++) {
      const [r, theta] = ctx.polar(i);
      const eruption = ctx.noise(theta * 3, ctx.t * 2, 0);
      const lava = Math.max(0, eruption - 0.4) / 0.6;
      const core = Math.max(0, 1 - r * 3);
      const h = core > 0.5 ? 30 : 5;
      ctx.set(i, h, 100, (core * 0.6 + lava * 0.8) * 100);
    }
  },
  meta: { name: 'volcano' }
})`
  },
  {
    name: 'Electric Storm',
    gradient: 'linear-gradient(135deg, #1a0033, #6600cc, #cc00ff, #1a0033)',
    code: `({
  render(ctx) {
    for (let i = 0; i < ctx.count; i++) {
      const [u, v] = ctx.uv(i);
      const zap = ctx.noise(u * 3, v * 3, ctx.t * 5);
      const bolt = zap > 0.8 ? Math.pow((zap - 0.8) / 0.2, 2) : 0;
      const ambient = ctx.noise(u * 2, v * 2, ctx.t * 0.3) * 30;
      ctx.set(i, 280 + bolt * 40, 80, ambient + bolt * 100);
    }
  },
  meta: { name: 'electric-storm' }
})`
  },

  // ── Static / Solid patterns ─────────────────────────────────────────
  {
    name: 'Solid Crimson',
    gradient: 'linear-gradient(135deg, #dc143c, #b01030)',
    code: `({ render(ctx) { ctx.fill(348, 90, 86); }, meta: { name: 'solid-crimson' } })`
  },
  {
    name: 'Solid Teal',
    gradient: 'linear-gradient(135deg, #008080, #006666)',
    code: `({ render(ctx) { ctx.fill(180, 100, 50); }, meta: { name: 'solid-teal' } })`
  },
  {
    name: 'Solid Gold',
    gradient: 'linear-gradient(135deg, #ffd700, #ccac00)',
    code: `({ render(ctx) { ctx.fill(51, 100, 100); }, meta: { name: 'solid-gold' } })`
  },
  {
    name: 'Solid Violet',
    gradient: 'linear-gradient(135deg, #8b00ff, #6a00cc)',
    code: `({ render(ctx) { ctx.fill(271, 100, 100); }, meta: { name: 'solid-violet' } })`
  },
  {
    name: 'Solid Coral',
    gradient: 'linear-gradient(135deg, #ff7f50, #cc6640)',
    code: `({ render(ctx) { ctx.fill(16, 69, 100); }, meta: { name: 'solid-coral' } })`
  },
  {
    name: 'Solid Lime',
    gradient: 'linear-gradient(135deg, #32cd32, #28a428)',
    code: `({ render(ctx) { ctx.fill(120, 76, 80); }, meta: { name: 'solid-lime' } })`
  },
  {
    name: 'Solid Indigo',
    gradient: 'linear-gradient(135deg, #4b0082, #3a0066)',
    code: `({ render(ctx) { ctx.fill(275, 100, 51); }, meta: { name: 'solid-indigo' } })`
  },
  {
    name: 'Solid Cyan',
    gradient: 'linear-gradient(135deg, #00ffff, #00cccc)',
    code: `({ render(ctx) { ctx.fill(180, 100, 100); }, meta: { name: 'solid-cyan' } })`
  },
  {
    name: 'Solid Amber',
    gradient: 'linear-gradient(135deg, #ffbf00, #cc9900)',
    code: `({ render(ctx) { ctx.fill(45, 100, 100); }, meta: { name: 'solid-amber' } })`
  },
  {
    name: 'Solid Hot Pink',
    gradient: 'linear-gradient(135deg, #ff69b4, #cc5490)',
    code: `({ render(ctx) { ctx.fill(330, 59, 100); }, meta: { name: 'solid-hot-pink' } })`
  },
  {
    name: 'Warm White',
    gradient: 'linear-gradient(135deg, #fff5e0, #ffe8c0)',
    code: `({ render(ctx) { ctx.fill(38, 12, 100); }, meta: { name: 'warm-white' } })`
  },
  {
    name: 'Cool White',
    gradient: 'linear-gradient(135deg, #e0f0ff, #c0e0ff)',
    code: `({ render(ctx) { ctx.fill(210, 12, 100); }, meta: { name: 'cool-white' } })`
  },

  // ── Static layouts ──────────────────────────────────────────────────
  {
    name: 'Half & Half',
    gradient: 'linear-gradient(90deg, #ff0066 50%, #0066ff 50%)',
    code: `({
  render(ctx) {
    for (let i = 0; i < ctx.count; i++) {
      const [u] = ctx.uv(i);
      if (u < 0.5) ctx.set(i, 340, 100, 90);
      else ctx.set(i, 220, 100, 80);
    }
  },
  meta: { name: 'half-half' }
})`
  },
  {
    name: 'Quadrants',
    gradient: 'conic-gradient(#ff0000 25%, #00ff00 25% 50%, #0000ff 50% 75%, #ffff00 75%)',
    code: `({
  render(ctx) {
    for (let i = 0; i < ctx.count; i++) {
      const [u, v] = ctx.uv(i);
      if (u < 0.5 && v < 0.5) ctx.set(i, 0, 100, 90);
      else if (u >= 0.5 && v < 0.5) ctx.set(i, 120, 100, 80);
      else if (u < 0.5 && v >= 0.5) ctx.set(i, 240, 100, 80);
      else ctx.set(i, 60, 100, 90);
    }
  },
  meta: { name: 'quadrants' }
})`
  },
  {
    name: 'Bullseye',
    gradient: 'radial-gradient(circle, #ff0000 20%, #ffffff 20% 40%, #0000ff 40% 60%, #ffffff 60% 80%, #ff0000 80%)',
    code: `({
  render(ctx) {
    for (let i = 0; i < ctx.count; i++) {
      const [r] = ctx.polar(i);
      const ring = Math.floor(r * 5);
      if (ring % 2 === 0) ctx.set(i, 0, 100, 90);
      else ctx.set(i, 220, 100, 80);
    }
  },
  meta: { name: 'bullseye' }
})`
  },
  {
    name: 'Stripes H',
    gradient: 'linear-gradient(180deg, #ff4400 25%, #000000 25% 50%, #ff4400 50% 75%, #000000 75%)',
    code: `({
  render(ctx) {
    for (let i = 0; i < ctx.count; i++) {
      const [, y] = ctx.xy(i);
      ctx.set(i, 15, y % 2 === 0 ? 100 : 0, y % 2 === 0 ? 90 : 10);
    }
  },
  meta: { name: 'stripes-h' }
})`
  },
  {
    name: 'Stripes V',
    gradient: 'linear-gradient(90deg, #00cc88 25%, #003322 25% 50%, #00cc88 50% 75%, #003322 75%)',
    code: `({
  render(ctx) {
    for (let i = 0; i < ctx.count; i++) {
      const [x] = ctx.xy(i);
      ctx.set(i, 160, x % 2 === 0 ? 100 : 0, x % 2 === 0 ? 80 : 10);
    }
  },
  meta: { name: 'stripes-v' }
})`
  },
  {
    name: 'Border',
    gradient: 'linear-gradient(135deg, #ff8800, #000000 30% 70%, #ff8800)',
    code: `({
  render(ctx) {
    for (let i = 0; i < ctx.count; i++) {
      const [x, y] = ctx.xy(i);
      const edge = x === 0 || x === ctx.cols - 1 || y === 0 || y === ctx.rows - 1;
      ctx.set(i, 30, edge ? 100 : 0, edge ? 100 : 5);
    }
  },
  meta: { name: 'border' }
})`
  },
  {
    name: 'X Marks',
    gradient: 'linear-gradient(45deg, #ff0000, #000000, #ff0000)',
    code: `({
  render(ctx) {
    var mid = (ctx.cols - 1) / 2;
    for (let i = 0; i < ctx.count; i++) {
      const [x, y] = ctx.xy(i);
      var d1 = Math.abs(x - y);
      var d2 = Math.abs(x - (ctx.rows - 1 - y));
      var onX = Math.min(d1, d2) <= 0;
      ctx.set(i, 0, onX ? 100 : 0, onX ? 100 : 5);
    }
  },
  meta: { name: 'x-marks' }
})`
  },
  {
    name: 'Gradient Warm',
    gradient: 'linear-gradient(135deg, #ff0000, #ff8800, #ffff00)',
    code: `({
  render(ctx) {
    for (let i = 0; i < ctx.count; i++) {
      const [u, v] = ctx.uv(i);
      var d = (u + v) / 2;
      ctx.set(i, d * 60, 100, 80 + d * 20);
    }
  },
  meta: { name: 'gradient-warm' }
})`
  },
  {
    name: 'Gradient Cool',
    gradient: 'linear-gradient(135deg, #0000ff, #00aaff, #00ffcc)',
    code: `({
  render(ctx) {
    for (let i = 0; i < ctx.count; i++) {
      const [u, v] = ctx.uv(i);
      var d = (u + v) / 2;
      ctx.set(i, 180 + d * 60, 80, 50 + d * 50);
    }
  },
  meta: { name: 'gradient-cool' }
})`
  },
  {
    name: 'Corners',
    gradient: 'conic-gradient(#ff0000, #00ff00, #0000ff, #ffff00, #ff0000)',
    code: `({
  render(ctx) {
    for (let i = 0; i < ctx.count; i++) {
      const [u, v] = ctx.uv(i);
      var h = (u * 180 + v * 180) % 360;
      ctx.set(i, h, 80, 80);
    }
  },
  meta: { name: 'corners' }
})`
  },

  // ── Animated patterns ───────────────────────────────────────────────
  {
    name: 'Jellyfish',
    gradient: 'linear-gradient(180deg, #1a0033, #6600cc, #cc66ff)',
    code: `({
  render(ctx) {
    for (let i = 0; i < ctx.count; i++) {
      const [u, v] = ctx.uv(i);
      var tentacle = Math.sin(u * 8 + ctx.t * 2 + Math.sin(v * 3) * 2);
      var body = Math.max(0, 1 - Math.sqrt((u - 0.5) * (u - 0.5) + (v - 0.3) * (v - 0.3)) * 3);
      var pulse = Math.sin(ctx.t * 1.5) * 0.2 + 0.8;
      var h = 280 + tentacle * 20;
      ctx.set(i, h, 70, (body * pulse + Math.max(0, tentacle) * v * 0.5) * 100);
    }
  },
  meta: { name: 'jellyfish' }
})`
  },
  {
    name: 'Sandstorm',
    gradient: 'linear-gradient(90deg, #cc9933, #ffcc66, #996622)',
    code: `({
  render(ctx) {
    for (let i = 0; i < ctx.count; i++) {
      const [u, v] = ctx.uv(i);
      var n1 = ctx.noise(u * 6 + ctx.t * 3, v * 2, ctx.t);
      var n2 = ctx.noise(u * 3 - ctx.t * 2, v * 4, ctx.t * 0.5);
      var h = 35 + n1 * 15;
      ctx.set(i, h, 70 + n2 * 20, 30 + (n1 + n2) * 35);
    }
  },
  meta: { name: 'sandstorm' }
})`
  },
  {
    name: 'Pixel Rain',
    gradient: 'linear-gradient(180deg, #000000, #00ff88, #000000)',
    code: `({
  render(ctx) {
    for (let i = 0; i < ctx.count; i++) {
      const [x, y] = ctx.xy(i);
      var drop = (ctx.t * 4 + x * 2.7 + Math.sin(x * 1.3) * 3) % (ctx.rows + 3);
      var dist = y - drop;
      if (dist >= 0 && dist < 3) {
        var fade = 1 - dist / 3;
        ctx.set(i, 150, 100, fade * 100);
      } else {
        ctx.set(i, 150, 100, 3);
      }
    }
  },
  meta: { name: 'pixel-rain' }
})`
  },
  {
    name: 'Pendulum',
    gradient: 'linear-gradient(90deg, #440088, #ff8800, #440088)',
    code: `({
  render(ctx) {
    var swing = Math.sin(ctx.t * 1.5) * 0.4 + 0.5;
    for (let i = 0; i < ctx.count; i++) {
      const [u, v] = ctx.uv(i);
      var dist = Math.abs(u - swing);
      var bright = Math.max(0, 1 - dist * 4) * (1 - v * 0.5);
      ctx.set(i, 30 + dist * 200, 90, bright * 100);
    }
  },
  meta: { name: 'pendulum' }
})`
  },
  {
    name: 'Kaleidoscope',
    gradient: 'conic-gradient(#ff0088, #00ff88, #0088ff, #ff8800, #ff0088)',
    code: `({
  render(ctx) {
    for (let i = 0; i < ctx.count; i++) {
      const [r, theta] = ctx.polar(i);
      var angle = ((theta + Math.PI) / (Math.PI * 2) * 6) % 1;
      var mirror = angle > 0.5 ? 1 - angle : angle;
      var h = (mirror * 720 + ctx.t * 40) % 360;
      var b = 50 + Math.sin(r * 4 - ctx.t * 2) * 40;
      ctx.set(i, h, 80, Math.max(10, b));
    }
  },
  meta: { name: 'kaleidoscope' }
})`
  },
  {
    name: 'Waterfall',
    gradient: 'linear-gradient(180deg, #003366, #0088cc, #66ccff, #ffffff)',
    code: `({
  render(ctx) {
    for (let i = 0; i < ctx.count; i++) {
      const [u, v] = ctx.uv(i);
      var fall = (v + ctx.t * 0.8 + Math.sin(u * 5) * 0.1) % 1;
      var foam = ctx.noise(u * 8, v * 4, ctx.t * 3) > 0.7 ? 0.8 : 0;
      var h = 200 - fall * 20;
      ctx.set(i, h, 60 - foam * 50, (fall * 0.7 + foam) * 100);
    }
  },
  meta: { name: 'waterfall' }
})`
  },
  {
    name: 'Morse',
    gradient: 'linear-gradient(90deg, #000000, #ffffff, #000000, #ffffff)',
    code: `({
  render(ctx) {
    var pattern = [1,0,1,0,0,1,1,1,0,1,0,0,1,1,1,0,0,0];
    var idx = Math.floor(ctx.t * 4) % pattern.length;
    var on = pattern[idx];
    for (let i = 0; i < ctx.count; i++) {
      ctx.set(i, 0, 0, on ? 100 : 5);
    }
  },
  meta: { name: 'morse' }
})`
  },
  {
    name: 'Breathing',
    gradient: 'radial-gradient(circle, #ff4400 30%, #220500)',
    code: `({
  render(ctx) {
    var breath = (Math.sin(ctx.t * 0.6) + 1) / 2;
    var h = 15 + breath * 15;
    for (let i = 0; i < ctx.count; i++) {
      const [r] = ctx.polar(i);
      var fade = Math.max(0, 1 - r * (1.5 - breath * 0.5));
      ctx.set(i, h, 100, fade * breath * 100);
    }
  },
  meta: { name: 'breathing' }
})`
  },
  {
    name: 'Tetris',
    gradient: 'linear-gradient(180deg, #000000, #00cc00, #cc0000, #0000cc)',
    code: `({
  render(ctx) {
    for (let i = 0; i < ctx.count; i++) {
      const [x, y] = ctx.xy(i);
      var block = Math.floor(ctx.t * 3 + x * 0.7) % 4;
      var fall = (y + ctx.t * 2 + x * 1.3) % (ctx.rows + 2);
      var show = fall < ctx.rows;
      var hues = [0, 120, 240, 60];
      ctx.set(i, hues[block], show ? 100 : 0, show ? 70 + Math.sin(ctx.t + i) * 20 : 5);
    }
  },
  meta: { name: 'tetris' }
})`
  },
  {
    name: 'Disco',
    gradient: 'conic-gradient(#ff0000, #ffff00, #00ff00, #00ffff, #0000ff, #ff00ff, #ff0000)',
    code: `({
  render(ctx) {
    for (let i = 0; i < ctx.count; i++) {
      const [x, y] = ctx.xy(i);
      var beat = Math.floor(ctx.t * 8);
      var cell = (x * 7 + y * 13 + beat * 31) % 49;
      var on = cell < 8;
      var h = (beat * 47 + x * 60 + y * 90) % 360;
      ctx.set(i, h, on ? 100 : 30, on ? 100 : 8);
    }
  },
  meta: { name: 'disco' }
})`
  },
  {
    name: 'Metronome',
    gradient: 'linear-gradient(90deg, #000000, #ffffff, #000000)',
    code: `({
  render(ctx) {
    var pos = (Math.sin(ctx.t * 2) + 1) / 2;
    for (let i = 0; i < ctx.count; i++) {
      const [u] = ctx.uv(i);
      var dist = Math.abs(u - pos);
      var bright = Math.max(0, 1 - dist * 6);
      ctx.set(i, 0, 0, bright * 100);
    }
  },
  meta: { name: 'metronome' }
})`
  },
  {
    name: 'Supernova',
    gradient: 'radial-gradient(circle, #ffffff, #ff8800, #ff0000, #000000)',
    code: `({
  render(ctx) {
    var expand = (ctx.t * 0.5) % 3;
    for (let i = 0; i < ctx.count; i++) {
      const [r] = ctx.polar(i);
      var edge = Math.abs(r - expand * 0.5);
      if (edge < 0.15) {
        ctx.set(i, 30, 50, (1 - edge / 0.15) * 100);
      } else if (r < expand * 0.5) {
        ctx.set(i, 15, 100, Math.max(5, 60 - r * 80));
      } else {
        ctx.set(i, 0, 0, 3);
      }
    }
  },
  meta: { name: 'supernova' }
})`
  },
  {
    name: 'Wave Clash',
    gradient: 'linear-gradient(90deg, #ff0000, #000000, #0000ff)',
    code: `({
  render(ctx) {
    for (let i = 0; i < ctx.count; i++) {
      const [u, v] = ctx.uv(i);
      var w1 = Math.sin(u * 6 - ctx.t * 3) * 0.5 + 0.5;
      var w2 = Math.sin((1 - u) * 6 - ctx.t * 2.5) * 0.5 + 0.5;
      if (w1 > w2) ctx.set(i, 0, 100, w1 * 90);
      else ctx.set(i, 230, 100, w2 * 90);
    }
  },
  meta: { name: 'wave-clash' }
})`
  },
  {
    name: 'Crossfade',
    gradient: 'linear-gradient(180deg, #ff00ff, #000000, #00ffff)',
    code: `({
  render(ctx) {
    var t = (Math.sin(ctx.t * 0.5) + 1) / 2;
    for (let i = 0; i < ctx.count; i++) {
      const [u, v] = ctx.uv(i);
      var h = t * 180 + (1 - t) * 300;
      var b = 40 + Math.sin(u * 4 + v * 4 + ctx.t) * 30 + 20;
      ctx.set(i, h, 80, b);
    }
  },
  meta: { name: 'crossfade' }
})`
  },
  {
    name: 'Lighthouse',
    gradient: 'conic-gradient(#ffff00 10%, #000000 10% 90%, #ffff00 90%)',
    code: `({
  render(ctx) {
    var sweep = (ctx.t * 1.2) % (Math.PI * 2);
    for (let i = 0; i < ctx.count; i++) {
      const [r, theta] = ctx.polar(i);
      var diff = Math.abs(theta - sweep + Math.PI);
      if (diff > Math.PI) diff = Math.PI * 2 - diff;
      var beam = Math.max(0, 1 - diff * 3) * Math.max(0, 1 - r * 0.5);
      ctx.set(i, 50, beam > 0.3 ? 30 : 0, beam * 100 + 3);
    }
  },
  meta: { name: 'lighthouse' }
})`
  },
  {
    name: 'Prism',
    gradient: 'linear-gradient(45deg, #ff0000, #ff8800, #ffff00, #00ff00, #0088ff, #8800ff)',
    code: `({
  render(ctx) {
    for (let i = 0; i < ctx.count; i++) {
      const [u, v] = ctx.uv(i);
      var refract = Math.sin(u * 3 + ctx.t) * 0.2;
      var h = ((v + refract) * 360 + ctx.t * 20) % 360;
      var b = 50 + Math.sin(u * 6 + ctx.t * 2) * 30 + 20;
      ctx.set(i, h, 90, b);
    }
  },
  meta: { name: 'prism' }
})`
  },
  {
    name: 'Ember Drift',
    gradient: 'linear-gradient(180deg, #000000, #331100, #ff4400)',
    code: `({
  render(ctx) {
    for (let i = 0; i < ctx.count; i++) {
      const [u, v] = ctx.uv(i);
      var rise = (1 - v + ctx.t * 0.5 + Math.sin(u * 7) * 0.1) % 1;
      var flicker = ctx.noise(u * 6, v * 3, ctx.t * 4);
      var ember = rise > 0.8 ? (rise - 0.8) * 5 : 0;
      ctx.set(i, 15 + ember * 20, 100, (ember * 0.7 + flicker * 0.3) * 100);
    }
  },
  meta: { name: 'ember-drift' }
})`
  },
  {
    name: 'Oscillate',
    gradient: 'linear-gradient(90deg, #ff0088, #0088ff)',
    code: `({
  render(ctx) {
    for (let i = 0; i < ctx.count; i++) {
      const [u, v] = ctx.uv(i);
      var osc = Math.sin(v * Math.PI * 4 + ctx.t * 3) * 0.5 + 0.5;
      var h = osc * 220 + (1 - osc) * 330;
      ctx.set(i, h, 90, 40 + osc * 50);
    }
  },
  meta: { name: 'oscillate' }
})`
  },
  {
    name: 'Snowfall',
    gradient: 'linear-gradient(180deg, #1a1a2e, #ffffff, #1a1a2e)',
    code: `({
  render(ctx) {
    for (let i = 0; i < ctx.count; i++) {
      const [x, y] = ctx.xy(i);
      var fall = (y + ctx.t * 2 + Math.sin(x * 2.1 + ctx.t) * 1.5) % (ctx.rows + 2);
      var flake = fall < 1 ? 1 - fall : 0;
      var wind = ctx.noise(x * 0.5, ctx.t * 0.5, 0) * 0.3;
      ctx.set(i, 210, 10, (flake + wind * 0.2) * 100);
    }
  },
  meta: { name: 'snowfall' }
})`
  },
  {
    name: 'Clock',
    gradient: 'conic-gradient(#00ff00, #000000)',
    code: `({
  render(ctx) {
    var cx = (ctx.cols - 1) / 2;
    var cy = (ctx.rows - 1) / 2;
    var hand = (ctx.t * 0.5) % (Math.PI * 2);
    for (let i = 0; i < ctx.count; i++) {
      const [x, y] = ctx.xy(i);
      var angle = Math.atan2(y - cy, x - cx) + Math.PI;
      var diff = angle - hand;
      if (diff < 0) diff += Math.PI * 2;
      var sweep = diff < 0.3 ? 1 - diff / 0.3 : 0;
      var r = Math.sqrt((x - cx) * (x - cx) + (y - cy) * (y - cy)) / cx;
      ctx.set(i, 120, 100, sweep * (1 - r * 0.3) * 100);
    }
  },
  meta: { name: 'clock' }
})`
  },
  {
    name: 'Static TV',
    gradient: 'linear-gradient(135deg, #333333, #888888, #333333)',
    code: `({
  render(ctx) {
    for (let i = 0; i < ctx.count; i++) {
      const [x, y] = ctx.xy(i);
      var n = ctx.noise(x * 10, y * 10, ctx.t * 20);
      ctx.set(i, 0, 0, n * 80);
    }
  },
  meta: { name: 'static-tv' }
})`
  },
  {
    name: 'Orbit',
    gradient: 'radial-gradient(circle at 30% 30%, #ffff00, #000033)',
    code: `({
  render(ctx) {
    var cx = (ctx.cols - 1) / 2;
    var cy = (ctx.rows - 1) / 2;
    var a1 = ctx.t * 1.5;
    var a2 = ctx.t * 1.5 + Math.PI * 2 / 3;
    var a3 = ctx.t * 1.5 + Math.PI * 4 / 3;
    var planets = [
      [cx + Math.cos(a1) * cx * 0.7, cy + Math.sin(a1) * cy * 0.7, 0],
      [cx + Math.cos(a2) * cx * 0.5, cy + Math.sin(a2) * cy * 0.5, 120],
      [cx + Math.cos(a3) * cx * 0.6, cy + Math.sin(a3) * cy * 0.6, 240]
    ];
    for (let i = 0; i < ctx.count; i++) {
      const [x, y] = ctx.xy(i);
      var best = 999; var bestH = 0;
      for (var p = 0; p < 3; p++) {
        var d = Math.sqrt((x - planets[p][0]) * (x - planets[p][0]) + (y - planets[p][1]) * (y - planets[p][1]));
        if (d < best) { best = d; bestH = planets[p][2]; }
      }
      ctx.set(i, bestH, best < 1 ? 50 : 80, Math.max(5, (1 - best * 0.3) * 80));
    }
  },
  meta: { name: 'orbit' }
})`
  },
  {
    name: 'Tide',
    gradient: 'linear-gradient(180deg, #001133, #0066aa, #00aacc, #88dddd)',
    code: `({
  render(ctx) {
    for (let i = 0; i < ctx.count; i++) {
      const [u, v] = ctx.uv(i);
      var waterLevel = 0.5 + Math.sin(ctx.t * 0.8) * 0.25 + Math.sin(u * 4 + ctx.t * 2) * 0.05;
      if (v > waterLevel) {
        var depth = (v - waterLevel) * 3;
        ctx.set(i, 200 + depth * 20, 70, 50 - depth * 20);
      } else {
        ctx.set(i, 210, 20, 10);
      }
    }
  },
  meta: { name: 'tide' }
})`
  },
  {
    name: 'Neon Pulse',
    gradient: 'linear-gradient(135deg, #ff00ff, #000000, #00ffff)',
    code: `({
  render(ctx) {
    var beat = Math.pow(Math.sin(ctx.t * 4) * 0.5 + 0.5, 4);
    for (let i = 0; i < ctx.count; i++) {
      const [u, v] = ctx.uv(i);
      var line1 = Math.abs(v - 0.5) < 0.08 ? 1 : 0;
      var line2 = Math.abs(u - 0.5) < 0.08 ? 1 : 0;
      var glow = (line1 + line2) * beat;
      var h = line1 > line2 ? 300 : 180;
      ctx.set(i, h, 100, glow * 100 + 5);
    }
  },
  meta: { name: 'neon-pulse' }
})`
  },
  {
    name: 'Dragonfire',
    gradient: 'linear-gradient(45deg, #ff0000, #ff8800, #ffff00, #ff0000)',
    code: `({
  render(ctx) {
    for (let i = 0; i < ctx.count; i++) {
      const [u, v] = ctx.uv(i);
      var breath = Math.max(0, Math.sin(ctx.t * 1.5) * 1.2);
      var flame = ctx.noise(u * 4, v * 3 - ctx.t * 3, ctx.t);
      var reach = (1 - u) * breath;
      var intensity = reach * (0.5 + flame * 0.5);
      var h = intensity > 0.6 ? 50 : intensity > 0.3 ? 25 : 5;
      ctx.set(i, h, 100, Math.min(100, intensity * 120));
    }
  },
  meta: { name: 'dragonfire' }
})`
  },
  {
    name: 'Heartbeat RGB',
    gradient: 'linear-gradient(90deg, #ff0000, #00ff00, #0000ff)',
    code: `({
  render(ctx) {
    var beat = Math.pow(Math.sin(ctx.t * 3.14) * 0.5 + 0.5, 6);
    var hue = (ctx.t * 40) % 360;
    for (let i = 0; i < ctx.count; i++) {
      const [r] = ctx.polar(i);
      var ring = Math.max(0, 1 - r * (2 - beat));
      ctx.set(i, hue + r * 60, 90, ring * 100);
    }
  },
  meta: { name: 'heartbeat-rgb' }
})`
  },
  {
    name: 'Sine Bars',
    gradient: 'linear-gradient(90deg, #ff4400, #000000, #4400ff, #000000, #ff4400)',
    code: `({
  render(ctx) {
    for (let i = 0; i < ctx.count; i++) {
      const [x, y] = ctx.xy(i);
      var bar = Math.sin(x * 1.2 + ctx.t * 2) * ctx.rows * 0.4 + ctx.rows / 2;
      var dist = Math.abs(y - bar);
      var bright = Math.max(0, 1 - dist * 0.7);
      var h = (x / ctx.cols * 200 + ctx.t * 30) % 360;
      ctx.set(i, h, 100, bright * 100);
    }
  },
  meta: { name: 'sine-bars' }
})`
  },
  {
    name: 'Morphing Grid',
    gradient: 'linear-gradient(135deg, #0088ff, #000000, #ff8800)',
    code: `({
  render(ctx) {
    for (let i = 0; i < ctx.count; i++) {
      const [u, v] = ctx.uv(i);
      var warpU = u + Math.sin(v * 4 + ctx.t) * 0.15;
      var warpV = v + Math.cos(u * 4 + ctx.t * 1.3) * 0.15;
      var gridU = Math.abs(Math.sin(warpU * Math.PI * 3.5));
      var gridV = Math.abs(Math.sin(warpV * Math.PI * 3.5));
      var grid = Math.max(gridU, gridV);
      var isLine = grid > 0.85;
      var h = (warpU * 200 + ctx.t * 20) % 360;
      ctx.set(i, h, isLine ? 90 : 20, isLine ? 80 : 5);
    }
  },
  meta: { name: 'morphing-grid' }
})`
  },
  {
    name: 'Lollipop',
    gradient: 'conic-gradient(#ff0066, #ff9900, #ffff00, #00ff66, #0099ff, #9900ff, #ff0066)',
    code: `({
  render(ctx) {
    for (let i = 0; i < ctx.count; i++) {
      const [r, theta] = ctx.polar(i);
      var twist = theta + r * 4 - ctx.t * 1.5;
      var h = ((twist / (Math.PI * 2)) * 360 + 360) % 360;
      var b = 60 + Math.sin(r * 6 - ctx.t) * 30;
      ctx.set(i, h, 90, Math.max(10, b));
    }
  },
  meta: { name: 'lollipop' }
})`
  },
  {
    name: 'Firecracker',
    gradient: 'radial-gradient(circle, #ffffff, #ff4400, #000000)',
    code: `({
  render(ctx) {
    var phase = (ctx.t * 0.8) % 3;
    var cx = (ctx.cols - 1) / 2;
    var cy = (ctx.rows - 1) / 2;
    for (let i = 0; i < ctx.count; i++) {
      const [x, y] = ctx.xy(i);
      var dx = x - cx;
      var dy = y - cy;
      var dist = Math.sqrt(dx * dx + dy * dy);
      var angle = Math.atan2(dy, dx);
      var ray = Math.sin(angle * 8 + ctx.t * 5) * 0.5 + 0.5;
      var expand = phase < 1 ? phase : phase < 2 ? 1 : 3 - phase;
      var ring = Math.abs(dist - expand * 3);
      var spark = ring < 0.8 ? (1 - ring / 0.8) * ray : 0;
      ctx.set(i, 20 + spark * 30, spark > 0.3 ? 80 : 100, spark * 100);
    }
  },
  meta: { name: 'firecracker' }
})`
  },
  {
    name: 'Stained Glass',
    gradient: 'linear-gradient(135deg, #cc0000, #00cc00, #0000cc, #cccc00)',
    code: `({
  render(ctx) {
    for (let i = 0; i < ctx.count; i++) {
      const [u, v] = ctx.uv(i);
      var n1 = ctx.noise(u * 3, v * 3, 0);
      var n2 = ctx.noise(u * 3 + 10, v * 3, 0);
      var cell = Math.floor(n1 * 6);
      var edge = Math.abs(n1 - Math.floor(n1 * 6) / 6) < 0.02;
      var h = (cell * 60 + ctx.t * 10) % 360;
      var glow = Math.sin(ctx.t * 2 + cell) * 0.2 + 0.8;
      ctx.set(i, h, edge ? 0 : 80, edge ? 15 : glow * 70);
    }
  },
  meta: { name: 'stained-glass' }
})`
  },
  {
    name: 'Comet Trail',
    gradient: 'linear-gradient(315deg, #ffffff, #0088ff, #000033)',
    code: `({
  render(ctx) {
    var angle = ctx.t * 1.2;
    var cx = (ctx.cols - 1) / 2;
    var cy = (ctx.rows - 1) / 2;
    var hx = cx + Math.cos(angle) * cx * 0.8;
    var hy = cy + Math.sin(angle) * cy * 0.8;
    var px = cx + Math.cos(angle - 0.5) * cx * 0.7;
    var py = cy + Math.sin(angle - 0.5) * cy * 0.7;
    for (let i = 0; i < ctx.count; i++) {
      const [x, y] = ctx.xy(i);
      var dHead = Math.sqrt((x - hx) * (x - hx) + (y - hy) * (y - hy));
      var dTail = Math.sqrt((x - px) * (x - px) + (y - py) * (y - py));
      var head = Math.max(0, 1 - dHead);
      var tail = Math.max(0, 1 - dTail * 0.5) * 0.4;
      ctx.set(i, 210, head > 0.3 ? 30 : 80, (head + tail) * 100);
    }
  },
  meta: { name: 'comet-trail' }
})`
  },
  {
    name: 'Dappled Light',
    gradient: 'linear-gradient(135deg, #336633, #88aa44, #ffee88, #336633)',
    code: `({
  render(ctx) {
    for (let i = 0; i < ctx.count; i++) {
      const [u, v] = ctx.uv(i);
      var leaf = ctx.noise(u * 3 + ctx.t * 0.2, v * 3, ctx.t * 0.1);
      var sun = ctx.noise(u * 5 + ctx.t * 0.5, v * 5 - ctx.t * 0.3, ctx.t * 0.8);
      var dapple = sun > 0.55 ? (sun - 0.55) * 4 : 0;
      var h = 80 + leaf * 40;
      ctx.set(i, h, 60 - dapple * 40, 20 + leaf * 30 + dapple * 50);
    }
  },
  meta: { name: 'dappled-light' }
})`
  },
  {
    name: 'Pac-Man',
    gradient: 'radial-gradient(circle, #ffff00 50%, #000000 50%)',
    code: `({
  render(ctx) {
    var cx = (ctx.cols - 1) / 2;
    var cy = (ctx.rows - 1) / 2;
    var px = (ctx.t * 1.5) % ctx.cols;
    for (let i = 0; i < ctx.count; i++) {
      const [x, y] = ctx.xy(i);
      var dx = x - px;
      var dy = y - cy;
      var dist = Math.sqrt(dx * dx + dy * dy);
      var angle = Math.atan2(dy, dx);
      var mouth = Math.abs(angle) < 0.5 + Math.sin(ctx.t * 8) * 0.3;
      if (dist < 2 && !mouth) {
        ctx.set(i, 55, 100, 100);
      } else {
        var dot = y === Math.floor(cy) && x % 2 === 0 && x > px;
        ctx.set(i, 55, dot ? 100 : 0, dot ? 80 : 3);
      }
    }
  },
  meta: { name: 'pac-man' }
})`
  },
  {
    name: 'Color Wash',
    gradient: 'linear-gradient(180deg, #ff0066, #6600ff, #0066ff, #00ff66)',
    code: `({
  render(ctx) {
    for (let i = 0; i < ctx.count; i++) {
      const [u, v] = ctx.uv(i);
      var h = (v * 240 + ctx.t * 15 + Math.sin(u * 3 + ctx.t) * 30) % 360;
      var b = 50 + Math.sin(u * 2 + v * 2 + ctx.t * 0.5) * 30;
      ctx.set(i, h, 70, Math.max(20, b));
    }
  },
  meta: { name: 'color-wash' }
})`
  },
  {
    name: 'Binary',
    gradient: 'linear-gradient(90deg, #003300, #00ff00, #003300)',
    code: `({
  render(ctx) {
    for (let i = 0; i < ctx.count; i++) {
      const [x, y] = ctx.xy(i);
      var bit = Math.floor(ctx.noise(x * 2, y * 2, Math.floor(ctx.t * 3)) * 2);
      ctx.set(i, 120, 100, bit ? 80 : 8);
    }
  },
  meta: { name: 'binary' }
})`
  },
  {
    name: 'Thermal',
    gradient: 'linear-gradient(180deg, #ff0000, #ffff00, #00ffff, #0000ff)',
    code: `({
  render(ctx) {
    for (let i = 0; i < ctx.count; i++) {
      const [u, v] = ctx.uv(i);
      var heat = ctx.noise(u * 3, v * 3, ctx.t * 0.4);
      var hotspot = Math.max(0, 1 - Math.sqrt((u - 0.5) * (u - 0.5) + (v - 0.5) * (v - 0.5)) * 2);
      var temp = heat * 0.6 + hotspot * 0.4 + Math.sin(ctx.t * 0.5) * 0.1;
      var h = temp > 0.7 ? 0 : temp > 0.5 ? 40 : temp > 0.3 ? 180 : 240;
      ctx.set(i, h, 80, 30 + temp * 70);
    }
  },
  meta: { name: 'thermal' }
})`
  },
  {
    name: 'Bounce',
    gradient: 'radial-gradient(circle, #ff6600, #000000)',
    code: `({
  render(ctx) {
    var bx = (ctx.cols - 1) / 2 + Math.sin(ctx.t * 1.7) * (ctx.cols - 1) * 0.4;
    var by = (ctx.rows - 1) / 2 + Math.cos(ctx.t * 2.3) * (ctx.rows - 1) * 0.4;
    for (let i = 0; i < ctx.count; i++) {
      const [x, y] = ctx.xy(i);
      var d = Math.sqrt((x - bx) * (x - bx) + (y - by) * (y - by));
      var glow = Math.max(0, 1 - d * 0.5);
      ctx.set(i, 25, 100, glow * glow * 100);
    }
  },
  meta: { name: 'bounce' }
})`
  },
  {
    name: 'Wormhole',
    gradient: 'conic-gradient(#000000, #6600ff, #000000, #0066ff, #000000)',
    code: `({
  render(ctx) {
    for (let i = 0; i < ctx.count; i++) {
      const [r, theta] = ctx.polar(i);
      var twist = theta + r * 3 - ctx.t * 2;
      var ring = Math.sin(r * 8 - ctx.t * 4);
      var h = ((twist / Math.PI) * 180 + 270) % 360;
      var b = (ring * 0.5 + 0.5) * Math.max(0, 1 - r * 0.8);
      ctx.set(i, h, 80, b * 100);
    }
  },
  meta: { name: 'wormhole' }
})`
  },
  {
    name: 'Rain on Window',
    gradient: 'linear-gradient(180deg, #1a1a2e, #334455, #1a1a2e)',
    code: `({
  render(ctx) {
    for (let i = 0; i < ctx.count; i++) {
      const [x, y] = ctx.xy(i);
      var streak = (y + ctx.t * 6 + x * 3.7 + Math.sin(x * 2.3) * 2) % (ctx.rows * 2);
      var drop = streak < 1.5 ? (1.5 - streak) / 1.5 : 0;
      var ambient = ctx.noise(x * 0.5, y * 0.5, ctx.t * 0.3) * 0.15;
      ctx.set(i, 210, 30, (drop + ambient) * 100);
    }
  },
  meta: { name: 'rain-window' }
})`
  },
  {
    name: 'Magnet',
    gradient: 'linear-gradient(0deg, #0000ff, #000000, #ff0000)',
    code: `({
  render(ctx) {
    for (let i = 0; i < ctx.count; i++) {
      const [u, v] = ctx.uv(i);
      var field = Math.sin(u * 6 + ctx.t) * Math.cos(v * 6 - ctx.t * 0.7);
      if (field > 0) ctx.set(i, 0, 80, field * 90);
      else ctx.set(i, 230, 80, -field * 90);
    }
  },
  meta: { name: 'magnet' }
})`
  },

  // ── More patterns — different color palettes ────────────────────────
  {
    name: 'Solid Peach',
    gradient: 'linear-gradient(135deg, #ffccaa, #ff9966)',
    code: `({ render(ctx) { ctx.fill(25, 40, 100); }, meta: { name: 'solid-peach' } })`
  },
  {
    name: 'Solid Seafoam',
    gradient: 'linear-gradient(135deg, #66ccbb, #339988)',
    code: `({ render(ctx) { ctx.fill(165, 50, 80); }, meta: { name: 'solid-seafoam' } })`
  },
  {
    name: 'Solid Mauve',
    gradient: 'linear-gradient(135deg, #cc88aa, #aa6688)',
    code: `({ render(ctx) { ctx.fill(330, 35, 80); }, meta: { name: 'solid-mauve' } })`
  },
  {
    name: 'Solid Rust',
    gradient: 'linear-gradient(135deg, #cc4400, #993300)',
    code: `({ render(ctx) { ctx.fill(20, 100, 80); }, meta: { name: 'solid-rust' } })`
  },
  {
    name: 'Solid Mint',
    gradient: 'linear-gradient(135deg, #88ffcc, #44cc88)',
    code: `({ render(ctx) { ctx.fill(150, 50, 100); }, meta: { name: 'solid-mint' } })`
  },
  {
    name: 'Solid Plum',
    gradient: 'linear-gradient(135deg, #880066, #660044)',
    code: `({ render(ctx) { ctx.fill(320, 100, 53); }, meta: { name: 'solid-plum' } })`
  },
  {
    name: 'Solid Sky',
    gradient: 'linear-gradient(135deg, #66bbff, #3399dd)',
    code: `({ render(ctx) { ctx.fill(205, 60, 100); }, meta: { name: 'solid-sky' } })`
  },
  {
    name: 'Solid Tangerine',
    gradient: 'linear-gradient(135deg, #ff8833, #cc6622)',
    code: `({ render(ctx) { ctx.fill(28, 80, 100); }, meta: { name: 'solid-tangerine' } })`
  },
  {
    name: 'Warm Gradient',
    gradient: 'linear-gradient(180deg, #ff3300, #ff9900, #ffcc00)',
    code: `({
  render(ctx) {
    for (let i = 0; i < ctx.count; i++) {
      const [, v] = ctx.uv(i);
      ctx.set(i, v * 50, 100, 90);
    }
  },
  meta: { name: 'warm-gradient' }
})`
  },
  {
    name: 'Ocean Gradient',
    gradient: 'linear-gradient(180deg, #001144, #0066cc, #00cccc)',
    code: `({
  render(ctx) {
    for (let i = 0; i < ctx.count; i++) {
      const [, v] = ctx.uv(i);
      ctx.set(i, 180 + v * 40, 80, 30 + v * 60);
    }
  },
  meta: { name: 'ocean-gradient' }
})`
  },
  {
    name: 'Sunset Gradient',
    gradient: 'linear-gradient(180deg, #330033, #cc3300, #ffaa00)',
    code: `({
  render(ctx) {
    for (let i = 0; i < ctx.count; i++) {
      const [, v] = ctx.uv(i);
      var h = v < 0.4 ? 280 + v * 100 : 30 - (v - 0.4) * 10;
      ctx.set(i, h, 90, 40 + v * 55);
    }
  },
  meta: { name: 'sunset-gradient' }
})`
  },
  {
    name: 'Forest Gradient',
    gradient: 'linear-gradient(180deg, #002200, #006600, #88cc44)',
    code: `({
  render(ctx) {
    for (let i = 0; i < ctx.count; i++) {
      const [, v] = ctx.uv(i);
      ctx.set(i, 100 + v * 30, 80, 20 + v * 60);
    }
  },
  meta: { name: 'forest-gradient' }
})`
  },
  {
    name: 'Cotton Candy',
    gradient: 'linear-gradient(135deg, #ff99cc, #99ccff, #ff99cc)',
    code: `({
  render(ctx) {
    for (let i = 0; i < ctx.count; i++) {
      const [u, v] = ctx.uv(i);
      var blend = Math.sin(u * 4 + v * 3 + ctx.t * 0.8) * 0.5 + 0.5;
      ctx.set(i, blend * 120 + 240, 40, 80 + blend * 15);
    }
  },
  meta: { name: 'cotton-candy' }
})`
  },
  {
    name: 'Tropical Storm',
    gradient: 'linear-gradient(135deg, #ff6600, #00cc66, #0066ff)',
    code: `({
  render(ctx) {
    for (let i = 0; i < ctx.count; i++) {
      const [r, theta] = ctx.polar(i);
      var swirl = Math.sin(theta * 3 + r * 5 - ctx.t * 3);
      var h = swirl > 0 ? 25 + swirl * 20 : 160 + swirl * 40;
      var b = 40 + Math.abs(swirl) * 55;
      ctx.set(i, (h + 360) % 360, 90, b);
    }
  },
  meta: { name: 'tropical-storm' }
})`
  },
  {
    name: 'Cherry Blossom',
    gradient: 'linear-gradient(135deg, #ffccdd, #ff6699, #cc3366)',
    code: `({
  render(ctx) {
    for (let i = 0; i < ctx.count; i++) {
      const [u, v] = ctx.uv(i);
      var petal = ctx.noise(u * 4 + ctx.t * 0.3, v * 4, ctx.t * 0.5);
      var fall = (v + ctx.t * 0.4 + Math.sin(u * 5) * 0.1) % 1;
      var bloom = petal > 0.5 ? (petal - 0.5) * 2 : 0;
      ctx.set(i, 340 + bloom * 15, 50 + bloom * 30, 30 + bloom * 60 + (fall > 0.9 ? 20 : 0));
    }
  },
  meta: { name: 'cherry-blossom' }
})`
  },
  {
    name: 'Peacock',
    gradient: 'linear-gradient(135deg, #003366, #00cc88, #6600cc, #003366)',
    code: `({
  render(ctx) {
    for (let i = 0; i < ctx.count; i++) {
      const [r, theta] = ctx.polar(i);
      var feather = Math.sin(theta * 5 + r * 3 - ctx.t);
      var h = 160 + feather * 60;
      var eye = r < 0.3 ? 1 - r * 3 : 0;
      ctx.set(i, h, 80 - eye * 60, (feather * 0.5 + 0.5) * 70 + eye * 30);
    }
  },
  meta: { name: 'peacock' }
})`
  },
  {
    name: 'Bubblegum',
    gradient: 'radial-gradient(circle, #ff66cc, #ff33aa, #cc0088)',
    code: `({
  render(ctx) {
    var pop = (ctx.t * 0.6) % 4;
    for (let i = 0; i < ctx.count; i++) {
      const [r] = ctx.polar(i);
      var bubble = Math.max(0, 1 - Math.abs(r - pop * 0.25) * 6);
      var shimmer = Math.sin(ctx.t * 5 + i * 0.5) * 0.2;
      ctx.set(i, 320 + shimmer * 20, 60, bubble * 90 + 5);
    }
  },
  meta: { name: 'bubblegum' }
})`
  },
  {
    name: 'Rust & Patina',
    gradient: 'linear-gradient(135deg, #884400, #cc6633, #44aa88, #226655)',
    code: `({
  render(ctx) {
    for (let i = 0; i < ctx.count; i++) {
      const [u, v] = ctx.uv(i);
      var n = ctx.noise(u * 4, v * 4, ctx.t * 0.15);
      var patina = ctx.noise(u * 3 + 5, v * 3, ctx.t * 0.1);
      if (n > 0.5) ctx.set(i, 25 + n * 15, 80, 30 + n * 40);
      else ctx.set(i, 160 + patina * 20, 50, 30 + patina * 35);
    }
  },
  meta: { name: 'rust-patina' }
})`
  },
  {
    name: 'Neon Sign',
    gradient: 'linear-gradient(135deg, #0a0a1a, #ff0066, #0a0a1a, #00ffcc, #0a0a1a)',
    code: `({
  render(ctx) {
    for (let i = 0; i < ctx.count; i++) {
      const [u, v] = ctx.uv(i);
      var flicker = Math.sin(ctx.t * 12 + i * 0.3) > 0.7 ? 0.3 : 0;
      var tube1 = Math.abs(Math.sin(u * Math.PI * 2)) < 0.15 && v > 0.2 && v < 0.8;
      var tube2 = Math.abs(Math.sin(v * Math.PI * 2)) < 0.15 && u > 0.2 && u < 0.8;
      if (tube1) ctx.set(i, 340, 100, 80 + flicker * 20);
      else if (tube2) ctx.set(i, 170, 100, 70 + flicker * 20);
      else ctx.set(i, 0, 0, 3);
    }
  },
  meta: { name: 'neon-sign' }
})`
  },
  {
    name: 'Autumn Leaves',
    gradient: 'linear-gradient(135deg, #cc3300, #ff6600, #ffaa00, #886600)',
    code: `({
  render(ctx) {
    for (let i = 0; i < ctx.count; i++) {
      const [u, v] = ctx.uv(i);
      var drift = ctx.noise(u * 3 + ctx.t * 0.4, v * 2, ctx.t * 0.2);
      var fall = (v + ctx.t * 0.3 + drift * 0.3) % 1;
      var hues = [5, 20, 35, 45];
      var idx = Math.floor(drift * 4) % 4;
      ctx.set(i, hues[idx], 90, 30 + fall * 50 + drift * 20);
    }
  },
  meta: { name: 'autumn-leaves' }
})`
  },
  {
    name: 'Moonrise',
    gradient: 'linear-gradient(180deg, #000022, #1a1a44, #ccccaa, #ffffdd)',
    code: `({
  render(ctx) {
    var moonY = 0.3 + Math.sin(ctx.t * 0.3) * 0.15;
    for (let i = 0; i < ctx.count; i++) {
      const [u, v] = ctx.uv(i);
      var moonDist = Math.sqrt((u - 0.5) * (u - 0.5) + (v - moonY) * (v - moonY));
      var moon = Math.max(0, 1 - moonDist * 5);
      var sky = Math.max(0, 1 - v) * 0.3;
      var star = ctx.noise(u * 10, v * 10, 0) > 0.85 ? Math.sin(ctx.t * 3 + i) * 0.3 + 0.4 : 0;
      ctx.set(i, moon > 0.1 ? 50 : 230, moon > 0.1 ? 20 : 50, (moon + sky + star) * 100);
    }
  },
  meta: { name: 'moonrise' }
})`
  },
  {
    name: 'Fireplace',
    gradient: 'linear-gradient(180deg, #1a0800, #cc3300, #ff6600, #ffcc00)',
    code: `({
  render(ctx) {
    for (let i = 0; i < ctx.count; i++) {
      const [u, v] = ctx.uv(i);
      var base = Math.max(0, 1 - (1 - v) * 1.5);
      var flicker = ctx.noise(u * 6, v * 3 - ctx.t * 5, ctx.t * 2);
      var ember = ctx.noise(u * 10, ctx.t * 8, 0) > 0.85 ? 0.5 : 0;
      var heat = base * (0.6 + flicker * 0.4) + ember * (1 - v);
      var h = heat > 0.7 ? 45 : heat > 0.4 ? 20 : 5;
      ctx.set(i, h, 100, Math.min(100, heat * 110));
    }
  },
  meta: { name: 'fireplace' }
})`
  },
  {
    name: 'Coral Reef',
    gradient: 'linear-gradient(135deg, #003366, #ff6644, #ffaa66, #00aa88)',
    code: `({
  render(ctx) {
    for (let i = 0; i < ctx.count; i++) {
      const [u, v] = ctx.uv(i);
      var n = ctx.noise(u * 3, v * 3, ctx.t * 0.2);
      var sway = Math.sin(u * 4 + ctx.t * 1.5 + v * 2) * 0.2;
      var type = n > 0.6 ? 0 : n > 0.35 ? 1 : 2;
      var hues = [10, 30, 165];
      var bright = 40 + Math.abs(sway) * 40 + n * 20;
      ctx.set(i, hues[type] + sway * 15, 70, bright);
    }
  },
  meta: { name: 'coral-reef' }
})`
  },
  {
    name: 'Ink Wash',
    gradient: 'linear-gradient(180deg, #f0f0f0, #888888, #222222)',
    code: `({
  render(ctx) {
    for (let i = 0; i < ctx.count; i++) {
      const [u, v] = ctx.uv(i);
      var ink = ctx.noise(u * 3 + ctx.t * 0.2, v * 3, ctx.t * 0.15);
      var drip = Math.sin(v * 6 + ctx.t + u * 3) * 0.2;
      var density = ink + drip;
      ctx.set(i, 220, 10, Math.max(5, Math.min(95, (1 - density) * 80)));
    }
  },
  meta: { name: 'ink-wash' }
})`
  },
  {
    name: 'Hologram',
    gradient: 'linear-gradient(135deg, #ff00ff, #00ffff, #ff8800, #00ff88)',
    code: `({
  render(ctx) {
    for (let i = 0; i < ctx.count; i++) {
      const [u, v] = ctx.uv(i);
      var scan = Math.sin(v * 30 + ctx.t * 5) * 0.5 + 0.5;
      var shift = Math.sin(ctx.t * 3 + u * 2) * 60;
      var h = ((u * 360 + shift + ctx.t * 50) % 360 + 360) % 360;
      var glitch = ctx.noise(u * 8, v * 2, Math.floor(ctx.t * 6)) > 0.8 ? 0.3 : 0;
      ctx.set(i, h, 60, (scan * 0.6 + 0.2 + glitch) * 100);
    }
  },
  meta: { name: 'hologram' }
})`
  },
  {
    name: 'Deep Purple',
    gradient: 'linear-gradient(135deg, #1a0033, #4400aa, #8844cc, #1a0033)',
    code: `({
  render(ctx) {
    for (let i = 0; i < ctx.count; i++) {
      const [u, v] = ctx.uv(i);
      var n = ctx.noise(u * 3, v * 3, ctx.t * 0.3);
      var wave = Math.sin(u * 5 + v * 3 + ctx.t * 1.5) * 0.3;
      ctx.set(i, 270 + n * 20 + wave * 10, 70 + n * 20, 20 + n * 40 + wave * 20);
    }
  },
  meta: { name: 'deep-purple' }
})`
  },
  {
    name: 'Jade',
    gradient: 'linear-gradient(135deg, #003322, #00aa66, #66ffaa, #003322)',
    code: `({
  render(ctx) {
    for (let i = 0; i < ctx.count; i++) {
      const [u, v] = ctx.uv(i);
      var vein = Math.sin((u + v) * 8 + ctx.noise(u * 5, v * 5, 0) * 4);
      var polish = Math.sin(ctx.t * 0.5 + u * 2) * 0.15 + 0.85;
      ctx.set(i, 150 + vein * 15, 60, (vein * 0.3 + 0.5) * polish * 80);
    }
  },
  meta: { name: 'jade' }
})`
  },
  {
    name: 'Sapphire',
    gradient: 'linear-gradient(135deg, #000044, #0044aa, #4488ff, #000044)',
    code: `({
  render(ctx) {
    for (let i = 0; i < ctx.count; i++) {
      const [r, theta] = ctx.polar(i);
      var facet = Math.cos(theta * 6 + ctx.t * 0.8) * Math.cos(r * 4);
      var sparkle = ctx.noise(theta * 5, r * 3, ctx.t * 3) > 0.82 ? 0.5 : 0;
      ctx.set(i, 220 + facet * 15, 70 - sparkle * 50, 25 + facet * 30 + sparkle * 45);
    }
  },
  meta: { name: 'sapphire' }
})`
  },
  {
    name: 'Rose Garden',
    gradient: 'linear-gradient(135deg, #660033, #cc3366, #ff6699, #660033)',
    code: `({
  render(ctx) {
    for (let i = 0; i < ctx.count; i++) {
      const [r, theta] = ctx.polar(i);
      var petal = Math.sin(theta * 5 + r * 2 - ctx.t * 0.8);
      var bloom = Math.max(0, 1 - r * 2) * (petal * 0.3 + 0.7);
      ctx.set(i, 340 + petal * 15, 60 + bloom * 30, bloom * 80 + 5);
    }
  },
  meta: { name: 'rose-garden' }
})`
  },
  {
    name: 'Honey',
    gradient: 'linear-gradient(135deg, #cc8800, #ffaa00, #ffdd44, #cc8800)',
    code: `({
  render(ctx) {
    for (let i = 0; i < ctx.count; i++) {
      const [u, v] = ctx.uv(i);
      var hex = Math.sin(u * 8) * Math.sin(v * 8) * 0.5 + 0.5;
      var drip = Math.sin(v * 4 - ctx.t * 0.8 + u * 2) * 0.3;
      ctx.set(i, 42 + hex * 10, 85, 40 + hex * 35 + drip * 20);
    }
  },
  meta: { name: 'honey' }
})`
  },
  {
    name: 'Thundercloud',
    gradient: 'linear-gradient(180deg, #1a1a2e, #333355, #555577)',
    code: `({
  render(ctx) {
    for (let i = 0; i < ctx.count; i++) {
      const [u, v] = ctx.uv(i);
      var cloud = ctx.noise(u * 2 + ctx.t * 0.1, v * 2, ctx.t * 0.05);
      var flash = ctx.noise(u * 5, v * 3, ctx.t * 8) > 0.92 ? 1 : 0;
      var rumble = flash * Math.max(0, 1 - v * 1.5);
      ctx.set(i, 230 + cloud * 20, 20 + cloud * 20, cloud * 30 + rumble * 80 + 5);
    }
  },
  meta: { name: 'thundercloud' }
})`
  },
  {
    name: 'Borealis',
    gradient: 'linear-gradient(180deg, #000011, #00aa44, #44ffaa, #aa00ff, #000011)',
    code: `({
  render(ctx) {
    for (let i = 0; i < ctx.count; i++) {
      const [u, v] = ctx.uv(i);
      var curtain = ctx.noise(u * 2, ctx.t * 0.2, 0);
      var band = Math.abs(v - 0.4 - curtain * 0.2);
      var visible = band < 0.2;
      var intensity = visible ? (1 - band / 0.2) : 0;
      var shimmer = ctx.noise(u * 8, v * 3, ctx.t * 2);
      var h = 130 + shimmer * 130;
      ctx.set(i, h, 70, intensity * shimmer * 100 + 2);
    }
  },
  meta: { name: 'borealis' }
})`
  },
  {
    name: 'Candy Cane',
    gradient: 'linear-gradient(135deg, #ff0000, #ffffff, #ff0000, #ffffff)',
    code: `({
  render(ctx) {
    for (let i = 0; i < ctx.count; i++) {
      const [u, v] = ctx.uv(i);
      var stripe = Math.sin((u + v) * 10 - ctx.t * 1.5) > 0;
      ctx.set(i, stripe ? 0 : 0, stripe ? 100 : 0, stripe ? 85 : 95);
    }
  },
  meta: { name: 'candy-cane' }
})`
  },
  {
    name: 'Chroma Shift',
    gradient: 'linear-gradient(90deg, #ff0000, #00ff00, #0000ff, #ff0000)',
    code: `({
  render(ctx) {
    for (let i = 0; i < ctx.count; i++) {
      const [u, v] = ctx.uv(i);
      var h = (u * 360 + ctx.t * 60 + Math.sin(v * 6 + ctx.t) * 40) % 360;
      var b = 60 + Math.sin(u * 4 + v * 4 - ctx.t * 2) * 30;
      ctx.set(i, h, 90, Math.max(15, b));
    }
  },
  meta: { name: 'chroma-shift' }
})`
  },
  {
    name: 'Pixel Sort',
    gradient: 'linear-gradient(90deg, #000000, #ff0088, #ffff00, #00ff88)',
    code: `({
  render(ctx) {
    for (let i = 0; i < ctx.count; i++) {
      const [x, y] = ctx.xy(i);
      var n = ctx.noise(y * 0.5, ctx.t * 0.5, 0);
      var sorted = n > 0.5;
      var h = sorted ? (x / ctx.cols * 120 + ctx.t * 30) % 360 : ctx.noise(x * 3, y * 3, ctx.t) * 360;
      var b = sorted ? 40 + (x / ctx.cols) * 50 : ctx.noise(x * 5, y * 5, ctx.t * 2) * 70;
      ctx.set(i, h, 80, Math.max(5, b));
    }
  },
  meta: { name: 'pixel-sort' }
})`
  },
  {
    name: 'Lava Lamp',
    gradient: 'linear-gradient(180deg, #220033, #ff4400, #ff8800, #220033)',
    code: `({
  render(ctx) {
    for (let i = 0; i < ctx.count; i++) {
      const [u, v] = ctx.uv(i);
      var blob1 = Math.max(0, 1 - Math.sqrt((u - 0.3 - Math.sin(ctx.t * 0.5) * 0.2) * (u - 0.3 - Math.sin(ctx.t * 0.5) * 0.2) + (v - 0.5 + Math.cos(ctx.t * 0.7) * 0.3) * (v - 0.5 + Math.cos(ctx.t * 0.7) * 0.3)) * 3);
      var blob2 = Math.max(0, 1 - Math.sqrt((u - 0.7 + Math.cos(ctx.t * 0.6) * 0.15) * (u - 0.7 + Math.cos(ctx.t * 0.6) * 0.15) + (v - 0.4 - Math.sin(ctx.t * 0.4) * 0.25) * (v - 0.4 - Math.sin(ctx.t * 0.4) * 0.25)) * 3);
      var heat = Math.max(blob1, blob2);
      ctx.set(i, 15 + heat * 25, 100, heat * 90 + 5);
    }
  },
  meta: { name: 'lava-lamp' }
})`
  },
  {
    name: 'Mosaic',
    gradient: 'linear-gradient(135deg, #cc0000, #00cc00, #0000cc, #cccc00)',
    code: `({
  render(ctx) {
    for (let i = 0; i < ctx.count; i++) {
      const [x, y] = ctx.xy(i);
      var cell = ((x * 7 + y * 13 + 5) * 37) % 360;
      var pulse = Math.sin(ctx.t * 1.5 + cell * 0.01) * 0.3 + 0.7;
      ctx.set(i, cell, 70, pulse * 70);
    }
  },
  meta: { name: 'mosaic' }
})`
  },
  {
    name: 'Siren',
    gradient: 'linear-gradient(90deg, #ff0000, #0000ff, #ff0000)',
    code: `({
  render(ctx) {
    var side = Math.sin(ctx.t * 4) > 0;
    for (let i = 0; i < ctx.count; i++) {
      const [u] = ctx.uv(i);
      var leftSide = u < 0.5;
      var on = (leftSide && side) || (!leftSide && !side);
      ctx.set(i, leftSide ? 0 : 230, 100, on ? 90 : 10);
    }
  },
  meta: { name: 'siren' }
})`
  },
  {
    name: 'Watercolor',
    gradient: 'linear-gradient(135deg, #ff9988, #88ccff, #aaffaa, #ffcc88)',
    code: `({
  render(ctx) {
    for (let i = 0; i < ctx.count; i++) {
      const [u, v] = ctx.uv(i);
      var n1 = ctx.noise(u * 2, v * 2, ctx.t * 0.1);
      var n2 = ctx.noise(u * 2 + 5, v * 2 + 5, ctx.t * 0.1);
      var n3 = ctx.noise(u * 2 + 10, v * 2 + 10, ctx.t * 0.1);
      var h = n1 * 120 + n2 * 120;
      var s = 30 + n3 * 30;
      var b = 50 + n1 * 30 + Math.sin(ctx.t * 0.3 + u + v) * 10;
      ctx.set(i, h % 360, s, Math.max(20, b));
    }
  },
  meta: { name: 'watercolor' }
})`
  },

  // ── Bright patterns — fully lit, no dark holes ──────────────────────
  {
    name: 'Full Spectrum',
    gradient: 'conic-gradient(#ff0000, #ffff00, #00ff00, #00ffff, #0000ff, #ff00ff, #ff0000)',
    code: `({
  render(ctx) {
    for (let i = 0; i < ctx.count; i++) {
      const [u, v] = ctx.uv(i);
      var h = (u * 360 + ctx.t * 30) % 360;
      ctx.set(i, h, 80, 80 + Math.sin(v * 3 + ctx.t) * 15);
    }
  },
  meta: { name: 'full-spectrum' }
})`
  },
  {
    name: 'Warm Glow',
    gradient: 'linear-gradient(135deg, #ff4400, #ffaa00, #ffcc44)',
    code: `({
  render(ctx) {
    for (let i = 0; i < ctx.count; i++) {
      const [u, v] = ctx.uv(i);
      var wave = Math.sin(u * 5 + ctx.t * 1.5) * Math.sin(v * 3 + ctx.t * 0.8);
      var h = 20 + wave * 20 + 10;
      ctx.set(i, h, 90, 70 + wave * 25);
    }
  },
  meta: { name: 'warm-glow' }
})`
  },
  {
    name: 'Pastel Dream',
    gradient: 'linear-gradient(135deg, #ffaacc, #aaccff, #aaffcc, #ffccaa)',
    code: `({
  render(ctx) {
    for (let i = 0; i < ctx.count; i++) {
      const [u, v] = ctx.uv(i);
      var h = (u * 180 + v * 180 + ctx.t * 20) % 360;
      ctx.set(i, h, 35, 85 + Math.sin(ctx.t + u * 3 + v * 2) * 10);
    }
  },
  meta: { name: 'pastel-dream' }
})`
  },
  {
    name: 'Electric Rainbow',
    gradient: 'linear-gradient(90deg, #ff0044, #ff8800, #ffff00, #00ff44, #0088ff, #8800ff)',
    code: `({
  render(ctx) {
    for (let i = 0; i < ctx.count; i++) {
      const [u, v] = ctx.uv(i);
      var h = (u * 200 + v * 160 + ctx.t * 50) % 360;
      var pulse = Math.sin(ctx.t * 3 + u * 4 + v * 4) * 10;
      ctx.set(i, h, 100, 80 + pulse);
    }
  },
  meta: { name: 'electric-rainbow' }
})`
  },
  {
    name: 'Sunrise Blaze',
    gradient: 'linear-gradient(180deg, #ff2200, #ff6600, #ffaa00, #ffdd44)',
    code: `({
  render(ctx) {
    for (let i = 0; i < ctx.count; i++) {
      const [u, v] = ctx.uv(i);
      var band = v + Math.sin(u * 4 + ctx.t) * 0.1;
      var h = 10 + band * 40;
      ctx.set(i, h, 100, 75 + (1 - band) * 20);
    }
  },
  meta: { name: 'sunrise-blaze' }
})`
  },
  {
    name: 'Jewel Tones',
    gradient: 'linear-gradient(135deg, #cc0044, #8800cc, #0044cc, #00cc88)',
    code: `({
  render(ctx) {
    for (let i = 0; i < ctx.count; i++) {
      const [u, v] = ctx.uv(i);
      var sector = Math.floor((u + v + ctx.t * 0.2) * 3) % 4;
      var hues = [340, 280, 220, 160];
      var shimmer = Math.sin(ctx.t * 2 + u * 6 + v * 6) * 10;
      ctx.set(i, hues[sector], 80, 70 + shimmer);
    }
  },
  meta: { name: 'jewel-tones' }
})`
  },
  {
    name: 'Neon Bloom',
    gradient: 'linear-gradient(135deg, #ff00ff, #00ffff, #ffff00)',
    code: `({
  render(ctx) {
    for (let i = 0; i < ctx.count; i++) {
      const [r, theta] = ctx.polar(i);
      var h = ((theta + Math.PI) / (Math.PI * 2) * 360 + ctx.t * 40) % 360;
      var bloom = Math.sin(r * 4 - ctx.t * 2) * 10;
      ctx.set(i, h, 90, 75 + bloom);
    }
  },
  meta: { name: 'neon-bloom' }
})`
  },
  {
    name: 'Candy Stripe',
    gradient: 'linear-gradient(45deg, #ff3366, #ffcc00, #33ccff, #ff3366)',
    code: `({
  render(ctx) {
    for (let i = 0; i < ctx.count; i++) {
      const [u, v] = ctx.uv(i);
      var stripe = Math.sin((u + v) * 8 - ctx.t * 2);
      var h = stripe > 0 ? 350 + stripe * 20 : 180 - stripe * 30;
      ctx.set(i, (h + 360) % 360, 70, 75 + stripe * 15);
    }
  },
  meta: { name: 'candy-stripe' }
})`
  },
  {
    name: 'Sherbet',
    gradient: 'linear-gradient(135deg, #ff6688, #ffaa44, #88ff66, #44aaff)',
    code: `({
  render(ctx) {
    for (let i = 0; i < ctx.count; i++) {
      const [u, v] = ctx.uv(i);
      var n = ctx.noise(u * 2, v * 2, ctx.t * 0.3);
      var h = (n * 360 + ctx.t * 15) % 360;
      ctx.set(i, h, 50, 80 + n * 15);
    }
  },
  meta: { name: 'sherbet' }
})`
  },
  {
    name: 'Vivid Waves',
    gradient: 'linear-gradient(90deg, #ff0066, #ff9900, #00ccff)',
    code: `({
  render(ctx) {
    for (let i = 0; i < ctx.count; i++) {
      const [u, v] = ctx.uv(i);
      var w1 = Math.sin(u * 6 + ctx.t * 2);
      var w2 = Math.sin(v * 5 - ctx.t * 1.5);
      var h = (w1 * 60 + w2 * 60 + 180 + ctx.t * 20) % 360;
      ctx.set(i, (h + 360) % 360, 85, 75 + (w1 + w2) * 10);
    }
  },
  meta: { name: 'vivid-waves' }
})`
  }
];

const DEFAULT_CODE = `({
  render(ctx) {
    for (let i = 0; i < ctx.count; i++) {
      const [u, v] = ctx.uv(i);
      const hue = (u * 360 + ctx.t * 60) % 360;
      const bright = 50 + Math.sin(v * Math.PI + ctx.t) * 40;
      ctx.set(i, hue, 100, bright);
    }
  },
  meta: { name: 'custom' }
})`;

function PatternTile({
  pattern,
  active,
  onClick,
  showPreview,
  speed
}: {
  pattern: PatternDef;
  active: boolean;
  onClick: () => void;
  showPreview?: boolean;
  speed?: number;
}) {
  const tileSize = showPreview ? 96 : 72;
  return (
    <button
      onClick={onClick}
      className="relative overflow-hidden transition-transform active:scale-93"
      style={{
        width: tileSize,
        height: tileSize,
        borderRadius: 16,
        background: showPreview ? '#0a0a12' : pattern.gradient,
        border: active ? '2.5px solid #fff' : '2.5px solid transparent'
      }}
    >
      {showPreview ? (
        <MiniGridPreview
          source={pattern.code}
          size={tileSize}
          isPattern
          speed={speed}
        />
      ) : null}
      <span
        className="absolute bottom-1 left-0 right-0 text-center text-white font-semibold"
        style={{
          fontSize: 9,
          textShadow: '0 1px 4px rgba(0,0,0,0.8)',
          letterSpacing: '0.02em'
        }}
      >
        {pattern.name}
      </span>
    </button>
  );
}

function PreviewToggle({ enabled, onToggle }: { enabled: boolean; onToggle: () => void }) {
  return (
    <button
      onClick={onToggle}
      style={{
        padding: '4px 10px',
        borderRadius: 12,
        fontSize: 11,
        fontWeight: 500,
        background: enabled ? 'rgba(59,130,246,0.15)' : 'transparent',
        color: enabled ? '#fff' : '#888898',
        border: '1px solid ' + (enabled ? '#3b82f6' : '#2a2a35')
      }}
      title={enabled ? 'Hide previews' : 'Show animated previews'}
    >
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ display: 'inline-block', verticalAlign: 'middle', marginRight: 4 }}>
        {enabled ? (
          <>
            <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
            <circle cx="12" cy="12" r="3" />
          </>
        ) : (
          <>
            <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94" />
            <path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19" />
            <line x1="1" y1="1" x2="23" y2="23" />
          </>
        )}
      </svg>
      Preview
    </button>
  );
}

export function PatternsTab({
  send,
  animSpeed,
  onAnimSpeed
}: {
  send: (msg: Record<string, unknown>) => void;
  animSpeed: number;
  onAnimSpeed: (v: number) => void;
}) {
  const [activePattern, setActivePattern] = useState<string | null>(null);
  const [showPreview, setShowPreview] = useState(true);
  const [showEditor, setShowEditor] = useState(false);
  const [code, setCode] = useState(DEFAULT_CODE);
  const [status, setStatus] = useState<'idle' | 'running' | 'error'>('idle');
  const [error, setError] = useState<string | null>(null);

  const handleSelect = useCallback((pattern: PatternDef) => {
    setActivePattern(pattern.name);
    setCode(pattern.code);
    setError(null);
    setStatus('running');
    send({ type: 'evalPattern', code: pattern.code, params: {} });
  }, [send]);

  const handleRun = useCallback(() => {
    try {
      setError(null);
      setStatus('running');
      setActivePattern(null);
      send({ type: 'evalPattern', code, params: {} });
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : String(e));
      setStatus('error');
    }
  }, [send, code]);

  const handleStop = useCallback(() => {
    send({ type: 'stopPattern' });
    setStatus('idle');
    setActivePattern(null);
  }, [send]);

  return (
    <div className="flex flex-col gap-4">
      {/* Speed slider + Preview toggle */}
      <div className="flex items-center gap-2">
        <span className="text-xs font-medium shrink-0" style={{ color: '#888898' }}>Speed</span>
        <input
          type="range"
          className="flex-1"
          style={{ minWidth: 120, height: 28 }}
          min={0}
          max={1000}
          value={Math.round(Math.log(animSpeed / 0.01) / Math.log(5.0 / 0.01) * 1000)}
          onChange={(e) => {
            const t = parseInt(e.target.value, 10) / 1000;
            onAnimSpeed(0.01 * Math.pow(5.0 / 0.01, t));
          }}
        />
        <span className="text-xs font-mono shrink-0" style={{ color: '#888898', minWidth: 36, textAlign: 'right' }}>
          {animSpeed < 0.1 ? animSpeed.toFixed(3) : animSpeed < 1 ? animSpeed.toFixed(2) : animSpeed.toFixed(1)}x
        </span>
        <button
          onClick={() => onAnimSpeed(1.0)}
          title="Reset to 1.0x"
          style={{
            width: 22, height: 22, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center',
            background: Math.abs(animSpeed - 1.0) < 0.01 ? 'transparent' : 'rgba(59,130,246,0.15)',
            border: 'none', cursor: 'pointer', opacity: Math.abs(animSpeed - 1.0) < 0.01 ? 0.3 : 1
          }}
        >
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#888898" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="1 4 1 10 7 10" /><path d="M3.51 15a9 9 0 1 0 2.13-9.36L1 10" />
          </svg>
        </button>
        <PreviewToggle enabled={showPreview} onToggle={() => setShowPreview(!showPreview)} />
      </div>

      {/* Pattern tiles — grouped */}
      <ControlGroup label="Solids">
        <div className="flex gap-2.5 flex-wrap overflow-y-auto" style={{ maxHeight: showPreview ? 320 : undefined }}>
          {PRESETS.filter(p => p.code.includes('ctx.fill(') && !p.code.includes('ctx.t')).map((p) => (
            <PatternTile
              key={p.name}
              pattern={p}
              active={activePattern === p.name}
              onClick={() => handleSelect(p)}
              showPreview={showPreview}
              speed={animSpeed}
            />
          ))}
        </div>
      </ControlGroup>

      <ControlGroup label="Static Layouts">
        <div className="flex gap-2.5 flex-wrap overflow-y-auto" style={{ maxHeight: showPreview ? 320 : undefined }}>
          {PRESETS.filter(p => !p.code.includes('ctx.fill(') && !p.code.includes('ctx.t')).map((p) => (
            <PatternTile
              key={p.name}
              pattern={p}
              active={activePattern === p.name}
              onClick={() => handleSelect(p)}
              showPreview={showPreview}
              speed={animSpeed}
            />
          ))}
        </div>
      </ControlGroup>

      <ControlGroup label="Animated">
        <div className="flex gap-2.5 flex-wrap overflow-y-auto" style={{ maxHeight: showPreview ? 360 : undefined }}>
          {PRESETS.filter(p => p.code.includes('ctx.t')).map((p) => (
            <PatternTile
              key={p.name}
              pattern={p}
              active={activePattern === p.name}
              onClick={() => handleSelect(p)}
              showPreview={showPreview}
              speed={animSpeed}
            />
          ))}
        </div>
      </ControlGroup>

      {/* Stop button */}
      {status === 'running' && (
        <button
          onClick={handleStop}
          style={{
            padding: '8px 20px',
            borderRadius: 16,
            fontSize: 12,
            fontWeight: 600,
            background: '#1a1a2e',
            border: '1px solid #333',
            color: '#f87171',
            alignSelf: 'flex-start'
          }}
        >
          Stop Pattern
        </button>
      )}

      {/* Editor toggle */}
      <button
        onClick={() => setShowEditor(v => !v)}
        style={{
          padding: '6px 12px',
          borderRadius: 12,
          fontSize: 11,
          fontWeight: 500,
          background: 'transparent',
          border: '1px solid #1a1a25',
          color: '#555',
          alignSelf: 'flex-start',
          cursor: 'pointer'
        }}
      >
        {showEditor ? 'Hide Editor' : 'Code Editor'}
      </button>

      {/* Code editor (toggled) */}
      {showEditor && (
        <div className="flex flex-col gap-3">
          <textarea
            value={code}
            onChange={(e) => setCode(e.target.value)}
            spellCheck={false}
            className="font-mono text-sm"
            style={{
              width: '100%',
              minHeight: 200,
              padding: 12,
              borderRadius: 12,
              background: '#0a0a10',
              border: '1px solid #1a1a25',
              color: '#c8c8d8',
              resize: 'vertical',
              outline: 'none',
              lineHeight: 1.5,
              tabSize: 2
            }}
          />
          <div className="flex gap-2 items-center">
            <button
              onClick={handleRun}
              style={{
                padding: '8px 20px',
                borderRadius: 16,
                fontSize: 12,
                fontWeight: 600,
                background: status === 'running' ? '#1a3a2a' : '#1a1a2e',
                border: status === 'running' ? '1px solid #2a5a3a' : '1px solid #333',
                color: status === 'running' ? '#4ade80' : '#e8e8f0'
              }}
            >
              {status === 'running' ? 'Update' : 'Run'}
            </button>
            <button
              onClick={handleStop}
              style={{
                padding: '8px 20px',
                borderRadius: 16,
                fontSize: 12,
                fontWeight: 600,
                background: '#1a1a2e',
                border: '1px solid #333',
                color: '#f87171'
              }}
            >
              Stop
            </button>
            {error && (
              <span style={{ fontSize: 12, color: '#f87171' }}>{error}</span>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
