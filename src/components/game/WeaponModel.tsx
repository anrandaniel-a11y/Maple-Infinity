import React from 'react';
import * as THREE from 'three';
import { createWoodTexture, createMetalTexture, createCarbonFiberTexture, createCamoTexture, createDamascusTexture } from '../../utils/textures';

// Shared Geometries
// REVOLVER
const revolverGripGeo = new THREE.BoxGeometry(0.06, 0.2, 0.08);
const revolverBarrelGeo = new THREE.CylinderGeometry(0.02, 0.02, 0.35);
const revolverUnderbarrelGeo = new THREE.BoxGeometry(0.03, 0.04, 0.35);
const revolverCylinderGeo = new THREE.CylinderGeometry(0.06, 0.06, 0.12);
const revolverFrameGeo = new THREE.BoxGeometry(0.05, 0.12, 0.15);
const revolverSightGeo = new THREE.BoxGeometry(0.01, 0.03, 0.03);

// SHOTGUN
const shotgunStockGeo = new THREE.BoxGeometry(0.06, 0.12, 0.3);
const shotgunBodyGeo = new THREE.BoxGeometry(0.06, 0.1, 0.4);
const shotgunBarrelGeo = new THREE.CylinderGeometry(0.025, 0.025, 0.6);
const shotgunPumpGeo = new THREE.BoxGeometry(0.07, 0.05, 0.25);
const shotgunSightGeo = new THREE.BoxGeometry(0.01, 0.02, 0.02);

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
const arBodyGeo = new THREE.BoxGeometry(0.06, 0.12, 0.5);
const arGripGeo = new THREE.BoxGeometry(0.04, 0.15, 0.06);
const arBarrelGeo = new THREE.CylinderGeometry(0.015, 0.015, 0.4);
const arBarrelShroudGeo = new THREE.CylinderGeometry(0.025, 0.025, 0.25);
const arMagGeo = new THREE.BoxGeometry(0.04, 0.2, 0.08);
const arStockGeo = new THREE.BoxGeometry(0.04, 0.12, 0.25);
const arStockTubeGeo = new THREE.CylinderGeometry(0.015, 0.015, 0.15);
const arSightGeo = new THREE.BoxGeometry(0.03, 0.05, 0.08);
const arRailGeo = new THREE.BoxGeometry(0.06, 0.01, 0.4);

// Textures (lazy loaded)
let woodTex: THREE.Texture;
let metalTex: THREE.Texture;
let carbonTex: THREE.Texture;
let camoTex: THREE.Texture;
let damascusTex: THREE.Texture;

function getWoodTex() { if (!woodTex) woodTex = createWoodTexture(); return woodTex; }
function getMetalTex() { if (!metalTex) metalTex = createMetalTexture(); return metalTex; }
function getCarbonTex() { if (!carbonTex) carbonTex = createCarbonFiberTexture(); return carbonTex; }
function getCamoTex() { if (!camoTex) camoTex = createCamoTexture(); return camoTex; }
function getDamascusTex() { if (!damascusTex) damascusTex = createDamascusTexture(); return damascusTex; }

// Shared Materials
const woodMatBasic = new THREE.MeshBasicMaterial({ color: '#5c3a21' });
const darkMetalMatBasic = new THREE.MeshBasicMaterial({ color: '#222222' });
const lightMetalMatBasic = new THREE.MeshBasicMaterial({ color: '#888888' });
const blackPlasticMatBasic = new THREE.MeshBasicMaterial({ color: '#111111' });
const oliveMatBasic = new THREE.MeshBasicMaterial({ color: '#4b5320' });
const warheadMatBasic = new THREE.MeshBasicMaterial({ color: '#2f4f4f' });
const exhaustMatBasic = new THREE.MeshBasicMaterial({ color: '#8b0000' });
const bladeMatBasic = new THREE.MeshBasicMaterial({ color: '#eeeeee' });

let woodMatStd: THREE.MeshStandardMaterial;
let darkMetalMatStd: THREE.MeshStandardMaterial;
let lightMetalMatStd: THREE.MeshStandardMaterial;
let blackPlasticMatStd: THREE.MeshStandardMaterial;
let oliveMatStd: THREE.MeshStandardMaterial;
let warheadMatStd: THREE.MeshStandardMaterial;
let exhaustMatStd: THREE.MeshStandardMaterial;
let bladeMatStd: THREE.MeshStandardMaterial;

