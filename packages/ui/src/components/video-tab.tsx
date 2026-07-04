'use client';

import { useCallback, useEffect, useRef, useState } from 'react';

import { ControlGrid, ControlGroup } from './control-grid';

type BlendMode = 'replace' | 'filter' | 'multiply';

interface VideoTabProps {
  send: (msg: Record<string, unknown>) => void;
  numCannons: number;
  gridColumns: number;
}

function rgbToHsb(r: number, g: number, b: number): [number, number, number] {
  r /= 255;
  g /= 255;
  b /= 255;
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const d = max - min;
  let h = 0;
  const s = max === 0 ? 0 : (d / max) * 100;
  const br = max * 100;
  if (d !== 0) {
    if (max === r) h = ((g - b) / d + (g < b ? 6 : 0)) * 60;
    else if (max === g) h = ((b - r) / d + 2) * 60;
    else h = ((r - g) / d + 4) * 60;
  }
  return [Math.round(h), Math.round(s), Math.round(br)];
}

const blendModes: { key: BlendMode; label: string; desc: string }[] = [
  { key: 'filter', label: 'Brightness', desc: 'Video brightness modulates existing colors — wave hands to control' },
  { key: 'replace', label: 'Replace', desc: 'Video colors replace current grid state' },
  { key: 'multiply', label: 'Multiply', desc: 'Video colors multiply with current state' }
];

