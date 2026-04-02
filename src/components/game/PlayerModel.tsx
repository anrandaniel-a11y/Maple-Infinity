import { useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { Group } from 'three';
import * as THREE from 'three';

// Shared Geometries
const torsoGeo = new THREE.BoxGeometry(0.6, 0.8, 0.4);
const coreGeo = new THREE.CircleGeometry(0.15, 16);
const headGeo = new THREE.BoxGeometry(0.5, 0.4, 0.5);
const visorGeo = new THREE.BoxGeometry(0.4, 0.15, 0.05);
const armGeo = new THREE.BoxGeometry(0.2, 0.7, 0.2);
const hoverBaseGeo = new THREE.CylinderGeometry(0.4, 0.2, 0.2, 16);
const hoverGlowGeo = new THREE.CylinderGeometry(0.3, 0.3, 0.05, 16);

// Shared Materials
const torsoMatBasic = new THREE.MeshBasicMaterial({ color: '#222' });
const headMatBasic = new THREE.MeshBasicMaterial({ color: '#333' });
const armMatBasic = new THREE.MeshBasicMaterial({ color: '#444' });
const hoverBaseMatBasic = new THREE.MeshBasicMaterial({ color: '#111' });

const torsoMatStd = new THREE.MeshStandardMaterial({ color: '#222', roughness: 0.7, metalness: 0.3 });
const headMatStd = new THREE.MeshStandardMaterial({ color: '#333', roughness: 0.5, metalness: 0.5 });
const armMatStd = new THREE.MeshStandardMaterial({ color: '#444', roughness: 0.8, metalness: 0.2 });
const hoverBaseMatStd = new THREE.MeshStandardMaterial({ color: '#111', roughness: 0.9, metalness: 0.8 });

import { useGameStore } from '../../store/gameStore';

export function PlayerModel({ color }: { color: string }) {
  const headRef = useRef<Group>(null);
  const enableLighting = useGameStore(state => state.enableLighting);

  const torsoMat = enableLighting ? torsoMatStd : torsoMatBasic;
  const headMat = enableLighting ? headMatStd : headMatBasic;
  const armMat = enableLighting ? armMatStd : armMatBasic;
  const hoverBaseMat = enableLighting ? hoverBaseMatStd : hoverBaseMatBasic;

  useFrame(({ clock }) => {
    if (headRef.current) {
      headRef.current.position.y = 0.8 + Math.sin(clock.elapsedTime * 2) * 0.05;
    }
  });

  return (
    <group>
      {/* Torso */}
      <mesh castShadow={enableLighting} position={[0, 0, 0]} geometry={torsoGeo} material={torsoMat} />
      
      {/* Neon Core */}
      <mesh position={[0, 0, 0.21]} geometry={coreGeo}>
        <meshBasicMaterial color={color} />
      </mesh>

      {/* Head */}
      <group ref={headRef} position={[0, 0.8, 0]}>
        <mesh castShadow={enableLighting} geometry={headGeo} material={headMat} />
        {/* Visor */}
        <mesh position={[0, 0, 0.26]} geometry={visorGeo}>
          <meshBasicMaterial color={color} />
        </mesh>
      </group>

      {/* Left Arm */}
      <mesh castShadow={enableLighting} position={[-0.45, 0, 0]} geometry={armGeo} material={armMat} />

      {/* Right Arm (Holding Gun) */}
      <mesh castShadow={enableLighting} position={[0.45, 0.1, -0.2]} rotation={[-Math.PI / 4, 0, 0]} geometry={armGeo} material={armMat} />

      {/* Hover Base */}
      <mesh castShadow={enableLighting} position={[0, -0.6, 0]} geometry={hoverBaseGeo} material={hoverBaseMat} />
      <mesh position={[0, -0.7, 0]} geometry={hoverGlowGeo}>
        <meshBasicMaterial color={color} transparent opacity={0.5} />
      </mesh>

      {/* Body Glow Effect */}
      <mesh position={[0, 0.2, 0]} scale={[1.2, 1.2, 1.2]}>
        <capsuleGeometry args={[0.4, 1, 4, 8]} />
        <meshBasicMaterial color={color} transparent opacity={0.15} blending={THREE.AdditiveBlending} depthWrite={false} />
      </mesh>
    </group>
  );
}
