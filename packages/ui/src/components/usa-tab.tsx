'use client';

import { useCallback, useState } from 'react';

import { ControlGrid, ControlGroup } from './control-grid';
import { MiniGridPreview } from './mini-grid-preview';

// ── USA Colors (HSB): Red, White, Blue ─────────────────────────────────

const USA_COLORS_CODE = `
var RED = [0, 100, 100];
var WHITE = [0, 0, 100];
var BLUE = [220, 100, 70];
var COLORS = [RED, WHITE, BLUE];
`;

function lerpColorCode(): string {
  return `
function lerpColor(a, b, t) {
  var dh = b[0] - a[0];
  if (dh > 180) dh -= 360;
  if (dh < -180) dh += 360;
  return [
    ((a[0] + dh * t) % 360 + 360) % 360,
    a[1] + (b[1] - a[1]) * t,
    a[2] + (b[2] - a[2]) * t
  ];
}
function colorAt(pos) {
  var p = ((pos % 1) + 1) % 1;
  var scaled = p * COLORS.length;
  var idx = Math.floor(scaled);
  var mix = scaled - idx;
  var a = COLORS[idx % COLORS.length];
  var b = COLORS[(idx + 1) % COLORS.length];
  return lerpColor(a, b, mix);
}
`;
}

interface PatternDef {
  name: string;
  gradient: string;
  code: string;
}

// ── Helper pattern factories ───────────────────────────────────────────

function makeFlowPattern(colorsCode: string): string {
  return `(function(){\n${colorsCode}\n${lerpColorCode()}\nreturn {\nrender: function(ctx) {\n  var speed = ctx.t * 0.012;\n  for (var i = 0; i < ctx.count; i++) {\n    var uv = ctx.uv(i);\n    var c = colorAt(uv[1] + speed);\n    ctx.set(i, c[0], c[1], c[2]);\n  }\n},\nmeta: { name: 'usa-flow' }\n};\n})()`;
}

function makeRotatePattern(colorsCode: string): string {
  return `(function(){\n${colorsCode}\n${lerpColorCode()}\nreturn {\nrender: function(ctx) {\n  var offset = ctx.t * 0.5;\n  for (var i = 0; i < ctx.count; i++) {\n    var uv = ctx.uv(i);\n    var c = colorAt(uv[0] + offset);\n    ctx.set(i, c[0], c[1], 100);\n  }\n},\nmeta: { name: 'usa-rotate' }\n};\n})()`;
}

function makeRingPattern(colorsCode: string): string {
  return `(function(){\n${colorsCode}\n${lerpColorCode()}\nreturn {\nrender: function(ctx) {\n  var speed = ctx.t * 0.15;\n  for (var i = 0; i < ctx.count; i++) {\n    var polar = ctx.polar(i);\n    var c = colorAt(polar[1] / (Math.PI * 2) + speed);\n    ctx.set(i, c[0], c[1], 100);\n  }\n},\nmeta: { name: 'usa-ring' }\n};\n})()`;
}

function makeBreathePattern(colorsCode: string): string {
  return `(function(){\n${colorsCode}\n${lerpColorCode()}\nreturn {\nrender: function(ctx) {\n  var speed = ctx.t * 0.008;\n  var brightness = 90 + Math.sin(ctx.t * 0.6) * 10;\n  var c = colorAt(speed);\n  for (var i = 0; i < ctx.count; i++) {\n    ctx.set(i, c[0], c[1], brightness);\n  }\n},\nmeta: { name: 'usa-breathe' }\n};\n})()`;
}

function makeWavePattern(colorsCode: string): string {
  return `(function(){\n${colorsCode}\n${lerpColorCode()}\nreturn {\nrender: function(ctx) {\n  for (var i = 0; i < ctx.count; i++) {\n    var uv = ctx.uv(i);\n    var phase = Math.sin(uv[0] * Math.PI * 2 - ctx.t * 2);\n    var c = colorAt(uv[1] + ctx.t * 0.02);\n    var b = 60 + 40 * (0.5 + 0.5 * phase);\n    ctx.set(i, c[0], c[1], b);\n  }\n},\nmeta: { name: 'usa-wave' }\n};\n})()`;
}

// ── Static Patterns ────────────────────────────────────────────────────

