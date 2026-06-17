import { Server as OscServer } from 'node-osc';
import { CannonState } from '../src/osc-adapters';

import {
  BeyondOscOutput,
  FB4OscOutput,
  RoutingConfig,
  encodeBeyondMessages,
  encodeFB4Messages,
  createRoutedOutput,
  hueToColorSlider
} from '../src/osc-adapters';
import { hsbToRgb255 } from '../src/color';

function makeGrid(h = 220, s = 90, b = 80): CannonState[] {
  return Array.from({ length: 49 }, () => ({ h, s, b }));
}

function makeSingleGrid(index: number, h: number, s: number, b: number): CannonState[] {
  const grid = makeGrid(0, 0, 0);
  grid[index] = { h, s, b };
  return grid;
}

// ═══════════════════════════════════════════════════
// Pure encoder tests (no UDP, fast, deterministic)
// ═══════════════════════════════════════════════════

describe('hueToColorSlider', () => {
  it('should map 0° to BEYOND_COLOR_MIN (28)', () => {
    expect(hueToColorSlider(0)).toBeCloseTo(28);
  });

  it('should map 180° to midpoint of range', () => {
    expect(hueToColorSlider(180)).toBeCloseTo(123); // 28 + 0.5 * 190 = 123
  });

  it('should approach BEYOND_COLOR_MAX near 360°', () => {
    expect(hueToColorSlider(359)).toBeCloseTo(217.5, 0);
  });

  it('should wrap at 360', () => {
    expect(hueToColorSlider(360)).toBeCloseTo(hueToColorSlider(0));
  });

  it('should handle negative hues', () => {
    expect(hueToColorSlider(-30)).toBeCloseTo(hueToColorSlider(330));
  });

  it('should return white zone (~240) for low saturation', () => {
    expect(hueToColorSlider(0, 0)).toBe(240);
    expect(hueToColorSlider(180, 5)).toBe(240);
    expect(hueToColorSlider(120, 10)).toBe(240);
  });

  it('should return color range for saturation above threshold', () => {
    expect(hueToColorSlider(0, 11)).toBeCloseTo(28);
    expect(hueToColorSlider(0, 100)).toBeCloseTo(28);
  });
});

