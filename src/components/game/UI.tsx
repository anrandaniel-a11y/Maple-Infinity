import { useGameStore, defaultMobileControls } from '../../store/gameStore';
import { Joystick } from 'react-joystick-component';
import { Crosshair, Zap, ShieldAlert, ChevronDown, ChevronUp, Settings, X, Maximize, Minimize, Heart, Trophy, Gamepad2, User, Swords, Droplet, ListOrdered, Radar, LogOut, HelpCircle } from 'lucide-react';
import { useEffect, useState } from 'react';
import { playSound } from '../../utils/audio';
import { MobileControls } from './MobileControls';
import { Chatbot } from './Chatbot';

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
  const wave = useGameStore((state) => state.wave);
  const waveState = useGameStore((state) => state.waveState);
  const victory = useGameStore((state) => state.victory);
  const activeEvent = useGameStore((state) => state.activeEvent);
  const eventsEnabled = useGameStore((state) => state.eventsEnabled);
  const enableLighting = useGameStore((state) => state.enableLighting);
  const shadowQuality = useGameStore((state) => state.shadowQuality);
  const setShadowQuality = useGameStore((state) => state.setShadowQuality);
  const ultraVisuals = useGameStore((state) => state.ultraVisuals);
  const setUltraVisuals = useGameStore((state) => state.setUltraVisuals);
  const customConfig = useGameStore((state) => state.customConfig);
  const [adminOpen, setAdminOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [chatbotOpen, setChatbotOpen] = useState(false);
  const isCustomizingControls = useGameStore((state) => state.isCustomizingControls);
  const setIsCustomizingControls = useGameStore((state) => state.setIsCustomizingControls);
  const [settingsTab, setSettingsTab] = useState<'gameplay' | 'graphics'>('gameplay');
  const [adminTab, setAdminTab] = useState<'player' | 'world' | 'actions'>('player');
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [adminTargetId, setAdminTargetId] = useState<string>('');
  const [adminTargetSpeed, setAdminTargetSpeed] = useState<number>(50);
  const [adminTargetHealth, setAdminTargetHealth] = useState<number>(500);
  const [adminTeleportDestId, setAdminTeleportDestId] = useState<string>('');
  
  const [reloadProgress, setReloadProgress] = useState(100);
  const [isReloading, setIsReloading] = useState(false);
  const [canMelee, setCanMelee] = useState(false);

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
        
        // Check for melee targets
        const state = useGameStore.getState();
        const me = state.players[state.myId || ''];
        if (me) {
          let foundTarget = false;
          for (const id in state.players) {
            if (id === state.myId) continue;
            const p = state.players[id];
            if (p.health > 0) {
              const dist = Math.sqrt((p.x - me.x)**2 + (p.y - me.y)**2 + (p.z - me.z)**2);
              if (dist < 5) {
                foundTarget = true;
                break;
              }
            }
          }
          if (!foundTarget) {
            for (const id in state.entities) {
              const e = state.entities[id];
              if (e.health > 0) {
                const dist = Math.sqrt((e.x - me.x)**2 + (e.y - me.y)**2 + (e.z - me.z)**2);
                if (dist < 5) {
                  foundTarget = true;
                  break;
                }
              }
            }
          }
          setCanMelee(foundTarget);
        } else {
          setCanMelee(false);
        }
      }
      animationFrameId = requestAnimationFrame(loop);
    };
    animationFrameId = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(animationFrameId);
  }, []);

  const spectating = useGameStore((state) => state.spectating);
  const spectateTargetId = useGameStore((state) => state.spectateTargetId);
  const setSpectateTargetId = useGameStore((state) => state.setSpectateTargetId);
  const setSpectating = useGameStore((state) => state.setSpectating);

  useEffect(() => {
    if (me && me.health <= 0 && !spectating) {
      setSpectating(true);
    } else if (me && me.health > 0 && spectating && !adminState.flying) {
      setSpectating(false);
    }
  }, [me?.health, spectating, setSpectating, adminState.flying]);

  useEffect(() => {
    if (spectating) {
      const handleSpectatorClick = (e: MouseEvent) => {
        if (adminOpen || settingsOpen) return;
        
        const alivePlayers = Object.values(players).filter(p => p.health > 0 && p.id !== myId);
        if (alivePlayers.length === 0) return;

        let currentIndex = alivePlayers.findIndex(p => p.id === spectateTargetId);
        
        if (e.button === 0) { // Left click
          currentIndex = (currentIndex + 1) % alivePlayers.length;
        } else if (e.button === 2) { // Right click
          currentIndex = (currentIndex - 1 + alivePlayers.length) % alivePlayers.length;
        }
        
        setSpectateTargetId(alivePlayers[currentIndex].id);
      };

      window.addEventListener('mousedown', handleSpectatorClick);
      return () => window.removeEventListener('mousedown', handleSpectatorClick);
    }
  }, [spectating, players, spectateTargetId, adminOpen, settingsOpen, myId, setSpectateTargetId]);

  if (!me) return null;

  let maxHealth = gameMode === 'speed' ? 125 : 500;
  if (gameMode === 'custom' && customConfig) {
    maxHealth = customConfig.health;
  }

  return (
    <div className="absolute inset-0 pointer-events-none">
      {/* Crosshair */}
      {!spectating && (
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
      )}

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

      {/* Wave UI */}
      {gameMode === 'pve' && !boss && wave > 0 && (
        <div className="absolute top-10 left-1/2 transform -translate-x-1/2 flex flex-col items-center pointer-events-none z-40">
          <div className={`text-3xl font-black uppercase tracking-[0.2em] ${waveState === 'cleared' ? 'text-green-400' : waveState === 'waiting' ? 'text-yellow-400' : 'text-red-500'}`} style={{ textShadow: `0 0 10px ${waveState === 'cleared' ? '#4ade80' : waveState === 'waiting' ? '#facc15' : '#ef4444'}` }}>
            WAVE {wave}
          </div>
          {waveState === 'waiting' && (
            <div className="text-white font-mono text-lg mt-1 bg-black/50 px-3 py-1 rounded">
              PREPARE FOR ATTACK
            </div>
          )}
          {waveState === 'cleared' && (
            <div className="text-white font-mono text-lg mt-1 bg-black/50 px-3 py-1 rounded">
              WAVE CLEARED
            </div>
          )}
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
      {me.health <= 0 && !spectating && (
        <div className="absolute inset-0 flex items-center justify-center bg-black/80 backdrop-blur-sm z-50 pointer-events-auto animate-in fade-in duration-500">
          <div className="text-center flex flex-col items-center gap-6">
            <h1 className="text-7xl font-black text-red-500 uppercase tracking-[0.5em] mb-4 drop-shadow-[0_0_30px_rgba(255,0,0,0.5)]">
              {(gameMode === 'team' || (gameMode === 'custom' && customConfig?.teams)) && (me.lives ?? 0) <= 0 ? 'ELIMINATED' : 'YOU DIED'}
            </h1>
            <p className="text-2xl text-white font-mono uppercase tracking-widest opacity-80">
              {(gameMode === 'team' || (gameMode === 'custom' && customConfig?.teams)) && (me.lives ?? 0) <= 0 ? 'Spectating' : 'Waiting for respawn...'}
            </p>
            {!((gameMode === 'team' || (gameMode === 'custom' && customConfig?.teams)) && (me.lives ?? 0) <= 0) && (
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
      {!spectating && (
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
            {(gameMode === 'team' || (gameMode === 'custom' && customConfig?.teams)) && (
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
          
        </div>
      )}

      {/* Settings, Fullscreen, Admin Panel & Leave Buttons */}
      <div className="absolute bottom-4 left-4 pointer-events-auto flex gap-2 z-50">
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

      {/* Spectator UI */}
      {spectating && (
        <div className="absolute inset-0 flex flex-col items-center justify-between py-10 pointer-events-none z-40">
          <div className="bg-black/80 backdrop-blur-md border border-red-500/50 px-8 py-4 rounded-2xl shadow-[0_0_30px_rgba(255,0,0,0.3)] text-center animate-in slide-in-from-top-10">
            <h2 className="text-red-500 font-black text-3xl tracking-[0.2em] uppercase mb-2">Spectator Mode</h2>
            {spectateTargetId && players[spectateTargetId] ? (
              <p className="text-white font-mono text-lg">
                Watching: <span className="text-cyan-400 font-bold">{players[spectateTargetId].nickname}</span>
              </p>
            ) : (
              <p className="text-gray-400 font-mono text-lg">No alive players to spectate.</p>
            )}
          </div>
          
          <div className="bg-black/50 backdrop-blur-sm px-6 py-3 rounded-full border border-white/10 flex gap-8">
            <div className="flex items-center gap-2 text-white font-mono text-sm">
              <span className="bg-white/20 px-2 py-1 rounded text-xs font-bold">LMB</span> Prev Player
            </div>
            <div className="flex items-center gap-2 text-white font-mono text-sm">
              <span className="bg-white/20 px-2 py-1 rounded text-xs font-bold">RMB</span> Next Player
            </div>
          </div>
        </div>
      )}

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
              const radarCenter = spectating && spectateTargetId && players[spectateTargetId] 
                ? players[spectateTargetId] 
                : me;
                
              if (!radarCenter) return null;
              
              const RADAR_RANGE = 50;
              const RADAR_SIZE = 150;
              const angle = radarCenter.ry || 0;
              const cos = Math.cos(angle);
              const sin = Math.sin(angle);

              return Object.values(players).map((p) => {
                const dx = p.x - radarCenter.x;
                const dz = p.z - radarCenter.z;

                const rotX = dx * cos - dz * sin;
                const rotZ = dx * sin + dz * cos;

                const dist = Math.sqrt(rotX * rotX + rotZ * rotZ);
                
                let renderX = rotX;
                let renderZ = rotZ;
                
                // Clamp to edge of radar if outside range
                if (dist > RADAR_RANGE && p.id !== radarCenter.id) {
                  renderX = (rotX / dist) * RADAR_RANGE;
                  renderZ = (rotZ / dist) * RADAR_RANGE;
                }

                const mapX = (renderX / RADAR_RANGE) * (RADAR_SIZE / 2) + (RADAR_SIZE / 2);
                const mapY = (renderZ / RADAR_RANGE) * (RADAR_SIZE / 2) + (RADAR_SIZE / 2);

                const isClamped = dist > RADAR_RANGE && p.id !== radarCenter.id;

                return (
                  <div
                    key={p.id}
                    className={`absolute rounded-full -translate-x-1/2 -translate-y-1/2 ${p.id === radarCenter.id ? 'w-3 h-3 z-10 animate-pulse outline outline-2 outline-white' : isClamped ? 'w-2 h-2 z-0 opacity-100 border border-white/50' : 'w-3 h-3 z-0 border border-white/80'}`}
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

      {/* Build Ramp Prompt */}
      {!isMobile && (
        <div className="absolute bottom-[30%] left-1/2 -translate-x-1/2 bg-orange-900/80 border border-orange-500/50 px-6 py-3 rounded-xl backdrop-blur-md flex items-center gap-3 pointer-events-auto shadow-[0_0_20px_rgba(255,165,0,0.5)]">
          <span className="text-white font-bold uppercase tracking-widest text-lg">
            BUILD RAMP
          </span>
          <span className="bg-white text-black px-3 py-1 rounded text-sm font-bold">C</span>
        </div>
      )}

      {/* Melee Prompt */}
      {!isMobile && canMelee && me?.weapon === 'KNIFE' && (
        <div className="absolute bottom-1/3 left-1/2 -translate-x-1/2 bg-red-900/80 border border-red-500/50 px-6 py-3 rounded-xl backdrop-blur-md flex items-center gap-3 pointer-events-auto shadow-[0_0_20px_rgba(255,0,0,0.5)] animate-pulse">
          <span className="text-white font-bold uppercase tracking-widest text-lg">
            MELEE ATTACK
          </span>
          <span className="bg-white text-black px-3 py-1 rounded text-sm font-bold">F</span>
        </div>
      )}

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
        <MobileControls 
          isCustomizing={isCustomizingControls} 
          onStopCustomizing={() => setIsCustomizingControls(false)} 
          canMelee={canMelee} 
          me={me} 
        />
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
              <div className="flex items-center gap-4">
                <button 
                  onClick={() => setChatbotOpen(true)}
                  className="text-fuchsia-400 hover:text-fuchsia-300 transition-colors flex items-center gap-1"
                  title="Ask AI Assistant"
                >
                  <HelpCircle size={24} />
                </button>
                <button 
                  onClick={() => setSettingsOpen(false)}
                  className="text-gray-400 hover:text-white transition-colors"
                >
                  <X size={24} />
                </button>
              </div>
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
                  {isMobile && (
                    <div className="flex flex-col gap-2">
                      <button
                        className="bg-purple-500/20 hover:bg-purple-500/40 text-purple-400 border border-purple-500/50 rounded-lg p-3 font-bold uppercase tracking-widest text-sm transition-colors"
                        onClick={() => {
                          setIsCustomizingControls(true);
                          setSettingsOpen(false);
                        }}
                      >
                        Customize Mobile Controls
                      </button>
                      <button
                        className="bg-red-500/20 hover:bg-red-500/40 text-red-400 border border-red-500/50 rounded-lg p-3 font-bold uppercase tracking-widest text-sm transition-colors"
                        onClick={() => {
                          useGameStore.getState().setMobileControls(defaultMobileControls);
                        }}
                      >
                        Reset Controls to Default
                      </button>
                    </div>
                  )}
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
                  <label className="flex items-center gap-2 text-white text-xs font-bold uppercase tracking-widest cursor-pointer">
                    <input 
                      type="checkbox" 
                      checked={ultraVisuals}
                      onChange={(e) => {
                        const checked = e.target.checked;
                        setUltraVisuals(checked);
                        if (checked) {
                          useGameStore.getState().setEnableLighting(true);
                          setShadowQuality('high');
                        }
                      }}
                      className="accent-cyan-400"
                    />
                    Ultra Visuals
                  </label>
                  {enableLighting && (
                    <div className="bg-black/30 p-3 rounded-lg border border-white/5 mt-2">
                      <label className="text-white text-xs font-bold uppercase tracking-widest mb-2 block">Shadow Quality</label>
                      <div className="flex gap-2">
                        {['low', 'medium', 'high'].map(q => (
                          <button
                            key={q}
                            className={`flex-1 py-2 rounded-lg text-xs font-bold uppercase tracking-widest transition-colors ${shadowQuality === q ? 'bg-cyan-500 text-black' : 'bg-black/50 text-gray-400 hover:text-white border border-white/10'}`}
                            onClick={() => setShadowQuality(q as 'low' | 'medium' | 'high')}
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
                Self
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
                Players
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
                      <span className="text-white">{adminState.speed || (gameMode === 'speed' ? 50 : (gameMode === 'custom' && customConfig ? customConfig.speed : 12))}</span>
                    </label>
                    <input 
                      type="range" 
                      min="5" max="100" step="1" 
                      value={adminState.speed || (gameMode === 'speed' ? 50 : (gameMode === 'custom' && customConfig ? customConfig.speed : 12))} 
                      onChange={(e) => setAdminState({ speed: parseInt(e.target.value) })}
                      className="w-full accent-red-500"
                    />
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

                  <div className="bg-black/30 p-4 rounded-lg border border-white/5">
                    <label className="text-red-400 text-xs font-bold uppercase tracking-widest mb-3 block">
                      Spawn Bot
                    </label>
                    <div className="flex flex-col gap-3">
                      <div className="flex gap-2">
                        <select 
                          value={adminTargetId}
                          onChange={(e) => setAdminTargetId(e.target.value)}
                          className="flex-1 bg-black/50 border border-red-500/30 rounded-lg p-2 text-white outline-none focus:border-red-500 text-xs"
                        >
                          <option value="all">All Players</option>
                          <option value={myId || ''}>Self ({me.nickname})</option>
                          {Object.values(players).filter(p => p.id !== myId).map(p => (
                            <option key={p.id} value={p.id}>{p.nickname || p.id.substring(0, 4)}</option>
                          ))}
                        </select>
                        <input 
                          type="number" 
                          placeholder="Health"
                          value={adminTargetHealth}
                          onChange={(e) => setAdminTargetHealth(parseInt(e.target.value) || 100)}
                          className="w-24 bg-black/50 border border-red-500/30 rounded-lg p-2 text-white outline-none focus:border-red-500 text-xs"
                        />
                      </div>
                      <div className="flex flex-wrap gap-2">
                        {['LIGHTBULB', 'DRONE', 'MECH', 'BOSS'].map(type => (
                          <button
                            key={type}
                            className="text-xs font-bold text-white hover:text-red-400 py-2 px-3 bg-black/50 hover:bg-red-500/20 rounded-lg transition-colors border border-red-500/30 flex-1 min-w-[80px]"
                            onClick={() => {
                              useGameStore.getState().socket?.emit('adminSpawnBot', type, adminTargetId, adminTargetHealth);
                            }}
                          >
                            {type}
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>
                </>
              )}

              {adminTab === 'actions' && (
                <div className="flex flex-col gap-4 max-h-[60vh] overflow-y-auto pr-2 custom-scrollbar">
                  <div className="bg-black/30 p-4 rounded-lg border border-white/5">
                    <label className="text-red-400 text-xs font-bold uppercase tracking-widest mb-3 block">
                      Select Target Player
                    </label>
                    <select 
                      value={adminTargetId}
                      onChange={(e) => setAdminTargetId(e.target.value)}
                      className="w-full bg-black/50 border border-red-500/30 rounded-lg p-2 text-white outline-none focus:border-red-500"
                    >
                      <option value="">-- Select Player --</option>
                      <option value={myId || ''}>Self ({me.nickname})</option>
                      {Object.values(players).filter(p => p.id !== myId).map(p => (
                        <option key={p.id} value={p.id}>{p.nickname || p.id.substring(0, 4)}</option>
                      ))}
                    </select>
                  </div>

                  {adminTargetId && (
                    <>
                      <div className="bg-black/30 p-4 rounded-lg border border-white/5">
                        <label className="text-red-400 text-xs font-bold uppercase tracking-widest mb-3 block">
                          Teleport Target To
                        </label>
                        <div className="flex gap-2">
                          <select 
                            value={adminTeleportDestId}
                            onChange={(e) => setAdminTeleportDestId(e.target.value)}
                            className="flex-1 bg-black/50 border border-red-500/30 rounded-lg p-2 text-white outline-none focus:border-red-500"
                          >
                            <option value="">-- Select Destination --</option>
                            {Object.values(players).filter(p => p.id !== adminTargetId).map(p => (
                              <option key={p.id} value={p.id}>{p.nickname || p.id.substring(0, 4)}</option>
                            ))}
                          </select>
                          <button
                            disabled={!adminTeleportDestId}
                            onClick={() => {
                              if (adminTargetId === myId) {
                                const dest = players[adminTeleportDestId];
                                if (dest) window.dispatchEvent(new CustomEvent('adminTeleport', { detail: { x: dest.x, y: dest.y, z: dest.z } }));
                              } else {
                                useGameStore.getState().socket?.emit('adminTeleportPlayer', adminTargetId, adminTeleportDestId);
                              }
                            }}
                            className="px-4 py-2 bg-red-500/20 hover:bg-red-500/40 text-red-400 rounded-lg border border-red-500/50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                          >
                            Teleport
                          </button>
                        </div>
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
                                useGameStore.getState().socket?.emit('adminGiveWeapon', w, adminTargetId);
                              }}
                            >
                              {w}
                            </button>
                          ))}
                        </div>
                      </div>

                      <div className="bg-black/30 p-4 rounded-lg border border-white/5">
                        <label className="text-red-400 text-xs font-bold uppercase tracking-widest mb-3 flex justify-between">
                          <span>Set Speed</span>
                          <span className="text-white">{adminTargetSpeed}</span>
                        </label>
                        <div className="flex gap-4 items-center">
                          <input 
                            type="range" 
                            min="5" max="100" step="1" 
                            value={adminTargetSpeed} 
                            onChange={(e) => setAdminTargetSpeed(parseInt(e.target.value))}
                            className="flex-1 accent-red-500"
                          />
                          <button
                            onClick={() => {
                              if (adminTargetId === myId) {
                                setAdminState({ speed: adminTargetSpeed });
                              } else {
                                useGameStore.getState().socket?.emit('adminSetSpeed', adminTargetId, adminTargetSpeed);
                              }
                            }}
                            className="px-3 py-1 bg-red-500/20 hover:bg-red-500/40 text-red-400 rounded-lg border border-red-500/50 transition-colors text-xs font-bold"
                          >
                            SET
                          </button>
                        </div>
                      </div>

                      <div className="bg-black/30 p-4 rounded-lg border border-white/5">
                        <label className="text-red-400 text-xs font-bold uppercase tracking-widest mb-3 flex justify-between">
                          <span>Set Health</span>
                          <span className="text-white">{adminTargetHealth}</span>
                        </label>
                        <div className="flex gap-4 items-center">
                          <input 
                            type="range" 
                            min="1" max="2000" step="10" 
                            value={adminTargetHealth} 
                            onChange={(e) => setAdminTargetHealth(parseInt(e.target.value))}
                            className="flex-1 accent-red-500"
                          />
                          <button
                            onClick={() => {
                              useGameStore.getState().socket?.emit('adminSetHealth', adminTargetId, adminTargetHealth);
                            }}
                            className="px-3 py-1 bg-red-500/20 hover:bg-red-500/40 text-red-400 rounded-lg border border-red-500/50 transition-colors text-xs font-bold"
                          >
                            SET
                          </button>
                        </div>
                      </div>

                      <div className="bg-black/30 p-4 rounded-lg border border-white/5 flex gap-2">
                        <button
                          onClick={() => {
                            useGameStore.getState().socket?.emit('adminRevivePlayer', adminTargetId);
                          }}
                          className="flex-1 py-2 bg-green-900/50 hover:bg-green-600 text-white rounded-lg border border-green-500/50 transition-colors font-bold uppercase tracking-widest"
                        >
                          Revive Player
                        </button>
                        <button
                          onClick={() => {
                            if (adminTargetId === myId) {
                              useGameStore.getState().setSpectating(true);
                            } else {
                              // Could add adminForceSpectate if needed, but for now just self
                              alert('Spectator mode can only be toggled for self currently.');
                            }
                          }}
                          className="flex-1 py-2 bg-blue-900/50 hover:bg-blue-600 text-white rounded-lg border border-blue-500/50 transition-colors font-bold uppercase tracking-widest"
                        >
                          Spectate
                        </button>
                      </div>

                      {adminTargetId !== myId && (
                        <div className="bg-black/30 p-4 rounded-lg border border-white/5">
                          <button
                            onClick={() => {
                              useGameStore.getState().socket?.emit('adminBan', adminTargetId);
                              setAdminTargetId('');
                            }}
                            className="w-full py-2 bg-red-900/50 hover:bg-red-600 text-white rounded-lg border border-red-500/50 transition-colors font-bold uppercase tracking-widest"
                          >
                            Ban Player
                          </button>
                        </div>
                      )}
                    </>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {chatbotOpen && <Chatbot onClose={() => setChatbotOpen(false)} />}
    </div>
  );
}
