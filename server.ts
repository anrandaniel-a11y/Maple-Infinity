import express from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';
import path from 'path';
import next from 'next';
import { generateVolume, getHighestBlockY, getTerrainHeight } from './src/utils/mapGen.js';

function dist2(v: any, w: any) {
  return Math.pow(v.x - w.x, 2) + Math.pow(v.y - w.y, 2) + Math.pow(v.z - w.z, 2);
}

function distToSegmentSquared(p: any, v: any, w: any) {
  const l2 = dist2(v, w);
  if (l2 === 0) return dist2(p, v);
  let t = ((p.x - v.x) * (w.x - v.x) + (p.y - v.y) * (w.y - v.y) + (p.z - v.z) * (w.z - v.z)) / l2;
  t = Math.max(0, Math.min(1, t));
  return dist2(p, { x: v.x + t * (w.x - v.x), y: v.y + t * (w.y - v.y), z: v.z + t * (w.z - v.z) });
}

function checkHit(player: any, from: number[], to: number[]) {
  const p1 = { x: player.x, y: player.y, z: player.z };
  const p2 = { x: player.x, y: player.y + 0.5, z: player.z };
  const p3 = { x: player.x, y: player.y - 0.5, z: player.z };
  
  const r2 = 1.2 * 1.2; // Generous hit radius squared
  
  const v = { x: from[0], y: from[1], z: from[2] };
  const w = { x: to[0], y: to[1], z: to[2] };
  
  if (distToSegmentSquared(p1, v, w) < r2) return true;
  if (distToSegmentSquared(p2, v, w) < r2) return true;
  if (distToSegmentSquared(p3, v, w) < r2) return true;
  
  return false;
}

function checkStructureHit(structure: any, from: number[], to: number[]) {
  const p = { x: structure.x, y: structure.y, z: structure.z };
  const r2 = 10 * 10; // 10 radius for structure
  const v = { x: from[0], y: from[1], z: from[2] };
  const w = { x: to[0], y: to[1], z: to[2] };
  return distToSegmentSquared(p, v, w) < r2;
}

