import { create } from 'zustand';
import { io, Socket } from 'socket.io-client';
import { playSound } from '../utils/audio';
import * as THREE from 'three';

interface PlayerState {
  id: string;
  nickname: string;
  x: number;
  y: number;
  z: number;
  rx: number;
  ry: number;
  rz: number;
  color: string;
  score: number;
  health: number;
  weapon?: string;
  bleedingTicks?: number;
  lives?: number;
}

interface LaserState {
  id: string;
  from: [number, number, number];
  to: [number, number, number];
  color: string;
}

interface ShockwaveState {
  id: string;
  x: number;
  y: number;
  z: number;
  radius: number;
}

interface EntityState {
  id: string;
  type: 'LIGHTBULB' | 'DRONE' | 'MECH' | 'LAVABOT' | 'SNIPER' | 'TANK' | 'SWARMER' | 'HEALER' | 'BOSS';
  x: number;
  y: number;
  z: number;
  health: number;
  isPreparingAttack?: boolean;
  invulnerable?: boolean;
}

interface SpecialEvent {
  type: 'tornado' | 'lava' | 'meteorite';
  duration: number;
  startTime: number;
  targets?: { x: number, z: number }[];
}

interface DamageNumber {
  id: string;
  amount: number;
  isCritical: boolean;
  x: number;
  y: number;
  z: number;
  createdAt: number;
}

export interface Structure {
  id: string;
  type: 'RAMP';
  x: number;
  y: number;
  z: number;
  ry: number;
  ownerId: string;
}

export interface ControlElementConfig {
  x: number;
  y: number;
  size: number;
  opacity: number;
}

export interface MobileControlsConfig {
  joystick: ControlElementConfig;
  shoot: ControlElementConfig;
  jump: ControlElementConfig;
  dash: ControlElementConfig;
  melee: ControlElementConfig;
  build: ControlElementConfig;
}

export const defaultMobileControls: MobileControlsConfig = {
  joystick: { x: 15, y: 75, size: 1, opacity: 1 },
  shoot: { x: 90, y: 85, size: 1, opacity: 1 },
  dash: { x: 80, y: 87, size: 1, opacity: 1 },
  jump: { x: 70, y: 87, size: 1, opacity: 1 },
  build: { x: 60, y: 87, size: 1, opacity: 1 },
  melee: { x: 50, y: 87, size: 1, opacity: 1 },
};

