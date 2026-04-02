import React from 'react';
import * as THREE from 'three';

// Shared Geometries
// REVOLVER
const revolverGripGeo = new THREE.BoxGeometry(0.06, 0.2, 0.08);
const revolverBarrelGeo = new THREE.CylinderGeometry(0.03, 0.03, 0.35);
const revolverCylinderGeo = new THREE.CylinderGeometry(0.06, 0.06, 0.12);
const revolverFrameGeo = new THREE.BoxGeometry(0.05, 0.1, 0.15);
const revolverSightGeo = new THREE.BoxGeometry(0.01, 0.03, 0.03);

// SHOTGUN
const shotgunStockGeo = new THREE.BoxGeometry(0.06, 0.12, 0.3);
const shotgunBodyGeo = new THREE.BoxGeometry(0.05, 0.08, 0.4);
const shotgunBarrelGeo = new THREE.CylinderGeometry(0.025, 0.025, 0.6);
const shotgunPumpGeo = new THREE.BoxGeometry(0.06, 0.04, 0.2);

// RPG
const rpgTubeGeo = new THREE.CylinderGeometry(0.08, 0.08, 1.0);
const rpgWarheadGeo = new THREE.CylinderGeometry(0.04, 0.12, 0.25);
const rpgWarheadTipGeo = new THREE.ConeGeometry(0.04, 0.15, 16);
const rpgExhaustGeo = new THREE.CylinderGeometry(0.1, 0.06, 0.2);
const rpgGripGeo = new THREE.BoxGeometry(0.04, 0.15, 0.06);
const rpgScopeGeo = new THREE.CylinderGeometry(0.03, 0.03, 0.2);

// KNIFE
const knifeHandleGeo = new THREE.BoxGeometry(0.03, 0.04, 0.15);
const knifeGuardGeo = new THREE.BoxGeometry(0.08, 0.06, 0.02);
const knifeBladeGeo = new THREE.ConeGeometry(0.03, 0.3, 4);

// DEFAULT (Assault Rifle)
const arBodyGeo = new THREE.BoxGeometry(0.06, 0.1, 0.5);
const arGripGeo = new THREE.BoxGeometry(0.04, 0.15, 0.06);
const arBarrelGeo = new THREE.CylinderGeometry(0.02, 0.02, 0.4);
const arMagGeo = new THREE.BoxGeometry(0.04, 0.2, 0.08);
const arStockGeo = new THREE.BoxGeometry(0.04, 0.12, 0.25);
const arSightGeo = new THREE.BoxGeometry(0.02, 0.04, 0.04);

// Shared Materials
const woodMat = new THREE.MeshStandardMaterial({ color: '#5c3a21', roughness: 0.8 });
const darkMetalMat = new THREE.MeshStandardMaterial({ color: '#222222', metalness: 0.8, roughness: 0.3 });
const lightMetalMat = new THREE.MeshStandardMaterial({ color: '#888888', metalness: 0.9, roughness: 0.2 });
const blackPlasticMat = new THREE.MeshStandardMaterial({ color: '#111111', roughness: 0.9 });
const oliveMat = new THREE.MeshStandardMaterial({ color: '#4b5320', roughness: 0.9 });
const warheadMat = new THREE.MeshStandardMaterial({ color: '#2f4f4f', metalness: 0.3 });
const exhaustMat = new THREE.MeshStandardMaterial({ color: '#8b0000', metalness: 0.5 });
const bladeMat = new THREE.MeshStandardMaterial({ color: '#eeeeee', metalness: 1.0, roughness: 0.1 });

const defaultWeaponMaterials: Record<string, THREE.MeshStandardMaterial> = {};
function getDefaultWeaponMaterial(color: string) {
  if (!defaultWeaponMaterials[color]) {
    defaultWeaponMaterials[color] = new THREE.MeshStandardMaterial({ color, emissive: color, emissiveIntensity: 0.5 });
  }
  return defaultWeaponMaterials[color];
}

