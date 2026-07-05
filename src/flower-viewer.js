import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';

const canvasHost = document.querySelector('#flower-model-canvas');
const statusNode = document.querySelector('#flower-model-status');
const controlsHost = document.querySelector('#flower-dna-controls');
const publicAsset = (path) => `${import.meta.env.BASE_URL}${path}`;

if (canvasHost && statusNode) {
  const initialFlower = window.EchoBloomFlowerStore?.getPendingFlower();

  mountFlowerViewer({
    canvasHost,
    statusNode,
    controlsHost,
    modelUrl: publicAsset('models/meigui.glb'),
    initialDNA: initialFlower?.flowerDNA,
  });
}

function mountFlowerViewer({ canvasHost, statusNode, controlsHost, modelUrl, initialDNA = null }) {
  const dnaDefaults = initialDNA || {
    growth: 0.86,
    hope: 0.74,
    connection: 0.68,
    resilience: 0.80,
    calm: 0.48,
    curiosity: 0.55,
    acceptance: 0.52,
    doubt: 0.46,
  };

  const dna = { ...dnaDefaults };
  const dnaInputs = new Map();
  const dnaOutputs = new Map();
  const dnaDimensions = [
    { key: 'growth', label: '成长感', english: 'Growth', target: '花瓣层数', defaultValue: dnaDefaults.growth },
    { key: 'hope', label: '希望感', english: 'Hope', target: '朝向', defaultValue: dnaDefaults.hope },
    { key: 'connection', label: '连接感', english: 'Connection', target: '叶片展开', defaultValue: dnaDefaults.connection },
    { key: 'resilience', label: '韧性', english: 'Resilience', target: '茎干高度', defaultValue: dnaDefaults.resilience },
    { key: 'calm', label: '平静感', english: 'Calm', target: '左右摇摆', defaultValue: dnaDefaults.calm },
    { key: 'curiosity', label: '探索欲', english: 'Curiosity', target: '花瓣收拢', defaultValue: dnaDefaults.curiosity },
    { key: 'acceptance', label: '自我接纳', english: 'Acceptance', target: '颜色灰度', defaultValue: dnaDefaults.acceptance },
    { key: 'doubt', label: '自我怀疑', english: 'Doubt', target: '低头姿态', defaultValue: dnaDefaults.doubt },
  ];

  const scene = new THREE.Scene();

  const camera = new THREE.PerspectiveCamera(42, 1, 0.1, 100);
  camera.position.set(3.1, 2.55, 3.95);

  const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.setClearColor(0x000000, 0);
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.NoToneMapping;
  renderer.toneMappingExposure = 1.08;
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  canvasHost.appendChild(renderer.domElement);

  const controls = new OrbitControls(camera, renderer.domElement);
  controls.enableDamping = true;
  controls.dampingFactor = 0.06;
  controls.target.set(0, 1.42, 0);
  controls.minDistance = 4.05;
  controls.maxDistance = 9;

  const modelRoot = new THREE.Group();
  scene.add(modelRoot);

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

  let windPhase = 0;
  let windAmplitude = 0.018;
  let disposed = false;

  addLights();
  renderDNAControls();
  bindEvents();
  resizeRenderer();
  loadModel().catch((error) => {
    console.error(error);
    mountFallbackModel();
    statusNode.textContent = '模型加载失败';
  });
  renderer.setAnimationLoop(animate);
  window.addEventListener('resize', resizeRenderer);

  return {
    dispose,
    setDNA(nextDNA) {
      Object.assign(dna, nextDNA || {});
      syncControls();
      applyDNA();
    },
    getDNA() {
      return { ...dna };
    },
  };

  function dispose() {
    if (disposed) {
      return;
    }

    disposed = true;
    renderer.setAnimationLoop(null);
    window.removeEventListener('resize', resizeRenderer);
    controls.dispose();
    renderer.dispose();
    canvasHost.replaceChildren();
  }

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

  function renderDNAControls() {
    if (!controlsHost) {
      return;
    }

    controlsHost.replaceChildren();

    dnaDimensions.forEach((dimension) => {
      const wrapper = document.createElement('section');
      wrapper.className = 'flower-dna-control';

      const label = document.createElement('label');
      label.className = 'flower-dna-row';
      label.setAttribute('for', `flower-dna-${dimension.key}`);

      const title = document.createElement('span');
      title.textContent = `${dimension.label} · ${dimension.english}`;

      const output = document.createElement('output');
      output.id = `${dimension.key}-output`;
      output.textContent = dimension.defaultValue.toFixed(2);

      const input = document.createElement('input');
      input.id = `flower-dna-${dimension.key}`;
      input.type = 'range';
      input.min = '0';
      input.max = '1';
      input.step = '0.01';
      input.value = String(dimension.defaultValue);

      label.append(title, output);
      wrapper.append(label, input);
      controlsHost.append(wrapper);

      dnaInputs.set(dimension.key, input);
      dnaOutputs.set(dimension.key, output);
    });
  }

  function bindEvents() {
    if (!controlsHost) {
      return;
    }

    dnaInputs.forEach((input, key) => {
      input.addEventListener('input', () => {
        dna[key] = Number(input.value);
        dnaOutputs.get(key).textContent = dna[key].toFixed(2);
        applyDNA();
      });
    });
  }

  function syncControls() {
    dnaInputs.forEach((input, key) => {
      input.value = String(dna[key]);
      const output = dnaOutputs.get(key);
      if (output) {
        output.textContent = dna[key].toFixed(2);
      }
    });
  }

  async function loadModel() {
    const loader = new GLTFLoader();
    const gltf = await withTimeout(loader.loadAsync(modelUrl), 12000);
    const source = gltf.scene;

    normalizeModel(source);
    collectParts(source);
    modelRoot.add(source);
    applyDNA();
    statusNode.textContent = '模型已载入';
  }

  function mountFallbackModel() {
    const source = createFallbackFlowerModel();

    normalizeModel(source);
    collectParts(source);
    modelRoot.add(source);
    applyDNA();
  }

  function createFallbackFlowerModel() {
    const group = new THREE.Group();
    group.name = 'flower-1 fallback';

    const stemMaterial = new THREE.MeshStandardMaterial({ color: '#4f8a52', roughness: 0.72 });
    const leafMaterial = new THREE.MeshStandardMaterial({ color: '#75a85f', roughness: 0.76 });
    const petalMaterial = new THREE.MeshStandardMaterial({ color: '#f3a6bf', roughness: 0.62 });
    const coreMaterial = new THREE.MeshStandardMaterial({ color: '#f4d06f', roughness: 0.58 });

    const stem = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.07, 1.45, 18), stemMaterial);
    stem.name = 'stem';
    stem.position.y = 0.72;
    group.add(stem);

    [-1, 1].forEach((side) => {
      const leaf = new THREE.Mesh(new THREE.SphereGeometry(0.22, 18, 10), leafMaterial);
      leaf.name = 'leaf';
      leaf.position.set(side * 0.18, 0.64, 0);
      leaf.scale.set(1.35, 0.28, 0.58);
      leaf.rotation.z = side * -0.72;
      group.add(leaf);
    });

    for (let layer = 1; layer <= 3; layer += 1) {
      const petalCount = 6 + layer * 2;
      const radius = 0.12 + layer * 0.08;

      for (let index = 0; index < petalCount; index += 1) {
        const angle = (index / petalCount) * Math.PI * 2 + layer * 0.18;
        const petal = new THREE.Mesh(new THREE.SphereGeometry(0.12, 18, 10), petalMaterial.clone());
        petal.name = `petal layer ${layer}`;
        petal.position.set(Math.cos(angle) * radius, 1.48 + layer * 0.015, Math.sin(angle) * radius);
        petal.scale.set(0.72, 0.22, 1.45);
        petal.rotation.set(0.42, angle, 0);
        group.add(petal);
      }
    }

    const core = new THREE.Mesh(new THREE.SphereGeometry(0.13, 24, 16), coreMaterial);
    core.name = 'head';
    core.position.y = 1.52;
    core.scale.set(1, 0.62, 1);
    group.add(core);

    return group;
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
    source.position.y -= 0.18;
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
      const fallbackColor = getMaterialFallbackColor(item);
      if (fallbackColor && item.color) {
        item.color.copy(fallbackColor);
      }

      item.userData.baseColor = item.color?.clone?.() ?? new THREE.Color('#ffffff');
      item.userData.baseEmissive = item.emissive?.clone?.() ?? new THREE.Color('#000000');
      item.userData.baseEmissiveIntensity = item.emissiveIntensity ?? 0;
      item.side = THREE.DoubleSide;
    });
    return cloned;
  }

  function getMaterialFallbackColor(material) {
    const name = normalizeName(material?.name);
    const isDefaultWhite = material?.color && material.color.r > 0.98 && material.color.g > 0.98 && material.color.b > 0.98;

    if (!isDefaultWhite) {
      return null;
    }

    if (name.includes('dark green')) {
      return new THREE.Color('#17451f');
    }

    if (name.includes('gradient green')) {
      return new THREE.Color('#3d8a37');
    }

    return null;
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
    const ownName = normalizeName(object.name);
    const path = normalizeName(getNamePath(object));

    if (matchesAny(ownName, ['花瓣', 'petal']) || isPetalLayerName(ownName)) {
      return 'petal';
    }
    if (matchesAny(ownName, ['花茎', 'stem', 'stalk', '茎'])) {
      return 'stem';
    }
    if (matchesAny(ownName, ['花托', 'sepal', 'calyx', '萼片', '萼'])) {
      return 'sepal';
    }
    if (matchesAny(ownName, ['花蕾', '花头', '花朵', 'flowerhead', 'flower_head', 'head', 'bloom'])) {
      return 'head';
    }
    if (matchesAny(ownName, ['叶子', '叶片', 'leaf', 'leaves'])) {
      return 'leaf';
    }

    if (matchesAny(path, ['花瓣', 'petal']) || isPetalLayerName(path)) {
      return 'petal';
    }
    if (matchesAny(path, ['叶子', '叶片', 'leaf', 'leaves'])) {
      return 'leaf';
    }
    if (matchesAny(path, ['花茎', 'stem', 'stalk', '茎'])) {
      return 'stem';
    }
    if (matchesAny(path, ['花托', 'sepal', 'calyx', '萼片', '萼'])) {
      return 'sepal';
    }
    if (matchesAny(path, ['花蕾', '花头', '花朵', 'flowerhead', 'flower_head', 'head', 'bloom'])) {
      return 'head';
    }

    return 'unknown';
  }

  function normalizeName(value) {
    return String(value || '').toLowerCase();
  }

  function matchesAny(value, tokens) {
    return tokens.some((token) => value.includes(String(token).toLowerCase()));
  }

  function isPetalLayerName(value) {
    return /第\s*[一二三四五六七八九十0-9]+\s*层/.test(value);
  }

  function getPetalLayer(object) {
    const source = `${object.name} ${getNamePath(object)}`;
    const englishMatch = source.match(/(?:petal|layer)\s*([0-9]+)/i);

    if (englishMatch) {
      return Number(englishMatch[1]);
    }
    const match = source.match(/第\s*([一二三四五六七八九十0-9]+)\s*层/);

    if (!match) {
      return null;
    }

    return parseChineseNumber(match[1]);
  }

  function parseChineseNumber(value) {
    if (/^\d+$/.test(value)) {
      return Number(value);
    }

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

    if (value === '十') {
      return 10;
    }

    if (value.includes('十')) {
      const [tens, ones] = value.split('十');
      const tensValue = tens ? parseChineseNumber(tens) : 1;
      const onesValue = ones ? parseChineseNumber(ones) : 0;
      return tensValue * 10 + onesValue;
    }

    return map[value] ?? null;
  }

  function getFlowerId(object) {
    const path = getNamePath(object);

    if (/flower-?1/i.test(path)) {
      return 'flower-1';
    }
    if (path.includes('第一朵花')) {
      return 'flower-1';
    }
    if (path.includes('第二朵花')) {
      return 'flower-2';
    }
    return null;
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
    const stemHeight = THREE.MathUtils.lerp(0.96, 1.08, dna.resilience);
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
        const baseColor = material.userData.baseColor?.clone?.() ?? new THREE.Color('#ffffff');
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

  function resizeRenderer() {
    const width = canvasHost.clientWidth;
    const height = canvasHost.clientHeight;

    if (!width || !height) {
      return;
    }

    camera.aspect = width / height;
    camera.updateProjectionMatrix();
    renderer.setSize(width, height, false);
  }

  function animate() {
    if (disposed) {
      return;
    }

    windPhase += 0.018;
    const sway = Math.sin(windPhase) * windAmplitude;
    modelRoot.rotation.z = sway;
    controls.update();
    renderer.render(scene, camera);
  }

  function withTimeout(promise, timeoutMs) {
    return Promise.race([
      promise,
      new Promise((_, reject) => {
        window.setTimeout(() => reject(new Error('Model load timed out')), timeoutMs);
      }),
    ]);
  }
}
