import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';

const stageHost = document.querySelector('#garden-stage-model');
const statusNode = document.querySelector('#garden-stage-model-status');
const publicAsset = (path) => `${import.meta.env.BASE_URL}${path}`;
const GARDEN_STAGE_MODEL_URL = publicAsset('models/hua.glb');
const GARDEN_PREVIEW_MODEL_URL = publicAsset('models/garden-home.glb');
const SHOULD_FACE_CAMERA = true;
const HUA_PLOT_NODE_NAMES = [
  'instance_0',
  'instance_36',
  'instance_37',
  'instance_63',
  'instance_64',
  'instance_65',
  'instance_66',
  'instance_67',
  'instance_68',
  'instance_69',
  'instance_70',
  'instance_71',
];
const HUA_DAE_CELL_SIZE = 78.74016;
const HUA_DAE_CELL_COLUMNS = 7;
const HUA_DAE_CELL_ROWS = 5;
const HUA_DAE_LINE_LIFT = 0.2;
const INITIAL_VIEW_DISTANCE_SCALE = 0.48;
const MAX_VIEW_DISTANCE_SCALE = 0.72;
const FACE_CAMERA_UP_AXIS = new THREE.Vector3(0, 1, 0);
const FACE_CAMERA_YAW_QUATERNION = new THREE.Quaternion();
const PLOT_LAYOUT = {
  columns: 3,
  rows: 4,
  cellColumns: 7,
  cellRows: 5,
  frameY: 0.35,
  paddingX: 0.08,
  paddingZ: 0.06,
  minBedWidth: 0.4,
  minBedDepth: 0.28,
};
const MAX_PLOT_FLOWER_HEIGHT = 0.55;

if (stageHost) {
  mountGardenStageModel(stageHost, statusNode);
}

function mountGardenStageModel(host, status) {
  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(36, 1, 0.1, 200);
  camera.position.set(0, 6, 10);

  const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.setClearColor(0x000000, 0);
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFShadowMap;
  host.append(renderer.domElement);

  const controls = new OrbitControls(camera, renderer.domElement);
  controls.enableDamping = true;
  controls.dampingFactor = 0.06;
  controls.target.set(0, 0.55, 0);
  controls.enablePan = true;
  controls.screenSpacePanning = true;
  controls.minDistance = 0.25;
  controls.maxDistance = 12;
  controls.minPolarAngle = 0;
  controls.maxPolarAngle = Math.PI;
  controls.panSpeed = 1.25;
  controls.rotateSpeed = 0.85;
  controls.zoomSpeed = 1.8;

  if ('zoomToCursor' in controls) {
    controls.zoomToCursor = true;
  }

  controls.mouseButtons = {
    LEFT: THREE.MOUSE.ROTATE,
    MIDDLE: THREE.MOUSE.DOLLY,
    RIGHT: THREE.MOUSE.PAN,
  };

  const modelRoot = new THREE.Group();
  scene.add(modelRoot);

  addLights(scene);
  resize();
  window.addEventListener('resize', resize);

  let activeModel = null;
  let faceCameraObjects = [];
  const loader = new GLTFLoader();
  let hasFullModel = false;

  showStatus(status, '花园预览加载中...');

  loader.load(
    GARDEN_PREVIEW_MODEL_URL,
    (gltf) => {
      if (hasFullModel) {
        return;
      }

      showModel(gltf.scene, { isPreview: true });
      showStatus(status, '花园模型加载中...');
    },
    undefined,
    () => {
      showStatus(status, '花园模型加载中...');
    },
  );

  loader.load(
    GARDEN_STAGE_MODEL_URL,
    (gltf) => {
      hasFullModel = true;
      showModel(gltf.scene);
      hideStatus(status);
    },
    (event) => {
      updateModelProgress(status, event);
    },
    (error) => {
      console.error(error);

      if (!activeModel) {
        showModel(createFallbackGardenModel(), { isFallback: true });
      }

      showStatus(status, '模型加载失败，已显示轻量花园');
    },
  );

  renderer.setAnimationLoop(animate);

  function animate() {
    controls.update();

    if (SHOULD_FACE_CAMERA) {
      faceCameraObjects.forEach((object) => faceObjectToCamera(object, camera));
    }

    renderer.render(scene, camera);
  }

  function resize() {
    const width = Math.max(host.clientWidth, 1);
    const height = Math.max(host.clientHeight, 1);
    camera.aspect = width / height;
    camera.updateProjectionMatrix();
    renderer.setSize(width, height, false);
  }

  function showModel(model, options = {}) {
    const { isPreview = false, isFallback = false } = options;

    if (activeModel) {
      modelRoot.remove(activeModel);
      disposeModel(activeModel);
    }

    activeModel = model;
    faceCameraObjects = prepareModel(model, camera);

    if (!isPreview && !isFallback) {
      addOriginalPlotFrames(model);
    }

    normalizeModel(model);
    modelRoot.add(model);
    setInitialView(model, camera, controls);
    initializeFaceCameraOffsets(faceCameraObjects, camera);
  }
}

