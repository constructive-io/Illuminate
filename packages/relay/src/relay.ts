import { WebSocket, WebSocketServer } from 'ws';

export type ClientRole = 'controller' | 'consumer' | 'unregistered';

export interface RelayClient {
  ws: WebSocket;
  role: ClientRole;
  id: string;
}

export interface RelayConfig {
  port?: number;
  onConnect?: (client: RelayClient) => void;
  onDisconnect?: (client: RelayClient) => void;
  onMessage?: (client: RelayClient, msg: any) => void;
}

export class Relay {
  private wss: WebSocketServer | null = null;
  private clients: Map<string, RelayClient> = new Map();
  private nextId = 1;
  private config: RelayConfig;

  constructor(config: RelayConfig = {}) {
    this.config = config;
  }

  start(port?: number): Promise<void> {
    const p = port ?? this.config.port ?? 3002;
    return new Promise((resolve) => {
      this.wss = new WebSocketServer({ port: p }, () => resolve());
      this.wss.on('connection', (ws) => this.handleConnection(ws));
    });
  }

  stop(): Promise<void> {
    return new Promise((resolve) => {
      if (this.wss) {
        this.clients.forEach(c => c.ws.close());
        this.clients.clear();
        this.wss.close(() => resolve());
        this.wss = null;
      } else {
        resolve();
      }
    });
  }

  getClients(): RelayClient[] {
    return [...this.clients.values()];
  }

  getControllers(): RelayClient[] {
    return this.getClients().filter(c => c.role === 'controller');
  }

  getConsumers(): RelayClient[] {
    return this.getClients().filter(c => c.role === 'consumer');
  }

  private handleConnection(ws: WebSocket) {
    const id = 'client-' + this.nextId++;
    const client: RelayClient = { ws, role: 'unregistered', id };
    this.clients.set(id, client);

    this.config.onConnect?.(client);

    ws.on('message', (raw) => {
      try {
        const msg = JSON.parse(raw.toString());
        this.handleMessage(client, msg, raw.toString());
      } catch (_e) {
        // ignore malformed
      }
    });

    ws.on('close', () => {
      this.clients.delete(id);
      this.config.onDisconnect?.(client);
    });
  }

  private handleMessage(sender: RelayClient, msg: any, raw: string) {
    this.config.onMessage?.(sender, msg);

    // Registration message — don't forward
    if (msg.type === 'register') {
      if (msg.role === 'controller' || msg.role === 'consumer') {
        sender.role = msg.role;
      }
      return;
    }

    // Route based on message type:
    // - 'state' messages go from consumers → controllers (state broadcast)
    // - Everything else (cannon, scene, animation, etc.) goes controllers → consumers
    if (msg.type === 'state') {
      this.forward(raw, sender, this.getControllers());
    } else {
      this.forward(raw, sender, this.getConsumers());
    }
  }

  private forward(raw: string, sender: RelayClient, targets: RelayClient[]) {
    for (const target of targets) {
      if (target.id === sender.id) continue;
      if (target.ws.readyState === WebSocket.OPEN) {
        target.ws.send(raw);
      }
    }
  }
}
