'use client';

import { useCallback, useEffect, useRef, useState } from 'react';

import type { CannonColor } from '@/lib/use-socket';

interface AudioTabProps {
  numCannons: number;
  gridColumns: number;
  grid: CannonColor[];
  send: (msg: Record<string, unknown>) => void;
}

type AudioMode = 'spectrum' | 'energy' | 'beat' | 'drops';
type BlendMode = 'replace' | 'multiply' | 'additive';

interface AudioState {
  playing: boolean;
  fileName: string | null;
  duration: number;
  currentTime: number;
  bpm: number | null;
}

interface Drop {
  origin: number;
  tick: number;
  hue: number;
}

export function AudioTab({ numCannons, gridColumns, grid, send }: AudioTabProps) {
  const [audioState, setAudioState] = useState<AudioState>({
    playing: false,
    fileName: null,
    duration: 0,
    currentTime: 0,
    bpm: null
  });
  const [dragOver, setDragOver] = useState(false);
  const [mode, setMode] = useState<AudioMode>('spectrum');
  const [blend, setBlend] = useState<BlendMode>('replace');
  const [sensitivity, setSensitivity] = useState(70);
  const [sineSpread, setSineSpread] = useState(true);

  const audioContextRef = useRef<AudioContext | null>(null);
  const sourceRef = useRef<AudioBufferSourceNode | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const audioBufferRef = useRef<AudioBuffer | null>(null);
  const animFrameRef = useRef<number>(0);
  const startTimeRef = useRef(0);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const dropsRef = useRef<Drop[]>([]);
  const gridRef = useRef<CannonColor[]>(grid);

  // Keep grid ref in sync
  useEffect(() => {
    gridRef.current = grid;
  }, [grid]);

  const stopPlayback = useCallback(() => {
    if (sourceRef.current) {
      try { sourceRef.current.stop(); } catch { /* already stopped */ }
      sourceRef.current = null;
    }
    if (animFrameRef.current) {
      cancelAnimationFrame(animFrameRef.current);
      animFrameRef.current = 0;
    }
    dropsRef.current = [];
    setAudioState((s) => ({ ...s, playing: false, currentTime: 0 }));
  }, []);

  const applyBlend = useCallback((
    index: number,
    audioH: number,
    audioS: number,
    audioB: number
  ) => {
    const cur = gridRef.current[index] || { h: 0, s: 0, b: 0 };

    if (blend === 'replace') {
      send({ type: 'cannon', index, h: audioH, s: audioS, b: audioB });
    } else if (blend === 'multiply') {
      const h = (cur.h + audioH * 0.3) % 360;
      const s = Math.min(100, cur.s * (0.5 + audioB / 200));
      const b = Math.min(100, cur.b * (audioB / 80));
      send({ type: 'cannon', index, h, s, b });
    } else {
      const h = (cur.h + audioH * 0.2) % 360;
      const s = Math.min(100, Math.max(cur.s, audioS));
      const b = Math.min(100, cur.b + audioB * 0.4);
      send({ type: 'cannon', index, h, s, b });
    }
  }, [blend, send]);

  const processAudioFrame = useCallback(() => {
    if (!analyserRef.current) return;

    const analyser = analyserRef.current;
    const bufLen = analyser.frequencyBinCount;
    const dataArray = new Uint8Array(bufLen);
    analyser.getByteFrequencyData(dataArray);

    // Draw FFT visualization
    const canvas = canvasRef.current;
    if (canvas) {
      const ctx = canvas.getContext('2d');
      if (ctx) {
        const w = canvas.width;
        const h = canvas.height;
        ctx.fillStyle = '#0a0a0f';
        ctx.fillRect(0, 0, w, h);

        const barWidth = w / bufLen * 2.5;
        let x = 0;
        for (let i = 0; i < bufLen; i++) {
          const v = dataArray[i] / 255;
          const barH = v * h;
          const hue = (i / bufLen) * 300;
          ctx.fillStyle = `hsl(${hue}, 80%, ${30 + v * 40}%)`;
          ctx.fillRect(x, h - barH, barWidth - 1, barH);
          x += barWidth;
          if (x > w) break;
        }
      }
    }

    const sens = sensitivity / 100;
    const rows = Math.ceil(numCannons / gridColumns);

    if (mode === 'spectrum') {
      for (let col = 0; col < gridColumns; col++) {
        const bandStart = Math.floor((col / gridColumns) * bufLen);
        const bandEnd = Math.floor(((col + 1) / gridColumns) * bufLen);
        let bandEnergy = 0;
        for (let i = bandStart; i < bandEnd; i++) bandEnergy += dataArray[i];
        bandEnergy = (bandEnergy / (bandEnd - bandStart)) / 255;

        const hue = (col / gridColumns) * 300;

        for (let row = 0; row < rows; row++) {
          const idx = row * gridColumns + col;
          if (idx >= numCannons) continue;
          const rowThreshold = 1 - (row + 1) / rows;
          let bright = bandEnergy * sens > rowThreshold ? 60 + bandEnergy * 40 : 5;

          // Sine spread: blend with neighboring columns
          if (sineSpread && bright > 5) {
            for (let dc = -1; dc <= 1; dc++) {
              if (dc === 0) continue;
              const nc = col + dc;
              if (nc < 0 || nc >= gridColumns) continue;
              const nIdx = row * gridColumns + nc;
              if (nIdx >= numCannons) continue;
              const falloff = Math.cos((Math.PI / 2) * Math.abs(dc));
              applyBlend(nIdx, hue, 85, bright * falloff * 0.4);
            }
          }

          applyBlend(idx, hue, 85, bright);
        }
      }
    } else if (mode === 'energy') {
      let totalEnergy = 0;
      for (let i = 0; i < bufLen; i++) totalEnergy += dataArray[i];
      totalEnergy = (totalEnergy / bufLen) / 255;

      let lowEnergy = 0;
      const lowBins = Math.floor(bufLen * 0.15);
      for (let i = 0; i < lowBins; i++) lowEnergy += dataArray[i];
      lowEnergy = (lowEnergy / lowBins) / 255;

      const hue = lowEnergy * 240;
      const bright = 20 + totalEnergy * sens * 80;

      for (let i = 0; i < numCannons; i++) {
        applyBlend(i, hue, 80, bright);
      }
    } else if (mode === 'beat') {
      let totalEnergy = 0;
      for (let i = 0; i < bufLen; i++) totalEnergy += dataArray[i];
      totalEnergy = totalEnergy / bufLen / 255;

      const threshold = 0.35 * sens;
      const isBeat = totalEnergy > threshold;

      for (let col = 0; col < gridColumns; col++) {
        const bandStart = Math.floor((col / gridColumns) * bufLen);
        const bandEnd = Math.floor(((col + 1) / gridColumns) * bufLen);
        let bandVal = 0;
        for (let i = bandStart; i < bandEnd; i++) bandVal += dataArray[i];
        bandVal = (bandVal / (bandEnd - bandStart)) / 255;

        for (let row = 0; row < rows; row++) {
          const idx = row * gridColumns + col;
          if (idx >= numCannons) continue;
          const hue = isBeat ? 0 + col * 30 : 220;
          const bright = isBeat ? 70 + bandVal * 30 : 10 + bandVal * 20;
          applyBlend(idx, hue % 360, 90, bright);
        }
      }
    } else if (mode === 'drops') {
      // Drops mode: frequency bands trigger drops at top row
      for (let col = 0; col < gridColumns; col++) {
        const bandStart = Math.floor((col / gridColumns) * bufLen);
        const bandEnd = Math.floor(((col + 1) / gridColumns) * bufLen);
        let bandEnergy = 0;
        for (let i = bandStart; i < bandEnd; i++) bandEnergy += dataArray[i];
        bandEnergy = (bandEnergy / (bandEnd - bandStart)) / 255;

        // Trigger a new drop when energy exceeds threshold
        if (bandEnergy * sens > 0.5) {
          const origin = col; // top row
          const alreadyActive = dropsRef.current.some(
            (d) => d.origin === origin && d.tick < 3
          );
          if (!alreadyActive) {
            dropsRef.current.push({
              origin,
              tick: 0,
              hue: (col / gridColumns) * 300
            });
          }
        }
      }

      // Accumulate drop contributions
      const contrib = new Float32Array(numCannons);
      const hues = new Float32Array(numCannons);
      const counts = new Float32Array(numCannons);
      const maxRadius = rows * 1.5;
      const speedMult = 0.4;
      const ringWidth = 2;
      const decayRate = 0.7;

      for (let d = dropsRef.current.length - 1; d >= 0; d--) {
        const drop = dropsRef.current[d];
        const radius = drop.tick * speedMult;
        if (radius > maxRadius + ringWidth) {
          dropsRef.current.splice(d, 1);
          continue;
        }

        const oCol = drop.origin;

        for (let i = 0; i < numCannons; i++) {
          const r = Math.floor(i / gridColumns);
          const c = i % gridColumns;
          const dist = Math.sqrt(r * r + (c - oCol) * (c - oCol));
          const delta = Math.abs(dist - radius);
          if (delta > ringWidth) continue;

          const ringFalloff = 1 - (delta / ringWidth);
          const ageFalloff = Math.pow(decayRate, drop.tick * 0.3);
          const intensity = ringFalloff * ageFalloff * 80 * sens;
          if (intensity < 1) continue;

          contrib[i] += intensity;
          hues[i] += drop.hue * intensity;
          counts[i] += intensity;
        }

        drop.tick++;
      }

      for (let i = 0; i < numCannons; i++) {
        if (counts[i] > 0) {
          const h = (hues[i] / counts[i] + 360) % 360;
          const b = Math.min(100, contrib[i]);
          applyBlend(i, h, 90, b);
        } else if (blend === 'replace') {
          // Fade out cannons with no drop contribution
          applyBlend(i, 220, 0, 3);
        }
      }
    }

    if (audioContextRef.current) {
      setAudioState((s) => ({
        ...s,
        currentTime: audioContextRef.current!.currentTime - startTimeRef.current
      }));
    }

    animFrameRef.current = requestAnimationFrame(processAudioFrame);
  }, [mode, blend, sensitivity, sineSpread, numCannons, gridColumns, applyBlend]);

  const startPlayback = useCallback(() => {
    if (!audioBufferRef.current || !audioContextRef.current) return;

    stopPlayback();

    const ctx = audioContextRef.current;
    const source = ctx.createBufferSource();
    source.buffer = audioBufferRef.current;

    const analyser = ctx.createAnalyser();
    analyser.fftSize = 256;
    source.connect(analyser);
    analyser.connect(ctx.destination);

    analyserRef.current = analyser;
    sourceRef.current = source;
    startTimeRef.current = ctx.currentTime;

    source.onended = () => {
      setAudioState((s) => ({ ...s, playing: false, currentTime: 0 }));
      if (animFrameRef.current) {
        cancelAnimationFrame(animFrameRef.current);
        animFrameRef.current = 0;
      }
    };

    source.start();
    setAudioState((s) => ({ ...s, playing: true, currentTime: 0 }));
    animFrameRef.current = requestAnimationFrame(processAudioFrame);
  }, [stopPlayback, processAudioFrame]);

  const detectBPM = useCallback((buffer: AudioBuffer): number | null => {
    const data = buffer.getChannelData(0);
    const sampleRate = buffer.sampleRate;
    const windowSize = Math.floor(sampleRate * 0.05);
    const energies: number[] = [];

    for (let i = 0; i < data.length - windowSize; i += windowSize) {
      let energy = 0;
      for (let j = 0; j < windowSize; j++) {
        energy += data[i + j] * data[i + j];
      }
      energies.push(energy / windowSize);
    }

    const peaks: number[] = [];
    const avgEnergy = energies.reduce((a, b) => a + b, 0) / energies.length;
    for (let i = 1; i < energies.length - 1; i++) {
      if (energies[i] > avgEnergy * 1.5 && energies[i] > energies[i - 1] && energies[i] > energies[i + 1]) {
        peaks.push(i);
      }
    }

    if (peaks.length < 4) return null;

    const intervals: number[] = [];
    for (let i = 1; i < peaks.length; i++) {
      intervals.push((peaks[i] - peaks[i - 1]) * 0.05);
    }

    intervals.sort((a, b) => a - b);
    const median = intervals[Math.floor(intervals.length / 2)];
    if (median <= 0) return null;

    const bpm = Math.round(60 / median);
    if (bpm < 60) return bpm * 2;
    if (bpm > 200) return Math.round(bpm / 2);
    return bpm;
  }, []);

  const loadFile = useCallback(async (file: File) => {
    if (!audioContextRef.current) {
      audioContextRef.current = new AudioContext();
    }

    const arrayBuffer = await file.arrayBuffer();
    const audioBuffer = await audioContextRef.current.decodeAudioData(arrayBuffer);
    audioBufferRef.current = audioBuffer;

    const bpm = detectBPM(audioBuffer);

    setAudioState({
      playing: false,
      fileName: file.name,
      duration: audioBuffer.duration,
      currentTime: 0,
      bpm
    });
  }, [detectBPM]);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer.files[0];
    if (file && file.type.startsWith('audio/')) {
      loadFile(file);
    }
  }, [loadFile]);

  const handleFileInput = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) loadFile(file);
  }, [loadFile]);

  useEffect(() => {
    return () => {
      stopPlayback();
      if (audioContextRef.current) {
        audioContextRef.current.close();
      }
    };
  }, [stopPlayback]);

  const formatTime = (s: number) => {
    const min = Math.floor(s / 60);
    const sec = Math.floor(s % 60);
    return `${min}:${sec.toString().padStart(2, '0')}`;
  };

  const modes: { key: AudioMode; label: string }[] = [
    { key: 'spectrum', label: 'Spectrum' },
    { key: 'energy', label: 'Energy' },
    { key: 'beat', label: 'Beat' },
    { key: 'drops', label: 'Drops' }
  ];

  const blends: { key: BlendMode; label: string; desc: string }[] = [
    { key: 'replace', label: 'Replace', desc: 'Audio controls colors directly' },
    { key: 'multiply', label: 'Multiply', desc: 'Audio modulates existing state' },
    { key: 'additive', label: 'Add', desc: 'Audio adds on top of current state' }
  ];

  return (
    <div className="space-y-3">
      {/* Drop zone */}
      <div
        onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
        onDragLeave={() => setDragOver(false)}
        onDrop={handleDrop}
        onClick={() => fileInputRef.current?.click()}
        className="border-2 border-dashed rounded-xl p-4 text-center cursor-pointer transition-all"
        style={{
          borderColor: dragOver ? '#4a7cff' : audioState.fileName ? '#4a4' : '#1a1a25',
          background: dragOver ? 'rgba(74,124,255,0.1)' : audioState.fileName ? 'rgba(68,170,68,0.05)' : 'transparent'
        }}
      >
        <input
          ref={fileInputRef}
          type="file"
          accept="audio/*"
          className="hidden"
          onChange={handleFileInput}
        />
        {audioState.fileName ? (
          <div>
            <p className="text-sm font-medium">{audioState.fileName}</p>
            <p className="text-xs mt-1" style={{ color: '#888898' }}>
              {formatTime(audioState.duration)}
              {audioState.bpm && ` · ~${audioState.bpm} BPM`}
            </p>
          </div>
        ) : (
          <div>
            <p className="text-sm" style={{ color: '#888898' }}>Drop audio file here</p>
            <p className="text-xs mt-1" style={{ color: 'rgba(136,136,152,0.6)' }}>MP3, WAV, OGG, FLAC</p>
          </div>
        )}
      </div>

      {/* Transport */}
      {audioState.fileName && (
        <div className="flex items-center gap-3">
          <button
            onClick={audioState.playing ? stopPlayback : startPlayback}
            className="px-4 py-2 rounded-lg text-sm font-medium transition-all"
            style={{
              background: audioState.playing ? 'rgba(221,68,68,0.2)' : 'rgba(74,124,255,0.2)',
              color: audioState.playing ? '#d44' : '#4a7cff',
              border: `1px solid ${audioState.playing ? 'rgba(221,68,68,0.4)' : 'rgba(74,124,255,0.4)'}`
            }}
          >
            {audioState.playing ? '■ Stop' : '▶ Play'}
          </button>
          <span className="text-xs font-mono" style={{ color: '#888898' }}>
            {formatTime(audioState.currentTime)} / {formatTime(audioState.duration)}
          </span>
          {audioState.bpm && (
            <span className="text-xs font-mono ml-auto" style={{ color: '#4a7cff' }}>
              ~{audioState.bpm} BPM
            </span>
          )}
        </div>
      )}

      {/* FFT viz */}
      <canvas
        ref={canvasRef}
        width={400}
        height={80}
        className="w-full rounded-lg"
        style={{ height: 64, background: '#0a0a0f' }}
      />

      {/* Mode selector */}
      <div>
        <p className="text-xs mb-1.5" style={{ color: '#888898', letterSpacing: '0.05em' }}>MODE</p>
        <div className="flex gap-1.5">
          {modes.map((m) => (
            <button
              key={m.key}
              onClick={() => setMode(m.key)}
              className="px-3 py-1.5 rounded-full text-xs transition-all"
              style={{
                background: mode === m.key ? '#4a7cff' : '#12121a',
                color: mode === m.key ? '#fff' : '#888898',
                border: `1px solid ${mode === m.key ? '#4a7cff' : '#1a1a25'}`
              }}
            >
              {m.label}
            </button>
          ))}
        </div>
      </div>

      {/* Blend mode */}
      <div>
        <p className="text-xs mb-1.5" style={{ color: '#888898', letterSpacing: '0.05em' }}>BLEND</p>
        <div className="flex gap-1.5">
          {blends.map((b) => (
            <button
              key={b.key}
              onClick={() => setBlend(b.key)}
              className="px-3 py-1.5 rounded-full text-xs transition-all"
              style={{
                background: blend === b.key ? '#4a7cff' : '#12121a',
                color: blend === b.key ? '#fff' : '#888898',
                border: `1px solid ${blend === b.key ? '#4a7cff' : '#1a1a25'}`
              }}
            >
              {b.label}
            </button>
          ))}
        </div>
        <p className="text-xs mt-1" style={{ color: 'rgba(136,136,152,0.6)' }}>
          {blends.find((b) => b.key === blend)?.desc}
        </p>
      </div>

      {/* Toggles & sensitivity */}
      <div className="flex items-center gap-4">
        <button
          onClick={() => setSineSpread(!sineSpread)}
          className="px-3 py-1.5 rounded-2xl text-xs transition-all"
          style={{
            background: sineSpread ? 'rgba(74,124,255,0.1)' : '#12121a',
            color: sineSpread ? '#4a7cff' : '#888898',
            border: `1px solid ${sineSpread ? '#4a7cff' : '#1a1a25'}`
          }}
        >
          Sine Spread
        </button>
        <div className="flex items-center gap-2 flex-1">
          <span className="text-xs" style={{ color: '#888898' }}>Sens</span>
          <input
            type="range"
            className="flex-1"
            min={10}
            max={100}
            value={sensitivity}
            onChange={(e) => setSensitivity(Number(e.target.value))}
          />
          <span className="text-xs font-mono min-w-8 text-right" style={{ color: '#888898' }}>{sensitivity}%</span>
        </div>
      </div>
    </div>
  );
}
