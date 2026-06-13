import { Server as HttpServer } from 'http';

import { WebSocket, WebSocketServer } from 'ws';

import {
  CallbackOutput,
  ConsoleOutput,
  MultiOutput,
  WebSocketInput,
  WebSocketOutput
} from '../src/adapters';
import { CannonState } from '../src/filter';

function makeGrid(h = 220, s = 90, b = 80): CannonState[] {
  return Array.from({ length: 49 }, () => ({ h, s, b }));
}

describe('ConsoleOutput', () => {
  it('should send without throwing', () => {
    const out = new ConsoleOutput({ logEveryNFrames: 1000 });
    expect(() => out.send(makeGrid())).not.toThrow();
    out.close();
  });

  it('should respect logEveryNFrames', () => {
    const writeSpy = jest.spyOn(process.stdout, 'write').mockImplementation(() => true);
    const out = new ConsoleOutput({ logEveryNFrames: 3 });
    out.send(makeGrid());
    out.send(makeGrid());
    expect(writeSpy).not.toHaveBeenCalled();
    out.send(makeGrid()); // 3rd frame
    expect(writeSpy).toHaveBeenCalledTimes(1);
    writeSpy.mockRestore();
    out.close();
  });
});

describe('CallbackOutput', () => {
  it('should call the provided function on each send', () => {
    const received: CannonState[][] = [];
    const out = new CallbackOutput((grid) => { received.push(grid); });
    const grid = makeGrid(100, 50, 60);
    out.send(grid);
    out.send(grid);
    expect(received).toHaveLength(2);
    expect(received[0][0].h).toBe(100);
    out.close();
  });
});

describe('MultiOutput', () => {
  it('should fan out to all child adapters', () => {
    const a: CannonState[][] = [];
    const b: CannonState[][] = [];
    const multi = new MultiOutput([
      new CallbackOutput((g) => a.push(g)),
      new CallbackOutput((g) => b.push(g))
    ]);
    multi.send(makeGrid(10, 20, 30));
    expect(a).toHaveLength(1);
    expect(b).toHaveLength(1);
    expect(a[0][0].h).toBe(10);
    multi.close();
  });
});

describe('WebSocketInput', () => {
  let server: WebSocketServer;
  let httpServer: HttpServer;
  const PORT = 19876;

  beforeAll((done) => {
    httpServer = new HttpServer();
    server = new WebSocketServer({ server: httpServer });
    httpServer.listen(PORT, done);
  });

  afterAll((done) => {
    server.close();
    httpServer.close(done);
  });

  it('should connect and receive state messages', (done) => {
    const input = new WebSocketInput({ url: `ws://localhost:${PORT}` });
    const grid = makeGrid(180, 70, 50);

    input.on('connected', () => {
      // Server sends a state message once connected
      server.clients.forEach(client => {
        client.send(JSON.stringify({ type: 'state', grid }));
      });
    });

    input.on('state', (received) => {
      expect(received).toHaveLength(49);
      expect(received[0].h).toBe(180);
      expect(received[0].s).toBe(70);
      input.disconnect();
      done();
    });

    input.connect();
  });

  it('should ignore malformed messages', (done) => {
    const input = new WebSocketInput({ url: `ws://localhost:${PORT}` });
    const stateHandler = jest.fn();
    input.on('state', stateHandler);

    input.on('connected', () => {
      server.clients.forEach(client => {
        client.send('not json');
        client.send(JSON.stringify({ type: 'other' }));
        client.send(JSON.stringify({ type: 'state', grid: makeGrid() }));
      });
      // Wait a tick for messages to arrive
      setTimeout(() => {
        expect(stateHandler).toHaveBeenCalledTimes(1);
        input.disconnect();
        done();
      }, 50);
    });

    input.connect();
  });

  it('should emit disconnected on server close', (done) => {
    // Create a separate server for this test
    const tempServer = new HttpServer();
    const tempWss = new WebSocketServer({ server: tempServer });
    const TEMP_PORT = 19877;

    tempServer.listen(TEMP_PORT, () => {
      const input = new WebSocketInput({ url: `ws://localhost:${TEMP_PORT}`, reconnectInterval: 50000 });

      input.on('connected', () => {
        // Close all server connections to trigger disconnect
        tempWss.clients.forEach(c => c.close());
      });

      input.on('disconnected', () => {
        input.disconnect();
        tempWss.close();
        tempServer.close(done);
      });

      input.connect();
    });
  });
});

describe('WebSocketOutput', () => {
  const PORT = 19878;

  it('should broadcast state to connected clients', (done) => {
    const output = new WebSocketOutput({ port: PORT });
    output.listen();

    // Connect a client
    const client = new WebSocket(`ws://localhost:${PORT}`);
    client.on('open', () => {
      output.send(makeGrid(300, 80, 60));
    });

    client.on('message', (raw) => {
      const msg = JSON.parse(raw.toString());
      expect(msg.type).toBe('state');
      expect(msg.grid).toHaveLength(49);
      expect(msg.grid[0].h).toBe(300);
      client.close();
      output.close();
      done();
    });
  });

  it('should include mapping when provided', (done) => {
    const PORT2 = 19879;
    const output = new WebSocketOutput({
      port: PORT2,
      mapping: (i) => `/laser/${i + 1}`
    });
    output.listen();

    const client = new WebSocket(`ws://localhost:${PORT2}`);
    client.on('open', () => {
      output.send(makeGrid());
    });

    client.on('message', (raw) => {
      const msg = JSON.parse(raw.toString());
      expect(msg.mapping).toBeDefined();
      expect(msg.mapping[0]).toBe('/laser/1');
      expect(msg.mapping[48]).toBe('/laser/49');
      client.close();
      output.close();
      done();
    });
  });

  it('should respect broadcastEveryNFrames', (done) => {
    const PORT3 = 19880;
    const output = new WebSocketOutput({ port: PORT3, broadcastEveryNFrames: 3 });
    output.listen();

    const messages: unknown[] = [];
    const client = new WebSocket(`ws://localhost:${PORT3}`);
    client.on('open', () => {
      output.send(makeGrid(1, 1, 1));   // frame 1 — skipped
      output.send(makeGrid(2, 2, 2));   // frame 2 — skipped
      output.send(makeGrid(3, 3, 3));   // frame 3 — sent
      output.send(makeGrid(4, 4, 4));   // frame 4 — skipped

      setTimeout(() => {
        expect(messages).toHaveLength(1);
        const msg = messages[0] as { grid: CannonState[] };
        expect(msg.grid[0].h).toBe(3);
        client.close();
        output.close();
        done();
      }, 100);
    });

    client.on('message', (raw) => {
      messages.push(JSON.parse(raw.toString()));
    });
  });
});
