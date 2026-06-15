import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';

const canvasHost = document.querySelector('#garden-canvas');
const hoverLabel = document.querySelector('#hover-label');
const gardenStatus = document.querySelector('#garden-status');
const resetCameraButton = document.querySelector('#reset-camera');
const heightScaleInput = document.querySelector('#height-scale');
const windScaleInput = document.querySelector('#wind-scale');
const heightValue = document.querySelector('#height-value');
const windValue = document.querySelector('#wind-value');
const emptyFlower = document.querySelector('#empty-flower');
const flowerDetails = document.querySelector('#flower-details');
const flowerName = document.querySelector('#flower-name');
const flowerDate = document.querySelector('#flower-date');
const flowerMood = document.querySelector('#flower-mood');
const flowerNote = document.querySelector('#flower-note');

const flowerMoods = [
  { label: '开心', color: '#f6b73c', center: '#7a4b10', note: '今天像一束暖光，适合开得热烈一点。' },
  { label: '平静', color: '#8fc7d6', center: '#2f6673', note: '风很轻，事情也慢慢落到了自己的位置。' },
  { label: '疑问', color: '#b99cf1', center: '#5a3f8f', note: '有些问题还没有答案，但已经有了方向。' },
  { label: '期待', color: '#f48aa5', center: '#8a3650', note: '把明天先种下，等它自己长出轮廓。' },
  { label: '疲惫', color: '#d7a36c', center: '#754c28', note: '今天不用太用力，先把根扎稳。' },
  { label: '勇敢', color: '#ed6a5a', center: '#842c24', note: '有一点紧张，也有一点向前的力量。' },
];

const flowers = createFlowerData();
const flowerGroups = new Map();
const clickableObjects = [];
let selectedFlower = null;
let hoveredFlower = null;
let windStrength = Number(windScaleInput.value);
let heightScale = Number(heightScaleInput.value);

const scene = new THREE.Scene();
scene.background = new THREE.Color('#eef6f1');
scene.fog = new THREE.Fog('#eef6f1', 18, 38);

const camera = new THREE.PerspectiveCamera(42, 1, 0.1, 100);
const cameraHome = new THREE.Vector3(8.6, 6.2, 9.4);
const targetHome = new THREE.Vector3(0, 0.4, 0);
camera.position.copy(cameraHome);

const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false });
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
renderer.outputColorSpace = THREE.SRGBColorSpace;
canvasHost.appendChild(renderer.domElement);

const controls = new OrbitControls(camera, renderer.domElement);
controls.enableDamping = true;
controls.dampingFactor = 0.06;
controls.enablePan = true;
controls.enableZoom = true;
controls.enableRotate = true;
controls.minDistance = 4;
controls.maxDistance = 24;
controls.maxPolarAngle = Math.PI * 0.48;
controls.target.copy(targetHome);

const raycaster = new THREE.Raycaster();
const pointer = new THREE.Vector2();
const clock = new THREE.Clock();

buildScene();
bindEvents();
resizeRenderer();
selectFlower(flowers[0].id);
gardenStatus.textContent = `已载入 ${flowers.length} 朵花`;
renderer.setAnimationLoop(animate);

function createFlowerData() {
  const rows = 5;
  const cols = 7;
  const list = [];
  const start = new Date('2026-02-03T00:00:00');

  for (let row = 0; row < rows; row += 1) {
    for (let col = 0; col < cols; col += 1) {
      const index = row * cols + col;
      const mood = flowerMoods[index % flowerMoods.length];
      const date = new Date(start);
      date.setDate(start.getDate() + index * 3);

      list.push({
        id: `flower-${index}`,
        name: `${mood.label}花 ${String(index + 1).padStart(2, '0')}`,
        mood: mood.label,
        note: mood.note,
        color: mood.color,
        center: mood.center,
        date: date.toISOString().slice(0, 10),
        x: (col - (cols - 1) / 2) * 2.2 + Math.sin(index * 1.7) * 0.16,
        z: (row - (rows - 1) / 2) * 2.1 + Math.cos(index * 1.3) * 0.14,
        height: 0.78 + ((index * 17) % 25) / 100,
        petals: 6 + (index % 3),
      });
    }
  }

  return list;
}

