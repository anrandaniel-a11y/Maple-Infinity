import { useRef, useEffect } from 'react';
import { useFrame, createPortal, useThree } from '@react-three/fiber';
import * as THREE from 'three';
import { WeaponModel } from './WeaponModel';
import { useGameStore } from '../../store/gameStore';

export function FirstPersonWeapon({ weapon, color }: { weapon: string, color: string }) {
  const groupRef = useRef<THREE.Group>(null);
  const recoilRef = useRef(0);
  const lastShootTime = useRef(0);
  const { camera, scene } = useThree();
  
  const swayRef = useRef(new THREE.Vector2(0, 0));
  const previousRotation = useRef(new THREE.Vector2(0, 0));
  const previousPosition = useRef(new THREE.Vector3(0, 0, 0));
  const dragRef = useRef(new THREE.Vector3(0, 0, 0));
  
  // Smoothing refs for a 2-pole low-pass filter to eliminate jitter
  const smoothedVelocity = useRef(new THREE.Vector3(0, 0, 0));
  const smoothedAngVel = useRef(new THREE.Vector2(0, 0));

  useEffect(() => {
    const handleShoot = () => {
      recoilRef.current = 1.0;
      lastShootTime.current = performance.now();
    };
    window.addEventListener('playerShoot', handleShoot);
    return () => window.removeEventListener('playerShoot', handleShoot);
  }, []);

  useEffect(() => {
    if (groupRef.current) {
      groupRef.current.traverse((child) => {
        if (child instanceof THREE.Mesh) {
          // Clone material so we don't break other weapons
          child.material = child.material.clone();
          // Keep depthTest true so it sorts with itself and blocks the wireframe.
          // Because we scale the weapon down and move it very close to the camera,
          // it will never clip into walls!
          child.material.depthTest = true; 
          child.material.depthWrite = true;
          child.renderOrder = 999;
        }
      });
    }
  }, [weapon, color]);

  // Initialize previous position and rotation
  useEffect(() => {
    if (camera) {
      previousPosition.current.copy(camera.position);
      previousRotation.current.set(camera.rotation.x, camera.rotation.y);
    }
  }, [camera]);

  useFrame((state, delta) => {
    if (!groupRef.current) return;

    const safeDelta = Math.max(0.001, delta);
    const recoilLerp = Math.min(safeDelta * 15, 1);

    // Recoil recovery
    recoilRef.current = THREE.MathUtils.lerp(recoilRef.current, 0, recoilLerp);

    const time = state.clock.getElapsedTime();
    
    // Simple idle bob
    const idleBobY = Math.sin(time * 2) * 0.005;
    const idleBobX = Math.cos(time * 1) * 0.005;

    // --- SWAY (Rotation Lag) ---
    const rotX = state.camera.rotation.x;
    const rotY = state.camera.rotation.y;
    
    let deltaY = rotY - previousRotation.current.y;
    if (deltaY > Math.PI) deltaY -= Math.PI * 2;
    if (deltaY < -Math.PI) deltaY += Math.PI * 2;
    
    const deltaX = rotX - previousRotation.current.x;
    previousRotation.current.set(rotX, rotY);

    const rawAngVelX = deltaX / safeDelta;
    const rawAngVelY = deltaY / safeDelta;

    // Filter 1: Smooth the raw angular velocity
    smoothedAngVel.current.x = THREE.MathUtils.lerp(smoothedAngVel.current.x, rawAngVelX, Math.min(safeDelta * 12, 1));
    smoothedAngVel.current.y = THREE.MathUtils.lerp(smoothedAngVel.current.y, rawAngVelY, Math.min(safeDelta * 12, 1));

    const targetSwayX = smoothedAngVel.current.y * 0.05;
    const targetSwayY = smoothedAngVel.current.x * 0.05;

    // Filter 2: Dampen the sway to its target
    swayRef.current.x = THREE.MathUtils.damp(swayRef.current.x, targetSwayX, 10, safeDelta);
    swayRef.current.y = THREE.MathUtils.damp(swayRef.current.y, targetSwayY, 10, safeDelta);

    const maxSway = 0.15;
    swayRef.current.x = THREE.MathUtils.clamp(swayRef.current.x, -maxSway, maxSway);
    swayRef.current.y = THREE.MathUtils.clamp(swayRef.current.y, -maxSway, maxSway);

    // --- DRAG (Position Lag) ---
    const pos = state.camera.position;
    const rawVelocity = new THREE.Vector3().subVectors(pos, previousPosition.current).divideScalar(safeDelta);
    previousPosition.current.copy(pos);

    // Filter 1: Smooth the raw positional velocity (absorbs physics step jitter)
    smoothedVelocity.current.lerp(rawVelocity, Math.min(safeDelta * 12, 1));

    // Transform smoothed velocity to camera's local space
    const localVelocity = smoothedVelocity.current.clone().applyQuaternion(state.camera.quaternion.clone().invert());

    const targetDragX = -localVelocity.x * 0.01;
    const targetDragY = -localVelocity.y * 0.01;
    const targetDragZ = -localVelocity.z * 0.01;

    // Filter 2: Dampen the drag to its target
    dragRef.current.x = THREE.MathUtils.damp(dragRef.current.x, targetDragX, 10, safeDelta);
    dragRef.current.y = THREE.MathUtils.damp(dragRef.current.y, targetDragY, 10, safeDelta);
    dragRef.current.z = THREE.MathUtils.damp(dragRef.current.z, targetDragZ, 10, safeDelta);

    const maxDrag = 0.1;
    dragRef.current.clampScalar(-maxDrag, maxDrag);

    // --- RECOIL ---
    const recoilZ = recoilRef.current * 0.15;
    const recoilRotX = recoilRef.current * 0.15;

    // --- APPLY TRANSFORMS ---
    // Scale down by 0.2 and move 5x closer to the camera to prevent clipping into walls
    const scaleFactor = 0.2;
    groupRef.current.scale.setScalar(scaleFactor);
    
    groupRef.current.position.set(
      (0.3 + idleBobX + swayRef.current.x * 0.2 + dragRef.current.x) * scaleFactor, 
      (-0.3 + idleBobY - swayRef.current.y * 0.2 + dragRef.current.y) * scaleFactor, 
      (-0.5 + recoilZ + dragRef.current.z) * scaleFactor
    );
    
    groupRef.current.rotation.set(
      recoilRotX - swayRef.current.y, 
      -swayRef.current.x, 
      swayRef.current.x * 0.5 // slight tilt when turning
    );
  });

  return createPortal(
    <group ref={groupRef}>
      <WeaponModel type={weapon} color={color} isFirstPerson={true} />
    </group>,
    camera
  );
}
