import { useEffect, useRef, useMemo, useState } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import * as THREE from 'three';
import { Sparkles, Trail } from '@react-three/drei';
import { useGameStore } from '../../store/gameStore';
import { useFrustumCulling } from './Entities';
import { generateVolume, getTerrainHeight, getHighestBlockY } from '../../utils/mapGen';

function Tornado() {
  const ref = useRef<THREE.Group>(null);
  useFrustumCulling(ref, 20);
  const myId = useGameStore(state => state.myId);
  const players = useGameStore(state => state.players);
  const socket = useGameStore(state => state.socket);
  const seed = useGameStore(state => state.seed);
  const activeEvent = useGameStore(state => state.activeEvent);
  
  const { initialPosition, initialVelocity } = useMemo(() => {
    let s = seed + (activeEvent?.startTime || 0);
    const random = () => {
      s = Math.sin(s) * 10000;
      return s - Math.floor(s);
    };
    const targets = activeEvent?.targets && activeEvent.targets.length > 0 ? activeEvent.targets : [{x: 0, z: 0}];
    const target = targets[Math.floor(random() * targets.length)];
    return {
      initialPosition: new THREE.Vector3(target.x + (random() - 0.5) * 60, 0, target.z + (random() - 0.5) * 60),
      initialVelocity: new THREE.Vector3(random() - 0.5, 0, random() - 0.5).normalize().multiplyScalar(20)
    };
  }, [seed, activeEvent?.startTime, activeEvent?.targets]);

  const position = useMemo(() => initialPosition.clone(), [initialPosition]);
  const velocity = useMemo(() => initialVelocity.clone(), [initialVelocity]);
  
  useFrame((state, delta) => {
    if (!ref.current) return;
    
    // Move tornado
    position.add(velocity.clone().multiplyScalar(delta));
    
    // Keep within bounds
    if (position.x > 1000 || position.x < -1000) velocity.x *= -1;
    if (position.z > 1000 || position.z < -1000) velocity.z *= -1;
    
    ref.current.position.copy(position);
    ref.current.rotation.y += delta * 5;
    
    // Damage detection
    if (myId && players[myId] && players[myId].health > 0) {
      const me = players[myId];
      const dist2D = Math.sqrt((me.x - position.x)**2 + (me.z - position.z)**2);
      const distY = Math.abs(me.y - position.y);
      
      if (dist2D < 20 && distY < 40) { // Tornado is 40 units tall
        const now = Date.now();
        if (!ref.current.userData.lastDamage || now - ref.current.userData.lastDamage > 1000) {
          ref.current.userData.lastDamage = now;
          socket?.emit('takeEnvironmentalDamage', 20);
        }
      }
    }
  });

  const enableLighting = useGameStore(state => state.enableLighting);

  return (
    <group ref={ref}>
      {/* Tornado Funnel made of multiple rings */}
      {Array.from({ length: 15 }).map((_, i) => {
        const height = 40;
        const y = (i / 15) * height;
        const radius = 2 + (y / height) * 13;
        return (
          <mesh key={i} castShadow={enableLighting} position={[0, y, 0]} rotation={[Math.random(), Math.random(), Math.random()]}>
            <torusGeometry args={[radius, radius * 0.3, 8, 16]} />
            {enableLighting ? (
              <meshStandardMaterial color="#444444" roughness={0.9} metalness={0.1} transparent opacity={0.6} />
            ) : (
              <meshBasicMaterial color="#444444" transparent opacity={0.6} />
            )}
          </mesh>
        );
      })}
      {/* Debris particles */}
      <Sparkles count={200} scale={[30, 40, 30]} position={[0, 20, 0]} color="#222222" size={6} speed={2} opacity={0.8} />
      <Sparkles count={100} scale={[20, 40, 20]} position={[0, 20, 0]} color="#555555" size={4} speed={3} opacity={0.6} />
    </group>
  );
}

