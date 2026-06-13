import { Relay } from './relay';

const PORT = parseInt(process.env.RELAY_PORT || '3002', 10);

const relay = new Relay({
  port: PORT,
  onConnect: (client) => {
    console.log(`[relay] client connected: ${client.id}`);
  },
  onDisconnect: (client) => {
    console.log(`[relay] client disconnected: ${client.id} (was ${client.role})`);
  },
  onMessage: (client, msg) => {
    if (msg.type === 'register') {
      console.log(`[relay] ${client.id} registered as ${msg.role}`);
    }
  }
});

relay.start(PORT).then(() => {
  console.log('');
  console.log('╔══════════════════════════════════════════╗');
  console.log('║   Wavegrid · Relay Server                ║');
  console.log(`║   ws://0.0.0.0:${PORT}                      ║`);
  console.log('║                                          ║');
  console.log('║   Clients register as:                   ║');
  console.log('║     controller → sends commands          ║');
  console.log('║     consumer   → receives commands       ║');
  console.log('╚══════════════════════════════════════════╝');
  console.log('');
});
