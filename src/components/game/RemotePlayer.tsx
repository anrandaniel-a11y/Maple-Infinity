import { useRef, memo } from 'react';
import { useFrame } from '@react-three/fiber';
import { Group, Mesh } from 'three';
import { Text } from '@react-three/drei';
import * as THREE from 'three';
import { PlayerModel } from './PlayerModel';
import { WeaponModel } from './WeaponModel';
import { useGameStore } from '../../store/gameStore';

// Shared Geometries & Materials
const healthBgGeo = new THREE.PlaneGeometry(1, 0.1);
const healthFgGeo = new THREE.PlaneGeometry(1, 0.1);
const healthBgMat = new THREE.MeshBasicMaterial({ color: '#333', side: THREE.DoubleSide });
const healthHighMat = new THREE.MeshBasicMaterial({ color: '#00ff00', side: THREE.DoubleSide });
const healthMedMat = new THREE.MeshBasicMaterial({ color: '#ffff00', side: THREE.DoubleSide });
const healthLowMat = new THREE.MeshBasicMaterial({ color: '#ff0000', side: THREE.DoubleSide });

interface RemotePlayerProps {
  player: {
    id: string;
    nickname: string;
    x: number;
    y: number;
    z: number;
    rx: number;
    ry: number;
    rz: number;
    color: string;
    health: number;
    weapon?: string;
    bleedingTicks?: number;
  };
}

const targetPos = new THREE.Vector3();
const currentRot = new THREE.Quaternion();
const targetRot = new THREE.Quaternion();
const targetEuler = new THREE.Euler();

export const RemotePlayer = memo(function RemotePlayer({ player }: RemotePlayerProps) {
  const groupRef = useRef<Group>(null);

  useFrame((state, delta) => {
    if (!groupRef.current) return;

    // Interpolate position
    targetPos.set(player.x, player.y, player.z);
    groupRef.current.position.lerp(targetPos, delta * 15);

    // Interpolate rotation (only Y for body)
    currentRot.setFromEuler(groupRef.current.rotation);
    targetEuler.set(0, player.ry, 0);
    targetRot.setFromEuler(targetEuler);
    currentRot.slerp(targetRot, delta * 15);
    groupRef.current.rotation.setFromQuaternion(currentRot);

    // Make health bar face camera
    const healthBar = groupRef.current.getObjectByName('healthBar');
    if (healthBar) {
      healthBar.lookAt(state.camera.position);
    }
  });

  const gameMode = useGameStore((state) => state.gameMode);
  const maxHealth = gameMode === 'speed' ? 125 : 500;
  const healthRatio = Math.max(0.001, player.health / maxHealth);
  const healthMat = player.health > maxHealth / 2 ? healthHighMat : player.health > maxHealth / 5 ? healthMedMat : healthLowMat;

  if (player.health <= 0) return null;

  return (
    <group ref={groupRef} position={[player.x, player.y, player.z]}>
      {/* Player Body */}
      <group position={[0, 0.5, 0]}>
        <PlayerModel color={player.color} />
      </group>

      {/* Gun Visual */}
      <group position={[0.4, 0.5, -0.6]}>
        <WeaponModel type={player.weapon} color={player.color} />
      </group>

      {/* Health Bar Background */}
      <mesh name="healthBar" position={[0, 2.5, 0]} geometry={healthBgGeo} material={healthBgMat}>
        {/* Health Bar Foreground */}
        <mesh 
          position={[(healthRatio - 1) / 2, 0, 0.01]} 
          scale={[healthRatio, 1, 1]}
          geometry={healthFgGeo} 
          material={healthMat} 
        />
      </mesh>

      {/* Name Tag */}
      <Text
        position={[0, 2.8, 0]}
        fontSize={0.2}
        color={player.bleedingTicks && player.bleedingTicks > 0 ? '#ff0000' : player.color}
        anchorX="center"
        anchorY="middle"
        outlineWidth={0.02}
        outlineColor="#000"
      >
        {player.nickname || player.id.substring(0, 4)} {player.bleedingTicks && player.bleedingTicks > 0 ? '(BLEEDING)' : ''}
      </Text>
    </group>
  );
});
