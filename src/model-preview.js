import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';

const canvasHost = document.querySelector('#model-canvas');
const statusPill = document.querySelector('#model-status');
const meshCount = document.querySelector('#mesh-count');
const materialCount = document.querySelector('#material-count');
const partSummary = document.querySelector('#part-summary');
const modelWarning = document.querySelector('#model-warning');
const nodeList = document.querySelector('#node-list');
const mappingList = document.querySelector('#mapping-list');
const dnaControls = document.querySelector('#dna-controls');
const diagnosticColorsInput = document.querySelector('#diagnostic-colors');
const publicAsset = (path) => `${import.meta.env.BASE_URL}${path}`;
const modelUrl = publicAsset('models/meigui.glb');

const dnaDimensions = [
  {
    key: 'growth',
    label: 'Growth',
    meaning: '成长感',
    target: '花瓣层数。低值只显示外层花瓣，高值逐步显示完整四层花瓣。',
    defaultValue: 1,
  },
  {
    key: 'hope',
    label: 'Hope',
    meaning: '希望感',
    target: '朝向。控制玫瑰整体面向左侧、正前或右侧。',
    defaultValue: 0.5,
  },
  {
    key: 'connection',
    label: 'Connection',
    meaning: '连接感',
    target: '叶片展开。叶片向外舒展，枝叶连接感更强。',
    defaultValue: 0.58,
  },
  {
    key: 'resilience',
    label: 'Resilience',
    meaning: '韧性',
    target: '茎干高度。轻微拉高花茎，同时花头/花瓣整体随茎顶上移。',
    defaultValue: 0.5,
  },
  {
    key: 'calm',
    label: 'Calm',
    meaning: '平静感',
    target: '左右摇摆。数值越高，风中摆动越小、越稳定。',
    defaultValue: 0.72,
  },
  {
    key: 'curiosity',
    label: 'Curiosity',
    meaning: '探索欲',
    target: '花瓣收拢。数值越高，花瓣越向内收。',
    defaultValue: 0,
  },
  {
    key: 'acceptance',
    label: 'Acceptance',
    meaning: '自我接纳',
    target: '颜色灰度。数值越高颜色越饱满，数值越低越灰。',
    defaultValue: 1,
  },
  {
    key: 'doubt',
    label: 'Doubt',
    meaning: '自我怀疑',
    target: '低头姿态。当前模型先控制整株低头；有 FlowerHead 后可只控制花头。',
    defaultValue: 0,
  },
];

const dna = Object.fromEntries(dnaDimensions.map((item) => [item.key, item.defaultValue]));
const dnaInputs = new Map();
const dnaOutputs = new Map();

const scene = new THREE.Scene();
scene.background = new THREE.Color('#edf4ef');
scene.fog = new THREE.Fog('#edf4ef', 12, 28);

const camera = new THREE.PerspectiveCamera(42, 1, 0.1, 100);
camera.position.set(3.8, 2.8, 4.8);

const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.toneMapping = THREE.NoToneMapping;
renderer.toneMappingExposure = 1.08;
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
canvasHost.appendChild(renderer.domElement);

const controls = new OrbitControls(camera, renderer.domElement);
controls.enableDamping = true;
controls.dampingFactor = 0.06;
controls.target.set(0, 1, 0);
controls.minDistance = 1.4;
controls.maxDistance = 12;

const modelRoot = new THREE.Group();
scene.add(modelRoot);

let windPhase = 0;
let windAmplitude = 0.018;

const partRefs = {
  all: [],
  meshes: [],
  stems: [],
  heads: [],
  petals: [],
  leaves: [],
  sepals: [],
  materials: new Set(),
  flowers: new Map(),
  maxPetalLayer: 1,
};

addLights();
addStage();
renderDNAControls();
bindEvents();
resizeRenderer();
await loadModel();
renderer.setAnimationLoop(animate);
window.addEventListener('resize', resizeRenderer);

function addLights() {
  scene.add(new THREE.AmbientLight('#ffffff', 0.5));
  scene.add(new THREE.HemisphereLight('#ffffff', '#e7f3e4', 2.1));

  const key = new THREE.DirectionalLight('#fff4e1', 4.4);
  key.position.set(4, 7, 4);
  key.castShadow = true;
  key.shadow.mapSize.set(2048, 2048);
  scene.add(key);

  const fill = new THREE.DirectionalLight('#e2e8ff', 1.18);
  fill.position.set(-5, 3, -3);
  scene.add(fill);

  const rim = new THREE.DirectionalLight('#dcffe1', 0.72);
  rim.position.set(-2, 4, 5);
  scene.add(rim);
}