function buildScene() {
  addLights();
  addGround();
  addGrass();
  addMonthLabels();

  flowers.forEach((flower) => {
    const group = createFlower(flower);
    flowerGroups.set(flower.id, group);
    scene.add(group);
  });

  const halo = new THREE.Mesh(
    new THREE.RingGeometry(0.42, 0.52, 48),
    new THREE.MeshBasicMaterial({
      color: '#5b6ee1',
      transparent: true,
      opacity: 0.75,
      side: THREE.DoubleSide,
      depthWrite: false,
    }),
  );
  halo.name = 'selected-halo';
  halo.rotation.x = -Math.PI / 2;
  halo.position.y = 0.025;
  halo.visible = false;
  scene.add(halo);
}

function addLights() {
  const hemisphere = new THREE.HemisphereLight('#ffffff', '#8d9d85', 2.2);
  scene.add(hemisphere);

  const sun = new THREE.DirectionalLight('#fff1d7', 3.4);
  sun.position.set(6, 9, 5);
  sun.castShadow = true;
  sun.shadow.mapSize.set(2048, 2048);
  sun.shadow.camera.near = 1;
  sun.shadow.camera.far = 25;
  sun.shadow.camera.left = -12;
  sun.shadow.camera.right = 12;
  sun.shadow.camera.top = 12;
  sun.shadow.camera.bottom = -12;
  scene.add(sun);
}

function addGround() {
  const ground = new THREE.Mesh(
    new THREE.PlaneGeometry(18, 15),
    new THREE.MeshStandardMaterial({ color: '#f7f5ec', roughness: 0.9 }),
  );
  ground.rotation.x = -Math.PI / 2;
  ground.receiveShadow = true;
  scene.add(ground);

  const bedMaterial = new THREE.MeshStandardMaterial({ color: '#dfe9d7', roughness: 0.86 });
  const pathMaterial = new THREE.MeshStandardMaterial({ color: '#ffffff', roughness: 0.78 });

  for (let x = -7.7; x <= 7.7; x += 2.2) {
    const strip = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.025, 15), pathMaterial);
    strip.position.set(x, 0.02, 0);
    strip.receiveShadow = true;
    scene.add(strip);
  }

  for (let z = -6.3; z <= 6.3; z += 2.1) {
    const strip = new THREE.Mesh(new THREE.BoxGeometry(18, 0.025, 0.1), pathMaterial);
    strip.position.set(0, 0.022, z);
    strip.receiveShadow = true;
    scene.add(strip);
  }

  flowers.forEach((flower) => {
    const bed = new THREE.Mesh(new THREE.CylinderGeometry(0.72, 0.8, 0.06, 16), bedMaterial);
    bed.position.set(flower.x, 0.03, flower.z);
    bed.receiveShadow = true;
    scene.add(bed);
  });
}

function addGrass() {
  const bladeGeometry = new THREE.ConeGeometry(0.045, 0.34, 5);
  const bladeMaterial = new THREE.MeshStandardMaterial({ color: '#6d8f60', roughness: 0.8 });
  const blades = new THREE.InstancedMesh(bladeGeometry, bladeMaterial, flowers.length * 11);
  const matrix = new THREE.Matrix4();
  const quaternion = new THREE.Quaternion();
  const scale = new THREE.Vector3();
  let instanceIndex = 0;

  flowers.forEach((flower, flowerIndex) => {
    for (let i = 0; i < 11; i += 1) {
      const angle = (i / 11) * Math.PI * 2 + flowerIndex * 0.28;
      const radius = 0.26 + ((i * 31 + flowerIndex) % 32) / 100;
      const x = flower.x + Math.cos(angle) * radius;
      const z = flower.z + Math.sin(angle) * radius;
      const y = 0.19;
      const lean = 0.12 + ((i + flowerIndex) % 5) * 0.025;

      quaternion.setFromEuler(new THREE.Euler(lean, angle, -lean * 0.6));
      scale.setScalar(0.7 + ((i * 7 + flowerIndex) % 8) / 10);
      matrix.compose(new THREE.Vector3(x, y, z), quaternion, scale);
      blades.setMatrixAt(instanceIndex, matrix);
      instanceIndex += 1;
    }
  });

  blades.castShadow = true;
  blades.receiveShadow = true;
  scene.add(blades);
}

