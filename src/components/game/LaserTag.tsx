import { useEffect, useState, useRef } from 'react';
import { Canvas, useThree, useFrame } from '@react-three/fiber';
import { Physics } from '@react-three/rapier';
import * as THREE from 'three';
import { useGameStore } from '../../store/gameStore';
import { Map } from './Map';
import { LocalPlayer } from './LocalPlayer';
import { RemotePlayer } from './RemotePlayer';
import { UI } from './UI';
import { Entities } from './Entities';
import { SpecialEvents } from './SpecialEvents';
import { WeaponModel } from './WeaponModel';

import { PerformanceMonitor, Stats, AdaptiveDpr, BakeShadows, Text } from '@react-three/drei';
import { EffectComposer, Bloom } from '@react-three/postprocessing';
import { BlendFunction } from 'postprocessing';

import { TeamLobby } from './TeamLobby';

function GameSettings() {
  const { camera, invalidate, frameloop } = useThree();
  const renderDistance = useGameStore((state) => state.renderDistance);
  const fpsLimit = useGameStore((state) => state.fpsLimit);

  useEffect(() => {
    camera.far = renderDistance + 600;
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
  const ref = useRef<THREE.Group>(null);
  const startTime = useRef(performance.now());
  
  // For lasers, we just set the position and scale once.
  // For knives, we will animate them in useFrame.
  useEffect(() => {
    if (!ref.current || laser.weapon === 'KNIFE') return;
    const from = new THREE.Vector3(...laser.from);
    const to = new THREE.Vector3(...laser.to);
    const distance = from.distanceTo(to);
    const position = from.clone().lerp(to, 0.5);
    
    ref.current.position.copy(position);
    ref.current.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), to.clone().sub(from).normalize());
    ref.current.scale.set(0.05, distance, 0.05);
  }, [laser]);

  useFrame(() => {
    if (!ref.current || laser.weapon !== 'KNIFE') return;
    
    const from = new THREE.Vector3(...laser.from);
    const to = new THREE.Vector3(...laser.to);
    
    const elapsed = performance.now() - startTime.current;
    const progress = Math.min(elapsed / 100, 1); // 100ms duration
    
    const currentPos = from.clone().lerp(to, progress);
    ref.current.position.copy(currentPos);
    
    // Point the knife towards the target
    ref.current.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), to.clone().sub(from).normalize());
    
    // Add tumbling effect by rotating around the local X axis
    // It should spin multiple times during the 100ms
    ref.current.rotateX(progress * Math.PI * 8); 
  });

  if (laser.weapon === 'KNIFE') {
    return (
      <group ref={ref}>
        {/* Rotate the knife so the blade points in the direction of travel (Y axis in this local space) */}
        {/* We also add a spin effect around the local X axis to make it look like it's tumbling */}
        <group rotation={[Math.PI / 2, 0, 0]}>
          <WeaponModel type="KNIFE" color={laser.color} />
        </group>
      </group>
    );
  }

  return (
    <group ref={ref}>
      <mesh geometry={laserGeo} material={getLaserMaterial(laser.color)} />
    </group>
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

function DamageNumber({ dn }: { dn: any }) {
  const ref = useRef<any>(null);
  const [yOffset, setYOffset] = useState(0);
  const [opacity, setOpacity] = useState(1);

  useFrame((state, delta) => {
    setYOffset(y => y + delta * 2);
    setOpacity(o => Math.max(0, o - delta));
    if (ref.current) {
      ref.current.quaternion.copy(state.camera.quaternion);
    }
  });

  return (
    <Text
      ref={ref}
      position={[dn.x, dn.y + yOffset, dn.z]}
      fontSize={dn.isCritical ? 0.8 : 0.5}
      color={dn.isCritical ? '#ff0000' : '#ffffff'}
      outlineWidth={0.05}
      outlineColor="#000000"
      fillOpacity={opacity}
      outlineOpacity={opacity}
    >
      {dn.amount}
    </Text>
  );
}

function DamageNumbers() {
  const damageNumbers = useGameStore((state) => state.damageNumbers);
  return (
    <>
      {damageNumbers.map((dn) => (
        <DamageNumber key={dn.id} dn={dn} />
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

export function LaserTag({ nickname, isAdmin, gameMode, difficulty, onExit }: { nickname: string, isAdmin: boolean, gameMode: 'pvp' | 'pve' | 'team' | 'speed' | 'custom', difficulty: 'easy' | 'normal' | 'hard' | 'nightmare', onExit?: () => void }) {
  const connect = useGameStore((state) => state.connect);
  const disconnect = useGameStore((state) => state.disconnect);
  const myId = useGameStore((state) => state.myId);
  const renderDistance = useGameStore((state) => state.renderDistance);
  const dynamicResolution = useGameStore((state) => state.dynamicResolution);
  const fpsLimit = useGameStore((state) => state.fpsLimit);
  const showFps = useGameStore((state) => state.showFps);
  const enableLighting = useGameStore((state) => state.enableLighting);
  const gameState = useGameStore((state) => state.gameState);
  const banned = useGameStore((state) => state.banned);
  const [dpr, setDpr] = useState(1);

  const shadowQuality = useGameStore((state) => state.shadowQuality);
  const ultraVisuals = useGameStore((state) => state.ultraVisuals);
  const shadowMapSize = ultraVisuals ? 4096 : shadowQuality === 'low' ? 512 : shadowQuality === 'medium' ? 1024 : 2048;

  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    setIsMobile(/iPhone|iPad|iPod|Android/i.test(navigator.userAgent));
    connect(nickname, isAdmin, gameMode, difficulty);
    return () => disconnect();
  }, [connect, disconnect, nickname, isAdmin, gameMode, difficulty]);

  if (banned) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-black text-red-500 font-mono text-xl">
        <h1 className="text-4xl font-bold mb-4">YOU HAVE BEEN BANNED</h1>
        <p>You were removed from the server by an administrator.</p>
        {onExit && (
          <button 
            onClick={onExit}
            className="mt-8 px-6 py-3 bg-red-900/50 hover:bg-red-800/50 border border-red-500/50 rounded-xl text-red-100 transition-colors"
          >
            Return to Menu
          </button>
        )}
      </div>
    );
  }

  if (!myId) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-black text-cyan-400 font-mono text-xl">
        Connecting to Server...
      </div>
    );
  }

  return (
    <div className="w-full h-screen bg-black relative overflow-hidden touch-none">
      {gameState === 'lobby' && <TeamLobby />}
      <Canvas 
        shadows={enableLighting}
        camera={{ fov: 75, near: 0.01, far: renderDistance + 600 }} 
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
        <color attach="background" args={['#050505']} />
        
        {enableLighting && (
          <>
            <ambientLight intensity={0.4} color="#404060" />
            <directionalLight 
              position={[100, 200, 100]} 
              intensity={1.2} 
              color="#ffffff"
              castShadow 
              shadow-mapSize-width={shadowMapSize}
              shadow-mapSize-height={shadowMapSize}
              shadow-camera-left={-200}
              shadow-camera-right={200}
              shadow-camera-top={200}
              shadow-camera-bottom={-200}
              shadow-camera-near={0.5}
              shadow-camera-far={500}
              shadow-bias={-0.0005}
            />
            <pointLight 
              position={[0, 40, 0]} 
              intensity={2} 
              color="#00ffff" 
              distance={200} 
              decay={2} 
              castShadow={ultraVisuals || shadowQuality === 'high'}
              shadow-mapSize-width={shadowMapSize / 2}
              shadow-mapSize-height={shadowMapSize / 2}
              shadow-bias={-0.001}
            />
          </>
        )}

        <Physics gravity={[0, -9.81, 0]}>
          <Map />
          <LocalPlayer isMobile={isMobile} />
          <RemotePlayers />
          <Entities />
          <SpecialEvents />
        </Physics>

        {/* Lasers */}
        <Lasers />
        <Shockwaves />
        <DamageNumbers />

        {/* Post-processing for Ultra Visuals */}
        {ultraVisuals && (
          <EffectComposer multisampling={4}>
            <Bloom 
              luminanceThreshold={0.2} 
              luminanceSmoothing={0.9} 
              intensity={1.5} 
              mipmapBlur 
            />
          </EffectComposer>
        )}
      </Canvas>

      <UI isMobile={isMobile} isAdmin={isAdmin} onExit={onExit} />
    </div>
  );
}