function addStage() {
  const ground = new THREE.Mesh(
    new THREE.CircleGeometry(2.8, 80),
    new THREE.MeshStandardMaterial({ color: '#f9f7ef', roughness: 0.82 }),
  );
  ground.rotation.x = -Math.PI / 2;
  ground.receiveShadow = true;
  scene.add(ground);

  const ring = new THREE.Mesh(
    new THREE.RingGeometry(1.2, 1.24, 96),
    new THREE.MeshBasicMaterial({ color: '#d7ead1', transparent: true, opacity: 0.85 }),
  );
  ring.rotation.x = -Math.PI / 2;
  ring.position.y = 0.01;
  scene.add(ring);
}

function renderDNAControls() {
  dnaControls.replaceChildren();

  dnaDimensions.forEach((dimension) => {
    const wrapper = document.createElement('div');
    wrapper.className = 'dna-control';

    const label = document.createElement('label');
    label.className = 'slider-row';
    label.setAttribute('for', `dna-${dimension.key}`);

    const text = document.createElement('span');
    text.textContent = `${dimension.label} · ${dimension.meaning}`;

    const output = document.createElement('output');
    output.id = `${dimension.key}-output`;
    output.textContent = dimension.defaultValue.toFixed(2);

    const input = document.createElement('input');
    input.id = `dna-${dimension.key}`;
    input.type = 'range';
    input.min = '0';
    input.max = '1';
    input.step = '0.01';
    input.value = String(dimension.defaultValue);

    label.append(text, output);
    wrapper.append(label, input);
    dnaControls.append(wrapper);
    dnaInputs.set(dimension.key, input);
    dnaOutputs.set(dimension.key, output);
  });
}

function bindEvents() {
  dnaInputs.forEach((input, key) => {
    input.addEventListener('input', () => {
      dna[key] = Number(input.value);
      dnaOutputs.get(key).textContent = dna[key].toFixed(2);
      applyDNA();
      renderMappingList();
    });
  });

  diagnosticColorsInput.addEventListener('input', () => {
    applyMaterials();
  });
}

async function loadModel() {
  const loader = new GLTFLoader();
  const gltf = await loader.loadAsync(modelUrl);
  const source = gltf.scene;

  normalizeModel(source);
  collectParts(source);
  modelRoot.add(source);
  renderNodeList(source);
  updateStats(gltf.animations);
  applyDNA();
  renderMappingList();
  statusPill.textContent = '真实模型已载入';
}

function normalizeModel(source) {
  const box = new THREE.Box3().setFromObject(source);
  const size = box.getSize(new THREE.Vector3());
  const center = box.getCenter(new THREE.Vector3());
  const maxAxis = Math.max(size.x, size.y, size.z) || 1;
  const scale = 2.7 / maxAxis;

  source.position.sub(center);
  source.scale.setScalar(scale);

  const normalizedBox = new THREE.Box3().setFromObject(source);
  source.position.y -= normalizedBox.min.y;
}

function collectParts(source) {
  source.traverse((object) => {
    partRefs.all.push(object);
    object.userData.baseScale = object.scale.clone();
    object.userData.baseRotation = object.rotation.clone();
    object.userData.basePosition = object.position.clone();
    object.userData.role = classifyObject(object);
    object.userData.flowerId = getFlowerId(object);
    object.userData.petalLayer = getPetalLayer(object);

    if (object.isMesh) {
      object.castShadow = true;
      object.receiveShadow = true;
      object.material = cloneMaterial(object.material);
      partRefs.meshes.push(object);
      getObjectMaterials(object).forEach((material) => partRefs.materials.add(material));
      addRoleRef(object);
      addFlowerRef(object);
    } else {
      if (object.userData.role === 'head') {
        partRefs.heads.push(object);
      }
      if (object.userData.role === 'leaf') {
        partRefs.leaves.push(object);
      }
      addFlowerRef(object);
    }

    if (object.userData.petalLayer) {
      partRefs.maxPetalLayer = Math.max(partRefs.maxPetalLayer, object.userData.petalLayer);
    }
  });
}

function cloneMaterial(material) {
  const cloned = Array.isArray(material) ? material.map((item) => item.clone()) : material.clone();
  getMaterials(cloned).forEach((item) => {
    item.userData.baseColor = item.color?.clone?.() ?? new THREE.Color('#ffffff');
    item.userData.baseEmissive = item.emissive?.clone?.() ?? new THREE.Color('#000000');
    item.userData.baseEmissiveIntensity = item.emissiveIntensity ?? 0;
    item.side = THREE.DoubleSide;
  });
  return cloned;
}