const USA_STATIC: PatternDef[] = [
  {
    name: 'Flag',
    gradient: 'linear-gradient(180deg, #BF0A30, #FFFFFF, #002868)',
    code: `(function(){
${USA_COLORS_CODE}
return {
render: function(ctx) {
  for (var i = 0; i < ctx.count; i++) {
    var uv = ctx.uv(i);
    var bandIdx = Math.floor(uv[1] * 3);
    if (bandIdx >= 3) bandIdx = 2;
    var c = COLORS[bandIdx];
    ctx.set(i, c[0], c[1], c[2]);
  }
},
meta: { name: 'usa-flag' }
};
})()`
  },
  {
    name: 'Columns',
    gradient: 'linear-gradient(90deg, #BF0A30, #FFFFFF, #002868)',
    code: `(function(){
${USA_COLORS_CODE}
return {
render: function(ctx) {
  for (var i = 0; i < ctx.count; i++) {
    var uv = ctx.uv(i);
    var bandIdx = Math.floor(uv[0] * 3);
    if (bandIdx >= 3) bandIdx = 2;
    var c = COLORS[bandIdx];
    ctx.set(i, c[0], c[1], c[2]);
  }
},
meta: { name: 'usa-columns' }
};
})()`
  },
  {
    name: 'Diagonal',
    gradient: 'linear-gradient(135deg, #BF0A30, #FFFFFF, #002868)',
    code: `(function(){
${USA_COLORS_CODE}
return {
render: function(ctx) {
  for (var i = 0; i < ctx.count; i++) {
    var uv = ctx.uv(i);
    var d = (uv[0] + uv[1]) / 2;
    var bandIdx = Math.floor(d * 3);
    if (bandIdx >= 3) bandIdx = 2;
    var c = COLORS[bandIdx];
    ctx.set(i, c[0], c[1], c[2]);
  }
},
meta: { name: 'usa-diagonal' }
};
})()`
  },
  {
    name: 'Solid Red',
    gradient: 'linear-gradient(135deg, #BF0A30, #990820)',
    code: `({ render: function(ctx) { ctx.fill(0, 100, 100); }, meta: { name: 'usa-solid-red' } })`
  },
  {
    name: 'Solid Blue',
    gradient: 'linear-gradient(135deg, #002868, #001845)',
    code: `({ render: function(ctx) { ctx.fill(220, 100, 70); }, meta: { name: 'usa-solid-blue' } })`
  },
  {
    name: 'Solid White',
    gradient: 'linear-gradient(135deg, #FFFFFF, #DDDDDD)',
    code: `({ render: function(ctx) { ctx.fill(0, 0, 100); }, meta: { name: 'usa-solid-white' } })`
  },
  {
    name: 'Checker',
    gradient: 'conic-gradient(#BF0A30 25%, #002868 25% 50%, #BF0A30 50% 75%, #002868 75%)',
    code: `(function(){
${USA_COLORS_CODE}
return {
render: function(ctx) {
  for (var i = 0; i < ctx.count; i++) {
    var row = Math.floor(i / ctx.cols);
    var col = i % ctx.cols;
    var c = (row + col) % 2 === 0 ? RED : BLUE;
    ctx.set(i, c[0], c[1], c[2]);
  }
},
meta: { name: 'usa-checker' }
};
})()`
  },
  {
    name: 'Stars',
    gradient: 'radial-gradient(circle, #FFFFFF 20%, #002868 20% 100%)',
    code: `(function(){
${USA_COLORS_CODE}
return {
render: function(ctx) {
  for (var i = 0; i < ctx.count; i++) {
    var row = Math.floor(i / ctx.cols);
    var col = i % ctx.cols;
    var isStarRow = row % 2 === 0;
    var isStarCol = col % 2 === 0;
    if (isStarRow && isStarCol) {
      ctx.set(i, WHITE[0], WHITE[1], WHITE[2]);
    } else {
      ctx.set(i, BLUE[0], BLUE[1], BLUE[2]);
    }
  }
},
meta: { name: 'usa-stars' }
};
})()`
  },
  {
    name: 'Cross',
    gradient: 'linear-gradient(0deg, #002868 40%, #BF0A30 40% 60%, #002868 60%)',
    code: `(function(){
${USA_COLORS_CODE}
return {
render: function(ctx) {
  var mid = Math.floor(ctx.cols / 2);
  var midRow = Math.floor(ctx.rows / 2);
  for (var i = 0; i < ctx.count; i++) {
    var row = Math.floor(i / ctx.cols);
    var col = i % ctx.cols;
    if (row === midRow || col === mid) {
      ctx.set(i, WHITE[0], WHITE[1], WHITE[2]);
    } else if ((row < midRow && col < mid) || (row > midRow && col > mid)) {
      ctx.set(i, RED[0], RED[1], RED[2]);
    } else {
      ctx.set(i, BLUE[0], BLUE[1], BLUE[2]);
    }
  }
},
meta: { name: 'usa-cross' }
};
})()`
  },
  {
    name: 'Diamond',
    gradient: 'conic-gradient(#BF0A30, #FFFFFF, #002868, #FFFFFF, #BF0A30)',
    code: `(function(){
${USA_COLORS_CODE}
return {
render: function(ctx) {
  var cx = (ctx.cols - 1) / 2;
  var cy = (ctx.rows - 1) / 2;
  for (var i = 0; i < ctx.count; i++) {
    var row = Math.floor(i / ctx.cols);
    var col = i % ctx.cols;
    var dist = Math.abs(col - cx) + Math.abs(row - cy);
    var maxDist = cx + cy;
    var zone = Math.floor(dist / maxDist * 3);
    if (zone >= 3) zone = 2;
    var c = [WHITE, RED, BLUE][zone];
    ctx.set(i, c[0], c[1], c[2]);
  }
},
meta: { name: 'usa-diamond' }
};
})()`
  },
  {
    name: 'US Flag',
    gradient: 'linear-gradient(180deg, #BF0A30, #FFFFFF, #BF0A30, #FFFFFF, #002868)',
    code: `(function(){
${USA_COLORS_CODE}
return {
render: function(ctx) {
  var cantonCols = Math.ceil(ctx.cols * 0.43);
  var cantonRows = Math.ceil(ctx.rows * 0.57);
  for (var i = 0; i < ctx.count; i++) {
    var row = Math.floor(i / ctx.cols);
    var col = i % ctx.cols;
    if (row < cantonRows && col < cantonCols) {
      var sr = row % 2 === 0 && col % 2 === 0;
      if (sr) { ctx.set(i, WHITE[0], WHITE[1], 100); }
      else { ctx.set(i, BLUE[0], BLUE[1], BLUE[2]); }
    } else {
      var stripe = Math.floor(row / ctx.rows * 13);
      if (stripe % 2 === 0) { ctx.set(i, RED[0], RED[1], RED[2]); }
      else { ctx.set(i, WHITE[0], WHITE[1], WHITE[2]); }
    }
  }
},
meta: { name: 'usa-usflag' }
};
})()`
  },
  {
    name: 'Flag V2',
    gradient: 'linear-gradient(180deg, #BF0A30, #FFFFFF, #BF0A30, #002868)',
    code: `(function(){
${USA_COLORS_CODE}
return {
render: function(ctx) {
  var cantonCols = 3;
  var cantonRows = 4;
  for (var i = 0; i < ctx.count; i++) {
    var row = Math.floor(i / ctx.cols);
    var col = i % ctx.cols;
    if (row < cantonRows && col < cantonCols) {
      var star = (row + col) % 2 === 0;
      if (star) { ctx.set(i, WHITE[0], WHITE[1], 100); }
      else { ctx.set(i, BLUE[0], BLUE[1], BLUE[2]); }
    } else {
      var stripe = row % 2 === 0;
      if (stripe) { ctx.set(i, RED[0], RED[1], RED[2]); }
      else { ctx.set(i, WHITE[0], WHITE[1], WHITE[2]); }
    }
  }
},
meta: { name: 'usa-flag-v2' }
};
})()`
  },
  {
    name: 'Bold Stripes',
    gradient: 'linear-gradient(180deg, #BF0A30 50%, #FFFFFF 50%)',
    code: `(function(){
${USA_COLORS_CODE}
return {
render: function(ctx) {
  for (var i = 0; i < ctx.count; i++) {
    var row = Math.floor(i / ctx.cols);
    var stripe = row % 2;
    if (stripe === 0) { ctx.set(i, RED[0], RED[1], RED[2]); }
    else { ctx.set(i, WHITE[0], WHITE[1], WHITE[2]); }
  }
},
meta: { name: 'usa-bold-stripes' }
};
})()`
  },
  {
    name: 'Vertical Stripes',
    gradient: 'linear-gradient(90deg, #BF0A30 50%, #FFFFFF 50%)',
    code: `(function(){
${USA_COLORS_CODE}
return {
render: function(ctx) {
  for (var i = 0; i < ctx.count; i++) {
    var col = i % ctx.cols;
    var stripe = col % 2;
    if (stripe === 0) { ctx.set(i, RED[0], RED[1], RED[2]); }
    else { ctx.set(i, WHITE[0], WHITE[1], WHITE[2]); }
  }
},
meta: { name: 'usa-vstripes' }
};
})()`
  },
  {
    name: 'Star Field',
    gradient: 'radial-gradient(circle, #FFFFFF 15%, #002868 15%)',
    code: `(function(){
${USA_COLORS_CODE}
return {
render: function(ctx) {
  for (var i = 0; i < ctx.count; i++) {
    var row = Math.floor(i / ctx.cols);
    var col = i % ctx.cols;
    var isStar = (row + col) % 3 === 0;
    if (isStar) { ctx.set(i, WHITE[0], WHITE[1], 100); }
    else { ctx.set(i, BLUE[0], BLUE[1], BLUE[2]); }
  }
},
meta: { name: 'usa-star-field' }
};
})()`
  },
  {
    name: 'Old Glory',
    gradient: 'linear-gradient(180deg, #BF0A30 14%, #FFF 14% 28%, #BF0A30 28% 42%, #FFF 42% 57%, #002868 57%)',
    code: `(function(){
${USA_COLORS_CODE}
return {
render: function(ctx) {
  for (var i = 0; i < ctx.count; i++) {
    var row = Math.floor(i / ctx.cols);
    var col = i % ctx.cols;
    if (row < 4 && col < 3) {
      ctx.set(i, BLUE[0], BLUE[1], BLUE[2]);
    } else {
      if (row % 2 === 0) { ctx.set(i, RED[0], RED[1], RED[2]); }
      else { ctx.set(i, WHITE[0], WHITE[1], WHITE[2]); }
    }
  }
},
meta: { name: 'usa-old-glory' }
};
})()`
  },
  {
    name: 'Flag Classic',
    gradient: 'linear-gradient(180deg, #BF0A30 14%, #FFF 14% 28%, #BF0A30 28% 42%, #002868 42%)',
    code: `(function(){
${USA_COLORS_CODE}
return {
render: function(ctx) {
  for (var i = 0; i < ctx.count; i++) {
    var row = Math.floor(i / ctx.cols);
    var col = i % ctx.cols;
    if (row < 3 && col < 3) {
      ctx.set(i, BLUE[0], BLUE[1], BLUE[2]);
    } else {
      if (row % 2 === 0) { ctx.set(i, RED[0], RED[1], RED[2]); }
      else { ctx.set(i, WHITE[0], WHITE[1], WHITE[2]); }
    }
  }
},
meta: { name: 'usa-flag-classic' }
};
})()`
  },
  {
    name: 'Glory Stars',
    gradient: 'linear-gradient(180deg, #BF0A30 14%, #FFF 28%, #002868 57%)',
    code: `(function(){
${USA_COLORS_CODE}
return {
render: function(ctx) {
  for (var i = 0; i < ctx.count; i++) {
    var row = Math.floor(i / ctx.cols);
    var col = i % ctx.cols;
    if (row < 4 && col < 3) {
      var star = (row % 2 === 0 && col % 2 === 0) || (row % 2 === 1 && col === 1);
      if (star) { ctx.set(i, WHITE[0], WHITE[1], 100); }
      else { ctx.set(i, BLUE[0], BLUE[1], BLUE[2]); }
    } else {
      if (row % 2 === 0) { ctx.set(i, RED[0], RED[1], RED[2]); }
      else { ctx.set(i, WHITE[0], WHITE[1], WHITE[2]); }
    }
  }
},
meta: { name: 'usa-glory-stars' }
};
})()`
  },
  {
    name: 'Flag Wide',
    gradient: 'linear-gradient(180deg, #BF0A30 14%, #FFF 28%, #BF0A30 42%, #002868 57%)',
    code: `(function(){
${USA_COLORS_CODE}
return {
render: function(ctx) {
  for (var i = 0; i < ctx.count; i++) {
    var row = Math.floor(i / ctx.cols);
    var col = i % ctx.cols;
    if (row < 3 && col < 3) {
      var star = (row + col) % 2 === 0;
      if (star) { ctx.set(i, WHITE[0], WHITE[1], 100); }
      else { ctx.set(i, BLUE[0], BLUE[1], BLUE[2]); }
    } else {
      if (row % 2 === 0) { ctx.set(i, RED[0], RED[1], RED[2]); }
      else { ctx.set(i, WHITE[0], WHITE[1], WHITE[2]); }
    }
  }
},
meta: { name: 'usa-flag-wide' }
};
})()`
  }
];