async function startServer() {
  const app = express();
  const httpServer = createServer(app);
  const io = new Server(httpServer, {
    cors: { origin: '*' }
  });

  const PORT = 3000;

  interface CustomGameConfig {
    teams: boolean;
    teamSize: number;
    enemyBots: number;
    health: number;
    speed: number;
    spawnWeapon: string;
  }

  let pointsData: Record<string, number> = {};
  try {
    const fs = await import('fs');
    if (fs.existsSync('points.json')) {
      pointsData = JSON.parse(fs.readFileSync('points.json', 'utf-8'));
    }
  } catch (e) {
    console.error('Failed to load points', e);
  }

  const savePoints = async () => {
    try {
      const fs = await import('fs');
      fs.writeFileSync('points.json', JSON.stringify(pointsData));
    } catch (e) {
      console.error('Failed to save points', e);
    }
  };

  const awardPointsToTeam = (room: Room, winningTeam: string | null) => {
    if (winningTeam) {
      for (const pId in room.players) {
        if (room.teams[pId] === winningTeam) {
          const nickname = room.players[pId].nickname;
          pointsData[nickname] = (pointsData[nickname] || 0) + 1;
        }
      }
      savePoints();
    }
  };

  interface Room {
    players: Record<string, any>;
    weapons: Record<string, any>;
    medkits: Record<string, any>;
    entities: Record<string, any>;
    structures: Record<string, any>;
    currentMapIndex: number;
    mode: 'pvp' | 'pve' | 'team' | 'speed' | 'custom';
    difficulty: 'easy' | 'normal' | 'hard' | 'nightmare';
    seed: number;
    volume: Int32Array;
    bossActive: boolean;
    bossId: string | null;
    bossPhase: number;
    bossDefeated: boolean;
    state: 'lobby' | 'playing';
    teams: Record<string, string>; // playerId -> teamId
    votesToStart: Set<string>;
    activeEvent: { type: 'tornado' | 'lava' | 'meteorite', endTime: number, targets?: {x: number, z: number}[] } | null;
    eventsEnabled: boolean;
    customConfig?: CustomGameConfig;
    wave: number;
    waveEnemiesToSpawn: number;
    waveState: 'waiting' | 'spawning' | 'cleared';
    waveStartTime: number;
  }

  const TOTAL_MAPS = 3;
  const WEAPON_TYPES = ['REVOLVER', 'SHOTGUN', 'RPG', 'KNIFE'];

  function createRoom(mode: 'pvp' | 'pve' | 'team' | 'speed' | 'custom', difficulty: 'easy' | 'normal' | 'hard' | 'nightmare', customConfig?: CustomGameConfig): Room {
    const seed = Math.floor(Math.random() * 1000000);
    const volume = generateVolume(seed, mode === 'pve');
    const weapons: Record<string, any> = {};
    const medkits: Record<string, any> = {};
    const numWeapons = mode === 'pve' ? 10 : 40;
    const numMedkits = mode === 'pve' ? (difficulty === 'easy' ? 15 : difficulty === 'normal' ? 8 : difficulty === 'hard' ? 4 : 2) : 5;
    const spread = mode === 'pve' ? 350 : 1900;
    
    for (let i = 0; i < numWeapons; i++) {
      const id = Math.random().toString(36).substring(7);
      const x = (Math.random() - 0.5) * spread;
      const z = (Math.random() - 0.5) * spread;
      const terrainY = mode === 'pve' ? 0 : getTerrainHeight(x, z);
      const blockY = getHighestBlockY(volume, x, z);
      weapons[id] = {
        id,
        type: WEAPON_TYPES[Math.floor(Math.random() * WEAPON_TYPES.length)],
        x,
        y: Math.max(terrainY, blockY) + 1,
        z,
        active: true,
        respawnTime: 0
      };
    }

    for (let i = 0; i < numMedkits; i++) {
      const id = Math.random().toString(36).substring(7);
      const x = (Math.random() - 0.5) * spread;
      const z = (Math.random() - 0.5) * spread;
      const terrainY = mode === 'pve' ? 0 : getTerrainHeight(x, z);
      const blockY = getHighestBlockY(volume, x, z);
      medkits[id] = {
        id,
        x,
        y: Math.max(terrainY, blockY) + 1,
        z,
        active: true,
        respawnTime: 0
      };
    }

    return {
      players: {},
      weapons,
      medkits,
      entities: {},
      structures: {},
      currentMapIndex: 0,
      mode,
      difficulty,
      seed,
      volume,
      bossActive: false,
      bossId: null,
      bossPhase: 0,
      bossDefeated: false,
      state: mode === 'team' || mode === 'custom' ? 'lobby' : 'playing',
      teams: {},
      votesToStart: new Set(),
      activeEvent: null,
      eventsEnabled: true,
      customConfig,
      wave: 0,
      waveEnemiesToSpawn: 0,
      waveState: 'cleared',
      waveStartTime: 0
    };
  }

  const rooms: Record<string, Room> = {
    pvp: createRoom('pvp', 'normal'),
    speed: createRoom('speed', 'normal'),
    'pve-easy': createRoom('pve', 'easy'),
    'pve-normal': createRoom('pve', 'normal'),
    'pve-hard': createRoom('pve', 'hard'),
    'pve-nightmare': createRoom('pve', 'nightmare'),
    team: createRoom('team', 'normal')
  };

  function destroyStructureAndConnected(rId: string, startId: string) {
    const r = rooms[rId];
    if (!r || !r.structures[startId]) return;

    const toDestroy = new Set<string>();
    const queue = [startId];
    toDestroy.add(startId);

    while (queue.length > 0) {
      const currentId = queue.shift()!;
      const current = r.structures[currentId];
      if (!current) continue;

      for (const otherId in r.structures) {
        if (!toDestroy.has(otherId)) {
          const other = r.structures[otherId];
          const distSq = (current.x - other.x)**2 + (current.y - other.y)**2 + (current.z - other.z)**2;
          if (distSq <= 30 * 30) { // 30 units
            toDestroy.add(otherId);
            queue.push(otherId);
          }
        }
      }
    }

    for (const id of toDestroy) {
      delete r.structures[id];
      io.to(rId).emit('structureDestroyed', id);
    }
  }

  // Game Loop for bleeding, weapon respawns, and entities
  setInterval(() => {
    const now = Date.now();
    
    for (const [roomId, room] of Object.entries(rooms)) {
      if (room.activeEvent && now > room.activeEvent.endTime) {
        room.activeEvent = null;
        io.to(roomId).emit('specialEventEnded');
      }

      let weaponsUpdated = false;
      for (const w of Object.values(room.weapons)) {
        if (!w.active && now > w.respawnTime) {
          w.active = true;
          weaponsUpdated = true;
        }
      }
      if (weaponsUpdated) io.to(roomId).emit('weaponsUpdate', room.weapons);

      let medkitsUpdated = false;
      for (const m of Object.values(room.medkits)) {
        if (!m.active && now > m.respawnTime) {
          m.active = true;
          medkitsUpdated = true;
        }
      }
      if (medkitsUpdated) io.to(roomId).emit('medkitsUpdate', room.medkits);

      for (const p of Object.values(room.players)) {
        if (p.bleedingTicks > 0) {
          if (!p.infiniteHealth) {
            const bleedDamage = room.difficulty === 'easy' ? 5 : room.difficulty === 'normal' ? 10 : room.difficulty === 'hard' ? 15 : 20;
            p.health -= bleedDamage;
          }
          p.bleedingTicks--;
          if (p.health <= 0) {
            p.health = 0;
            p.bleedingTicks = 0;
            if (p.lastAttacker && room.players[p.lastAttacker]) {
              room.players[p.lastAttacker].score += 1;
              io.to(roomId).emit('scoreUpdated', { id: p.lastAttacker, score: room.players[p.lastAttacker].score });
            }
            if (room.mode === 'team' || (room.mode === 'custom' && room.customConfig?.teams)) {
              p.lives -= 1;
              if (p.lives <= 0) {
                io.to(roomId).emit('playerEliminated', p.id);
                const remainingTeams = new Set();
                for (const pId in room.players) {
                  if (room.players[pId].lives > 0) {
                    remainingTeams.add(room.teams[pId]);
                  }
                }
                if (remainingTeams.size <= 1) {
                  const winningTeam = remainingTeams.size === 1 ? Array.from(remainingTeams)[0] as string : null;
                  awardPointsToTeam(room, winningTeam);
                  io.to(roomId).emit('gameOver', { winningTeam });
                  setTimeout(() => {
                    room.state = 'lobby';
                    room.teams = {};
                    room.votesToStart.clear();
                    for (const pId in room.players) {
                      room.players[pId].health = room.mode === 'custom' && room.customConfig ? room.customConfig.health : 500;
                      room.players[pId].lives = 1;
                      room.players[pId].score = 0;
                    }
                    io.to(roomId).emit('gameStateChanged', { state: 'lobby', players: room.players });
                    io.to(roomId).emit('teamsUpdated', room.teams);
                    io.to(roomId).emit('votesUpdated', []);
                  }, 5000);
                }
              }
            }
            io.to(roomId).emit('playerHit', { id: p.id, health: 0, bleedingTicks: 0 });
          } else {
            io.to(roomId).emit('playerHit', { id: p.id, health: p.health, bleedingTicks: p.bleedingTicks });
          }
        }
      }

      if (room.mode === 'pve' || (room.mode === 'custom' && room.customConfig && room.customConfig.enemyBots > 0)) {
        const numPlayers = Object.keys(room.players).length;
        if (numPlayers > 0) {
          if (room.mode === 'pve' && !room.bossActive && !room.bossDefeated) {
            const now = Date.now();
            if (room.waveState === 'cleared') {
              room.wave++;
              if (room.wave > 10) {
                room.bossActive = true;
                room.bossPhase = 1;
                const bossId = 'boss_' + Math.random().toString(36).substring(7);
                room.bossId = bossId;
                const spawnX = 0;
                const spawnZ = 0;
                const terrainY = room.mode === 'pve' ? 0 : getTerrainHeight(spawnX, spawnZ);
                const blockY = getHighestBlockY(room.volume, spawnX, spawnZ);
                room.entities[bossId] = {
                  id: bossId,
                  type: 'BOSS',
                  x: spawnX,
                  y: Math.max(terrainY, blockY) + 10,
                  z: spawnZ,
                  health: 10000,
                  maxHealth: 10000,
                  targetId: null,
                  lastAttack: 0,
                  isPreparingAttack: false,
                  attackStartTime: 0,
                  invulnerableUntil: 0,
                  attackType: 'SPREAD'
                };
                io.to(roomId).emit('entitySpawned', room.entities[bossId]);
                io.to(roomId).emit('bossSpawned', room.entities[bossId]);
                io.to(roomId).emit('chatMessage', { sender: 'SYSTEM', text: 'WARNING: BOSS DETECTED!', color: '#ff0000' });
              } else {
                room.waveState = 'waiting';
                room.waveStartTime = now + 5000;
                room.waveEnemiesToSpawn = room.wave * 5 * numPlayers;
                io.to(roomId).emit('waveUpdate', { wave: room.wave, waveState: room.waveState });
                io.to(roomId).emit('chatMessage', { sender: 'SYSTEM', text: `WAVE ${room.wave} STARTING IN 5 SECONDS...`, color: '#ffff00' });
              }
            } else if (room.waveState === 'waiting' && now >= room.waveStartTime) {
              room.waveState = 'spawning';
              io.to(roomId).emit('waveUpdate', { wave: room.wave, waveState: room.waveState });
              io.to(roomId).emit('chatMessage', { sender: 'SYSTEM', text: `WAVE ${room.wave} STARTED!`, color: '#ff0000' });
            } else if (room.waveState === 'spawning') {
              const maxEntities = room.difficulty === 'easy' ? 5 : room.difficulty === 'normal' ? 10 : room.difficulty === 'hard' ? 20 : 30;
              const spawnChance = room.difficulty === 'easy' ? 0.2 : room.difficulty === 'normal' ? 0.5 : room.difficulty === 'hard' ? 0.8 : 1.0;
              
              if (room.waveEnemiesToSpawn > 0 && Object.keys(room.entities).length < numPlayers * maxEntities) {
                if (Math.random() < spawnChance) {
                  room.waveEnemiesToSpawn--;
                  const id = Math.random().toString(36).substring(7);
                  
                  let type = 'LIGHTBULB';
                  const types = ['LIGHTBULB', 'DRONE', 'SWARMER'];
                  if (room.wave >= 2) types.push('MECH', 'LAVABOT');
                  if (room.wave >= 3) types.push('SNIPER');
                  if (room.wave >= 4) types.push('TANK');
                  if (room.wave >= 5) types.push('HEALER');
                  type = types[Math.floor(Math.random() * types.length)];

                  const angle = Math.random() * Math.PI * 2;
                  const dist = 80 + Math.random() * 20;
                  const x = Math.cos(angle) * dist;
                  const z = Math.sin(angle) * dist;
                  const terrainY = room.mode === 'pve' ? 0 : getTerrainHeight(x, z);
                  const blockY = getHighestBlockY(room.volume, x, z);
                  
                  let health = 50;
                  let y = Math.max(terrainY, blockY) + 60;
                  
                  if (type === 'LIGHTBULB') { health = 50; y = Math.max(terrainY, blockY) + 60; }
                  else if (type === 'DRONE') { health = 100; y = Math.max(terrainY, blockY) + 60; }
                  else if (type === 'MECH') { health = 200; y = Math.max(terrainY, blockY) + 0.4; }
                  else if (type === 'LAVABOT') { health = 150; y = Math.max(terrainY, blockY) + 20; }
                  else if (type === 'SNIPER') { health = 80; y = Math.max(terrainY, blockY) + 0.4; }
                  else if (type === 'TANK') { health = 500; y = Math.max(terrainY, blockY) + 0.4; }
                  else if (type === 'SWARMER') { health = 30; y = Math.max(terrainY, blockY) + 10; }
                  else if (type === 'HEALER') { health = 120; y = Math.max(terrainY, blockY) + 30; }

                  room.entities[id] = {
                    id,
                    type,
                    x,
                    y,
                    z,
                    health,
                    targetId: null,
                    lastAttack: 0
                  };
                  io.to(roomId).emit('entitySpawned', room.entities[id]);
                }
              } else if (room.waveEnemiesToSpawn <= 0 && Object.keys(room.entities).length === 0) {
                room.waveState = 'cleared';
                io.to(roomId).emit('waveUpdate', { wave: room.wave, waveState: room.waveState });
                io.to(roomId).emit('chatMessage', { sender: 'SYSTEM', text: `WAVE ${room.wave} CLEARED!`, color: '#00ff00' });
              }
            }
          } else if (room.mode === 'custom' && room.customConfig && room.customConfig.enemyBots > 0) {
            const maxEntities = room.customConfig.enemyBots;
            if (Object.keys(room.entities).length < maxEntities) {
              if (Math.random() < 0.5) {
                const id = Math.random().toString(36).substring(7);
                const rand = Math.random();
                const type = rand < 0.33 ? 'LIGHTBULB' : rand < 0.66 ? 'DRONE' : 'MECH';
                const angle = Math.random() * Math.PI * 2;
                const dist = 80 + Math.random() * 20;
                const x = Math.cos(angle) * dist;
                const z = Math.sin(angle) * dist;
                const terrainY = getTerrainHeight(x, z);
                const blockY = getHighestBlockY(room.volume, x, z);
                room.entities[id] = {
                  id,
                  type,
                  x,
                  y: type === 'MECH' ? Math.max(terrainY, blockY) + 0.4 : Math.max(terrainY, blockY) + 60,
                  z,
                  health: type === 'LIGHTBULB' ? 50 : type === 'DRONE' ? 100 : 200,
                  targetId: null,
                  lastAttack: 0
                };
                io.to(roomId).emit('entitySpawned', room.entities[id]);
              }
            }
          }

          if (room.bossId && room.entities[room.bossId]) {
            const boss = room.entities[room.bossId];
            const now = Date.now();
            if (room.bossPhase === 1 && boss.health <= boss.maxHealth * 0.66) {
              room.bossPhase = 2;
              boss.invulnerableUntil = now + 5000;
              spawnBossMinions(room, roomId, 10);
              io.to(roomId).emit('chatMessage', { sender: 'SYSTEM', text: 'BOSS WAVE 2 INCOMING!', color: '#ff8800' });
            } else if (room.bossPhase === 2 && boss.health <= boss.maxHealth * 0.33) {
              room.bossPhase = 3;
              boss.invulnerableUntil = now + 5000;
              spawnBossMinions(room, roomId, 20);
              io.to(roomId).emit('chatMessage', { sender: 'SYSTEM', text: 'BOSS FINAL WAVE!', color: '#ff0000' });
            }
          }
        }
      }
    }
  }, 1000);

  // Special Events Loop
  setInterval(() => {
    const events: ('tornado' | 'lava' | 'meteorite')[] = ['tornado', 'lava', 'meteorite'];
    for (const [roomId, room] of Object.entries(rooms)) {
      if (room.state !== 'playing') continue;
      if (!room.eventsEnabled) continue;
      if (room.activeEvent) continue; // Don't start a new event if one is active
      const event = events[Math.floor(Math.random() * events.length)];
      const targets = Object.values(room.players).map(p => ({ x: p.x, z: p.z }));
      room.activeEvent = { type: event, endTime: Date.now() + 30000, targets }; // 30 seconds duration
      io.to(roomId).emit('specialEvent', { type: event, duration: 30000, startTime: Date.now(), targets });
    }
  }, 180000); // Every 3 minutes

  function spawnBossMinions(room: Room, roomId: string, count: number) {
    const boss = room.entities[room.bossId!];
    if (!boss) return;
    for (let i = 0; i < count; i++) {
      const id = Math.random().toString(36).substring(7);
      const type = Math.random() < 0.5 ? 'DRONE' : 'MECH';
      const angle = Math.random() * Math.PI * 2;
      const dist = 20 + Math.random() * 30;
      const x = boss.x + Math.cos(angle) * dist;
      const z = boss.z + Math.sin(angle) * dist;
      const terrainY = room.mode === 'pve' ? 0 : getTerrainHeight(x, z);
      const blockY = getHighestBlockY(room.volume, x, z);
      room.entities[id] = {
        id,
        type,
        x,
        y: type === 'MECH' ? Math.max(terrainY, blockY) + 0.4 : Math.max(terrainY, blockY) + 40,
        z,
        health: type === 'DRONE' ? 100 : 200,
        targetId: null,
        lastAttack: 0,
        isPreparingAttack: false,
        attackStartTime: 0
      };
      io.to(roomId).emit('entitySpawned', room.entities[id]);
    }
  }

  // Fast Game Loop for batched movement updates (30fps)
  setInterval(() => {
    const now = Date.now();
    for (const [roomId, room] of Object.entries(rooms)) {
      const updates: any[] = [];
      for (const id in room.players) {
        if (room.players[id].updated) {
          updates.push({
            id,
            x: room.players[id].x,
            y: room.players[id].y,
            z: room.players[id].z,
            rx: room.players[id].rx,
            ry: room.players[id].ry,
            rz: room.players[id].rz
          });
          room.players[id].updated = false;
        }
      }
      if (updates.length > 0) {
        io.to(roomId).volatile.emit('playersMoved', updates);
      }

      if (Object.keys(room.entities).length > 0) {
        const entityUpdates: any[] = [];
        for (const entity of Object.values(room.entities)) {
          let targetPlayer: any = null;
          
          if (entity.type === 'PLAYER_BOT' && entity.targetId && room.players[entity.targetId]) {
            targetPlayer = room.players[entity.targetId];
          } else {
            let minD = Infinity;
            for (const p of Object.values(room.players)) {
              const d = Math.sqrt((p.x - entity.x)**2 + (p.y - entity.y)**2 + (p.z - entity.z)**2);
              if (d < minD) {
                minD = d;
                targetPlayer = p;
              }
            }
          }

          if (targetPlayer) {
            // Only update targetId if it's not a PLAYER_BOT with a specific target
            if (entity.type !== 'PLAYER_BOT' || !entity.targetId) {
              entity.targetId = targetPlayer.id;
            }
            
            const dx = targetPlayer.x - entity.x;
            const dy = targetPlayer.y - entity.y;
            const dz = targetPlayer.z - entity.z;
            const dist = Math.sqrt(dx*dx + dy*dy + dz*dz);
            
            if (entity.type === 'LIGHTBULB') {
              if (dist < 5) {
                io.to(roomId).emit('explosion', { x: entity.x, y: entity.y, z: entity.z, radius: 10 });
                for (const p of Object.values(room.players)) {
                  const pd = Math.sqrt((p.x - entity.x)**2 + (p.y - entity.y)**2 + (p.z - entity.z)**2);
                  if (pd < 10) {
                    const damage = room.difficulty === 'easy' ? 40 : room.difficulty === 'normal' ? 80 : room.difficulty === 'hard' ? 120 : 160;
                    applyDamage(roomId, p.id, 'entity', damage);
                  }
                }
                delete room.entities[entity.id];
                io.to(roomId).emit('entityDestroyed', entity.id);
                continue;
              } else {
                const speed = room.difficulty === 'easy' ? 10 : room.difficulty === 'normal' ? 15 : room.difficulty === 'hard' ? 20 : 25;
                entity.x += (dx / dist) * speed * 0.033;
                entity.y += (dy / dist) * speed * 0.033;
                entity.z += (dz / dist) * speed * 0.033;
              }
            } else if (entity.type === 'DRONE') {
              if (dist > 20) {
                const speed = room.difficulty === 'easy' ? 6 : room.difficulty === 'normal' ? 10 : room.difficulty === 'hard' ? 15 : 20;
                entity.x += (dx / dist) * speed * 0.033;
                entity.y += (dy / dist) * speed * 0.033;
                entity.z += (dz / dist) * speed * 0.033;
              }
              
              const attackCooldown = room.difficulty === 'easy' ? 4000 : room.difficulty === 'normal' ? 2500 : room.difficulty === 'hard' ? 1500 : 800;
              if (dist < 40 && now - entity.lastAttack > attackCooldown) {
                if (!entity.isPreparingAttack) {
                  entity.isPreparingAttack = true;
                  entity.attackStartTime = now;
                  entity.attackTarget = [targetPlayer.x, targetPlayer.y, targetPlayer.z];
                  // Show warning laser
                  io.to(roomId).emit('laserFired', { id: Math.random().toString(36).substring(7), from: [entity.x, entity.y, entity.z], to: entity.attackTarget, color: '#ff000055' });
                } else if (now - entity.attackStartTime > 500) {
                  // Fire real laser
                  entity.isPreparingAttack = false;
                  entity.lastAttack = now;
                  const to = entity.attackTarget;
                  io.to(roomId).emit('laserFired', { id: Math.random().toString(36).substring(7), from: [entity.x, entity.y, entity.z], to, color: '#ff0000' });
                  
                  // Check hit against all players
                  for (const targetId in room.players) {
                    if (checkHit(room.players[targetId], [entity.x, entity.y, entity.z], to)) {
                      const damage = room.difficulty === 'easy' ? 20 : room.difficulty === 'normal' ? 40 : room.difficulty === 'hard' ? 60 : 80;
                      applyDamage(roomId, targetId, 'entity', damage);
                    }
                  }
                }
              } else {
                entity.isPreparingAttack = false;
              }
            } else if (entity.type === 'MECH') {
              // Ground-based movement - Melee
              if (dist > 2.5) {
                const speed = room.difficulty === 'easy' ? 8 : room.difficulty === 'normal' ? 14 : room.difficulty === 'hard' ? 20 : 26;
                // Only move in XZ plane
                const distXZ = Math.sqrt(dx*dx + dz*dz);
                if (distXZ > 0) {
                  entity.x += (dx / distXZ) * speed * 0.033;
                  entity.z += (dz / distXZ) * speed * 0.033;
                }
                const terrainY = getTerrainHeight(entity.x, entity.z);
                const blockY = getHighestBlockY(room.volume, entity.x, entity.z);
                entity.y = Math.max(terrainY, blockY) + 0.4; // Keep on ground
              }
              
              const attackCooldown = room.difficulty === 'easy' ? 2500 : room.difficulty === 'normal' ? 1500 : room.difficulty === 'hard' ? 800 : 500;
              if (dist < 4 && now - entity.lastAttack > attackCooldown) {
                if (!entity.isPreparingAttack) {
                  entity.isPreparingAttack = true;
                  entity.attackStartTime = now;
                } else if (now - entity.attackStartTime > 400) {
                  entity.isPreparingAttack = false;
                  entity.lastAttack = now;
                  
                  if (targetPlayer) {
                    const currentDist = Math.sqrt((targetPlayer.x - entity.x)**2 + (targetPlayer.y - entity.y)**2 + (targetPlayer.z - entity.z)**2);
                    if (currentDist < 5) {
                      const damage = room.difficulty === 'easy' ? 25 : room.difficulty === 'normal' ? 45 : room.difficulty === 'hard' ? 75 : 100;
                      applyDamage(roomId, targetPlayer.id, 'entity', damage);
                    }
                  }
                }
              } else {
                entity.isPreparingAttack = false;
              }
            } else if (entity.type === 'LAVABOT') {
              if (dist > 30) {
                const speed = room.difficulty === 'easy' ? 4 : room.difficulty === 'normal' ? 8 : room.difficulty === 'hard' ? 12 : 16;
                entity.x += (dx / dist) * speed * 0.033;
                entity.y += (dy / dist) * speed * 0.033;
                entity.z += (dz / dist) * speed * 0.033;
              }
              
              const attackCooldown = room.difficulty === 'easy' ? 6000 : room.difficulty === 'normal' ? 4000 : room.difficulty === 'hard' ? 2500 : 1500;
              if (dist < 50 && now - entity.lastAttack > attackCooldown) {
                if (!entity.isPreparingAttack) {
                  entity.isPreparingAttack = true;
                  entity.attackStartTime = now;
                } else if (now - entity.attackStartTime > 1000) {
                  entity.isPreparingAttack = false;
                  entity.lastAttack = now;
                  
                  if (targetPlayer) {
                    const targets = [{ x: targetPlayer.x, z: targetPlayer.z }];
                    room.activeEvent = { type: 'lava', endTime: now + 5000, targets };
                    io.to(roomId).emit('specialEvent', { type: 'lava', duration: 5000, startTime: now, targets });
                  }
                }
              } else {
                entity.isPreparingAttack = false;
              }
            } else if (entity.type === 'SNIPER') {
              if (dist < 60) {
                const speed = room.difficulty === 'easy' ? 4 : room.difficulty === 'normal' ? 8 : room.difficulty === 'hard' ? 12 : 16;
                entity.x -= (dx / dist) * speed * 0.033;
                entity.y += (dy / dist) * speed * 0.033;
                entity.z -= (dz / dist) * speed * 0.033;
              } else if (dist > 80) {
                const speed = room.difficulty === 'easy' ? 4 : room.difficulty === 'normal' ? 8 : room.difficulty === 'hard' ? 12 : 16;
                entity.x += (dx / dist) * speed * 0.033;
                entity.y += (dy / dist) * speed * 0.033;
                entity.z += (dz / dist) * speed * 0.033;
              }
              
              const attackCooldown = room.difficulty === 'easy' ? 5000 : room.difficulty === 'normal' ? 3500 : room.difficulty === 'hard' ? 2000 : 1000;
              if (dist < 100 && now - entity.lastAttack > attackCooldown) {
                if (!entity.isPreparingAttack) {
                  entity.isPreparingAttack = true;
                  entity.attackStartTime = now;
                  entity.attackTarget = [targetPlayer.x, targetPlayer.y, targetPlayer.z];
                  io.to(roomId).emit('laserFired', { id: Math.random().toString(36).substring(7), from: [entity.x, entity.y, entity.z], to: entity.attackTarget, color: '#ff00ff55' });
                } else if (now - entity.attackStartTime > 1500) {
                  entity.isPreparingAttack = false;
                  entity.lastAttack = now;
                  const to = entity.attackTarget;
                  io.to(roomId).emit('laserFired', { id: Math.random().toString(36).substring(7), from: [entity.x, entity.y, entity.z], to, color: '#ff00ff' });
                  
                  for (const targetId in room.players) {
                    if (checkHit(room.players[targetId], [entity.x, entity.y, entity.z], to)) {
                      const damage = room.difficulty === 'easy' ? 50 : room.difficulty === 'normal' ? 80 : room.difficulty === 'hard' ? 120 : 180;
                      applyDamage(roomId, targetId, 'entity', damage);
                    }
                  }
                }
              } else {
                entity.isPreparingAttack = false;
              }
            } else if (entity.type === 'TANK') {
              if (dist > 3) {
                const speed = room.difficulty === 'easy' ? 4 : room.difficulty === 'normal' ? 6 : room.difficulty === 'hard' ? 10 : 14;
                const distXZ = Math.sqrt(dx*dx + dz*dz);
                if (distXZ > 0) {
                  entity.x += (dx / distXZ) * speed * 0.033;
                  entity.z += (dz / distXZ) * speed * 0.033;
                }
                const terrainY = getTerrainHeight(entity.x, entity.z);
                const blockY = getHighestBlockY(room.volume, entity.x, entity.z);
                entity.y = Math.max(terrainY, blockY) + 0.4;
              }
              
              const attackCooldown = room.difficulty === 'easy' ? 3000 : room.difficulty === 'normal' ? 2000 : room.difficulty === 'hard' ? 1200 : 800;
              if (dist < 5 && now - entity.lastAttack > attackCooldown) {
                if (!entity.isPreparingAttack) {
                  entity.isPreparingAttack = true;
                  entity.attackStartTime = now;
                } else if (now - entity.attackStartTime > 600) {
                  entity.isPreparingAttack = false;
                  entity.lastAttack = now;
                  
                  if (targetPlayer) {
                    const currentDist = Math.sqrt((targetPlayer.x - entity.x)**2 + (targetPlayer.y - entity.y)**2 + (targetPlayer.z - entity.z)**2);
                    if (currentDist < 6) {
                      const damage = room.difficulty === 'easy' ? 40 : room.difficulty === 'normal' ? 70 : room.difficulty === 'hard' ? 100 : 150;
                      applyDamage(roomId, targetPlayer.id, 'entity', damage);
                    }
                  }
                }
              } else {
                entity.isPreparingAttack = false;
              }
            } else if (entity.type === 'SWARMER') {
              if (dist < 3) {
                io.to(roomId).emit('explosion', { x: entity.x, y: entity.y, z: entity.z, radius: 5 });
                for (const p of Object.values(room.players)) {
                  const pd = Math.sqrt((p.x - entity.x)**2 + (p.y - entity.y)**2 + (p.z - entity.z)**2);
                  if (pd < 5) {
                    const damage = room.difficulty === 'easy' ? 20 : room.difficulty === 'normal' ? 40 : room.difficulty === 'hard' ? 60 : 80;
                    applyDamage(roomId, p.id, 'entity', damage);
                  }
                }
                delete room.entities[entity.id];
                io.to(roomId).emit('entityDestroyed', entity.id);
                continue;
              } else {
                const speed = room.difficulty === 'easy' ? 15 : room.difficulty === 'normal' ? 25 : room.difficulty === 'hard' ? 35 : 45;
                entity.x += (dx / dist) * speed * 0.033;
                entity.y += (dy / dist) * speed * 0.033;
                entity.z += (dz / dist) * speed * 0.033;
              }
            } else if (entity.type === 'HEALER') {
              let healTarget: any = null;
              let minBotDist = Infinity;
              for (const other of Object.values(room.entities)) {
                if (other.id !== entity.id && other.type !== 'BOSS') {
                  const maxH = other.type === 'LIGHTBULB' ? 50 : other.type === 'DRONE' ? 100 : other.type === 'MECH' ? 200 : other.type === 'TANK' ? 500 : 100;
                  if (other.health < maxH) {
                    const bd = Math.sqrt((other.x - entity.x)**2 + (other.y - entity.y)**2 + (other.z - entity.z)**2);
                    if (bd < minBotDist) {
                      minBotDist = bd;
                      healTarget = other;
                    }
                  }
                }
              }

              if (healTarget) {
                const hdx = healTarget.x - entity.x;
                const hdy = healTarget.y - entity.y;
                const hdz = healTarget.z - entity.z;
                if (minBotDist > 15) {
                  const speed = room.difficulty === 'easy' ? 6 : room.difficulty === 'normal' ? 10 : room.difficulty === 'hard' ? 15 : 20;
                  entity.x += (hdx / minBotDist) * speed * 0.033;
                  entity.y += (hdy / minBotDist) * speed * 0.033;
                  entity.z += (hdz / minBotDist) * speed * 0.033;
                }

                const healCooldown = room.difficulty === 'easy' ? 3000 : room.difficulty === 'normal' ? 2000 : room.difficulty === 'hard' ? 1000 : 500;
                if (minBotDist < 20 && now - entity.lastAttack > healCooldown) {
                  entity.lastAttack = now;
                  const healAmount = room.difficulty === 'easy' ? 20 : room.difficulty === 'normal' ? 40 : room.difficulty === 'hard' ? 60 : 80;
                  healTarget.health += healAmount;
                  io.to(roomId).emit('laserFired', { id: Math.random().toString(36).substring(7), from: [entity.x, entity.y, entity.z], to: [healTarget.x, healTarget.y, healTarget.z], color: '#00ff00' });
                }
              } else {
                if (dist > 30) {
                  const speed = room.difficulty === 'easy' ? 4 : room.difficulty === 'normal' ? 6 : room.difficulty === 'hard' ? 10 : 15;
                  entity.x += (dx / dist) * speed * 0.033;
                  entity.y += (dy / dist) * speed * 0.033;
                  entity.z += (dz / dist) * speed * 0.033;
                }
              }
            } else if (entity.type === 'PLAYER_BOT') {
              if (!entity.stayStill) {
                const speed = entity.speed || 15;
                if (dist > 5) {
                  entity.x += (dx / dist) * speed * 0.033;
                  entity.z += (dz / dist) * speed * 0.033;
                  const terrainY = getTerrainHeight(entity.x, entity.z);
                  const blockY = getHighestBlockY(room.volume, entity.x, entity.z);
                  entity.y = Math.max(terrainY, blockY) + 0.4;
                }
              }

              const attackCooldown = 1000;
              if (dist < 40 && now - entity.lastAttack > attackCooldown) {
                if (!entity.isPreparingAttack) {
                  entity.isPreparingAttack = true;
                  entity.attackStartTime = now;
                  entity.attackTarget = [targetPlayer.x, targetPlayer.y, targetPlayer.z];
                  io.to(roomId).emit('laserFired', { id: Math.random().toString(36).substring(7), from: [entity.x, entity.y + 0.5, entity.z], to: entity.attackTarget, color: '#00ffff55' });
                } else if (now - entity.attackStartTime > 300) {
                  entity.isPreparingAttack = false;
                  entity.lastAttack = now;
                  const to = entity.attackTarget;
                  io.to(roomId).emit('laserFired', { id: Math.random().toString(36).substring(7), from: [entity.x, entity.y + 0.5, entity.z], to, color: '#00ffff' });
                  
                  for (const targetId in room.players) {
                    if (checkHit(room.players[targetId], [entity.x, entity.y + 0.5, entity.z], to)) {
                      const damage = entity.damage || 20;
                      applyDamage(roomId, targetId, 'entity', damage);
                    }
                  }
                }
              } else {
                entity.isPreparingAttack = false;
              }
            } else if (entity.type === 'BOSS') {
              if (entity.invulnerableUntil && now < entity.invulnerableUntil) {
                entity.y += Math.sin(now * 0.005) * 0.5;
                entityUpdates.push({ id: entity.id, x: entity.x, y: entity.y, z: entity.z, isPreparingAttack: false, invulnerable: true });
                continue;
              }

              if (dist > 20) {
                const speed = 15;
                entity.x += (dx / dist) * speed * 0.033;
                entity.z += (dz / dist) * speed * 0.033;
                const terrainY = getTerrainHeight(entity.x, entity.z);
                const blockY = getHighestBlockY(room.volume, entity.x, entity.z);
                entity.y = Math.max(terrainY, blockY) + 15; // Hover
              }

              const attackCooldown = 2500;
              if (now - entity.lastAttack > attackCooldown) {
                if (!entity.isPreparingAttack) {
                  entity.isPreparingAttack = true;
                  entity.attackStartTime = now;
                  entity.attackTarget = [targetPlayer.x, targetPlayer.y, targetPlayer.z];
                  // Cycle through attack types
                  const attacks = ['SPREAD', 'BARRAGE', 'SHOCKWAVE', 'SUMMON'];
                  entity.attackType = attacks[Math.floor(Math.random() * attacks.length)];
                  io.to(roomId).emit('chatMessage', { sender: 'BOSS', text: `PREPARING ${entity.attackType}...`, color: '#ff00ff' });
                } else if (now - entity.attackStartTime > 1500) {
                  entity.isPreparingAttack = false;
                  entity.lastAttack = now;
                  
                  if (entity.attackType === 'SPREAD') {
                    for (let i = -1; i <= 1; i++) {
                      const angleOffset = i * 0.2;
                      const cosA = Math.cos(angleOffset);
                      const sinA = Math.sin(angleOffset);
                      
                      const targetX = entity.x + (entity.attackTarget[0] - entity.x) * cosA - (entity.attackTarget[2] - entity.z) * sinA;
                      const targetZ = entity.z + (entity.attackTarget[0] - entity.x) * sinA + (entity.attackTarget[2] - entity.z) * cosA;
                      const to = [targetX, entity.attackTarget[1], targetZ];
                      
                      io.to(roomId).emit('laserFired', { id: Math.random().toString(36).substring(7), from: [entity.x, entity.y, entity.z], to, color: '#ff00ff' });
                      
                      for (const targetId in room.players) {
                        if (checkHit(room.players[targetId], [entity.x, entity.y, entity.z], to)) {
                          applyDamage(roomId, targetId, 'entity', 50);
                        }
                      }
                    }
                  } else if (entity.attackType === 'BARRAGE') {
                    // Fast sequence of shots
                    for (let i = 0; i < 8; i++) {
                      setTimeout(() => {
                        if (!room.entities[entity.id]) return;
                        const p = Object.values(room.players)[Math.floor(Math.random() * Object.values(room.players).length)];
                        if (!p) return;
                        const to = [p.x, p.y, p.z];
                        io.to(roomId).emit('laserFired', { id: Math.random().toString(36).substring(7), from: [entity.x, entity.y, entity.z], to, color: '#ff0000' });
                        if (checkHit(p, [entity.x, entity.y, entity.z], to)) {
                          applyDamage(roomId, p.id, 'entity', 30);
                        }
                      }, i * 150);
                    }
                  } else if (entity.attackType === 'SHOCKWAVE') {
                    io.to(roomId).emit('shockwave', { x: entity.x, y: entity.y, z: entity.z, radius: 30 });
                    for (const p of Object.values(room.players)) {
                      const d = Math.sqrt((p.x - entity.x)**2 + (p.y - entity.y)**2 + (p.z - entity.z)**2);
                      if (d < 30) {
                        applyDamage(roomId, p.id, 'entity', 80);
                      }
                    }
                  } else if (entity.attackType === 'SUMMON') {
                    spawnBossMinions(room, roomId, 3);
                  }
                }
              } else {
                entity.isPreparingAttack = false;
              }
            }
            entityUpdates.push({ id: entity.id, x: entity.x, y: entity.y, z: entity.z, isPreparingAttack: entity.isPreparingAttack, invulnerable: entity.invulnerableUntil && now < entity.invulnerableUntil });
          }
        }
        if (entityUpdates.length > 0) {
          io.to(roomId).volatile.emit('entitiesMoved', entityUpdates);
        }
      }
    }
  }, 33);

  function applyDamage(roomId: string, targetId: string, shooterId: string, amount: number) {
    const room = rooms[roomId];
    if (!room || room.state === 'lobby') return;
    const target = room.players[targetId];
    const shooter = room.players[shooterId];
    if (!target || target.infiniteHealth) return;
    
    // Apply shooter's damage multiplier if they are a player
    let actualAmount = amount;
    if (shooter && shooter.damageMultiplier !== undefined) {
      actualAmount = Math.floor(amount * shooter.damageMultiplier);
    }
    
    // Prevent friendly fire in team mode
    if ((room.mode === 'team' || (room.mode === 'custom' && room.customConfig?.teams)) && room.teams[targetId] === room.teams[shooterId] && targetId !== shooterId) {
      return;
    }
    
    const isCritical = Math.random() < 0.3;
    const finalDamage = isCritical ? Math.floor(actualAmount * 1.5) : actualAmount;
    
    target.health -= finalDamage;
    target.lastAttacker = shooterId;
    
    io.to(roomId).emit('damageNumber', { id: targetId, amount: finalDamage, isCritical, type: 'player' });
    
    if (target.health <= 0) {
      if (room.mode === 'team' || (room.mode === 'custom' && room.customConfig?.teams)) {
        target.lives -= 1;
        if (target.lives <= 0) {
          // Player is eliminated
          target.health = 0;
          target.bleedingTicks = 0;
          io.to(roomId).emit('playerEliminated', targetId);
          
          // Check if game is over
          const remainingTeams = new Set();
          for (const pId in room.players) {
            if (room.players[pId].lives > 0) {
              remainingTeams.add(room.teams[pId]);
            }
          }
          if (remainingTeams.size <= 1) {
            // Game over
            const winningTeam = remainingTeams.size === 1 ? Array.from(remainingTeams)[0] as string : null;
            awardPointsToTeam(room, winningTeam);
            io.to(roomId).emit('gameOver', { winningTeam });
            setTimeout(() => {
              room.state = 'lobby';
              room.teams = {};
              room.votesToStart.clear();
              for (const pId in room.players) {
                room.players[pId].health = room.mode === 'custom' && room.customConfig ? room.customConfig.health : 500;
                room.players[pId].lives = 1;
                room.players[pId].score = 0;
              }
              io.to(roomId).emit('gameStateChanged', { state: 'lobby', players: room.players });
              io.to(roomId).emit('teamsUpdated', room.teams);
              io.to(roomId).emit('votesUpdated', []);
            }, 5000);
          }
        } else {
          // Wait for respawn (with 1 less life)
          target.health = 0;
          target.bleedingTicks = 0;
          io.to(roomId).emit('playerHit', { id: targetId, health: 0, bleedingTicks: 0 });
        }
      } else {
        if (shooter) shooter.score += 1;
        target.health = 0;
        target.bleedingTicks = 0;
        io.to(roomId).emit('playerHit', { id: targetId, health: 0, bleedingTicks: 0 });
        if (shooter) {
          io.to(roomId).emit('scoreUpdated', { id: shooterId, score: shooter.score });
          if (shooter.score % 5 === 0) {
            room.currentMapIndex = (room.currentMapIndex + 1) % TOTAL_MAPS;
            room.seed = Math.floor(Math.random() * 1000000);
            room.volume = generateVolume(room.seed);
            io.to(roomId).emit('mapChanged', { mapIndex: room.currentMapIndex, seed: room.seed });
          }
        }
      }
    } else {
      io.to(roomId).emit('playerHit', { id: targetId, health: target.health, bleedingTicks: target.bleedingTicks });
    }
  }

  function applyDamageToEntity(roomId: string, entityId: string, shooterId: string, amount: number) {
    const room = rooms[roomId];
    if (!room || room.state === 'lobby') return;
    const entity = room.entities[entityId];
    if (!entity) return;

    if (entity.invulnerableUntil && Date.now() < entity.invulnerableUntil) {
      return;
    }

    const shooter = room.players[shooterId];
    let actualAmount = amount;
    if (shooter && shooter.damageMultiplier !== undefined) {
      actualAmount = Math.floor(amount * shooter.damageMultiplier);
    }

    const isCritical = Math.random() < 0.3;
    const finalDamage = isCritical ? Math.floor(actualAmount * 1.5) : actualAmount;

    entity.health -= finalDamage;
    
    io.to(roomId).emit('damageNumber', { id: entityId, amount: finalDamage, isCritical, type: 'entity' });
    
    if (entity.health <= 0) {
      if (entity.type === 'BOSS') {
        room.bossActive = false;
        room.bossId = null;
        room.bossDefeated = true;
        io.to(roomId).emit('chatMessage', { sender: 'SYSTEM', text: 'BOSS DEFEATED! YOU WIN!', color: '#00ff00' });
        io.to(roomId).emit('bossDefeated');
      }
      delete room.entities[entityId];
      io.to(roomId).emit('entityDestroyed', entityId);
      if (room.players[shooterId]) {
        room.players[shooterId].score += 1;
        io.to(roomId).emit('scoreUpdated', { id: shooterId, score: room.players[shooterId].score });
      }
    } else {
      io.to(roomId).emit('entityHit', { id: entityId, health: entity.health });
    }
  }

  io.on('connection', (socket) => {
    console.log('Player connected:', socket.id);
    const nickname = socket.handshake.query.nickname || 'Player';
    const isAdmin = socket.handshake.query.isAdmin === 'true';
    const mode = (socket.handshake.query.gameMode as 'pvp' | 'pve' | 'team' | 'speed' | 'custom') || 'pvp';
    const difficulty = (socket.handshake.query.difficulty as 'easy' | 'normal' | 'hard' | 'nightmare') || 'normal';
    const roomId = mode === 'pve' ? `pve-${difficulty}` : mode === 'team' ? 'team' : mode === 'speed' ? 'speed' : mode === 'custom' ? 'custom' : 'pvp';
    
    // If custom room doesn't exist but requested, fallback to pvp
    if (mode === 'custom' && !rooms['custom']) {
      socket.emit('chatMessage', { sender: 'SYSTEM', text: 'Custom game not found. Falling back to PvP.', color: '#ff0000' });
      socket.disconnect();
      return;
    }

    socket.join(roomId);
    socket.data.roomId = roomId;
    const room = rooms[roomId];

    const spread = mode === 'pve' ? 350 : 2000;

    const spawnX = (Math.random() - 0.5) * spread;
    const spawnZ = (Math.random() - 0.5) * spread;
    const terrainY = mode === 'pve' ? 0 : getTerrainHeight(spawnX, spawnZ);
    const blockY = getHighestBlockY(room.volume, spawnX, spawnZ);

    // Initialize player
    const isLateJoiner = (mode === 'team' || mode === 'custom') && room.state === 'playing';
    
    let spawnHealth = mode === 'speed' ? 125 : 500;
    let spawnWeapon = 'DEFAULT';
    
    if (mode === 'custom' && room.customConfig) {
      spawnHealth = room.customConfig.health;
      spawnWeapon = room.customConfig.spawnWeapon;
    }

    room.players[socket.id] = {
      id: socket.id,
      nickname,
      isAdmin,
      x: spawnX,
      y: Math.max(terrainY, blockY) + 20, // Spawn slightly above highest point to prevent phasing
      z: spawnZ,
      rx: 0,
      ry: 0,
      rz: 0,
      color: ['#00ffff', '#ff00ff', '#ffff00', '#00ff00'][Math.floor(Math.random() * 4)],
      score: 0,
      health: isLateJoiner ? 0 : spawnHealth,
      weapon: spawnWeapon,
      bleedingTicks: 0,
      lastAttacker: null,
      lives: isLateJoiner ? 0 : 1,
      damageMultiplier: 1
    };

    // Send current state to new player
    socket.emit('init', { 
      players: room.players, 
      weapons: room.weapons, 
      medkits: room.medkits, 
      id: socket.id, 
      mapIndex: room.currentMapIndex, 
      entities: room.entities, 
      seed: room.seed,
      boss: room.bossActive && room.bossId ? room.entities[room.bossId] : null,
      state: room.state,
      teams: room.teams,
      votesToStart: Array.from(room.votesToStart),
      activeEvent: room.activeEvent ? { type: room.activeEvent.type, duration: room.activeEvent.endTime - Date.now(), startTime: room.activeEvent.endTime - 30000, targets: room.activeEvent.targets } : null,
      eventsEnabled: room.eventsEnabled,
      customConfig: room.customConfig,
      wave: room.wave,
      waveState: room.waveState
    });

    // Broadcast new player to others
    socket.to(roomId).emit('playerJoined', room.players[socket.id]);

    socket.on('joinTeam', (teamId) => {
      const rId = socket.data.roomId;
      const r = rooms[rId];
      if (r && (r.mode === 'team' || (r.mode === 'custom' && r.customConfig?.teams)) && r.state === 'lobby') {
        // Check if team is full
        const maxTeamSize = r.mode === 'custom' ? (r.customConfig?.teamSize || 2) : 2;
        const teamCount = Object.values(r.teams).filter(t => t === teamId).length;
        if (teamCount < maxTeamSize) {
          r.teams[socket.id] = teamId;
          if (r.votesToStart.has(socket.id)) {
            r.votesToStart.delete(socket.id);
            io.to(rId).emit('votesUpdated', Array.from(r.votesToStart));
          }
          io.to(rId).emit('teamsUpdated', r.teams);
        }
      }
    });

    socket.on('voteStart', () => {
      const rId = socket.data.roomId;
      const r = rooms[rId];
      if (r && (r.mode === 'team' || r.mode === 'custom') && r.state === 'lobby') {
        r.votesToStart.add(socket.id);
        io.to(rId).emit('votesUpdated', Array.from(r.votesToStart));
        
        // Check if all players have voted and there are at least 2 players (or 1 for custom)
        const numPlayers = Object.keys(r.players).length;
        const minPlayers = r.mode === 'custom' ? 1 : 2;
        if (numPlayers >= minPlayers && r.votesToStart.size === numPlayers) {
          r.state = 'playing';
          // Assign 2 lives to single players in team mode
          if (r.mode === 'team' || (r.mode === 'custom' && r.customConfig?.teams)) {
            const teamCounts: Record<string, number> = {};
            for (const t of Object.values(r.teams)) {
              teamCounts[t] = (teamCounts[t] || 0) + 1;
            }
            for (const pid in r.players) {
              const tId = r.teams[pid];
              if (!tId || teamCounts[tId] === 1) {
                r.players[pid].lives = 2;
              } else {
                r.players[pid].lives = 1;
              }
            }
          } else if (r.mode === 'custom') {
            for (const pid in r.players) {
              r.players[pid].lives = 1;
            }
          }
          
          const spread = (r.mode as string) === 'pve' ? 350 : 2000;
          for (const pid in r.players) {
            const spawnX = (Math.random() - 0.5) * spread;
            const spawnZ = (Math.random() - 0.5) * spread;
            const terrainY = (r.mode as string) === 'pve' ? 0 : getTerrainHeight(spawnX, spawnZ);
            const blockY = getHighestBlockY(r.volume, spawnX, spawnZ);
            r.players[pid].x = spawnX;
            r.players[pid].y = Math.max(terrainY, blockY) + 20;
            r.players[pid].z = spawnZ;
            
            let spawnHealth = 500;
            if (r.mode === 'custom' && r.customConfig) {
              spawnHealth = r.customConfig.health;
            }
            r.players[pid].health = spawnHealth;
          }
          
          io.to(rId).emit('gameStarted', r.players);
          
          // Reset weapons and medkits
          r.weapons = {};
          r.medkits = {};
          for (let i = 0; i < 15; i++) {
            const x = (Math.random() - 0.5) * spread;
            const z = (Math.random() - 0.5) * spread;
            const terrainY = (r.mode as string) === 'pve' ? 0 : getTerrainHeight(x, z);
            const blockY = getHighestBlockY(r.volume, x, z);
            const y = Math.max(terrainY, blockY) + 1;
            r.weapons[Math.random().toString(36).substring(7)] = { x, y, z, type: ['SHOTGUN', 'RPG', 'REVOLVER', 'KNIFE'][Math.floor(Math.random() * 4)] };
          }
          for (let i = 0; i < 10; i++) {
            const x = (Math.random() - 0.5) * spread;
            const z = (Math.random() - 0.5) * spread;
            const terrainY = (r.mode as string) === 'pve' ? 0 : getTerrainHeight(x, z);
            const blockY = getHighestBlockY(r.volume, x, z);
            const y = Math.max(terrainY, blockY) + 1;
            r.medkits[Math.random().toString(36).substring(7)] = { x, y, z };
          }
          
          io.to(rId).emit('gameStateChanged', { state: 'playing', players: r.players });
          io.to(rId).emit('weaponsUpdate', r.weapons);
          io.to(rId).emit('medkitsUpdate', r.medkits);
          
          // Force clients to update their local positions
          for (const pId in r.players) {
            io.to(rId).emit('playerRespawned', r.players[pId]);
          }
        }
      }
    });

    socket.on('setAdminState', (state) => {
      const rId = socket.data.roomId;
      const r = rooms[rId];
      if (r.players[socket.id] && r.players[socket.id].isAdmin) {
        if (state.infiniteHealth !== undefined) {
          r.players[socket.id].infiniteHealth = state.infiniteHealth;
        }
      }
    });

    socket.on('move', (data) => {
      const rId = socket.data.roomId;
      const r = rooms[rId];
      if (r.players[socket.id] && r.players[socket.id].health > 0) {
        r.players[socket.id].x = data.x;
        r.players[socket.id].y = data.y;
        r.players[socket.id].z = data.z;
        r.players[socket.id].rx = data.rx;
        r.players[socket.id].ry = data.ry;
        r.players[socket.id].rz = data.rz;
        r.players[socket.id].updated = true; // Mark as updated for batching
      }
    });

    socket.on('pickupWeapon', (weaponId) => {
      const rId = socket.data.roomId;
      const r = rooms[rId];
      const w = r.weapons[weaponId];
      const p = r.players[socket.id];
      if (w && w.active && p && p.health > 0) {
        const dist = Math.sqrt((p.x - w.x)**2 + (p.y - w.y)**2 + (p.z - w.z)**2);
        if (dist < 5) {
          w.active = false;
          w.respawnTime = Date.now() + 30000; // 30 seconds respawn
          p.weapon = w.type;
          io.to(rId).emit('weaponsUpdate', r.weapons);
          socket.emit('weaponPickedUp', w.type);
          io.to(rId).emit('playerWeaponChanged', { id: p.id, weapon: w.type });
        }
      }
    });

    socket.on('pickupMedkit', (medkitId) => {
      const rId = socket.data.roomId;
      const r = rooms[rId];
      const m = r.medkits[medkitId];
      const p = r.players[socket.id];
      if (m && m.active && p && p.health > 0) {
        const dist = Math.sqrt((p.x - m.x)**2 + (p.y - m.y)**2 + (p.z - m.z)**2);
        if (dist < 5) {
          m.active = false;
          m.respawnTime = Date.now() + 45000; // 45 seconds respawn
          const maxHealth = r.mode === 'custom' && r.customConfig ? r.customConfig.health : (r.mode === 'speed' ? 125 : 500);
          p.health = Math.min(maxHealth, p.health + 250);
          p.bleedingTicks = 0;
          io.to(rId).emit('medkitsUpdate', r.medkits);
          io.to(rId).emit('playerHit', { id: p.id, health: p.health, bleedingTicks: p.bleedingTicks });
          socket.emit('medkitPickedUp');
        }
      }
    });

    socket.on('adminGiveWeapon', (weaponType, targetId) => {
      const rId = socket.data.roomId;
      const r = rooms[rId];
      const p = r.players[socket.id];
      if (!p || !p.isAdmin) return;
      
      const target = targetId ? r.players[targetId] : p;
      if (target && target.health > 0) {
        target.weapon = weaponType;
        io.to(target.id).emit('weaponPickedUp', weaponType);
        io.to(rId).emit('playerWeaponChanged', { id: target.id, weapon: weaponType });
      }
    });

    socket.on('adminSpawnBot', (type, targetId, health, options) => {
      const rId = socket.data.roomId;
      const r = rooms[rId];
      const p = r.players[socket.id];
      if (!p || !p.isAdmin) return;

      const spawnBotForTarget = (tId: string) => {
        const targetPlayer = r.players[tId];
        if (!targetPlayer) return;

        const id = Math.random().toString(36).substring(7);
        const angle = Math.random() * Math.PI * 2;
        const dist = 40 + Math.random() * 20;
        const x = targetPlayer.x + Math.cos(angle) * dist;
        const z = targetPlayer.z + Math.sin(angle) * dist;
        const terrainY = getTerrainHeight(x, z);
        const blockY = getHighestBlockY(r.volume, x, z);
        
        let y = Math.max(terrainY, blockY) + 40;
        let defaultHealth = 200;
        
        if (type === 'LIGHTBULB') { y = Math.max(terrainY, blockY) + 60; defaultHealth = 50; }
        else if (type === 'DRONE') { y = Math.max(terrainY, blockY) + 60; defaultHealth = 100; }
        else if (type === 'MECH') { y = Math.max(terrainY, blockY) + 0.4; defaultHealth = 200; }
        else if (type === 'LAVABOT') { y = Math.max(terrainY, blockY) + 20; defaultHealth = 150; }
        else if (type === 'SNIPER') { y = Math.max(terrainY, blockY) + 0.4; defaultHealth = 80; }
        else if (type === 'TANK') { y = Math.max(terrainY, blockY) + 0.4; defaultHealth = 500; }
        else if (type === 'SWARMER') { y = Math.max(terrainY, blockY) + 10; defaultHealth = 30; }
        else if (type === 'HEALER') { y = Math.max(terrainY, blockY) + 30; defaultHealth = 120; }
        else if (type === 'BOSS') { y = Math.max(terrainY, blockY) + 10; defaultHealth = 10000; }
        else if (type === 'PLAYER_BOT') { y = Math.max(terrainY, blockY) + 0.4; defaultHealth = 100; }

        r.entities[id] = {
          id,
          type,
          x,
          y,
          z,
          health: health || defaultHealth,
          maxHealth: type === 'BOSS' ? (health || 10000) : undefined,
          targetId: tId,
          lastAttack: 0,
          isPreparingAttack: false,
          attackStartTime: 0,
          invulnerableUntil: 0,
          attackType: type === 'BOSS' ? 'SPREAD' : undefined,
          // Custom options for PLAYER_BOT
          speed: options?.speed,
          damage: options?.damage,
          stayStill: options?.stayStill
        };
        io.to(rId).emit('entitySpawned', r.entities[id]);
        if (type === 'BOSS') {
          r.bossActive = true;
          r.bossId = id;
          r.bossPhase = 1;
          r.bossDefeated = false;
          io.to(rId).emit('bossSpawned', r.entities[id]);
          io.to(rId).emit('chatMessage', { sender: 'SYSTEM', text: 'WARNING: ADMIN SPAWNED BOSS!', color: '#ff0000' });
        }
      };

      if (targetId === 'all') {
        for (const tId in r.players) {
          spawnBotForTarget(tId);
        }
      } else {
        spawnBotForTarget(targetId || socket.id);
      }
    });

    socket.on('adminRevivePlayer', (targetId) => {
      const rId = socket.data.roomId;
      const r = rooms[rId];
      const p = r.players[socket.id];
      if (!p || !p.isAdmin) return;

      const reviveTarget = (tId: string) => {
        const target = r.players[tId];
        if (target && target.health <= 0) {
          target.health = r.mode === 'custom' && r.customConfig ? r.customConfig.health : (r.mode === 'speed' ? 125 : 500);
          target.bleedingTicks = 0;
          if (target.lives !== undefined && target.lives <= 0) {
            target.lives = 1;
          }
          
          const spread = r.mode === 'pve' ? 350 : 2000;
          const spawnX = (Math.random() - 0.5) * spread;
          const spawnZ = (Math.random() - 0.5) * spread;
          const terrainY = getTerrainHeight(spawnX, spawnZ);
          const blockY = getHighestBlockY(r.volume, spawnX, spawnZ);
          target.x = spawnX;
          target.y = Math.max(terrainY, blockY) + 20;
          target.z = spawnZ;
          
          io.to(rId).emit('playerRespawned', target);
          io.to(rId).emit('chatMessage', { sender: 'SYSTEM', text: `${target.nickname} was revived by admin.`, color: '#00ff00' });
        }
      };

      if (targetId === 'all') {
        for (const tId in r.players) {
          reviveTarget(tId);
        }
      } else {
        reviveTarget(targetId);
      }
    });

    socket.on('adminTeleportPlayer', (targetId, destinationId) => {
      const rId = socket.data.roomId;
      const r = rooms[rId];
      const p = r.players[socket.id];
      if (!p || !p.isAdmin) return;
      
      const target = r.players[targetId];
      const dest = r.players[destinationId];
      if (target && dest) {
        io.to(target.id).emit('adminTeleport', { x: dest.x, y: dest.y, z: dest.z });
      }
    });

    socket.on('adminSetSpeed', (targetId, speed) => {
      const rId = socket.data.roomId;
      const r = rooms[rId];
      const p = r.players[socket.id];
      if (!p || !p.isAdmin) return;
      
      io.to(targetId).emit('adminSetSpeed', speed);
    });

    socket.on('adminSetDamageMultiplier', (targetId, multiplier) => {
      const rId = socket.data.roomId;
      const r = rooms[rId];
      const p = r.players[socket.id];
      if (!p || !p.isAdmin) return;
      
      if (targetId === 'all') {
        for (const tId in r.players) {
          r.players[tId].damageMultiplier = multiplier;
        }
      } else if (r.players[targetId]) {
        r.players[targetId].damageMultiplier = multiplier;
      }
    });

    socket.on('adminSetHealth', (targetId, health) => {
      const rId = socket.data.roomId;
      const r = rooms[rId];
      const p = r.players[socket.id];
      if (!p || !p.isAdmin) return;
      
      const target = r.players[targetId];
      if (target) {
        target.health = health;
        io.to(rId).emit('playerHit', { id: target.id, health: target.health, bleedingTicks: target.bleedingTicks || 0 });
      }
    });

    socket.on('shoot', (data) => {
      const rId = socket.data.roomId;
      const r = rooms[rId];
      const shooterId = socket.id;
      const shooter = r.players[shooterId];
      if (!shooter || shooter.health <= 0) return;

      const weapon = data.weapon || 'DEFAULT';

      if (weapon === 'RPG') {
        let explosionPoint = { x: data.to[0], y: data.to[1], z: data.to[2] };
        let minT = 1.0;

        const v = { x: data.from[0], y: data.from[1], z: data.from[2] };
        const w = { x: data.to[0], y: data.to[1], z: data.to[2] };
        const l2 = dist2(v, w);

        if (l2 > 0) {
          const checkIntersection = (target: any) => {
            if (checkHit(target, data.from, data.to)) {
              let t = ((target.x - v.x) * (w.x - v.x) + (target.y - v.y) * (w.y - v.y) + (target.z - v.z) * (w.z - v.z)) / l2;
              t = Math.max(0, Math.min(1, t));
              if (t < minT) minT = t;
            }
          };

          for (const targetId in r.players) {
            if (targetId === shooterId) continue;
            checkIntersection(r.players[targetId]);
          }
          for (const targetId in r.entities) {
            checkIntersection(r.entities[targetId]);
          }
        }
        
        if (minT < 1.0) {
          explosionPoint = {
            x: v.x + minT * (w.x - v.x),
            y: v.y + minT * (w.y - v.y),
            z: v.z + minT * (w.z - v.z)
          };
        }

        io.to(rId).emit('laserFired', { id: Math.random().toString(36).substring(7), from: data.from, to: [explosionPoint.x, explosionPoint.y, explosionPoint.z], color: '#ff8800', weapon });
        io.to(rId).emit('explosion', { x: explosionPoint.x, y: explosionPoint.y, z: explosionPoint.z, radius: 30 });

        for (const targetId in r.players) {
          if (targetId === shooterId) continue;
          const target = r.players[targetId];
          const dist = Math.sqrt((target.x - explosionPoint.x)**2 + (target.y - explosionPoint.y)**2 + (target.z - explosionPoint.z)**2);
          if (dist < 30) {
            const maxHealth = r.mode === 'custom' && r.customConfig ? r.customConfig.health : (r.mode === 'speed' ? 125 : 500);
            const damage = Math.floor((maxHealth / 2) * (1 - dist/30));
            applyDamage(rId, targetId, shooterId, damage);
            
            // Knockback
            const force = 12 * (1 - dist/30);
            const dirX = (target.x - explosionPoint.x) / (dist || 1);
            const dirY = (target.y - explosionPoint.y) / (dist || 1) + 0.5; // Upward bias
            const dirZ = (target.z - explosionPoint.z) / (dist || 1);
            io.to(targetId).emit('applyImpulse', { x: dirX * force, y: dirY * force, z: dirZ * force });
          }
        }
        
        // Also apply knockback to shooter if they are close
        const shooterDist = Math.sqrt((shooter.x - explosionPoint.x)**2 + (shooter.y - explosionPoint.y)**2 + (shooter.z - explosionPoint.z)**2);
        if (shooterDist < 30) {
            const force = 12 * (1 - shooterDist/30);
            const dirX = (shooter.x - explosionPoint.x) / (shooterDist || 1);
            const dirY = (shooter.y - explosionPoint.y) / (shooterDist || 1) + 0.5;
            const dirZ = (shooter.z - explosionPoint.z) / (shooterDist || 1);
            io.to(shooterId).emit('applyImpulse', { x: dirX * force, y: dirY * force, z: dirZ * force });
        }

        for (const targetId in r.entities) {
          const target = r.entities[targetId];
          const dist = Math.sqrt((target.x - explosionPoint.x)**2 + (target.y - explosionPoint.y)**2 + (target.z - explosionPoint.z)**2);
          if (dist < 30) {
            const damage = Math.floor(250 * (1 - dist/30));
            applyDamageToEntity(rId, targetId, shooterId, damage);
            
            // Knockback for bots
            const force = 3 * (1 - dist/30);
            const dirX = (target.x - explosionPoint.x) / (dist || 1);
            const dirY = (target.y - explosionPoint.y) / (dist || 1) + 0.5;
            const dirZ = (target.z - explosionPoint.z) / (dist || 1);
            
            target.x += dirX * force;
            target.y += dirY * force;
            target.z += dirZ * force;
          }
        }
        for (const targetId in r.structures) {
          const target = r.structures[targetId];
          const dist = Math.sqrt((target.x - explosionPoint.x)**2 + (target.y - explosionPoint.y)**2 + (target.z - explosionPoint.z)**2);
          if (dist < 30) {
            destroyStructureAndConnected(rId, targetId);
          }
        }
      } else if (weapon === 'MELEE') {
        // Melee attack logic
        const damage = 150; // High damage for melee
        
        // Broadcast melee animation to everyone
        io.to(rId).emit('meleeAnimation', { id: shooterId });

        for (const targetId in r.players) {
          if (targetId === shooterId) continue;
          if (checkHit(r.players[targetId], data.from, data.to)) {
            applyDamage(rId, targetId, shooterId, damage);
            r.players[targetId].bleedingTicks = 10; // Heavy bleeding
          }
        }
        for (const targetId in r.entities) {
          if (checkHit(r.entities[targetId], data.from, data.to)) {
            applyDamageToEntity(rId, targetId, shooterId, damage);
          }
        }
        for (const targetId in r.structures) {
          if (checkStructureHit(r.structures[targetId], data.from, data.to)) {
            destroyStructureAndConnected(rId, targetId);
          }
        }
      } else if (weapon === 'SHOTGUN') {
        data.rays.forEach((ray: any) => {
          io.to(rId).emit('laserFired', { id: Math.random().toString(36).substring(7), from: ray.from, to: ray.to, color: '#ffff00', weapon });
          for (const targetId in r.players) {
            if (targetId === shooterId) continue;
            if (checkHit(r.players[targetId], ray.from, ray.to)) {
              applyDamage(rId, targetId, shooterId, 15); // 15 per pellet
            }
          }
          for (const targetId in r.entities) {
            if (checkHit(r.entities[targetId], ray.from, ray.to)) {
              applyDamageToEntity(rId, targetId, shooterId, 15);
            }
          }
          for (const targetId in r.structures) {
            if (checkStructureHit(r.structures[targetId], ray.from, ray.to)) {
              destroyStructureAndConnected(rId, targetId);
            }
          }
        });
      } else {
        let damage = 25;
        let color = shooter.color;
        if (weapon === 'REVOLVER') { damage = 45; color = '#ffffff'; }
        if (weapon === 'KNIFE') { damage = 20; color = '#aaaaaa'; }

        io.to(rId).emit('laserFired', { id: Math.random().toString(36).substring(7), from: data.from, to: data.to, color, weapon });

        for (const targetId in r.players) {
          if (targetId === shooterId) continue;
          if (checkHit(r.players[targetId], data.from, data.to)) {
            applyDamage(rId, targetId, shooterId, damage);
            if (weapon === 'KNIFE') {
              r.players[targetId].bleedingTicks = 5;
            }
          }
        }
        for (const targetId in r.entities) {
          if (checkHit(r.entities[targetId], data.from, data.to)) {
            applyDamageToEntity(rId, targetId, shooterId, damage);
          }
        }
        for (const targetId in r.structures) {
          if (checkStructureHit(r.structures[targetId], data.from, data.to)) {
            destroyStructureAndConnected(rId, targetId);
          }
        }
      }
    });

    socket.on('buildRamp', (data) => {
      const rId = socket.data.roomId;
      const r = rooms[rId];
      if (!r || r.state !== 'playing') return;
      const shooterId = socket.id;
      const shooter = r.players[shooterId];
      if (!shooter || shooter.health <= 0) return;

      const id = Math.random().toString(36).substring(7);
      const structure = {
        id,
        type: 'RAMP',
        x: data.x,
        y: data.y,
        z: data.z,
        ry: data.ry,
        ownerId: shooterId
      };
      r.structures[id] = structure;
      io.to(rId).emit('structureSpawned', structure);
    });

    socket.on('takeEnvironmentalDamage', (amount) => {
      const rId = socket.data.roomId;
      const r = rooms[rId];
      if (r && r.state === 'playing') {
        applyDamage(rId, socket.id, 'environment', amount);
      }
    });

    socket.on('disconnect', () => {
      console.log('Player disconnected:', socket.id);
      const rId = socket.data.roomId;
      if (rId && rooms[rId]) {
        const r = rooms[rId];
        delete r.players[socket.id];
        if (r.mode === 'team' || (r.mode === 'custom' && r.customConfig?.teams)) {
          delete r.teams[socket.id];
          r.votesToStart.delete(socket.id);
          io.to(rId).emit('teamsUpdated', r.teams);
          io.to(rId).emit('votesUpdated', Array.from(r.votesToStart));
          
          const numPlayers = Object.keys(r.players).length;
          // If no players left in team mode, reset to lobby
          if (numPlayers === 0) {
            r.state = 'lobby';
            r.teams = {};
            r.votesToStart.clear();
          } else if (r.state === 'lobby' && numPlayers >= (r.mode === 'custom' ? 1 : 2) && r.votesToStart.size === numPlayers) {
            r.state = 'playing';
            const teamCounts: Record<string, number> = {};
            for (const t of Object.values(r.teams)) {
              teamCounts[t] = (teamCounts[t] || 0) + 1;
            }
            for (const pId in r.players) {
              const tId = r.teams[pId];
              if (!tId || teamCounts[tId] === 1) {
                r.players[pId].lives = 2;
              } else {
                r.players[pId].lives = 1;
              }
            }
            io.to(rId).emit('gameStateChanged', { state: 'playing', players: r.players });
          } else if (r.state === 'playing') {
            // Check if game is over due to disconnect
            const remainingTeams = new Set();
            for (const pId in r.players) {
              if (r.players[pId].lives > 0) {
                remainingTeams.add(r.teams[pId]);
              }
            }
            if (remainingTeams.size <= 1) {
              const winningTeam = remainingTeams.size === 1 ? Array.from(remainingTeams)[0] as string : null;
              awardPointsToTeam(r, winningTeam);
              io.to(rId).emit('gameOver', { winningTeam });
              setTimeout(() => {
                r.state = 'lobby';
                r.teams = {};
                r.votesToStart.clear();
                for (const pId in r.players) {
                  r.players[pId].health = r.mode === 'custom' && r.customConfig ? r.customConfig.health : (r.mode === 'speed' ? 125 : 500);
                  r.players[pId].lives = 1;
                  r.players[pId].score = 0;
                }
                io.to(rId).emit('gameStateChanged', { state: 'lobby', players: r.players });
                io.to(rId).emit('teamsUpdated', r.teams);
                io.to(rId).emit('votesUpdated', []);
              }, 5000);
            }
          }
        }
        io.to(rId).emit('playerLeft', socket.id);
      }
    });

    socket.on('requestRespawn', () => {
      const rId = socket.data.roomId;
      const r = rooms[rId];
      if (!r) return;
      const p = r.players[socket.id];
      if (p && p.health <= 0) {
        if ((r.mode === 'team' || (r.mode === 'custom' && r.customConfig?.teams)) && p.lives <= 0) return; // Can't respawn if eliminated
        
        p.health = r.mode === 'custom' && r.customConfig ? r.customConfig.health : (r.mode === 'speed' ? 125 : 500);
        p.bleedingTicks = 0;
        p.weapon = r.mode === 'custom' && r.customConfig ? r.customConfig.spawnWeapon : 'DEFAULT';
        const spread = r.mode === 'pve' ? 350 : 2000;
        const spawnX = (Math.random() - 0.5) * spread;
        const spawnZ = (Math.random() - 0.5) * spread;
        const terrainY = r.mode === 'pve' ? 0 : getTerrainHeight(spawnX, spawnZ);
        const blockY = getHighestBlockY(r.volume, spawnX, spawnZ);
        p.x = spawnX;
        p.y = Math.max(terrainY, blockY) + 20;
        p.z = spawnZ;
        io.to(rId).emit('playerRespawned', p);
      }
    });

    socket.on('adminBan', (targetId) => {
      const rId = socket.data.roomId;
      const r = rooms[rId];
      if (!r) return;
      const p = r.players[socket.id];
      if (!p || !p.isAdmin) return;
      
      const targetSocket = io.sockets.sockets.get(targetId);
      if (targetSocket) {
        targetSocket.emit('banned');
        targetSocket.disconnect(true);
      }
    });

    socket.on('adminTriggerEvent', (event) => {
      const rId = socket.data.roomId;
      const r = rooms[rId];
      if (!r) return;
      const p = r.players[socket.id];
      if (!p || !p.isAdmin) return;
      
      if (['tornado', 'lava', 'meteorite'].includes(event)) {
        const targets = Object.values(r.players).map(p => ({ x: p.x, z: p.z }));
        r.activeEvent = { type: event as any, endTime: Date.now() + 30000, targets };
        io.to(rId).emit('specialEvent', { type: event, duration: 30000, startTime: Date.now(), targets });
      }
    });

    socket.on('adminToggleEvents', (enabled: boolean) => {
      const rId = socket.data.roomId;
      const r = rooms[rId];
      if (!r) return;
      const p = r.players[socket.id];
      if (!p || !p.isAdmin) return;
      
      r.eventsEnabled = enabled;
      io.to(rId).emit('eventsToggled', enabled);
    });
  });

  // API routes FIRST
  app.use(express.json());

  app.get('/api/health', (req, res) => {
    res.json({ status: 'ok' });
  });

  app.get('/api/custom-game', (req, res) => {
    if (rooms['custom']) {
      res.json({ active: true, config: rooms['custom'].customConfig });
    } else {
      res.json({ active: false });
    }
  });

  app.post('/api/custom-game', (req, res) => {
    const { isAdmin, config } = req.body;
    if (!isAdmin) {
      return res.status(403).json({ error: 'Unauthorized' });
    }
    rooms['custom'] = createRoom('custom', 'normal', config);
    res.json({ success: true });
  });

  app.get('/api/points', (req, res) => {
    res.json(pointsData);
  });

  app.post('/api/points', (req, res) => {
    const { isAdmin, nickname, points } = req.body;
    if (!isAdmin) return res.status(403).json({ error: 'Unauthorized' });
    pointsData[nickname] = (pointsData[nickname] || 0) + points;
    savePoints();
    res.json({ success: true, points: pointsData[nickname] });
  });

  const dev = process.env.NODE_ENV !== 'production';
  const nextApp = next({ dev });
  const handle = nextApp.getRequestHandler();

  await nextApp.prepare();

  app.all('*', (req, res) => {
    return handle(req, res);
  });

  httpServer.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