export function VideoTab({ send, numCannons, gridColumns }: VideoTabProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const previewCanvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const rafRef = useRef<number>(0);
  const activeRef = useRef(false);

  const [active, setActive] = useState(false);
  const [cameras, setCameras] = useState<MediaDeviceInfo[]>([]);
  const [selectedCamera, setSelectedCamera] = useState<string>('');
  const [blend, setBlend] = useState<BlendMode>('filter');
  const [fps, setFps] = useState(15);
  const [brightness, setBrightness] = useState(150);
  const [saturation, setSaturation] = useState(100);
  const [mirror, setMirror] = useState(true);

  const gridRows = Math.ceil(numCannons / gridColumns);

  // Enumerate cameras on mount
  useEffect(() => {
    navigator.mediaDevices?.enumerateDevices().then((devices) => {
      const videoDevices = devices.filter((d) => d.kind === 'videoinput');
      setCameras(videoDevices);
      if (videoDevices.length > 0 && !selectedCamera) {
        setSelectedCamera(videoDevices[0].deviceId);
      }
    }).catch(() => {});
  }, [selectedCamera]);

  const stopStream = useCallback(() => {
    activeRef.current = false;
    setActive(false);
    if (rafRef.current) cancelAnimationFrame(rafRef.current);
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
    send({ type: 'video_layer_clear' });
  }, [send]);

  const startStream = useCallback(async () => {
    stopStream();
    try {
      const constraints: MediaStreamConstraints = {
        video: selectedCamera
          ? { deviceId: { exact: selectedCamera }, width: { ideal: 320 }, height: { ideal: 320 } }
          : { width: { ideal: 320 }, height: { ideal: 320 } }
      };
      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
      }
      activeRef.current = true;
      setActive(true);
    } catch (err) {
      console.error('Camera access failed:', err);
    }
  }, [selectedCamera, stopStream]);

  // Main sampling loop
  useEffect(() => {
    if (!active) return;

    const canvas = canvasRef.current;
    const video = videoRef.current;
    const preview = previewCanvasRef.current;
    if (!canvas || !video) return;

    const ctx = canvas.getContext('2d', { willReadFrequently: true });
    const previewCtx = preview?.getContext('2d');
    if (!ctx) return;

    canvas.width = gridColumns;
    canvas.height = gridRows;

    let lastFrame = 0;
    const interval = 1000 / fps;

    const sample = (time: number) => {
      if (!activeRef.current) return;
      rafRef.current = requestAnimationFrame(sample);

      if (time - lastFrame < interval) return;
      lastFrame = time;

      if (video.readyState < video.HAVE_CURRENT_DATA) return;

      // Draw video scaled down to grid dimensions
      ctx.save();
      if (mirror) {
        ctx.translate(gridColumns, 0);
        ctx.scale(-1, 1);
      }
      ctx.drawImage(video, 0, 0, gridColumns, gridRows);
      ctx.restore();

      const imageData = ctx.getImageData(0, 0, gridColumns, gridRows);
      const pixels = imageData.data;

      // Draw preview (upscaled)
      if (previewCtx && preview) {
        preview.width = gridColumns * 20;
        preview.height = gridRows * 20;
        previewCtx.imageSmoothingEnabled = false;
        previewCtx.save();
        if (mirror) {
          previewCtx.translate(preview.width, 0);
          previewCtx.scale(-1, 1);
        }
        previewCtx.drawImage(video, 0, 0, preview.width, preview.height);
        previewCtx.restore();

        // Draw grid overlay
        previewCtx.strokeStyle = 'rgba(255,255,255,0.15)';
        previewCtx.lineWidth = 1;
        const cellW = preview.width / gridColumns;
        const cellH = preview.height / gridRows;
        for (let i = 1; i < gridColumns; i++) {
          previewCtx.beginPath();
          previewCtx.moveTo(i * cellW, 0);
          previewCtx.lineTo(i * cellW, preview.height);
          previewCtx.stroke();
        }
        for (let i = 1; i < gridRows; i++) {
          previewCtx.beginPath();
          previewCtx.moveTo(0, i * cellH);
          previewCtx.lineTo(preview.width, i * cellH);
          previewCtx.stroke();
        }
      }

      // Build grid layer and send to server for compositing
      const gridLayer: Array<{ h: number; s: number; b: number }> = [];
      for (let i = 0; i < numCannons; i++) {
        const px = i * 4;
        const r = pixels[px];
        const g = pixels[px + 1];
        const b = pixels[px + 2];

        let [h, s, br] = rgbToHsb(r, g, b);

        // Apply adjustments
        s = Math.min(100, Math.round(s * (saturation / 100)));
        br = Math.min(100, Math.round(br * (brightness / 100)));
        gridLayer.push({ h, s, b: br });
      }

      const serverBlend = blend === 'filter' ? 'brighten' : blend;
      send({ type: 'video_layer', blend: serverBlend, grid: gridLayer });
    };

    rafRef.current = requestAnimationFrame(sample);
    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, [active, fps, numCannons, gridColumns, gridRows, blend, brightness, saturation, mirror, send]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      stopStream();
    };
  }, [stopStream]);

  return (
    <ControlGrid minCellWidth={260}>
      <ControlGroup label="Camera">
        {/* Hidden video element */}
        <video ref={videoRef} playsInline muted className="hidden" />
        <canvas ref={canvasRef} className="hidden" />

        {/* Camera selector */}
        {cameras.length > 1 && (
          <select
            value={selectedCamera}
            onChange={(e) => setSelectedCamera(e.target.value)}
            className="w-full px-3 py-2.5 rounded-lg text-sm"
            style={{
              background: '#12121a',
              color: '#e8e8f0',
              border: '1px solid #1a1a25'
            }}
          >
            {cameras.map((cam) => (
              <option key={cam.deviceId} value={cam.deviceId}>
                {cam.label || `Camera ${cameras.indexOf(cam) + 1}`}
              </option>
            ))}
          </select>
        )}

        {/* Start/Stop button */}
        <button
          onClick={active ? stopStream : startStream}
          className="w-full px-4 py-3 rounded-lg text-sm font-medium transition-all"
          style={{
            background: active ? 'rgba(221,68,68,0.2)' : 'rgba(74,124,255,0.1)',
            color: active ? '#d44' : '#888898',
            border: `1px solid ${active ? 'rgba(221,68,68,0.4)' : '#1a1a25'}`
          }}
        >
          {active ? '⏹ Stop Camera' : '📷 Start Camera'}
        </button>

        {/* Preview */}
        <canvas
          ref={previewCanvasRef}
          className="w-full rounded-lg"
          style={{
            height: 140,
            background: '#0a0a0f',
            objectFit: 'contain'
          }}
        />

        {active && (
          <p className="text-xs" style={{ color: '#4a7cff', opacity: 0.7 }}>
            Camera feed active — sampling at {fps} fps
          </p>
        )}
      </ControlGroup>

      <ControlGroup label="Settings">
        {/* Blend mode */}
        <div>
          <p className="text-sm font-medium mb-2" style={{ color: '#888898', letterSpacing: '0.05em' }}>Blend</p>
          <div className="flex gap-2 flex-wrap">
            {blendModes.map((m) => (
              <button
                key={m.key}
                onClick={() => setBlend(m.key)}
                className="px-4 py-2.5 rounded-full text-sm font-medium transition-all"
                style={{
                  background: blend === m.key ? '#4a7cff' : '#12121a',
                  color: blend === m.key ? '#fff' : '#888898',
                  border: `1px solid ${blend === m.key ? '#4a7cff' : '#1a1a25'}`
                }}
              >
                {m.label}
              </button>
            ))}
          </div>
          <p className="text-sm mt-1" style={{ color: 'rgba(136,136,152,0.5)' }}>
            {blendModes.find((m) => m.key === blend)?.desc}
          </p>
        </div>

        {/* FPS */}
        <div className="flex items-center gap-3">
          <span className="text-sm font-medium" style={{ color: '#888898' }}>FPS</span>
          <input
            type="range"
            className="flex-1"
            min={1}
            max={30}
            value={fps}
            onChange={(e) => setFps(Number(e.target.value))}
          />
          <span className="text-sm font-mono min-w-8 text-right" style={{ color: '#888898' }}>{fps}</span>
        </div>

        {/* Brightness */}
        <div className="flex items-center gap-3">
          <span className="text-sm font-medium" style={{ color: '#888898' }}>Bright</span>
          <input
            type="range"
            className="flex-1"
            min={0}
            max={200}
            value={brightness}
            onChange={(e) => setBrightness(Number(e.target.value))}
          />
          <span className="text-sm font-mono min-w-8 text-right" style={{ color: '#888898' }}>{brightness}%</span>
        </div>

        {/* Saturation */}
        <div className="flex items-center gap-3">
          <span className="text-sm font-medium" style={{ color: '#888898' }}>Sat</span>
          <input
            type="range"
            className="flex-1"
            min={0}
            max={200}
            value={saturation}
            onChange={(e) => setSaturation(Number(e.target.value))}
          />
          <span className="text-sm font-mono min-w-8 text-right" style={{ color: '#888898' }}>{saturation}%</span>
        </div>

        {/* Mirror toggle */}
        <button
          onClick={() => setMirror(!mirror)}
          className="px-4 py-2.5 rounded-2xl text-sm font-medium transition-all"
          style={{
            background: mirror ? 'rgba(74,124,255,0.15)' : '#12121a',
            color: mirror ? '#4a7cff' : '#888898',
            border: `1px solid ${mirror ? '#4a7cff' : '#1a1a25'}`
          }}
        >
          Mirror
        </button>
      </ControlGroup>
    </ControlGrid>
  );
}