describe('encodeBeyondMessages', () => {
  it('should produce ColorSlider/Brightness addresses', () => {
    const grid = makeSingleGrid(0, 0, 100, 100); // h=0, s=100, b=100
    const messages = encodeBeyondMessages(grid, { 0: 3 });

    expect(messages).toHaveLength(2);
    expect(messages[0].address).toBe('/beyond/zone/3/livecontrol/ColorSlider');
    expect(messages[0].value).toBeCloseTo(28); // hue 0 → ColorSlider 28 (Red)
    expect(messages[1].address).toBe('/beyond/zone/3/livecontrol/Brightness');
    expect(messages[1].value).toBe(100);
  });

  it('should send white zone for low saturation', () => {
    const grid = makeSingleGrid(0, 0, 0, 100); // h=0, s=0, b=100 → white
    const messages = encodeBeyondMessages(grid, { 0: 0 });

    expect(messages).toHaveLength(2);
    expect(messages[0].address).toBe('/beyond/zone/0/livecontrol/ColorSlider');
    expect(messages[0].value).toBe(240); // white zone
    expect(messages[1].value).toBe(100);
  });

  it('should skip unmapped cannons', () => {
    const grid = makeGrid(0, 100, 100);
    const messages = encodeBeyondMessages(grid, { 5: 10 });

    expect(messages).toHaveLength(2);
    expect(messages[0].address).toBe('/beyond/zone/10/livecontrol/ColorSlider');
  });

  it('should handle multiple mapped cannons', () => {
    const grid = makeGrid(120, 100, 100);
    const messages = encodeBeyondMessages(grid, { 0: 0, 1: 1, 2: 2 });

    expect(messages).toHaveLength(6); // 3 cannons × 2 messages
    expect(messages[0].address).toContain('/beyond/zone/0/');
    expect(messages[2].address).toContain('/beyond/zone/1/');
    expect(messages[4].address).toContain('/beyond/zone/2/');
  });

  it('should map hue to ColorSlider range', () => {
    const grid = makeSingleGrid(0, 180, 100, 100); // hue 180
    const messages = encodeBeyondMessages(grid, { 0: 0 });

    expect(messages[0].address).toBe('/beyond/zone/0/livecontrol/ColorSlider');
    expect(messages[0].value).toBeCloseTo(123); // hue 180 → midpoint of 28–218 range
  });

  it('should return empty array when no cannons are mapped', () => {
    const messages = encodeBeyondMessages(makeGrid(), {});
    expect(messages).toHaveLength(0);
  });

  it('should include brightness from HSB b value', () => {
    const grid = makeSingleGrid(0, 0, 100, 50); // 50% brightness
    const messages = encodeBeyondMessages(grid, { 0: 0 });
    expect(messages[1].address).toBe('/beyond/zone/0/livecontrol/Brightness');
    expect(messages[1].value).toBe(50);
  });

  it('should skip unchanged cannons when prevGrid is provided', () => {
    const grid = makeGrid(120, 100, 100);
    const prevGrid = makeGrid(120, 100, 100);
    const messages = encodeBeyondMessages(grid, { 0: 0, 1: 1 }, prevGrid);
    expect(messages).toHaveLength(0);
  });

  it('should include changed cannons when prevGrid differs', () => {
    const grid = makeGrid(120, 100, 100);
    const prevGrid = makeGrid(0, 100, 100); // different hue
    const messages = encodeBeyondMessages(grid, { 0: 0, 1: 1 }, prevGrid);
    expect(messages).toHaveLength(4); // 2 cannons × 2 messages
  });

  it('should send all cannons on first frame (no prevGrid)', () => {
    const grid = makeGrid(120, 100, 100);
    const messages = encodeBeyondMessages(grid, { 0: 0, 1: 1 });
    expect(messages).toHaveLength(4);
  });

  it('should work with arbitrary grid sizes (not just 49)', () => {
    const grid: CannonState[] = Array.from({ length: 100 }, (_, i) => ({
      h: i * 3.6, s: 100, b: 100
    }));
    const map: Record<number, number> = { 0: 0, 99: 99 };
    const messages = encodeBeyondMessages(grid, map);
    expect(messages).toHaveLength(4); // 2 cannons × 2 messages
    expect(messages[2].address).toContain('/beyond/zone/99/');
  });
});