interface GameStore {
  socket: Socket | null;
  players: Record<string, PlayerState>;
  entities: Record<string, EntityState>;
  structures: Record<string, Structure>;
  lasers: LaserState[];
  shockwaves: ShockwaveState[];
  damageNumbers: DamageNumber[];
  weapons: Record<string, any>;
  medkits: Record<string, any>;
  explosions: any[];
  myId: string | null;
  sensitivity: number;
  renderDistance: number;
  dynamicResolution: boolean;
  showFps: boolean;
  fpsLimit: number;
  enableLighting: boolean;
  shadowQuality: 'low' | 'medium' | 'high';
  ultraVisuals: boolean;
  mapIndex: number;
  seed: number;
  envMap: THREE.Texture | null;
  customCursorUrl: string | null;
  hudPositions: Record<string, { x: number, y: number, scale: number }>;
  gameMode: 'pvp' | 'pve' | 'team' | 'speed' | 'custom';
  difficulty: 'easy' | 'normal' | 'hard' | 'nightmare';
  gameState: 'lobby' | 'playing';
  teams: Record<string, string>;
  votesToStart: string[];
  activeEvent: SpecialEvent | null;
  eventsEnabled: boolean;
  mobileControls: MobileControlsConfig;
  setMobileControls: (controls: MobileControlsConfig) => void;
  isCustomizingControls: boolean;
  setIsCustomizingControls: (val: boolean) => void;
  customConfig?: {
    teams: boolean;
    teamSize: number;
    enemyBots: number;
    health: number;
    speed: number;
    spawnWeapon: string;
  };
  adminState: {
    infiniteHealth: boolean;
    flying: boolean;
    noclip: boolean;
    speed: number;
  };
  interactable: { type: 'weapon' | 'medkit', id: string, name: string } | null;
  connect: (nickname: string, isAdmin: boolean, gameMode: 'pvp' | 'pve' | 'team' | 'speed' | 'custom', difficulty: 'easy' | 'normal' | 'hard' | 'nightmare') => void;
  disconnect: () => void;
  setSensitivity: (val: number) => void;
  setRenderDistance: (val: number) => void;
  setDynamicResolution: (val: boolean) => void;
  setShowFps: (val: boolean) => void;
  setFpsLimit: (val: number) => void;
  setEnableLighting: (val: boolean) => void;
  setShadowQuality: (val: 'low' | 'medium' | 'high') => void;
  setUltraVisuals: (val: boolean) => void;
  setEnvMap: (envMap: THREE.Texture | null) => void;
  setCustomCursorUrl: (url: string | null) => void;
  setHudPositions: (positions: Record<string, { x: number, y: number, scale: number }>) => void;
  boss: { id: string, health: number, maxHealth: number } | null;
  wave: number;
  waveState: 'waiting' | 'spawning' | 'cleared';
  victory: boolean;
  banned: boolean;
  spectating: boolean;
  spectateTargetId: string | null;
  setBoss: (boss: { id: string, health: number, maxHealth: number } | null) => void;
  updateBossHealth: (health: number) => void;
  setInteractable: (interactable: { type: 'weapon' | 'medkit', id: string, name: string } | null) => void;
  setAdminState: (state: Partial<{ infiniteHealth: boolean; flying: boolean; noclip: boolean; speed: number }>) => void;
  setSpectating: (spectating: boolean) => void;
  setSpectateTargetId: (id: string | null) => void;
  updatePlayer: (id: string, data: Partial<PlayerState>) => void;
  addLaser: (laser: LaserState) => void;
  removeLaser: (id: string) => void;
  addExplosion: (exp: any) => void;
  removeExplosion: (id: string) => void;
  addShockwave: (sw: ShockwaveState) => void;
  removeShockwave: (id: string) => void;
  joinTeam: (teamId: string) => void;
  voteStart: () => void;
}

