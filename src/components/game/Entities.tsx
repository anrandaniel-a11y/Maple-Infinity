import { useRef, useMemo } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import { useGameStore } from '../../store/gameStore';
import * as THREE from 'three';
import { Detailed } from '@react-three/drei';

const lightbulbMaterialBasic = new THREE.MeshBasicMaterial({ color: '#ffffaa' });
const droneMaterialBasic = new THREE.MeshBasicMaterial({ color: '#444444' });
const droneEyeMaterialBasic = new THREE.MeshBasicMaterial({ color: '#ff0000' });
const mechMaterialBasic = new THREE.MeshBasicMaterial({ color: '#2a2a2a' });
const mechAccentMaterialBasic = new THREE.MeshBasicMaterial({ color: '#ff8800' });

const lightbulbMaterialStd = new THREE.MeshStandardMaterial({ color: '#ffffaa', emissive: '#ffffaa', emissiveIntensity: 0.5 });
const droneMaterialStd = new THREE.MeshStandardMaterial({ color: '#444444', roughness: 0.7, metalness: 0.5 });
const droneEyeMaterialStd = new THREE.MeshStandardMaterial({ color: '#ff0000', emissive: '#ff0000', emissiveIntensity: 1 });
const mechMaterialStd = new THREE.MeshStandardMaterial({ color: '#2a2a2a', roughness: 0.8, metalness: 0.6 });
const mechAccentMaterialStd = new THREE.MeshStandardMaterial({ color: '#ff8800', emissive: '#ff8800', emissiveIntensity: 0.5 });

const lavabotMaterialBasic = new THREE.MeshBasicMaterial({ color: '#ff4400' });
const lavabotMaterialStd = new THREE.MeshStandardMaterial({ color: '#ff4400', emissive: '#ff2200', emissiveIntensity: 0.8, roughness: 0.2, metalness: 0.8 });

const sniperMaterialBasic = new THREE.MeshBasicMaterial({ color: '#000000' });
const sniperMaterialStd = new THREE.MeshStandardMaterial({ color: '#111111', roughness: 0.9, metalness: 0.1 });
const sniperEyeMaterialBasic = new THREE.MeshBasicMaterial({ color: '#ff00ff' });
const sniperEyeMaterialStd = new THREE.MeshStandardMaterial({ color: '#ff00ff', emissive: '#ff00ff', emissiveIntensity: 1 });

const tankMaterialBasic = new THREE.MeshBasicMaterial({ color: '#334433' });
const tankMaterialStd = new THREE.MeshStandardMaterial({ color: '#334433', roughness: 0.9, metalness: 0.4 });

const swarmerMaterialBasic = new THREE.MeshBasicMaterial({ color: '#ffff00' });
const swarmerMaterialStd = new THREE.MeshStandardMaterial({ color: '#ffff00', emissive: '#ffff00', emissiveIntensity: 0.5, roughness: 0.4, metalness: 0.6 });

const healerMaterialBasic = new THREE.MeshBasicMaterial({ color: '#00ff00' });
const healerMaterialStd = new THREE.MeshStandardMaterial({ color: '#00ff00', emissive: '#00ff00', emissiveIntensity: 0.6, roughness: 0.3, metalness: 0.2 });

// Reusable frustum culling hook
export function useFrustumCulling(ref: React.RefObject<THREE.Object3D | null>, radius: number = 5) {
  const { camera } = useThree();
  const frustum = useMemo(() => new THREE.Frustum(), []);
  const projScreenMatrix = useMemo(() => new THREE.Matrix4(), []);
  const sphere = useMemo(() => new THREE.Sphere(new THREE.Vector3(), radius), [radius]);

  useFrame(() => {
    if (!ref.current) return;
    projScreenMatrix.multiplyMatrices(camera.projectionMatrix, camera.matrixWorldInverse);
    frustum.setFromProjectionMatrix(projScreenMatrix);
    sphere.center.copy(ref.current.position);
    ref.current.visible = frustum.intersectsSphere(sphere);
  });
}

