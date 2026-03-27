import React from 'react';
import * as THREE from 'three';

// Shared Geometries
const revolverGripGeo = new THREE.BoxGeometry(0.08, 0.25, 0.1);
const revolverBarrelGeo = new THREE.CylinderGeometry(0.04, 0.04, 0.4);
const revolverCylinderGeo = new THREE.CylinderGeometry(0.08, 0.08, 0.15);

const shotgunStockGeo = new THREE.BoxGeometry(0.08, 0.15, 0.3);
const shotgunBarrelGeo = new THREE.CylinderGeometry(0.03, 0.03, 0.6);

const rpgTubeGeo = new THREE.CylinderGeometry(0.1, 0.1, 0.8);
const rpgWarheadGeo = new THREE.CylinderGeometry(0.05, 0.1, 0.2);
const rpgExhaustGeo = new THREE.CylinderGeometry(0.12, 0.02, 0.2);

const knifeHandleGeo = new THREE.BoxGeometry(0.04, 0.2, 0.06);
const knifeBladeGeo = new THREE.ConeGeometry(0.04, 0.3, 4);

const defaultBodyGeo = new THREE.BoxGeometry(0.1, 0.1, 0.4);
const defaultGripGeo = new THREE.BoxGeometry(0.1, 0.2, 0.1);

// Shared Materials
const revolverGripMat = new THREE.MeshStandardMaterial({ color: '#4a3018' });
const revolverBarrelMat = new THREE.MeshStandardMaterial({ color: '#cccccc', metalness: 0.8, roughness: 0.2 });
const revolverCylinderMat = new THREE.MeshStandardMaterial({ color: '#888888', metalness: 0.9, roughness: 0.3 });

const shotgunStockMat = new THREE.MeshStandardMaterial({ color: '#3e2723' });
const shotgunBarrelMat = new THREE.MeshStandardMaterial({ color: '#222222', metalness: 0.6 });

const rpgTubeMat = new THREE.MeshStandardMaterial({ color: '#4b5320' });
const rpgWarheadMat = new THREE.MeshStandardMaterial({ color: '#2f4f4f' });
const rpgExhaustMat = new THREE.MeshStandardMaterial({ color: '#8b0000' });

const knifeHandleMat = new THREE.MeshStandardMaterial({ color: '#111111' });
const knifeBladeMat = new THREE.MeshStandardMaterial({ color: '#eeeeee', metalness: 0.9, roughness: 0.1 });

const defaultGripMat = new THREE.MeshStandardMaterial({ color: '#333' });

const defaultWeaponMaterials: Record<string, THREE.MeshStandardMaterial> = {};
function getDefaultWeaponMaterial(color: string) {
  if (!defaultWeaponMaterials[color]) {
    defaultWeaponMaterials[color] = new THREE.MeshStandardMaterial({ color, emissive: color, emissiveIntensity: 0.5 });
  }
  return defaultWeaponMaterials[color];
}

export function WeaponModel({ type, color = '#00ffff' }: { type?: string, color?: string }) {
  if (type === 'REVOLVER') {
    return (
      <group scale={0.6}>
        <mesh position={[0, -0.1, 0.1]} rotation={[0.4, 0, 0]} geometry={revolverGripGeo} material={revolverGripMat} />
        <mesh position={[0, 0.05, -0.1]} geometry={revolverBarrelGeo} material={revolverBarrelMat} />
        <mesh position={[0, 0.05, 0.05]} rotation={[Math.PI/2, 0, 0]} geometry={revolverCylinderGeo} material={revolverCylinderMat} />
      </group>
    );
  }
  if (type === 'SHOTGUN') {
    return (
      <group scale={0.8}>
        <mesh position={[0, -0.05, 0.2]} rotation={[0.1, 0, 0]} geometry={shotgunStockGeo} material={shotgunStockMat} />
        <mesh position={[0.03, 0.05, -0.2]} rotation={[Math.PI/2, 0, 0]} geometry={shotgunBarrelGeo} material={shotgunBarrelMat} />
        <mesh position={[-0.03, 0.05, -0.2]} rotation={[Math.PI/2, 0, 0]} geometry={shotgunBarrelGeo} material={shotgunBarrelMat} />
      </group>
    );
  }
  if (type === 'RPG') {
    return (
      <group scale={0.7} rotation={[0, Math.PI, 0]}>
        <mesh position={[0, 0, 0]} rotation={[Math.PI/2, 0, 0]} geometry={rpgTubeGeo} material={rpgTubeMat} />
        <mesh position={[0, 0, 0.45]} rotation={[Math.PI/2, 0, 0]} geometry={rpgWarheadGeo} material={rpgWarheadMat} />
        <mesh position={[0, 0, -0.45]} rotation={[Math.PI/2, 0, 0]} geometry={rpgExhaustGeo} material={rpgExhaustMat} />
      </group>
    );
  }
  if (type === 'KNIFE') {
    return (
      <group scale={0.5} rotation={[0, 0, 0]}>
        <mesh position={[0, 0, 0]} rotation={[Math.PI/2, 0, 0]} geometry={knifeHandleGeo} material={knifeHandleMat} />
        <mesh position={[0, 0, -0.25]} rotation={[-Math.PI/2, 0, 0]} geometry={knifeBladeGeo} material={knifeBladeMat} />
      </group>
    );
  }
  // DEFAULT
  return (
    <group>
      <mesh position={[0, 0, -0.2]} geometry={defaultBodyGeo} material={getDefaultWeaponMaterial(color)} />
      <mesh position={[0, -0.1, 0]} geometry={defaultGripGeo} material={defaultGripMat} />
    </group>
  );
}
