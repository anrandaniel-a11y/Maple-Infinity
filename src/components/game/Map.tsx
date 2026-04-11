import { useMemo, useRef, useEffect, useState } from 'react';
import * as THREE from 'three';
import { useFrame } from '@react-three/fiber';
import { RigidBody, CuboidCollider, InstancedRigidBodies } from '@react-three/rapier';
import { useGameStore } from '../../store/gameStore';
import { WeaponModel } from './WeaponModel';
import { generateVolume, getTerrainHeight, VOXEL_SIZE, GRID_W, GRID_H, GRID_D } from '../../utils/mapGen';

export function Map() {
  const gameMode = useGameStore((state) => state.gameMode);

  return (
    <group>
      {/* Real Terrain */}
      <Terrain />

      <RandomObstacles />

      {gameMode === 'pve' && (
        <group>
          {/* PvE Boundary Walls */}
          <RigidBody type="fixed">
            <mesh position={[0, 50, 60]}>
              <boxGeometry args={[120, 100, 2]} />
              <meshBasicMaterial color="#ff0000" transparent opacity={0.2} />
            </mesh>
          </RigidBody>
          <RigidBody type="fixed">
            <mesh position={[0, 50, -60]}>
              <boxGeometry args={[120, 100, 2]} />
              <meshBasicMaterial color="#ff0000" transparent opacity={0.2} />
            </mesh>
          </RigidBody>
          <RigidBody type="fixed">
            <mesh position={[60, 50, 0]}>
              <boxGeometry args={[2, 100, 120]} />
              <meshBasicMaterial color="#ff0000" transparent opacity={0.2} />
            </mesh>
          </RigidBody>
          <RigidBody type="fixed">
            <mesh position={[-60, 50, 0]}>
              <boxGeometry args={[2, 100, 120]} />
              <meshBasicMaterial color="#ff0000" transparent opacity={0.2} />
            </mesh>
          </RigidBody>
        </group>
      )}

      <Weapons />
      <Medkits />
      <Explosions />
      <Structures />
    </group>
  );
}

const rampGeo = new THREE.BoxGeometry(20, 0.2, Math.sqrt(20*20 + 20*20));
const rampMatBasic = new THREE.MeshBasicMaterial({ color: '#000000' });
const rampMatStd = new THREE.MeshStandardMaterial({ color: '#000000', roughness: 0.8 });
const rampWireframeMat = new THREE.MeshBasicMaterial({ color: '#00ffff', wireframe: true, transparent: true, opacity: 0.6 });

function Structures() {
  const structures = useGameStore((state) => state.structures);
  const enableLighting = useGameStore((state) => state.enableLighting);
  const ultraVisuals = useGameStore((state) => state.ultraVisuals);
  const envMap = useGameStore((state) => state.envMap);

  const rampMat = useMemo(() => {
    if (!enableLighting) return rampMatBasic;
    if (ultraVisuals) {
      return new THREE.MeshStandardMaterial({ 
        color: '#000000', 
        roughness: 0.1, 
        metalness: 0.9, 
        envMap: envMap,
        envMapIntensity: 1.5
      });
    }
    return rampMatStd;
  }, [enableLighting, ultraVisuals, envMap]);

  return (
    <group>
      {Object.values(structures).map((s) => {
        if (s.type === 'RAMP') {
          return (
            <RigidBody key={s.id} type="fixed" position={[s.x, s.y, s.z]} rotation={[0, s.ry, 0]}>
              <mesh geometry={rampGeo} material={rampMat} rotation={[Math.PI / 4, 0, 0]} castShadow={enableLighting} receiveShadow={enableLighting}>
                <mesh geometry={rampGeo} material={rampWireframeMat} scale={[1.01, 1.01, 1.01]} />
              </mesh>
            </RigidBody>
          );
        }
        return null;
      })}
    </group>
  );
}