function showStatus(status, text) {
  if (!status) {
    return;
  }

  status.hidden = false;
  status.textContent = text;
}

function hideStatus(status) {
  if (!status) {
    return;
  }

  status.hidden = true;
}

function updateModelProgress(status, event) {
  if (!status || !event) {
    return;
  }

  const total = Number(event.total);
  if (!Number.isFinite(total) || total <= 0) {
    showStatus(status, '花园模型加载中...');
    return;
  }

  const percent = Math.min(99, Math.max(1, Math.round((event.loaded / total) * 100)));
  showStatus(status, `花园模型加载中 ${percent}%`);
}

function disposeModel(model) {
  model.traverse((object) => {
    if (!object.isMesh) {
      return;
    }

    object.geometry?.dispose();

    const materials = Array.isArray(object.material) ? object.material : [object.material];
    materials.forEach((material) => {
      material?.map?.dispose();
      material?.dispose();
    });
  });
}

function addLights(scene) {
  scene.add(new THREE.HemisphereLight('#ffffff', '#d8e7c9', 2.4));

  const key = new THREE.DirectionalLight('#fff1d8', 3);
  key.position.set(3.6, 6, 4);
  key.castShadow = true;
  key.shadow.mapSize.set(1024, 1024);
  scene.add(key);

  const fill = new THREE.DirectionalLight('#d9ddff', 1.1);
  fill.position.set(-4, 3, -2.5);
  scene.add(fill);
}

function createFallbackGardenModel() {
  const group = new THREE.Group();
  const groundMaterial = new THREE.MeshStandardMaterial({
    color: '#d9edc8',
    roughness: 0.82,
  });
  const stemMaterial = new THREE.MeshStandardMaterial({
    color: '#5f9856',
    roughness: 0.72,
  });
  const petalColors = ['#f4a5bf', '#f1d26f', '#8db9eb', '#e8a85b'];

  const ground = new THREE.Mesh(new THREE.BoxGeometry(6.6, 0.08, 4.6), groundMaterial);
  ground.name = 'fallback garden ground';
  group.add(ground);

  for (let row = 0; row < PLOT_LAYOUT.rows; row += 1) {
    for (let column = 0; column < PLOT_LAYOUT.columns; column += 1) {
      const x = (column - 1) * 1.8;
      const z = (row - 1.5) * 0.92;
      const stem = new THREE.Mesh(new THREE.CylinderGeometry(0.025, 0.035, 0.38, 10), stemMaterial);
      stem.name = 'fallback stem';
      stem.position.set(x, 0.24, z);
      group.add(stem);

      const bloomMaterial = new THREE.MeshStandardMaterial({
        color: petalColors[(row + column) % petalColors.length],
        roughness: 0.64,
      });
      const bloom = new THREE.Mesh(new THREE.SphereGeometry(0.14, 14, 8), bloomMaterial);
      bloom.name = 'hua fallback bloom';
      bloom.position.set(x, 0.48, z);
      bloom.scale.set(1.25, 0.55, 1.25);
      group.add(bloom);
    }
  }

  return group;
}

