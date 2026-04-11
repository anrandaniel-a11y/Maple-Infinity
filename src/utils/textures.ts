import * as THREE from 'three';

export function createWoodTexture() {
  const canvas = document.createElement('canvas');
  canvas.width = 256;
  canvas.height = 256;
  const ctx = canvas.getContext('2d')!;
  
  ctx.fillStyle = '#5c3a21';
  ctx.fillRect(0, 0, 256, 256);
  
  // Draw wood grain
  ctx.fillStyle = '#3e2311';
  for (let i = 0; i < 150; i++) {
    ctx.beginPath();
    const x = Math.random() * 256;
    const y = Math.random() * 256;
    const w = Math.random() * 3 + 1;
    const h = Math.random() * 80 + 20;
    ctx.ellipse(x, y, w, h, Math.random() * 0.1, 0, Math.PI * 2);
    ctx.fill();
  }
  
  const texture = new THREE.CanvasTexture(canvas);
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.RepeatWrapping;
  return texture;
}

export function createMetalTexture() {
  const canvas = document.createElement('canvas');
  canvas.width = 256;
  canvas.height = 256;
  const ctx = canvas.getContext('2d')!;
  
  ctx.fillStyle = '#444444';
  ctx.fillRect(0, 0, 256, 256);
  
  // Add noise
  const imgData = ctx.getImageData(0, 0, 256, 256);
  for (let i = 0; i < imgData.data.length; i += 4) {
    const noise = (Math.random() - 0.5) * 40;
    imgData.data[i] = Math.min(255, Math.max(0, imgData.data[i] + noise));
    imgData.data[i+1] = Math.min(255, Math.max(0, imgData.data[i+1] + noise));
    imgData.data[i+2] = Math.min(255, Math.max(0, imgData.data[i+2] + noise));
  }
  ctx.putImageData(imgData, 0, 0);
  
  // Add scratches
  ctx.strokeStyle = '#888888';
  ctx.lineWidth = 1;
  for (let i = 0; i < 100; i++) {
    ctx.beginPath();
    const x = Math.random() * 256;
    const y = Math.random() * 256;
    ctx.moveTo(x, y);
    ctx.lineTo(x + (Math.random() - 0.5) * 30, y + (Math.random() - 0.5) * 30);
    ctx.stroke();
  }
  
  const texture = new THREE.CanvasTexture(canvas);
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.RepeatWrapping;
  return texture;
}

export function createCarbonFiberTexture() {
  const canvas = document.createElement('canvas');
  canvas.width = 64;
  canvas.height = 64;
  const ctx = canvas.getContext('2d')!;
  
  ctx.fillStyle = '#111111';
  ctx.fillRect(0, 0, 64, 64);
  
  ctx.fillStyle = '#2a2a2a';
  ctx.fillRect(0, 0, 32, 32);
  ctx.fillRect(32, 32, 32, 32);
  
  ctx.fillStyle = '#1a1a1a';
  ctx.fillRect(0, 32, 32, 32);
  ctx.fillRect(32, 0, 32, 32);
  
  const texture = new THREE.CanvasTexture(canvas);
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.RepeatWrapping;
  texture.repeat.set(4, 4);
  return texture;
}

export function createCamoTexture() {
  const canvas = document.createElement('canvas');
  canvas.width = 256;
  canvas.height = 256;
  const ctx = canvas.getContext('2d')!;
  
  ctx.fillStyle = '#4b5320';
  ctx.fillRect(0, 0, 256, 256);
  
  const colors = ['#3e451a', '#5c6628', '#2d3313', '#6b7533'];
  for (let i = 0; i < 150; i++) {
    ctx.fillStyle = colors[Math.floor(Math.random() * colors.length)];
    ctx.beginPath();
    const x = Math.random() * 256;
    const y = Math.random() * 256;
    const r = Math.random() * 40 + 10;
    ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.fill();
  }
  
  const texture = new THREE.CanvasTexture(canvas);
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.RepeatWrapping;
  return texture;
}

export function createDamascusTexture() {
  const canvas = document.createElement('canvas');
  canvas.width = 256;
  canvas.height = 256;
  const ctx = canvas.getContext('2d')!;
  
  ctx.fillStyle = '#888888';
  ctx.fillRect(0, 0, 256, 256);
  
  ctx.strokeStyle = '#555555';
  ctx.lineWidth = 2;
  for (let i = 0; i < 200; i++) {
    ctx.beginPath();
    const x = Math.random() * 256;
    const y = Math.random() * 256;
    ctx.moveTo(x, y);
    ctx.bezierCurveTo(
      x + Math.random() * 50 - 25, y + Math.random() * 50 - 25,
      x + Math.random() * 50 - 25, y + Math.random() * 50 - 25,
      x + Math.random() * 100 - 50, y + Math.random() * 100 - 50
    );
    ctx.stroke();
  }
  
  const texture = new THREE.CanvasTexture(canvas);
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.RepeatWrapping;
  return texture;
}