function LavaSpots() {
  const seed = useGameStore(state => state.seed);
  const activeEvent = useGameStore(state => state.activeEvent);
  const [placedSpots, setPlacedSpots] = useState<any[]>([]);
  
  const spots = useMemo(() => {
    let s = seed + (activeEvent?.startTime || 0);
    const random = () => {
      s = Math.sin(s) * 10000;
      return s - Math.floor(s);
    };
    const targets = activeEvent?.targets && activeEvent.targets.length > 0 ? activeEvent.targets : [{x: 0, z: 0}];
    
    return Array.from({ length: 30 }).map((_, i) => {
      const target = targets[i % targets.length];
      
      // Parkour course style: scatter them but keep a minimum distance from the target
      let dx = (random() - 0.5) * 150;
      let dz = (random() - 0.5) * 150;
      
      // Ensure it's not directly on the player
      if (Math.abs(dx) < 15) dx = 15 * Math.sign(dx || 1);
      if (Math.abs(dz) < 15) dz = 15 * Math.sign(dz || 1);

      return {
        x: target.x + dx,
        z: target.z + dz,
        radius: 8 + random() * 10
      };
    });
  }, [seed, activeEvent?.startTime, activeEvent?.targets]);

  const gameMode = useGameStore(state => state.gameMode);

  useEffect(() => {
    const volume = generateVolume(seed, gameMode === 'pve');
    
    const newSpots = spots.map(spot => {
      const terrainY = gameMode === 'pve' ? 0 : getTerrainHeight(spot.x, spot.z);
      const blockY = getHighestBlockY(volume, spot.x, spot.z);
      
      return {
        ...spot,
        y: Math.max(terrainY, blockY) + 0.1
      };
    });
    
    setPlacedSpots(newSpots);
  }, [spots, seed, gameMode]);

  const myId = useGameStore(state => state.myId);
  const players = useGameStore(state => state.players);
  const socket = useGameStore(state => state.socket);
  const lastDamage = useRef(0);

  useFrame(() => {
    if (myId && players[myId] && players[myId].health > 0) {
      const me = players[myId];
      let inLava = false;
      for (const spot of placedSpots) {
        const dist2D = Math.sqrt((me.x - spot.x)**2 + (me.z - spot.z)**2);
        const distY = Math.abs(me.y - spot.y);
        
        // Only damage if touching (within radius and very close vertically)
        if (dist2D < spot.radius && distY < 2.0) {
          inLava = true;
          break;
        }
      }
      
      if (inLava) {
        const now = Date.now();
        if (now - lastDamage.current > 1000) {
          lastDamage.current = now;
          socket?.emit('takeEnvironmentalDamage', 15);
        }
      }
    }
  });

  const enableLighting = useGameStore(state => state.enableLighting);

  const geometry = useMemo(() => new THREE.CircleGeometry(1, 32), []);
  const materialStd = useMemo(() => new THREE.MeshStandardMaterial({ color: "#ff3300", emissive: "#ff4400", emissiveIntensity: 2, roughness: 0.2, metalness: 0.8 }), []);
  const materialBasic = useMemo(() => new THREE.MeshBasicMaterial({ color: "#ff3300" }), []);
  const material = enableLighting ? materialStd : materialBasic;

  useEffect(() => {
    return () => {
      geometry.dispose();
      materialStd.dispose();
      materialBasic.dispose();
    };
  }, [geometry, materialStd, materialBasic]);

  return (
    <group>
      {placedSpots.map((spot, i) => (
        <group key={i} position={[spot.x, spot.y, spot.z]}>
          <mesh receiveShadow={enableLighting} rotation={[-Math.PI / 2, 0, 0]} scale={[spot.radius, spot.radius, 1]} geometry={geometry} material={material} />
          <Sparkles count={Math.floor(spot.radius * 5)} scale={[spot.radius * 2, 2, spot.radius * 2]} position={[0, 1, 0]} color="#ffaa00" size={4} speed={0.4} opacity={0.8} />
        </group>
      ))}
    </group>
  );
}