function prepareModel(model, camera) {
  const cutoutObjects = [];

  model.traverse((object) => {
    if (!object.isMesh) {
      return;
    }

    const materials = Array.isArray(object.material) ? object.material : [object.material];
    const hasCutoutMaterial = materials.some(isCutoutMaterial);

    object.castShadow = !hasCutoutMaterial;
    object.receiveShadow = true;

    materials.forEach((material) => {
      if (!material) {
        return;
      }

      const isCutout = isCutoutMaterial(material);

      material.side = THREE.DoubleSide;
      material.depthWrite = isCutout;

      if (isCutout) {
        // SketchUp's DAE export can lose the PNG alpha mode during GLB conversion.
        material.transparent = false;
        material.alphaTest = 0.08;
        material.opacity = 1;
        if (material.map) {
          material.map.colorSpace = THREE.SRGBColorSpace;
          material.map.needsUpdate = true;
        }
      }

      material.needsUpdate = true;
    });

    if (hasCutoutMaterial) {
      object.matrixAutoUpdate = true;
      object.frustumCulled = false;
      cutoutObjects.push(object);
    }
  });

  return createFaceCameraTargets(cutoutObjects);
}

function createFaceCameraTargets(cutoutObjects) {
  const objectGroups = new Map();

  cutoutObjects.forEach((object) => {
    if (!object.parent) {
      return;
    }

    const groupKey = `${object.parent.uuid}:${getBillboardBaseName(object.name)}`;
    const objects = objectGroups.get(groupKey) || [];

    objects.push(object);
    objectGroups.set(groupKey, objects);
  });

  return [...objectGroups.values()].map(createBillboardPivot);
}

function getBillboardBaseName(name = '') {
  return name.replace(/\.\d+$/, '');
}

function createBillboardPivot(objects) {
  const parent = objects[0].parent;
  const bounds = new THREE.Box3();

  parent.updateMatrixWorld(true);
  objects.forEach((object) => {
    object.updateMatrixWorld(true);
    bounds.union(new THREE.Box3().setFromObject(object));
  });

  const center = bounds.getCenter(new THREE.Vector3());
  const pivot = new THREE.Group();

  pivot.name = `${getBillboardBaseName(objects[0].name)} billboard pivot`;
  pivot.position.copy(parent.worldToLocal(center.clone()));
  parent.add(pivot);

  objects.forEach((object) => {
    pivot.attach(object);
  });

  return pivot;
}

function initializeFaceCameraOffsets(objects, camera) {
  camera.updateMatrixWorld(true);

  objects.forEach((object) => {
    object.updateMatrixWorld(true);
    const direction = getFaceCameraLocalDirection(object, camera);

    object.userData.faceCameraInitialYaw = getHorizontalYaw(direction);
    object.userData.faceCameraInitialQuaternion = object.quaternion.clone();
  });
}

function isTreeCutout(object, materials) {
  const hasNamedTreeMaterial = materials.some((material) => /玉兰|丛生/.test(material?.name || ''));
  if (hasNamedTreeMaterial) {
    return true;
  }

  const bounds = new THREE.Box3().setFromObject(object);
  const size = bounds.getSize(new THREE.Vector3());
  return size.y > 2.8 && size.length() > 4.5;
}

function isCutoutMaterial(material) {
  if (!material) {
    return false;
  }

  return material.name?.toLowerCase().includes('hua') || Boolean(material.map);
}

