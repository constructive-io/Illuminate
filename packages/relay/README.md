# @wavegrid/relay

<p align="center" width="100%">
  <img height="250" src="https://raw.githubusercontent.com/constructive-io/constructive/refs/heads/main/assets/outline-logo.svg" />
</p>

<p align="center" width="100%">
  <a href="https://github.com/constructive-io/Illuminate/actions/workflows/ci.yml">
    <img height="20" src="https://github.com/constructive-io/Illuminate/actions/workflows/ci.yml/badge.svg" />
  </a>
</p>

Transparent WebSocket relay for the Wavegrid system. Routes control messages between canvases (controllers) and simulators/receivers (consumers).

## When to use

Use the relay when:
- The Canvas and Simulator aren't on the same network
- You need a cloud-accessible control endpoint
- Multiple receivers need the same control signals
- You want centralized logging/monitoring of all messages

**You don't need it** when Canvas and Simulator are on the same LAN — just connect directly.

## Architecture

```
Canvas (controller) ──ws──▶ Relay :3002 ──ws──▶ Simulator (consumer)
Master UI (controller) ──ws──▶   │         ──ws──▶ Receiver (consumer)
                                  │
                          routes by role
```

## How it works

1. Clients connect to the relay via WebSocket
2. Each client registers its role: `controller` or `consumer`
3. The relay routes messages by type:
   - **Control messages** (`cannon`, `scene`, `animation`, etc.) → forwarded to all **consumers**
   - **State messages** (`state`) → forwarded to all **controllers**
4. Unregistered clients are treated as controllers (backwards-compatible)

## Usage

```sh
# Start the relay
pnpm dev:relay
# → ws://0.0.0.0:3002

# Or with custom port
RELAY_PORT=4000 pnpm dev:relay
```

### Client registration

When connecting, send a register message:

```typescript
// Canvas / Master Controller
ws.send(JSON.stringify({ type: 'register', role: 'controller' }));

// Simulator / Receiver
ws.send(JSON.stringify({ type: 'register', role: 'consumer' }));
```

### Programmatic usage

```typescript
import { Relay } from '@wavegrid/relay';

const relay = new Relay({
  port: 3002,
  onConnect: (client) => console.log('connected:', client.id),
  onDisconnect: (client) => console.log('disconnected:', client.id),
  onMessage: (client, msg) => console.log(client.role, msg.type),
});

await relay.start();
```

## Configuration

| Env | Default | Description |
|-----|---------|-------------|
| `RELAY_PORT` | `3002` | WebSocket server port |

## Deployment

The relay is stateless — it holds no grid state, just routes messages. You can:
- Run it on the same Windows machine as the simulator
- Deploy it to a cloud VPS for remote access
- Run multiple relays in different regions (each connects its own set of clients)