export function WeaponModel({ type, color = '#00ffff', isFirstPerson = false }: { type?: string, color?: string, isFirstPerson?: boolean }) {
  // If first person, we might want to scale or position differently, 
  // but we can just return the group and let FirstPersonWeapon handle the wrapper.
  
  if (type === 'REVOLVER') {
    return (
      <group scale={isFirstPerson ? 1.5 : 0.8}>
        {/* Grip */}
        <mesh position={[0, -0.1, 0.05]} rotation={[0.3, 0, 0]} geometry={revolverGripGeo} material={woodMat} />
        {/* Frame */}
        <mesh position={[0, 0, -0.05]} geometry={revolverFrameGeo} material={lightMetalMat} />
        {/* Cylinder */}
        <mesh position={[0, 0.02, -0.05]} rotation={[Math.PI/2, 0, 0]} geometry={revolverCylinderGeo} material={darkMetalMat} />
        {/* Barrel */}
        <mesh position={[0, 0.02, -0.25]} rotation={[Math.PI/2, 0, 0]} geometry={revolverBarrelGeo} material={lightMetalMat} />
        {/* Sight */}
        <mesh position={[0, 0.05, -0.4]} geometry={revolverSightGeo} material={darkMetalMat} />
      </group>
    );
  }
  if (type === 'SHOTGUN') {
    return (
      <group scale={isFirstPerson ? 1.2 : 0.8}>
        {/* Stock */}
        <mesh position={[0, -0.05, 0.2]} geometry={shotgunStockGeo} material={woodMat} />
        {/* Body */}
        <mesh position={[0, 0, -0.15]} geometry={shotgunBodyGeo} material={darkMetalMat} />
        {/* Barrels (Double Barrel) */}
        <mesh position={[0.02, 0.02, -0.45]} rotation={[Math.PI/2, 0, 0]} geometry={shotgunBarrelGeo} material={darkMetalMat} />
        <mesh position={[-0.02, 0.02, -0.45]} rotation={[Math.PI/2, 0, 0]} geometry={shotgunBarrelGeo} material={darkMetalMat} />
        {/* Pump / Forend */}
        <mesh position={[0, -0.03, -0.35]} geometry={shotgunPumpGeo} material={woodMat} />
      </group>
    );
  }
  if (type === 'RPG') {
    return (
      <group scale={isFirstPerson ? 1.0 : 0.7}>
        {/* Tube */}
        <mesh position={[0, 0, 0]} rotation={[Math.PI/2, 0, 0]} geometry={rpgTubeGeo} material={oliveMat} />
        {/* Warhead Base */}
        <mesh position={[0, 0, -0.55]} rotation={[Math.PI/2, 0, 0]} geometry={rpgWarheadGeo} material={warheadMat} />
        {/* Warhead Tip */}
        <mesh position={[0, 0, -0.75]} rotation={[-Math.PI/2, 0, 0]} geometry={rpgWarheadTipGeo} material={warheadMat} />
        {/* Exhaust */}
        <mesh position={[0, 0, 0.55]} rotation={[Math.PI/2, 0, 0]} geometry={rpgExhaustGeo} material={exhaustMat} />
        {/* Grips */}
        <mesh position={[0, -0.12, -0.1]} rotation={[0.2, 0, 0]} geometry={rpgGripGeo} material={blackPlasticMat} />
        <mesh position={[0, -0.12, 0.1]} rotation={[0.2, 0, 0]} geometry={rpgGripGeo} material={blackPlasticMat} />
        {/* Scope */}
        <mesh position={[-0.08, 0.08, -0.1]} rotation={[Math.PI/2, 0, 0]} geometry={rpgScopeGeo} material={blackPlasticMat} />
      </group>
    );
  }
  if (type === 'KNIFE') {
    return (
      <group scale={isFirstPerson ? 1.5 : 0.8}>
        {/* Handle */}
        <mesh position={[0, 0, 0.1]} geometry={knifeHandleGeo} material={blackPlasticMat} />
        {/* Guard */}
        <mesh position={[0, 0, 0.01]} geometry={knifeGuardGeo} material={darkMetalMat} />
        {/* Blade */}
        <mesh position={[0, 0, -0.15]} rotation={[-Math.PI/2, 0, 0]} geometry={knifeBladeGeo} material={bladeMat} />
      </group>
    );
  }
  
  // DEFAULT (Assault Rifle)
  return (
    <group scale={isFirstPerson ? 1.2 : 0.8}>
      {/* Body */}
      <mesh position={[0, 0, 0]} geometry={arBodyGeo} material={getDefaultWeaponMaterial(color)} />
      {/* Grip */}
      <mesh position={[0, -0.1, 0.15]} rotation={[0.2, 0, 0]} geometry={arGripGeo} material={blackPlasticMat} />
      {/* Magazine */}
      <mesh position={[0, -0.15, -0.05]} rotation={[-0.1, 0, 0]} geometry={arMagGeo} material={darkMetalMat} />
      {/* Barrel */}
      <mesh position={[0, 0.02, -0.45]} rotation={[Math.PI/2, 0, 0]} geometry={arBarrelGeo} material={darkMetalMat} />
      {/* Stock */}
      <mesh position={[0, -0.02, 0.35]} geometry={arStockGeo} material={blackPlasticMat} />
      {/* Sight */}
      <mesh position={[0, 0.07, 0.1]} geometry={arSightGeo} material={blackPlasticMat} />
      <mesh position={[0, 0.07, -0.2]} geometry={arSightGeo} material={blackPlasticMat} />
    </group>
  );
}