function getMaterials(material) {
  return Array.isArray(material) ? material : [material];
}

function getObjectMaterials(object) {
  return getMaterials(object.material);
}

function addRoleRef(object) {
  if (object.userData.role === 'stem') {
    partRefs.stems.push(object);
  }
  if (object.userData.role === 'head') {
    partRefs.heads.push(object);
  }
  if (object.userData.role === 'petal') {
    partRefs.petals.push(object);
  }
  if (object.userData.role === 'leaf') {
    partRefs.leaves.push(object);
  }
  if (object.userData.role === 'sepal') {
    partRefs.sepals.push(object);
  }
}

function addFlowerRef(object) {
  const flowerId = object.userData.flowerId;
  if (!flowerId) {
    return;
  }

  if (!partRefs.flowers.has(flowerId)) {
    partRefs.flowers.set(flowerId, {
      id: flowerId,
      all: [],
      stems: [],
      headParts: [],
      leaves: [],
      petals: [],
      sepals: [],
    });
  }

  const flower = partRefs.flowers.get(flowerId);
  flower.all.push(object);

  if (object.userData.role === 'stem') {
    flower.stems.push(object);
  }
  if (object.userData.role === 'petal') {
    flower.petals.push(object);
    flower.headParts.push(object);
  }
  if (object.userData.role === 'sepal') {
    flower.sepals.push(object);
    flower.headParts.push(object);
  }
  if (object.userData.role === 'leaf') {
    flower.leaves.push(object);
  }
}

function isTransformRoot(object) {
  const role = object.userData.role;
  let cursor = object.parent;

  while (cursor) {
    if (cursor.userData?.role === role) {
      return false;
    }

    cursor = cursor.parent;
  }

  return true;
}

function classifyObject(object) {
  const ownName = object.name.toLowerCase();
  const path = getNamePath(object).toLowerCase();

  if (includesAny(ownName, ['petal', '花瓣', '花瓣层', 'layer']) || hasChinesePetalLayerName(ownName)) {
    return 'petal';
  }
  if (includesAny(ownName, ['stem', 'stalk', '花茎', '花枝'])) {
    return 'stem';
  }
  if (includesAny(ownName, ['sepal', 'calyx', '花托', '萼片'])) {
    return 'sepal';
  }
  if (includesAny(ownName, ['head', 'flowerhead', 'flower_head', '花头', '花朵'])) {
    return 'head';
  }
  if (includesAny(ownName, ['leaf', 'leaves', '叶子', '叶片'])) {
    return 'leaf';
  }

  if (includesAny(path, ['petal', '花瓣', '花瓣层', 'layer']) || hasChinesePetalLayerName(path)) {
    return 'petal';
  }
  if (includesAny(path, ['leaf', 'leaves', '叶子', '叶片'])) {
    return 'leaf';
  }
  if (includesAny(path, ['stem', 'stalk', '花茎', '花枝'])) {
    return 'stem';
  }

  return 'unknown';
}

function getNamePath(object) {
  const names = [];
  let cursor = object;
  while (cursor) {
    if (cursor.name) {
      names.push(cursor.name);
    }
    cursor = cursor.parent;
  }
  return names.join('/');
}

function includesAny(value, tokens) {
  return tokens.some((token) => value.includes(token.toLowerCase()));
}

function hasChinesePetalLayerName(value) {
  return /花瓣第[一二三四五六七八九十0-9]+层/.test(value) || /第[一二三四五六七八九十0-9]+层/.test(value);
}

function getPetalLayer(object) {
  const name = object.name;
  const match = name.match(/花瓣第([一二三四五六七八九十0-9]+)层/) ?? name.match(/第([一二三四五六七八九十0-9]+)层/);
  if (!match) {
    return null;
  }

  return parseChineseNumber(match[1]);
}

function parseChineseNumber(value) {
  const map = {
    一: 1,
    二: 2,
    三: 3,
    四: 4,
    五: 5,
    六: 6,
    七: 7,
    八: 8,
    九: 9,
    十: 10,
  };

  if (/^\d+$/.test(value)) {
    return Number(value);
  }

  if (value === '十') {
    return 10;
  }

  if (value.includes('十')) {
    const [tens, ones] = value.split('十');
    return (tens ? map[tens] : 1) * 10 + (ones ? map[ones] : 0);
  }

  return map[value] ?? null;
}

