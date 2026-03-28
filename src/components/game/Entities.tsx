import { useRef } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import { useGameStore } from '../../store/gameStore';
import * as THREE from 'three';
import { Detailed } from '@react-three/drei';

const lightbulbMaterial = new THREE.MeshStandardMaterial({
  color: '#ffffaa',
  emissive: '#ffffaa',
  emissiveIntensity: 2,
  roughness: 0.2,
  metalness: 0.8
});

const droneMaterial = new THREE.MeshStandardMaterial({
  color: '#444444',
  roughness: 0.6,
  metalness: 0.8
});

const droneEyeMaterial = new THREE.MeshStandardMaterial({
  color: '#ff0000',
  emissive: '#ff0000',
  emissiveIntensity: 2
});

const mechMaterial = new THREE.MeshStandardMaterial({
  color: '#2a2a2a',
  roughness: 0.8,
  metalness: 0.5
});

const mechAccentMaterial = new THREE.MeshStandardMaterial({
  color: '#ff8800',
  emissive: '#ff8800',
  emissiveIntensity: 2
});

// Reusable frustum culling hook
function useFrustumCulling(ref: React.RefObject<THREE.Object3D>, radius: number = 5) {
  const { camera } = useThree();
  const frustum = useRef(new THREE.Frustum());
  const projScreenMatrix = useRef(new THREE.Matrix4());
  const sphere = useRef(new THREE.Sphere(new THREE.Vector3(), radius));

  useFrame(() => {
    if (!ref.current) return;
    projScreenMatrix.current.multiplyMatrices(camera.projectionMatrix, camera.matrixWorldInverse);
    frustum.current.setFromProjectionMatrix(projScreenMatrix.current);
    sphere.current.center.copy(ref.current.position);
    ref.current.visible = frustum.current.intersectsSphere(sphere.current);
  });
}