function Meteorites() {
  const myId = useGameStore(state => state.myId);
  const players = useGameStore(state => state.players);
  const socket = useGameStore(state => state.socket);
  const seed = useGameStore(state => state.seed);
  const activeEvent = useGameStore(state => state.activeEvent);
  const enableLighting = useGameStore(state => state.enableLighting);
  const groupRef = useRef<THREE.Group>(null);
  const meteors = useRef<any[]>([]);
  const lastSpawnTime = useRef(0);

  const geometry = useMemo(() => {
    const geo = new THREE.DodecahedronGeometry(3, 1);
    // Add some noise to make it look like a rock
    const pos = geo.attributes.position;
    for (let i = 0; i < pos.count; i++) {
      pos.setXYZ(
        i,
        pos.getX(i) * (0.8 + Math.random() * 0.4),
        pos.getY(i) * (0.8 + Math.random() * 0.4),
        pos.getZ(i) * (0.8 + Math.random() * 0.4)
      );
    }
    geo.computeVertexNormals();
    return geo;
  }, []);
  
  const materialBasic = useMemo(() => new THREE.MeshBasicMaterial({ color: '#ff4400' }), []);
  const materialStd = useMemo(() => new THREE.MeshStandardMaterial({ 
    color: '#331100', 
    emissive: '#ff4400', 
    emissiveIntensity: 0.8,
    roughness: 0.9,
    metalness: 0.2
  }), []);
  const material = enableLighting ? materialStd : materialBasic;

  useEffect(() => {
    return () => {
      for (const m of meteors.current) {
        if (m.group) {
          groupRef.current?.remove(m.group);
        }
      }
      geometry.dispose();
      materialBasic.dispose();
      materialStd.dispose();
    };
  }, [geometry, materialBasic, materialStd]);

  useFrame((state, delta) => {
    if (!groupRef.current || !activeEvent) return;
    
    const now = Date.now();
    const elapsed = now - activeEvent.startTime;
    
    // Spawn a meteor every 1000ms
    if (now - lastSpawnTime.current > 1000) {
      lastSpawnTime.current = now;
      
      let s = seed + elapsed;
      const random = () => {
        s = Math.sin(s) * 10000;
        return s - Math.floor(s);
      };
      
      const targets = activeEvent.targets && activeEvent.targets.length > 0 ? activeEvent.targets : [{x: 0, z: 0}];
      const target = targets[Math.floor(random() * targets.length)];
      
      meteors.current.push({
        id: Math.random().toString(),
        x: target.x + (random() - 0.5) * 100,
        z: target.z + (random() - 0.5) * 100,
        y: 200,
        targetY: 0,
        speed: 50 + random() * 50,
        group: null,
        mesh: null
      });
    }
    
    const nextMeteors: any[] = [];
    for (let i = 0; i < meteors.current.length; i++) {
      const m = meteors.current[i];
      m.y -= m.speed * delta;
      
      if (m.group) {
        m.group.position.set(m.x, m.y, m.z);
        if (m.mesh) {
          m.mesh.rotation.x += delta * 2;
          m.mesh.rotation.y += delta * 3;
        }
      }

      if (m.y <= m.targetY) {
        // Explode
        if (myId && players[myId] && players[myId].health > 0) {
          const me = players[myId];
          const dist2D = Math.sqrt((me.x - m.x)**2 + (me.z - m.z)**2);
          const distY = Math.abs(me.y - m.y);
          if (dist2D < 30 && distY < 15) {
            socket?.emit('takeEnvironmentalDamage', 40);
          }
        }
        if (m.group) {
          groupRef.current.remove(m.group);
        }
      } else {
        nextMeteors.push(m);
      }
    }
    
    // Add new meshes
    for (const m of nextMeteors) {
      if (!m.group) {
        const group = new THREE.Group();
        group.position.set(m.x, m.y, m.z);
        
        const mesh = new THREE.Mesh(geometry, material);
        mesh.castShadow = enableLighting;
        group.add(mesh);
        
        // Add trail particles (simulated with a simple mesh or we could use Sparkles but Sparkles doesn't easily trail dynamically without complex setup, so we just attach it to the group)
        // Actually, Sparkles inside the group will move with it!
        // Wait, Sparkles in a moving group might look weird if they don't leave a trail. 
        // We'll just add a glowing core.
        const glowGeo = new THREE.SphereGeometry(3.5, 8, 8);
        const glowMat = new THREE.MeshBasicMaterial({ color: '#ffaa00', transparent: true, opacity: 0.4, blending: THREE.AdditiveBlending });
        const glowMesh = new THREE.Mesh(glowGeo, glowMat);
        group.add(glowMesh);

        groupRef.current.add(group);
        m.group = group;
        m.mesh = mesh;
      }
    }
    
    meteors.current = nextMeteors;
  });

  return <group ref={groupRef} />;
}

export function SpecialEvents() {
  const activeEvent = useGameStore(state => state.activeEvent);

  if (!activeEvent) return null;

  return (
    <>
      {activeEvent.type === 'tornado' && <Tornado />}
      {activeEvent.type === 'lava' && <LavaSpots />}
      {activeEvent.type === 'meteorite' && <Meteorites />}
    </>
  );
}