function addOriginalPlotFrames(model) {
  const material = new THREE.LineBasicMaterial({
    color: '#111111',
    transparent: true,
    opacity: 0.92,
    depthWrite: false,
  });
  let addedCount = 0;

  HUA_PLOT_NODE_NAMES.forEach((nodeName) => {
    const plotNode = model.getObjectByName(nodeName);

    if (!plotNode || plotNode.getObjectByName('hua-original-plot-frame')) {
      return;
    }

    plotNode.add(createOriginalPlotFrame(material));
    addedCount += 1;
  });

  if (addedCount > 0) {
    return;
  }

  const sketchUpRoot = model.getObjectByName('SketchUp') || model;
  const fallbackGroup = new THREE.Group();
  fallbackGroup.name = 'hua-original-plot-frames-fallback';

  [
    [0, -HUA_DAE_CELL_SIZE],
    [629.9213, -HUA_DAE_CELL_SIZE],
    [1259.843, -HUA_DAE_CELL_SIZE],
    [0, 393.7008],
    [629.9213, 393.7008],
    [1259.843, 393.7008],
    [0, 866.1417],
    [629.9213, 866.1417],
    [1259.843, 866.1417],
    [0, 1338.583],
    [629.9213, 1338.583],
    [1259.843, 1338.583],
  ].forEach(([x, y]) => {
    const frame = createOriginalPlotFrame(material);
    frame.position.set(x, 0, -y);
    fallbackGroup.add(frame);
  });

  sketchUpRoot.add(fallbackGroup);
}

function createOriginalPlotFrame(material) {
  const frame = new THREE.LineSegments(
    new THREE.BufferGeometry().setFromPoints(getOriginalPlotFramePoints()),
    material,
  );

  frame.name = 'hua-original-plot-frame';
  frame.renderOrder = 3;
  return frame;
}

function getOriginalPlotFramePoints() {
  const points = [];
  const width = HUA_DAE_CELL_COLUMNS * HUA_DAE_CELL_SIZE;
  const yStart = HUA_DAE_CELL_SIZE;
  const yEnd = (HUA_DAE_CELL_ROWS + 1) * HUA_DAE_CELL_SIZE;

  for (let column = 0; column <= HUA_DAE_CELL_COLUMNS; column += 1) {
    const x = column * HUA_DAE_CELL_SIZE;
    addDaeLine(points, x, yStart, x, yEnd);
  }

  for (let row = 1; row <= HUA_DAE_CELL_ROWS + 1; row += 1) {
    const y = row * HUA_DAE_CELL_SIZE;
    addDaeLine(points, 0, y, width, y);
  }

  return points;
}

function addDaeLine(points, x1, y1, x2, y2) {
  points.push(toGltfPlotPoint(x1, y1), toGltfPlotPoint(x2, y2));
}

function toGltfPlotPoint(x, y) {
  return new THREE.Vector3(x, HUA_DAE_LINE_LIFT, -y);
}

function createPlotFrames(model, cutoutObjects = []) {
  const group = new THREE.Group();
  const material = new THREE.LineBasicMaterial({
    color: '#242421',
    transparent: true,
    opacity: 0.9,
  });

  model.updateMatrixWorld(true);
  const beds = getFlowerPlotBeds(cutoutObjects);

  beds.forEach((bed) => {
    group.add(
      createBedGrid(
        bed.x,
        bed.z,
        bed.width,
        bed.depth,
        PLOT_LAYOUT.cellColumns,
        PLOT_LAYOUT.cellRows,
        material,
      ),
    );
  });

  if (beds.length === 0) {
    const modelBox = new THREE.Box3().setFromObject(model);
    const size = modelBox.getSize(new THREE.Vector3());
    const fallbackWidth = size.x / PLOT_LAYOUT.columns;
    const fallbackDepth = size.z / PLOT_LAYOUT.rows;

    for (let row = 0; row < PLOT_LAYOUT.rows; row += 1) {
      for (let column = 0; column < PLOT_LAYOUT.columns; column += 1) {
        group.add(
          createBedGrid(
            modelBox.min.x + column * fallbackWidth,
            modelBox.min.z + row * fallbackDepth,
            fallbackWidth,
            fallbackDepth,
            PLOT_LAYOUT.cellColumns,
            PLOT_LAYOUT.cellRows,
            material,
          ),
        );
      }
    }
  }

  group.position.y = PLOT_LAYOUT.frameY;
  return group;
}

