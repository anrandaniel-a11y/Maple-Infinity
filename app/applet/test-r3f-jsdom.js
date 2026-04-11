const { JSDOM } = require('jsdom');
const dom = new JSDOM('<!DOCTYPE html><html><body></body></html>');
global.window = dom.window;
global.document = dom.window.document;
global.navigator = dom.window.navigator;

const THREE = require('three');
try {
  const geom = new THREE.PlaneGeometry(NaN, 1);
  const mat = new THREE.MeshBasicMaterial();
  const mesh = new THREE.Mesh(geom, mat);
  
  const renderer = new THREE.WebGLRenderer();
  const scene = new THREE.Scene();
  scene.add(mesh);
  const camera = new THREE.PerspectiveCamera();
  renderer.render(scene, camera);
  console.log('ok');
} catch (e) {
  console.error(e);
}
