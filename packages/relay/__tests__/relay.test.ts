import { WebSocket } from 'ws';
import { Relay } from '../src/relay';

let portCounter = 19800;
function nextPort() { return portCounter++; }

function connect(port: number): Promise<WebSocket> {
  return new Promise((resolve, reject) => {
    const ws = new WebSocket(`ws://127.0.0.1:${port}`);
    ws.on('open', () => resolve(ws));
    ws.on('error', reject);
  });
}

function waitForMessage(ws: WebSocket): Promise<any> {
  return new Promise((resolve) => {
    ws.once('message', (data) => resolve(JSON.parse(data.toString())));
  });
}

describe('Relay', () => {
  let relay: Relay;
  let port: number;

  beforeEach(async () => {
    port = nextPort();
    relay = new Relay({ port });
    await relay.start();
  });

  afterEach(async () => {
    await relay.stop();
  });

  it('accepts connections', async () => {
    const ws = await connect(port);
    expect(relay.getClients()).toHaveLength(1);
    ws.close();
  });

  it('registers client roles', async () => {
    const ws = await connect(port);
    ws.send(JSON.stringify({ type: 'register', role: 'controller' }));
    await new Promise(r => setTimeout(r, 50));
    expect(relay.getControllers()).toHaveLength(1);
    expect(relay.getConsumers()).toHaveLength(0);
    ws.close();
  });

  it('routes control messages from controller to consumer', async () => {
    const controller = await connect(port);
    const consumer = await connect(port);

    controller.send(JSON.stringify({ type: 'register', role: 'controller' }));
    consumer.send(JSON.stringify({ type: 'register', role: 'consumer' }));
    await new Promise(r => setTimeout(r, 50));

    const msgPromise = waitForMessage(consumer);
    controller.send(JSON.stringify({ type: 'scene', name: 'pride' }));

    const received = await msgPromise;
    expect(received).toEqual({ type: 'scene', name: 'pride' });

    controller.close();
    consumer.close();
  });

  it('routes state messages from consumer to controller', async () => {
    const controller = await connect(port);
    const consumer = await connect(port);

    controller.send(JSON.stringify({ type: 'register', role: 'controller' }));
    consumer.send(JSON.stringify({ type: 'register', role: 'consumer' }));
    await new Promise(r => setTimeout(r, 50));

    const msgPromise = waitForMessage(controller);
    consumer.send(JSON.stringify({ type: 'state', grid: [{ h: 0, s: 0, b: 0 }] }));

    const received = await msgPromise;
    expect(received.type).toBe('state');
    expect(received.grid).toEqual([{ h: 0, s: 0, b: 0 }]);

    controller.close();
    consumer.close();
  });

  it('does not echo messages back to sender', async () => {
    const controller = await connect(port);
    controller.send(JSON.stringify({ type: 'register', role: 'controller' }));
    await new Promise(r => setTimeout(r, 50));

    let received = false;
    controller.on('message', () => { received = true; });
    controller.send(JSON.stringify({ type: 'scene', name: 'civic' }));
    await new Promise(r => setTimeout(r, 100));

    expect(received).toBe(false);
    controller.close();
  });

  it('handles multiple controllers broadcasting to multiple consumers', async () => {
    const ctrl1 = await connect(port);
    const ctrl2 = await connect(port);
    const cons1 = await connect(port);
    const cons2 = await connect(port);

    ctrl1.send(JSON.stringify({ type: 'register', role: 'controller' }));
    ctrl2.send(JSON.stringify({ type: 'register', role: 'controller' }));
    cons1.send(JSON.stringify({ type: 'register', role: 'consumer' }));
    cons2.send(JSON.stringify({ type: 'register', role: 'consumer' }));
    await new Promise(r => setTimeout(r, 50));

    const p1 = waitForMessage(cons1);
    const p2 = waitForMessage(cons2);
    ctrl1.send(JSON.stringify({ type: 'animation', name: 'wave' }));

    const [m1, m2] = await Promise.all([p1, p2]);
    expect(m1).toEqual({ type: 'animation', name: 'wave' });
    expect(m2).toEqual({ type: 'animation', name: 'wave' });

    ctrl1.close();
    ctrl2.close();
    cons1.close();
    cons2.close();
  });

  it('cleans up disconnected clients', async () => {
    const ws = await connect(port);
    expect(relay.getClients()).toHaveLength(1);
    ws.close();
    await new Promise(r => setTimeout(r, 50));
    expect(relay.getClients()).toHaveLength(0);
  });

  it('forwards control messages from unregistered clients to consumers (backwards-compat)', async () => {
    const unregistered = await connect(port);
    const consumer = await connect(port);
    consumer.send(JSON.stringify({ type: 'register', role: 'consumer' }));
    await new Promise(r => setTimeout(r, 50));

    const msgPromise = waitForMessage(consumer);
    unregistered.send(JSON.stringify({ type: 'cannon', index: 0, h: 120 }));

    const received = await msgPromise;
    expect(received).toEqual({ type: 'cannon', index: 0, h: 120 });

    unregistered.close();
    consumer.close();
  });

  it('does not forward register messages', async () => {
    const controller = await connect(port);
    const consumer = await connect(port);
    consumer.send(JSON.stringify({ type: 'register', role: 'consumer' }));
    await new Promise(r => setTimeout(r, 50));

    let received = false;
    consumer.on('message', () => { received = true; });
    controller.send(JSON.stringify({ type: 'register', role: 'controller' }));
    await new Promise(r => setTimeout(r, 100));

    expect(received).toBe(false);
    controller.close();
    consumer.close();
  });
});