function addMonthLabels() {
  const labels = [
    { text: '2026.02', x: -5.6, z: -5.6 },
    { text: '2026.03', x: -1.1, z: -5.6 },
    { text: '2026.04', x: 3.4, z: -5.6 },
    { text: '2026.05', x: -5.6, z: 5.2 },
    { text: '2026.06', x: -1.1, z: 5.2 },
    { text: '2026.07', x: 3.4, z: 5.2 },
  ];

  labels.forEach(({ text, x, z }) => {
    const sprite = createTextSprite(text);
    sprite.position.set(x, 0.08, z);
    scene.add(sprite);
  });
}

function createFlower(flower) {
  const group = new THREE.Group();
  group.position.set(flower.x, 0, flower.z);
  group.userData.flowerId = flower.id;

  const stemMaterial = new THREE.MeshStandardMaterial({ color: '#47764b', roughness: 0.72 });
  const petalMaterial = new THREE.MeshStandardMaterial({
    color: flower.color,
    roughness: 0.55,
    metalness: 0.02,
  });
  const centerMaterial = new THREE.MeshStandardMaterial({
    color: flower.center,
    roughness: 0.48,
  });
  const leafMaterial = new THREE.MeshStandardMaterial({ color: '#5d8c59', roughness: 0.72 });

  const stem = new THREE.Mesh(new THREE.CylinderGeometry(0.025, 0.035, flower.height, 10), stemMaterial);
  stem.position.y = flower.height / 2;
  stem.castShadow = true;
  stem.userData.flowerId = flower.id;
  clickableObjects.push(stem);
  group.add(stem);

  const leafGeometry = new THREE.SphereGeometry(0.12, 12, 8);
  for (let i = 0; i < 2; i += 1) {
    const leaf = new THREE.Mesh(leafGeometry, leafMaterial);
    leaf.scale.set(1.5, 0.28, 0.55);
    leaf.position.set(i === 0 ? -0.11 : 0.12, flower.height * (i === 0 ? 0.42 : 0.58), 0);
    leaf.rotation.z = i === 0 ? 0.55 : -0.55;
    leaf.rotation.y = i === 0 ? -0.35 : 0.35;
    leaf.castShadow = true;
    leaf.userData.flowerId = flower.id;
    clickableObjects.push(leaf);
    group.add(leaf);
  }

  const petalGeometry = new THREE.SphereGeometry(0.12, 18, 10);
  for (let i = 0; i < flower.petals; i += 1) {
    const angle = (i / flower.petals) * Math.PI * 2;
    const petal = new THREE.Mesh(petalGeometry, petalMaterial);
    petal.position.set(Math.cos(angle) * 0.16, flower.height + 0.04, Math.sin(angle) * 0.16);
    petal.scale.set(1.1, 0.42, 0.62);
    petal.rotation.y = -angle;
    petal.castShadow = true;
    petal.userData.flowerId = flower.id;
    clickableObjects.push(petal);
    group.add(petal);
  }

  const center = new THREE.Mesh(new THREE.SphereGeometry(0.095, 18, 12), centerMaterial);
  center.position.y = flower.height + 0.05;
  center.castShadow = true;
  center.userData.flowerId = flower.id;
  clickableObjects.push(center);
  group.add(center);

  const hitArea = new THREE.Mesh(
    new THREE.SphereGeometry(0.38, 16, 12),
    new THREE.MeshBasicMaterial({ transparent: true, opacity: 0, depthWrite: false }),
  );
  hitArea.position.y = flower.height * 0.72;
  hitArea.userData.flowerId = flower.id;
  clickableObjects.push(hitArea);
  group.add(hitArea);

  group.scale.y = heightScale;
  return group;
}

function createTextSprite(text) {
  const canvas = document.createElement('canvas');
  const context = canvas.getContext('2d');
  canvas.width = 256;
  canvas.height = 96;
  context.clearRect(0, 0, canvas.width, canvas.height);
  context.font = '700 34px "Microsoft YaHei", sans-serif';
  context.fillStyle = 'rgba(48, 55, 71, 0.74)';
  context.textAlign = 'center';
  context.textBaseline = 'middle';
  context.fillText(text, canvas.width / 2, canvas.height / 2);

  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  const sprite = new THREE.Sprite(new THREE.SpriteMaterial({ map: texture, transparent: true }));
  sprite.scale.set(1.35, 0.5, 1);
  return sprite;
}