const weaponBaseGeo = new THREE.CylinderGeometry(1, 1, 0.1, 16);
const weaponBaseMatBasic = new THREE.MeshBasicMaterial({ color: '#ffff00', transparent: true, opacity: 0.3 });
const weaponBaseMatStd = new THREE.MeshStandardMaterial({ color: '#ffff00', transparent: true, opacity: 0.3, emissive: '#ffff00', emissiveIntensity: 0.5 });

function Weapons() {
  const weapons = useGameStore((state) => state.weapons);
  const enableLighting = useGameStore((state) => state.enableLighting);
  const groupRef = useRef<THREE.Group>(null);

  const weaponBaseMat = enableLighting ? weaponBaseMatStd : weaponBaseMatBasic;

  useFrame((state) => {
    if (groupRef.current) {
      groupRef.current.children.forEach((child, i) => {
        child.rotation.y += 0.02;
        child.position.y += Math.sin(state.clock.elapsedTime * 2 + i) * 0.005;
      });
    }
  });

  return (
    <group ref={groupRef}>
      {Object.values(weapons).map((w) => {
        if (!w.active) return null;
        return (
          <group key={w.id} position={[w.x, w.y, w.z]}>
            <WeaponModel type={w.type} />
            <mesh castShadow={enableLighting} position={[0, -0.5, 0]} geometry={weaponBaseGeo} material={weaponBaseMat} />
          </group>
        );
      })}
    </group>
  );
}

const medkitGeo = new THREE.BoxGeometry(1.2, 0.8, 1.2);
const medkitMatBasic = new THREE.MeshBasicMaterial({ color: '#ffffff' });
const medkitMatStd = new THREE.MeshStandardMaterial({ color: '#ffffff', roughness: 0.5 });
const medkitCrossGeo = new THREE.BoxGeometry(0.8, 0.82, 0.3);
const medkitCrossGeo2 = new THREE.BoxGeometry(0.3, 0.82, 0.8);
const medkitCrossMatBasic = new THREE.MeshBasicMaterial({ color: '#ff0000' });
const medkitCrossMatStd = new THREE.MeshStandardMaterial({ color: '#ff0000', emissive: '#ff0000', emissiveIntensity: 0.5 });

function Medkits() {
  const medkits = useGameStore((state) => state.medkits);
  const enableLighting = useGameStore((state) => state.enableLighting);
  const groupRef = useRef<THREE.Group>(null);

  const medkitMat = enableLighting ? medkitMatStd : medkitMatBasic;
  const medkitCrossMat = enableLighting ? medkitCrossMatStd : medkitCrossMatBasic;
  const weaponBaseMat = enableLighting ? weaponBaseMatStd : weaponBaseMatBasic;

  useFrame((state) => {
    if (groupRef.current) {
      groupRef.current.children.forEach((child, i) => {
        child.rotation.y += 0.01;
        child.position.y += Math.sin(state.clock.elapsedTime * 2 + i) * 0.005;
      });
    }
  });

  return (
    <group ref={groupRef}>
      {Object.values(medkits).map((m) => {
        if (!m.active) return null;
        return (
          <group key={m.id} position={[m.x, m.y, m.z]}>
            <mesh castShadow={enableLighting} geometry={medkitGeo} material={medkitMat} />
            <mesh castShadow={enableLighting} geometry={medkitCrossGeo} material={medkitCrossMat} />
            <mesh castShadow={enableLighting} geometry={medkitCrossGeo2} material={medkitCrossMat} />
            <mesh castShadow={enableLighting} position={[0, -0.5, 0]} geometry={weaponBaseGeo} material={weaponBaseMat} />
          </group>
        );
      })}
    </group>
  );
}

function Explosions() {
  const explosions = useGameStore((state) => state.explosions);
  return (
    <group>
      {explosions.map((exp) => (
        <Explosion key={exp.id} position={[exp.x, exp.y, exp.z]} radius={exp.radius} />
      ))}
    </group>
  );
}

const explosionGeo = new THREE.SphereGeometry(1, 16, 16);