function Lightbulb({ entity }: { entity: any }) {
  const ref = useRef<THREE.Group>(null);
  const ring1Ref = useRef<THREE.Mesh>(null);
  const ring2Ref = useRef<THREE.Mesh>(null);
  const pos = new THREE.Vector3();
  const enableLighting = useGameStore(state => state.enableLighting);

  const lightbulbMaterial = enableLighting ? lightbulbMaterialStd : lightbulbMaterialBasic;
  const droneMaterial = enableLighting ? droneMaterialStd : droneMaterialBasic;

  useFrustumCulling(ref, 3);

  useFrame((state) => {
    if (!ref.current || !ref.current.visible) return;
    pos.set(entity.x, entity.y, entity.z);
    ref.current.position.lerp(pos, 0.2);
    
    // Hover and rotate
    ref.current.position.y += Math.sin(state.clock.elapsedTime * 3) * 0.05;
    if (ring1Ref.current) {
      ring1Ref.current.rotation.x += 0.02;
      ring1Ref.current.rotation.y += 0.03;
    }
    if (ring2Ref.current) {
      ring2Ref.current.rotation.x -= 0.03;
      ring2Ref.current.rotation.z -= 0.02;
    }
  });

  return (
    <group ref={ref} position={[entity.x, entity.y, entity.z]}>
      <Detailed distances={[0, 30, 80]}>
        {/* High Detail */}
        <group>
          <mesh castShadow={enableLighting} material={lightbulbMaterial}>
            <icosahedronGeometry args={[0.8, 2]} />
          </mesh>
          <mesh castShadow={enableLighting} ref={ring1Ref} material={droneMaterial}>
            <torusGeometry args={[1.2, 0.05, 8, 32]} />
          </mesh>
          <mesh castShadow={enableLighting} ref={ring2Ref} material={droneMaterial}>
            <torusGeometry args={[1.4, 0.05, 8, 32]} />
          </mesh>
        </group>
        {/* Medium Detail */}
        <group>
          <mesh castShadow={enableLighting} material={lightbulbMaterial}>
            <icosahedronGeometry args={[0.8, 1]} />
          </mesh>
          <mesh castShadow={enableLighting} material={droneMaterial}>
            <torusGeometry args={[1.2, 0.05, 4, 16]} />
          </mesh>
          <mesh castShadow={enableLighting} material={droneMaterial}>
            <torusGeometry args={[1.4, 0.05, 4, 16]} />
          </mesh>
        </group>
        {/* Low Detail */}
        <mesh castShadow={enableLighting} material={lightbulbMaterial}>
          <boxGeometry args={[1.2, 1.2, 1.2]} />
        </mesh>
      </Detailed>
      {/* Health bar */}
      <mesh position={[0, 2, 0]}>
        <planeGeometry args={[2 * (entity.health / 50), 0.2]} />
        <meshBasicMaterial color={entity.health > 25 ? '#00ff00' : '#ff0000'} side={THREE.DoubleSide} />
      </mesh>
    </group>
  );
}