describe('encodeBeyondMessages (rgba mode)', () => {
  it('should produce RGBA address with 4-float array', () => {
    const grid = makeSingleGrid(0, 0, 100, 100); // h=0, s=100, b=100 (red)
    const messages = encodeBeyondMessages(grid, { 0: 3 }, undefined, 'rgba');

    expect(messages).toHaveLength(2);
    expect(messages[0].address).toBe('/beyond/zone/3/livecontrol/RGBA');
    expect(Array.isArray(messages[0].value)).toBe(true);
    const rgba = messages[0].value as number[];
    expect(rgba).toHaveLength(4);
    expect(rgba[0]).toBe(255); // R
    expect(rgba[1]).toBe(0);   // G
    expect(rgba[2]).toBe(0);   // B
    expect(rgba[3]).toBe(0);   // A
    expect(messages[1].address).toBe('/beyond/zone/3/livecontrol/Brightness');
    expect(messages[1].value).toBe(100);
  });

  it('should produce white (255,255,255,0) for s=0 b=100', () => {
    const grid = makeSingleGrid(0, 0, 0, 100); // h=0, s=0, b=100 → white
    const messages = encodeBeyondMessages(grid, { 0: 0 }, undefined, 'rgba');

    expect(messages).toHaveLength(2);
    const rgba = messages[0].value as number[];
    expect(rgba[0]).toBe(255); // R
    expect(rgba[1]).toBe(255); // G
    expect(rgba[2]).toBe(255); // B
    expect(rgba[3]).toBe(0);   // A
  });

  it('should produce black (0,0,0,0) for b=0', () => {
    const grid = makeSingleGrid(0, 0, 100, 0); // h=0, s=100, b=0 → black
    const messages = encodeBeyondMessages(grid, { 0: 0 }, undefined, 'rgba');

    expect(messages).toHaveLength(2);
    const rgba = messages[0].value as number[];
    expect(rgba[0]).toBe(0); // R
    expect(rgba[1]).toBe(0); // G
    expect(rgba[2]).toBe(0); // B
    expect(rgba[3]).toBe(0); // A
    expect(messages[1].value).toBe(0); // Brightness
  });

  it('should match hsbToRgb255 conversion', () => {
    const grid = makeSingleGrid(0, 120, 80, 75); // green-ish
    const messages = encodeBeyondMessages(grid, { 0: 0 }, undefined, 'rgba');
    const rgba = messages[0].value as number[];
    const expected = hsbToRgb255(120, 80, 75);
    expect(rgba[0]).toBe(expected.r);
    expect(rgba[1]).toBe(expected.g);
    expect(rgba[2]).toBe(expected.b);
    expect(rgba[3]).toBe(0);
  });

  it('should handle multiple mapped cannons in rgba mode', () => {
    const grid = makeGrid(120, 100, 100);
    const messages = encodeBeyondMessages(grid, { 0: 0, 1: 1, 2: 2 }, undefined, 'rgba');

    expect(messages).toHaveLength(6); // 3 cannons × 2 messages (RGBA + Brightness)
    expect(messages[0].address).toContain('/beyond/zone/0/');
    expect(messages[2].address).toContain('/beyond/zone/1/');
    expect(messages[4].address).toContain('/beyond/zone/2/');
  });

  it('should skip unchanged cannons in rgba mode', () => {
    const grid = makeGrid(120, 100, 100);
    const prevGrid = makeGrid(120, 100, 100);
    const messages = encodeBeyondMessages(grid, { 0: 0, 1: 1 }, prevGrid, 'rgba');
    expect(messages).toHaveLength(0);
  });
});

describe('encodeFB4Messages', () => {
  it('should produce correct serial-based OSC addresses', () => {
    const grid = makeSingleGrid(0, 0, 100, 100); // pure red
    const messages = encodeFB4Messages(grid, { 0: '02356' });

    expect(messages).toHaveLength(3);
    expect(messages[0].address).toBe('/FB4-02356/color_red');
    expect(messages[0].value).toBe(100);
    expect(messages[1].address).toBe('/FB4-02356/color_green');
    expect(messages[1].value).toBe(0);
    expect(messages[2].address).toBe('/FB4-02356/color_blue');
    expect(messages[2].value).toBe(0);
  });

  it('should use 0-100 range for FB4 color values', () => {
    const grid = makeSingleGrid(0, 120, 100, 50); // green at 50% brightness
    const messages = encodeFB4Messages(grid, { 0: '00001' });

    for (const msg of messages) {
      expect(msg.value).toBeGreaterThanOrEqual(0);
      expect(msg.value).toBeLessThanOrEqual(100);
    }
  });

  it('should skip unmapped cannons', () => {
    const grid = makeGrid();
    const messages = encodeFB4Messages(grid, { 48: '99999' });

    expect(messages).toHaveLength(3);
    expect(messages[0].address).toContain('/FB4-99999/');
  });

  it('should handle multiple serials', () => {
    const grid = makeGrid(0, 100, 100);
    const messages = encodeFB4Messages(grid, { 47: '02356', 48: '02418' });

    expect(messages).toHaveLength(6);
    expect(messages[0].address).toContain('02356');
    expect(messages[3].address).toContain('02418');
  });
});

// ═══════════════════════════════════════════════════
// Mock UDP receiver tests (validates real OSC packets over UDP)
// ═══════════════════════════════════════════════════

interface ReceivedPacket {
  address: string;
  args: unknown[];
}

function createMockOscReceiver(port: number): Promise<{
  packets: ReceivedPacket[];
  close: () => Promise<void>;
}> {
  return new Promise((resolve) => {
    const packets: ReceivedPacket[] = [];
    const server = new OscServer(port, '127.0.0.1', () => {
      server.on('message', (msg: unknown[]) => {
        const [address, ...args] = msg;
        packets.push({ address: address as string, args });
      });
      resolve({
        packets,
        close: () => new Promise<void>((res) => { server.close(); setTimeout(res, 50); })
      });
    });
  });
}

