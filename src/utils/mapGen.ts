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

export function generateVolume(seed: number) {
  const rng = seededRandom(seed);
  const volume = new Int32Array(GRID_W * GRID_H * GRID_D);
  const getIdx = (x: number, y: number, z: number) => x + y * GRID_W + z * GRID_W * GRID_H;

  // 1. Base pillars
  for (let i = 0; i < 1000; i++) {
    const cx = Math.floor(rng() * GRID_W);
    const cz = Math.floor(rng() * GRID_D);
    const h = Math.floor(rng() * GRID_H);
    const colorIdx = Math.floor(rng() * 4) + 1;
    
    if (Math.abs(cx - GRID_W/2) < 5 && Math.abs(cz - GRID_D/2) < 5) continue;
    
    for (let y = 0; y < h; y++) {
      volume[getIdx(cx, y, cz)] = colorIdx;
    }
  }
  
  // 2. Large blocks
  for (let i = 0; i < 200; i++) {
    const cx = Math.floor(rng() * GRID_W);
    const cz = Math.floor(rng() * GRID_D);
    const w = Math.floor(rng() * 5) + 1;
    const d = Math.floor(rng() * 5) + 1;
    const h = Math.floor(rng() * 10) + 1;
    const colorIdx = Math.floor(rng() * 4) + 1;
    
    if (Math.abs(cx - GRID_W/2) < 10 && Math.abs(cz - GRID_D/2) < 10) continue;
    
    for (let x = cx; x < cx + w && x < GRID_W; x++) {
      for (let z = cz; z < cz + d && z < GRID_D; z++) {
        for (let y = 0; y < h && y < GRID_H; y++) {
          volume[getIdx(x, y, z)] = colorIdx;
        }
      }
    }
  }

  // 3. Floating islands / blobs
  for (let i = 0; i < 100; i++) {
    const cx = Math.floor(rng() * GRID_W);
    const cy = Math.floor(rng() * (GRID_H - 5)) + 5;
    const cz = Math.floor(rng() * GRID_D);
    const r = Math.floor(rng() * 4) + 2;
    const colorIdx = Math.floor(rng() * 4) + 1;
    
    if (Math.abs(cx - GRID_W/2) < 5 && Math.abs(cz - GRID_D/2) < 5) continue;
    
    for (let x = cx - r; x <= cx + r; x++) {
      for (let y = cy - r; y <= cy + r; y++) {
        for (let z = cz - r; z <= cz + r; z++) {
          if (x >= 0 && x < GRID_W && y >= 0 && y < GRID_H && z >= 0 && z < GRID_D) {
            if ((x-cx)**2 + (y-cy)**2 + (z-cz)**2 <= r**2) {
              volume[getIdx(x, y, z)] = colorIdx;
            }
          }
        }
      }
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