function getFlowerId(object) {
  const path = getNamePath(object);
  if (path.includes('第一朵花')) {
    return 'flower-1';
  }
  if (path.includes('第二朵花')) {
    return 'flower-2';
  }
  return null;
}

function renderNodeList(source) {
  nodeList.replaceChildren();
  const nodes = [];
  source.traverse((object) => nodes.push(object));

  nodes.slice(0, 60).forEach((object) => {
    const item = document.createElement('li');
    const label = object.name || '(未命名)';
    const type = document.createElement('span');
    const layerText = object.userData.petalLayer ? ` · L${object.userData.petalLayer}` : '';
    type.textContent = object.isMesh ? `Mesh · ${object.userData.role}${layerText}` : `${object.type} · ${object.userData.role}${layerText}`;
    item.textContent = label;
    item.append(type);
    nodeList.append(item);
  });
}

function updateStats(animations) {
  meshCount.textContent = String(partRefs.meshes.length);
  materialCount.textContent = String(partRefs.materials.size);
  partSummary.textContent = [
    `花茎 ${partRefs.stems.length}`,
    `花瓣 ${partRefs.petals.length}`,
    `叶片 ${partRefs.leaves.length}`,
    `花托 ${partRefs.sepals.length}`,
  ].join(' / ');

  const warnings = [];
  if (partRefs.petals.length === 0) {
    warnings.push('没有识别到花瓣对象，Growth/Curiosity 不能控制花瓣层数和收拢。');
  }
  if (animations.length === 0) {
    warnings.push('没有骨骼动画或 Shape Keys，所以当前是代码移动/旋转 mesh 的预览版。');
  }

  if (warnings.length) {
    modelWarning.hidden = false;
    modelWarning.textContent = warnings.join(' ');
  }
}

function renderMappingList() {
  mappingList.replaceChildren();

  dnaDimensions.forEach((dimension) => {
    const row = document.createElement('article');
    row.className = 'mapping-row';

    const title = document.createElement('div');
    title.className = 'mapping-title';
    title.innerHTML = `<strong>${dimension.label}</strong><span>${dimension.meaning}</span>`;

    const target = document.createElement('p');
    target.textContent = dimension.target;

    const binding = document.createElement('span');
    const bindingInfo = getBindingInfo(dimension.key);
    binding.className = `binding-pill ${bindingInfo.ok ? 'is-ok' : 'is-limited'}`;
    binding.textContent = bindingInfo.text;

    row.append(title, target, binding);
    mappingList.append(row);
  });
}

function getBindingInfo(key) {
  const bindings = {
    growth: partRefs.petals.length
      ? { ok: true, text: `已绑定：${partRefs.maxPetalLayer} 层花瓣 / ${partRefs.petals.length} 个花瓣` }
      : { ok: false, text: '受限：未找到花瓣' },
    hope: { ok: true, text: '已绑定：整株朝向' },
    connection: partRefs.leaves.length
      ? { ok: true, text: `已绑定：${partRefs.leaves.length} 个叶片/叶组` }
      : { ok: false, text: '受限：未找到叶片' },
    resilience: partRefs.stems.length
      ? { ok: true, text: `已绑定：${partRefs.stems.length} 个花茎 + 花头上移` }
      : { ok: false, text: '受限：未找到花茎' },
    calm: { ok: true, text: '已绑定：左右摇摆幅度' },
    curiosity: partRefs.petals.length
      ? { ok: true, text: `已绑定：${partRefs.petals.length} 个花瓣收拢` }
      : { ok: false, text: '受限：未找到花瓣' },
    acceptance: partRefs.materials.size
      ? { ok: true, text: `已绑定：${partRefs.materials.size} 个材质灰度` }
      : { ok: false, text: '受限：未找到材质' },
    doubt: { ok: true, text: '已绑定：整株低头姿态' },
  };

  return bindings[key];
}

function applyDNA() {
  const hopeTurn = THREE.MathUtils.lerp(-0.55, 0.55, dna.hope);
  const doubtDroop = THREE.MathUtils.lerp(0, 0.38, dna.doubt);
  modelRoot.rotation.y = hopeTurn;
  modelRoot.rotation.x = doubtDroop;

  applyGrowth();
  applyConnection();
  applyResilience();
  applyCuriosity();
  applyMaterials();

  windAmplitude = THREE.MathUtils.lerp(0.055, 0.004, dna.calm);
}