function Drone({ entity }: { entity: any }) {
  const ref = useRef<THREE.Group>(null);
  const pos = new THREE.Vector3();
  const dummy = new THREE.Object3D();
  const enableLighting = useGameStore(state => state.enableLighting);

  const droneMaterial = enableLighting ? droneMaterialStd : droneMaterialBasic;
  const droneEyeMaterial = enableLighting ? droneEyeMaterialStd : droneEyeMaterialBasic;

  useFrustumCulling(ref, 4);

  useFrame((state) => {
    if (!ref.current || !ref.current.visible) return;
    pos.set(entity.x, entity.y, entity.z);
    
    const players = useGameStore.getState().players;
    let closestPlayer: any = null;
    let minDist = Infinity;
    for (const id in players) {
      const p = players[id];
      const dist = Math.sqrt(Math.pow(p.x - entity.x, 2) + Math.pow(p.y - entity.y, 2) + Math.pow(p.z - entity.z, 2));
      if (dist < minDist) {
        minDist = dist;
        closestPlayer = p;
      }
    }

    // Smooth look at closest player (Y-axis only)
    if (closestPlayer) {
      dummy.position.copy(ref.current.position);
      const targetPos = new THREE.Vector3(closestPlayer.x, ref.current.position.y, closestPlayer.z);
      if (targetPos.distanceTo(dummy.position) > 0.01) {
        dummy.lookAt(targetPos);
        ref.current.quaternion.slerp(dummy.quaternion, 0.1);
      }
    }
    
    ref.current.position.lerp(pos, 0.2);
    // Hover effect
    ref.current.position.y += Math.sin(state.clock.elapsedTime * 5 + (parseInt(entity.id, 36) || 0)) * 0.05;
  });

  return (
    <group ref={ref} position={[entity.x, entity.y, entity.z]}>
      <Detailed distances={[0, 40, 100]}>
        {/* High Detail */}
        <group rotation={[0, Math.PI, 0]}>
          <mesh castShadow={enableLighting} material={droneMaterial} rotation={[Math.PI / 2, 0, 0]}>
            <cylinderGeometry args={[0.8, 0.8, 0.6, 16]} />
          </mesh>
          <mesh castShadow={enableLighting} material={droneMaterial} position={[0.4, -0.2, 0.8]}>
            <boxGeometry args={[0.1, 0.1, 0.6]} />
          </mesh>
          <mesh castShadow={enableLighting} material={droneMaterial} position={[-0.4, -0.2, 0.8]}>
            <boxGeometry args={[0.1, 0.1, 0.6]} />
          </mesh>
          <mesh material={droneEyeMaterial} position={[0, 0, 0.81]}>
            <planeGeometry args={[0.6, 0.2]} />
          </mesh>
          <mesh castShadow={enableLighting} material={droneMaterial} position={[1.2, 0.2, -0.2]} rotation={[0, 0, -0.2]}>
            <boxGeometry args={[1.5, 0.05, 0.8]} />
          </mesh>
          <mesh castShadow={enableLighting} material={droneMaterial} position={[-1.2, 0.2, -0.2]} rotation={[0, 0, 0.2]}>
            <boxGeometry args={[1.5, 0.05, 0.8]} />
          </mesh>
        </group>
        {/* Medium Detail */}
        <group rotation={[0, Math.PI, 0]}>
          <mesh castShadow={enableLighting} material={droneMaterial} rotation={[Math.PI / 2, 0, 0]}>
            <cylinderGeometry args={[0.8, 0.8, 0.6, 8]} />
          </mesh>
          <mesh material={droneEyeMaterial} position={[0, 0, 0.81]}>
            <planeGeometry args={[0.6, 0.2]} />
          </mesh>
          <mesh castShadow={enableLighting} material={droneMaterial} position={[1.2, 0.2, -0.2]} rotation={[0, 0, -0.2]}>
            <boxGeometry args={[1.5, 0.05, 0.8]} />
          </mesh>
          <mesh castShadow={enableLighting} material={droneMaterial} position={[-1.2, 0.2, -0.2]} rotation={[0, 0, 0.2]}>
            <boxGeometry args={[1.5, 0.05, 0.8]} />
          </mesh>
        </group>
        {/* Low Detail */}
        <mesh castShadow={enableLighting} material={droneMaterial}>
          <boxGeometry args={[2.5, 0.6, 1.6]} />
        </mesh>
      </Detailed>

      {/* Health bar */}
      <mesh position={[0, 1.5, 0]}>
        <planeGeometry args={[2 * (entity.health / 100), 0.2]} />
        <meshBasicMaterial color={entity.health > 50 ? '#00ff00' : '#ff0000'} side={THREE.DoubleSide} />
      </mesh>
    </group>
  );
}

