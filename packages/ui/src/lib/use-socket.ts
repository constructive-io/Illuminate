import { useCallback, useEffect, useRef, useState } from 'react';

export interface CannonColor {
  h: number;
  s: number;
  b: number;
}

export interface Orientation {
  rotation: 0 | 90 | 180 | 270;
  flipH: boolean;
  flipV: boolean;
}

export interface PlaylistState {
  active: boolean;
  currentStep: number;
  playlist: {
    steps: Array<{ type: string; name?: string; code?: string; duration: number }>;
    loop: boolean;
    transition: 'cut' | 'fade';
    transitionDuration: number;
  } | null;
}

export interface Settings {
  alpha: number;
  attack: number;
  speed: number;
  animation: string | null;
}

export function useSocket(url: string | null, token: string | null) {
  const wsRef = useRef<WebSocket | null>(null);
  const [connected, setConnected] = useState(false);
  const [grid, setGrid] = useState<CannonColor[]>([]);
  const [orientation, setOrientation] = useState<Orientation>({ rotation: 0, flipH: false, flipV: false });
  const [playlistState, setPlaylistState] = useState<PlaylistState | null>(null);
  const [settings, setSettings] = useState<Settings | null>(null);

  useEffect(() => {
    if (!token || !url) return;

    const wsUrl = new URL(url);
    wsUrl.searchParams.set('token', token);
    const ws = new WebSocket(wsUrl.toString());
    wsRef.current = ws;

    ws.onopen = () => setConnected(true);
    ws.onclose = () => {
      setConnected(false);
      setTimeout(() => {
        if (wsRef.current === ws) {
          wsRef.current = null;
        }
      }, 2000);
    };
    ws.onerror = () => ws.close();
    ws.onmessage = (e) => {
      try {
        const msg = JSON.parse(e.data);
        if (msg.type === 'state' && Array.isArray(msg.grid)) {
          setGrid(msg.grid);
        } else if (msg.type === 'orientation') {
          setOrientation({ rotation: msg.rotation ?? 0, flipH: !!msg.flipH, flipV: !!msg.flipV });
        } else if (msg.type === 'playlist_state') {
          setPlaylistState({ active: !!msg.active, currentStep: msg.currentStep ?? 0, playlist: msg.playlist ?? null });
        } else if (msg.type === 'settings') {
          setSettings({
            alpha: msg.alpha ?? 0.06,
            attack: msg.attack ?? 1.0,
            speed: msg.speed ?? 1.0,
            animation: msg.animation ?? null
          });
        }
      } catch {
        // ignore
      }
    };

    return () => {
      ws.close();
      wsRef.current = null;
    };
  }, [url, token]);

  const send = useCallback((msg: Record<string, unknown>) => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify(msg));
    }
  }, []);

  return { connected, grid, orientation, playlistState, settings, send };
}
