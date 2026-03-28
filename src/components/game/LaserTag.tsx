import { useEffect, useState, useRef } from 'react';
import { Canvas, useThree } from '@react-three/fiber';
import { Physics } from '@react-three/rapier';
import * as THREE from 'three';
import { useGameStore } from '../../store/gameStore';
import { Map } from './Map';
import { LocalPlayer } from './LocalPlayer';
import { RemotePlayer } from './RemotePlayer';
import { UI } from './UI';
import { Entities } from './Entities';

import { PerformanceMonitor, Stats, AdaptiveDpr, BakeShadows } from '@react-three/drei';

function GameSettings() {
  const { camera, invalidate, frameloop } = useThree();
  const renderDistance = useGameStore((state) => state.renderDistance);
  const fpsLimit = useGameStore((state) => state.fpsLimit);

  useEffect(() => {
    camera.far = renderDistance;
    camera.updateProjectionMatrix();
  }, [renderDistance, camera]);

  useEffect(() => {
    if (fpsLimit <= 0 || frameloop !== 'demand') return;

    let frameId: number;
    let lastTime = performance.now();

    const loop = (time: number) => {
      frameId = requestAnimationFrame(loop);
      const delta = time - lastTime;
      const interval = 1000 / fpsLimit;

      if (delta >= interval) {
        lastTime = time - (delta % interval);
        invalidate();
      }
    };

    frameId = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(frameId);
  }, [fpsLimit, invalidate, frameloop]);

  return null;
}

const laserGeo = new THREE.CylinderGeometry(1, 1, 1, 8);

const laserMaterials: Record<string, THREE.MeshBasicMaterial> = {};
function getLaserMaterial(color: string) {
  if (!laserMaterials[color]) {
    laserMaterials[color] = new THREE.MeshBasicMaterial({ color });
  }
  return laserMaterials[color];
}

function Laser({ laser }: { laser: any }) {
  const ref = useRef<THREE.Mesh>(null);
  
  useEffect(() => {
    if (!ref.current) return;
    const from = new THREE.Vector3(...laser.from);
    const to = new THREE.Vector3(...laser.to);
    const distance = from.distanceTo(to);
    const position = from.clone().lerp(to, 0.5);
    
    ref.current.position.copy(position);
    ref.current.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), to.clone().sub(from).normalize());
    ref.current.scale.set(0.05, distance, 0.05);
  }, [laser]);

  return (
    <mesh ref={ref} geometry={laserGeo} material={getLaserMaterial(laser.color)} />
  );
}

function Lasers() {
  const lasers = useGameStore((state) => state.lasers);
  return (
    <>
      {lasers.map((laser) => (
        <Laser key={laser.id} laser={laser} />
      ))}
    </>
  );
}

function Shockwave({ sw }: { sw: any }) {
  const ref = useRef<THREE.Mesh>(null);
  const [opacity, setOpacity] = useState(0.5);

  useEffect(() => {
    let startTime = Date.now();
    const interval = setInterval(() => {
      const elapsed = Date.now() - startTime;
      const progress = elapsed / 1000;
      if (progress >= 1) {
        clearInterval(interval);
        return;
      }
      setOpacity(0.5 * (1 - progress));
      if (ref.current) {
        ref.current.scale.setScalar(progress * sw.radius * 2);
      }
    }, 16);
    return () => clearInterval(interval);
  }, [sw.radius]);

  return (
    <mesh ref={ref} position={[sw.x, sw.y, sw.z]}>
      <sphereGeometry args={[1, 32, 32]} />
      <meshBasicMaterial color="#ff00ff" transparent opacity={opacity} wireframe />
    </mesh>
  );
}

function Shockwaves() {
  const shockwaves = useGameStore((state) => state.shockwaves);
  return (
    <>
      {shockwaves.map((sw) => (
        <Shockwave key={sw.id} sw={sw} />
      ))}
    </>
  );
}

function RemotePlayers() {
  const players = useGameStore((state) => state.players);
  const myId = useGameStore((state) => state.myId);

  return (
    <>
      {Object.values(players).map((player) => {
        if (player.id === myId) return null;
        return <RemotePlayer key={player.id} player={player} />;
      })}
    </>
  );
}

export function LaserTag({ nickname, isAdmin, gameMode, difficulty }: { nickname: string, isAdmin: boolean, gameMode: 'pvp' | 'pve', difficulty: 'easy' | 'normal' | 'hard' | 'nightmare' }) {
  const connect = useGameStore((state) => state.connect);
  const disconnect = useGameStore((state) => state.disconnect);
  const myId = useGameStore((state) => state.myId);
  const renderDistance = useGameStore((state) => state.renderDistance);
  const dynamicResolution = useGameStore((state) => state.dynamicResolution);
  const fpsLimit = useGameStore((state) => state.fpsLimit);
  const showFps = useGameStore((state) => state.showFps);
  const [dpr, setDpr] = useState(1);

  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    setIsMobile(/iPhone|iPad|iPod|Android/i.test(navigator.userAgent));
    connect(nickname, isAdmin, gameMode, difficulty);
    return () => disconnect();
  }, [connect, disconnect, nickname, isAdmin, gameMode, difficulty]);

  if (!myId) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-black text-cyan-400 font-mono text-xl">
        Connecting to Server...
      </div>
    );
  }

  return (
    <div className="w-full h-screen bg-black relative overflow-hidden touch-none">
      <Canvas 
        shadows={{ type: THREE.PCFShadowMap }} 
        camera={{ fov: 75, far: renderDistance }} 
        dpr={dynamicResolution ? dpr : 1}
        frameloop={fpsLimit > 0 ? 'demand' : 'always'}
        gl={{ powerPreference: "high-performance", antialias: false }}
      >
        <GameSettings />
        {showFps && <Stats />}
        {dynamicResolution && (
          <>
            <PerformanceMonitor onIncline={() => setDpr(2)} onDecline={() => setDpr(0.5)} />
            <AdaptiveDpr pixelated />
          </>
        )}
        <BakeShadows />
        <color attach="background" args={['#050505']} />
        <fog attach="fog" args={['#050505', renderDistance * 0.2, renderDistance]} />
        
        <ambientLight intensity={0.5} />
        <directionalLight castShadow position={[10, 20, 10]} intensity={0.8} />

        <Physics gravity={[0, -9.81, 0]}>
          <Map />
          <LocalPlayer isMobile={isMobile} />
          <RemotePlayers />
          <Entities />
        </Physics>

        {/* Lasers */}
        <Lasers />
        <Shockwaves />
      </Canvas>

      <UI isMobile={isMobile} isAdmin={isAdmin} />
    </div>
  );
}