function Mech({ entity }: { entity: any }) {
  const ref = useRef<THREE.Group>(null);
  const leftLegRef = useRef<THREE.Mesh>(null);
  const rightLegRef = useRef<THREE.Mesh>(null);
  const leftArmRef = useRef<THREE.Group>(null);
  const rightArmRef = useRef<THREE.Group>(null);
  const pos = new THREE.Vector3();
  const dummy = new THREE.Object3D();
  const enableLighting = useGameStore(state => state.enableLighting);

  const mechMaterial = enableLighting ? mechMaterialStd : mechMaterialBasic;
  const mechAccentMaterial = enableLighting ? mechAccentMaterialStd : mechAccentMaterialBasic;

  useFrustumCulling(ref, 5);

  useFrame((state) => {
    if (!ref.current || !ref.current.visible) return;
    
    const prevPos = ref.current.position.clone();
    pos.set(entity.x, entity.y, entity.z);
    
    const players = useGameStore.getState().players;
    let closestPlayer: any = null;
    let minDist = Infinity;
    for (const id in players) {
      const p = players[id];
      const dist = Math.sqrt(Math.pow(p.x - entity.x, 2) + Math.pow(p.y - entity.y, 2) + Math.pow(p.z - entity.z, 2));
      if (dist < minDist) {
        minDist = dist;
        closestPlayer = p;
      }
    }

    // Smooth look at closest player (Y-axis only)
    if (closestPlayer) {
      dummy.position.copy(ref.current.position);
      const targetPos = new THREE.Vector3(closestPlayer.x, ref.current.position.y, closestPlayer.z);
      if (targetPos.distanceTo(dummy.position) > 0.01) {
        dummy.lookAt(targetPos);
        ref.current.quaternion.slerp(dummy.quaternion, 0.1);
      }
    }
    
    ref.current.position.lerp(pos, 0.2);

    // Walking animation if moving
    const speed = prevPos.distanceTo(ref.current.position);
    if (speed > 0.01) {
      const walkCycle = state.clock.elapsedTime * 10;
      if (leftLegRef.current && rightLegRef.current) {
        leftLegRef.current.rotation.x = Math.sin(walkCycle) * 0.5;
        rightLegRef.current.rotation.x = Math.sin(walkCycle + Math.PI) * 0.5;
      }
      if (leftArmRef.current && rightArmRef.current && !entity.isPreparingAttack) {
        leftArmRef.current.rotation.x = Math.sin(walkCycle + Math.PI) * 0.3;
        rightArmRef.current.rotation.x = Math.sin(walkCycle) * 0.3;
      }
    } else {
      // Return to idle
      if (leftLegRef.current && rightLegRef.current) {
        leftLegRef.current.rotation.x = THREE.MathUtils.lerp(leftLegRef.current.rotation.x, 0, 0.1);
        rightLegRef.current.rotation.x = THREE.MathUtils.lerp(rightLegRef.current.rotation.x, 0, 0.1);
      }
      if (leftArmRef.current && rightArmRef.current && !entity.isPreparingAttack) {
        leftArmRef.current.rotation.x = THREE.MathUtils.lerp(leftArmRef.current.rotation.x, 0, 0.1);
        rightArmRef.current.rotation.x = THREE.MathUtils.lerp(rightArmRef.current.rotation.x, 0, 0.1);
      }
    }

    // Melee attack animation
    if (entity.isPreparingAttack && leftArmRef.current && rightArmRef.current) {
      // Raise arms to smash
      leftArmRef.current.rotation.x = THREE.MathUtils.lerp(leftArmRef.current.rotation.x, -Math.PI / 2, 0.2);
      rightArmRef.current.rotation.x = THREE.MathUtils.lerp(rightArmRef.current.rotation.x, -Math.PI / 2, 0.2);
    }
  });

  return (
    <group ref={ref} position={[entity.x, entity.y, entity.z]}>
      <Detailed distances={[0, 50, 120]}>
        {/* High Detail */}
        <group rotation={[0, Math.PI, 0]}>
          <mesh castShadow={enableLighting} material={mechMaterial} position={[0, 0.8, 0]}>
            <boxGeometry args={[1.2, 1, 1.2]} />
          </mesh>
          <mesh castShadow={enableLighting} material={mechMaterial} position={[0, 1.5, 0.2]}>
            <boxGeometry args={[0.6, 0.5, 0.8]} />
          </mesh>
          <mesh material={mechAccentMaterial} position={[0, 1.5, 0.61]}>
            <planeGeometry args={[0.4, 0.15]} />
          </mesh>
          <group ref={leftArmRef} position={[0.8, 1.0, 0]}>
            <mesh castShadow={enableLighting} material={mechMaterial} position={[0, -0.4, 0.2]}>
              <boxGeometry args={[0.4, 0.8, 0.4]} />
            </mesh>
            <mesh material={mechAccentMaterial} position={[0, -0.8, 0.41]}>
              <planeGeometry args={[0.2, 0.2]} />
            </mesh>
          </group>
          <group ref={rightArmRef} position={[-0.8, 1.0, 0]}>
            <mesh castShadow={enableLighting} material={mechMaterial} position={[0, -0.4, 0.2]}>
              <boxGeometry args={[0.4, 0.8, 0.4]} />
            </mesh>
            <mesh material={mechAccentMaterial} position={[0, -0.8, 0.41]}>
              <planeGeometry args={[0.2, 0.2]} />
            </mesh>
          </group>
          <group position={[0.4, 0.8, 0]}>
            <mesh castShadow={enableLighting} ref={leftLegRef} material={mechMaterial} position={[0, -0.6, 0]}>
              <boxGeometry args={[0.3, 1.2, 0.3]} />
            </mesh>
          </group>
          <group position={[-0.4, 0.8, 0]}>
            <mesh castShadow={enableLighting} ref={rightLegRef} material={mechMaterial} position={[0, -0.6, 0]}>
              <boxGeometry args={[0.3, 1.2, 0.3]} />
            </mesh>
          </group>
        </group>
        {/* Medium Detail */}
        <group rotation={[0, Math.PI, 0]}>
          <mesh castShadow={enableLighting} material={mechMaterial} position={[0, 0.8, 0]}>
            <boxGeometry args={[1.2, 1, 1.2]} />
          </mesh>
          <mesh castShadow={enableLighting} material={mechMaterial} position={[0, 1.5, 0.2]}>
            <boxGeometry args={[0.6, 0.5, 0.8]} />
          </mesh>
          <mesh castShadow={enableLighting} material={mechMaterial} position={[0.8, 0.6, 0.2]}>
            <boxGeometry args={[0.4, 0.8, 0.4]} />
          </mesh>
          <mesh castShadow={enableLighting} material={mechMaterial} position={[-0.8, 0.6, 0.2]}>
            <boxGeometry args={[0.4, 0.8, 0.4]} />
          </mesh>
          <mesh castShadow={enableLighting} material={mechMaterial} position={[0.4, 0.2, 0]}>
            <boxGeometry args={[0.3, 1.2, 0.3]} />
          </mesh>
          <mesh castShadow={enableLighting} material={mechMaterial} position={[-0.4, 0.2, 0]}>
            <boxGeometry args={[0.3, 1.2, 0.3]} />
          </mesh>
        </group>
        {/* Low Detail */}
        <mesh castShadow={enableLighting} material={mechMaterial} position={[0, 0.8, 0]}>
          <boxGeometry args={[2, 2.5, 1.5]} />
        </mesh>
      </Detailed>

      {/* Health bar */}
      <mesh position={[0, 2.2, 0]}>
        <planeGeometry args={[2 * (entity.health / 200), 0.2]} />
        <meshBasicMaterial color={entity.health > 100 ? '#00ff00' : '#ff0000'} side={THREE.DoubleSide} />
      </mesh>
    </group>
  );
}