function getFlowerPlotBeds(cutoutObjects) {
  const flowerItems = cutoutObjects
    .map((object) => {
      const box = new THREE.Box3().setFromObject(object);
      const size = box.getSize(new THREE.Vector3());
      const center = box.getCenter(new THREE.Vector3());

      return { box, center, size };
    })
    .filter(({ box, size }) => (
      size.y > 0.04 &&
      size.y <= MAX_PLOT_FLOWER_HEIGHT &&
      box.max.y > 0.08
    ));

  if (flowerItems.length < PLOT_LAYOUT.columns * PLOT_LAYOUT.rows) {
    return [];
  }

  const xBreaks = getClusterBreaks(flowerItems, 'x', PLOT_LAYOUT.columns);
  const zBreaks = getClusterBreaks(flowerItems, 'z', PLOT_LAYOUT.rows);
  const bedBoxes = Array.from({ length: PLOT_LAYOUT.rows }, () => (
    Array.from({ length: PLOT_LAYOUT.columns }, () => new THREE.Box3())
  ));

  flowerItems.forEach((item) => {
    const column = getClusterIndex(item.center.x, xBreaks);
    const row = getClusterIndex(item.center.z, zBreaks);
    bedBoxes[row][column].union(item.box);
  });

  const beds = [];

  for (let row = 0; row < PLOT_LAYOUT.rows; row += 1) {
    for (let column = 0; column < PLOT_LAYOUT.columns; column += 1) {
      const box = bedBoxes[row][column];

      if (box.isEmpty()) {
        continue;
      }

      const x = box.min.x - PLOT_LAYOUT.paddingX;
      const z = box.min.z - PLOT_LAYOUT.paddingZ;
      const width = Math.max(
        box.max.x - box.min.x + PLOT_LAYOUT.paddingX * 2,
        PLOT_LAYOUT.minBedWidth,
      );
      const depth = Math.max(
        box.max.z - box.min.z + PLOT_LAYOUT.paddingZ * 2,
        PLOT_LAYOUT.minBedDepth,
      );

      beds.push({ x, z, width, depth });
    }
  }

  return beds;
}

function getClusterBreaks(items, axis, clusterCount) {
  const centers = items
    .map((item) => item.center[axis])
    .sort((a, b) => a - b);
  const gaps = [];

  for (let index = 1; index < centers.length; index += 1) {
    const gap = centers[index] - centers[index - 1];

    gaps.push({
      gap,
      value: (centers[index] + centers[index - 1]) / 2,
    });
  }

  return gaps
    .sort((a, b) => b.gap - a.gap)
    .slice(0, clusterCount - 1)
    .map((entry) => entry.value)
    .sort((a, b) => a - b);
}

function getClusterIndex(value, breaks) {
  return breaks.filter((breakValue) => value > breakValue).length;
}

function createBedGrid(x, z, width, depth, divisionsX, divisionsZ, material) {
  const points = [];
  const x2 = x + width;
  const z2 = z + depth;

  addLine(points, x, z, x2, z);
  addLine(points, x2, z, x2, z2);
  addLine(points, x2, z2, x, z2);
  addLine(points, x, z2, x, z);

  for (let index = 1; index < divisionsX; index += 1) {
    const lineX = x + (width * index) / divisionsX;
    addLine(points, lineX, z, lineX, z2);
  }

  for (let index = 1; index < divisionsZ; index += 1) {
    const lineZ = z + (depth * index) / divisionsZ;
    addLine(points, x, lineZ, x2, lineZ);
  }

  return new THREE.LineSegments(new THREE.BufferGeometry().setFromPoints(points), material);
}

