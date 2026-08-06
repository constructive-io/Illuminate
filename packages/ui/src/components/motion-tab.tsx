import { useCallback, useEffect, useRef, useState } from 'react';

export interface MotionState {
  recording: boolean;
  playing: boolean;
  path: number[];
}

export function useMotion(
  hue: number,
  saturation: number,
  brightness: number,
  send: (msg: Record<string, unknown>) => void
) {
  const [state, setState] = useState<MotionState>({
    recording: false,
    playing: false,
    path: []
  });
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const frameRef = useRef(0);
  const speedRef = useRef(5);
  const hueRef = useRef(hue);
  const satRef = useRef(saturation);
  const brightRef = useRef(brightness);
  const sendRef = useRef(send);
  const stateRef = useRef(state);

  useEffect(() => { hueRef.current = hue; }, [hue]);
  useEffect(() => { satRef.current = saturation; }, [saturation]);
  useEffect(() => { brightRef.current = brightness; }, [brightness]);
  useEffect(() => { sendRef.current = send; }, [send]);
  useEffect(() => { stateRef.current = state; }, [state]);

  const recordPoint = useCallback((cannonIndex: number) => {
    setState((s) => {
      if (!s.recording) return s;
      if (s.path.length > 0 && s.path[s.path.length - 1] === cannonIndex) return s;
      return { ...s, path: [...s.path, cannonIndex] };
    });
  }, []);

  const playStep = useCallback(() => {
    const s = stateRef.current;
    if (!s.playing || s.path.length < 2) {
      setState((prev) => ({ ...prev, playing: false }));
      return;
    }

    const path = s.path;
    const frame = frameRef.current;

    for (let i = 0; i < path.length; i++) {
      const dist = Math.min(
        Math.abs(i - (frame % path.length)),
        path.length - Math.abs(i - (frame % path.length))
      );
      const falloff = Math.max(0, 1 - dist * 0.3);
      sendRef.current({
        type: 'cannon',
        index: path[i],
        h: hueRef.current,
        s: satRef.current,
        b: brightRef.current * falloff
      });
    }

    frameRef.current++;
    const speed = speedRef.current;
    timerRef.current = setTimeout(playStep, 300 - speed * 25);
  }, []);

  const toggleRecord = useCallback(() => {
    setState((s) => {
      if (s.recording) return { ...s, recording: false };
      // Start fresh recording
      if (timerRef.current) clearTimeout(timerRef.current);
      return { recording: true, playing: false, path: [] };
    });
  }, []);

  const togglePlay = useCallback(() => {
    setState((s) => {
      if (s.playing) {
        if (timerRef.current) clearTimeout(timerRef.current);
        return { ...s, playing: false };
      }
      if (s.path.length < 2) return s;
      frameRef.current = 0;
      setTimeout(playStep, 0);
      return { ...s, recording: false, playing: true };
    });
  }, [playStep]);

  const clear = useCallback(() => {
    if (timerRef.current) clearTimeout(timerRef.current);
    setState({ recording: false, playing: false, path: [] });
  }, []);

  const setSpeed = useCallback((s: number) => { speedRef.current = s; }, []);

  useEffect(() => {
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, []);

  return { state, recordPoint, toggleRecord, togglePlay, clear, setSpeed };
}

export function MotionControls({
  state,
  onRecord,
  onPlay,
  onClear,
  onSpeed
}: {
  state: MotionState;
  onRecord: () => void;
  onPlay: () => void;
  onClear: () => void;
  onSpeed: (s: number) => void;
}) {
  const [speed, setSpeed] = useState(5);

  return (
    <div className="space-y-3">
      <div className="flex gap-2 items-center">
        <button
          onClick={onRecord}
          className="px-5 py-3 rounded-lg text-sm font-medium transition-all"
          style={{
            background: state.recording ? 'rgba(221,68,68,0.2)' : '#12121a',
            color: state.recording ? '#e55' : '#888898',
            border: `1px solid ${state.recording ? 'rgba(221,68,68,0.4)' : '#1a1a25'}`
          }}
        >
          {state.recording ? '● Recording...' : 'Draw Path'}
        </button>
        <button
          onClick={onPlay}
          className="px-5 py-3 rounded-lg text-sm font-medium transition-all"
          style={{
            background: state.playing ? 'rgba(74,124,255,0.2)' : '#12121a',
            color: state.playing ? '#4a7cff' : (state.path.length < 2 ? '#555' : '#888898'),
            border: `1px solid ${state.playing ? 'rgba(74,124,255,0.4)' : '#1a1a25'}`,
            opacity: state.path.length < 2 ? 0.5 : 1
          }}
        >
          {state.playing ? '■ Stop' : '▶ Play'}
        </button>
        <button
          onClick={onClear}
          className="px-5 py-3 rounded-lg text-sm font-medium transition-all"
          style={{
            background: '#12121a',
            color: '#888898',
            border: '1px solid #1a1a25'
          }}
        >
          Clear
        </button>
      </div>

      <div className="flex items-center gap-3">
        <span className="text-sm font-medium" style={{ color: '#888898' }}>Speed</span>
        <input
          type="range"
          min={1}
          max={10}
          value={speed}
          onChange={(e) => {
            const v = Number(e.target.value);
            setSpeed(v);
            onSpeed(v);
          }}
          style={{ width: 120 }}
        />
      </div>

      {state.path.length > 0 && (
        <p className="text-xs" style={{ color: 'rgba(136,136,152,0.5)' }}>
          {state.path.length} points recorded
        </p>
      )}
      {state.path.length === 0 && (
        <p className="text-xs" style={{ color: 'rgba(136,136,152,0.5)' }}>
          Draw a path on the grid, then play it back as an animation
        </p>
      )}
    </div>
  );
}
