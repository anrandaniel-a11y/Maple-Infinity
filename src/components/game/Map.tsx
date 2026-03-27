import { useMemo, useRef, useEffect, useState } from 'react';
import * as THREE from 'three';
import { useFrame } from '@react-three/fiber';
import { RigidBody, CuboidCollider, InstancedRigidBodies } from '@react-three/rapier';
import { useGameStore } from '../../store/gameStore';
import { WeaponModel } from './WeaponModel';
import { generateVolume, VOXEL_SIZE, GRID_W, GRID_H, GRID_D } from '../../utils/mapGen';

export function Map() {
  const mapIndex = useGameStore((state) => state.mapIndex);
  const gameMode = useGameStore((state) => state.gameMode);

  return (
    <group>
      {/* Real Terrain */}
      <Terrain />

      <RandomObstacles />

      {mapIndex === 0 && <MapLayout1 />}
      {mapIndex === 1 && <MapLayout2 />}
      {mapIndex === 2 && <MapLayout3 />}

      {gameMode === 'pve' && (
        <group>
          {/* PvE Boundary Walls */}
          <RigidBody type="fixed">
            <mesh position={[0, 50, 60]}>
              <boxGeometry args={[120, 100, 2]} />
              <meshStandardMaterial color="#ff0000" transparent opacity={0.2} />
            </mesh>
          </RigidBody>
          <RigidBody type="fixed">
            <mesh position={[0, 50, -60]}>
              <boxGeometry args={[120, 100, 2]} />
              <meshStandardMaterial color="#ff0000" transparent opacity={0.2} />
            </mesh>
          </RigidBody>
          <RigidBody type="fixed">
            <mesh position={[60, 50, 0]}>
              <boxGeometry args={[2, 100, 120]} />
              <meshStandardMaterial color="#ff0000" transparent opacity={0.2} />
            </mesh>
          </RigidBody>
          <RigidBody type="fixed">
            <mesh position={[-60, 50, 0]}>
              <boxGeometry args={[2, 100, 120]} />
              <meshStandardMaterial color="#ff0000" transparent opacity={0.2} />
            </mesh>
          </RigidBody>
        </group>
      )}

      <Weapons />
      <Medkits />
      <Explosions />
    </group>
  );
}

const weaponBaseGeo = new THREE.CylinderGeometry(1, 1, 0.1, 16);
const weaponBaseMat = new THREE.MeshBasicMaterial({ color: '#ffff00', transparent: true, opacity: 0.3 });

function Weapons() {
  const weapons = useGameStore((state) => state.weapons);
  const groupRef = useRef<THREE.Group>(null);

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
            <mesh position={[0, -0.5, 0]} geometry={weaponBaseGeo} material={weaponBaseMat} />
          </group>
        );
      })}
    </group>
  );
}

const medkitGeo = new THREE.BoxGeometry(1.2, 0.8, 1.2);
const medkitMat = new THREE.MeshStandardMaterial({ color: '#ffffff', roughness: 0.5 });
const medkitCrossGeo = new THREE.BoxGeometry(0.8, 0.82, 0.3);
const medkitCrossGeo2 = new THREE.BoxGeometry(0.3, 0.82, 0.8);
const medkitCrossMat = new THREE.MeshBasicMaterial({ color: '#ff0000' });

function Medkits() {
  const medkits = useGameStore((state) => state.medkits);
  const groupRef = useRef<THREE.Group>(null);

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
            <mesh geometry={medkitGeo} material={medkitMat} />
            <mesh geometry={medkitCrossGeo} material={medkitCrossMat} />
            <mesh geometry={medkitCrossGeo2} material={medkitCrossMat} />
            <mesh position={[0, -0.5, 0]} geometry={weaponBaseGeo} material={weaponBaseMat} />
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

  useFrame(() => {
    if (meshRef.current && materialRef.current) {
      meshRef.current.scale.addScalar(0.5);
      materialRef.current.opacity = Math.max(0, materialRef.current.opacity - 0.05);
    }
  });

  return (
    <mesh ref={meshRef} position={position} geometry={explosionGeo} scale={[radius / 4, radius / 4, radius / 4]}>
      <meshBasicMaterial ref={materialRef} color="#ff4400" transparent opacity={0.8} blending={THREE.AdditiveBlending} />
    </mesh>
  );
}

const generateTerrainGeometry = () => {
  const size = 2000;
  const segments = 128; // Optimized from 128
  const geo = new THREE.PlaneGeometry(size, size, segments, segments);
  geo.rotateX(-Math.PI / 2);
  
  const pos = geo.attributes.position;
  const colors = [];
  const color = new THREE.Color();
  
  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i);
    const z = pos.getZ(i);
    
    // Create hills and valleys using layered sine waves
    let y = Math.sin(x * 0.02) * Math.cos(z * 0.02) * 15;
    y += Math.sin(x * 0.005) * Math.cos(z * 0.005) * 40;
    y += Math.sin(x * 0.1) * Math.cos(z * 0.1) * 2; // small bumps
    
    // Flatten the center area so players don't spawn inside a steep hill
    const distFromCenter = Math.sqrt(x*x + z*z);
    if (distFromCenter < 60) {
      y *= (distFromCenter / 60) ** 2; // Smooth transition
    }

    pos.setY(i, y);
    
    // Color based on height - completely neon now
    if (y < 5) color.setHex(0x001133); // deep neon blue
    else if (y < 20) color.setHex(0x0044ff); // bright blue
    else if (y < 40) color.setHex(0x00ffff); // cyan peaks
    else color.setHex(0xff00ff); // magenta high peaks
    
    colors.push(color.r, color.g, color.b);
  }
  
  geo.computeVertexNormals();
  geo.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));
  
  return geo;
};