function Explosion({ position, radius }: { position: [number, number, number], radius: number }) {
  const meshRef = useRef<THREE.Mesh>(null);
  const materialRef = useRef<THREE.MeshBasicMaterial>(null);

  useEffect(() => {
    if (meshRef.current) {
      meshRef.current.scale.setScalar(radius / 2);
    }
    if (materialRef.current) {
      materialRef.current.opacity = 0.8;
    }
  }, [radius]);

  useFrame((state, delta) => {
    if (meshRef.current && materialRef.current) {
      meshRef.current.scale.addScalar(delta * radius);
      materialRef.current.opacity = Math.max(0, materialRef.current.opacity - delta * 2);
    }
  });

  return (
    <mesh ref={meshRef} position={position} geometry={explosionGeo} frustumCulled={true}>
      <meshBasicMaterial ref={materialRef} color="#ff4400" transparent blending={THREE.AdditiveBlending} depthWrite={false} depthTest={false} side={THREE.DoubleSide} />
    </mesh>
  );
}

const generateTerrainGeometry = () => {
  const size = 2000;
  const segments = 128; // Optimized from 128
  const geo = new THREE.PlaneGeometry(size, size, segments, segments);
  geo.rotateX(-Math.PI / 2);
  
  const pos = geo.attributes.position;
  const colors: number[] = [];
  const color = new THREE.Color();
  
  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i);
    const z = pos.getZ(i);
    
    const y = getTerrainHeight(x, z);

    pos.setY(i, y);
    
    // Color based on height - completely neon now
    if (y < 5) color.setHex(0x001133); // deep neon blue
    else if (y < 20) color.setHex(0x0044ff); // bright blue
    else if (y < 40) color.setHex(0x00ffff); // cyan peaks
    else color.setHex(0xff00ff); // magenta high peaks
    
    colors.push(color.r, color.g, color.b);
  }
  
  geo.computeVertexNormals();
  geo.computeBoundingSphere();
  geo.computeBoundingBox();
  geo.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));
  
  return geo;
};

const GLOBAL_TERRAIN_GEOMETRY = generateTerrainGeometry();

function Terrain() {
  const geometry = GLOBAL_TERRAIN_GEOMETRY;
  const enableLighting = useGameStore((state) => state.enableLighting);

  return (
    <group>
      <RigidBody type="fixed" colliders="trimesh" friction={0.8}>
        <mesh receiveShadow={enableLighting} geometry={geometry}>
          {enableLighting ? <meshStandardMaterial vertexColors roughness={0.8} metalness={0.2} /> : <meshBasicMaterial vertexColors />}
        </mesh>
        {/* Neon wireframe overlay for the terrain */}
        <mesh geometry={geometry} position={[0, 0.1, 0]}>
          <meshBasicMaterial color="#00ffff" wireframe transparent opacity={0.6} />
        </mesh>
      </RigidBody>
    </group>
  );
}

