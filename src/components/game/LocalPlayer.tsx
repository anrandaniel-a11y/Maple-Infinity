import { useRef, useEffect, useState } from 'react';
import { useFrame, useThree, createPortal } from '@react-three/fiber';
import { RigidBody, RapierRigidBody, useRapier, CapsuleCollider } from '@react-three/rapier';
import { Vector3, Vector2, Euler, Quaternion, Raycaster } from 'three';
import { PointerLockControls } from '@react-three/drei';
import { useGameStore } from '../../store/gameStore';
import { WeaponModel } from './WeaponModel';

const BASE_SPEED = 12;
const JUMP_FORCE = 8; // Increased to match new gravity scale (2.5)

const direction = new Vector3();
const frontVector = new Vector3();
const sideVector = new Vector3();
const eulerY = new Euler(0, 0, 0, 'YXZ');
const dashDir = new Vector3();
const rayOrigin = { x: 0, y: 0, z: 0 };
const rayDir = { x: 0, y: -1, z: 0 };

export function LocalPlayer({ isMobile }: { isMobile: boolean }) {
  const bodyRef = useRef<RapierRigidBody>(null);
  const { camera, scene } = useThree();
  const { rapier, world } = useRapier();
  const socket = useGameStore((state) => state.socket);
  const myId = useGameStore((state) => state.myId);
  const me = useGameStore((state) => state.players[myId || '']);
  const sensitivity = useGameStore((state) => state.sensitivity);
  const adminState = useGameStore((state) => state.adminState);
  const gameMode = useGameStore((state) => state.gameMode);
  const sensitivityRef = useRef(sensitivity);
  const lastShootTime = useRef(0);

  useEffect(() => {
    sensitivityRef.current = sensitivity;
  }, [sensitivity]);

  const keysRef = useRef({ w: false, a: false, s: false, d: false, space: false, shift: false });
  const joystickRef = useRef({ x: 0, y: 0 });
  const touchRotationRef = useRef({ x: 0, y: 0 });
  const lastTouch = useRef<{ x: number, y: number, id: number } | null>(null);
  const lastDashTime = useRef(0);
  const lastGroundedTime = useRef(0);
  const mobileDashRef = useRef(false);
  const dashVelocity = useRef(new Vector3());

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (useGameStore.getState().players[myId || '']?.health <= 0) return;
      if (e.code === 'KeyW') keysRef.current.w = true;
      if (e.code === 'KeyA') keysRef.current.a = true;
      if (e.code === 'KeyS') keysRef.current.s = true;
      if (e.code === 'KeyD') keysRef.current.d = true;
      if (e.code === 'Space') keysRef.current.space = true;
      if (e.code === 'ShiftLeft') keysRef.current.shift = true;
      
      if (e.code === 'KeyE') {
        const interactable = useGameStore.getState().interactable;
        if (interactable && socket) {
          if (interactable.type === 'weapon') {
            socket.emit('pickupWeapon', interactable.id);
          }
        }
      }
      
      if (e.code === 'KeyF') {
        window.dispatchEvent(new CustomEvent('jumpPadBoost', { detail: { power: 32 } }));
      }
    };
    const handleKeyUp = (e: KeyboardEvent) => {
      if (e.code === 'KeyW') keysRef.current.w = false;
      if (e.code === 'KeyA') keysRef.current.a = false;
      if (e.code === 'KeyS') keysRef.current.s = false;
      if (e.code === 'KeyD') keysRef.current.d = false;
      if (e.code === 'Space') keysRef.current.space = false;
      if (e.code === 'ShiftLeft') keysRef.current.shift = false;
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);

    // Mobile Joystick Event Listeners
    const handleJoystickMove = (e: any) => { joystickRef.current = { x: e.detail.x, y: e.detail.y }; };
    const handleJoystickStop = () => { joystickRef.current = { x: 0, y: 0 }; };
    window.addEventListener('joystickMove', handleJoystickMove);
    window.addEventListener('joystickStop', handleJoystickStop);

    // Mobile Touch Look Event Listeners
    const handleTouchStart = (e: TouchEvent) => {
      // Only use right side of screen for looking, and ignore if we already have a look touch
      if (lastTouch.current) return;
      
      const touch = Array.from(e.touches).find(t => t.clientX > window.innerWidth / 2);
      if (touch) {
        lastTouch.current = { x: touch.clientX, y: touch.clientY, id: touch.identifier };
      }
    };
    const handleTouchMove = (e: TouchEvent) => {
      if (!lastTouch.current) return;
      
      const touch = Array.from(e.touches).find(t => t.identifier === lastTouch.current?.id);
      if (touch) {
        const dx = touch.clientX - lastTouch.current.x;
        const dy = touch.clientY - lastTouch.current.y;
        touchRotationRef.current = {
          x: Math.max(-Math.PI / 2, Math.min(Math.PI / 2, touchRotationRef.current.x - dy * 0.005 * sensitivityRef.current)),
          y: touchRotationRef.current.y - dx * 0.005 * sensitivityRef.current
        };
        lastTouch.current = { x: touch.clientX, y: touch.clientY, id: touch.identifier };
      }
    };
    const handleTouchEnd = (e: TouchEvent) => { 
      if (!lastTouch.current) return;
      
      // If our tracked touch is no longer in the touches array, it ended
      const touchStillExists = Array.from(e.touches).some(t => t.identifier === lastTouch.current?.id);
      if (!touchStillExists) {
        lastTouch.current = null;
      }
    };

    if (isMobile) {
      window.addEventListener('touchstart', handleTouchStart);
      window.addEventListener('touchmove', handleTouchMove);
      window.addEventListener('touchend', handleTouchEnd);
    }

    // Shooting
    const handleShoot = () => {
      if (!socket || !myId || !me || me.health <= 0) return;

      const weapon = me.weapon || 'DEFAULT';
      const cooldowns: Record<string, number> = { DEFAULT: 200, REVOLVER: 600, SHOTGUN: 1000, RPG: 2000, KNIFE: 800 };
      
      if (performance.now() - lastShootTime.current < (cooldowns[weapon] || 200)) return;
      lastShootTime.current = performance.now();

      const rayOrigin = camera.position;
      const rayDir = new Vector3();
      camera.getWorldDirection(rayDir);

      // Use Rapier for accurate hit point calculation for RPG/others
      const ray = new rapier.Ray({ x: rayOrigin.x, y: rayOrigin.y, z: rayOrigin.z }, { x: rayDir.x, y: rayDir.y, z: rayDir.z });
      const hit = world.castRay(ray, 300, true);
      let hitPoint = new Vector3().copy(rayOrigin).add(rayDir.clone().multiplyScalar(100));
      if (hit) {
        hitPoint = new Vector3().copy(rayOrigin).add(rayDir.clone().normalize().multiplyScalar(hit.timeOfImpact));
      }

      if (weapon === 'SHOTGUN') {
        const rays = [];
        for(let i=0; i<8; i++) {
           const spreadX = (Math.random() - 0.5) * 0.15;
           const spreadY = (Math.random() - 0.5) * 0.15;
           const spreadRay = new Raycaster();
           spreadRay.setFromCamera(new Vector2(spreadX, spreadY), camera);
           const spreadTo = spreadRay.ray.at(50, new Vector3());
           rays.push({ from: [camera.position.x, camera.position.y, camera.position.z], to: [spreadTo.x, spreadTo.y, spreadTo.z] });
        }
        socket.emit('shoot', { weapon, rays });
      } else {
        socket.emit('shoot', { 
          weapon, 
          from: [camera.position.x, camera.position.y, camera.position.z], 
          to: [hitPoint.x, hitPoint.y, hitPoint.z] 
        });
      }

      // Recoil
      camera.rotation.x += 0.05;
    };

    const handleMobileDash = () => {
      mobileDashRef.current = true;
    };

    const handleAdminTeleport = (e: any) => {
      if (bodyRef.current) {
        bodyRef.current.setTranslation({ x: e.detail.x, y: e.detail.y + 2, z: e.detail.z }, true);
        bodyRef.current.setLinvel({ x: 0, y: 0, z: 0 }, true);
      }
    };

    const handleJumpPadBoost = (e: any) => {
      if (bodyRef.current) {
        const pos = bodyRef.current.translation();
        rayOrigin.x = pos.x;
        rayOrigin.y = pos.y - 0.91;
        rayOrigin.z = pos.z;
        const ray = new rapier.Ray(rayOrigin, rayDir);
        const hit = world.castRay(ray, 0.2, true);
        const grounded = hit && hit.timeOfImpact < 0.2;

        if (grounded) {
          const currentVel = bodyRef.current.linvel();
          bodyRef.current.setLinvel({ x: currentVel.x, y: e.detail.power, z: currentVel.z }, true);
        }
      }
    };

    const handleMobileInteract = () => {
      const interactable = useGameStore.getState().interactable;
      if (interactable && socket) {
        if (interactable.type === 'weapon') {
          socket.emit('pickupWeapon', interactable.id);
        }
      }
    };

    window.addEventListener('mousedown', handleShoot);
    window.addEventListener('mobileShoot', handleShoot);
    window.addEventListener('mobileDash', handleMobileDash);
    window.addEventListener('mobileInteract', handleMobileInteract);
    window.addEventListener('adminTeleport', handleAdminTeleport);
    window.addEventListener('jumpPadBoost', handleJumpPadBoost);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
      window.removeEventListener('joystickMove', handleJoystickMove);
      window.removeEventListener('joystickStop', handleJoystickStop);
      window.removeEventListener('touchstart', handleTouchStart);
      window.removeEventListener('touchmove', handleTouchMove);
      window.removeEventListener('touchend', handleTouchEnd);
      window.removeEventListener('mousedown', handleShoot);
      window.removeEventListener('mobileShoot', handleShoot);
      window.removeEventListener('mobileDash', handleMobileDash);
      window.removeEventListener('mobileInteract', handleMobileInteract);
      window.removeEventListener('adminTeleport', handleAdminTeleport);
      window.removeEventListener('jumpPadBoost', handleJumpPadBoost);
    };
  }, [isMobile, socket, myId, camera, scene]);

  useEffect(() => {
    if (!socket || !bodyRef.current) return;
    const handleRespawn = (player: any) => {
      if (player.id === myId) {
        bodyRef.current?.setTranslation({ x: player.x, y: player.y, z: player.z }, true);
        bodyRef.current?.setLinvel({ x: 0, y: 0, z: 0 }, true);
      }
    };
    socket.on('playerRespawned', handleRespawn);
    return () => {
      socket.off('playerRespawned', handleRespawn);
    };
  }, [socket, myId]);

  useFrame(() => {
    if (!bodyRef.current || !me) return;

    const pos = bodyRef.current.translation();
    const linvel = bodyRef.current.linvel();

    if (me.health <= 0) {
      camera.position.set(pos.x, pos.y + 1.5, pos.z);
      if (socket) {
        socket.emit('move', { x: pos.x, y: pos.y, z: pos.z, rx: camera.rotation.x, ry: camera.rotation.y, rz: camera.rotation.z });
      }
      return;
    }

    // Fallback respawn if falling through map
    if (!adminState.noclip && pos.y < -50) {
      bodyRef.current.setTranslation({ x: (Math.random() - 0.5) * 2000, y: 60, z: (Math.random() - 0.5) * 2000 }, true);
      bodyRef.current.setLinvel({ x: 0, y: 0, z: 0 }, true);
      return;
    }

    // Interactable detection
    if (socket && me) {
      let closestInteractable: { type: 'weapon' | 'medkit', id: string, name: string } | null = null;
      let minD = 3;

      const weapons = useGameStore.getState().weapons;
      for (const w of Object.values(weapons)) {
        if (w.active) {
          const dist = Math.sqrt((pos.x - w.x)**2 + (pos.y - w.y)**2 + (pos.z - w.z)**2);
          if (dist < minD) {
            minD = dist;
            closestInteractable = { type: 'weapon', id: w.id, name: w.type };
          }
        }
      }

      const medkits = useGameStore.getState().medkits;
      for (const m of Object.values(medkits)) {
        if (m.active) {
          const dist = Math.sqrt((pos.x - m.x)**2 + (pos.y - m.y)**2 + (pos.z - m.z)**2);
          if (dist < 3) {
            socket.emit('pickupMedkit', m.id);
          }
        }
      }

      const currentInteractable = useGameStore.getState().interactable;
      if (closestInteractable?.id !== currentInteractable?.id) {
        useGameStore.getState().setInteractable(closestInteractable);
      }
    }

    // Movement Logic
    direction.set(0, 0, 0);
    frontVector.set(0, 0, 0);
    sideVector.set(0, 0, 0);

    if (isMobile) {
      frontVector.set(0, 0, -joystickRef.current.y);
      sideVector.set(-joystickRef.current.x, 0, 0); // Fixed joystick inversion
      
      // Apply touch rotation to camera
      camera.rotation.order = 'YXZ';
      camera.rotation.y = touchRotationRef.current.y;
      camera.rotation.x = touchRotationRef.current.x;
    } else {
      frontVector.set(0, 0, (keysRef.current.s ? 1 : 0) - (keysRef.current.w ? 1 : 0));
      sideVector.set((keysRef.current.a ? 1 : 0) - (keysRef.current.d ? 1 : 0), 0, 0);
    }

    if (adminState.flying) {
      direction.subVectors(frontVector, sideVector);
      if (direction.lengthSq() > 0) direction.normalize();
      const currentSpeed = gameMode === 'speed' ? 50 : BASE_SPEED;
      direction.multiplyScalar(adminState.speed || currentSpeed).applyEuler(camera.rotation);
      
      bodyRef.current.setGravityScale(0, true);
      let verticalVelocity = direction.y;
      if (keysRef.current.space) verticalVelocity += (adminState.speed || currentSpeed);
      if (keysRef.current.shift) verticalVelocity -= (adminState.speed || currentSpeed);
      bodyRef.current.setLinvel({ x: direction.x, y: verticalVelocity, z: direction.z }, true);
    } else {
      const currentSpeed = gameMode === 'speed' ? 50 : BASE_SPEED;
      eulerY.set(0, camera.rotation.y, 0, 'YXZ');
      direction.subVectors(frontVector, sideVector);
      if (direction.lengthSq() > 0) direction.normalize();
      direction.multiplyScalar(adminState.speed || currentSpeed).applyEuler(eulerY);
      
      // Jump
      let isGrounded = false;
      const offsets = [
        [0, 0],
        [0.3, 0],
        [-0.3, 0],
        [0, 0.3],
        [0, -0.3]
      ];
      
      for (const [ox, oz] of offsets) {
        rayOrigin.x = pos.x + ox;
        rayOrigin.y = pos.y - 0.91;
        rayOrigin.z = pos.z + oz;
        const ray = new rapier.Ray(rayOrigin, rayDir);
        const hit = world.castRay(ray, 0.4, true);
        if (hit && hit.timeOfImpact < 0.4) {
          isGrounded = true;
          break;
        }
      }

      const now = performance.now();
      if (isGrounded) {
        lastGroundedTime.current = now;
      }

      // Coyote time: 150ms after leaving the ground
      const canJump = isGrounded || (now - lastGroundedTime.current < 150);

      if (keysRef.current.space && canJump) {
        // Reset vertical velocity before applying impulse to ensure consistent jump height
        bodyRef.current.setLinvel({ x: linvel.x, y: 0, z: linvel.z }, true);
        bodyRef.current.applyImpulse({ x: 0, y: JUMP_FORCE, z: 0 }, true);
        lastGroundedTime.current = 0; // Prevent double jumping
        keysRef.current.space = false; // Require releasing and pressing space again to jump
      }

      // Dash
      if (keysRef.current.shift || mobileDashRef.current) {
        const now = performance.now();
        if (now - lastDashTime.current > 1000) { // 1 second cooldown
          lastDashTime.current = now;
          
          dashDir.copy(direction);
          if (dashDir.lengthSq() > 0) dashDir.normalize();
          
          if (dashDir.lengthSq() === 0) {
            dashDir.set(0, 0, -1).applyEuler(camera.rotation);
          }
          dashDir.y = 0;
          if (dashDir.lengthSq() > 0) {
            dashDir.normalize();
          } else {
            dashDir.set(0, 0, -1); // Fallback if looking straight down
          }
          
          const dashBurst = gameMode === 'speed' ? (isGrounded ? 150 : 200) : (isGrounded ? 87 : 110);
          dashVelocity.current.copy(dashDir).multiplyScalar(dashBurst); // Dash burst speed
        }
        mobileDashRef.current = false;
      }

      // Apply dash decay (less friction in air)
      const friction = isGrounded ? 0.92 : 0.97;
      dashVelocity.current.multiplyScalar(friction); 
      direction.add(dashVelocity.current);

      let climbVelocity = linvel.y;
      if (direction.lengthSq() > 0) {
        const moveDir = direction.clone().normalize();
        
        // Raycast from knees (y - 0.8) starting slightly behind player center
        // solid=false ensures we ignore colliders we are already inside (like the player's own capsule or the floor if we penetrate it slightly on landing)
        // Starting slightly behind ensures we don't start inside a wall if we penetrate it slightly while pushing against it
        const rayStartX = pos.x - moveDir.x * 0.1;
        const rayStartZ = pos.z - moveDir.z * 0.1;
        
        const kneeRayOrigin = { x: rayStartX, y: pos.y - 0.8, z: rayStartZ };
        const kneeRayDir = { x: moveDir.x, y: 0, z: moveDir.z };
        const kneeRay = new rapier.Ray(kneeRayOrigin, kneeRayDir);
        const kneeHit = world.castRayAndGetNormal(kneeRay, 0.7, false);
        
        // Raycast from head (y + 0.6) starting slightly behind player center
        const headRayOrigin = { x: rayStartX, y: pos.y + 0.6, z: rayStartZ };
        const headRayDir = { x: moveDir.x, y: 0, z: moveDir.z };
        const headRay = new rapier.Ray(headRayOrigin, headRayDir);
        const headHit = world.castRay(headRay, 0.7, false);
        
        // If knees hit something but head doesn't, there is a ledge we can climb
        // Ensure we don't climb flat floors (normal.y > 0.5) to prevent bouncing on landing
        if (kneeHit && (!kneeHit.normal || Math.abs(kneeHit.normal.y) < 0.5) && !headHit) {
          climbVelocity = Math.max(linvel.y, 8); // Apply upward velocity to vault over
        }
      }

      bodyRef.current.setGravityScale(2.5, true);
      bodyRef.current.setLinvel({ x: direction.x, y: climbVelocity, z: direction.z }, true);
    }

    // Update Camera Position directly to prevent jitter at high sensitivities
    camera.position.set(pos.x, pos.y + 1.5, pos.z);

    // Sync to server
    if (socket) {
      const moveData = {
        x: pos.x,
        y: pos.y,
        z: pos.z,
        rx: camera.rotation.x,
        ry: camera.rotation.y,
        rz: camera.rotation.z
      };
      
      const lastMove = (bodyRef.current as any).lastMoveData;
      let moved = true;
      if (lastMove) {
        const dx = Math.abs(lastMove.x - moveData.x);
        const dy = Math.abs(lastMove.y - moveData.y);
        const dz = Math.abs(lastMove.z - moveData.z);
        const drx = Math.abs(lastMove.rx - moveData.rx);
        const dry = Math.abs(lastMove.ry - moveData.ry);
        if (dx < 0.01 && dy < 0.01 && dz < 0.01 && drx < 0.01 && dry < 0.01) {
          moved = false;
        }
      }

      const now = performance.now();
      const lastMoveTime = (bodyRef.current as any).lastMoveTime || 0;
      
      if (moved && now - lastMoveTime > 33) {
        (bodyRef.current as any).lastMoveData = moveData;
        (bodyRef.current as any).lastMoveTime = now;
        
        // Update local store so UI (like radar) knows where we are
        if (myId) {
          useGameStore.getState().updatePlayer(myId, moveData);
        }

        socket.emit('move', moveData);
      }
    }
  });

  return (
    <>
      {!isMobile && <PointerLockControls pointerSpeed={sensitivity} />}
      
      {/* Attach Gun to Camera */}
      {createPortal(
        <group position={[0.3, -0.3, -0.5]}>
          <WeaponModel type={me?.weapon} color={me?.color || '#fff'} />
        </group>,
        camera
      )}

      <RigidBody ref={bodyRef} colliders={false} mass={1} type="dynamic" position={[me?.x || 0, me?.y || 100, me?.z || 0]} enabledRotations={[false, false, false]} friction={0} restitution={0} ccd gravityScale={2.5}>
        <CapsuleCollider args={[0.5, 0.4]} friction={0} restitution={0} sensor={adminState.noclip} />
        <mesh visible={false} userData={{ playerId: myId }}>
          <capsuleGeometry args={[0.4, 1, 4, 8]} />
          <meshBasicMaterial color="red" />
        </mesh>
      </RigidBody>
    </>
  );
}