function addLine(points, x1, z1, x2, z2) {
  points.push(new THREE.Vector3(x1, 0, z1), new THREE.Vector3(x2, 0, z2));
}

function getFaceCameraLocalDirection(object, camera) {
  const objectPosition = new THREE.Vector3();
  const cameraPosition = new THREE.Vector3();
  const parentQuaternion = new THREE.Quaternion();
  const direction = new THREE.Vector3();

  object.getWorldPosition(objectPosition);
  camera.getWorldPosition(cameraPosition);
  object.parent?.getWorldQuaternion(parentQuaternion);
  direction.copy(cameraPosition).sub(objectPosition);
  direction.y = 0;

  if (direction.lengthSq() <= 0.0001) {
    return direction.set(0, 0, 1);
  }

  return direction.normalize().applyQuaternion(parentQuaternion.invert());
}

function getHorizontalYaw(direction) {
  return Math.atan2(direction.x, direction.z);
}

function faceObjectToCamera(object, camera) {
  const direction = getFaceCameraLocalDirection(object, camera);
  const initialQuaternion = object.userData.faceCameraInitialQuaternion;
  const initialYaw = object.userData.faceCameraInitialYaw;

  if (!initialQuaternion || initialYaw === undefined) {
    return;
  }

  const yawDelta = getHorizontalYaw(direction) - initialYaw;

  FACE_CAMERA_YAW_QUATERNION.setFromAxisAngle(FACE_CAMERA_UP_AXIS, yawDelta);
  object.quaternion.copy(initialQuaternion).premultiply(FACE_CAMERA_YAW_QUATERNION);
  object.updateMatrix();
}

function setInitialView(model, camera, controls) {
  const box = new THREE.Box3().setFromObject(model);
  const size = box.getSize(new THREE.Vector3());
  const center = box.getCenter(new THREE.Vector3());
  const radius = Math.max(size.length() * 0.5, 1);
  const verticalFov = THREE.MathUtils.degToRad(camera.fov);
  const horizontalFov = 2 * Math.atan(Math.tan(verticalFov / 2) * camera.aspect);
  const fitDistance = Math.max(
    radius / Math.sin(verticalFov / 2),
    radius / Math.sin(horizontalFov / 2),
  );
  const target = new THREE.Vector3(
    center.x,
    box.min.y + size.y * 0.2,
    center.z + size.z * 0.08,
  );
  const viewDirection = new THREE.Vector3(0.04, 0.58, 0.82).normalize();
  const distance = fitDistance * INITIAL_VIEW_DISTANCE_SCALE;

  controls.target.copy(target);
  camera.position.copy(target).addScaledVector(viewDirection, distance);
  camera.near = Math.max(distance / 180, 0.01);
  camera.far = Math.max(distance * 18, 100);
  camera.updateProjectionMatrix();

  controls.minDistance = Math.max(distance * 0.08, 0.18);
  controls.maxDistance = Math.max(fitDistance * MAX_VIEW_DISTANCE_SCALE, distance * 1.02);
  controls.update();
}

function normalizeModel(model) {
  const box = new THREE.Box3().setFromObject(model);
  const size = box.getSize(new THREE.Vector3());
  const center = box.getCenter(new THREE.Vector3());
  const horizontalAxis = Math.max(size.x, size.z) || 1;
  const verticalAxis = size.y || 1;
  const scale = Math.min(7.2 / horizontalAxis, 2.6 / verticalAxis);

  model.scale.setScalar(scale);
  model.position.set(-center.x * scale, -center.y * scale, -center.z * scale);

  const normalizedBox = new THREE.Box3().setFromObject(model);
  model.position.y -= normalizedBox.min.y;
  model.position.y -= 0.08;
}
