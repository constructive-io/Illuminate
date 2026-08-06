import { useCallback, useEffect, useRef, useState } from 'react';

export type SnapPoint = 'peek' | 'half' | 'full';

const PEEK_PX = 80;
const HALF_FRAC = 0.50;
const FULL_FRAC = 0.90;

interface BottomSheetProps {
  children: React.ReactNode;
  snap: SnapPoint;
  onSnapChange: (s: SnapPoint) => void;
}

function getDvh(): number {
  return window.visualViewport?.height ?? window.innerHeight;
}

function getSnapHeight(s: SnapPoint, vh: number): number {
  switch (s) {
  case 'peek': return PEEK_PX;
  case 'half': return vh * HALF_FRAC;
  case 'full': return vh * FULL_FRAC;
  }
}

export function BottomSheet({ children, snap, onSnapChange }: BottomSheetProps) {
  const sheetRef = useRef<HTMLDivElement>(null);
  const isDragging = useRef(false);
  const startY = useRef(0);
  const startH = useRef(0);
  const [height, setHeight] = useState(PEEK_PX);

  useEffect(() => {
    setHeight(getSnapHeight(snap, getDvh()));
  }, [snap]);

  useEffect(() => {
    const onResize = () => {
      if (!isDragging.current) setHeight(getSnapHeight(snap, getDvh()));
    };
    window.addEventListener('resize', onResize);
    window.visualViewport?.addEventListener('resize', onResize);
    return () => {
      window.removeEventListener('resize', onResize);
      window.visualViewport?.removeEventListener('resize', onResize);
    };
  }, [snap]);

  const handlePointerDown = useCallback((e: React.PointerEvent) => {
    isDragging.current = true;
    startY.current = e.clientY;
    startH.current = height;
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
  }, [height]);

  const handlePointerMove = useCallback((e: React.PointerEvent) => {
    if (!isDragging.current) return;
    const dy = startY.current - e.clientY;
    const newH = Math.max(50, Math.min(getDvh() * 0.95, startH.current + dy));
    setHeight(newH);
  }, []);

  const handlePointerUp = useCallback(() => {
    if (!isDragging.current) return;
    isDragging.current = false;

    const vh = getDvh();
    const peekH = PEEK_PX;
    const halfH = vh * HALF_FRAC;
    const fullH = vh * FULL_FRAC;

    const dPeek = Math.abs(height - peekH);
    const dHalf = Math.abs(height - halfH);
    const dFull = Math.abs(height - fullH);

    if (dPeek <= dHalf && dPeek <= dFull) {
      onSnapChange('peek');
    } else if (dFull <= dHalf) {
      onSnapChange('full');
    } else {
      onSnapChange('half');
    }
  }, [height, onSnapChange]);

  return (
    <div
      ref={sheetRef}
      className="fixed left-0 right-0 bottom-0 z-50 flex flex-col"
      style={{
        height,
        background: '#0c0c12',
        borderTop: '1px solid #1a1a25',
        borderRadius: '16px 16px 0 0',
        transition: isDragging.current ? 'none' : 'height 0.3s cubic-bezier(0.32, 0.72, 0, 1)',
        willChange: 'height'
      }}
    >
      {/* Drag handle */}
      <div
        className="flex items-center justify-center shrink-0 cursor-grab active:cursor-grabbing"
        style={{ height: 32, touchAction: 'none' }}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerCancel={handlePointerUp}
      >
        <div style={{ width: 40, height: 5, borderRadius: 3, background: '#444' }} />
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto overflow-x-hidden" style={{ WebkitOverflowScrolling: 'touch' }}>
        {children}
      </div>
    </div>
  );
}
