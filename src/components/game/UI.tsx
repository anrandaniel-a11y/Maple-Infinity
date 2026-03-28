import { useGameStore } from '../../store/gameStore';
import { Joystick } from 'react-joystick-component';
import { Crosshair, Zap, ShieldAlert, ChevronDown, ChevronUp, Settings, X } from 'lucide-react';
import { useEffect, useState } from 'react';

export function UI({ isMobile, isAdmin }: { isMobile: boolean, isAdmin: boolean }) {
  const myId = useGameStore((state) => state.myId);
  const me = useGameStore((state) => state.players[myId || '']);
  const players = useGameStore((state) => state.players);
  const sensitivity = useGameStore((state) => state.sensitivity);
  const setSensitivity = useGameStore((state) => state.setSensitivity);
  const renderDistance = useGameStore((state) => state.renderDistance);
  const setRenderDistance = useGameStore((state) => state.setRenderDistance);
  const dynamicResolution = useGameStore((state) => state.dynamicResolution);
  const setDynamicResolution = useGameStore((state) => state.setDynamicResolution);
  const showFps = useGameStore((state) => state.showFps);
  const setShowFps = useGameStore((state) => state.setShowFps);
  const fpsLimit = useGameStore((state) => state.fpsLimit);
  const setFpsLimit = useGameStore((state) => state.setFpsLimit);
  const adminState = useGameStore((state) => state.adminState);
  const setAdminState = useGameStore((state) => state.setAdminState);
  const gameMode = useGameStore((state) => state.gameMode);
  const interactable = useGameStore((state) => state.interactable);
  const boss = useGameStore((state) => state.boss);
  const victory = useGameStore((state) => state.victory);
  const [adminOpen, setAdminOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);

  // Force re-render at 30fps to update radar and HUD since player movement mutates state directly
  const [, setTick] = useState(0);
  useEffect(() => {
    let animationFrameId: number;
    let lastTime = performance.now();
    const loop = (time: number) => {
      if (time - lastTime > 33) { // ~30fps
        setTick(t => t + 1);
        lastTime = time;
      }
      animationFrameId = requestAnimationFrame(loop);
    };
    animationFrameId = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(animationFrameId);
  }, []);

  if (!me) return null;

  return (
    <div className="absolute inset-0 pointer-events-none">
      {/* Crosshair */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-cyan-400 opacity-50">
        <Crosshair size={32} />
      </div>

      {/* Boss Health Bar */}
      {boss && (
        <div className="absolute top-10 left-1/2 transform -translate-x-1/2 w-1/2 max-w-2xl flex flex-col items-center pointer-events-none">
          <div className="text-red-500 font-bold text-2xl mb-2 tracking-widest" style={{ textShadow: '0 0 10px #ff0000' }}>
            SYSTEM OVERLORD
          </div>
          <div className="w-full h-6 bg-gray-900 border-2 border-red-500 rounded-full overflow-hidden relative">
            <div 
              className="h-full bg-red-500 transition-all duration-300 ease-out"
              style={{ width: `${Math.max(0, (boss.health / boss.maxHealth) * 100)}%`, boxShadow: '0 0 20px #ff0000' }}
            />
            <div className="absolute inset-0 flex items-center justify-center text-white text-xs font-mono font-bold mix-blend-difference">
              {Math.ceil(boss.health)} / {boss.maxHealth}
            </div>
          </div>
        </div>
      )}

      {/* Victory Overlay */}
      {victory && (
        <div className="absolute inset-0 flex items-center justify-center bg-black/70 backdrop-blur-sm z-50 pointer-events-none animate-in fade-in duration-1000">
          <div className="text-center">
            <h1 className="text-7xl font-black text-green-400 uppercase tracking-[0.5em] mb-4 drop-shadow-[0_0_30px_rgba(74,222,128,0.5)] animate-bounce">
              Victory
            </h1>
            <p className="text-2xl text-white font-mono uppercase tracking-widest opacity-80">
              System Overlord Defeated
            </p>
          </div>
        </div>
      )}

      {/* HUD */}
      <div className="absolute top-4 left-4 flex flex-col gap-2">
        <div className="bg-black/50 backdrop-blur-md border border-white/10 p-4 rounded-xl">
          <h3 className="text-cyan-400 font-bold uppercase tracking-widest text-sm mb-2">Health</h3>
          <div className="w-48 h-4 bg-gray-800 rounded-full overflow-hidden border border-white/5">
            <div 
              className={`h-full transition-all duration-300 ${me.health > 250 ? 'bg-green-500' : me.health > 100 ? 'bg-yellow-500' : 'bg-red-500'}`}
              style={{ width: `${Math.max(0, Math.min(100, (me.health / 500) * 100))}%` }}
            />
          </div>
        </div>
        <div className="bg-black/50 backdrop-blur-md border border-white/10 p-4 rounded-xl">
          <h3 className="text-fuchsia-400 font-bold uppercase tracking-widest text-sm mb-1">Score: {me.score}</h3>
          <h3 className="text-gray-400 font-bold uppercase tracking-widest text-xs">Mode: {gameMode.toUpperCase()}</h3>
        </div>
        
        <div className="bg-black/50 backdrop-blur-md border border-white/10 p-4 rounded-xl">
          <h3 className="text-yellow-400 font-bold uppercase tracking-widest text-sm mb-1">Weapon: {me.weapon || 'DEFAULT'}</h3>
        </div>

        {me.bleedingTicks && me.bleedingTicks > 0 && (
          <div className="bg-red-900/50 backdrop-blur-md border border-red-500/50 p-4 rounded-xl animate-pulse">
            <h3 className="text-red-400 font-bold uppercase tracking-widest text-sm mb-1">BLEEDING!</h3>
          </div>
        )}
        
        {/* Settings Button */}
        <div className="pointer-events-auto">
          <button 
            className="bg-black/50 backdrop-blur-md border border-white/10 p-4 rounded-xl w-full flex items-center justify-between text-cyan-400 hover:bg-cyan-500/10 transition-colors"
            onClick={() => setSettingsOpen(true)}
            onPointerDown={(e) => e.stopPropagation()}
          >
            <div className="flex items-center gap-2">
              <Settings size={16} />
              <span className="font-bold uppercase tracking-widest text-sm">Settings</span>
            </div>
          </button>
        </div>

        {!isMobile && (
          <div className="bg-black/50 backdrop-blur-md border border-white/10 p-4 rounded-xl flex flex-col gap-1 mt-2">
            <div className="text-gray-400 text-xs font-bold uppercase tracking-widest"><span className="text-white">WASD</span> Move</div>
            <div className="text-gray-400 text-xs font-bold uppercase tracking-widest"><span className="text-white">SPACE</span> Jump</div>
            <div className="text-gray-400 text-xs font-bold uppercase tracking-widest"><span className="text-white">SHIFT</span> Dash</div>
            <div className="text-gray-400 text-xs font-bold uppercase tracking-widest"><span className="text-white">F</span> Boost</div>
            <div className="text-gray-400 text-xs font-bold uppercase tracking-widest"><span className="text-white">CLICK</span> Shoot</div>
          </div>
        )}

        {/* Admin Panel */}
        {isAdmin && (
          <div 
            className="bg-red-900/50 backdrop-blur-md border border-red-500/50 rounded-xl pointer-events-auto overflow-hidden transition-all duration-300"
            onPointerDown={(e) => e.stopPropagation()}
          >
            <button 
              className="w-full p-4 flex items-center justify-between text-red-400 hover:bg-red-500/10 transition-colors"
              onClick={() => setAdminOpen(!adminOpen)}
            >
              <div className="flex items-center gap-2">
                <ShieldAlert size={16} />
                <span className="font-bold uppercase tracking-widest text-sm">Admin Panel</span>
              </div>
              {adminOpen ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
            </button>
            
            {adminOpen && (
              <div className="p-4 pt-0 border-t border-red-500/20 flex flex-col gap-3">
                <label className="flex items-center gap-2 text-white text-sm cursor-pointer">
                  <input 
                    type="checkbox" 
                    checked={adminState.infiniteHealth}
                    onChange={(e) => setAdminState({ infiniteHealth: e.target.checked })}
                    className="accent-red-500"
                  />
                  Infinite Health
                </label>
                <label className="flex items-center gap-2 text-white text-sm cursor-pointer">
                  <input 
                    type="checkbox" 
                    checked={adminState.flying}
                    onChange={(e) => {
                      const checked = e.target.checked;
                      setAdminState({ flying: checked });
                      if (!checked) setAdminState({ noclip: false });
                    }}
                    className="accent-red-500"
                  />
                  Flying
                </label>
                <label className="flex items-center gap-2 text-white text-sm cursor-pointer">
                  <input 
                    type="checkbox" 
                    checked={adminState.noclip}
                    onChange={(e) => {
                      const checked = e.target.checked;
                      setAdminState({ noclip: checked });
                      if (checked) setAdminState({ flying: true });
                    }}
                    className="accent-red-500"
                  />
                  Noclip
                </label>
                
                <div className="mt-2">
                  <label className="text-red-400 text-xs font-bold uppercase tracking-widest mb-2 block">Speed: {adminState.speed || 12}</label>
                  <input 
                    type="range" 
                    min="5" max="100" step="1" 
                    value={adminState.speed || 12} 
                    onChange={(e) => setAdminState({ speed: parseInt(e.target.value) })}
                    className="w-full accent-red-500"
                  />
                </div>

                <div className="mt-2">
                  <span className="text-red-400 text-xs font-bold uppercase tracking-widest mb-2 block">Teleport To:</span>
                  <div className="flex flex-col gap-1 max-h-32 overflow-y-auto pr-2">
                    {Object.values(players).filter(p => p.id !== myId).map(p => (
                      <button
                        key={p.id}
                        className="text-left text-xs text-white hover:text-red-400 py-1 px-2 hover:bg-red-500/20 rounded transition-colors"
                        onClick={() => {
                          // Teleportation is handled by setting a flag or event, but we can just mutate the local player's position in the store
                          // However, the local player's position is managed by Rapier physics.
                          // We need a way to tell the LocalPlayer component to teleport.
                          window.dispatchEvent(new CustomEvent('adminTeleport', { detail: { x: p.x, y: p.y, z: p.z } }));
                        }}
                      >
                        {p.nickname || p.id.substring(0, 4)}
                      </button>
                    ))}
                    {Object.values(players).filter(p => p.id !== myId).length === 0 && (
                      <span className="text-gray-500 text-xs italic">No other players</span>
                    )}
                  </div>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Right Side UI (Leaderboard & Minimap) */}
      <div className="absolute top-4 right-4 flex flex-col gap-4">
        {/* Leaderboard */}
        <div className="bg-black/50 backdrop-blur-md border border-white/10 p-4 rounded-xl min-w-[200px]">
          <h3 className="text-white font-bold uppercase tracking-widest text-sm mb-3 border-b border-white/10 pb-2">Leaderboard</h3>
          <div className="flex flex-col gap-2">
            {Object.values(players)
              .sort((a, b) => b.score - a.score)
              .slice(0, 5)
              .map((p, i) => (
                <div key={p.id} className="flex justify-between items-center text-sm">
                  <span className="font-mono" style={{ color: p.color }}>
                    {i + 1}. {p.id === myId ? 'YOU' : p.nickname}
                  </span>
                  <span className="font-bold text-white">{p.score}</span>
                </div>
              ))}
          </div>
        </div>

        {/* Minimap */}
        <div className="bg-black/50 backdrop-blur-md border border-white/10 p-3 rounded-xl flex flex-col items-center">
          <h3 className="text-white font-bold uppercase tracking-widest text-xs mb-2">Radar</h3>
          <div className="relative w-[150px] h-[150px] bg-gray-900/80 border border-white/20 rounded-full overflow-hidden">
            {/* Radar Sweep Effect */}
            <div className="absolute inset-0 rounded-full border border-cyan-500/30" />
            <div className="absolute inset-0 rounded-full border border-cyan-500/10 scale-50" />
            <div className="absolute top-1/2 left-0 right-0 h-px bg-cyan-500/20" />
            <div className="absolute left-1/2 top-0 bottom-0 w-px bg-cyan-500/20" />
            
            {(() => {
              if (!me) return null;
              
              const RADAR_RANGE = 50;
              const RADAR_SIZE = 150;
              const angle = me.ry || 0;
              const cos = Math.cos(angle);
              const sin = Math.sin(angle);

              return Object.values(players).map((p) => {
                const dx = p.x - me.x;
                const dz = p.z - me.z;

                const rotX = dx * cos - dz * sin;
                const rotZ = dx * sin + dz * cos;

                const dist = Math.sqrt(rotX * rotX + rotZ * rotZ);
                
                let renderX = rotX;
                let renderZ = rotZ;
                
                // Clamp to edge of radar if outside range
                if (dist > RADAR_RANGE && p.id !== myId) {
                  renderX = (rotX / dist) * RADAR_RANGE;
                  renderZ = (rotZ / dist) * RADAR_RANGE;
                }

                const mapX = (renderX / RADAR_RANGE) * (RADAR_SIZE / 2) + (RADAR_SIZE / 2);
                const mapY = (renderZ / RADAR_RANGE) * (RADAR_SIZE / 2) + (RADAR_SIZE / 2);

                const isClamped = dist > RADAR_RANGE && p.id !== myId;

                return (
                  <div
                    key={p.id}
                    className={`absolute rounded-full -translate-x-1/2 -translate-y-1/2 ${p.id === myId ? 'w-2 h-2 z-10 animate-pulse outline outline-2 outline-white' : isClamped ? 'w-1.5 h-1.5 z-0 opacity-80' : 'w-2 h-2 z-0'}`}
                    style={{
                      left: `${mapX}px`,
                      top: `${mapY}px`,
                      backgroundColor: p.color,
                      boxShadow: `0 0 8px ${p.color}`
                    }}
                  />
                );
              });
            })()}
          </div>
        </div>
      </div>

      {/* Interact Prompt */}
      {interactable && (
        <div className="absolute bottom-1/4 left-1/2 -translate-x-1/2 bg-black/80 border border-white/20 px-6 py-3 rounded-xl backdrop-blur-md flex flex-col items-center gap-1 pointer-events-auto">
          <span className="text-white font-bold uppercase tracking-widest text-sm">
            {interactable.name}
          </span>
          <div className="flex items-center gap-2">
            {!isMobile && (
              <span className="bg-white text-black px-2 py-0.5 rounded text-xs font-bold">E</span>
            )}
            <span className="text-gray-400 text-xs uppercase tracking-widest">to Pick Up</span>
          </div>
          {isMobile && (
            <button 
              className="mt-2 bg-cyan-500 hover:bg-cyan-400 text-black font-bold uppercase tracking-widest text-xs px-4 py-2 rounded transition-colors"
              onPointerDown={() => window.dispatchEvent(new Event('mobileInteract'))}
            >
              Interact
            </button>
          )}
        </div>
      )}

      {/* Mobile Controls */}
      {isMobile && (
        <>
          <div className="absolute bottom-8 left-8 pointer-events-auto">
            <Joystick 
              size={100} 
              baseColor="rgba(0,0,0,0.5)" 
              stickColor="rgba(0,255,255,0.5)" 
              move={(e) => window.dispatchEvent(new CustomEvent('joystickMove', { detail: e }))} 
              stop={() => window.dispatchEvent(new Event('joystickStop'))} 
            />
          </div>
          <div className="absolute bottom-[5vmin] right-[5vmin] pointer-events-auto flex gap-[3vmin] items-end">
            <button 
              className="w-[15vmin] h-[15vmin] max-w-16 max-h-16 rounded-full bg-green-500/50 border-2 border-green-400 shadow-[0_0_20px_rgba(0,255,0,0.5)] flex items-center justify-center active:scale-95 transition-transform select-none self-end mb-[2vmin]"
              style={{ touchAction: 'none' }}
              onPointerDown={(e) => { e.stopPropagation(); window.dispatchEvent(new CustomEvent('jumpPadBoost', { detail: { power: 32 } })); }}
            >
              <ChevronUp className="text-white w-1/2 h-1/2" />
            </button>
            <button 
              className="w-[15vmin] h-[15vmin] max-w-16 max-h-16 rounded-full bg-cyan-500/50 border-2 border-cyan-400 shadow-[0_0_20px_rgba(0,255,255,0.5)] flex items-center justify-center active:scale-95 transition-transform select-none self-end mb-[2vmin]"
              style={{ touchAction: 'none' }}
              onPointerDown={(e) => { e.stopPropagation(); window.dispatchEvent(new Event('mobileDash')); }}
            >
              <Zap className="text-white w-1/2 h-1/2" />
            </button>
            <button 
              className="w-[20vmin] h-[20vmin] max-w-20 max-h-20 rounded-full bg-fuchsia-500/50 border-2 border-fuchsia-400 shadow-[0_0_20px_rgba(255,0,255,0.5)] flex items-center justify-center active:scale-95 transition-transform select-none"
              style={{ touchAction: 'none' }}
              onPointerDown={(e) => { e.stopPropagation(); window.dispatchEvent(new Event('mobileShoot')); }}
            >
              <Crosshair className="text-white w-1/2 h-1/2" />
            </button>
          </div>
        </>
      )}

      {/* Settings Modal */}
      {settingsOpen && (
        <div 
          className="absolute inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center pointer-events-auto"
          onPointerDown={() => setSettingsOpen(false)}
        >
          <div 
            className="bg-gray-900 border border-cyan-500/50 rounded-2xl p-6 w-full max-w-md shadow-[0_0_30px_rgba(0,255,255,0.1)]"
            onPointerDown={(e) => e.stopPropagation()}
          >
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-2xl font-black text-cyan-400 uppercase tracking-widest">Settings</h2>
              <button 
                onClick={() => setSettingsOpen(false)}
                className="text-gray-400 hover:text-white transition-colors"
              >
                <X size={24} />
              </button>
            </div>
            
            <div className="flex flex-col gap-6">
              <div>
                <label className="text-white text-xs font-bold uppercase tracking-widest mb-2 block">Sensitivity: {sensitivity.toFixed(1)}</label>
                <input 
                  type="range" 
                  min="0.1" max="10" step="0.1" 
                  value={sensitivity} 
                  onChange={(e) => setSensitivity(parseFloat(e.target.value))}
                  className="w-full accent-cyan-400"
                />
              </div>
              <div>
                <label className="text-white text-xs font-bold uppercase tracking-widest mb-2 block">Render Distance: {renderDistance}</label>
                <input 
                  type="range" 
                  min="20" max="500" step="10" 
                  value={renderDistance} 
                  onChange={(e) => setRenderDistance(parseInt(e.target.value))}
                  className="w-full accent-cyan-400"
                />
              </div>
              <div>
                <label className="text-white text-xs font-bold uppercase tracking-widest mb-2 block">FPS Limit: {fpsLimit === 0 ? 'Unlimited' : fpsLimit}</label>
                <input 
                  type="range" 
                  min="0" max="144" step="1" 
                  value={fpsLimit} 
                  onChange={(e) => setFpsLimit(parseInt(e.target.value))}
                  className="w-full accent-cyan-400"
                />
              </div>
              <label className="flex items-center gap-2 text-white text-xs font-bold uppercase tracking-widest cursor-pointer">
                <input 
                  type="checkbox" 
                  checked={dynamicResolution}
                  onChange={(e) => setDynamicResolution(e.target.checked)}
                  className="accent-cyan-400"
                />
                Dynamic Resolution
              </label>
              <label className="flex items-center gap-2 text-white text-xs font-bold uppercase tracking-widest cursor-pointer">
                <input 
                  type="checkbox" 
                  checked={showFps}
                  onChange={(e) => setShowFps(e.target.checked)}
                  className="accent-cyan-400"
                />
                Show FPS
              </label>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
