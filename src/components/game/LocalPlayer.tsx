import { useRef, useEffect, useState } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import { RigidBody, RapierRigidBody, useRapier, CapsuleCollider } from '@react-three/rapier';
import { Vector3, Vector2, Euler, Quaternion, Raycaster } from 'three';
import { PointerLockControls, CubeCamera } from '@react-three/drei';
import { useGameStore } from '../../store/gameStore';
import { WeaponModel } from './WeaponModel';
import { FirstPersonWeapon } from './FirstPersonWeapon';
import { playSound } from '../../utils/audio';

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
  const customConfig = useGameStore((state) => state.customConfig);
  const ultraVisuals = useGameStore((state) => state.ultraVisuals);
  const isCustomizingControls = useGameStore((state) => state.isCustomizingControls);
  const sensitivityRef = useRef(sensitivity);
  const lastShootTime = useRef(0);
  const cameraShake = useRef(0);

  useEffect(() => {
    sensitivityRef.current = sensitivity;
  }, [sensitivity]);

  useEffect(() => {
    const handleCameraShake = (e: any) => {
      cameraShake.current = Math.max(cameraShake.current, e.detail.intensity);
    };
    window.addEventListener('cameraShake', handleCameraShake);
    return () => window.removeEventListener('cameraShake', handleCameraShake);
  }, []);

  useEffect(() => {
    scene.add(camera);
    return () => {
      scene.remove(camera);
    };
  }, [camera, scene]);

  const keysRef = useRef({ w: false, a: false, s: false, d: false, space: false, shift: false });
  const joystickRef = useRef({ x: 0, y: 0 });
  const touchRotationRef = useRef({ x: 0, y: 0 });
  const lastTouch = useRef<{ x: number, y: number, id: number } | null>(null);
  const lastDashTime = useRef(0);
  const lastGroundedTime = useRef(0);
  const lastJumpInputTime = useRef(0);
  const lastJumpTime = useRef(0);
  const lastVaultTime = useRef(0);
  const mobileDashRef = useRef(false);
  const dashVelocity = useRef(new Vector3());
  const lastFootstepTime = useRef(0);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const state = useGameStore.getState();
      if (state.players[myId || '']?.health <= 0 || state.spectating) return;
      if (e.code === 'KeyW') keysRef.current.w = true;
      if (e.code === 'KeyA') keysRef.current.a = true;
      if (e.code === 'KeyS') keysRef.current.s = true;
      if (e.code === 'KeyD') keysRef.current.d = true;
      if (e.code === 'Space') {
        keysRef.current.space = true;
        lastJumpInputTime.current = performance.now();
      }
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
        window.dispatchEvent(new Event('playerMelee'));
      }

      if (e.code === 'KeyC') {
        window.dispatchEvent(new Event('playerBuildRamp'));
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

    // Build Ramp
    const handleBuildRamp = () => {
      const state = useGameStore.getState();
      if (state.isCustomizingControls || state.spectating) return;
      const currentMe = state.myId ? state.players[state.myId] : null;
      if (!socket || !myId || !currentMe || currentMe.health <= 0) return;

      const ry = camera.rotation.y;
      const snappedRy = Math.round(ry / (Math.PI / 2)) * (Math.PI / 2);
      const dirX = -Math.sin(snappedRy);
      const dirZ = -Math.cos(snappedRy);

      const pos = bodyRef.current?.translation();
      if (!pos) return;

      const gridX = Math.floor(pos.x / 20) * 20 + 10;
      const gridZ = Math.floor(pos.z / 20) * 20 + 10;

      const targetX = gridX + dirX * 20;
      const targetZ = gridZ + dirZ * 20;

      const playerRayOrigin = new Vector3(pos.x, pos.y, pos.z);
      const playerHit = world.castRay(new rapier.Ray(playerRayOrigin, new Vector3(0, -1, 0)), 5, true);
      const currentGroundY = playerHit ? pos.y - playerHit.timeOfImpact : pos.y - 1;

      const targetY = currentGroundY + 10;

      socket.emit('buildRamp', { x: targetX, y: targetY, z: targetZ, ry: snappedRy });
      playSound('click'); // or a build sound
    };

    // Melee Attack
    const handleMelee = () => {
      const state = useGameStore.getState();
      if (state.isCustomizingControls || state.spectating) return;
      const currentMe = state.myId ? state.players[state.myId] : null;
      if (!socket || !myId || !currentMe || currentMe.health <= 0) return;

      if (performance.now() - lastShootTime.current < 800) return; // Melee cooldown
      lastShootTime.current = performance.now();

      const rayOrigin = camera.position;
      const rayDir = new Vector3();
      camera.getWorldDirection(rayDir);

      const rOrigin = rayOrigin.clone().add(rayDir.clone().multiplyScalar(0.5));
      const hitPoint = new Vector3().copy(rOrigin).add(rayDir.clone().multiplyScalar(5)); // Short range

      socket.emit('shoot', { 
        weapon: 'MELEE', 
        from: [rOrigin.x, rOrigin.y, rOrigin.z], 
        to: [hitPoint.x, hitPoint.y, hitPoint.z] 
      });

      // Recoil/Swing effect
      camera.rotation.x += 0.05;
      camera.rotation.y += 0.1;
      setTimeout(() => {
        camera.rotation.y -= 0.1;
      }, 100);
      
      window.dispatchEvent(new CustomEvent('playerShoot', { detail: { cooldown: 800 } }));
      playSound('knife_swing');
    };

    // Shooting
    const handleShoot = () => {
      const state = useGameStore.getState();
      if (state.isCustomizingControls || state.spectating) return;
      const currentMe = state.myId ? state.players[state.myId] : null;
      if (!socket || !myId || !currentMe || currentMe.health <= 0) return;

      const weapon = currentMe.weapon || 'DEFAULT';
      const cooldowns: Record<string, number> = { DEFAULT: 200, REVOLVER: 600, SHOTGUN: 1000, RPG: 2000, KNIFE: 800 };
      
      if (performance.now() - lastShootTime.current < (cooldowns[weapon] || 200)) return;
      lastShootTime.current = performance.now();

      const shakeIntensities: Record<string, number> = { DEFAULT: 0.1, REVOLVER: 0.3, SHOTGUN: 0.4, RPG: 0.5, KNIFE: 0.1 };
      window.dispatchEvent(new CustomEvent('cameraShake', { detail: { intensity: shakeIntensities[weapon] || 0.1 } }));

      const rayOrigin = camera.position;
      const rayDir = new Vector3();
      camera.getWorldDirection(rayDir);

      const rOrigin = rayOrigin.clone().add(rayDir.clone().multiplyScalar(0.5));

      if (weapon === 'SHOTGUN') {
        const rays: { from: number[], to: number[] }[] = [];
        for(let i=0; i<8; i++) {
           const rDir = rayDir.clone().add(new Vector3((Math.random() - 0.5) * 0.4, (Math.random() - 0.5) * 0.4, (Math.random() - 0.5) * 0.4)).normalize();
           const rRay = new rapier.Ray({ x: rOrigin.x, y: rOrigin.y, z: rOrigin.z }, { x: rDir.x, y: rDir.y, z: rDir.z });
           const rHit = world.castRay(rRay, 50, true);
           
           let spreadTo = new Vector3().copy(rOrigin).add(rDir.clone().multiplyScalar(50));
           if (rHit) {
             spreadTo = new Vector3().copy(rOrigin).add(rDir.clone().multiplyScalar(rHit.timeOfImpact));
           }
           
           rays.push({ from: [rOrigin.x, rOrigin.y, rOrigin.z], to: [spreadTo.x, spreadTo.y, spreadTo.z] });
        }
        socket.emit('shoot', { weapon, rays });
      } else {
        const ray = new rapier.Ray({ x: rOrigin.x, y: rOrigin.y, z: rOrigin.z }, { x: rayDir.x, y: rayDir.y, z: rayDir.z });
        const hit = world.castRay(ray, 300, true);
        let hitPoint = new Vector3().copy(rOrigin).add(rayDir.clone().multiplyScalar(100));
        if (hit) {
          hitPoint = new Vector3().copy(rOrigin).add(rayDir.clone().normalize().multiplyScalar(hit.timeOfImpact));
        }

        socket.emit('shoot', { 
          weapon, 
          from: [rOrigin.x, rOrigin.y, rOrigin.z], 
          to: [hitPoint.x, hitPoint.y, hitPoint.z] 
        });
      }

      // Recoil
      camera.rotation.x += 0.05;
      window.dispatchEvent(new CustomEvent('playerShoot', { detail: { cooldown: cooldowns[weapon] || 200 } }));
      
      if (weapon === 'SHOTGUN') playSound('shoot_shotgun');
      else if (weapon === 'RPG') playSound('shoot_rpg');
      else if (weapon === 'REVOLVER') playSound('shoot_revolver');
      else if (weapon === 'KNIFE') playSound('knife_swing');
      else playSound('shoot_laser');
    };

    const handleMobileDash = () => {
      const state = useGameStore.getState();
      if (state.isCustomizingControls || state.spectating) return;
      mobileDashRef.current = true;
    };

    const handleAdminTeleport = (e: any) => {
      if (bodyRef.current) {
        bodyRef.current.setTranslation({ x: e.detail.x, y: e.detail.y + 2, z: e.detail.z }, true);
        bodyRef.current.setLinvel({ x: 0, y: 0, z: 0 }, true);
      }
    };

    const handleJumpPadBoost = (e: any) => {
      const state = useGameStore.getState();
      if (state.isCustomizingControls) return;
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
      const state = useGameStore.getState();
      if (state.isCustomizingControls || state.spectating) return;
      const interactable = state.interactable;
      if (interactable && socket) {
        if (interactable.type === 'weapon') {
          socket.emit('pickupWeapon', interactable.id);
        }
      }
    };

    window.addEventListener('mousedown', handleShoot);
    window.addEventListener('mobileShoot', handleShoot);
    window.addEventListener('playerMelee', handleMelee);
    window.addEventListener('playerBuildRamp', handleBuildRamp);
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
      window.removeEventListener('playerMelee', handleMelee);
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

    const state = useGameStore.getState();
    if (state.spectating && state.spectateTargetId) {
      const target = state.players[state.spectateTargetId];
      if (target) {
        // Smoothly interpolate camera to target
        camera.position.lerp(new Vector3(target.x, target.y + 0.6, target.z), 0.2);
        
        // Interpolate rotation
        const targetEuler = new Euler(target.rx, target.ry, target.rz, 'YXZ');
        const targetQuat = new Quaternion().setFromEuler(targetEuler);
        camera.quaternion.slerp(targetQuat, 0.2);
        return;
      }
    }

    if (me.health <= 0 || isCustomizingControls) {
      camera.position.set(pos.x, pos.y + 0.6, pos.z);
      if (socket && me.health > 0) {
        socket.emit('move', { x: pos.x, y: pos.y, z: pos.z, rx: camera.rotation.x, ry: camera.rotation.y, rz: camera.rotation.z });
      }
      return;
    }

    // Fallback respawn if falling through map
    if (!adminState.noclip && pos.y < -150) {
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

    let baseSpeed = gameMode === 'speed' ? 50 : BASE_SPEED;
    if (gameMode === 'custom' && customConfig) {
      baseSpeed = customConfig.speed;
    }

    if (adminState.flying) {
      direction.subVectors(frontVector, sideVector);
      if (direction.lengthSq() > 0) direction.normalize();
      const currentSpeed = adminState.speed || baseSpeed;
      direction.multiplyScalar(currentSpeed).applyEuler(camera.rotation);
      
      bodyRef.current.setGravityScale(0, true);
      let verticalVelocity = direction.y;
      if (keysRef.current.space) verticalVelocity += currentSpeed;
      if (keysRef.current.shift) verticalVelocity -= currentSpeed;
      bodyRef.current.setLinvel({ x: direction.x, y: verticalVelocity, z: direction.z }, true);
    } else {
      const currentSpeed = adminState.speed || baseSpeed;
      eulerY.set(0, camera.rotation.y, 0, 'YXZ');
      direction.subVectors(frontVector, sideVector);
      if (direction.lengthSq() > 0) direction.normalize();
      direction.multiplyScalar(currentSpeed).applyEuler(eulerY);
      
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
      const canJump = (isGrounded || (now - lastGroundedTime.current < 150)) && (now - lastJumpTime.current > 250);
      // Jump buffering: 150ms before hitting the ground
      const wantsToJump = keysRef.current.space || (now - lastJumpInputTime.current < 150);

      if (wantsToJump && canJump) {
        // Reset vertical velocity before applying impulse to ensure consistent jump height
        bodyRef.current.setLinvel({ x: linvel.x, y: 0, z: linvel.z }, true);
        bodyRef.current.applyImpulse({ x: 0, y: JUMP_FORCE, z: 0 }, true);
        lastGroundedTime.current = 0; // Prevent double jumping
        lastJumpInputTime.current = 0; // Consume jump buffer
        lastJumpTime.current = now;
        keysRef.current.space = false; // Require releasing and pressing space again to jump
        window.dispatchEvent(new CustomEvent('playerJump'));
        playSound('jump');
      }

      // Footsteps
      if (isGrounded && direction.lengthSq() > 0.1) {
        if (now - lastFootstepTime.current > 300) {
          playSound('footstep');
          lastFootstepTime.current = now;
        }
      }

      // Dash
      if (keysRef.current.shift || mobileDashRef.current) {
        if (now - lastDashTime.current > 1000) { // 1 second cooldown
          lastDashTime.current = now;
          window.dispatchEvent(new CustomEvent('playerDash'));
          
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
          
          let dashBurst = isGrounded ? 87 : 110;
          if (gameMode === 'speed') {
            dashBurst = isGrounded ? 150 : 200;
          } else if (gameMode === 'custom' && customConfig) {
            dashBurst = isGrounded ? customConfig.speed * 7 : customConfig.speed * 9;
          }
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
        
        // Ledge detection via downward raycast
        // Start a ray slightly in front of the player and above their head, casting downward
        const ledgeOrigin = { 
          x: pos.x + moveDir.x * 0.6, 
          y: pos.y + 1.0, 
          z: pos.z + moveDir.z * 0.6 
        };
        const downRay = new rapier.Ray(ledgeOrigin, { x: 0, y: -1, z: 0 });
        const downHit = world.castRayAndGetNormal(downRay, 2.0, true);
        
        if (downHit) {
          const hitY = ledgeOrigin.y - downHit.timeOfImpact;
          // Check if the hit surface is between knee height and head height
          // Also ensure the surface is relatively flat (normal.y > 0.5) so we don't climb steep walls
          if (hitY > pos.y - 0.8 && hitY < pos.y + 0.6) {
            if (!downHit.normal || downHit.normal.y > 0.5) {
              if (now - lastVaultTime.current > 500) {
                climbVelocity = Math.max(linvel.y, 8); // Apply upward velocity to vault over
                lastVaultTime.current = now;
              }
            }
          }
        }
      }

      bodyRef.current.setGravityScale(2.5, true);
      bodyRef.current.setLinvel({ x: direction.x, y: climbVelocity, z: direction.z }, true);
    }

    // Update Camera Position directly to prevent jitter at high sensitivities
    camera.position.set(pos.x, pos.y + 0.6, pos.z);

    // Apply camera shake
    if (cameraShake.current > 0.01) {
      camera.position.x += (Math.random() - 0.5) * cameraShake.current;
      camera.position.y += (Math.random() - 0.5) * cameraShake.current;
      camera.position.z += (Math.random() - 0.5) * cameraShake.current;
      
      // Also apply slight rotation shake for more impact
      camera.rotation.z = (Math.random() - 0.5) * cameraShake.current * 0.1;

      cameraShake.current *= 0.8; // Decay
    } else {
      cameraShake.current = 0;
      camera.rotation.z = 0; // Reset rotation shake
    }

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

  const spectating = useGameStore((state) => state.spectating);

  return (
    <>
      {!isMobile && <PointerLockControls pointerSpeed={sensitivity} />}
      
      {/* Attach Gun to Camera */}
      {!spectating && <FirstPersonWeapon weapon={me?.weapon || 'DEFAULT'} color={me?.color || '#fff'} />}

      <RigidBody ref={bodyRef} colliders={false} mass={1} type="dynamic" position={[me?.x || 0, me?.y || 100, me?.z || 0]} enabledRotations={[false, false, false]} friction={0} restitution={0} ccd gravityScale={2.5}>
        <CapsuleCollider args={[0.5, 0.4]} friction={0} restitution={0} sensor={adminState.noclip} />
        <mesh visible={true} userData={{ playerId: myId }}>
          <capsuleGeometry args={[0.4, 1, 4, 8]} />
          <meshStandardMaterial color={me?.color || '#fff'} roughness={0.5} metalness={0.5} />
        </mesh>
        
        {/* CubeCamera to generate envMap for reflections */}
        {ultraVisuals && (
          <CubeCamera resolution={256} frames={Infinity} near={0.1} far={1000} position={[0, 0.5, 0]}>
            {(texture) => {
              useEffect(() => {
                useGameStore.getState().setEnvMap(texture);
              }, [texture]);
              return <group />;
            }}
          </CubeCamera>
        )}
      </RigidBody>
    </>
  );
}
