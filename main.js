import * as THREE from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";
import { BufferGeometryUtils } from "three/examples/jsm/utils/BufferGeometryUtils.js";

// Initialize Scene, Camera, and Renderer
const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(
  60,
  window.innerWidth / window.innerHeight,
  0.1,
  500
);
camera.position.set(0, -25, 80);

const renderer = new THREE.WebGLRenderer({
  canvas: document.querySelector(".webgl"),
  antialias: true,
});
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setClearColor(0x181005); // Background color

// Orbit Controls
const controls = new OrbitControls(camera, renderer.domElement);
controls.maxDistance = 150;
controls.enableDamping = true;

// Lantern Geometry and Materials
const geoms = [];
const pts = [
  new THREE.Vector2(0, 1),
  new THREE.Vector2(0.25, 0.125),
  new THREE.Vector2(0.25, 0),
  new THREE.Vector2(0.45, 0.125),
  new THREE.Vector2(0.45, 0.5),
];

// Main lantern shape
const geom = new THREE.LatheGeometry(pts, 20);
geoms.push(geom);

// Cylinder for light base
const geomLight = new THREE.CylinderGeometry(0.1, 0.05, 0.2, 10);
geoms.push(geomLight);

// Combine geometries
const fullGeom = BufferGeometryUtils.mergeGeometries(geoms);

// Instance attributes
const num = 500;
const instPos = new Float32Array(num * 3);
const instSpeed = new Float32Array(num);
const instLight = new Float32Array(num * 2);

for (let i = 0; i < num; i++) {
  instPos.set(
    [
      (Math.random() - 0.5) * 200,
      (Math.random() - 0.5) * 200,
      (Math.random() - 0.5) * 200,
    ],
    i * 3
  );

  instSpeed[i] = 0.25 + Math.random() * 0.5;
  instLight.set(
    [Math.PI * Math.random() * 2, Math.PI * (Math.random() * 5)],
    i * 2
  );
}

fullGeom.setAttribute(
  "instPos",
  new THREE.InstancedBufferAttribute(instPos, 3)
);
fullGeom.setAttribute(
  "instSpeed",
  new THREE.InstancedBufferAttribute(instSpeed, 1)
);
fullGeom.setAttribute(
  "instLight",
  new THREE.InstancedBufferAttribute(instLight, 2)
);

// Shader Material
const mat = new THREE.ShaderMaterial({
  uniforms: {
    uTime: { value: 0 },
    uLight: { value: new THREE.Color("red").multiplyScalar(1.5) },
    uColor: { value: new THREE.Color("maroon").multiplyScalar(1) },
    uFire: { value: new THREE.Color(1, 0.75, 0) },
  },
  vertexShader: `
    uniform float uTime;

    attribute vec3 instPos;
    attribute float instSpeed;
    attribute vec2 instLight;

    varying vec2 vInstLight;
    varying float vY;

    void main() {
      vInstLight = instLight;
      vY = position.y;

      vec3 pos = position * 2.0;
      vec3 iPos = instPos;

      // Oscillating motion
      iPos.xz += vec2(
        cos(instLight.x + uTime * instSpeed),
        sin(instLight.y + uTime * instSpeed)
      );

      // Vertical loop
      iPos.y = mod(iPos.y + 200.0 + (uTime * instSpeed), 400.0) - 200.0;
      pos += iPos;

      gl_Position = projectionMatrix * modelViewMatrix * vec4(pos, 1.0);
    }
  `,
  fragmentShader: `
    uniform vec3 uLight;
    uniform vec3 uColor;
    uniform vec3 uFire;

    varying vec2 vInstLight;
    varying float vY;

    void main() {
      vec3 col = vec3(0.0);
      float flicker = sin(vInstLight.x + vInstLight.y) * 0.5 + 0.5;

      col = mix(uLight, uColor, flicker);
      if (vY < 0.2) {
        col = mix(col, uFire, 0.8);
      }

      gl_FragColor = vec4(col, 1.0);
    }
  `,
  side: THREE.DoubleSide,
});

// Lantern Mesh
const lantern = new THREE.Mesh(fullGeom, mat);
scene.add(lantern);

// Animation Loop
const clock = new THREE.Clock();
renderer.setAnimationLoop(() => {
  controls.update();
  mat.uniforms.uTime.value = clock.getElapsedTime();
  renderer.render(scene, camera);
});

// Handle Resizing
window.addEventListener("resize", () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});
