import { useGameStore } from '../../store/gameStore';
import { Joystick } from 'react-joystick-component';
import { Crosshair, Zap, ShieldAlert, ChevronDown, ChevronUp, Settings, X, Maximize, Minimize, Heart, Trophy, Gamepad2, User, Swords, Droplet, ListOrdered, Radar, LogOut } from 'lucide-react';
import { useEffect, useState } from 'react';
import { playSound } from '../../utils/audio';

export function UI({ isMobile, isAdmin, onExit }: { isMobile: boolean, isAdmin: boolean, onExit?: () => void }) {
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
  const activeEvent = useGameStore((state) => state.activeEvent);
  const eventsEnabled = useGameStore((state) => state.eventsEnabled);
  const enableLighting = useGameStore((state) => state.enableLighting);
  const shadowQuality = useGameStore((state) => state.shadowQuality);
  const setShadowQuality = useGameStore((state) => state.setShadowQuality);
  const [adminOpen, setAdminOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [settingsTab, setSettingsTab] = useState<'gameplay' | 'graphics'>('gameplay');
  const [adminTab, setAdminTab] = useState<'player' | 'world' | 'actions'>('player');
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [adminWeaponsOpen, setAdminWeaponsOpen] = useState(false);
  const [adminTpOpen, setAdminTpOpen] = useState(false);
  const [adminBanOpen, setAdminBanOpen] = useState(false);
  const [adminEventsOpen, setAdminEventsOpen] = useState(false);
  
  const [reloadProgress, setReloadProgress] = useState(100);
  const [isReloading, setIsReloading] = useState(false);

  useEffect(() => {
    const handleShoot = (e: any) => {
      const cooldown = e.detail?.cooldown || 200;
      setIsReloading(true);
      setReloadProgress(0);
      
      const startTime = performance.now();
      const updateReload = () => {
        const elapsed = performance.now() - startTime;
        const progress = Math.min(100, (elapsed / cooldown) * 100);
        setReloadProgress(progress);
        
        if (progress < 100) {
          requestAnimationFrame(updateReload);
        } else {
          setIsReloading(false);
        }
      };
      requestAnimationFrame(updateReload);
    };

    window.addEventListener('playerShoot', handleShoot);
    return () => window.removeEventListener('playerShoot', handleShoot);
  }, []);

  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };
    document.addEventListener('fullscreenchange', handleFullscreenChange);
    return () => document.removeEventListener('fullscreenchange', handleFullscreenChange);
  }, []);

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

  const maxHealth = gameMode === 'speed' ? 125 : 500;

  return (
    <div className="absolute inset-0 pointer-events-none">
      {/* Crosshair */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-cyan-400 opacity-50 flex flex-col items-center">
        <Crosshair size={32} />
        {/* Reload Bar */}
        {isReloading && (
          <div className="w-16 h-1 mt-4 bg-gray-800 rounded-full overflow-hidden border border-white/10">
            <div 
              className="h-full bg-cyan-400 transition-none"
              style={{ width: `${reloadProgress}%` }}
            />
          </div>
        )}
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

      {/* Event Warning Overlay */}
      {activeEvent && (
        <div className="absolute top-24 left-1/2 transform -translate-x-1/2 flex flex-col items-center pointer-events-none animate-pulse z-50">
          <div className="text-red-500 font-black text-4xl mb-2 tracking-[0.2em] uppercase drop-shadow-[0_0_15px_rgba(255,0,0,0.8)]">
            WARNING: {activeEvent.type} INBOUND
          </div>
          <div className="text-yellow-400 font-mono text-xl tracking-widest drop-shadow-[0_0_10px_rgba(255,255,0,0.5)] bg-black/50 px-4 py-1 rounded">
            SEEK SHELTER IMMEDIATELY
          </div>
        </div>
      )}

      {/* Death Screen / Eliminated Overlay */}
      {me.health <= 0 && (
        <div className="absolute inset-0 flex items-center justify-center bg-black/80 backdrop-blur-sm z-50 pointer-events-auto animate-in fade-in duration-500">
          <div className="text-center flex flex-col items-center gap-6">
            <h1 className="text-7xl font-black text-red-500 uppercase tracking-[0.5em] mb-4 drop-shadow-[0_0_30px_rgba(255,0,0,0.5)]">
              {gameMode === 'team' && (me.lives ?? 0) <= 0 ? 'ELIMINATED' : 'YOU DIED'}
            </h1>
            <p className="text-2xl text-white font-mono uppercase tracking-widest opacity-80">
              {gameMode === 'team' && (me.lives ?? 0) <= 0 ? 'Spectating' : 'Waiting for respawn...'}
            </p>
            {!(gameMode === 'team' && (me.lives ?? 0) <= 0) && (
              <button 
                className="bg-red-600 hover:bg-red-500 text-white font-bold py-4 px-8 rounded-xl text-xl uppercase tracking-widest transition-colors border-2 border-red-400 shadow-[0_0_20px_rgba(255,0,0,0.5)]"
                onClick={() => {
                  useGameStore.getState().socket?.emit('requestRespawn');
                }}
              >
                Respawn
              </button>
            )}
          </div>
        </div>
      )}

      {/* HUD */}
      <div className="absolute top-4 left-4 flex flex-col gap-2">
        <div className="bg-black/50 backdrop-blur-md border border-white/10 p-4 rounded-xl flex items-center gap-3" title="Health">
          <Heart className="text-cyan-400" size={20} />
          <div className="w-48 h-4 bg-gray-800 rounded-full overflow-hidden border border-white/5">
            <div 
              className={`h-full transition-all duration-300 ${me.health > maxHealth / 2 ? 'bg-green-500' : me.health > maxHealth / 5 ? 'bg-yellow-500' : 'bg-red-500'}`}
              style={{ width: `${Math.max(0, Math.min(100, (me.health / maxHealth) * 100))}%` }}
            />
          </div>
        </div>
        
        <div className="bg-black/50 backdrop-blur-md border border-white/10 p-4 rounded-xl flex flex-col gap-3">
          <div className="flex items-center gap-3 text-fuchsia-400" title="Score">
            <Trophy size={18} />
            <span className="font-bold text-sm">{me.score}</span>
          </div>
          <div className="flex items-center gap-3 text-gray-400" title="Game Mode">
            <Gamepad2 size={18} />
            <span className="font-bold text-sm">{gameMode.toUpperCase()}</span>
          </div>
          {gameMode === 'team' && (
            <div className="flex items-center gap-3 text-yellow-400" title="Lives">
              <User size={18} />
              <span className="font-bold text-sm">{me.lives}</span>
            </div>
          )}
        </div>
        
        <div className="bg-black/50 backdrop-blur-md border border-white/10 p-4 rounded-xl flex items-center gap-3 text-yellow-400" title="Weapon">
          <Swords size={18} />
          <span className="font-bold text-sm">{me.weapon || 'DEFAULT'}</span>
        </div>

        {(me.bleedingTicks ?? 0) > 0 && (
          <div className="bg-red-900/50 backdrop-blur-md border border-red-500/50 p-4 rounded-xl animate-pulse flex items-center justify-center text-red-400" title="Bleeding!">
            <Droplet size={24} />
          </div>
        )}
        
        {/* Settings, Fullscreen, Admin Panel & Leave Buttons */}
        <div className="pointer-events-auto flex gap-2">
          {onExit && (
            <button 
              className="bg-black/50 backdrop-blur-md border border-white/10 p-4 rounded-xl flex items-center justify-center text-red-400 hover:bg-red-500/20 transition-colors"
              onClick={() => { playSound('click'); onExit(); }}
              onMouseEnter={() => playSound('hover')}
              onPointerDown={(e) => e.stopPropagation()}
              title="Leave Game"
            >
              <LogOut size={20} />
            </button>
          )}
          <button 
            className="bg-black/50 backdrop-blur-md border border-white/10 p-4 rounded-xl flex items-center justify-center text-cyan-400 hover:bg-cyan-500/10 transition-colors"
            onClick={() => { playSound('click'); setSettingsOpen(true); }}
            onMouseEnter={() => playSound('hover')}
            onPointerDown={(e) => e.stopPropagation()}
            title="Settings"
          >
            <Settings size={20} />
          </button>
          <button 
            className="bg-black/50 backdrop-blur-md border border-white/10 p-4 rounded-xl flex items-center justify-center text-cyan-400 hover:bg-cyan-500/10 transition-colors"
            onClick={() => {
              playSound('click');
              if (!document.fullscreenElement) {
                document.documentElement.requestFullscreen().catch(err => {
                  console.error(`Error attempting to enable fullscreen: ${err.message}`);
                });
              } else {
                document.exitFullscreen();
              }
            }}
            onMouseEnter={() => playSound('hover')}
            title={isFullscreen ? "Exit Fullscreen" : "Enter Fullscreen"}
            onPointerDown={(e) => e.stopPropagation()}
          >
            {isFullscreen ? <Minimize size={20} /> : <Maximize size={20} />}
          </button>
          {isAdmin && (
            <button 
              className="bg-red-900/50 backdrop-blur-md border border-red-500/50 rounded-xl flex items-center justify-center text-red-400 hover:bg-red-500/20 transition-colors p-4"
              onClick={() => { playSound('click'); setAdminOpen(true); }}
              onMouseEnter={() => playSound('hover')}
              onPointerDown={(e) => e.stopPropagation()}
              title="Admin Panel"
            >
              <ShieldAlert size={20} />
            </button>
          )}
        </div>
      </div>

      {/* Right Side UI (Leaderboard & Minimap) */}
      <div className="absolute top-4 right-4 flex flex-col gap-4">
        {/* Leaderboard */}
        <div className="bg-black/50 backdrop-blur-md border border-white/10 p-4 rounded-xl min-w-[150px]">
          <div className="flex items-center justify-center mb-3 border-b border-white/10 pb-2 text-white" title="Leaderboard">
            <ListOrdered size={18} />
          </div>
          <div className="flex flex-col gap-2">
            {Object.values(players)
              .sort((a, b) => b.score - a.score)
              .slice(0, 5)
              .map((p, i) => (
                <div key={p.id} className="flex justify-between items-center text-sm">
                  <span className="font-mono" style={{ color: p.color }}>
                    {i + 1}. {p.id === myId ? 'YOU' : p.nickname?.substring(0, 4) || p.id.substring(0, 4)}
                  </span>
                  <span className="font-bold text-white">{p.score}</span>
                </div>
              ))}
          </div>
        </div>

        {/* Minimap */}
        <div className="bg-black/50 backdrop-blur-md border border-white/10 p-3 rounded-xl flex flex-col items-center">
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
                    className={`absolute rounded-full -translate-x-1/2 -translate-y-1/2 ${p.id === myId ? 'w-3 h-3 z-10 animate-pulse outline outline-2 outline-white' : isClamped ? 'w-2 h-2 z-0 opacity-100 border border-white/50' : 'w-3 h-3 z-0 border border-white/80'}`}
                    style={{
                      left: `${mapX}px`,
                      top: `${mapY}px`,
                      backgroundColor: p.color,
                      boxShadow: `0 0 10px ${p.color}, inset 0 0 4px rgba(255,255,255,0.5)`
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
        <div className="absolute bottom-1/4 left-1/2 -translate-x-1/2 bg-black/80 border border-white/20 px-4 py-2 rounded-xl backdrop-blur-md flex items-center gap-3 pointer-events-auto">
          <span className="text-white font-bold uppercase tracking-widest text-sm">
            {interactable.name}
          </span>
          {!isMobile && (
            <span className="bg-white text-black px-2 py-1 rounded text-xs font-bold">E</span>
          )}
          {isMobile && (
            <button 
              className="bg-cyan-500 hover:bg-cyan-400 text-black font-bold px-3 py-1 rounded transition-colors flex items-center justify-center"
              onPointerDown={() => window.dispatchEvent(new Event('mobileInteract'))}
              title="Interact"
            >
              <Zap size={16} />
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
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-2xl font-black text-cyan-400 uppercase tracking-widest">Settings</h2>
              <button 
                onClick={() => setSettingsOpen(false)}
                className="text-gray-400 hover:text-white transition-colors"
              >
                <X size={24} />
              </button>
            </div>

            <div className="flex gap-2 mb-6 border-b border-white/10 pb-2">
              <button 
                className={`text-xs font-bold uppercase tracking-widest px-4 py-2 rounded-t-lg transition-colors ${settingsTab === 'gameplay' ? 'text-cyan-400 border-b-2 border-cyan-400' : 'text-gray-400 hover:text-white'}`}
                onClick={() => setSettingsTab('gameplay')}
              >
                Gameplay
              </button>
              <button 
                className={`text-xs font-bold uppercase tracking-widest px-4 py-2 rounded-t-lg transition-colors ${settingsTab === 'graphics' ? 'text-cyan-400 border-b-2 border-cyan-400' : 'text-gray-400 hover:text-white'}`}
                onClick={() => setSettingsTab('graphics')}
              >
                Graphics
              </button>
            </div>
            
            <div className="flex flex-col gap-6">
              {settingsTab === 'gameplay' && (
                <>
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
                  <button
                    className="mt-2 bg-cyan-500/20 hover:bg-cyan-500/40 text-cyan-400 border border-cyan-500/50 rounded-lg p-3 font-bold uppercase tracking-widest text-sm transition-colors"
                    onClick={() => {
                      if (!document.fullscreenElement) {
                        document.documentElement.requestFullscreen().catch(err => {
                          console.error(`Error attempting to enable fullscreen: ${err.message}`);
                        });
                      } else {
                        document.exitFullscreen();
                      }
                    }}
                  >
                    Toggle Fullscreen
                  </button>
                </>
              )}

              {settingsTab === 'graphics' && (
                <>
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
                  <label className="flex items-center gap-2 text-white text-xs font-bold uppercase tracking-widest cursor-pointer">
                    <input 
                      type="checkbox" 
                      checked={enableLighting}
                      onChange={(e) => useGameStore.getState().setEnableLighting(e.target.checked)}
                      className="accent-cyan-400"
                    />
                    Enable Lighting & Shadows
                  </label>
                  {enableLighting && (
                    <div className="bg-black/30 p-3 rounded-lg border border-white/5 mt-2">
                      <label className="text-white text-xs font-bold uppercase tracking-widest mb-2 block">Shadow Quality</label>
                      <div className="flex gap-2">
                        {['low', 'medium', 'high', 'ultra'].map(q => (
                          <button
                            key={q}
                            className={`flex-1 py-2 rounded-lg text-xs font-bold uppercase tracking-widest transition-colors ${shadowQuality === q ? 'bg-cyan-500 text-black' : 'bg-black/50 text-gray-400 hover:text-white border border-white/10'}`}
                            onClick={() => setShadowQuality(q as 'low' | 'medium' | 'high' | 'ultra')}
                          >
                            {q}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                </>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Admin Panel Modal */}
      {isAdmin && adminOpen && (
        <div className="absolute inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center pointer-events-auto z-50">
          <div className="bg-gray-900 border border-red-500/50 rounded-2xl p-6 max-w-md w-full shadow-[0_0_30px_rgba(255,0,0,0.2)]">
            <div className="flex justify-between items-center mb-4">
              <div className="flex items-center gap-2 text-red-400">
                <ShieldAlert size={24} />
                <h2 className="text-xl font-bold uppercase tracking-widest">Admin Panel</h2>
              </div>
              <button 
                onClick={() => setAdminOpen(false)}
                className="text-gray-400 hover:text-white transition-colors"
              >
                <X size={24} />
              </button>
            </div>

            <div className="flex gap-2 mb-6 border-b border-white/10 pb-2">
              <button 
                className={`text-xs font-bold uppercase tracking-widest px-4 py-2 rounded-t-lg transition-colors ${adminTab === 'player' ? 'text-red-400 border-b-2 border-red-400' : 'text-gray-400 hover:text-white'}`}
                onClick={() => setAdminTab('player')}
              >
                Player
              </button>
              <button 
                className={`text-xs font-bold uppercase tracking-widest px-4 py-2 rounded-t-lg transition-colors ${adminTab === 'world' ? 'text-red-400 border-b-2 border-red-400' : 'text-gray-400 hover:text-white'}`}
                onClick={() => setAdminTab('world')}
              >
                World
              </button>
              <button 
                className={`text-xs font-bold uppercase tracking-widest px-4 py-2 rounded-t-lg transition-colors ${adminTab === 'actions' ? 'text-red-400 border-b-2 border-red-400' : 'text-gray-400 hover:text-white'}`}
                onClick={() => setAdminTab('actions')}
              >
                Actions
              </button>
            </div>
            
            <div className="flex flex-col gap-4">
              {adminTab === 'player' && (
                <>
                  <div className="grid grid-cols-2 gap-4">
                    <label className="flex items-center gap-2 text-white text-sm cursor-pointer bg-black/30 p-3 rounded-lg border border-white/5 hover:bg-black/50 transition-colors">
                      <input 
                        type="checkbox" 
                        checked={adminState.infiniteHealth}
                        onChange={(e) => setAdminState({ infiniteHealth: e.target.checked })}
                        className="accent-red-500 w-4 h-4"
                      />
                      Infinite Health
                    </label>
                    <label className="flex items-center gap-2 text-white text-sm cursor-pointer bg-black/30 p-3 rounded-lg border border-white/5 hover:bg-black/50 transition-colors">
                      <input 
                        type="checkbox" 
                        checked={adminState.flying}
                        onChange={(e) => {
                          const checked = e.target.checked;
                          setAdminState({ flying: checked });
                          if (!checked) setAdminState({ noclip: false });
                        }}
                        className="accent-red-500 w-4 h-4"
                      />
                      Flying
                    </label>
                    <label className="flex items-center gap-2 text-white text-sm cursor-pointer bg-black/30 p-3 rounded-lg border border-white/5 hover:bg-black/50 transition-colors col-span-2">
                      <input 
                        type="checkbox" 
                        checked={adminState.noclip}
                        onChange={(e) => {
                          const checked = e.target.checked;
                          setAdminState({ noclip: checked });
                          if (checked) setAdminState({ flying: true });
                        }}
                        className="accent-red-500 w-4 h-4"
                      />
                      Noclip
                    </label>
                  </div>
                  
                  <div className="bg-black/30 p-4 rounded-lg border border-white/5">
                    <label className="text-red-400 text-xs font-bold uppercase tracking-widest mb-3 flex justify-between">
                      <span>Speed</span>
                      <span className="text-white">{adminState.speed || (gameMode === 'speed' ? 50 : 12)}</span>
                    </label>
                    <input 
                      type="range" 
                      min="5" max="100" step="1" 
                      value={adminState.speed || (gameMode === 'speed' ? 50 : 12)} 
                      onChange={(e) => setAdminState({ speed: parseInt(e.target.value) })}
                      className="w-full accent-red-500"
                    />
                  </div>

                  <div className="bg-black/30 p-4 rounded-lg border border-white/5">
                    <label className="text-red-400 text-xs font-bold uppercase tracking-widest mb-3 block">
                      Give Weapon
                    </label>
                    <div className="flex flex-wrap gap-2">
                      {['DEFAULT', 'SHOTGUN', 'RPG', 'REVOLVER', 'KNIFE'].map(w => (
                        <button
                          key={w}
                          className="text-xs font-bold text-white hover:text-red-400 py-2 px-3 bg-black/50 hover:bg-red-500/20 rounded-lg transition-colors border border-red-500/30 flex-1 min-w-[80px]"
                          onClick={() => {
                            useGameStore.getState().socket?.emit('adminGiveWeapon', w);
                          }}
                        >
                          {w}
                        </button>
                      ))}
                    </div>
                  </div>
                </>
              )}

              {adminTab === 'world' && (
                <>
                  <label className="flex items-center gap-2 text-white text-sm cursor-pointer bg-black/30 p-3 rounded-lg border border-white/5 hover:bg-black/50 transition-colors">
                    <input 
                      type="checkbox" 
                      checked={eventsEnabled}
                      onChange={(e) => {
                        useGameStore.getState().socket?.emit('adminToggleEvents', e.target.checked);
                      }}
                      className="accent-red-500 w-4 h-4"
                    />
                    Natural Disasters Enabled
                  </label>

                  <div className="bg-black/30 p-4 rounded-lg border border-white/5">
                    <label className="text-red-400 text-xs font-bold uppercase tracking-widest mb-3 block">
                      Trigger Event
                    </label>
                    <div className="flex flex-wrap gap-2">
                      {['tornado', 'lava', 'meteorite'].map(e => (
                        <button
                          key={e}
                          className="text-xs font-bold text-white hover:text-red-400 py-2 px-3 bg-black/50 hover:bg-red-500/20 rounded-lg transition-colors border border-red-500/30 flex-1 min-w-[80px]"
                          onClick={() => {
                            useGameStore.getState().socket?.emit('adminTriggerEvent', e);
                          }}
                        >
                          {e}
                        </button>
                      ))}
                    </div>
                  </div>
                </>
              )}

              {adminTab === 'actions' && (
                <>
                  <div className="bg-black/30 p-4 rounded-lg border border-white/5">
                    <label className="text-red-400 text-xs font-bold uppercase tracking-widest mb-3 block">
                      Teleport To Player
                    </label>
                    <div className="flex flex-col gap-2 max-h-40 overflow-y-auto pr-2 custom-scrollbar">
                      {Object.values(players).filter(p => p.id !== myId).map(p => (
                        <button
                          key={p.id}
                          className="text-left text-sm font-bold text-white hover:text-red-400 py-2 px-3 bg-black/50 hover:bg-red-500/20 rounded-lg transition-colors border border-white/5 hover:border-red-500/30"
                          onClick={() => {
                            window.dispatchEvent(new CustomEvent('adminTeleport', { detail: { x: p.x, y: p.y, z: p.z } }));
                            setAdminOpen(false);
                          }}
                        >
                          {p.nickname || p.id.substring(0, 4)}
                        </button>
                      ))}
                      {Object.values(players).filter(p => p.id !== myId).length === 0 && (
                        <div className="text-gray-500 text-sm italic text-center py-2">No other players online</div>
                      )}
                    </div>
                  </div>

                  <div className="bg-black/30 p-4 rounded-lg border border-white/5">
                    <label className="text-red-400 text-xs font-bold uppercase tracking-widest mb-3 block">
                      Ban Player
                    </label>
                    <div className="flex flex-col gap-2 max-h-40 overflow-y-auto pr-2 custom-scrollbar">
                      {Object.values(players).filter(p => p.id !== myId).map(p => (
                        <button
                          key={p.id}
                          className="text-left text-sm font-bold text-white hover:text-red-400 py-2 px-3 bg-black/50 hover:bg-red-500/20 rounded-lg transition-colors border border-white/5 hover:border-red-500/30 flex justify-between items-center group"
                          onClick={() => {
                            useGameStore.getState().socket?.emit('adminBan', p.id);
                          }}
                        >
                          <span>{p.nickname || p.id.substring(0, 4)}</span>
                          <span className="text-xs text-red-500 opacity-0 group-hover:opacity-100 transition-opacity">BAN</span>
                        </button>
                      ))}
                      {Object.values(players).filter(p => p.id !== myId).length === 0 && (
                        <div className="text-gray-500 text-sm italic text-center py-2">No other players online</div>
                      )}
                    </div>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
