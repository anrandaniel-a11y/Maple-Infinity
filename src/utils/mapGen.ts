export function seededRandom(seed: number) {
  return function() {
    seed |= 0; seed = seed + 0x6D2B79F5 | 0;
    let t = Math.imul(seed ^ seed >>> 15, 1 | seed);
    t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t;
    return ((t ^ t >>> 14) >>> 0) / 4294967296;
  }
}

export const VOXEL_SIZE = 20;
export const GRID_W = 100;
export const GRID_H = 20;
export const GRID_D = 100;

export function getTerrainHeight(x: number, z: number) {
  let y = Math.sin(x * 0.02) * Math.cos(z * 0.02) * 15;
  y += Math.sin(x * 0.005) * Math.cos(z * 0.005) * 40;
  y += Math.sin(x * 0.1) * Math.cos(z * 0.1) * 2;
  y += Math.sin(x * 0.05 + z * 0.03) * 10;
  y += Math.sin(x * 0.01 - z * 0.01) * 20;
  
  const distFromCenter = Math.sqrt(x*x + z*z);
  if (distFromCenter < 60) {
    y *= Math.pow(distFromCenter / 60, 2);
  }
  return y;
}

export function generateVolume(seed: number) {
  const rng = seededRandom(seed);
  const volume = new Int32Array(GRID_W * GRID_H * GRID_D);
  const getIdx = (x: number, y: number, z: number) => x + y * GRID_W + z * GRID_W * GRID_H;

  const setBlock = (x: number, y: number, z: number, color: number) => {
    if (x >= 0 && x < GRID_W && y >= 0 && y < GRID_H && z >= 0 && z < GRID_D) {
      volume[getIdx(x, y, z)] = color;
    }
  };

  const getBlock = (x: number, y: number, z: number) => {
    if (x >= 0 && x < GRID_W && y >= 0 && y < GRID_H && z >= 0 && z < GRID_D) {
      return volume[getIdx(x, y, z)];
    }
    return 0;
  };

  // 1. Central Arena / Base
  const arenaRadius = 8;
  const arenaHeight = 2;
  for (let x = GRID_W/2 - arenaRadius; x <= GRID_W/2 + arenaRadius; x++) {
    for (let z = GRID_D/2 - arenaRadius; z <= GRID_D/2 + arenaRadius; z++) {
      if ((x - GRID_W/2)**2 + (z - GRID_D/2)**2 <= arenaRadius**2) {
        for (let y = 0; y < arenaHeight; y++) {
          setBlock(x, y, z, 2); // Magenta
        }
      }
    }
  }

  // Central Tower
  const towerRadius = 3;
  const towerHeight = 15;
  for (let x = GRID_W/2 - towerRadius; x <= GRID_W/2 + towerRadius; x++) {
    for (let z = GRID_D/2 - towerRadius; z <= GRID_D/2 + towerRadius; z++) {
      if ((x - GRID_W/2)**2 + (z - GRID_D/2)**2 <= towerRadius**2) {
        for (let y = arenaHeight; y < towerHeight; y++) {
          // Hollow inside
          if ((x - GRID_W/2)**2 + (z - GRID_D/2)**2 <= (towerRadius - 1)**2) continue;
          // Windows
          if (y % 3 === 0 && (x === GRID_W/2 || z === GRID_D/2)) continue;
          setBlock(x, y, z, 1); // Cyan
        }
      }
    }
  }

  // Spiral Staircase around the tower
  for (let y = arenaHeight; y < towerHeight; y++) {
    const angle = y * 0.8;
    const sx = Math.floor(GRID_W/2 + Math.cos(angle) * (towerRadius + 1));
    const sz = Math.floor(GRID_D/2 + Math.sin(angle) * (towerRadius + 1));
    setBlock(sx, y, sz, 3); // Yellow
    setBlock(sx, y-1, sz, 3);
    
    // Make stairs a bit wider
    const sx2 = Math.floor(GRID_W/2 + Math.cos(angle) * (towerRadius + 2));
    const sz2 = Math.floor(GRID_D/2 + Math.sin(angle) * (towerRadius + 2));
    setBlock(sx2, y, sz2, 3);
    setBlock(sx2, y-1, sz2, 3);
  }

  // 2. Platforms
  const platforms: {x: number, y: number, z: number, r: number}[] = [];
  for (let i = 0; i < 15; i++) {
    const cx = Math.floor(rng() * (GRID_W - 20)) + 10;
    const cz = Math.floor(rng() * (GRID_D - 20)) + 10;
    const cy = Math.floor(rng() * (GRID_H - 8)) + 4;
    const r = Math.floor(rng() * 4) + 3;
    const colorIdx = Math.floor(rng() * 4) + 1;
    
    if (Math.abs(cx - GRID_W/2) < 15 && Math.abs(cz - GRID_D/2) < 15) continue;
    
    platforms.push({x: cx, y: cy, z: cz, r});
    
    for (let x = cx - r; x <= cx + r; x++) {
      for (let z = cz - r; z <= cz + r; z++) {
        if ((x - cx)**2 + (z - cz)**2 <= r**2) {
          setBlock(x, cy, z, colorIdx);
          // Support pillar
          if ((x - cx)**2 + (z - cz)**2 <= (r/2)**2) {
            for (let y = 0; y < cy; y++) {
              setBlock(x, y, z, colorIdx);
            }
          }
        }
      }
    }
  }

  // 3. Bridges between platforms
  for (let i = 0; i < platforms.length; i++) {
    for (let j = i + 1; j < platforms.length; j++) {
      const p1 = platforms[i];
      const p2 = platforms[j];
      const dist = Math.sqrt((p1.x - p2.x)**2 + (p1.z - p2.z)**2 + (p1.y - p2.y)**2);
      
      if (dist > 10 && dist < 30) {
        // Draw bridge
        const steps = Math.floor(dist);
        for (let s = 0; s <= steps; s++) {
          const t = s / steps;
          const bx = Math.floor(p1.x + (p2.x - p1.x) * t);
          const by = Math.floor(p1.y + (p2.y - p1.y) * t);
          const bz = Math.floor(p1.z + (p2.z - p1.z) * t);
          
          setBlock(bx, by, bz, 3);
          setBlock(bx + 1, by, bz, 3);
          setBlock(bx, by, bz + 1, 3);
          setBlock(bx + 1, by, bz + 1, 3);
        }
      }
    }
  }

  // 4. Towers (Hollow)
  for (let i = 0; i < 8; i++) {
    const cx = Math.floor(rng() * GRID_W);
    const cz = Math.floor(rng() * GRID_D);
    const w = Math.floor(rng() * 3) + 3;
    const h = Math.floor(rng() * 12) + 6;
    const colorIdx = Math.floor(rng() * 4) + 1;
    
    if (Math.abs(cx - GRID_W/2) < 15 && Math.abs(cz - GRID_D/2) < 15) continue;
    
    for (let x = cx; x < cx + w; x++) {
      for (let z = cz; z < cz + w; z++) {
        for (let y = 0; y < h; y++) {
          // Hollow interior
          if (x > cx && x < cx + w - 1 && z > cz && z < cz + w - 1 && y > 0 && y < h - 1) {
            continue;
          }
          // Windows
          if (y % 4 === 2 && (x === cx || x === cx + w - 1 || z === cz || z === cz + w - 1)) {
            if (x % 2 === 0 || z % 2 === 0) continue;
          }
          setBlock(x, y, z, colorIdx);
        }
      }
    }
  }

  // 5. Arches
  for (let i = 0; i < 10; i++) {
    const cx = Math.floor(rng() * GRID_W);
    const cz = Math.floor(rng() * GRID_D);
    const w = Math.floor(rng() * 4) + 4;
    const h = Math.floor(rng() * 5) + 5;
    const dir = rng() > 0.5 ? 1 : 0; // 1 for x-axis, 0 for z-axis
    const colorIdx = Math.floor(rng() * 4) + 1;

    if (Math.abs(cx - GRID_W/2) < 10 && Math.abs(cz - GRID_D/2) < 10) continue;

    for (let t = 0; t <= Math.PI; t += 0.1) {
      const ax = dir === 1 ? cx + Math.cos(t) * w : cx;
      const az = dir === 0 ? cz + Math.cos(t) * w : cz;
      const ay = Math.sin(t) * h;
      
      const bx = Math.floor(ax);
      const by = Math.floor(ay);
      const bz = Math.floor(az);
      
      setBlock(bx, by, bz, colorIdx);
      setBlock(bx, by-1, bz, colorIdx);
      if (dir === 1) {
        setBlock(bx, by, bz+1, colorIdx);
        setBlock(bx, by-1, bz+1, colorIdx);
      } else {
        setBlock(bx+1, by, bz, colorIdx);
        setBlock(bx+1, by-1, bz, colorIdx);
      }
    }
  }

  // 6. Floating Islands
  for (let i = 0; i < 20; i++) {
    const cx = Math.floor(rng() * GRID_W);
    const cy = Math.floor(rng() * (GRID_H - 10)) + 10;
    const cz = Math.floor(rng() * GRID_D);
    const r = Math.floor(rng() * 5) + 2;
    const colorIdx = Math.floor(rng() * 4) + 1;
    
    if (Math.abs(cx - GRID_W/2) < 10 && Math.abs(cz - GRID_D/2) < 10) continue;
    
    for (let x = cx - r; x <= cx + r; x++) {
      for (let y = cy - r; y <= cy + Math.floor(r/2); y++) {
        for (let z = cz - r; z <= cz + r; z++) {
          if ((x-cx)**2 + (y-cy)**2 + (z-cz)**2 <= r**2) {
            setBlock(x, y, z, colorIdx);
          }
        }
      }
    }
  }

  // 7. A large pyramid in a corner
  const px = 20;
  const pz = 20;
  const pBase = 12;
  for (let y = 0; y < pBase; y++) {
    const w = pBase - y;
    for (let x = px - w; x <= px + w; x++) {
      for (let z = pz - w; z <= pz + w; z++) {
        // Hollow pyramid
        if (x > px - w && x < px + w && z > pz - w && z < pz + w && y > 0) continue;
        // Doorway
        if (x === px && z > pz && y < 3) continue;
        setBlock(x, y, z, 4); // Green
      }
    }
  }

  // 8. Ruined Castle
  const cxCastle = 70;
  const czCastle = 70;
  const castleSize = 12;
  const castleHeight = 8;
  for (let x = cxCastle - castleSize; x <= cxCastle + castleSize; x++) {
    for (let z = czCastle - castleSize; z <= czCastle + castleSize; z++) {
      // Outer walls
      if (x === cxCastle - castleSize || x === cxCastle + castleSize || z === czCastle - castleSize || z === czCastle + castleSize) {
        for (let y = 0; y < castleHeight; y++) {
          // Ruins effect: random gaps in the upper walls
          if (y > 3 && rng() > 0.6) continue;
          // Gate
          if (y < 4 && Math.abs(x - cxCastle) < 3 && z === czCastle - castleSize) continue;
          setBlock(x, y, z, 2); // Magenta
        }
      }
      // Corner towers
      if (Math.abs(x - cxCastle) === castleSize && Math.abs(z - czCastle) === castleSize) {
        for (let y = 0; y < castleHeight + 4; y++) {
          if (y > castleHeight && rng() > 0.5) continue;
          setBlock(x, y, z, 1); // Cyan
        }
      }
    }
  }

  // 9. Giant Bridge across the map
  const bridgeZ = 30;
  const bridgeY = 12;
  for (let x = 10; x < GRID_W - 10; x++) {
    // Bridge surface
    setBlock(x, bridgeY, bridgeZ - 1, 3);
    setBlock(x, bridgeY, bridgeZ, 3);
    setBlock(x, bridgeY, bridgeZ + 1, 3);
    
    // Bridge railings
    if (x % 2 === 0) {
      setBlock(x, bridgeY + 1, bridgeZ - 1, 3);
      setBlock(x, bridgeY + 1, bridgeZ + 1, 3);
    }
    
    // Support pillars every 15 blocks
    if (x % 15 === 0) {
      for (let y = 0; y < bridgeY; y++) {
        setBlock(x, y, bridgeZ, 3);
      }
    }
  }

  // 10. Ramps
  // We will generate a few ramps that go up to platforms or just exist as structures
  for (let i = 0; i < 8; i++) {
    const cx = Math.floor(rng() * (GRID_W - 20)) + 10;
    const cz = Math.floor(rng() * (GRID_D - 20)) + 10;
    const dir = Math.floor(rng() * 4); // 0: +x, 1: -x, 2: +z, 3: -z
    const length = Math.floor(rng() * 5) + 5;
    const width = 3;
    const colorIdx = Math.floor(rng() * 4) + 1;

    let currentY = 0;
    for (let l = 0; l < length; l++) {
      for (let w = 0; w < width; w++) {
        let x = cx;
        let z = cz;
        
        if (dir === 0) { x += l; z += w; }
        else if (dir === 1) { x -= l; z += w; }
        else if (dir === 2) { x += w; z += l; }
        else if (dir === 3) { x += w; z -= l; }

        // The ramp goes up by 1 block every step
        setBlock(x, currentY, z, colorIdx);
        // Fill underneath the ramp
        for (let y = 0; y < currentY; y++) {
          setBlock(x, y, z, colorIdx);
        }
      }
      currentY++;
    }
  }

  return volume;
}

export function getHighestBlockY(volume: Int32Array, worldX: number, worldZ: number) {
  const gx = Math.floor(worldX / VOXEL_SIZE + GRID_W / 2);
  const gz = Math.floor(worldZ / VOXEL_SIZE + GRID_D / 2);
  
  if (gx < 0 || gx >= GRID_W || gz < 0 || gz >= GRID_D) return 0;
  
  const getIdx = (x: number, y: number, z: number) => x + y * GRID_W + z * GRID_W * GRID_H;
  
  for (let y = GRID_H - 1; y >= 0; y--) {
    if (volume[getIdx(gx, y, gz)] !== 0) {
      return (y + 1) * VOXEL_SIZE;
    }
  }
  return 0;
}