// ── Animated Patterns ──────────────────────────────────────────────────

const USA_ANIMATED: PatternDef[] = [
  {
    name: 'Flow',
    gradient: 'linear-gradient(180deg, #BF0A30, #FFFFFF, #002868)',
    code: makeFlowPattern(USA_COLORS_CODE)
  },
  {
    name: 'Rotate',
    gradient: 'linear-gradient(90deg, #BF0A30, #FFFFFF, #002868, #BF0A30)',
    code: makeRotatePattern(USA_COLORS_CODE)
  },
  {
    name: 'Ring',
    gradient: 'conic-gradient(#BF0A30, #FFFFFF, #002868, #BF0A30)',
    code: makeRingPattern(USA_COLORS_CODE)
  },
  {
    name: 'Breathe',
    gradient: 'radial-gradient(circle, #FFFFFF, #BF0A30, #002868)',
    code: makeBreathePattern(USA_COLORS_CODE)
  },
  {
    name: 'Wave',
    gradient: 'linear-gradient(135deg, #BF0A30, #FFFFFF, #002868)',
    code: makeWavePattern(USA_COLORS_CODE)
  },
  {
    name: 'Pinwheel',
    gradient: 'conic-gradient(#BF0A30, #FFFFFF, #002868, #BF0A30)',
    code: `(function(){
${USA_COLORS_CODE}
${lerpColorCode()}
return {
render: function(ctx) {
  var speed = ctx.t * 0.8;
  for (var i = 0; i < ctx.count; i++) {
    var polar = ctx.polar(i);
    var angle = polar[1] / (Math.PI * 2);
    var c = colorAt(angle * 3 + speed);
    ctx.set(i, c[0], c[1], c[2]);
  }
},
meta: { name: 'usa-pinwheel' }
};
})()`
  },
  {
    name: 'Sparkle',
    gradient: 'radial-gradient(circle, #FFFFFF 10%, #BF0A30 50%, #002868)',
    code: `(function(){
${USA_COLORS_CODE}
return {
render: function(ctx) {
  for (var i = 0; i < ctx.count; i++) {
    var row = Math.floor(i / ctx.cols);
    var col = i % ctx.cols;
    var phase = Math.sin(ctx.t * 3 + row * 1.7 + col * 2.3);
    if (phase > 0.85) {
      ctx.set(i, WHITE[0], WHITE[1], WHITE[2]);
    } else if (phase > 0) {
      ctx.set(i, RED[0], RED[1], 60 + phase * 40);
    } else {
      ctx.set(i, BLUE[0], BLUE[1], 50 + (1 + phase) * 20);
    }
  }
},
meta: { name: 'usa-sparkle' }
};
})()`
  },
  {
    name: 'Cascade',
    gradient: 'linear-gradient(180deg, #BF0A30 0%, #FFFFFF 50%, #002868 100%)',
    code: `(function(){
${USA_COLORS_CODE}
${lerpColorCode()}
return {
render: function(ctx) {
  for (var i = 0; i < ctx.count; i++) {
    var row = Math.floor(i / ctx.cols);
    var col = i % ctx.cols;
    var offset = row * 0.15;
    var pos = (col / ctx.cols + ctx.t * 0.4 + offset) % 1;
    var c = colorAt(pos);
    ctx.set(i, c[0], c[1], c[2]);
  }
},
meta: { name: 'usa-cascade' }
};
})()`
  },
  {
    name: 'Pulse',
    gradient: 'radial-gradient(circle, #BF0A30, #002868)',
    code: `(function(){
${USA_COLORS_CODE}
${lerpColorCode()}
return {
render: function(ctx) {
  var pulse = (Math.sin(ctx.t * 1.5) + 1) / 2;
  var cx = (ctx.cols - 1) / 2;
  var cy = (ctx.rows - 1) / 2;
  for (var i = 0; i < ctx.count; i++) {
    var row = Math.floor(i / ctx.cols);
    var col = i % ctx.cols;
    var dx = (col - cx) / cx;
    var dy = (row - cy) / cy;
    var dist = Math.sqrt(dx * dx + dy * dy);
    var ring = (dist - pulse + ctx.t * 0.3) % 1;
    if (ring < 0) ring += 1;
    var c = colorAt(ring);
    ctx.set(i, c[0], c[1], c[2]);
  }
},
meta: { name: 'usa-pulse' }
};
})()`
  },
  {
    name: 'March',
    gradient: 'linear-gradient(90deg, #BF0A30, #002868, #BF0A30, #002868)',
    code: `(function(){
${USA_COLORS_CODE}
return {
render: function(ctx) {
  var step = Math.floor(ctx.t * 2) % ctx.cols;
  for (var i = 0; i < ctx.count; i++) {
    var row = Math.floor(i / ctx.cols);
    var col = i % ctx.cols;
    var shifted = (col + step + row) % ctx.cols;
    var zone = Math.floor(shifted / ctx.cols * 3);
    if (zone >= 3) zone = 2;
    var c = COLORS[zone];
    ctx.set(i, c[0], c[1], c[2]);
  }
},
meta: { name: 'usa-march' }
};
})()`
  },
  {
    name: 'Firework',
    gradient: 'radial-gradient(circle, #FFFFFF, #BF0A30 40%, #002868)',
    code: `(function(){
${USA_COLORS_CODE}
return {
render: function(ctx) {
  var cx = (ctx.cols - 1) / 2;
  var cy = (ctx.rows - 1) / 2;
  var burst = (ctx.t * 0.7) % 2;
  for (var i = 0; i < ctx.count; i++) {
    var row = Math.floor(i / ctx.cols);
    var col = i % ctx.cols;
    var dx = (col - cx) / cx;
    var dy = (row - cy) / cy;
    var dist = Math.sqrt(dx * dx + dy * dy);
    var edge = burst > 1 ? 2 - burst : burst;
    var diff = Math.abs(dist - edge);
    if (diff < 0.2) {
      ctx.set(i, WHITE[0], WHITE[1], 100 - diff * 400);
    } else if (dist < edge) {
      ctx.set(i, RED[0], RED[1], 80 - dist * 30);
    } else {
      ctx.set(i, BLUE[0], BLUE[1], 40 + dist * 20);
    }
  }
},
meta: { name: 'usa-firework' }
};
})()`
  },
  {
    name: 'Spiral',
    gradient: 'conic-gradient(#BF0A30, #FFFFFF, #002868, #BF0A30)',
    code: `(function(){
${USA_COLORS_CODE}
${lerpColorCode()}
return {
render: function(ctx) {
  var cx = (ctx.cols - 1) / 2;
  var cy = (ctx.rows - 1) / 2;
  for (var i = 0; i < ctx.count; i++) {
    var row = Math.floor(i / ctx.cols);
    var col = i % ctx.cols;
    var dx = col - cx;
    var dy = row - cy;
    var angle = Math.atan2(dy, dx) / (Math.PI * 2) + 0.5;
    var dist = Math.sqrt(dx * dx + dy * dy) / cx;
    var pos = angle + dist * 0.5 + ctx.t * 0.3;
    var c = colorAt(pos);
    ctx.set(i, c[0], c[1], c[2]);
  }
},
meta: { name: 'usa-spiral' }
};
})()`
  },
  {
    name: 'Strobe',
    gradient: 'linear-gradient(90deg, #BF0A30, #FFFFFF, #002868, #FFFFFF)',
    code: `(function(){
${USA_COLORS_CODE}
return {
render: function(ctx) {
  var t = ctx.t * 4;
  var phase = Math.floor(t) % 3;
  var c = COLORS[phase];
  var bright = 70 + 30 * (0.5 + 0.5 * Math.cos((t % 1) * Math.PI * 2));
  for (var i = 0; i < ctx.count; i++) {
    ctx.set(i, c[0], c[1], bright);
  }
},
meta: { name: 'usa-strobe' }
};
})()`
  },
  {
    name: 'Ripple',
    gradient: 'radial-gradient(circle, #FFFFFF 20%, #BF0A30 50%, #002868)',
    code: `(function(){
${USA_COLORS_CODE}
${lerpColorCode()}
return {
render: function(ctx) {
  var cx = (ctx.cols - 1) / 2;
  var cy = (ctx.rows - 1) / 2;
  for (var i = 0; i < ctx.count; i++) {
    var row = Math.floor(i / ctx.cols);
    var col = i % ctx.cols;
    var dx = col - cx;
    var dy = row - cy;
    var dist = Math.sqrt(dx * dx + dy * dy);
    var wave = Math.sin(dist * 2 - ctx.t * 3);
    var pos = (wave + 1) / 2;
    var c = colorAt(pos);
    ctx.set(i, c[0], c[1], c[2]);
  }
},
meta: { name: 'usa-ripple' }
};
})()`
  },
  {
    name: 'Lightning',
    gradient: 'linear-gradient(180deg, #002868, #FFFFFF 50%, #002868)',
    code: `(function(){
${USA_COLORS_CODE}
return {
render: function(ctx) {
  var bolt = Math.floor(ctx.t * 5) % 7;
  for (var i = 0; i < ctx.count; i++) {
    var row = Math.floor(i / ctx.cols);
    var col = i % ctx.cols;
    var onBolt = Math.abs(col - bolt) <= 0 && Math.sin(ctx.t * 10 + row) > 0;
    if (onBolt) {
      ctx.set(i, WHITE[0], WHITE[1], WHITE[2]);
    } else {
      var blend = row / ctx.rows;
      if (blend < 0.5) {
        ctx.set(i, RED[0], RED[1], 60 + blend * 40);
      } else {
        ctx.set(i, BLUE[0], BLUE[1], 40 + (1 - blend) * 40);
      }
    }
  }
},
meta: { name: 'usa-lightning' }
};
})()`
  },
  {
    name: 'Radar',
    gradient: 'conic-gradient(#BF0A30, transparent, #002868, transparent, #BF0A30)',
    code: `(function(){
${USA_COLORS_CODE}
return {
render: function(ctx) {
  var cx = (ctx.cols - 1) / 2;
  var cy = (ctx.rows - 1) / 2;
  var sweep = (ctx.t * 1.5) % (Math.PI * 2);
  for (var i = 0; i < ctx.count; i++) {
    var row = Math.floor(i / ctx.cols);
    var col = i % ctx.cols;
    var angle = Math.atan2(row - cy, col - cx) + Math.PI;
    var diff = angle - sweep;
    if (diff < 0) diff += Math.PI * 2;
    if (diff < 0.6) {
      var fade = 1 - diff / 0.6;
      ctx.set(i, WHITE[0], WHITE[1], fade * 100);
    } else {
      var dist = Math.sqrt((col - cx) * (col - cx) + (row - cy) * (row - cy)) / cx;
      if (dist < 0.5) {
        ctx.set(i, RED[0], RED[1], 50);
      } else {
        ctx.set(i, BLUE[0], BLUE[1], 40);
      }
    }
  }
},
meta: { name: 'usa-radar' }
};
})()`
  },
  {
    name: 'Confetti',
    gradient: 'linear-gradient(135deg, #BF0A30 33%, #FFFFFF 33% 66%, #002868 66%)',
    code: `(function(){
${USA_COLORS_CODE}
return {
render: function(ctx) {
  var seed = Math.floor(ctx.t * 6);
  for (var i = 0; i < ctx.count; i++) {
    var row = Math.floor(i / ctx.cols);
    var col = i % ctx.cols;
    var hash = (seed * 31 + row * 17 + col * 13) % 100;
    var fall = (row / ctx.rows + ctx.t * 0.5 + col * 0.1) % 1;
    var bright = 60 + 40 * (1 - fall);
    if (hash < 33) {
      ctx.set(i, RED[0], RED[1], bright);
    } else if (hash < 66) {
      ctx.set(i, WHITE[0], WHITE[1], bright);
    } else {
      ctx.set(i, BLUE[0], BLUE[1], bright);
    }
  }
},
meta: { name: 'usa-confetti' }
};
})()`
  },
  {
    name: 'Snake',
    gradient: 'linear-gradient(90deg, #BF0A30, #002868, #FFFFFF)',
    code: `(function(){
${USA_COLORS_CODE}
return {
render: function(ctx) {
  var len = ctx.count;
  var headPos = Math.floor(ctx.t * 8) % len;
  for (var i = 0; i < ctx.count; i++) {
    var dist = (i - headPos + len) % len;
    var segment = Math.floor(dist / 5) % 3;
    var c = COLORS[segment];
    var fade = Math.max(30, 100 - dist * 2);
    ctx.set(i, c[0], c[1], fade);
  }
},
meta: { name: 'usa-snake' }
};
})()`
  },
  {
    name: 'Heartbeat',
    gradient: 'radial-gradient(circle, #BF0A30 40%, #002868)',
    code: `(function(){
${USA_COLORS_CODE}
return {
render: function(ctx) {
  var beat = Math.pow(Math.sin(ctx.t * 3.14), 2);
  var cx = (ctx.cols - 1) / 2;
  var cy = (ctx.rows - 1) / 2;
  for (var i = 0; i < ctx.count; i++) {
    var row = Math.floor(i / ctx.cols);
    var col = i % ctx.cols;
    var dx = (col - cx) / cx;
    var dy = (row - cy) / cy;
    var dist = Math.sqrt(dx * dx + dy * dy);
    var threshold = 0.3 + beat * 0.5;
    if (dist < threshold * 0.4) {
      ctx.set(i, WHITE[0], WHITE[1], 100);
    } else if (dist < threshold) {
      ctx.set(i, RED[0], RED[1], 100 - (dist - threshold * 0.4) * 100);
    } else {
      ctx.set(i, BLUE[0], BLUE[1], 50 - dist * 10);
    }
  }
},
meta: { name: 'usa-heartbeat' }
};
})()`
  },
  {
    name: 'Matrix',
    gradient: 'linear-gradient(180deg, #002868, #FFFFFF, #002868)',
    code: `(function(){
${USA_COLORS_CODE}
return {
render: function(ctx) {
  for (var i = 0; i < ctx.count; i++) {
    var row = Math.floor(i / ctx.cols);
    var col = i % ctx.cols;
    var drop = (ctx.t * 3 + col * 1.7) % ctx.rows;
    var dist = (row - drop + ctx.rows) % ctx.rows;
    if (dist < 1) {
      ctx.set(i, WHITE[0], WHITE[1], 100);
    } else if (dist < 3) {
      ctx.set(i, RED[0], RED[1], 90 - dist * 20);
    } else {
      ctx.set(i, BLUE[0], BLUE[1], Math.max(20, 50 - dist * 5));
    }
  }
},
meta: { name: 'usa-matrix' }
};
})()`
  },
  {
    name: 'Weave',
    gradient: 'linear-gradient(45deg, #BF0A30 25%, #FFFFFF 25% 50%, #002868 50% 75%, #FFFFFF 75%)',
    code: `(function(){
${USA_COLORS_CODE}
${lerpColorCode()}
return {
render: function(ctx) {
  for (var i = 0; i < ctx.count; i++) {
    var row = Math.floor(i / ctx.cols);
    var col = i % ctx.cols;
    var warpX = Math.sin(row * 0.8 + ctx.t * 2) * 0.3;
    var warpY = Math.cos(col * 0.8 + ctx.t * 1.5) * 0.3;
    var pos = ((col / ctx.cols + warpX) + (row / ctx.rows + warpY)) / 2;
    var c = colorAt(pos + ctx.t * 0.1);
    ctx.set(i, c[0], c[1], c[2]);
  }
},
meta: { name: 'usa-weave' }
};
})()`
  },
  {
    name: 'Beacon',
    gradient: 'radial-gradient(circle at 50% 50%, #FFFFFF 10%, #BF0A30 30%, #002868)',
    code: `(function(){
${USA_COLORS_CODE}
return {
render: function(ctx) {
  var cx = (ctx.cols - 1) / 2;
  var cy = (ctx.rows - 1) / 2;
  var bx = cx + Math.cos(ctx.t * 1.2) * cx * 0.6;
  var by = cy + Math.sin(ctx.t * 1.2) * cy * 0.6;
  for (var i = 0; i < ctx.count; i++) {
    var row = Math.floor(i / ctx.cols);
    var col = i % ctx.cols;
    var dx = col - bx;
    var dy = row - by;
    var dist = Math.sqrt(dx * dx + dy * dy);
    if (dist < 1.2) {
      ctx.set(i, WHITE[0], WHITE[1], 100);
    } else if (dist < 2.5) {
      ctx.set(i, RED[0], RED[1], 100 - (dist - 1.2) * 50);
    } else {
      ctx.set(i, BLUE[0], BLUE[1], 50);
    }
  }
},
meta: { name: 'usa-beacon' }
};
})()`
  },
  {
    name: 'Curtain',
    gradient: 'linear-gradient(90deg, #002868, #BF0A30, #FFFFFF, #BF0A30, #002868)',
    code: `(function(){
${USA_COLORS_CODE}
${lerpColorCode()}
return {
render: function(ctx) {
  var open = (Math.sin(ctx.t * 0.8) + 1) / 2;
  var mid = ctx.cols / 2;
  for (var i = 0; i < ctx.count; i++) {
    var row = Math.floor(i / ctx.cols);
    var col = i % ctx.cols;
    var distFromMid = Math.abs(col - mid) / mid;
    var curtainEdge = open;
    if (distFromMid < curtainEdge) {
      var pos = row / ctx.rows + ctx.t * 0.05;
      var c = colorAt(pos);
      ctx.set(i, c[0], c[1], c[2]);
    } else {
      ctx.set(i, BLUE[0], BLUE[1], 30 + distFromMid * 30);
    }
  }
},
meta: { name: 'usa-curtain' }
};
})()`
  },
  {
    name: 'Bloom',
    gradient: 'radial-gradient(circle, #BF0A30, #FFFFFF 50%, #002868)',
    code: `(function(){
${USA_COLORS_CODE}
${lerpColorCode()}
return {
render: function(ctx) {
  var cx = (ctx.cols - 1) / 2;
  var cy = (ctx.rows - 1) / 2;
  var radius = ((Math.sin(ctx.t * 1.2) + 1) / 2) * 1.5;
  for (var i = 0; i < ctx.count; i++) {
    var row = Math.floor(i / ctx.cols);
    var col = i % ctx.cols;
    var dx = (col - cx) / cx;
    var dy = (row - cy) / cy;
    var dist = Math.sqrt(dx * dx + dy * dy);
    var pos = (dist - radius + ctx.t * 0.2) % 1;
    if (pos < 0) pos += 1;
    var c = colorAt(pos);
    ctx.set(i, c[0], c[1], c[2]);
  }
},
meta: { name: 'usa-bloom' }
};
})()`
  },
  {
    name: 'Zigzag',
    gradient: 'linear-gradient(135deg, #BF0A30, #FFFFFF, #002868, #FFFFFF, #BF0A30)',
    code: `(function(){
${USA_COLORS_CODE}
${lerpColorCode()}
return {
render: function(ctx) {
  for (var i = 0; i < ctx.count; i++) {
    var row = Math.floor(i / ctx.cols);
    var col = i % ctx.cols;
    var zigzag = col + (row % 2 === 0 ? 1 : -1) * Math.sin(ctx.t * 2 + row) * 2;
    var pos = (zigzag / ctx.cols + ctx.t * 0.15) % 1;
    if (pos < 0) pos += 1;
    var c = colorAt(pos);
    ctx.set(i, c[0], c[1], c[2]);
  }
},
meta: { name: 'usa-zigzag' }
};
})()`
  },
  {
    name: 'Comet',
    gradient: 'linear-gradient(225deg, #FFFFFF, #BF0A30, #002868)',
    code: `(function(){
${USA_COLORS_CODE}
return {
render: function(ctx) {
  var cx = (ctx.cols - 1) / 2;
  var cy = (ctx.rows - 1) / 2;
  var angle = ctx.t * 1.5;
  var hx = cx + Math.cos(angle) * cx * 0.9;
  var hy = cy + Math.sin(angle) * cy * 0.9;
  for (var i = 0; i < ctx.count; i++) {
    var row = Math.floor(i / ctx.cols);
    var col = i % ctx.cols;
    var dx = col - hx;
    var dy = row - hy;
    var dist = Math.sqrt(dx * dx + dy * dy);
    if (dist < 0.8) {
      ctx.set(i, WHITE[0], WHITE[1], 100);
    } else if (dist < 2.5) {
      ctx.set(i, RED[0], RED[1], 100 - (dist - 0.8) * 40);
    } else {
      var trail = Math.max(0, 1 - dist * 0.15);
      ctx.set(i, BLUE[0], BLUE[1], 30 + trail * 30);
    }
  }
},
meta: { name: 'usa-comet' }
};
})()`
  },
  {
    name: 'Plasma',
    gradient: 'radial-gradient(ellipse, #BF0A30, #FFFFFF, #002868)',
    code: `(function(){
${USA_COLORS_CODE}
${lerpColorCode()}
return {
render: function(ctx) {
  for (var i = 0; i < ctx.count; i++) {
    var row = Math.floor(i / ctx.cols);
    var col = i % ctx.cols;
    var v1 = Math.sin(col * 0.8 + ctx.t * 1.5);
    var v2 = Math.sin(row * 0.8 + ctx.t * 1.2);
    var v3 = Math.sin((col + row) * 0.5 + ctx.t);
    var v4 = Math.sin(Math.sqrt(col * col + row * row) * 0.5 - ctx.t * 0.8);
    var pos = (v1 + v2 + v3 + v4 + 4) / 8;
    var c = colorAt(pos);
    ctx.set(i, c[0], c[1], c[2]);
  }
},
meta: { name: 'usa-plasma' }
};
})()`
  },
  {
    name: 'Flag Wave',
    gradient: 'linear-gradient(180deg, #BF0A30, #FFFFFF, #BF0A30, #002868)',
    code: `(function(){
${USA_COLORS_CODE}
return {
render: function(ctx) {
  var cantonCols = 3;
  var cantonRows = 4;
  for (var i = 0; i < ctx.count; i++) {
    var row = Math.floor(i / ctx.cols);
    var col = i % ctx.cols;
    var wave = Math.sin(col * 0.9 + ctx.t * 3) * 0.5;
    var adjRow = row + wave;
    var r = Math.floor(adjRow);
    if (r < cantonRows && col < cantonCols) {
      var star = (r + col) % 2 === 0;
      var twinkle = Math.sin(ctx.t * 5 + col * 2 + r * 3) > 0;
      if (star && twinkle) { ctx.set(i, WHITE[0], WHITE[1], 100); }
      else { ctx.set(i, BLUE[0], BLUE[1], BLUE[2]); }
    } else {
      var stripe = Math.floor(adjRow) % 2;
      if (stripe === 0) { ctx.set(i, RED[0], RED[1], RED[2]); }
      else { ctx.set(i, WHITE[0], WHITE[1], WHITE[2]); }
    }
  }
},
meta: { name: 'usa-flag-wave' }
};
})()`
  },
  {
    name: 'Flag Scroll',
    gradient: 'linear-gradient(90deg, #002868 30%, #BF0A30 30% 65%, #FFFFFF 65%)',
    code: `(function(){
${USA_COLORS_CODE}
return {
render: function(ctx) {
  var cantonCols = 3;
  var cantonRows = 4;
  var scrollOffset = Math.floor(ctx.t * 2) % ctx.cols;
  for (var i = 0; i < ctx.count; i++) {
    var row = Math.floor(i / ctx.cols);
    var col = (i % ctx.cols + scrollOffset) % ctx.cols;
    if (row < cantonRows && col < cantonCols) {
      var star = (row + col) % 2 === 0;
      if (star) { ctx.set(i, WHITE[0], WHITE[1], 100); }
      else { ctx.set(i, BLUE[0], BLUE[1], BLUE[2]); }
    } else {
      var stripe = row % 2 === 0;
      if (stripe) { ctx.set(i, RED[0], RED[1], RED[2]); }
      else { ctx.set(i, WHITE[0], WHITE[1], WHITE[2]); }
    }
  }
},
meta: { name: 'usa-flag-scroll' }
};
})()`
  },
  {
    name: 'Flag Reveal',
    gradient: 'linear-gradient(90deg, transparent, #BF0A30, #FFFFFF, #002868)',
    code: `(function(){
${USA_COLORS_CODE}
return {
render: function(ctx) {
  var cantonCols = 3;
  var cantonRows = 4;
  var reveal = ((ctx.t * 0.5) % 2);
  var edge = reveal > 1 ? (2 - reveal) * ctx.cols : reveal * ctx.cols;
  for (var i = 0; i < ctx.count; i++) {
    var row = Math.floor(i / ctx.cols);
    var col = i % ctx.cols;
    if (col > edge) {
      ctx.set(i, 0, 0, 0);
    } else if (row < cantonRows && col < cantonCols) {
      var star = (row + col) % 2 === 0;
      if (star) { ctx.set(i, WHITE[0], WHITE[1], 100); }
      else { ctx.set(i, BLUE[0], BLUE[1], BLUE[2]); }
    } else {
      var stripe = row % 2 === 0;
      if (stripe) { ctx.set(i, RED[0], RED[1], RED[2]); }
      else { ctx.set(i, WHITE[0], WHITE[1], WHITE[2]); }
    }
  }
},
meta: { name: 'usa-flag-reveal' }
};
})()`
  },
  {
    name: 'Flag Pulse',
    gradient: 'radial-gradient(circle, #FFFFFF 20%, #BF0A30 50%, #002868)',
    code: `(function(){
${USA_COLORS_CODE}
return {
render: function(ctx) {
  var cantonCols = 3;
  var cantonRows = 4;
  var pulse = 70 + 30 * Math.sin(ctx.t * 2.5);
  for (var i = 0; i < ctx.count; i++) {
    var row = Math.floor(i / ctx.cols);
    var col = i % ctx.cols;
    if (row < cantonRows && col < cantonCols) {
      var star = (row + col) % 2 === 0;
      if (star) { ctx.set(i, WHITE[0], WHITE[1], pulse); }
      else { ctx.set(i, BLUE[0], BLUE[1], pulse * 0.7); }
    } else {
      var stripe = row % 2 === 0;
      if (stripe) { ctx.set(i, RED[0], RED[1], pulse); }
      else { ctx.set(i, WHITE[0], WHITE[1], pulse); }
    }
  }
},
meta: { name: 'usa-flag-pulse' }
};
})()`
  },
  {
    name: 'Bars Scroll',
    gradient: 'linear-gradient(180deg, #BF0A30, #FFFFFF, #002868, #FFFFFF, #BF0A30)',
    code: `(function(){
${USA_COLORS_CODE}
return {
render: function(ctx) {
  for (var i = 0; i < ctx.count; i++) {
    var row = Math.floor(i / ctx.cols);
    var shifted = (row + Math.floor(ctx.t * 3)) % ctx.rows;
    var zone = Math.floor(shifted / ctx.rows * 3);
    if (zone >= 3) zone = 2;
    var c = COLORS[zone];
    ctx.set(i, c[0], c[1], c[2]);
  }
},
meta: { name: 'usa-bars-scroll' }
};
})()`
  },
  {
    name: 'Column March',
    gradient: 'linear-gradient(90deg, #BF0A30, #FFFFFF, #002868, #FFFFFF, #BF0A30)',
    code: `(function(){
${USA_COLORS_CODE}
return {
render: function(ctx) {
  for (var i = 0; i < ctx.count; i++) {
    var col = i % ctx.cols;
    var shifted = (col + Math.floor(ctx.t * 4)) % ctx.cols;
    var zone = Math.floor(shifted / ctx.cols * 3);
    if (zone >= 3) zone = 2;
    var c = COLORS[zone];
    ctx.set(i, c[0], c[1], c[2]);
  }
},
meta: { name: 'usa-column-march' }
};
})()`
  },
  {
    name: 'Alternator',
    gradient: 'linear-gradient(90deg, #BF0A30 33%, #002868 66%, #FFFFFF)',
    code: `(function(){
${USA_COLORS_CODE}
return {
render: function(ctx) {
  var phase = Math.floor(ctx.t * 2) % 3;
  for (var i = 0; i < ctx.count; i++) {
    var row = Math.floor(i / ctx.cols);
    var col = i % ctx.cols;
    var idx = (row + col + phase) % 3;
    var c = COLORS[idx];
    ctx.set(i, c[0], c[1], c[2]);
  }
},
meta: { name: 'usa-alternator' }
};
})()`
  },
  {
    name: 'Spotlight',
    gradient: 'radial-gradient(circle, #FFFFFF, #BF0A30 60%, #002868)',
    code: `(function(){
${USA_COLORS_CODE}
return {
render: function(ctx) {
  var cx = (ctx.cols - 1) / 2;
  var cy = (ctx.rows - 1) / 2;
  var sx = cx + Math.cos(ctx.t * 1.0) * cx * 0.7;
  var sy = cy + Math.sin(ctx.t * 1.3) * cy * 0.7;
  for (var i = 0; i < ctx.count; i++) {
    var row = Math.floor(i / ctx.cols);
    var col = i % ctx.cols;
    var dx = col - sx;
    var dy = row - sy;
    var dist = Math.sqrt(dx * dx + dy * dy);
    if (dist < 1.0) { ctx.set(i, WHITE[0], WHITE[1], 100); }
    else if (dist < 2.5) { ctx.set(i, RED[0], RED[1], 100); }
    else { ctx.set(i, BLUE[0], BLUE[1], 70); }
  }
},
meta: { name: 'usa-spotlight' }
};
})()`
  },
  {
    name: 'Blink Grid',
    gradient: 'linear-gradient(135deg, #BF0A30 33%, #FFFFFF 33% 66%, #002868 66%)',
    code: `(function(){
${USA_COLORS_CODE}
return {
render: function(ctx) {
  var tick = Math.floor(ctx.t * 4);
  for (var i = 0; i < ctx.count; i++) {
    var row = Math.floor(i / ctx.cols);
    var col = i % ctx.cols;
    var idx = (row * 3 + col * 7 + tick) % 3;
    var bright = 70 + 30 * Math.abs(Math.sin(ctx.t * 3 + i * 0.3));
    var c = COLORS[idx];
    ctx.set(i, c[0], c[1], bright);
  }
},
meta: { name: 'usa-blink-grid' }
};
})()`
  },
  {
    name: 'Waterfall',
    gradient: 'linear-gradient(180deg, #FFFFFF, #BF0A30, #002868)',
    code: `(function(){
${USA_COLORS_CODE}
return {
render: function(ctx) {
  for (var i = 0; i < ctx.count; i++) {
    var row = Math.floor(i / ctx.cols);
    var col = i % ctx.cols;
    var fall = (row + ctx.t * 4 + col * 0.5) % ctx.rows;
    var zone = Math.floor(fall / ctx.rows * 3);
    if (zone >= 3) zone = 2;
    var c = COLORS[zone];
    var bright = 70 + 30 * (1 - fall / ctx.rows);
    ctx.set(i, c[0], c[1], bright);
  }
},
meta: { name: 'usa-waterfall' }
};
})()`
  },
  {
    name: 'Disco USA',
    gradient: 'conic-gradient(#BF0A30 33%, #FFFFFF 33% 66%, #002868 66%)',
    code: `(function(){
${USA_COLORS_CODE}
return {
render: function(ctx) {
  var tick = Math.floor(ctx.t * 8);
  for (var i = 0; i < ctx.count; i++) {
    var row = Math.floor(i / ctx.cols);
    var col = i % ctx.cols;
    var hash = (tick * 17 + row * 31 + col * 13) % 100;
    var on = hash < 40;
    if (on) {
      var colorIdx = (tick + row + col) % 3;
      var c = COLORS[colorIdx];
      ctx.set(i, c[0], c[1], 100);
    } else {
      ctx.set(i, BLUE[0], BLUE[1], 25);
    }
  }
},
meta: { name: 'usa-disco' }
};
})()`
  },
  {
    name: 'Expanding Rings',
    gradient: 'radial-gradient(circle, #BF0A30, #FFFFFF, #002868, #BF0A30)',
    code: `(function(){
${USA_COLORS_CODE}
return {
render: function(ctx) {
  var cx = (ctx.cols - 1) / 2;
  var cy = (ctx.rows - 1) / 2;
  for (var i = 0; i < ctx.count; i++) {
    var row = Math.floor(i / ctx.cols);
    var col = i % ctx.cols;
    var dx = col - cx;
    var dy = row - cy;
    var dist = Math.sqrt(dx * dx + dy * dy);
    var ring = (dist - ctx.t * 2 + 20) % 3;
    if (ring < 0) ring += 3;
    var zone = Math.floor(ring);
    if (zone >= 3) zone = 2;
    var c = COLORS[zone];
    ctx.set(i, c[0], c[1], 100);
  }
},
meta: { name: 'usa-expanding-rings' }
};
})()`
  },
  {
    name: 'Pendulum',
    gradient: 'linear-gradient(90deg, #BF0A30, #FFFFFF, #002868)',
    code: `(function(){
${USA_COLORS_CODE}
return {
render: function(ctx) {
  var swing = Math.sin(ctx.t * 1.5) * ctx.cols * 0.4;
  var center = (ctx.cols - 1) / 2 + swing;
  for (var i = 0; i < ctx.count; i++) {
    var col = i % ctx.cols;
    var dist = Math.abs(col - center);
    if (dist < 1) { ctx.set(i, WHITE[0], WHITE[1], 100); }
    else if (dist < 3) { ctx.set(i, RED[0], RED[1], 100); }
    else { ctx.set(i, BLUE[0], BLUE[1], 70); }
  }
},
meta: { name: 'usa-pendulum' }
};
})()`
  },
  {
    name: 'Ticker',
    gradient: 'linear-gradient(90deg, #BF0A30 25%, #FFFFFF 50%, #002868 75%)',
    code: `(function(){
${USA_COLORS_CODE}
return {
render: function(ctx) {
  var offset = ctx.t * 5;
  for (var i = 0; i < ctx.count; i++) {
    var col = i % ctx.cols;
    var pos = ((col + offset) % ctx.cols + ctx.cols) % ctx.cols;
    var zone = Math.floor(pos / ctx.cols * 3);
    if (zone >= 3) zone = 2;
    var c = COLORS[zone];
    ctx.set(i, c[0], c[1], 100);
  }
},
meta: { name: 'usa-ticker' }
};
})()`
  },
  {
    name: 'Crossfade',
    gradient: 'linear-gradient(180deg, #BF0A30, #002868)',
    code: `(function(){
${USA_COLORS_CODE}
return {
render: function(ctx) {
  var phase = Math.floor(ctx.t * 0.7) % 3;
  var mix = (ctx.t * 0.7) % 1;
  var bright = 70 + 30 * (mix < 0.5 ? mix * 2 : (1 - mix) * 2);
  var c = COLORS[phase];
  for (var i = 0; i < ctx.count; i++) {
    ctx.set(i, c[0], c[1], bright);
  }
},
meta: { name: 'usa-crossfade' }
};
})()`
  },
  {
    name: 'Tri Flash',
    gradient: 'linear-gradient(90deg, #BF0A30, #FFFFFF, #002868)',
    code: `(function(){
${USA_COLORS_CODE}
return {
render: function(ctx) {
  var phase = Math.floor(ctx.t * 3) % 3;
  var c = COLORS[phase];
  for (var i = 0; i < ctx.count; i++) {
    ctx.set(i, c[0], c[1], 100);
  }
},
meta: { name: 'usa-tri-flash' }
};
})()`
  },
  {
    name: 'Chaser',
    gradient: 'linear-gradient(90deg, #FFFFFF 10%, #BF0A30 40%, #002868)',
    code: `(function(){
${USA_COLORS_CODE}
return {
render: function(ctx) {
  var head = Math.floor(ctx.t * 6) % ctx.count;
  for (var i = 0; i < ctx.count; i++) {
    var dist = (i - head + ctx.count) % ctx.count;
    if (dist < 3) { ctx.set(i, WHITE[0], WHITE[1], 100); }
    else if (dist < 10) { ctx.set(i, RED[0], RED[1], 100 - (dist - 3) * 8); }
    else { ctx.set(i, BLUE[0], BLUE[1], 50); }
  }
},
meta: { name: 'usa-chaser' }
};
})()`
  },
  {
    name: 'Rain',
    gradient: 'linear-gradient(180deg, #002868, #FFFFFF 50%, #BF0A30)',
    code: `(function(){
${USA_COLORS_CODE}
return {
render: function(ctx) {
  for (var i = 0; i < ctx.count; i++) {
    var row = Math.floor(i / ctx.cols);
    var col = i % ctx.cols;
    var drop = (row + Math.floor(ctx.t * 6) + col * 3) % ctx.rows;
    if (drop === 0) { ctx.set(i, WHITE[0], WHITE[1], 100); }
    else if (drop < 2) { ctx.set(i, RED[0], RED[1], 80); }
    else { ctx.set(i, BLUE[0], BLUE[1], 40 + row * 5); }
  }
},
meta: { name: 'usa-rain' }
};
})()`
  },
  {
    name: 'Scan Line',
    gradient: 'linear-gradient(180deg, #FFFFFF 5%, #BF0A30 50%, #002868)',
    code: `(function(){
${USA_COLORS_CODE}
return {
render: function(ctx) {
  var scanRow = Math.floor(ctx.t * 3) % ctx.rows;
  for (var i = 0; i < ctx.count; i++) {
    var row = Math.floor(i / ctx.cols);
    if (row === scanRow) { ctx.set(i, WHITE[0], WHITE[1], 100); }
    else if (Math.abs(row - scanRow) === 1) { ctx.set(i, RED[0], RED[1], 90); }
    else { ctx.set(i, BLUE[0], BLUE[1], 50); }
  }
},
meta: { name: 'usa-scan-line' }
};
})()`
  },
  {
    name: 'Bounce Ball',
    gradient: 'radial-gradient(circle at 50% 80%, #FFFFFF 10%, #BF0A30 30%, #002868)',
    code: `(function(){
${USA_COLORS_CODE}
return {
render: function(ctx) {
  var bx = (ctx.cols - 1) / 2 + Math.sin(ctx.t * 1.7) * 2.5;
  var by = (ctx.rows - 1) / 2 + Math.sin(ctx.t * 2.3) * 2.5;
  for (var i = 0; i < ctx.count; i++) {
    var row = Math.floor(i / ctx.cols);
    var col = i % ctx.cols;
    var dx = col - bx;
    var dy = row - by;
    var dist = Math.sqrt(dx * dx + dy * dy);
    if (dist < 1.0) { ctx.set(i, WHITE[0], WHITE[1], 100); }
    else if (dist < 2.2) { ctx.set(i, RED[0], RED[1], 100); }
    else { ctx.set(i, BLUE[0], BLUE[1], 60); }
  }
},
meta: { name: 'usa-bounce-ball' }
};
})()`
  },
  {
    name: 'Flag Breathe',
    gradient: 'linear-gradient(180deg, #002868 40%, #BF0A30 60%, #FFFFFF)',
    code: `(function(){
${USA_COLORS_CODE}
return {
render: function(ctx) {
  var breath = 60 + 40 * Math.sin(ctx.t * 1.5);
  for (var i = 0; i < ctx.count; i++) {
    var row = Math.floor(i / ctx.cols);
    var col = i % ctx.cols;
    if (row < 4 && col < 3) {
      var star = (row + col) % 2 === 0;
      if (star) { ctx.set(i, WHITE[0], WHITE[1], breath); }
      else { ctx.set(i, BLUE[0], BLUE[1], breath * 0.7); }
    } else {
      if (row % 2 === 0) { ctx.set(i, RED[0], RED[1], breath); }
      else { ctx.set(i, WHITE[0], WHITE[1], breath); }
    }
  }
},
meta: { name: 'usa-flag-breathe' }
};
})()`
  },
  {
    name: 'Flag Twinkle',
    gradient: 'linear-gradient(180deg, #002868 40%, #BF0A30 60%, #FFFFFF)',
    code: `(function(){
${USA_COLORS_CODE}
return {
render: function(ctx) {
  for (var i = 0; i < ctx.count; i++) {
    var row = Math.floor(i / ctx.cols);
    var col = i % ctx.cols;
    if (row < 4 && col < 3) {
      var twinkle = Math.sin(ctx.t * 4 + row * 2.7 + col * 3.1) > 0.3;
      if (twinkle) { ctx.set(i, WHITE[0], WHITE[1], 100); }
      else { ctx.set(i, BLUE[0], BLUE[1], BLUE[2]); }
    } else {
      if (row % 2 === 0) { ctx.set(i, RED[0], RED[1], RED[2]); }
      else { ctx.set(i, WHITE[0], WHITE[1], WHITE[2]); }
    }
  }
},
meta: { name: 'usa-flag-twinkle' }
};
})()`
  },
  {
    name: 'Flag Build',
    gradient: 'linear-gradient(0deg, #BF0A30, #FFFFFF, #002868)',
    code: `(function(){
${USA_COLORS_CODE}
return {
render: function(ctx) {
  var progress = (ctx.t * 0.4) % 2;
  var rowsVisible = progress > 1 ? ctx.rows : Math.floor(progress * ctx.rows);
  for (var i = 0; i < ctx.count; i++) {
    var row = Math.floor(i / ctx.cols);
    var col = i % ctx.cols;
    if (ctx.rows - 1 - row >= rowsVisible) {
      ctx.set(i, 0, 0, 0);
    } else if (row < 4 && col < 3) {
      var star = (row + col) % 2 === 0;
      if (star) { ctx.set(i, WHITE[0], WHITE[1], 100); }
      else { ctx.set(i, BLUE[0], BLUE[1], BLUE[2]); }
    } else {
      if (row % 2 === 0) { ctx.set(i, RED[0], RED[1], RED[2]); }
      else { ctx.set(i, WHITE[0], WHITE[1], WHITE[2]); }
    }
  }
},
meta: { name: 'usa-flag-build' }
};
})()`
  },
  {
    name: 'Salute',
    gradient: 'linear-gradient(90deg, #002868 33%, #FFFFFF 33% 66%, #BF0A30 66%)',
    code: `(function(){
${USA_COLORS_CODE}
return {
render: function(ctx) {
  var sweep = Math.floor(ctx.t * 2) % (ctx.cols * 2);
  for (var i = 0; i < ctx.count; i++) {
    var row = Math.floor(i / ctx.cols);
    var col = i % ctx.cols;
    var lit = col <= sweep;
    if (!lit) { ctx.set(i, 0, 0, 5); }
    else if (row < 4 && col < 3) {
      var star = (row + col) % 2 === 0;
      if (star) { ctx.set(i, WHITE[0], WHITE[1], 100); }
      else { ctx.set(i, BLUE[0], BLUE[1], BLUE[2]); }
    } else {
      if (row % 2 === 0) { ctx.set(i, RED[0], RED[1], RED[2]); }
      else { ctx.set(i, WHITE[0], WHITE[1], WHITE[2]); }
    }
  }
},
meta: { name: 'usa-salute' }
};
})()`
  },
  {
    name: 'Dual Sweep',
    gradient: 'linear-gradient(90deg, #BF0A30, #FFFFFF, #002868, #FFFFFF, #BF0A30)',
    code: `(function(){
${USA_COLORS_CODE}
return {
render: function(ctx) {
  var pos = (ctx.t * 3) % (ctx.cols * 2);
  var col1 = pos < ctx.cols ? Math.floor(pos) : ctx.cols - 1 - Math.floor(pos - ctx.cols);
  for (var i = 0; i < ctx.count; i++) {
    var col = i % ctx.cols;
    if (col === col1) { ctx.set(i, WHITE[0], WHITE[1], 100); }
    else if (Math.abs(col - col1) === 1) { ctx.set(i, RED[0], RED[1], 100); }
    else { ctx.set(i, BLUE[0], BLUE[1], 60); }
  }
},
meta: { name: 'usa-dual-sweep' }
};
})()`
  },
  {
    name: 'Sparklers',
    gradient: 'radial-gradient(circle, #FFFFFF 5%, #BF0A30 30%, #002868)',
    code: `(function(){
${USA_COLORS_CODE}
return {
render: function(ctx) {
  for (var i = 0; i < ctx.count; i++) {
    var row = Math.floor(i / ctx.cols);
    var col = i % ctx.cols;
    var spark = Math.sin(ctx.t * 8 + row * 3.7 + col * 5.3);
    if (spark > 0.9) { ctx.set(i, WHITE[0], WHITE[1], 100); }
    else if (spark > 0.5) { ctx.set(i, RED[0], RED[1], 90); }
    else if (spark > 0) { ctx.set(i, RED[0], RED[1], 60); }
    else { ctx.set(i, BLUE[0], BLUE[1], 40 + Math.abs(spark) * 30); }
  }
},
meta: { name: 'usa-sparklers' }
};
})()`
  },
  {
    name: 'Ripple Out',
    gradient: 'radial-gradient(circle, #FFFFFF, #BF0A30 40%, #002868)',
    code: `(function(){
${USA_COLORS_CODE}
return {
render: function(ctx) {
  var cx = (ctx.cols - 1) / 2;
  var cy = (ctx.rows - 1) / 2;
  for (var i = 0; i < ctx.count; i++) {
    var row = Math.floor(i / ctx.cols);
    var col = i % ctx.cols;
    var dx = col - cx; var dy = row - cy;
    var dist = Math.sqrt(dx * dx + dy * dy);
    var wave = (dist * 2 - ctx.t * 4 + 50) % 3;
    if (wave < 0) wave += 3;
    var zone = Math.floor(wave);
    if (zone >= 3) zone = 2;
    var c = COLORS[zone];
    ctx.set(i, c[0], c[1], 100);
  }
},
meta: { name: 'usa-ripple-out' }
};
})()`
  },
  {
    name: 'Ladder',
    gradient: 'linear-gradient(180deg, #BF0A30 33%, #FFFFFF 33% 66%, #002868 66%)',
    code: `(function(){
${USA_COLORS_CODE}
return {
render: function(ctx) {
  var step = Math.floor(ctx.t * 3) % ctx.rows;
  for (var i = 0; i < ctx.count; i++) {
    var row = Math.floor(i / ctx.cols);
    var shifted = (row + step) % ctx.rows;
    var zone = Math.floor(shifted / ctx.rows * 3);
    if (zone >= 3) zone = 2;
    var c = COLORS[zone];
    ctx.set(i, c[0], c[1], 100);
  }
},
meta: { name: 'usa-ladder' }
};
})()`
  },
  {
    name: 'Split Flash',
    gradient: 'linear-gradient(90deg, #BF0A30 50%, #002868 50%)',
    code: `(function(){
${USA_COLORS_CODE}
return {
render: function(ctx) {
  var phase = Math.floor(ctx.t * 2) % 4;
  var mid = Math.floor(ctx.cols / 2);
  for (var i = 0; i < ctx.count; i++) {
    var col = i % ctx.cols;
    var left = col <= mid;
    if (phase === 0) { ctx.set(i, left ? RED[0] : BLUE[0], left ? RED[1] : BLUE[1], left ? RED[2] : BLUE[2]); }
    else if (phase === 1) { ctx.set(i, WHITE[0], WHITE[1], 100); }
    else if (phase === 2) { ctx.set(i, left ? BLUE[0] : RED[0], left ? BLUE[1] : RED[1], left ? BLUE[2] : RED[2]); }
    else { ctx.set(i, WHITE[0], WHITE[1], 100); }
  }
},
meta: { name: 'usa-split-flash' }
};
})()`
  },
  {
    name: 'Wave Rows',
    gradient: 'linear-gradient(180deg, #BF0A30, #FFFFFF, #002868)',
    code: `(function(){
${USA_COLORS_CODE}
return {
render: function(ctx) {
  for (var i = 0; i < ctx.count; i++) {
    var row = Math.floor(i / ctx.cols);
    var col = i % ctx.cols;
    var wave = Math.sin(col * 1.0 + ctx.t * 2.5 + row * 0.5);
    var bright = 70 + 30 * (0.5 + 0.5 * wave);
    var zone = row % 3;
    var c = COLORS[zone];
    ctx.set(i, c[0], c[1], bright);
  }
},
meta: { name: 'usa-wave-rows' }
};
})()`
  },
  {
    name: 'Starburst',
    gradient: 'conic-gradient(#BF0A30, #FFFFFF, #002868, #FFFFFF, #BF0A30, #FFFFFF, #002868, #FFFFFF)',
    code: `(function(){
${USA_COLORS_CODE}
return {
render: function(ctx) {
  var cx = (ctx.cols - 1) / 2;
  var cy = (ctx.rows - 1) / 2;
  for (var i = 0; i < ctx.count; i++) {
    var row = Math.floor(i / ctx.cols);
    var col = i % ctx.cols;
    var angle = Math.atan2(row - cy, col - cx) + Math.PI;
    var sector = Math.floor((angle + ctx.t * 1.5) / (Math.PI * 2) * 6) % 3;
    if (sector < 0) sector += 3;
    var c = COLORS[sector];
    ctx.set(i, c[0], c[1], 100);
  }
},
meta: { name: 'usa-starburst' }
};
})()`
  }
];