function Lavabot({ entity }: { entity: any }) {
  const ref = useRef<THREE.Group>(null);
  const enableLighting = useGameStore(state => state.enableLighting);
  const material = enableLighting ? lavabotMaterialStd : lavabotMaterialBasic;

  useFrustumCulling(ref, 4);

  useFrame((state) => {
    if (!ref.current || !ref.current.visible) return;
    ref.current.position.lerp(new THREE.Vector3(entity.x, entity.y, entity.z), 0.2);
    ref.current.rotation.y += 0.05;
    ref.current.position.y += Math.sin(state.clock.elapsedTime * 4) * 0.1;
  });

  return (
    <group ref={ref} position={[entity.x, entity.y, entity.z]}>
      <mesh castShadow={enableLighting} material={material}>
        <octahedronGeometry args={[1.5, 0]} />
      </mesh>
      <mesh position={[0, 2.5, 0]}>
        <planeGeometry args={[3 * (entity.health / 150), 0.3]} />
        <meshBasicMaterial color={entity.health > 75 ? '#00ff00' : '#ff0000'} side={THREE.DoubleSide} />
      </mesh>
    </group>
  );
}

function Sniper({ entity }: { entity: any }) {
  const ref = useRef<THREE.Group>(null);
  const enableLighting = useGameStore(state => state.enableLighting);
  const material = enableLighting ? sniperMaterialStd : sniperMaterialBasic;
  const eyeMaterial = enableLighting ? sniperEyeMaterialStd : sniperEyeMaterialBasic;

  useFrustumCulling(ref, 4);

  useFrame(() => {
    if (!ref.current || !ref.current.visible) return;
    ref.current.position.lerp(new THREE.Vector3(entity.x, entity.y, entity.z), 0.2);
    if (entity.targetId) {
      // Rotate towards target could be added if we had target position, but we don't have it easily here
      // Just spin slowly
      ref.current.rotation.y += 0.01;
    }
  });

  return (
    <group ref={ref} position={[entity.x, entity.y, entity.z]}>
      <mesh castShadow={enableLighting} material={material} position={[0, 1, 0]}>
        <cylinderGeometry args={[0.5, 0.5, 3, 8]} />
      </mesh>
      <mesh castShadow={enableLighting} material={eyeMaterial} position={[0, 2, 0.5]}>
        <sphereGeometry args={[0.3, 8, 8]} />
      </mesh>
      <mesh position={[0, 3.5, 0]}>
        <planeGeometry args={[2 * (entity.health / 80), 0.2]} />
        <meshBasicMaterial color={entity.health > 40 ? '#00ff00' : '#ff0000'} side={THREE.DoubleSide} />
      </mesh>
    </group>
  );
}