function initStdMaterials() {
  if (woodMatStd) return;
  const woodT = getWoodTex();
  const metalT = getMetalTex();
  const carbonT = getCarbonTex();
  const camoT = getCamoTex();
  const damascusT = getDamascusTex();

  woodMatStd = new THREE.MeshStandardMaterial({ map: woodT, bumpMap: woodT, bumpScale: 0.02, roughness: 0.8 });
  darkMetalMatStd = new THREE.MeshStandardMaterial({ map: metalT, bumpMap: metalT, bumpScale: 0.01, color: '#444', metalness: 0.8, roughness: 0.3 });
  lightMetalMatStd = new THREE.MeshStandardMaterial({ map: metalT, bumpMap: metalT, bumpScale: 0.01, color: '#aaa', metalness: 0.9, roughness: 0.2 });
  blackPlasticMatStd = new THREE.MeshStandardMaterial({ map: carbonT, bumpMap: carbonT, bumpScale: 0.05, roughness: 0.9 });
  oliveMatStd = new THREE.MeshStandardMaterial({ map: camoT, roughness: 0.9 });
  warheadMatStd = new THREE.MeshStandardMaterial({ color: '#2f4f4f', metalness: 0.5, roughness: 0.5 });
  exhaustMatStd = new THREE.MeshStandardMaterial({ color: '#8b0000', roughness: 0.7 });
  bladeMatStd = new THREE.MeshStandardMaterial({ map: damascusT, bumpMap: damascusT, bumpScale: 0.005, metalness: 0.9, roughness: 0.1 });
}

const defaultWeaponMaterialsBasic: Record<string, THREE.MeshBasicMaterial> = {};
const defaultWeaponMaterialsStd: Record<string, THREE.MeshStandardMaterial> = {};

function getDefaultWeaponMaterial(color: string, enableLighting: boolean) {
  if (enableLighting) {
    if (!defaultWeaponMaterialsStd[color]) {
      const carbonT = getCarbonTex();
      defaultWeaponMaterialsStd[color] = new THREE.MeshStandardMaterial({ 
        color, 
        map: carbonT,
        bumpMap: carbonT,
        bumpScale: 0.05,
        metalness: 0.6, 
        roughness: 0.4,
        emissive: color,
        emissiveIntensity: 0.2
      });
    }
    return defaultWeaponMaterialsStd[color];
  } else {
    if (!defaultWeaponMaterialsBasic[color]) {
      const glowColor = new THREE.Color(color).multiplyScalar(1.2);
      defaultWeaponMaterialsBasic[color] = new THREE.MeshBasicMaterial({ color: glowColor });
    }
    return defaultWeaponMaterialsBasic[color];
  }
}

import { useGameStore } from '../../store/gameStore';

