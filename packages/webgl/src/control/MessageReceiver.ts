import { StateController } from './StateController';

/**
 * Connects to the Simulator WebSocket and feeds state updates
 * to the StateController. Auto-reconnects on disconnect.
 */
export class MessageReceiver {
  private ws: WebSocket | null = null;
  private url: string;
  private controller: StateController;
  private reconnectTimer: ReturnType<typeof setTimeout> | null = null;
  private _connected = false;

  constructor(url: string, controller: StateController) {
    this.url = url;
    this.controller = controller;
  }

  get connected(): boolean {
    return this._connected;
  }

  connect(): void {
    if (this.ws) return;
    try {
      this.ws = new WebSocket(this.url);
    } catch {
      this.scheduleReconnect();
      return;
    }

    this.ws.onopen = () => {
      this._connected = true;
    };

    this.ws.onmessage = (e) => {
      try {
        const msg = JSON.parse(e.data);
        this.controller.handleMessage(msg);
      } catch { /* ignore malformed */ }
    };

    this.ws.onclose = () => {
      this._connected = false;
      this.ws = null;
      this.scheduleReconnect();
    };

    this.ws.onerror = () => {
      this.ws?.close();
    };
  }

  disconnect(): void {
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }
    if (this.ws) {
      this.ws.onclose = null;
      this.ws.close();
      this.ws = null;
    }
    this._connected = false;
  }

  private scheduleReconnect(): void {
    if (this.reconnectTimer) return;
    this.reconnectTimer = setTimeout(() => {
      this.reconnectTimer = null;
      this.connect();
    }, 2000);
  }
}