const GLOBAL_TERRAIN_GEOMETRY = generateTerrainGeometry();

function Terrain() {
  const geometry = GLOBAL_TERRAIN_GEOMETRY;

  return (
    <RigidBody type="fixed" colliders="trimesh" friction={0.8}>
      <mesh geometry={geometry} receiveShadow>
        <meshStandardMaterial vertexColors roughness={0.8} metalness={0.5} emissive="#444" emissiveIntensity={1.2} />
      </mesh>
      {/* Neon wireframe overlay for the terrain */}
      <mesh geometry={geometry} position={[0, 0.1, 0]}>
        <meshBasicMaterial color="#00ffff" wireframe transparent opacity={0.6} blending={THREE.AdditiveBlending} />
      </mesh>
    </RigidBody>
  );
}

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
  
  const chunkData = Array.from({ length: numChunks * numChunks }, () => ({
    positions: [] as [number, number, number][],
    scales: [] as [number, number, number][],
    colors: [] as number[]
  }));

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
    
    return { ...data, matrices, wireframeMatrices, colorsArray: colors };
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
  
  const { matrices, wireframeMatrices, colorsArray } = data;

  useEffect(() => {
    if (meshRef.current) meshRef.current.computeBoundingSphere();
    if (wireframeRef.current) wireframeRef.current.computeBoundingSphere();
  }, [matrices]);

  if (data.positions.length === 0) return null;

  return (
    <group>
      <RigidBody type="fixed">
        {data.positions.map((pos: any, i: number) => (
          <CuboidCollider 
            key={i} 
            position={pos} 
            args={[data.scales[i][0] / 2, data.scales[i][1] / 2, data.scales[i][2] / 2]} 
          />
        ))}
      </RigidBody>
      <instancedMesh ref={meshRef} args={[undefined, undefined, data.positions.length]} castShadow receiveShadow>
        <instancedBufferAttribute attach="instanceMatrix" args={[matrices, 16]} />
        <instancedBufferAttribute attach="instanceColor" args={[colorsArray, 3]} />
        <boxGeometry />
        <meshStandardMaterial 
          color="#111"
          roughness={0.2} 
          metalness={0.8} 
          onBeforeCompile={(shader) => {
            shader.fragmentShader = shader.fragmentShader.replace(
              '#include <emissivemap_fragment>',
              `
              #include <emissivemap_fragment>
              #ifdef USE_INSTANCING_COLOR
                totalEmissiveRadiance = vColor.rgb * 0.5;
              #endif
              `
            );
          }}
        />
      </instancedMesh>
      <instancedMesh ref={wireframeRef} args={[undefined, undefined, data.positions.length]}>
        <instancedBufferAttribute attach="instanceMatrix" args={[wireframeMatrices, 16]} />
        <instancedBufferAttribute attach="instanceColor" args={[colorsArray, 3]} />
        <boxGeometry />
        <meshBasicMaterial 
          wireframe 
          transparent 
          opacity={0.4} 
          toneMapped={false}
        />
      </instancedMesh>
    </group>
  );
}

function MapLayout1() {
  return (
    <group>
      {/* Center piece */}
      <Obstacle position={[0, 8, 0]} size={[6, 16, 6]} color="#00ffff" />
      <Obstacle position={[0, 2, 0]} size={[12, 4, 12]} color="#ff00ff" />
      
      {/* Outer walls / Cover */}
      <Obstacle position={[-20, 6, -20]} size={[4, 12, 4]} color="#ffff00" />
      <Obstacle position={[20, 6, -20]} size={[4, 12, 4]} color="#00ff00" />
      <Obstacle position={[-20, 6, 20]} size={[4, 12, 4]} color="#00ff00" />
      <Obstacle position={[20, 6, 20]} size={[4, 12, 4]} color="#ffff00" />

      {/* Long corridors */}
      <Obstacle position={[-10, 4, -25]} size={[16, 8, 2]} color="#ff00ff" />
      <Obstacle position={[10, 4, -25]} size={[16, 8, 2]} color="#00ffff" />
      <Obstacle position={[-10, 4, 25]} size={[16, 8, 2]} color="#00ffff" />
      <Obstacle position={[10, 4, 25]} size={[16, 8, 2]} color="#ff00ff" />

      <Obstacle position={[-25, 4, -10]} size={[2, 8, 16]} color="#ffff00" />
      <Obstacle position={[-25, 4, 10]} size={[2, 8, 16]} color="#00ff00" />
      <Obstacle position={[25, 4, -10]} size={[2, 8, 16]} color="#00ff00" />
      <Obstacle position={[25, 4, 10]} size={[2, 8, 16]} color="#ffff00" />

      {/* Scatter blocks */}
      <Obstacle position={[-12, 3, -12]} size={[3, 6, 3]} color="#ff00ff" />
      <Obstacle position={[12, 3, 12]} size={[3, 6, 3]} color="#00ffff" />
      <Obstacle position={[-12, 3, 12]} size={[3, 6, 3]} color="#ffff00" />
      <Obstacle position={[12, 3, -12]} size={[3, 6, 3]} color="#00ff00" />
    </group>
  );
}