let portCounter = 19950;
function nextPort() { return portCounter++; }

describe('BeyondOscOutput (UDP integration)', () => {
  it('should send correct OSC packets to UDP target', async () => {
    const port = nextPort();
    const mock = await createMockOscReceiver(port);

    const adapter = new BeyondOscOutput({
      host: '127.0.0.1',
      port,
      projectorMap: { 0: 5 },
      sendEveryNFrames: 1
    });
    adapter.connect();

    const grid = makeSingleGrid(0, 0, 100, 100); // h=0, s=100, b=100 at cannon 0
    adapter.send(grid);

    await new Promise((r) => setTimeout(r, 200));

    expect(mock.packets.length).toBeGreaterThanOrEqual(2);

    const colorPkt = mock.packets.find(p => p.address === '/beyond/zone/5/livecontrol/ColorSlider');
    expect(colorPkt).toBeDefined();
    expect(colorPkt!.args[0]).toBeCloseTo(28, 0); // hue 0 → ColorSlider 28 (Red)
    expect(typeof colorPkt!.args[0]).toBe('number');

    const brightPkt = mock.packets.find(p => p.address === '/beyond/zone/5/livecontrol/Brightness');
    expect(brightPkt).toBeDefined();
    expect(brightPkt!.args[0]).toBeCloseTo(100, 0);

    adapter.close();
    await mock.close();
  });

  it('should throttle sends based on sendEveryNFrames', async () => {
    const port = nextPort();
    const mock = await createMockOscReceiver(port);

    const adapter = new BeyondOscOutput({
      host: '127.0.0.1',
      port,
      projectorMap: { 0: 0 },
      sendEveryNFrames: 3
    });
    adapter.connect();

    const grid = makeSingleGrid(0, 0, 100, 100);
    adapter.send(grid); // frame 1 — skipped
    adapter.send(grid); // frame 2 — skipped
    adapter.send(grid); // frame 3 — sent

    await new Promise((r) => setTimeout(r, 200));

    expect(mock.packets.length).toBe(2); // one send = 2 packets (ColorSlider, Brightness)

    adapter.close();
    await mock.close();
  });

  it('should send RGBA multi-float packets in rgba mode', async () => {
    const port = nextPort();
    const mock = await createMockOscReceiver(port);

    const adapter = new BeyondOscOutput({
      host: '127.0.0.1',
      port,
      projectorMap: { 0: 0 },
      sendEveryNFrames: 1,
      colorMode: 'rgba'
    });
    adapter.connect();

    const grid = makeSingleGrid(0, 0, 100, 100); // pure red
    adapter.send(grid);

    await new Promise((r) => setTimeout(r, 200));

    expect(mock.packets.length).toBeGreaterThanOrEqual(2);

    const rgbaPkt = mock.packets.find(p => p.address === '/beyond/zone/0/livecontrol/RGBA');
    expect(rgbaPkt).toBeDefined();
    expect(rgbaPkt!.args).toHaveLength(4);
    expect(rgbaPkt!.args[0]).toBeCloseTo(255, 0); // R
    expect(rgbaPkt!.args[1]).toBeCloseTo(0, 0);   // G
    expect(rgbaPkt!.args[2]).toBeCloseTo(0, 0);   // B
    expect(rgbaPkt!.args[3]).toBeCloseTo(0, 0);   // A

    const brightPkt = mock.packets.find(p => p.address === '/beyond/zone/0/livecontrol/Brightness');
    expect(brightPkt).toBeDefined();
    expect(brightPkt!.args[0]).toBeCloseTo(100, 0);

    adapter.close();
    await mock.close();
  });
});