const generateFaceCulledGeometry = (volume: Int32Array, cx: number, cz: number, numChunks: number) => {
  const chunkSizeVoxels = Math.floor(GRID_W / numChunks);
  const startX = cx * chunkSizeVoxels;
  const endX = (cx === numChunks - 1) ? GRID_W : startX + chunkSizeVoxels;
  const startZ = cz * chunkSizeVoxels;
  const endZ = (cz === numChunks - 1) ? GRID_D : startZ + chunkSizeVoxels;
  
  const positions: number[] = [];
  const normals: number[] = [];
  const colors: number[] = [];
  const indices: number[] = [];
  
  const wirePositions: number[] = [];
  const wireIndices: number[] = [];
  
  const getIdx = (x: number, y: number, z: number) => x + y * GRID_W + z * GRID_W * GRID_H;
  
  const palette = ['#000000', '#00ffff', '#ff00ff', '#ffff00', '#00ff00'];
  const colorObj = new THREE.Color();
  
  let vertexOffset = 0;
  let wireVertexOffset = 0;
  
  const addFace = (x: number, y: number, z: number, dir: number, colorIdx: number) => {
    colorObj.set(palette[colorIdx]);
    const r = colorObj.r, g = colorObj.g, b = colorObj.b;
    
    const px = (x - GRID_W / 2 + 0.5) * VOXEL_SIZE;
    const py = (y + 0.5) * VOXEL_SIZE;
    const pz = (z - GRID_D / 2 + 0.5) * VOXEL_SIZE;
    const hs = VOXEL_SIZE / 2;
    const whs = hs + 0.05; // wireframe half size
    
    let v0, v1, v2, v3;
    let wv0, wv1, wv2, wv3;
    let norm;
    
    if (dir === 0) { // +x
      v0 = [px + hs, py - hs, pz + hs]; v1 = [px + hs, py - hs, pz - hs]; v2 = [px + hs, py + hs, pz - hs]; v3 = [px + hs, py + hs, pz + hs];
      wv0 = [px + whs, py - whs, pz + whs]; wv1 = [px + whs, py - whs, pz - whs]; wv2 = [px + whs, py + whs, pz - whs]; wv3 = [px + whs, py + whs, pz + whs];
      norm = [1, 0, 0];
    } else if (dir === 1) { // -x
      v0 = [px - hs, py - hs, pz - hs]; v1 = [px - hs, py - hs, pz + hs]; v2 = [px - hs, py + hs, pz + hs]; v3 = [px - hs, py + hs, pz - hs];
      wv0 = [px - whs, py - whs, pz - whs]; wv1 = [px - whs, py - whs, pz + whs]; wv2 = [px - whs, py + whs, pz + whs]; wv3 = [px - whs, py + whs, pz - whs];
      norm = [-1, 0, 0];
    } else if (dir === 2) { // +y
      v0 = [px - hs, py + hs, pz + hs]; v1 = [px + hs, py + hs, pz + hs]; v2 = [px + hs, py + hs, pz - hs]; v3 = [px - hs, py + hs, pz - hs];
      wv0 = [px - whs, py + whs, pz + whs]; wv1 = [px + whs, py + whs, pz + whs]; wv2 = [px + whs, py + whs, pz - whs]; wv3 = [px - whs, py + whs, pz - whs];
      norm = [0, 1, 0];
    } else if (dir === 3) { // -y
      v0 = [px - hs, py - hs, pz - hs]; v1 = [px + hs, py - hs, pz - hs]; v2 = [px + hs, py - hs, pz + hs]; v3 = [px - hs, py - hs, pz + hs];
      wv0 = [px - whs, py - whs, pz - whs]; wv1 = [px + whs, py - whs, pz - whs]; wv2 = [px + whs, py - whs, pz + whs]; wv3 = [px - whs, py - whs, pz + whs];
      norm = [0, -1, 0];
    } else if (dir === 4) { // +z
      v0 = [px - hs, py - hs, pz + hs]; v1 = [px + hs, py - hs, pz + hs]; v2 = [px + hs, py + hs, pz + hs]; v3 = [px - hs, py + hs, pz + hs];
      wv0 = [px - whs, py - whs, pz + whs]; wv1 = [px + whs, py - whs, pz + whs]; wv2 = [px + whs, py + whs, pz + whs]; wv3 = [px - whs, py + whs, pz + whs];
      norm = [0, 0, 1];
    } else { // -z
      v0 = [px + hs, py - hs, pz - hs]; v1 = [px - hs, py - hs, pz - hs]; v2 = [px - hs, py + hs, pz - hs]; v3 = [px + hs, py + hs, pz - hs];
      wv0 = [px + whs, py - whs, pz - whs]; wv1 = [px - whs, py - whs, pz - whs]; wv2 = [px - whs, py + whs, pz - whs]; wv3 = [px + whs, py + whs, pz - whs];
      norm = [0, 0, -1];
    }
    
    positions.push(...v0, ...v1, ...v2, ...v3);
    normals.push(...norm, ...norm, ...norm, ...norm);
    colors.push(r, g, b, r, g, b, r, g, b, r, g, b);
    indices.push(vertexOffset, vertexOffset + 1, vertexOffset + 2, vertexOffset, vertexOffset + 2, vertexOffset + 3);
    vertexOffset += 4;
    
    wirePositions.push(...wv0, ...wv1, ...wv2, ...wv3);
    wireIndices.push(wireVertexOffset, wireVertexOffset + 1, wireVertexOffset + 2, wireVertexOffset, wireVertexOffset + 2, wireVertexOffset + 3);
    wireVertexOffset += 4;
  };
  
  for (let z = startZ; z < endZ; z++) {
    for (let y = 0; y < GRID_H; y++) {
      for (let x = startX; x < endX; x++) {
        const colorIdx = volume[getIdx(x, y, z)];
        if (colorIdx === 0) continue;
        
        if (x === GRID_W - 1 || volume[getIdx(x + 1, y, z)] === 0) addFace(x, y, z, 0, colorIdx);
        if (x === 0 || volume[getIdx(x - 1, y, z)] === 0) addFace(x, y, z, 1, colorIdx);
        if (y === GRID_H - 1 || volume[getIdx(x, y + 1, z)] === 0) addFace(x, y, z, 2, colorIdx);
        if (y === 0 || volume[getIdx(x, y - 1, z)] === 0) addFace(x, y, z, 3, colorIdx);
        if (z === GRID_D - 1 || volume[getIdx(x, y, z + 1)] === 0) addFace(x, y, z, 4, colorIdx);
        if (z === 0 || volume[getIdx(x, y, z - 1)] === 0) addFace(x, y, z, 5, colorIdx);
      }
    }
  }
  
  const geo = new THREE.BufferGeometry();
  if (positions.length > 0) {
    geo.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
    geo.setAttribute('normal', new THREE.Float32BufferAttribute(normals, 3));
    geo.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));
    geo.setIndex(indices);
    geo.computeBoundingSphere();
    geo.computeBoundingBox();
  }
  
  const wireGeo = new THREE.BufferGeometry();
  if (wirePositions.length > 0) {
    wireGeo.setAttribute('position', new THREE.Float32BufferAttribute(wirePositions, 3));
    wireGeo.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));
    wireGeo.setIndex(wireIndices);
    wireGeo.computeBoundingSphere();
    wireGeo.computeBoundingBox();
  }
  
  return { geometry: geo, wireframeGeometry: wireGeo };
};

