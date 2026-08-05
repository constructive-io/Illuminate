/**
 * Runtime config endpoint — resolves the Wavegrid layout/config at request
 * time (not build time) so a single UI build can serve any installation.
 * The layout (fixtures, topology, counts) is the single source of geometry.
 */
import { loadWavegridConfig } from '@wavegrid/layout';

export const dynamic = 'force-dynamic';

export function GET(request: Request) {
  const resolved = loadWavegridConfig();
  const layout = resolved.layout;

  // Check if request came through HTTPS reverse proxy
  const forwardedProto = request.headers.get('x-forwarded-proto');
  const wsPath = process.env.WS_PATH;
  const host = request.headers.get('host');

  let simulatorUrl: string;
  if (forwardedProto === 'https' && wsPath && host) {
    // Behind Traefik with SSL — use wss:// with the same domain
    simulatorUrl = `wss://${host}${wsPath}`;
  } else {
    // Direct access — use explicit URL or default
    simulatorUrl =
      process.env.SIMULATOR_URL ||
      process.env.NEXT_PUBLIC_SIMULATOR_URL ||
      `ws://localhost:${resolved.config.server.port}`;
  }

  return Response.json({
    simulatorUrl,
    runMode: resolved.runMode,
    layout,
    // Convenience fields derived from the layout for grid-oriented controls.
    numCannons: layout.count,
    gridColumns: layout.cols
  });
}