export function WeaponModel({ type, color = '#00ffff', isFirstPerson = false }: { type?: string, color?: string, isFirstPerson?: boolean }) {
  const enableLighting = useGameStore(state => state.enableLighting);

  if (enableLighting) {
    initStdMaterials();
  }

  const woodMat = enableLighting ? woodMatStd : woodMatBasic;
  const darkMetalMat = enableLighting ? darkMetalMatStd : darkMetalMatBasic;
  const lightMetalMat = enableLighting ? lightMetalMatStd : lightMetalMatBasic;
  const blackPlasticMat = enableLighting ? blackPlasticMatStd : blackPlasticMatBasic;
  const oliveMat = enableLighting ? oliveMatStd : oliveMatBasic;
  const warheadMat = enableLighting ? warheadMatStd : warheadMatBasic;
  const exhaustMat = enableLighting ? exhaustMatStd : exhaustMatBasic;
  const bladeMat = enableLighting ? bladeMatStd : bladeMatBasic;
  const defaultMat = getDefaultWeaponMaterial(color, enableLighting);

  // If first person, we might want to scale or position differently, 
  // but we can just return the group and let FirstPersonWeapon handle the wrapper.
  
  if (type === 'REVOLVER') {
    return (
      <group scale={isFirstPerson ? 1.5 : 0.8}>
        {/* Grip */}
        <mesh castShadow={enableLighting} position={[0, -0.1, 0.05]} rotation={[0.3, 0, 0]} geometry={revolverGripGeo} material={woodMat} />
        {/* Frame */}
        <mesh castShadow={enableLighting} position={[0, 0, -0.05]} geometry={revolverFrameGeo} material={lightMetalMat} />
        {/* Cylinder */}
        <mesh castShadow={enableLighting} position={[0, 0.02, -0.05]} rotation={[Math.PI/2, 0, 0]} geometry={revolverCylinderGeo} material={darkMetalMat} />
        {/* Barrel */}
        <mesh castShadow={enableLighting} position={[0, 0.04, -0.25]} rotation={[Math.PI/2, 0, 0]} geometry={revolverBarrelGeo} material={lightMetalMat} />
        {/* Underbarrel */}
        <mesh castShadow={enableLighting} position={[0, 0.01, -0.25]} geometry={revolverUnderbarrelGeo} material={lightMetalMat} />
        {/* Sight */}
        <mesh castShadow={enableLighting} position={[0, 0.07, -0.4]} geometry={revolverSightGeo} material={darkMetalMat} />
      </group>
    );
  }
  if (type === 'SHOTGUN') {
    return (
      <group scale={isFirstPerson ? 1.2 : 0.8}>
        {/* Stock */}
        <mesh castShadow={enableLighting} position={[0, -0.05, 0.2]} geometry={shotgunStockGeo} material={woodMat} />
        {/* Body */}
        <mesh castShadow={enableLighting} position={[0, 0, -0.15]} geometry={shotgunBodyGeo} material={darkMetalMat} />
        {/* Barrels (Double Barrel) */}
        <mesh castShadow={enableLighting} position={[0.02, 0.02, -0.45]} rotation={[Math.PI/2, 0, 0]} geometry={shotgunBarrelGeo} material={darkMetalMat} />
        <mesh castShadow={enableLighting} position={[-0.02, 0.02, -0.45]} rotation={[Math.PI/2, 0, 0]} geometry={shotgunBarrelGeo} material={darkMetalMat} />
        {/* Pump / Forend */}
        <mesh castShadow={enableLighting} position={[0, -0.03, -0.35]} geometry={shotgunPumpGeo} material={woodMat} />
        {/* Sight */}
        <mesh castShadow={enableLighting} position={[0, 0.055, -0.7]} geometry={shotgunSightGeo} material={lightMetalMat} />
      </group>
    );
  }
  if (type === 'RPG') {
    return (
      <group scale={isFirstPerson ? 1.0 : 0.7}>
        {/* Tube */}
        <mesh castShadow={enableLighting} position={[0, 0, 0]} rotation={[Math.PI/2, 0, 0]} geometry={rpgTubeGeo} material={oliveMat} />
        {/* Warhead Base */}
        <mesh castShadow={enableLighting} position={[0, 0, -0.55]} rotation={[Math.PI/2, 0, 0]} geometry={rpgWarheadGeo} material={warheadMat} />
        {/* Warhead Tip */}
        <mesh castShadow={enableLighting} position={[0, 0, -0.75]} rotation={[-Math.PI/2, 0, 0]} geometry={rpgWarheadTipGeo} material={warheadMat} />
        {/* Exhaust */}
        <mesh castShadow={enableLighting} position={[0, 0, 0.55]} rotation={[Math.PI/2, 0, 0]} geometry={rpgExhaustGeo} material={exhaustMat} />
        {/* Grips */}
        <mesh castShadow={enableLighting} position={[0, -0.12, -0.1]} rotation={[0.2, 0, 0]} geometry={rpgGripGeo} material={blackPlasticMat} />
        <mesh castShadow={enableLighting} position={[0, -0.12, 0.1]} rotation={[0.2, 0, 0]} geometry={rpgGripGeo} material={blackPlasticMat} />
        {/* Scope */}
        <mesh castShadow={enableLighting} position={[-0.08, 0.08, -0.1]} rotation={[Math.PI/2, 0, 0]} geometry={rpgScopeGeo} material={blackPlasticMat} />
      </group>
    );
  }
  if (type === 'KNIFE') {
    return (
      <group scale={isFirstPerson ? 1.5 : 0.8}>
        {/* Handle */}
        <mesh castShadow={enableLighting} position={[0, 0, 0.1]} geometry={knifeHandleGeo} material={blackPlasticMat} />
        {/* Guard */}
        <mesh castShadow={enableLighting} position={[0, 0, 0.01]} geometry={knifeGuardGeo} material={darkMetalMat} />
        {/* Blade */}
        <mesh castShadow={enableLighting} position={[0, 0, -0.15]} rotation={[-Math.PI/2, 0, 0]} geometry={knifeBladeGeo} material={bladeMat} />
      </group>
    );
  }
  
  // DEFAULT (Assault Rifle)
  return (
    <group scale={isFirstPerson ? 1.2 : 0.8}>
      {/* Body */}
      <mesh castShadow={enableLighting} position={[0, 0, 0]} geometry={arBodyGeo} material={defaultMat} />
      {/* Rail */}
      <mesh castShadow={enableLighting} position={[0, 0.065, -0.05]} geometry={arRailGeo} material={darkMetalMat} />
      {/* Grip */}
      <mesh castShadow={enableLighting} position={[0, -0.1, 0.15]} rotation={[0.2, 0, 0]} geometry={arGripGeo} material={blackPlasticMat} />
      {/* Magazine */}
      <mesh castShadow={enableLighting} position={[0, -0.15, -0.05]} rotation={[-0.1, 0, 0]} geometry={arMagGeo} material={darkMetalMat} />
      {/* Barrel Shroud */}
      <mesh castShadow={enableLighting} position={[0, 0.02, -0.3]} rotation={[Math.PI/2, 0, 0]} geometry={arBarrelShroudGeo} material={blackPlasticMat} />
      {/* Barrel */}
      <mesh castShadow={enableLighting} position={[0, 0.02, -0.45]} rotation={[Math.PI/2, 0, 0]} geometry={arBarrelGeo} material={lightMetalMat} />
      {/* Stock Tube */}
      <mesh castShadow={enableLighting} position={[0, 0.02, 0.3]} rotation={[Math.PI/2, 0, 0]} geometry={arStockTubeGeo} material={darkMetalMat} />
      {/* Stock */}
      <mesh castShadow={enableLighting} position={[0, -0.02, 0.4]} geometry={arStockGeo} material={blackPlasticMat} />
      {/* Sight */}
      <mesh castShadow={enableLighting} position={[0, 0.09, 0.05]} geometry={arSightGeo} material={blackPlasticMat} />
    </group>
  );
}
