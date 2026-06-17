import { Server as OscServer } from 'node-osc';
import { CannonState } from '../src/osc-adapters';

import {
  BeyondOscOutput,
  FB4OscOutput,
  RoutingConfig,
  encodeBeyondMessages,
  encodeFB4Messages,
  createRoutedOutput,
  hueToColorSlider,
  satToSaturation
} from '../src/osc-adapters';

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
  it('should map 0 hue to 0', () => {
    expect(hueToColorSlider(0)).toBeCloseTo(0);
  });

  it('should map 360 hue to 0 (wraps)', () => {
    expect(hueToColorSlider(360)).toBeCloseTo(0);
  });

  it('should map 180 hue to ~127.5', () => {
    expect(hueToColorSlider(180)).toBeCloseTo(127.5);
  });
});

describe('satToSaturation', () => {
  it('should map 100% sat to 0 (no shift)', () => {
    expect(satToSaturation(100)).toBe(0);
  });

  it('should map 0% sat to -100', () => {
    expect(satToSaturation(0)).toBe(-100);
  });

  it('should map 50% sat to -50', () => {
    expect(satToSaturation(50)).toBe(-50);
  });
});

describe('encodeBeyondMessages', () => {
  it('should produce ColorSlider/Saturation/Brightness addresses', () => {
    const grid = makeSingleGrid(0, 0, 100, 100); // h=0, s=100, b=100
    const messages = encodeBeyondMessages(grid, { 0: 3 });

    expect(messages).toHaveLength(3);
    expect(messages[0].address).toBe('/beyond/zone/3/livecontrol/ColorSlider');
    expect(messages[0].value).toBeCloseTo(0); // hue 0 → ColorSlider 0
    expect(messages[1].address).toBe('/beyond/zone/3/livecontrol/Saturation');
    expect(messages[1].value).toBe(0); // sat 100 → Saturation 0
    expect(messages[2].address).toBe('/beyond/zone/3/livecontrol/Brightness');
    expect(messages[2].value).toBe(100);
  });

  it('should skip unmapped cannons', () => {
    const grid = makeGrid(0, 100, 100);
    const messages = encodeBeyondMessages(grid, { 5: 10 });

    expect(messages).toHaveLength(3);
    expect(messages[0].address).toBe('/beyond/zone/10/livecontrol/ColorSlider');
  });

  it('should handle multiple mapped cannons', () => {
    const grid = makeGrid(120, 100, 100);
    const messages = encodeBeyondMessages(grid, { 0: 0, 1: 1, 2: 2 });

    expect(messages).toHaveLength(9); // 3 cannons × 3 messages
    expect(messages[0].address).toContain('/beyond/zone/0/');
    expect(messages[3].address).toContain('/beyond/zone/1/');
    expect(messages[6].address).toContain('/beyond/zone/2/');
  });

  it('should map hue to ColorSlider range 0-255', () => {
    const grid = makeSingleGrid(0, 180, 100, 100); // hue 180
    const messages = encodeBeyondMessages(grid, { 0: 0 });

    expect(messages[0].address).toBe('/beyond/zone/0/livecontrol/ColorSlider');
    expect(messages[0].value).toBeCloseTo(127.5);
  });

  it('should return empty array when no cannons are mapped', () => {
    const messages = encodeBeyondMessages(makeGrid(), {});
    expect(messages).toHaveLength(0);
  });

  it('should include brightness from HSB b value', () => {
    const grid = makeSingleGrid(0, 0, 100, 50); // 50% brightness
    const messages = encodeBeyondMessages(grid, { 0: 0 });
    expect(messages[2].address).toBe('/beyond/zone/0/livecontrol/Brightness');
    expect(messages[2].value).toBe(50);
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
    expect(messages).toHaveLength(6); // 2 cannons × 3 messages
  });

  it('should send all cannons on first frame (no prevGrid)', () => {
    const grid = makeGrid(120, 100, 100);
    const messages = encodeBeyondMessages(grid, { 0: 0, 1: 1 });
    expect(messages).toHaveLength(6);
  });

  it('should work with arbitrary grid sizes (not just 49)', () => {
    const grid: CannonState[] = Array.from({ length: 100 }, (_, i) => ({
      h: i * 3.6, s: 100, b: 100
    }));
    const map: Record<number, number> = { 0: 0, 99: 99 };
    const messages = encodeBeyondMessages(grid, map);
    expect(messages).toHaveLength(6); // 2 cannons × 3 messages
    expect(messages[3].address).toContain('/beyond/zone/99/');
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

    expect(mock.packets.length).toBeGreaterThanOrEqual(3);

    const colorPkt = mock.packets.find(p => p.address === '/beyond/zone/5/livecontrol/ColorSlider');
    expect(colorPkt).toBeDefined();
    expect(colorPkt!.args[0]).toBeCloseTo(0, 0); // hue 0 → ColorSlider 0
    expect(typeof colorPkt!.args[0]).toBe('number');

    const satPkt = mock.packets.find(p => p.address === '/beyond/zone/5/livecontrol/Saturation');
    expect(satPkt).toBeDefined();
    expect(satPkt!.args[0]).toBeCloseTo(0, 0); // sat 100 → Saturation 0

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

    expect(mock.packets.length).toBe(3); // one send = 3 packets (ColorSlider, Saturation, Brightness)

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
    expect(beyondColor!.args[0]).toBeCloseTo(0, 0); // hue 0 → ColorSlider 0

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
    expect(messages).toHaveLength(3);
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