function Tank({ entity }: { entity: any }) {
  const ref = useRef<THREE.Group>(null);
  const enableLighting = useGameStore(state => state.enableLighting);
  const material = enableLighting ? tankMaterialStd : tankMaterialBasic;

  useFrustumCulling(ref, 6);

  useFrame(() => {
    if (!ref.current || !ref.current.visible) return;
    ref.current.position.lerp(new THREE.Vector3(entity.x, entity.y, entity.z), 0.2);
  });

  return (
    <group ref={ref} position={[entity.x, entity.y, entity.z]}>
      <mesh castShadow={enableLighting} material={material} position={[0, 1.5, 0]}>
        <boxGeometry args={[4, 3, 4]} />
      </mesh>
      <mesh position={[0, 4, 0]}>
        <planeGeometry args={[4 * (entity.health / 500), 0.4]} />
        <meshBasicMaterial color={entity.health > 250 ? '#00ff00' : '#ff0000'} side={THREE.DoubleSide} />
      </mesh>
    </group>
  );
}

function Swarmer({ entity }: { entity: any }) {
  const ref = useRef<THREE.Group>(null);
  const enableLighting = useGameStore(state => state.enableLighting);
  const material = enableLighting ? swarmerMaterialStd : swarmerMaterialBasic;

  useFrustumCulling(ref, 2);

  useFrame((state) => {
    if (!ref.current || !ref.current.visible) return;
    ref.current.position.lerp(new THREE.Vector3(entity.x, entity.y, entity.z), 0.3);
    ref.current.rotation.z += 0.1;
    ref.current.rotation.x += 0.1;
  });

  return (
    <group ref={ref} position={[entity.x, entity.y, entity.z]}>
      <mesh castShadow={enableLighting} material={material}>
        <tetrahedronGeometry args={[0.8, 0]} />
      </mesh>
      <mesh position={[0, 1.5, 0]}>
        <planeGeometry args={[1.5 * (entity.health / 30), 0.15]} />
        <meshBasicMaterial color={entity.health > 15 ? '#00ff00' : '#ff0000'} side={THREE.DoubleSide} />
      </mesh>
    </group>
  );
}