function applyGrowth() {
  const visibleLayers = Math.max(1, Math.ceil(THREE.MathUtils.lerp(1, partRefs.maxPetalLayer, dna.growth)));

  partRefs.petals.filter(isTransformRoot).forEach((part) => {
    const layer = part.userData.petalLayer ?? 1;
    part.visible = layer <= visibleLayers;
  });
}

function applyConnection() {
  partRefs.leaves.filter(isTransformRoot).forEach((part, index) => {
    const baseRotation = part.userData.baseRotation;
    const baseScale = part.userData.baseScale;
    const direction = index % 2 === 0 ? 1 : -1;
    part.rotation.set(
      baseRotation.x,
      baseRotation.y,
      baseRotation.z + direction * THREE.MathUtils.lerp(-0.1, 0.28, dna.connection),
    );
    part.scale.set(
      baseScale.x * THREE.MathUtils.lerp(0.92, 1.12, dna.connection),
      baseScale.y,
      baseScale.z * THREE.MathUtils.lerp(0.92, 1.12, dna.connection),
    );
  });
}

function applyResilience() {
  const stemHeight = THREE.MathUtils.lerp(0.92, 1.2, dna.resilience);
  const headLift = THREE.MathUtils.lerp(-0.03, 0.24, dna.resilience);

  partRefs.stems.filter(isTransformRoot).forEach((part) => {
    const baseScale = part.userData.baseScale;
    part.scale.set(baseScale.x, baseScale.y * stemHeight, baseScale.z);
  });

  partRefs.flowers.forEach((flower) => {
    flower.headParts.filter(isTransformRoot).forEach((part) => {
      part.position.y = part.userData.basePosition.y + headLift;
    });
  });
}

function applyCuriosity() {
  const closeAmount = dna.curiosity;

  partRefs.petals.filter(isTransformRoot).forEach((part, index) => {
    const baseRotation = part.userData.baseRotation;
    const baseScale = part.userData.baseScale;
    const direction = index % 2 === 0 ? 1 : -1;
    part.rotation.set(
      baseRotation.x + closeAmount * 0.34,
      baseRotation.y,
      baseRotation.z - direction * closeAmount * 0.14,
    );
    part.scale.copy(baseScale).multiplyScalar(THREE.MathUtils.lerp(1, 0.94, closeAmount));
  });
}

function applyMaterials() {
  partRefs.meshes.forEach((mesh) => {
    getObjectMaterials(mesh).forEach((material) => {
      const fixedMaterial = mesh.userData.role === 'leaf' || mesh.userData.role === 'stem' || mesh.userData.role === 'sepal';
      const baseColor = getMaterialColor(mesh);
      const gray = getGrayColor(baseColor);
      const finalColor = fixedMaterial ? baseColor : gray.lerp(baseColor, dna.acceptance);

      if (material.color) {
        material.color.copy(finalColor);
      }

      if (material.emissive) {
        material.emissive.copy(finalColor).multiplyScalar(fixedMaterial ? 0.18 : 0.32);
        if (!fixedMaterial) {
          material.emissiveIntensity = THREE.MathUtils.lerp(0.02, 0.18, dna.acceptance);
        }
      }

      if ('roughness' in material && !fixedMaterial) {
        material.roughness = THREE.MathUtils.lerp(0.78, 0.46, dna.acceptance);
      }
    });
  });
}

function getGrayColor(color) {
  const luminance = color.r * 0.299 + color.g * 0.587 + color.b * 0.114;
  return new THREE.Color(luminance, luminance, luminance);
}

function getMaterialColor(mesh) {
  const material = Array.isArray(mesh.material) ? mesh.material[0] : mesh.material;
  const baseColor = material.userData.baseColor?.clone?.() ?? new THREE.Color('#ffffff');
  const roleColor = getRoleColor(mesh.userData.role);

  if (diagnosticColorsInput.checked) {
    return roleColor;
  }

  return baseColor;
}

function getRoleColor(role) {
  const colors = {
    stem: '#48a95f',
    leaf: '#43c56d',
    sepal: '#72b84a',
    petal: '#d11124',
    head: '#d11124',
    unknown: '#cdbf9d',
  };

  return new THREE.Color(colors[role] ?? colors.unknown);
}

function resizeRenderer() {
  const width = canvasHost.clientWidth;
  const height = canvasHost.clientHeight;
  camera.aspect = width / height;
  camera.updateProjectionMatrix();
  renderer.setSize(width, height, false);
}

function animate() {
  windPhase += 0.018;
  const sway = Math.sin(windPhase) * windAmplitude;
  modelRoot.rotation.z = sway;
  controls.update();
  renderer.render(scene, camera);
}