function bindEvents() {
  resetCameraButton.addEventListener('click', resetCamera);

  heightScaleInput.addEventListener('input', () => {
    heightScale = Number(heightScaleInput.value);
    heightValue.textContent = heightScale.toFixed(1);
    flowerGroups.forEach((group) => {
      group.scale.y = heightScale;
    });
  });

  windScaleInput.addEventListener('input', () => {
    windStrength = Number(windScaleInput.value);
    windValue.textContent = windStrength.toFixed(1);
  });

  renderer.domElement.addEventListener('click', (event) => {
    const flower = pickFlower(event);
    if (flower) {
      selectFlower(flower.id);
    }
  });

  renderer.domElement.addEventListener('pointermove', (event) => {
    const flower = pickFlower(event);
    hoveredFlower = flower;
    renderer.domElement.style.cursor = flower ? 'pointer' : 'grab';

    if (flower) {
      hoverLabel.hidden = false;
      hoverLabel.textContent = `${flower.name} · ${flower.date}`;
      hoverLabel.style.left = `${event.clientX + 14}px`;
      hoverLabel.style.top = `${event.clientY + 14}px`;
    } else {
      hoverLabel.hidden = true;
    }
  });

  renderer.domElement.addEventListener('pointerleave', () => {
    hoveredFlower = null;
    hoverLabel.hidden = true;
  });

  window.addEventListener('resize', resizeRenderer);
}

function pickFlower(event) {
  const rect = renderer.domElement.getBoundingClientRect();
  pointer.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
  pointer.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;
  raycaster.setFromCamera(pointer, camera);

  const [hit] = raycaster.intersectObjects(clickableObjects, false);
  if (!hit) {
    return null;
  }

  return flowers.find((flower) => flower.id === hit.object.userData.flowerId) ?? null;
}

function selectFlower(flowerId) {
  const flower = flowers.find((item) => item.id === flowerId);
  if (!flower) {
    return;
  }

  selectedFlower = flower;
  emptyFlower.hidden = true;
  flowerDetails.hidden = false;
  flowerName.textContent = flower.name;
  flowerDate.textContent = flower.date;
  flowerMood.textContent = flower.mood;
  flowerNote.textContent = flower.note;

  const halo = scene.getObjectByName('selected-halo');
  halo.position.x = flower.x;
  halo.position.z = flower.z;
  halo.visible = true;
}

function resetCamera() {
  camera.position.copy(cameraHome);
  controls.target.copy(targetHome);
  controls.update();
}

function resizeRenderer() {
  const width = canvasHost.clientWidth;
  const height = canvasHost.clientHeight;
  camera.aspect = width / height;
  camera.updateProjectionMatrix();
  renderer.setSize(width, height, false);
}

function animate() {
  const elapsed = clock.getElapsedTime();

  flowerGroups.forEach((group, flowerId) => {
    const index = Number(flowerId.replace('flower-', ''));
    group.rotation.z = Math.sin(elapsed * 1.8 + index * 0.42) * 0.03 * windStrength;
    group.rotation.x = Math.cos(elapsed * 1.25 + index * 0.21) * 0.018 * windStrength;
  });

  const halo = scene.getObjectByName('selected-halo');
  if (halo?.visible && selectedFlower) {
    halo.material.opacity = 0.52 + Math.sin(elapsed * 3) * 0.12;
  }

  if (hoveredFlower && selectedFlower?.id !== hoveredFlower.id) {
    const group = flowerGroups.get(hoveredFlower.id);
    group.scale.x = 1.04;
    group.scale.z = 1.04;
  }

  flowerGroups.forEach((group, flowerId) => {
    if (!hoveredFlower || hoveredFlower.id !== flowerId) {
      group.scale.x += (1 - group.scale.x) * 0.12;
      group.scale.z += (1 - group.scale.z) * 0.12;
    }
  });

  controls.update();
  renderer.render(scene, camera);
}
