import React, { useState, useRef, useEffect } from 'react';
import { useGameStore, ControlElementConfig, MobileControlsConfig, defaultMobileControls } from '../../store/gameStore';
import { Joystick } from 'react-joystick-component';
import { Crosshair, Zap, ChevronUp, Save, Upload, RotateCcw, X } from 'lucide-react';

export function MobileControls({ isCustomizing, onStopCustomizing, canMelee, me }: { isCustomizing: boolean, onStopCustomizing: () => void, canMelee: boolean, me: any }) {
  const mobileControls = useGameStore((state) => state.mobileControls);
  const setMobileControls = useGameStore((state) => state.setMobileControls);
  
  const [localControls, setLocalControls] = useState<MobileControlsConfig>(mobileControls);
  const [selectedControl, setSelectedControl] = useState<keyof MobileControlsConfig | null>(null);

  useEffect(() => {
    if (!isCustomizing) {
      setLocalControls(mobileControls);
    }
  }, [isCustomizing, mobileControls]);

  const handleSave = () => {
    setMobileControls(localControls);
    onStopCustomizing();
  };

  const handleExport = () => {
    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(localControls));
    const downloadAnchorNode = document.createElement('a');
    downloadAnchorNode.setAttribute("href",     dataStr);
    downloadAnchorNode.setAttribute("download", "controls.json");
    document.body.appendChild(downloadAnchorNode); // required for firefox
    downloadAnchorNode.click();
    downloadAnchorNode.remove();
  };

  const handleImport = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const imported = JSON.parse(event.target?.result as string);
        if (imported && imported.joystick && imported.shoot) {
          setLocalControls(imported);
        }
      } catch (err) {
        console.error("Failed to parse controls.json", err);
      }
    };
    reader.readAsText(file);
  };

  const handleReset = () => {
    setLocalControls(defaultMobileControls);
  };

  const updateSelectedControl = (updates: Partial<ControlElementConfig>) => {
    if (!selectedControl) return;
    setLocalControls(prev => ({
      ...prev,
      [selectedControl]: { ...prev[selectedControl], ...updates }
    }));
  };

  const renderControl = (
    key: keyof MobileControlsConfig, 
    content: React.ReactNode, 
    baseSize: number, 
    defaultClassName: string
  ) => {
    const config = localControls[key];
    const isSelected = selectedControl === key;
    
    return (
      <div 
        className={`absolute transform -translate-x-1/2 -translate-y-1/2 ${isCustomizing ? 'pointer-events-auto cursor-move' : 'pointer-events-auto'} ${isSelected ? 'ring-4 ring-yellow-400 rounded-full' : ''}`}
        style={{
          left: `${config.x}%`,
          top: `${config.y}%`,
          opacity: config.opacity,
          transform: `translate(-50%, -50%) scale(${config.size})`,
          zIndex: isSelected ? 50 : 10,
        }}
        onPointerDown={(e) => {
          if (isCustomizing) {
            e.stopPropagation();
            setSelectedControl(key);
          }
        }}
      >
        <div className={defaultClassName} style={{ width: baseSize, height: baseSize }}>
          {content}
        </div>
      </div>
    );
  };

  // Dragging logic for customizing
  useEffect(() => {
    if (!isCustomizing || !selectedControl) return;

    let lastX = 0;
    let lastY = 0;
    let isDragging = false;

    const handlePointerMove = (e: PointerEvent) => {
      if (e.buttons !== 1) {
        isDragging = false;
        return;
      }
      
      if (!isDragging) {
        isDragging = true;
        lastX = e.clientX;
        lastY = e.clientY;
        return;
      }

      const dx = ((e.clientX - lastX) / window.innerWidth) * 100;
      const dy = ((e.clientY - lastY) / window.innerHeight) * 100;
      
      lastX = e.clientX;
      lastY = e.clientY;

      setLocalControls(prev => {
        const config = prev[selectedControl];
        return {
          ...prev,
          [selectedControl]: {
            ...config,
            x: config.x + dx,
            y: config.y + dy
          }
        };
      });
    };

    const handlePointerUp = () => {
      isDragging = false;
    };

    window.addEventListener('pointermove', handlePointerMove);
    window.addEventListener('pointerup', handlePointerUp);
    return () => {
      window.removeEventListener('pointermove', handlePointerMove);
      window.removeEventListener('pointerup', handlePointerUp);
    };
  }, [isCustomizing, selectedControl]);

  return (
    <>
      {/* Controls Rendering */}
      {renderControl('joystick', 
        <div className="w-full h-full rounded-full bg-black/50 border-2 border-cyan-500/50 flex items-center justify-center pointer-events-none">
          <div className="w-1/2 h-1/2 rounded-full bg-cyan-500/50" />
        </div>, 
        100, 
        ""
      )}

      {(!isCustomizing && !me) ? null : (
        <>
          {(isCustomizing || me?.weapon === 'KNIFE') && renderControl('melee',
            <button 
              className={`w-full h-full rounded-full border-2 flex items-center justify-center transition-all select-none ${canMelee || isCustomizing ? 'bg-red-500/80 border-red-400 shadow-[0_0_20px_rgba(255,0,0,0.8)] active:scale-95' : 'bg-red-900/30 border-red-900/50 opacity-50'}`}
              style={{ touchAction: 'none' }}
              onPointerDown={(e) => { 
                if (!isCustomizing) { e.stopPropagation(); if (canMelee) window.dispatchEvent(new Event('playerMelee')); }
              }}
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-white w-1/2 h-1/2"><path d="M14.5 17.5L3 6l2.5-2.5L17 15"/><path d="M13 19l6-6"/><path d="M16 16l4 4"/><path d="M19 21l2-2"/></svg>
            </button>,
            64,
            ""
          )}

          {renderControl('build',
            <button 
              className="w-full h-full rounded-full bg-orange-500/50 border-2 border-orange-400 shadow-[0_0_20px_rgba(255,165,0,0.5)] flex items-center justify-center active:scale-95 transition-transform select-none"
              style={{ touchAction: 'none' }}
              onPointerDown={(e) => { if (!isCustomizing) { e.stopPropagation(); window.dispatchEvent(new Event('playerBuildRamp')); } }}
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-white w-1/2 h-1/2"><path d="M2 22L22 2M22 22L2 2"/></svg>
            </button>,
            64,
            ""
          )}

          {renderControl('jump',
            <button 
              className="w-full h-full rounded-full bg-green-500/50 border-2 border-green-400 shadow-[0_0_20px_rgba(0,255,0,0.5)] flex items-center justify-center active:scale-95 transition-transform select-none"
              style={{ touchAction: 'none' }}
              onPointerDown={(e) => { if (!isCustomizing) { e.stopPropagation(); window.dispatchEvent(new CustomEvent('jumpPadBoost', { detail: { power: 32 } })); } }}
            >
              <ChevronUp className="text-white w-1/2 h-1/2" />
            </button>,
            64,
            ""
          )}

          {renderControl('dash',
            <button 
              className="w-full h-full rounded-full bg-cyan-500/50 border-2 border-cyan-400 shadow-[0_0_20px_rgba(0,255,255,0.5)] flex items-center justify-center active:scale-95 transition-transform select-none"
              style={{ touchAction: 'none' }}
              onPointerDown={(e) => { if (!isCustomizing) { e.stopPropagation(); window.dispatchEvent(new Event('mobileDash')); } }}
            >
              <Zap className="text-white w-1/2 h-1/2" />
            </button>,
            64,
            ""
          )}

          {renderControl('shoot',
            <button 
              className="w-full h-full rounded-full bg-fuchsia-500/50 border-2 border-fuchsia-400 shadow-[0_0_20px_rgba(255,0,255,0.5)] flex items-center justify-center active:scale-95 transition-transform select-none"
              style={{ touchAction: 'none' }}
              onPointerDown={(e) => { if (!isCustomizing) { e.stopPropagation(); window.dispatchEvent(new Event('mobileShoot')); } }}
            >
              <Crosshair className="text-white w-1/2 h-1/2" />
            </button>,
            80,
            ""
          )}
        </>
      )}

      {/* Actual Joystick for gameplay (hidden during customize) */}
      {!isCustomizing && (
        <div 
          className="absolute transform -translate-x-1/2 -translate-y-1/2 pointer-events-auto"
          style={{
            left: `${localControls.joystick.x}%`,
            top: `${localControls.joystick.y}%`,
            opacity: localControls.joystick.opacity,
            transform: `translate(-50%, -50%) scale(${localControls.joystick.size})`,
            zIndex: 10,
          }}
        >
          <Joystick 
            size={100} 
            baseColor="rgba(0,0,0,0.5)" 
            stickColor="rgba(0,255,255,0.5)" 
            move={(e) => window.dispatchEvent(new CustomEvent('joystickMove', { detail: e }))} 
            stop={() => window.dispatchEvent(new Event('joystickStop'))} 
          />
        </div>
      )}

      {/* Customizer UI Overlay */}
      {isCustomizing && (
        <div className="absolute inset-0 pointer-events-none z-50 flex flex-col justify-between">
          {/* Top Bar */}
          <div className="bg-black/80 backdrop-blur-md p-4 flex justify-between items-center pointer-events-auto border-b border-white/10">
            <h2 className="text-white font-bold text-xl">Customize Controls</h2>
            <div className="flex gap-2">
              <button onClick={handleReset} className="bg-red-500/20 hover:bg-red-500/40 text-red-400 px-3 py-2 rounded transition-colors flex items-center gap-2 font-bold text-sm" title="Reset to Default">
                <RotateCcw size={16} />
                <span className="hidden sm:inline">Reset</span>
              </button>
              <label className="bg-blue-500/20 hover:bg-blue-500/40 text-blue-400 p-2 rounded transition-colors cursor-pointer" title="Import controls.json">
                <Upload size={20} />
                <input type="file" accept=".json" className="hidden" onChange={handleImport} />
              </label>
              <button onClick={handleExport} className="bg-green-500/20 hover:bg-green-500/40 text-green-400 p-2 rounded transition-colors" title="Export controls.json">
                <Save size={20} />
              </button>
              <button onClick={handleSave} className="bg-white text-black px-4 py-2 rounded font-bold hover:bg-gray-200 transition-colors ml-4">
                Save & Exit
              </button>
            </div>
          </div>

          {/* Editor Panel */}
          {selectedControl && (
            <div className="bg-black/80 backdrop-blur-md p-4 pointer-events-auto border-t border-white/10 flex flex-col gap-4">
              <div className="flex justify-between items-center">
                <h3 className="text-white font-bold uppercase tracking-wider text-sm text-cyan-400">Editing: {selectedControl}</h3>
                <button onClick={() => setSelectedControl(null)} className="text-gray-400 hover:text-white"><X size={16} /></button>
              </div>
              
              <div className="flex gap-8">
                <div className="flex-1">
                  <label className="text-xs text-gray-400 uppercase tracking-wider mb-1 block">Size ({localControls[selectedControl].size.toFixed(1)}x)</label>
                  <input 
                    type="range" 
                    min="0.5" max="2" step="0.1" 
                    value={localControls[selectedControl].size}
                    onChange={(e) => updateSelectedControl({ size: parseFloat(e.target.value) })}
                    className="w-full accent-cyan-500"
                  />
                </div>
                <div className="flex-1">
                  <label className="text-xs text-gray-400 uppercase tracking-wider mb-1 block">Opacity ({Math.round(localControls[selectedControl].opacity * 100)}%)</label>
                  <input 
                    type="range" 
                    min="0.1" max="1" step="0.1" 
                    value={localControls[selectedControl].opacity}
                    onChange={(e) => updateSelectedControl({ opacity: parseFloat(e.target.value) })}
                    className="w-full accent-cyan-500"
                  />
                </div>
              </div>
              <p className="text-xs text-gray-500 text-center">Drag the highlighted button to move it.</p>
            </div>
          )}
          {!selectedControl && (
            <div className="bg-black/80 backdrop-blur-md p-4 pointer-events-auto border-t border-white/10 text-center">
              <p className="text-gray-400">Tap a button to edit its size and opacity. Drag to move.</p>
            </div>
          )}
        </div>
      )}
    </>
  );
}
