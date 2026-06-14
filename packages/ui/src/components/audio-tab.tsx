'use client';

import { useCallback, useRef } from 'react';

import type { AudioEngine } from '@/lib/use-audio';

interface AudioTabProps {
  audio: AudioEngine;
}

const modes: { key: 'spectrum' | 'energy' | 'beat' | 'drops'; label: string }[] = [
  { key: 'spectrum', label: 'Spectrum' },
  { key: 'energy', label: 'Energy' },
  { key: 'beat', label: 'Beat' },
  { key: 'drops', label: 'Drops' }
];

const blends: { key: 'replace' | 'multiply' | 'additive'; label: string; desc: string }[] = [
  { key: 'replace', label: 'Replace', desc: 'Audio controls colors directly' },
  { key: 'multiply', label: 'Multiply', desc: 'Audio modulates existing state' },
  { key: 'additive', label: 'Add', desc: 'Audio adds on top of current state' }
];

function formatTime(s: number): string {
  const min = Math.floor(s / 60);
  const sec = Math.floor(s % 60);
  return `${min}:${sec.toString().padStart(2, '0')}`;
}

export function AudioTab({ audio }: AudioTabProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const seekRafRef = useRef(0);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    const file = e.dataTransfer.files[0];
    if (file && file.type.startsWith('audio/')) audio.loadFile(file);
  }, [audio]);

  const handleFileInput = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) audio.loadFile(file);
  }, [audio]);

  const handleSeek = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const val = Number(e.target.value);
    cancelAnimationFrame(seekRafRef.current);
    seekRafRef.current = requestAnimationFrame(() => {
      audio.seek(val);
    });
  }, [audio]);

  return (
    <div className="space-y-3">
      {/* Drop zone */}
      <div
        onDragOver={(e) => e.preventDefault()}
        onDrop={handleDrop}
        onClick={() => fileInputRef.current?.click()}
        className="border-2 border-dashed rounded-xl p-3 text-center cursor-pointer transition-all"
        style={{
          borderColor: audio.state.fileName ? '#4a4' : '#1a1a25',
          background: audio.state.fileName ? 'rgba(68,170,68,0.05)' : 'transparent'
        }}
      >
        <input
          ref={fileInputRef}
          type="file"
          accept="audio/*"
          className="hidden"
          onChange={handleFileInput}
        />
        {audio.state.fileName ? (
          <div>
            <p className="text-sm font-medium">{audio.state.fileName}</p>
            <p className="text-xs mt-0.5" style={{ color: '#888898' }}>
              {formatTime(audio.state.duration)}
              {audio.state.bpm && ` · ~${audio.state.bpm} BPM`}
            </p>
          </div>
        ) : (
          <div>
            <p className="text-sm" style={{ color: '#888898' }}>Drop audio file here</p>
            <p className="text-xs mt-0.5" style={{ color: 'rgba(136,136,152,0.5)' }}>MP3, WAV, OGG, FLAC</p>
          </div>
        )}
      </div>

      {/* Transport */}
      {audio.state.fileName && (
        <div className="space-y-2">
          <div className="flex items-center gap-3">
            <button
              onClick={audio.state.playing ? audio.stop : audio.play}
              className="px-4 py-2 rounded-lg text-sm font-medium transition-all"
              style={{
                background: audio.state.playing ? 'rgba(221,68,68,0.2)' : 'rgba(74,124,255,0.2)',
                color: audio.state.playing ? '#d44' : '#4a7cff',
                border: `1px solid ${audio.state.playing ? 'rgba(221,68,68,0.4)' : 'rgba(74,124,255,0.4)'}`
              }}
            >
              {audio.state.playing ? '■ Stop' : '▶ Play'}
            </button>
            <button
              onClick={() => audio.setLoop(!audio.loop)}
              className="px-3 py-2 rounded-lg text-xs font-medium transition-all"
              style={{
                background: audio.loop ? 'rgba(74,124,255,0.15)' : '#12121a',
                color: audio.loop ? '#4a7cff' : '#888898',
                border: `1px solid ${audio.loop ? '#4a7cff' : '#1a1a25'}`
              }}
            >
              {audio.loop ? '⟳ Loop' : '⟳'}
            </button>
            <span className="text-xs font-mono" style={{ color: '#888898' }}>
              {formatTime(audio.state.currentTime)} / {formatTime(audio.state.duration)}
            </span>
            {audio.state.bpm && (
              <span className="text-xs font-mono ml-auto" style={{ color: '#4a7cff' }}>
                ~{audio.state.bpm} BPM
              </span>
            )}
          </div>

          {/* Timeline scrub slider */}
          <input
            type="range"
            className="w-full"
            min={0}
            max={Math.floor(audio.state.duration)}
            value={Math.floor(audio.state.currentTime)}
            onChange={handleSeek}
            style={{ touchAction: 'none' }}
          />
        </div>
      )}

      {/* FFT viz */}
      <canvas
        ref={audio.canvasRef}
        width={400}
        height={80}
        className="w-full rounded-lg"
        style={{ height: 48, background: '#0a0a0f' }}
      />

      {/* Mode */}
      <div>
        <p className="text-xs mb-1" style={{ color: '#888898', letterSpacing: '0.05em' }}>MODE</p>
        <div className="flex gap-1.5">
          {modes.map((m) => (
            <button
              key={m.key}
              onClick={() => audio.setMode(m.key)}
              className="px-3 py-1.5 rounded-full text-xs transition-all"
              style={{
                background: audio.mode === m.key ? '#4a7cff' : '#12121a',
                color: audio.mode === m.key ? '#fff' : '#888898',
                border: `1px solid ${audio.mode === m.key ? '#4a7cff' : '#1a1a25'}`
              }}
            >
              {m.label}
            </button>
          ))}
        </div>
      </div>

      {/* Blend */}
      <div>
        <p className="text-xs mb-1" style={{ color: '#888898', letterSpacing: '0.05em' }}>BLEND</p>
        <div className="flex gap-1.5">
          {blends.map((b) => (
            <button
              key={b.key}
              onClick={() => audio.setBlend(b.key)}
              className="px-3 py-1.5 rounded-full text-xs transition-all"
              style={{
                background: audio.blend === b.key ? '#4a7cff' : '#12121a',
                color: audio.blend === b.key ? '#fff' : '#888898',
                border: `1px solid ${audio.blend === b.key ? '#4a7cff' : '#1a1a25'}`
              }}
            >
              {b.label}
            </button>
          ))}
        </div>
        <p className="text-xs mt-1" style={{ color: 'rgba(136,136,152,0.5)' }}>
          {blends.find((b) => b.key === audio.blend)?.desc}
        </p>
      </div>

      {/* Toggles */}
      <div className="flex items-center gap-4">
        <button
          onClick={() => audio.setSineSpread(!audio.sineSpread)}
          className="px-3 py-1 rounded-2xl text-xs transition-all"
          style={{
            background: audio.sineSpread ? 'rgba(74,124,255,0.15)' : '#12121a',
            color: audio.sineSpread ? '#4a7cff' : '#888898',
            border: `1px solid ${audio.sineSpread ? '#4a7cff' : '#1a1a25'}`
          }}
        >
          Sine Spread
        </button>
        <div className="flex items-center gap-2 flex-1">
          <span className="text-xs" style={{ color: '#888898', fontSize: 9 }}>Sens</span>
          <input
            type="range"
            className="flex-1"
            min={10}
            max={100}
            value={audio.sensitivity}
            onChange={(e) => audio.setSensitivity(Number(e.target.value))}
          />
          <span className="text-xs font-mono min-w-8 text-right" style={{ color: '#888898' }}>{audio.sensitivity}%</span>
        </div>
      </div>

      {audio.state.playing && (
        <p className="text-xs" style={{ color: '#4a7cff', opacity: 0.7 }}>
          Audio keeps playing when you switch tabs
        </p>
      )}
    </div>
  );
}