export const useGameStore = create<GameStore>((set, get) => ({
  socket: null,
  players: {},
  entities: {},
  structures: {},
  lasers: [],
  shockwaves: [],
  damageNumbers: [],
  weapons: {},
  medkits: {},
  explosions: [],
  myId: null,
  sensitivity: 4.0,
  renderDistance: 250,
  dynamicResolution: true,
  showFps: false,
  fpsLimit: 0,
  enableLighting: false,
  shadowQuality: 'medium',
  ultraVisuals: false,
  mapIndex: 0,
  seed: 0,
  envMap: null,
  customCursorUrl: null,
  hudPositions: (() => {
    try {
      if (typeof window !== 'undefined') {
        const saved = localStorage.getItem('hudPositions');
        if (saved) return JSON.parse(saved);
      }
    } catch (e) {}
    return {
      healthBar: { x: 50, y: 95, scale: 1 },
      weaponInfo: { x: 95, y: 90, scale: 1 },
      minimap: { x: 5, y: 5, scale: 1 },
      killFeed: { x: 95, y: 5, scale: 1 },
      leaderboard: { x: 5, y: 30, scale: 1 },
      chat: { x: 5, y: 70, scale: 1 },
    };
  })(),
  gameMode: 'pvp',
  difficulty: 'normal',
  gameState: 'playing',
  teams: {},
  votesToStart: [],
  activeEvent: null,
  eventsEnabled: true,
  mobileControls: (() => {
    try {
      if (typeof window !== 'undefined') {
        const saved = localStorage.getItem('mobileControls');
        if (saved) return JSON.parse(saved);
      }
    } catch (e) {}
    return defaultMobileControls;
  })(),
  setMobileControls: (controls) => {
    if (typeof window !== 'undefined') {
      localStorage.setItem('mobileControls', JSON.stringify(controls));
    }
    set({ mobileControls: controls });
  },
  isCustomizingControls: false,
  setIsCustomizingControls: (val) => set({ isCustomizingControls: val }),
  victory: false,
  banned: false,
  interactable: null,
  adminState: {
    infiniteHealth: false,
    flying: false,
    noclip: false,
    speed: 0,
  },

  setSensitivity: (val) => set({ sensitivity: val }),
  setRenderDistance: (val) => set({ renderDistance: val }),
  setDynamicResolution: (val) => set({ dynamicResolution: val }),
  setShowFps: (val) => set({ showFps: val }),
  setFpsLimit: (val) => set({ fpsLimit: val }),
  setEnableLighting: (val) => set({ enableLighting: val }),
  setShadowQuality: (val) => set({ shadowQuality: val }),
  setUltraVisuals: (val) => set({ ultraVisuals: val }),
  setEnvMap: (val) => set({ envMap: val }),
  setCustomCursorUrl: (val) => set({ customCursorUrl: val }),
  setHudPositions: (positions) => {
    if (typeof window !== 'undefined') {
      localStorage.setItem('hudPositions', JSON.stringify(positions));
    }
    set({ hudPositions: positions });
  },

  boss: null,
  wave: 0,
  waveState: 'cleared',
  spectating: false,
  spectateTargetId: null,
  setBoss: (boss) => set({ boss }),
  updateBossHealth: (health) => set((state) => ({ boss: state.boss ? { ...state.boss, health } : null })),
  setInteractable: (interactable) => set({ interactable }),
  setSpectating: (spectating) => set({ spectating }),
  setSpectateTargetId: (id) => set({ spectateTargetId: id }),

  setAdminState: (state) => {
    set((s) => {
      const newState = { ...s.adminState, ...state };
      if (s.socket) {
        s.socket.emit('setAdminState', newState);
      }
      return { adminState: newState };
    });
  },

  joinTeam: (teamId) => {
    const s = get().socket;
    if (s) s.emit('joinTeam', teamId);
  },

  voteStart: () => {
    const s = get().socket;
    if (s) s.emit('voteStart');
  },

  connect: (nickname, isAdmin, gameMode, difficulty) => {
    if (get().socket) return;
    
    set({ gameMode, difficulty });
    
    // Connect to the same host/port
    const socket = io({ query: { nickname, isAdmin, gameMode, difficulty } });

    socket.on('init', ({ players, weapons, medkits, id, mapIndex, entities = {}, structures = {}, seed, boss, state, teams, votesToStart, activeEvent, eventsEnabled, customConfig, wave, waveState }) => {
      set({ 
        players, 
        weapons, 
        medkits, 
        entities, 
        structures,
        myId: id, 
        mapIndex, 
        seed, 
        boss: boss || null,
        gameState: state || 'playing',
        teams: teams || {},
        votesToStart: votesToStart || [],
        activeEvent: activeEvent || null,
        eventsEnabled: eventsEnabled !== undefined ? eventsEnabled : true,
        customConfig,
        wave: wave || 0,
        waveState: waveState || 'cleared'
      });
    });

    socket.on('eventsToggled', (enabled: boolean) => {
      set({ eventsEnabled: enabled });
    });

    socket.on('specialEvent', (event) => {
      set({ activeEvent: event });
    });

    socket.on('specialEventEnded', () => {
      set({ activeEvent: null });
    });

    socket.on('teamsUpdated', (teams) => {
      set({ teams });
    });

    socket.on('votesUpdated', (votesToStart) => {
      set({ votesToStart });
    });

    socket.on('gameStateChanged', ({ state, players }) => {
      set((s) => ({ 
        gameState: state, 
        players: { ...s.players, ...players } 
      }));
    });

    socket.on('playerEliminated', (id) => {
      set((state) => {
        const newPlayers = { ...state.players };
        if (newPlayers[id]) {
          newPlayers[id] = { ...newPlayers[id], health: 0, bleedingTicks: 0, lives: 0 };
        }
        return { players: newPlayers };
      });
    });

    socket.on('gameOver', ({ winningTeam }) => {
      // Could set a game over state here if needed
      console.log('Game Over! Winning Team:', winningTeam);
    });

    socket.on('bossSpawned', (boss) => {
      set({ boss: { id: boss.id, health: boss.health, maxHealth: boss.maxHealth } });
    });

    socket.on('bossDefeated', () => {
      set({ boss: null, victory: true });
      setTimeout(() => set({ victory: false }), 10000);
    });

    socket.on('waveUpdate', ({ wave, waveState }) => {
      set({ wave, waveState });
    });

    socket.on('entitySpawned', (entity) => {
      set((state) => ({
        entities: { ...state.entities, [entity.id]: entity }
      }));
    });

    socket.on('entityDestroyed', (id) => {
      set((state) => {
        const newEntities = { ...state.entities };
        delete newEntities[id];
        return { entities: newEntities };
      });
    });

    socket.on('entityHit', ({ id, health }) => {
      set((state) => {
        const newEntities = { ...state.entities };
        if (newEntities[id]) {
          newEntities[id] = { ...newEntities[id], health };
        }
        let newBoss = state.boss;
        if (newBoss && newBoss.id === id) {
          newBoss = { ...newBoss, health };
        }
        return { entities: newEntities, boss: newBoss };
      });
    });

    socket.on('entitiesMoved', (updates) => {
      set((state) => {
        const newEntities = { ...state.entities };
        let newBoss = state.boss;
        updates.forEach((u: any) => {
          if (newEntities[u.id]) {
            newEntities[u.id] = {
              ...newEntities[u.id],
              x: u.x,
              y: u.y,
              z: u.z,
              isPreparingAttack: u.isPreparingAttack,
              invulnerable: u.invulnerable
            };
          }
        });
        return { entities: newEntities, boss: newBoss };
      });
    });

    socket.on('structuresUpdate', (structures) => {
      set({ structures });
    });

    socket.on('structureSpawned', (structure) => {
      set((state) => ({
        structures: { ...state.structures, [structure.id]: structure }
      }));
    });

    socket.on('structureDestroyed', (id) => {
      set((state) => {
        const newStructures = { ...state.structures };
        delete newStructures[id];
        return { structures: newStructures };
      });
    });

    socket.on('weaponsUpdate', (weapons) => {
      set({ weapons });
    });

    socket.on('medkitsUpdate', (medkits) => {
      set({ medkits });
    });

    socket.on('weaponPickedUp', (weaponType) => {
      set((state) => {
        if (!state.myId || !state.players[state.myId]) return state;
        return {
          players: {
            ...state.players,
            [state.myId]: { ...state.players[state.myId], weapon: weaponType }
          }
        };
      });
    });

    socket.on('playerWeaponChanged', ({ id, weapon }) => {
      set((state) => {
        if (!state.players[id]) return state;
        return {
          players: {
            ...state.players,
            [id]: { ...state.players[id], weapon }
          }
        };
      });
    });

    socket.on('explosion', (exp) => {
      const id = Math.random().toString(36).substring(7);
      get().addExplosion({ ...exp, id });
      playSound('explosion');
      
      // Calculate distance to player for camera shake
      const state = get();
      const me = state.myId ? state.players[state.myId] : null;
      if (me) {
        const dx = me.x - exp.x;
        const dy = me.y - exp.y;
        const dz = me.z - exp.z;
        const dist = Math.sqrt(dx*dx + dy*dy + dz*dz);
        if (dist < 60) {
          const intensity = Math.max(0, (60 - dist) / 60) * 1.5;
          window.dispatchEvent(new CustomEvent('cameraShake', { detail: { intensity } }));
        }
      }

      setTimeout(() => {
        get().removeExplosion(id);
      }, 500); // Explosion lasts 500ms
    });

    socket.on('mapChanged', (data) => {
      if (typeof data === 'number') {
        set({ mapIndex: data });
      } else {
        set({ mapIndex: data.mapIndex, seed: data.seed });
      }
    });

    socket.on('playerJoined', (player) => {
      set((state) => ({
        players: { ...state.players, [player.id]: player }
      }));
    });

    socket.on('playersMoved', (updates: any[]) => {
      const state = get();
      for (const player of updates) {
        if (state.players[player.id]) {
          // Mutate directly to avoid React re-renders for high-frequency updates
          state.players[player.id].x = player.x;
          state.players[player.id].y = player.y;
          state.players[player.id].z = player.z;
          state.players[player.id].rx = player.rx;
          state.players[player.id].ry = player.ry;
          state.players[player.id].rz = player.rz;
        }
      }
    });

    socket.on('playerLeft', (id) => {
      set((state) => {
        const newPlayers = { ...state.players };
        delete newPlayers[id];
        return { players: newPlayers };
      });
    });

    socket.on('laserFired', (laser) => {
      get().addLaser(laser);
      setTimeout(() => {
        get().removeLaser(laser.id);
      }, 100); // Laser visual lasts 100ms
    });

    socket.on('shockwave', (sw) => {
      const id = Math.random().toString(36).substring(7);
      get().addShockwave({ ...sw, id });
      setTimeout(() => {
        get().removeShockwave(id);
      }, 1000);
    });

    socket.on('playerHit', ({ id, health, bleedingTicks }) => {
      if (id === get().myId) {
        playSound('hit');
        window.dispatchEvent(new CustomEvent('cameraShake', { detail: { intensity: 0.8 } }));
      }
      set((state) => {
        if (!state.players[id]) return state;
        return {
          players: { ...state.players, [id]: { ...state.players[id], health, bleedingTicks } }
        };
      });
    });

    socket.on('damageNumber', ({ id, amount, isCritical, type }) => {
      set((state) => {
        let target;
        if (type === 'player') {
          target = state.players[id];
        } else {
          target = state.entities[id];
        }
        if (!target) return state;

        const newDamageNumber = {
          id: Math.random().toString(36).substring(7),
          amount,
          isCritical,
          x: target.x + (Math.random() - 0.5) * 2,
          y: target.y + (type === 'entity' && (target as any).type === 'BOSS' ? 8 : 2) + Math.random(),
          z: target.z + (Math.random() - 0.5) * 2,
          createdAt: Date.now()
        };

        setTimeout(() => {
          set((s) => ({ damageNumbers: s.damageNumbers.filter(dn => dn.id !== newDamageNumber.id) }));
        }, 1000);

        return { damageNumbers: [...state.damageNumbers, newDamageNumber] };
      });
    });

    socket.on('playerRespawned', (player) => {
      set((state) => ({
        players: { ...state.players, [player.id]: player }
      }));
    });

    socket.on('banned', () => {
      set({ banned: true });
    });

    socket.on('meleeAnimation', ({ id }) => {
      window.dispatchEvent(new CustomEvent('remoteMelee', { detail: { id } }));
    });

    socket.on('adminTeleport', (pos) => {
      window.dispatchEvent(new CustomEvent('adminTeleport', { detail: pos }));
    });

    socket.on('adminSetSpeed', (speed) => {
      set((s) => ({ adminState: { ...s.adminState, speed } }));
    });

    socket.on('scoreUpdated', ({ id, score }) => {
      set((state) => {
        if (!state.players[id]) return state;
        return {
          players: { ...state.players, [id]: { ...state.players[id], score } }
        };
      });
    });

    set({ socket });
  },

  disconnect: () => {
    const { socket } = get();
    if (socket) {
      socket.disconnect();
      set({ socket: null, players: {}, myId: null, boss: null });
    }
  },

  updatePlayer: (id, data) => {
    const state = get();
    if (state.players[id]) {
      Object.assign(state.players[id], data);
    }
  },

  addLaser: (laser) => {
    set((state) => ({ lasers: [...state.lasers, laser] }));
  },

  removeLaser: (id) => {
    set((state) => ({ lasers: state.lasers.filter(l => l.id !== id) }));
  },

  addExplosion: (exp) => {
    set((state) => ({ explosions: [...state.explosions, exp] }));
  },

  removeExplosion: (id) => {
    set((state) => ({ explosions: state.explosions.filter(e => e.id !== id) }));
  },

  addShockwave: (sw) => {
    set((state) => ({ shockwaves: [...state.shockwaves, sw] }));
  },

  removeShockwave: (id) => {
    set((state) => ({ shockwaves: state.shockwaves.filter(s => s.id !== id) }));
  }
}));