function MapLayout2() {
  return (
    <group>
      {/* The Maze */}
      <Obstacle position={[0, 6, 0]} size={[2, 12, 20]} color="#ff00ff" />
      <Obstacle position={[-10, 6, 10]} size={[20, 12, 2]} color="#00ffff" />
      <Obstacle position={[10, 6, -10]} size={[20, 12, 2]} color="#ffff00" />
      
      <Obstacle position={[-20, 6, 0]} size={[2, 12, 30]} color="#00ff00" />
      <Obstacle position={[20, 6, 0]} size={[2, 12, 30]} color="#ff00ff" />
      
      <Obstacle position={[0, 6, -20]} size={[30, 12, 2]} color="#00ffff" />
      <Obstacle position={[0, 6, 20]} size={[30, 12, 2]} color="#ffff00" />

      {/* Inner cover */}
      <Obstacle position={[-5, 3, -5]} size={[2, 6, 2]} color="#00ff00" />
      <Obstacle position={[5, 3, 5]} size={[2, 6, 2]} color="#ff00ff" />
      
      {/* High ground */}
      <Obstacle position={[-15, 4, -15]} size={[6, 8, 6]} color="#00ffff" />
      <Obstacle position={[15, 4, 15]} size={[6, 8, 6]} color="#ffff00" />
    </group>
  );
}

function MapLayout3() {
  return (
    <group>
      {/* The Arena (Open center, lots of small cover) */}
      <Obstacle position={[0, 0.5, 0]} size={[20, 1, 20]} color="#00ffff" />
      
      {/* Pillars */}
      <Obstacle position={[-8, 8, -8]} size={[2, 16, 2]} color="#ff00ff" />
      <Obstacle position={[8, 8, -8]} size={[2, 16, 2]} color="#ffff00" />
      <Obstacle position={[-8, 8, 8]} size={[2, 16, 2]} color="#00ff00" />
      <Obstacle position={[8, 8, 8]} size={[2, 16, 2]} color="#00ffff" />

      {/* Ring walls */}
      <Obstacle position={[-15, 4, 0]} size={[2, 8, 10]} color="#ff00ff" />
      <Obstacle position={[15, 4, 0]} size={[2, 8, 10]} color="#ffff00" />
      <Obstacle position={[0, 4, -15]} size={[10, 8, 2]} color="#00ff00" />
      <Obstacle position={[0, 4, 15]} size={[10, 8, 2]} color="#00ffff" />

      {/* Ramps (approximated with boxes for now) */}
      <Obstacle position={[-12, 2, -12]} size={[4, 4, 4]} color="#ff00ff" />
      <Obstacle position={[12, 2, 12]} size={[4, 4, 4]} color="#ffff00" />
    </group>
  );
}

const obstacleGeo = new THREE.BoxGeometry(1, 1, 1);

const obstacleMaterials: Record<string, THREE.MeshStandardMaterial> = {};
const obstacleWireframeMaterials: Record<string, THREE.MeshBasicMaterial> = {};

function getObstacleMaterial(color: string) {
  if (!obstacleMaterials[color]) {
    obstacleMaterials[color] = new THREE.MeshStandardMaterial({ color: "#111", emissive: color, emissiveIntensity: 0.5, roughness: 0.2, metalness: 0.8 });
  }
  return obstacleMaterials[color];
}

function getObstacleWireframeMaterial(color: string) {
  if (!obstacleWireframeMaterials[color]) {
    obstacleWireframeMaterials[color] = new THREE.MeshBasicMaterial({ color: color, wireframe: true, transparent: true, opacity: 0.3 });
  }
  return obstacleWireframeMaterials[color];
}

function Obstacle({ position, size, color }: { position: [number, number, number], size: [number, number, number], color: string }) {
  return (
    <RigidBody type="fixed" position={position}>
      <CuboidCollider args={[size[0] / 2, size[1] / 2, size[2] / 2]} />
      <mesh castShadow receiveShadow scale={size} geometry={obstacleGeo} material={getObstacleMaterial(color)} />
      {/* Neon Edge Highlights */}
      <mesh scale={[size[0] + 0.05, size[1] + 0.05, size[2] + 0.05]} geometry={obstacleGeo} material={getObstacleWireframeMaterial(color)} />
    </RigidBody>
  );
}