// ── Components ─────────────────────────────────────────────────────────

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
      className="relative overflow-hidden transition-all active:scale-93"
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
          speed={speed}
          size={tileSize}
          isPattern
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
      className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-md text-xs font-medium transition-colors"
      style={{
        background: enabled ? '#2563eb' : '#1a1a25',
        color: enabled ? '#fff' : '#888898',
        border: '1px solid ' + (enabled ? '#3b82f6' : '#2a2a35')
      }}
      title={enabled ? 'Hide previews' : 'Show animated previews'}
    >
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
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

export function UsaTab({
  send,
  activePattern,
  onPatternSelect,
  animSpeed,
  onAnimSpeed
}: {
  send: (msg: Record<string, unknown>) => void;
  activePattern: string | null;
  onPatternSelect: (id: string) => void;
  animSpeed: number;
  onAnimSpeed: (v: number) => void;
}) {
  const [showPreview, setShowPreview] = useState(true);

  const handleSelect = useCallback((groupPrefix: string, pattern: PatternDef) => {
    const id = `${groupPrefix}-${pattern.name}`;
    onPatternSelect(id);
    send({ type: 'evalPattern', code: pattern.code, params: {} });
  }, [send, onPatternSelect]);

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center gap-3 px-2">
        <span className="text-xs font-medium shrink-0" style={{ color: '#888898', textTransform: 'uppercase', letterSpacing: '0.05em', fontSize: 11 }}>
          Speed
        </span>
        <input
          type="range"
          className="flex-1"
          style={{ minWidth: 120, height: 28 }}
          min={0}
          max={1000}
          value={Math.round(Math.log(animSpeed / 0.001) / Math.log(5.0 / 0.001) * 1000)}
          onChange={(e) => {
            const t = parseInt(e.target.value, 10) / 1000;
            onAnimSpeed(0.001 * Math.pow(5.0 / 0.001, t));
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
      <ControlGrid minCellWidth={200}>
        <ControlGroup label="USA 250 — Static">
          <div className="flex gap-2.5 flex-wrap overflow-y-auto" style={{ maxHeight: showPreview ? 320 : undefined }}>
            {USA_STATIC.map((p) => (
              <PatternTile
                key={`usa-s-${p.name}`}
                pattern={p}
                active={activePattern === `usa-s-${p.name}`}
                onClick={() => handleSelect('usa-s', p)}
                showPreview={showPreview}
                speed={animSpeed}
              />
            ))}
          </div>
        </ControlGroup>

        <ControlGroup label="USA 250 — Animated">
          <div className="flex gap-2.5 flex-wrap overflow-y-auto" style={{ maxHeight: showPreview ? 320 : undefined }}>
            {USA_ANIMATED.map((p) => (
              <PatternTile
                key={`usa-${p.name}`}
                pattern={p}
                active={activePattern === `usa-${p.name}`}
                onClick={() => handleSelect('usa', p)}
                showPreview={showPreview}
                speed={animSpeed}
              />
            ))}
          </div>
        </ControlGroup>
      </ControlGrid>
    </div>
  );
}
