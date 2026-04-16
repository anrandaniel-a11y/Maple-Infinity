import React, { useState, useEffect } from 'react';
import { useGameStore } from '../../store/gameStore';

export function HudDraggable({ id, children, defaultClassName = "" }: { id: string, children: React.ReactNode, defaultClassName?: string }) {
  const isCustomizing = useGameStore(state => state.isCustomizingControls);
  const hudPositions = useGameStore(state => state.hudPositions);
  const setHudPositions = useGameStore(state => state.setHudPositions);
  const position = hudPositions[id] || { x: 50, y: 50, scale: 1 };
  const [selected, setSelected] = useState(false);

  useEffect(() => {
    if (!isCustomizing) return;
    let isDragging = false;
    let lastX = 0;
    let lastY = 0;

    const handlePointerDown = (e: PointerEvent) => {
      const el = document.getElementById(`hud-wrap-${id}`);
      if (el && el.contains(e.target as Node)) {
        isDragging = true;
        setSelected(true);
        lastX = e.clientX;
        lastY = e.clientY;
        e.stopPropagation();
      } else {
        setSelected(false);
      }
    };

    const handlePointerMove = (e: PointerEvent) => {
      if (!isDragging) return;
      if (e.buttons !== 1 && e.type === 'pointermove' && e.pointerType === 'mouse') { // allow touch to continue
        // this is tricky, just check if it's dragging
      }
      const dx = ((e.clientX - lastX) / window.innerWidth) * 100;
      const dy = ((e.clientY - lastY) / window.innerHeight) * 100;
      lastX = e.clientX;
      lastY = e.clientY;

      setHudPositions({
        ...useGameStore.getState().hudPositions,
        [id]: {
          ...position,
          x: Math.max(0, Math.min(100, position.x + dx)),
          y: Math.max(0, Math.min(100, position.y + dy)),
        }
      });
    };

    const handlePointerUp = () => {
      isDragging = false;
    };

    window.addEventListener('pointerdown', handlePointerDown);
    window.addEventListener('pointermove', handlePointerMove);
    window.addEventListener('pointerup', handlePointerUp);

    return () => {
      window.removeEventListener('pointerdown', handlePointerDown);
      window.removeEventListener('pointermove', handlePointerMove);
      window.removeEventListener('pointerup', handlePointerUp);
    };
  }, [isCustomizing, id, position, setHudPositions]);

  return (
    <div
      id={`hud-wrap-${id}`}
      className={`absolute ${defaultClassName} ${isCustomizing ? 'pointer-events-auto cursor-move z-[100]' : 'pointer-events-none'}`}
      style={{
        left: `${position.x}%`,
        top: `${position.y}%`,
        transform: `translate(-50%, -50%) scale(${position.scale})`,
        zIndex: selected ? 110 : (isCustomizing ? 100 : 10),
        boxShadow: (isCustomizing && selected) ? '0 0 0 4px #0ff' : (isCustomizing ? '0 0 0 2px rgba(255,255,255,0.2)' : 'none'),
        userSelect: 'none',
        touchAction: 'none'
      }}
    >
      <div className={isCustomizing ? 'pointer-events-none' : 'pointer-events-auto'}>
        {children}
      </div>
      {isCustomizing && selected && (
        <div className="absolute top-full left-1/2 -translate-x-1/2 mt-2 bg-black/90 rounded-lg p-3 flex flex-col gap-2 pointer-events-auto min-w-[150px]" onPointerDown={e => e.stopPropagation()}>
            <label className="text-cyan-400 text-xs font-bold uppercase tracking-widest text-center">Scale: {position.scale.toFixed(1)}x</label>
            <input type="range" min="0.5" max="3" step="0.1" value={position.scale} onChange={e => {
                setHudPositions({
                    ...useGameStore.getState().hudPositions,
                    [id]: { ...position, scale: parseFloat(e.target.value) }
                });
            }} className="w-full accent-cyan-400" />
        </div>
      )}
    </div>
  );
}
