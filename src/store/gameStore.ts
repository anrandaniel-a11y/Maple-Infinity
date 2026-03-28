import { create } from 'zustand';
import { io, Socket } from 'socket.io-client';

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
  type: 'LIGHTBULB' | 'DRONE' | 'MECH' | 'BOSS';
  x: number;
  y: number;
  z: number;
  health: number;
  isPreparingAttack?: boolean;
  invulnerable?: boolean;
}

interface GameStore {
  socket: Socket | null;
  players: Record<string, PlayerState>;
  entities: Record<string, EntityState>;
  lasers: LaserState[];
  shockwaves: ShockwaveState[];
  weapons: Record<string, any>;
  medkits: Record<string, any>;
  explosions: any[];
  myId: string | null;
  sensitivity: number;
  renderDistance: number;
  dynamicResolution: boolean;
  showFps: boolean;
  fpsLimit: number;
  mapIndex: number;
  seed: number;
  gameMode: 'pvp' | 'pve';
  difficulty: 'easy' | 'normal' | 'hard' | 'nightmare';
  adminState: {
    infiniteHealth: boolean;
    flying: boolean;
    noclip: boolean;
    speed: number;
  };
  interactable: { type: 'weapon' | 'medkit', id: string, name: string } | null;
  connect: (nickname: string, isAdmin: boolean, gameMode: 'pvp' | 'pve', difficulty: 'easy' | 'normal' | 'hard' | 'nightmare') => void;
  disconnect: () => void;
  setSensitivity: (val: number) => void;
  setRenderDistance: (val: number) => void;
  setDynamicResolution: (val: boolean) => void;
  setShowFps: (val: boolean) => void;
  setFpsLimit: (val: number) => void;
  boss: { id: string, health: number, maxHealth: number } | null;
  victory: boolean;
  setBoss: (boss: { id: string, health: number, maxHealth: number } | null) => void;
  updateBossHealth: (health: number) => void;
  setInteractable: (interactable: { type: 'weapon' | 'medkit', id: string, name: string } | null) => void;
  setAdminState: (state: Partial<{ infiniteHealth: boolean; flying: boolean; noclip: boolean; speed: number }>) => void;
  updatePlayer: (id: string, data: Partial<PlayerState>) => void;
  addLaser: (laser: LaserState) => void;
  removeLaser: (id: string) => void;
  addExplosion: (exp: any) => void;
  removeExplosion: (id: string) => void;
  addShockwave: (sw: ShockwaveState) => void;
  removeShockwave: (id: string) => void;
}

export const useGameStore = create<GameStore>((set, get) => ({
  socket: null,
  players: {},
  entities: {},
  lasers: [],
  shockwaves: [],
  weapons: {},
  medkits: {},
  explosions: [],
  myId: null,
  sensitivity: 1.0,
  renderDistance: 100,
  dynamicResolution: true,
  showFps: false,
  fpsLimit: 0,
  mapIndex: 0,
  seed: 0,
  gameMode: 'pvp',
  difficulty: 'normal',
  victory: false,
  interactable: null,
  adminState: {
    infiniteHealth: false,
    flying: false,
    noclip: false,
    speed: 12,
  },

  setSensitivity: (val) => set({ sensitivity: val }),
  setRenderDistance: (val) => set({ renderDistance: val }),
  setDynamicResolution: (val) => set({ dynamicResolution: val }),
  setShowFps: (val) => set({ showFps: val }),
  setFpsLimit: (val) => set({ fpsLimit: val }),

  boss: null,
  setBoss: (boss) => set({ boss }),
  updateBossHealth: (health) => set((state) => ({ boss: state.boss ? { ...state.boss, health } : null })),
  setInteractable: (interactable) => set({ interactable }),

  setAdminState: (state) => {
    set((s) => {
      const newState = { ...s.adminState, ...state };
      if (s.socket) {
        s.socket.emit('setAdminState', newState);
      }
      return { adminState: newState };
    });
  },

  connect: (nickname, isAdmin, gameMode, difficulty) => {
    if (get().socket) return;
    
    set({ gameMode, difficulty });
    
    // Connect to the same host/port
    const socket = io({ query: { nickname, isAdmin, gameMode, difficulty } });

    socket.on('init', ({ players, weapons, medkits, id, mapIndex, entities = {}, seed, boss }) => {
      set({ players, weapons, medkits, entities, myId: id, mapIndex, seed, boss: boss || null });
    });

    socket.on('bossSpawned', (boss) => {
      set({ boss: { id: boss.id, health: boss.health, maxHealth: boss.maxHealth } });
    });

    socket.on('bossDefeated', () => {
      set({ boss: null, victory: true });
      setTimeout(() => set({ victory: false }), 10000);
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
        const newBoss = state.boss?.id === id ? { ...state.boss, health } : state.boss;
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

    socket.on('explosion', (exp) => {
      const id = Math.random().toString(36).substring(7);
      get().addExplosion({ ...exp, id });
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
      set((state) => {
        if (!state.players[id]) return state;
        return {
          players: { ...state.players, [id]: { ...state.players[id], health, bleedingTicks } }
        };
      });
    });

    socket.on('playerRespawned', (player) => {
      set((state) => ({
        players: { ...state.players, [player.id]: player }
      }));
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