function Lightbulb({ entity }: { entity: any }) {
  const ref = useRef<THREE.Group>(null);
  const ring1Ref = useRef<THREE.Mesh>(null);
  const ring2Ref = useRef<THREE.Mesh>(null);
  const pos = new THREE.Vector3();

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
          <mesh material={lightbulbMaterial} castShadow>
            <icosahedronGeometry args={[0.8, 2]} />
          </mesh>
          <mesh ref={ring1Ref} material={droneMaterial} castShadow>
            <torusGeometry args={[1.2, 0.05, 8, 32]} />
          </mesh>
          <mesh ref={ring2Ref} material={droneMaterial} castShadow>
            <torusGeometry args={[1.4, 0.05, 8, 32]} />
          </mesh>
        </group>
        {/* Medium Detail */}
        <group>
          <mesh material={lightbulbMaterial} castShadow>
            <icosahedronGeometry args={[0.8, 1]} />
          </mesh>
          <mesh material={droneMaterial} castShadow>
            <torusGeometry args={[1.2, 0.05, 4, 16]} />
          </mesh>
          <mesh material={droneMaterial} castShadow>
            <torusGeometry args={[1.4, 0.05, 4, 16]} />
          </mesh>
        </group>
        {/* Low Detail */}
        <mesh material={lightbulbMaterial} castShadow>
          <boxGeometry args={[1.2, 1.2, 1.2]} />
        </mesh>
      </Detailed>
      <pointLight color="#ffffaa" intensity={2} distance={20} />
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

  useFrustumCulling(ref, 4);

  useFrame((state) => {
    if (!ref.current || !ref.current.visible) return;
    pos.set(entity.x, entity.y, entity.z);
    
    const players = useGameStore.getState().players;
    let closestPlayer = null;
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
          <mesh material={droneMaterial} castShadow rotation={[Math.PI / 2, 0, 0]}>
            <cylinderGeometry args={[0.8, 0.8, 0.6, 16]} />
          </mesh>
          <mesh material={droneMaterial} castShadow position={[0.4, -0.2, 0.8]}>
            <boxGeometry args={[0.1, 0.1, 0.6]} />
          </mesh>
          <mesh material={droneMaterial} castShadow position={[-0.4, -0.2, 0.8]}>
            <boxGeometry args={[0.1, 0.1, 0.6]} />
          </mesh>
          <mesh material={droneEyeMaterial} position={[0, 0, 0.81]}>
            <planeGeometry args={[0.6, 0.2]} />
          </mesh>
          <mesh material={droneMaterial} castShadow position={[1.2, 0.2, -0.2]} rotation={[0, 0, -0.2]}>
            <boxGeometry args={[1.5, 0.05, 0.8]} />
          </mesh>
          <mesh material={droneMaterial} castShadow position={[-1.2, 0.2, -0.2]} rotation={[0, 0, 0.2]}>
            <boxGeometry args={[1.5, 0.05, 0.8]} />
          </mesh>
        </group>
        {/* Medium Detail */}
        <group rotation={[0, Math.PI, 0]}>
          <mesh material={droneMaterial} castShadow rotation={[Math.PI / 2, 0, 0]}>
            <cylinderGeometry args={[0.8, 0.8, 0.6, 8]} />
          </mesh>
          <mesh material={droneEyeMaterial} position={[0, 0, 0.81]}>
            <planeGeometry args={[0.6, 0.2]} />
          </mesh>
          <mesh material={droneMaterial} castShadow position={[1.2, 0.2, -0.2]} rotation={[0, 0, -0.2]}>
            <boxGeometry args={[1.5, 0.05, 0.8]} />
          </mesh>
          <mesh material={droneMaterial} castShadow position={[-1.2, 0.2, -0.2]} rotation={[0, 0, 0.2]}>
            <boxGeometry args={[1.5, 0.05, 0.8]} />
          </mesh>
        </group>
        {/* Low Detail */}
        <mesh material={droneMaterial} castShadow>
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

  useFrustumCulling(ref, 5);

  useFrame((state) => {
    if (!ref.current || !ref.current.visible) return;
    
    const prevPos = ref.current.position.clone();
    pos.set(entity.x, entity.y, entity.z);
    
    const players = useGameStore.getState().players;
    let closestPlayer = null;
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
          <mesh material={mechMaterial} castShadow position={[0, 0.8, 0]}>
            <boxGeometry args={[1.2, 1, 1.2]} />
          </mesh>
          <mesh material={mechMaterial} castShadow position={[0, 1.5, 0.2]}>
            <boxGeometry args={[0.6, 0.5, 0.8]} />
          </mesh>
          <mesh material={mechAccentMaterial} position={[0, 1.5, 0.61]}>
            <planeGeometry args={[0.4, 0.15]} />
          </mesh>
          <group ref={leftArmRef} position={[0.8, 1.0, 0]}>
            <mesh material={mechMaterial} castShadow position={[0, -0.4, 0.2]}>
              <boxGeometry args={[0.4, 0.8, 0.4]} />
            </mesh>
            <mesh material={mechAccentMaterial} position={[0, -0.8, 0.41]}>
              <planeGeometry args={[0.2, 0.2]} />
            </mesh>
          </group>
          <group ref={rightArmRef} position={[-0.8, 1.0, 0]}>
            <mesh material={mechMaterial} castShadow position={[0, -0.4, 0.2]}>
              <boxGeometry args={[0.4, 0.8, 0.4]} />
            </mesh>
            <mesh material={mechAccentMaterial} position={[0, -0.8, 0.41]}>
              <planeGeometry args={[0.2, 0.2]} />
            </mesh>
          </group>
          <group position={[0.4, 0.8, 0]}>
            <mesh ref={leftLegRef} material={mechMaterial} castShadow position={[0, -0.6, 0]}>
              <boxGeometry args={[0.3, 1.2, 0.3]} />
            </mesh>
          </group>
          <group position={[-0.4, 0.8, 0]}>
            <mesh ref={rightLegRef} material={mechMaterial} castShadow position={[0, -0.6, 0]}>
              <boxGeometry args={[0.3, 1.2, 0.3]} />
            </mesh>
          </group>
        </group>
        {/* Medium Detail */}
        <group rotation={[0, Math.PI, 0]}>
          <mesh material={mechMaterial} castShadow position={[0, 0.8, 0]}>
            <boxGeometry args={[1.2, 1, 1.2]} />
          </mesh>
          <mesh material={mechMaterial} castShadow position={[0, 1.5, 0.2]}>
            <boxGeometry args={[0.6, 0.5, 0.8]} />
          </mesh>
          <mesh material={mechMaterial} castShadow position={[0.8, 0.6, 0.2]}>
            <boxGeometry args={[0.4, 0.8, 0.4]} />
          </mesh>
          <mesh material={mechMaterial} castShadow position={[-0.8, 0.6, 0.2]}>
            <boxGeometry args={[0.4, 0.8, 0.4]} />
          </mesh>
          <mesh material={mechMaterial} castShadow position={[0.4, 0.2, 0]}>
            <boxGeometry args={[0.3, 1.2, 0.3]} />
          </mesh>
          <mesh material={mechMaterial} castShadow position={[-0.4, 0.2, 0]}>
            <boxGeometry args={[0.3, 1.2, 0.3]} />
          </mesh>
        </group>
        {/* Low Detail */}
        <mesh material={mechMaterial} castShadow position={[0, 0.8, 0]}>
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

function Boss({ entity }: { entity: any }) {
  const groupRef = useRef<THREE.Group>(null);
  const coreRef = useRef<THREE.Mesh>(null);
  const ring1Ref = useRef<THREE.Mesh>(null);
  const ring2Ref = useRef<THREE.Mesh>(null);

  useFrustumCulling(groupRef, 15);

  useFrame((state) => {
    if (!groupRef.current || !groupRef.current.visible) return;
    
    groupRef.current.position.lerp(new THREE.Vector3(entity.x, entity.y, entity.z), 0.1);
    
    if (entity.isPreparingAttack) {
      groupRef.current.position.y += Math.sin(state.clock.elapsedTime * 50) * 0.1;
    }
    
    if (coreRef.current) {
      coreRef.current.rotation.y += 0.01;
      coreRef.current.rotation.x += 0.005;
    }
    if (ring1Ref.current) {
      ring1Ref.current.rotation.x += 0.02;
      ring1Ref.current.rotation.y -= 0.01;
    }
    if (ring2Ref.current) {
      ring2Ref.current.rotation.z += 0.015;
      ring2Ref.current.rotation.x -= 0.02;
    }
  });

  return (
    <group ref={groupRef} position={[entity.x, entity.y, entity.z]}>
      <Detailed distances={[0, 100, 250]}>
        {/* High Detail */}
        <group>
          <mesh ref={coreRef} castShadow>
            <octahedronGeometry args={[4, 2]} />
            <meshStandardMaterial color={entity.isPreparingAttack ? "#ff0000" : "#ff00ff"} emissive={entity.isPreparingAttack ? "#ff0000" : "#ff00ff"} emissiveIntensity={2} wireframe={entity.invulnerable} />
          </mesh>
          <mesh ref={ring1Ref}>
            <torusGeometry args={[6, 0.5, 16, 64]} />
            <meshStandardMaterial color="#00ffff" emissive="#00ffff" emissiveIntensity={1} />
          </mesh>
          <mesh ref={ring2Ref}>
            <torusGeometry args={[8, 0.3, 16, 64]} />
            <meshStandardMaterial color="#ffff00" emissive="#ffff00" emissiveIntensity={1} />
          </mesh>
          {entity.invulnerable && (
            <mesh>
              <sphereGeometry args={[10, 32, 32]} />
              <meshBasicMaterial color="#ffffff" transparent opacity={0.2} wireframe />
            </mesh>
          )}
        </group>
        {/* Medium Detail */}
        <group>
          <mesh castShadow>
            <octahedronGeometry args={[4, 0]} />
            <meshStandardMaterial color={entity.isPreparingAttack ? "#ff0000" : "#ff00ff"} emissive={entity.isPreparingAttack ? "#ff0000" : "#ff00ff"} emissiveIntensity={2} wireframe={entity.invulnerable} />
          </mesh>
          <mesh>
            <torusGeometry args={[6, 0.5, 8, 32]} />
            <meshStandardMaterial color="#00ffff" emissive="#00ffff" emissiveIntensity={1} />
          </mesh>
          <mesh>
            <torusGeometry args={[8, 0.3, 8, 32]} />
            <meshStandardMaterial color="#ffff00" emissive="#ffff00" emissiveIntensity={1} />
          </mesh>
          {entity.invulnerable && (
            <mesh>
              <sphereGeometry args={[10, 16, 16]} />
              <meshBasicMaterial color="#ffffff" transparent opacity={0.2} wireframe />
            </mesh>
          )}
        </group>
        {/* Low Detail */}
        <mesh castShadow>
          <boxGeometry args={[12, 12, 12]} />
          <meshStandardMaterial color={entity.isPreparingAttack ? "#ff0000" : "#ff00ff"} emissive={entity.isPreparingAttack ? "#ff0000" : "#ff00ff"} emissiveIntensity={2} />
        </mesh>
      </Detailed>
      
      {/* Health Bar */}
      <mesh position={[0, 12, 0]}>
        <planeGeometry args={[10 * (entity.health / 2000), 1]} />
        <meshBasicMaterial color={entity.invulnerable ? '#888888' : (entity.health > 1000 ? '#00ff00' : '#ff0000')} side={THREE.DoubleSide} />
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
        } else if (entity.type === 'BOSS') {
          return <Boss key={entity.id} entity={entity} />;
        }
        return null;
      })}
    </>
  );
}