const generateChunks = (seed: number) => {
  const volume = generateVolume(seed);
  
  const getIdx = (x: number, y: number, z: number) => x + y * GRID_W + z * GRID_W * GRID_H;
  
  // Greedy Meshing
  const visited = new Uint8Array(GRID_W * GRID_H * GRID_D);
  const meshes: { position: [number, number, number], scale: [number, number, number], colorIdx: number }[] = [];
  
  for (let z = 0; z < GRID_D; z++) {
    for (let y = 0; y < GRID_H; y++) {
      for (let x = 0; x < GRID_W; x++) {
        const idx = getIdx(x, y, z);
        const colorIdx = volume[idx];
        if (colorIdx === 0 || visited[idx]) continue;
        
        let w = 1;
        while (x + w < GRID_W && volume[getIdx(x + w, y, z)] === colorIdx && !visited[getIdx(x + w, y, z)]) {
          w++;
        }
        
        let h = 1;
        let canExpandY = true;
        while (y + h < GRID_H && canExpandY) {
          for (let ix = 0; ix < w; ix++) {
            if (volume[getIdx(x + ix, y + h, z)] !== colorIdx || visited[getIdx(x + ix, y + h, z)]) {
              canExpandY = false;
              break;
            }
          }
          if (canExpandY) h++;
        }
        
        let d = 1;
        let canExpandZ = true;
        while (z + d < GRID_D && canExpandZ) {
          for (let iy = 0; iy < h; iy++) {
            for (let ix = 0; ix < w; ix++) {
              if (volume[getIdx(x + ix, y + iy, z + d)] !== colorIdx || visited[getIdx(x + ix, y + iy, z + d)]) {
                canExpandZ = false;
                break;
              }
            }
            if (!canExpandZ) break;
          }
          if (canExpandZ) d++;
        }
        
        for (let dz = 0; dz < d; dz++) {
          for (let dy = 0; dy < h; dy++) {
            for (let dx = 0; dx < w; dx++) {
              visited[getIdx(x + dx, y + dy, z + dz)] = 1;
            }
          }
        }
        
        meshes.push({
          position: [
            (x + w / 2 - GRID_W / 2) * VOXEL_SIZE,
            (y + h / 2) * VOXEL_SIZE,
            (z + d / 2 - GRID_D / 2) * VOXEL_SIZE
          ],
          scale: [w * VOXEL_SIZE, h * VOXEL_SIZE, d * VOXEL_SIZE],
          colorIdx
        });
      }
    }
  }
  
  const numChunks = 5;
  const chunkSize = 2000 / numChunks;
  
  const chunkData = Array.from({ length: numChunks * numChunks }, (_, i) => {
    const cx = i % numChunks;
    const cz = Math.floor(i / numChunks);
    const centerX = (cx + 0.5) * chunkSize - 1000;
    const centerZ = (cz + 0.5) * chunkSize - 1000;
    return {
      cx,
      cz,
      positions: [] as [number, number, number][],
      scales: [] as [number, number, number][],
      colors: [] as number[],
      center: [centerX, 0, centerZ]
    };
  });

  const palette = ['#000000', '#00ffff', '#ff00ff', '#ffff00', '#00ff00'];
  const colorObj = new THREE.Color();

  for (const mesh of meshes) {
    const cx = Math.floor((mesh.position[0] + 1000) / chunkSize);
    const cz = Math.floor((mesh.position[2] + 1000) / chunkSize);
    const safeCx = Math.max(0, Math.min(numChunks - 1, cx));
    const safeCz = Math.max(0, Math.min(numChunks - 1, cz));
    const chunkIdx = safeCx + safeCz * numChunks;

    chunkData[chunkIdx].positions.push(mesh.position as [number, number, number]);
    chunkData[chunkIdx].scales.push(mesh.scale as [number, number, number]);
    
    colorObj.set(palette[mesh.colorIdx]);
    chunkData[chunkIdx].colors.push(colorObj.r, colorObj.g, colorObj.b);
  }
  
  const finalChunkData = chunkData.map(data => {
    const count = data.positions.length;
    const matrices = new Float32Array(count * 16);
    const wireframeMatrices = new Float32Array(count * 16);
    const colors = new Float32Array(count * 3);
    
    const dummy = new THREE.Object3D();
    const wireframeDummy = new THREE.Object3D();
    
    for (let i = 0; i < count; i++) {
      dummy.position.set(data.positions[i][0], data.positions[i][1], data.positions[i][2]);
      dummy.scale.set(data.scales[i][0], data.scales[i][1], data.scales[i][2]);
      dummy.updateMatrix();
      dummy.matrix.toArray(matrices, i * 16);

      wireframeDummy.position.copy(dummy.position);
      wireframeDummy.scale.set(data.scales[i][0] + 0.05, data.scales[i][1] + 0.05, data.scales[i][2] + 0.05);
      wireframeDummy.updateMatrix();
      wireframeDummy.matrix.toArray(wireframeMatrices, i * 16);

      colors[i * 3] = data.colors[i * 3];
      colors[i * 3 + 1] = data.colors[i * 3 + 1];
      colors[i * 3 + 2] = data.colors[i * 3 + 2];
    }
    
    return { 
      ...data, 
      matrices, 
      wireframeMatrices, 
      colorsArray: colors,
      ...generateFaceCulledGeometry(volume, data.cx, data.cz, numChunks)
    };
  });

  return finalChunkData;
};

