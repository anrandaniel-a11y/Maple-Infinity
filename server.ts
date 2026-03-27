import express from 'express';
import { createServer as createViteServer } from 'vite';
import { createServer } from 'http';
import { Server } from 'socket.io';
import path from 'path';
import { generateVolume, getHighestBlockY } from './src/utils/mapGen.js';

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

function getTerrainHeight(x: number, z: number) {
  let y = Math.sin(x * 0.02) * Math.cos(z * 0.02) * 15;
  y += Math.sin(x * 0.005) * Math.cos(z * 0.005) * 40;
  y += Math.sin(x * 0.1) * Math.cos(z * 0.1) * 2;
  const distFromCenter = Math.sqrt(x*x + z*z);
  if (distFromCenter < 60) {
    y *= Math.pow(distFromCenter / 60, 2);
  }
  return y;
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

async function startServer() {
  const app = express();
  const httpServer = createServer(app);
  const io = new Server(httpServer, {
    cors: { origin: '*' }
  });

  const PORT = 3000;

  interface Room {
    players: Record<string, any>;
    weapons: Record<string, any>;
    medkits: Record<string, any>;
    entities: Record<string, any>;
    currentMapIndex: number;
    mode: 'pvp' | 'pve';
    difficulty: 'easy' | 'normal' | 'hard' | 'nightmare';
    seed: number;
    volume: Int32Array;
    bossActive: boolean;
    bossId: string | null;
    bossPhase: number;
    bossDefeated: boolean;
  }

  const TOTAL_MAPS = 3;
  const WEAPON_TYPES = ['REVOLVER', 'SHOTGUN', 'RPG', 'KNIFE'];

  function createRoom(mode: 'pvp' | 'pve', difficulty: 'easy' | 'normal' | 'hard' | 'nightmare'): Room {
    const seed = Math.floor(Math.random() * 1000000);
    const volume = generateVolume(seed);
    const weapons: Record<string, any> = {};
    const medkits: Record<string, any> = {};
    const numWeapons = mode === 'pve' ? 10 : 40;
    const numMedkits = mode === 'pve' ? (difficulty === 'easy' ? 15 : difficulty === 'normal' ? 8 : difficulty === 'hard' ? 4 : 2) : 5;
    const spread = mode === 'pve' ? 100 : 1900;
    
    for (let i = 0; i < numWeapons; i++) {
      const id = Math.random().toString(36).substring(7);
      const x = (Math.random() - 0.5) * spread;
      const z = (Math.random() - 0.5) * spread;
      const terrainY = getTerrainHeight(x, z);
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
      const terrainY = getTerrainHeight(x, z);
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
      currentMapIndex: 0,
      mode,
      difficulty,
      seed,
      volume,
      bossActive: false,
      bossId: null,
      bossPhase: 0,
      bossDefeated: false
    };
  }

  const rooms: Record<string, Room> = {
    pvp: createRoom('pvp', 'normal'),
    'pve-easy': createRoom('pve', 'easy'),
    'pve-normal': createRoom('pve', 'normal'),
    'pve-hard': createRoom('pve', 'hard'),
    'pve-nightmare': createRoom('pve', 'nightmare')
  };

  // Game Loop for bleeding, weapon respawns, and entities
  setInterval(() => {
    const now = Date.now();
    
    for (const [roomId, room] of Object.entries(rooms)) {
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
            if (p.lastAttacker && room.players[p.lastAttacker]) {
              room.players[p.lastAttacker].score += 1;
              io.to(roomId).emit('scoreUpdated', { id: p.lastAttacker, score: room.players[p.lastAttacker].score });
            }
            p.health = 500;
            p.bleedingTicks = 0;
            p.weapon = 'DEFAULT';
            const spread = room.mode === 'pve' ? 100 : 2000;
            p.x = (Math.random() - 0.5) * spread;
            p.y = 60;
            p.z = (Math.random() - 0.5) * spread;
            io.to(roomId).emit('playerRespawned', p);
          } else {
            io.to(roomId).emit('playerHit', { id: p.id, health: p.health, bleedingTicks: p.bleedingTicks });
          }
        }
      }

      if (room.mode === 'pve') {
        const numPlayers = Object.keys(room.players).length;
        if (numPlayers > 0) {
          if (!room.bossActive && !room.bossDefeated) {
            const totalScore = Object.values(room.players).reduce((acc: number, p: any) => acc + p.score, 0);
            if (totalScore >= 200) {
              room.bossActive = true;
              room.bossPhase = 1;
              const bossId = 'boss_' + Math.random().toString(36).substring(7);
              room.bossId = bossId;
              const spawnX = 0;
              const spawnZ = 0;
              const terrainY = getTerrainHeight(spawnX, spawnZ);
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
                invulnerableUntil: 0
              };
              io.to(roomId).emit('entitySpawned', room.entities[bossId]);
              io.to(roomId).emit('bossSpawned', room.entities[bossId]);
              io.to(roomId).emit('chatMessage', { sender: 'SYSTEM', text: 'WARNING: BOSS DETECTED!', color: '#ff0000' });
            } else {
              const maxEntities = room.difficulty === 'easy' ? 5 : room.difficulty === 'normal' ? 10 : room.difficulty === 'hard' ? 20 : 30;
              const spawnChance = room.difficulty === 'easy' ? 0.2 : room.difficulty === 'normal' ? 0.5 : room.difficulty === 'hard' ? 0.8 : 1.0;
              if (Object.keys(room.entities).length < numPlayers * maxEntities) {
                if (Math.random() < spawnChance) {
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
          } else if (room.bossId && room.entities[room.bossId]) {
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
      const terrainY = getTerrainHeight(x, z);
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

      if (room.mode === 'pve') {
        const entityUpdates: any[] = [];
        for (const entity of Object.values(room.entities)) {
          let closestPlayer = null;
          let minD = Infinity;
          for (const p of Object.values(room.players)) {
            const d = Math.sqrt((p.x - entity.x)**2 + (p.y - entity.y)**2 + (p.z - entity.z)**2);
            if (d < minD) {
              minD = d;
              closestPlayer = p;
            }
          }

          if (closestPlayer) {
            entity.targetId = closestPlayer.id;
            const dx = closestPlayer.x - entity.x;
            const dy = closestPlayer.y - entity.y;
            const dz = closestPlayer.z - entity.z;
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
                  entity.attackTarget = [closestPlayer.x, closestPlayer.y, closestPlayer.z];
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
                  
                  if (closestPlayer) {
                    const currentDist = Math.sqrt((closestPlayer.x - entity.x)**2 + (closestPlayer.y - entity.y)**2 + (closestPlayer.z - entity.z)**2);
                    if (currentDist < 5) {
                      const damage = room.difficulty === 'easy' ? 25 : room.difficulty === 'normal' ? 45 : room.difficulty === 'hard' ? 75 : 100;
                      applyDamage(roomId, closestPlayer.id, 'entity', damage);
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

              const attackCooldown = 2000;
              if (now - entity.lastAttack > attackCooldown) {
                if (!entity.isPreparingAttack) {
                  entity.isPreparingAttack = true;
                  entity.attackStartTime = now;
                  entity.attackTarget = [closestPlayer.x, closestPlayer.y, closestPlayer.z];
                } else if (now - entity.attackStartTime > 1000) {
                  entity.isPreparingAttack = false;
                  entity.lastAttack = now;
                  
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
    const target = room.players[targetId];
    if (target.infiniteHealth) return;
    
    target.health -= amount;
    target.lastAttacker = shooterId;
    if (target.health <= 0) {
      if (room.players[shooterId]) room.players[shooterId].score += 1;
      target.health = 500;
      target.bleedingTicks = 0;
      target.weapon = 'DEFAULT';
      const spread = room.mode === 'pve' ? 100 : 2000;
      const spawnX = (Math.random() - 0.5) * spread;
      const spawnZ = (Math.random() - 0.5) * spread;
      const terrainY = getTerrainHeight(spawnX, spawnZ);
      const blockY = getHighestBlockY(room.volume, spawnX, spawnZ);
      target.x = spawnX;
      target.y = Math.max(terrainY, blockY) + 20;
      target.z = spawnZ;
      io.to(roomId).emit('playerRespawned', target);
      if (room.players[shooterId]) {
        io.to(roomId).emit('scoreUpdated', { id: shooterId, score: room.players[shooterId].score });
        if (room.players[shooterId].score % 5 === 0) {
          room.currentMapIndex = (room.currentMapIndex + 1) % TOTAL_MAPS;
          io.to(roomId).emit('mapChanged', room.currentMapIndex);
        }
      }
    } else {
      io.to(roomId).emit('playerHit', { id: targetId, health: target.health, bleedingTicks: target.bleedingTicks });
    }
  }

  function applyDamageToEntity(roomId: string, entityId: string, shooterId: string, amount: number) {
    const room = rooms[roomId];
    const entity = room.entities[entityId];
    if (!entity) return;

    if (entity.invulnerableUntil && Date.now() < entity.invulnerableUntil) {
      return;
    }

    entity.health -= amount;
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
    const mode = (socket.handshake.query.gameMode as 'pvp' | 'pve') || 'pvp';
    const difficulty = (socket.handshake.query.difficulty as 'easy' | 'normal' | 'hard' | 'nightmare') || 'normal';
    const roomId = mode === 'pve' ? `pve-${difficulty}` : 'pvp';
    socket.join(roomId);
    socket.data.roomId = roomId;
    const room = rooms[roomId];

    const spread = mode === 'pve' ? 100 : 2000;

    const spawnX = (Math.random() - 0.5) * spread;
    const spawnZ = (Math.random() - 0.5) * spread;
    const terrainY = getTerrainHeight(spawnX, spawnZ);
    const blockY = getHighestBlockY(room.volume, spawnX, spawnZ);

    // Initialize player
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
      health: 500,
      weapon: 'DEFAULT',
      bleedingTicks: 0,
      lastAttacker: null
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
      boss: room.bossActive && room.bossId ? room.entities[room.bossId] : null
    });

    // Broadcast new player to others
    socket.to(roomId).emit('playerJoined', room.players[socket.id]);

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
      if (r.players[socket.id]) {
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
      if (w && w.active && p) {
        const dist = Math.sqrt((p.x - w.x)**2 + (p.y - w.y)**2 + (p.z - w.z)**2);
        if (dist < 5) {
          w.active = false;
          w.respawnTime = Date.now() + 30000; // 30 seconds respawn
          p.weapon = w.type;
          io.to(rId).emit('weaponsUpdate', r.weapons);
          socket.emit('weaponPickedUp', w.type);
        }
      }
    });

    socket.on('pickupMedkit', (medkitId) => {
      const rId = socket.data.roomId;
      const r = rooms[rId];
      const m = r.medkits[medkitId];
      const p = r.players[socket.id];
      if (m && m.active && p) {
        const dist = Math.sqrt((p.x - m.x)**2 + (p.y - m.y)**2 + (p.z - m.z)**2);
        if (dist < 5) {
          m.active = false;
          m.respawnTime = Date.now() + 45000; // 45 seconds respawn
          p.health = Math.min(500, p.health + 250);
          p.bleedingTicks = 0;
          io.to(rId).emit('medkitsUpdate', r.medkits);
          io.to(rId).emit('playerHit', { id: p.id, health: p.health, bleedingTicks: p.bleedingTicks });
          socket.emit('medkitPickedUp');
        }
      }
    });

    socket.on('shoot', (data) => {
      const rId = socket.data.roomId;
      const r = rooms[rId];
      const shooterId = socket.id;
      const shooter = r.players[shooterId];
      if (!shooter) return;

      const weapon = data.weapon || 'DEFAULT';

      if (weapon === 'RPG') {
        io.to(rId).emit('laserFired', { id: Math.random().toString(36).substring(7), from: data.from, to: data.to, color: '#ff8800' });
        io.to(rId).emit('explosion', { x: data.to[0], y: data.to[1], z: data.to[2], radius: 15 });

        for (const targetId in r.players) {
          if (targetId === shooterId) continue;
          const target = r.players[targetId];
          const dist = Math.sqrt((target.x - data.to[0])**2 + (target.y - data.to[1])**2 + (target.z - data.to[2])**2);
          if (dist < 15) {
            const damage = Math.floor(80 * (1 - dist/15));
            applyDamage(rId, targetId, shooterId, damage);
          }
        }
        for (const targetId in r.entities) {
          const target = r.entities[targetId];
          const dist = Math.sqrt((target.x - data.to[0])**2 + (target.y - data.to[1])**2 + (target.z - data.to[2])**2);
          if (dist < 15) {
            const damage = Math.floor(80 * (1 - dist/15));
            applyDamageToEntity(rId, targetId, shooterId, damage);
          }
        }
      } else if (weapon === 'SHOTGUN') {
        data.rays.forEach((ray: any) => {
          io.to(rId).emit('laserFired', { id: Math.random().toString(36).substring(7), from: ray.from, to: ray.to, color: '#ffff00' });
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
        });
      } else {
        let damage = 25;
        let color = shooter.color;
        if (weapon === 'REVOLVER') { damage = 45; color = '#ffffff'; }
        if (weapon === 'KNIFE') { damage = 20; color = '#aaaaaa'; }

        io.to(rId).emit('laserFired', { id: Math.random().toString(36).substring(7), from: data.from, to: data.to, color });

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
      }
    });

    socket.on('disconnect', () => {
      console.log('Player disconnected:', socket.id);
      const rId = socket.data.roomId;
      if (rId && rooms[rId]) {
        delete rooms[rId].players[socket.id];
        io.to(rId).emit('playerLeft', socket.id);
      }
    });
  });

  // API routes FIRST
  app.get('/api/health', (req, res) => {
    res.json({ status: 'ok' });
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true, hmr: false },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  httpServer.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