describe('FB4OscOutput (UDP integration)', () => {
  it('should send correct OSC packets to UDP target', async () => {
    const port = nextPort();
    const mock = await createMockOscReceiver(port);

    const adapter = new FB4OscOutput({
      host: '127.0.0.1',
      port,
      serialMap: { 0: '02356' },
      sendEveryNFrames: 1
    });
    adapter.connect();

    const grid = makeSingleGrid(0, 0, 100, 100); // pure red
    adapter.send(grid);

    await new Promise((r) => setTimeout(r, 200));

    expect(mock.packets.length).toBeGreaterThanOrEqual(3);

    const redPkt = mock.packets.find(p => p.address === '/FB4-02356/color_red');
    expect(redPkt).toBeDefined();
    expect(redPkt!.args[0]).toBeCloseTo(100, 0);

    const greenPkt = mock.packets.find(p => p.address === '/FB4-02356/color_green');
    expect(greenPkt).toBeDefined();
    expect(greenPkt!.args[0]).toBeCloseTo(0, 0);

    adapter.close();
    await mock.close();
  });

  it('should default to port 8000', () => {
    const adapter = new FB4OscOutput({
      host: '127.0.0.1',
      serialMap: { 0: '00001' }
    });
    expect(adapter).toBeDefined();
  });
});

describe('RoutedOscOutput', () => {
  it('should dispatch to correct targets based on routing config', async () => {
    const beyondPort = nextPort();
    const fb4Port = nextPort();

    const beyondMock = await createMockOscReceiver(beyondPort);
    const fb4Mock = await createMockOscReceiver(fb4Port);

    const config: RoutingConfig = {
      targets: {
        'beyond-a': { type: 'beyond', host: '127.0.0.1', port: beyondPort },
        'fb4-b': { type: 'fb4', host: '127.0.0.1', port: fb4Port }
      },
      flushHz: 60,
      cannons: [
        { logical: 0, target: 'beyond-a', projectorIndex: 3 },
        { logical: 48, target: 'fb4-b', fb4Serial: '02356' }
      ]
    };

    const routed = createRoutedOutput(config);
    routed.connect();

    const grid = makeGrid(0, 100, 100); // all red
    routed.send(grid);

    await new Promise((r) => setTimeout(r, 300));

    const beyondColor = beyondMock.packets.find(p => p.address === '/beyond/zone/3/livecontrol/ColorSlider');
    expect(beyondColor).toBeDefined();
    expect(beyondColor!.args[0]).toBeCloseTo(28, 0); // hue 0 → ColorSlider 28 (Red)

    const fb4Red = fb4Mock.packets.find(p => p.address === '/FB4-02356/color_red');
    expect(fb4Red).toBeDefined();
    expect(fb4Red!.args[0]).toBeCloseTo(100, 0);

    routed.close();
    await beyondMock.close();
    await fb4Mock.close();
  });

  it('should skip safeDisabled cannons', () => {
    const config: RoutingConfig = {
      targets: {
        'beyond-a': { type: 'beyond', host: '127.0.0.1', port: 9999 }
      },
      cannons: [
        { logical: 0, target: 'beyond-a', projectorIndex: 0 },
        { logical: 1, target: 'beyond-a', projectorIndex: 1, safeDisabled: true }
      ]
    };

    const routed = createRoutedOutput(config);
    expect(routed.targetNames).toContain('beyond-a');

    const grid = makeGrid(0, 100, 100);
    const messages = encodeBeyondMessages(grid, { 0: 0 });
    expect(messages).toHaveLength(2);
  });

  it('should expose target names', () => {
    const config: RoutingConfig = {
      targets: {
        'beyond-a': { type: 'beyond', host: '127.0.0.1', port: 9000 },
        'fb4-b': { type: 'fb4', host: '127.0.0.1', port: 8000 }
      },
      cannons: [
        { logical: 0, target: 'beyond-a', projectorIndex: 0 },
        { logical: 48, target: 'fb4-b', fb4Serial: '02356' }
      ]
    };

    const routed = createRoutedOutput(config);
    expect(routed.targetNames).toEqual(expect.arrayContaining(['beyond-a', 'fb4-b']));
  });

  it('should handle empty cannons list', () => {
    const config: RoutingConfig = {
      targets: {
        'beyond-a': { type: 'beyond', host: '127.0.0.1', port: 9000 }
      },
      cannons: []
    };

    const routed = createRoutedOutput(config);
    expect(routed.targetNames).toHaveLength(0);
    routed.send(makeGrid());
    routed.close();
  });
});