function RandomObstacles() {
  const seed = useGameStore((state) => state.seed);
  const chunks = useMemo(() => generateChunks(seed), [seed]);

  return (
    <group>
      {chunks.map((chunk, i) => (
        <ObstacleChunk key={i} data={chunk} />
      ))}
    </group>
  );
}

function ObstacleChunk({ data }: { data: any }) {
  const meshRef = useRef<THREE.InstancedMesh>(null);
  const wireframeRef = useRef<THREE.InstancedMesh>(null);
  const groupRef = useRef<THREE.Group>(null);
  const materialRef = useRef<THREE.MeshStandardMaterial>(null);
  const renderDistance = useGameStore((state) => state.renderDistance);
  const enableLighting = useGameStore((state) => state.enableLighting);
  const ultraVisuals = useGameStore((state) => state.ultraVisuals);
  const envMap = useGameStore((state) => state.envMap);
  
  const { matrices, wireframeMatrices, colorsArray, center } = data;
  const box = useMemo(() => {
    const min = new THREE.Vector3(center[0] - 200, -100, center[2] - 200);
    const max = new THREE.Vector3(center[0] + 200, 100, center[2] + 200);
    return new THREE.Box3(min, max);
  }, [center]);

  const frustum = useMemo(() => new THREE.Frustum(), []);
  const projScreenMatrix = useMemo(() => new THREE.Matrix4(), []);

  const [isClose, setIsClose] = useState(false);

  useFrame(({ camera }) => {
    if (groupRef.current) {
      const dist = box.distanceToPoint(camera.position);
      if (dist >= renderDistance) {
        groupRef.current.visible = false;
        return;
      }
      
      projScreenMatrix.multiplyMatrices(camera.projectionMatrix, camera.matrixWorldInverse);
      frustum.setFromProjectionMatrix(projScreenMatrix);
      
      groupRef.current.visible = frustum.intersectsBox(box);

      const close = dist < 250;
      if (isClose !== close) {
        setIsClose(close);
      }
    }
  });

  useEffect(() => {
    if (materialRef.current && enableLighting) {
      if (isClose && ultraVisuals) {
        materialRef.current.roughness = 0.05;
        materialRef.current.metalness = 0.95;
        materialRef.current.envMap = envMap;
        materialRef.current.envMapIntensity = 1.5;
      } else {
        materialRef.current.roughness = isClose ? 0.2 : 0.7;
        materialRef.current.metalness = isClose ? 0.8 : 0.1;
        materialRef.current.envMap = null;
        materialRef.current.envMapIntensity = 1.0;
      }
      materialRef.current.needsUpdate = true;
    }
  }, [isClose, envMap, enableLighting, ultraVisuals]);

  useEffect(() => {
    if (meshRef.current) {
      meshRef.current.computeBoundingSphere();
    }
    if (wireframeRef.current) {
      wireframeRef.current.computeBoundingSphere();
    }
  }, [matrices]);

  if (data.positions.length === 0) return null;

  return (
    <group ref={groupRef}>
      <RigidBody type="fixed">
        {data.positions.map((pos: any, i: number) => (
          <CuboidCollider 
            key={i} 
            position={pos} 
            args={[data.scales[i][0] / 2, data.scales[i][1] / 2, data.scales[i][2] / 2]} 
          />
        ))}
      </RigidBody>
      <instancedMesh castShadow={enableLighting} receiveShadow={enableLighting} ref={meshRef} args={[undefined, undefined, data.positions.length]} frustumCulled={true}>
        <instancedBufferAttribute attach="instanceMatrix" args={[matrices, 16]} />
        <instancedBufferAttribute attach="instanceColor" args={[colorsArray, 3]} />
        <boxGeometry />
        {enableLighting ? <meshStandardMaterial ref={materialRef} color="#333" roughness={0.7} metalness={0.1} /> : <meshBasicMaterial color="#111" />}
      </instancedMesh>
      <instancedMesh ref={wireframeRef} args={[undefined, undefined, data.positions.length]} frustumCulled={true}>
        <instancedBufferAttribute attach="instanceMatrix" args={[wireframeMatrices, 16]} />
        <instancedBufferAttribute attach="instanceColor" args={[colorsArray, 3]} />
        <boxGeometry />
        <meshBasicMaterial 
          wireframe 
          transparent 
          opacity={0.4} 
        />
      </instancedMesh>
    </group>
  );
}