function Healer({ entity }: { entity: any }) {
  const ref = useRef<THREE.Group>(null);
  const enableLighting = useGameStore(state => state.enableLighting);
  const material = enableLighting ? healerMaterialStd : healerMaterialBasic;

  useFrustumCulling(ref, 4);

  useFrame((state) => {
    if (!ref.current || !ref.current.visible) return;
    ref.current.position.lerp(new THREE.Vector3(entity.x, entity.y, entity.z), 0.2);
    ref.current.rotation.y += 0.02;
    ref.current.position.y += Math.sin(state.clock.elapsedTime * 2) * 0.2;
  });

  return (
    <group ref={ref} position={[entity.x, entity.y, entity.z]}>
      <mesh castShadow={enableLighting} material={material}>
        <torusKnotGeometry args={[1, 0.3, 64, 8]} />
      </mesh>
      <mesh position={[0, 2.5, 0]}>
        <planeGeometry args={[2.5 * (entity.health / 120), 0.25]} />
        <meshBasicMaterial color={entity.health > 60 ? '#00ff00' : '#ff0000'} side={THREE.DoubleSide} />
      </mesh>
    </group>
  );
}

function Boss({ entity }: { entity: any }) {
  const groupRef = useRef<THREE.Group>(null);
  const coreRef = useRef<THREE.Mesh>(null);
  const ring1Ref = useRef<THREE.Mesh>(null);
  const ring2Ref = useRef<THREE.Mesh>(null);
  const ring3Ref = useRef<THREE.Mesh>(null);
  const enableLighting = useGameStore(state => state.enableLighting);

  useFrustumCulling(groupRef, 30);

  useFrame((state, delta) => {
    if (!groupRef.current || !groupRef.current.visible) return;
    
    groupRef.current.position.lerp(new THREE.Vector3(entity.x, entity.y, entity.z), 0.1);
    
    const time = state.clock.elapsedTime;
    
    if (entity.isPreparingAttack) {
      groupRef.current.position.y += Math.sin(time * 50) * 0.2;
      groupRef.current.scale.setScalar(1 + Math.sin(time * 20) * 0.05);
    } else {
      groupRef.current.scale.lerp(new THREE.Vector3(1, 1, 1), 0.1);
      groupRef.current.position.y += Math.sin(time * 2) * 0.02;
    }
    
    if (coreRef.current) {
      coreRef.current.rotation.y += delta * 1.5;
      coreRef.current.rotation.x += delta * 0.8;
    }
    if (ring1Ref.current) {
      ring1Ref.current.rotation.x += delta * 2;
      ring1Ref.current.rotation.y -= delta * 1.5;
    }
    if (ring2Ref.current) {
      ring2Ref.current.rotation.z += delta * 1.8;
      ring2Ref.current.rotation.x -= delta * 2.2;
    }
    if (ring3Ref.current) {
      ring3Ref.current.rotation.y += delta * 2.5;
      ring3Ref.current.rotation.z -= delta * 1.2;
    }
  });

  const coreColor = entity.isPreparingAttack ? "#ff0000" : "#ff00ff";
  const shieldColor = "#ffffff";

  return (
    <group ref={groupRef} position={[entity.x, entity.y, entity.z]}>
      <Detailed distances={[0, 150, 300]}>
        {/* High Detail */}
        <group>
          {/* Core */}
          <mesh castShadow={enableLighting} ref={coreRef}>
            <icosahedronGeometry args={[5, 2]} />
            {enableLighting ? (
              <meshStandardMaterial color={coreColor} wireframe={entity.invulnerable} emissive={coreColor} emissiveIntensity={0.8} roughness={0.2} metalness={0.9} />
            ) : (
              <meshBasicMaterial color={coreColor} wireframe={entity.invulnerable} />
            )}
          </mesh>
          
          {/* Inner Ring */}
          <mesh castShadow={enableLighting} ref={ring1Ref}>
            <torusGeometry args={[7, 0.6, 16, 64]} />
            {enableLighting ? (
              <meshStandardMaterial color="#00ffff" emissive="#00ffff" emissiveIntensity={0.6} roughness={0.3} metalness={0.8} />
            ) : (
              <meshBasicMaterial color="#00ffff" />
            )}
          </mesh>
          
          {/* Middle Ring */}
          <mesh castShadow={enableLighting} ref={ring2Ref}>
            <torusGeometry args={[9, 0.4, 16, 64]} />
            {enableLighting ? (
              <meshStandardMaterial color="#ffff00" emissive="#ffff00" emissiveIntensity={0.6} roughness={0.3} metalness={0.8} />
            ) : (
              <meshBasicMaterial color="#ffff00" />
            )}
          </mesh>

          {/* Outer Ring */}
          <mesh castShadow={enableLighting} ref={ring3Ref}>
            <torusGeometry args={[11, 0.2, 16, 64]} />
            {enableLighting ? (
              <meshStandardMaterial color="#ff00ff" emissive="#ff00ff" emissiveIntensity={0.6} roughness={0.3} metalness={0.8} />
            ) : (
              <meshBasicMaterial color="#ff00ff" />
            )}
          </mesh>

          {/* Invulnerability Shield */}
          {entity.invulnerable && (
            <mesh>
              <sphereGeometry args={[13, 32, 32]} />
              <meshBasicMaterial color={shieldColor} transparent opacity={0.15} wireframe />
            </mesh>
          )}
        </group>
        
        {/* Medium Detail */}
        <group>
          <mesh castShadow={enableLighting}>
            <icosahedronGeometry args={[5, 1]} />
            {enableLighting ? (
              <meshStandardMaterial color={coreColor} wireframe={entity.invulnerable} emissive={coreColor} emissiveIntensity={0.8} roughness={0.2} metalness={0.9} />
            ) : (
              <meshBasicMaterial color={coreColor} wireframe={entity.invulnerable} />
            )}
          </mesh>
          <mesh castShadow={enableLighting}>
            <torusGeometry args={[7, 0.6, 8, 32]} />
            {enableLighting ? (
              <meshStandardMaterial color="#00ffff" emissive="#00ffff" emissiveIntensity={0.6} roughness={0.3} metalness={0.8} />
            ) : (
              <meshBasicMaterial color="#00ffff" />
            )}
          </mesh>
          <mesh castShadow={enableLighting}>
            <torusGeometry args={[9, 0.4, 8, 32]} />
            {enableLighting ? (
              <meshStandardMaterial color="#ffff00" emissive="#ffff00" emissiveIntensity={0.6} roughness={0.3} metalness={0.8} />
            ) : (
              <meshBasicMaterial color="#ffff00" />
            )}
          </mesh>
          {entity.invulnerable && (
            <mesh>
              <sphereGeometry args={[13, 16, 16]} />
              <meshBasicMaterial color={shieldColor} transparent opacity={0.15} wireframe />
            </mesh>
          )}
        </group>
        
        {/* Low Detail */}
        <mesh castShadow={enableLighting}>
          <boxGeometry args={[14, 14, 14]} />
          {enableLighting ? (
            <meshStandardMaterial color={coreColor} emissive={coreColor} emissiveIntensity={0.8} roughness={0.2} metalness={0.9} />
          ) : (
            <meshBasicMaterial color={coreColor} />
          )}
        </mesh>
      </Detailed>
      
      {/* Health Bar */}
      <mesh position={[0, 16, 0]}>
        <planeGeometry args={[15 * (entity.health / (entity.maxHealth || 10000)), 1.5]} />
        <meshBasicMaterial color={entity.invulnerable ? '#888888' : (entity.health > (entity.maxHealth || 10000) * 0.5 ? '#00ff00' : '#ff0000')} side={THREE.DoubleSide} />
      </mesh>
    </group>
  );
}

export function Entities() {
  const entities = useGameStore((state) => state.entities);

  return (
    <>
      {Object.values(entities).map((entity) => {
        if (entity.type === 'LIGHTBULB') {
          return <Lightbulb key={entity.id} entity={entity} />;
        } else if (entity.type === 'DRONE') {
          return <Drone key={entity.id} entity={entity} />;
        } else if (entity.type === 'MECH') {
          return <Mech key={entity.id} entity={entity} />;
        } else if (entity.type === 'LAVABOT') {
          return <Lavabot key={entity.id} entity={entity} />;
        } else if (entity.type === 'SNIPER') {
          return <Sniper key={entity.id} entity={entity} />;
        } else if (entity.type === 'TANK') {
          return <Tank key={entity.id} entity={entity} />;
        } else if (entity.type === 'SWARMER') {
          return <Swarmer key={entity.id} entity={entity} />;
        } else if (entity.type === 'HEALER') {
          return <Healer key={entity.id} entity={entity} />;
        } else if (entity.type === 'BOSS') {
          return <Boss key={entity.id} entity={entity} />;
        }
        return null;
      })}
    </>
  );
}
