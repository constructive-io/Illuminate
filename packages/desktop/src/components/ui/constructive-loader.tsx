import { cn } from '@/lib/utils';

// The Constructive brand loader: six cubes that fly in from above and settle into
// the "C" mark, looping. The animation lives in CSS `@keyframes` inside the SVG,
// so it must render as live inline markup (not an <img>/mask, which freeze it).
// The viewBox frames the settled mark; `overflow: visible` lets the cubes animate
// in from above the frame so the resting logo stays centered.
const LOADER_CSS = `
@keyframes cl-cube0 { 0% { transform: translateY(-600px); opacity: 0; } 35.7%, 100% { transform: translateY(0); opacity: 1; } }
@keyframes cl-cube1 { 0%, 8.6% { transform: translateY(-680px); opacity: 0; } 44.3%, 100% { transform: translateY(0); opacity: 1; } }
@keyframes cl-cube2 { 0%, 17.1% { transform: translateY(-760px); opacity: 0; } 52.9%, 100% { transform: translateY(0); opacity: 1; } }
@keyframes cl-cube3 { 0%, 25.7% { transform: translateY(-840px); opacity: 0; } 61.4%, 100% { transform: translateY(0); opacity: 1; } }
@keyframes cl-cube4 { 0%, 34.3% { transform: translateY(-920px); opacity: 0; } 70%, 100% { transform: translateY(0); opacity: 1; } }
@keyframes cl-cube5 { 0%, 42.9% { transform: translateY(-1000px); opacity: 0; } 78.6%, 100% { transform: translateY(0); opacity: 1; } }
.cl-cube-0 { animation: cl-cube0 1.4s cubic-bezier(0.65, 0, 0.35, 1) infinite alternate; }
.cl-cube-1 { animation: cl-cube1 1.4s cubic-bezier(0.65, 0, 0.35, 1) infinite alternate; }
.cl-cube-2 { animation: cl-cube2 1.4s cubic-bezier(0.65, 0, 0.35, 1) infinite alternate; }
.cl-cube-3 { animation: cl-cube3 1.4s cubic-bezier(0.65, 0, 0.35, 1) infinite alternate; }
.cl-cube-4 { animation: cl-cube4 1.4s cubic-bezier(0.65, 0, 0.35, 1) infinite alternate; }
.cl-cube-5 { animation: cl-cube5 1.4s cubic-bezier(0.65, 0, 0.35, 1) infinite alternate; }
`;

const STROKE = { fill: 'none', stroke: '#01A1FF', strokeWidth: 10, strokeLinejoin: 'round' as const };
const WHITE = { ...STROKE, fill: '#FFFFFF' };
const BLUE = { ...STROKE, fill: '#01A1FF' };

export function ConstructiveLoader({ className }: { className?: string }) {
  return (
    <svg
      viewBox='-115 -135 445 690'
      style={{ overflow: 'visible' }}
      className={cn('h-auto w-28', className)}
      xmlns='http://www.w3.org/2000/svg'
    >
      <style>{LOADER_CSS}</style>
      <g className='cl-cube-0'>
        <path d='M103.923 300 L207.846 360 L207.846 480 L103.923 420 Z' {...WHITE} />
        <path d='M311.769 300 L207.846 360 L207.846 480 L311.769 420 Z' {...BLUE} />
        <path d='M207.846 240 L311.769 300 L207.846 360 L103.923 300 Z' {...WHITE} />
      </g>
      <g className='cl-cube-1'>
        <path d='M0 360 L103.923 420 L103.923 540 L0 480 Z' {...WHITE} />
        <path d='M207.846 360 L103.923 420 L103.923 540 L207.846 480 Z' {...BLUE} />
        <path d='M103.923 300 L207.846 360 L103.923 420 L0 360 Z' {...WHITE} />
      </g>
      <g className='cl-cube-2'>
        <path d='M103.923 -60 L207.846 0 L207.846 120 L103.923 60 Z' {...WHITE} />
        <path d='M311.769 -60 L207.846 0 L207.846 120 L311.769 60 Z' {...BLUE} />
        <path d='M207.846 -120 L311.769 -60 L207.846 0 L103.923 -60 Z' {...WHITE} />
      </g>
      <g className='cl-cube-3'>
        <path d='M-103.923 300 L0 360 L0 480 L-103.923 420 Z' {...WHITE} />
        <path d='M103.923 300 L0 360 L0 480 L103.923 420 Z' {...BLUE} />
        <path d='M0 240 L103.923 300 L0 360 L-103.923 300 Z' {...WHITE} />
      </g>
      <g className='cl-cube-4'>
        <path d='M0 0 L103.923 60 L103.923 180 L0 120 Z' {...WHITE} />
        <path d='M207.846 0 L103.923 60 L103.923 180 L207.846 120 Z' {...BLUE} />
        <path d='M103.923 -60 L207.846 0 L103.923 60 L0 0 Z' {...WHITE} />
      </g>
      <g className='cl-cube-5'>
        <path d='M-103.923 180 L0 240 L0 360 L-103.923 300 Z' {...WHITE} />
        <path d='M103.923 180 L0 240 L0 360 L103.923 300 Z' {...BLUE} />
        <path d='M0 120 L103.923 180 L0 240 L-103.923 180 Z' {...WHITE} />
      </g>
    </svg>
  );
}
