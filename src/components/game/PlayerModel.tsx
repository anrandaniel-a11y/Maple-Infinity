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
const torsoMat = new THREE.MeshStandardMaterial({ color: '#222', metalness: 0.8, roughness: 0.2 });
const headMat = new THREE.MeshStandardMaterial({ color: '#333', metalness: 0.9, roughness: 0.1 });
const armMat = new THREE.MeshStandardMaterial({ color: '#444', metalness: 0.7, roughness: 0.3 });
const hoverBaseMat = new THREE.MeshStandardMaterial({ color: '#111', metalness: 0.9, roughness: 0.1 });

const playerColorMaterials: Record<string, THREE.MeshBasicMaterial> = {};
const playerGlowMaterials: Record<string, THREE.MeshBasicMaterial> = {};

function getPlayerColorMaterial(color: string) {
  if (!playerColorMaterials[color]) {
    playerColorMaterials[color] = new THREE.MeshBasicMaterial({ color });
  }
  return playerColorMaterials[color];
}

function getPlayerGlowMaterial(color: string) {
  if (!playerGlowMaterials[color]) {
    playerGlowMaterials[color] = new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.5 });
  }
  return playerGlowMaterials[color];
}

export function PlayerModel({ color }: { color: string }) {
  const headRef = useRef<Group>(null);

  useFrame(({ clock }) => {
    if (headRef.current) {
      headRef.current.position.y = 0.8 + Math.sin(clock.elapsedTime * 2) * 0.05;
    }
  });

  return (
    <group>
      {/* Torso */}
      <mesh position={[0, 0, 0]} castShadow geometry={torsoGeo} material={torsoMat} />
      
      {/* Neon Core */}
      <mesh position={[0, 0, 0.21]} geometry={coreGeo}>
        <meshBasicMaterial color={color} />
      </mesh>

      {/* Head */}
      <group ref={headRef} position={[0, 0.8, 0]}>
        <mesh castShadow geometry={headGeo} material={headMat} />
        {/* Visor */}
        <mesh position={[0, 0, 0.26]} geometry={visorGeo}>
          <meshBasicMaterial color={color} />
        </mesh>
      </group>

      {/* Left Arm */}
      <mesh position={[-0.45, 0, 0]} castShadow geometry={armGeo} material={armMat} />

      {/* Right Arm (Holding Gun) */}
      <mesh position={[0.45, 0.1, -0.2]} rotation={[-Math.PI / 4, 0, 0]} castShadow geometry={armGeo} material={armMat} />

      {/* Hover Base */}
      <mesh position={[0, -0.6, 0]} geometry={hoverBaseGeo} material={hoverBaseMat} />
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
