import { useEffect, useRef, useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { useGameStore } from '../../store/gameStore';

function Tornado() {
  const ref = useRef<THREE.Group>(null);
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
      const dist = Math.sqrt((me.x - position.x)**2 + (me.z - position.z)**2);
      if (dist < 20) {
        // Apply damage every frame? No, throttle it.
        // We can just send a damage event to the server.
        // But doing it every frame is bad.
        // Let's use a ref for last damage time.
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
      <mesh castShadow={enableLighting} position={[0, 20, 0]}>
        <cylinderGeometry args={[15, 2, 40, 16]} />
        {enableLighting ? <meshStandardMaterial color="#555555" transparent opacity={0.8} /> : <meshBasicMaterial color="#555555" transparent opacity={0.8} />}
      </mesh>
    </group>
  );
}

function LavaSpots() {
  const seed = useGameStore(state => state.seed);
  const activeEvent = useGameStore(state => state.activeEvent);
  
  const spots = useMemo(() => {
    let s = seed + (activeEvent?.startTime || 0);
    const random = () => {
      s = Math.sin(s) * 10000;
      return s - Math.floor(s);
    };
    const targets = activeEvent?.targets && activeEvent.targets.length > 0 ? activeEvent.targets : [{x: 0, z: 0}];
    
    return Array.from({ length: 20 }).map((_, i) => {
      const target = targets[i % targets.length];
      return {
        x: target.x + (random() - 0.5) * 80,
        z: target.z + (random() - 0.5) * 80,
        radius: 10 + random() * 10
      };
    });
  }, [seed, activeEvent?.startTime, activeEvent?.targets]);

  const myId = useGameStore(state => state.myId);
  const players = useGameStore(state => state.players);
  const socket = useGameStore(state => state.socket);
  const lastDamage = useRef(0);

  useFrame(() => {
    if (myId && players[myId] && players[myId].health > 0) {
      const me = players[myId];
      let inLava = false;
      for (const spot of spots) {
        const dist = Math.sqrt((me.x - spot.x)**2 + (me.z - spot.z)**2);
        if (dist < spot.radius) {
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

  return (
    <group>
      {spots.map((spot, i) => (
        <mesh receiveShadow={enableLighting} key={i} position={[spot.x, 0.1, spot.z]} rotation={[-Math.PI / 2, 0, 0]}>
          <circleGeometry args={[spot.radius, 32]} />
          {enableLighting ? <meshStandardMaterial color="#ff3300" emissive="#ff3300" emissiveIntensity={0.5} /> : <meshBasicMaterial color="#ff3300" />}
        </mesh>
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

  const geometry = useMemo(() => new THREE.SphereGeometry(2, 16, 16), []);
  const materialBasic = useMemo(() => new THREE.MeshBasicMaterial({ color: '#ff8800' }), []);
  const materialStd = useMemo(() => new THREE.MeshStandardMaterial({ color: '#ff8800', emissive: '#ff8800', emissiveIntensity: 0.5 }), []);
  const material = enableLighting ? materialStd : materialBasic;

  useEffect(() => {
    return () => {
      for (const m of meteors.current) {
        if (m.mesh) {
          groupRef.current?.remove(m.mesh);
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
        mesh: null
      });
    }
    
    const nextMeteors: any[] = [];
    for (let i = 0; i < meteors.current.length; i++) {
      const m = meteors.current[i];
      m.y -= m.speed * delta;
      
      if (m.mesh) {
        m.mesh.position.set(m.x, m.y, m.z);
      }

      if (m.y <= m.targetY) {
        // Explode
        if (myId && players[myId] && players[myId].health > 0) {
          const me = players[myId];
          const dist = Math.sqrt((me.x - m.x)**2 + (me.z - m.z)**2);
          if (dist < 30) {
            socket?.emit('takeEnvironmentalDamage', 40);
          }
        }
        if (m.mesh) {
          groupRef.current.remove(m.mesh);
        }
      } else {
        nextMeteors.push(m);
      }
    }
    
    // Add new meshes
    for (const m of nextMeteors) {
      if (!m.mesh) {
        const mesh = new THREE.Mesh(geometry, material);
        mesh.castShadow = enableLighting;
        mesh.position.set(m.x, m.y, m.z);
        groupRef.current.add(mesh);
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
