import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';

const sidebarContent = document.querySelector('#garden-sidebar-content');
const gardenViewButtons = document.querySelectorAll('[data-garden-view]');
const publicAsset = (path) => `${import.meta.env.BASE_URL}${path}`;
const roseModelPath = 'models/meigui.glb';
const roseModelUrl = publicAsset(roseModelPath);

const modelPanelState = {
  loaded: false,
  error: '',
  meshCount: 0,
  materialCount: 0,
  partCounts: {
    stem: 0,
    petal: 0,
    leaf: 0,
    sepal: 0,
    head: 0,
  },
  maxPetalLayer: 1,
};

const dnaMappings = [
  {
    key: 'growth',
    label: 'Growth',
    meaning: '成长感',
    target: '花瓣层数。低值只显示外层花瓣，高值逐步显示完整花瓣层。',
  },
  {
    key: 'hope',
    label: 'Hope',
    meaning: '希望感',
    target: '朝向。控制玫瑰整体面向左侧、正前或右侧。',
  },
  {
    key: 'connection',
    label: 'Connection',
    meaning: '连接感',
    target: '叶片展开。叶片向外舒展，枝叶连接感更强。',
  },
  {
    key: 'resilience',
    label: 'Resilience',
    meaning: '韧性',
    target: '茎干高度。轻微拉高花茎，同时花头/花瓣整体随茎顶上移。',
  },
  {
    key: 'calm',
    label: 'Calm',
    meaning: '平静感',
    target: '左右摇摆。数值越高，风中摆动越小、越稳定。',
  },
  {
    key: 'curiosity',
    label: 'Curiosity',
    meaning: '探索欲',
    target: '花瓣收拢。数值越高，花瓣越向内收。',
  },
  {
    key: 'acceptance',
    label: 'Acceptance',
    meaning: '自我接纳',
    target: '颜色灰度。数值越高颜色越饱满，数值越低越灰。',
  },
  {
    key: 'doubt',
    label: 'Doubt',
    meaning: '自我怀疑',
    target: '低头姿态。当前先控制整株玫瑰微微低头。',
  },
];

if (sidebarContent) {
  renderGardenModelPanel();
  loadModelStats();

  gardenViewButtons.forEach((button) => {
    button.addEventListener('click', () => {
      window.requestAnimationFrame(renderGardenModelPanel);
    });
  });
}

async function loadModelStats() {
  try {
    const loader = new GLTFLoader();
    const gltf = await loader.loadAsync(roseModelUrl);
    const materials = new Set();

    gltf.scene.traverse((object) => {
      const role = classifyObject(object);
      const petalLayer = getPetalLayer(object);

      if (role in modelPanelState.partCounts) {
        modelPanelState.partCounts[role] += 1;
      }

      if (petalLayer) {
        modelPanelState.maxPetalLayer = Math.max(modelPanelState.maxPetalLayer, petalLayer);
      }

      if (!object.isMesh) {
        return;
      }

      modelPanelState.meshCount += 1;
      getMaterials(object.material).forEach((material) => materials.add(material));
    });

    modelPanelState.materialCount = materials.size;
    modelPanelState.loaded = true;
  } catch (error) {
    console.error(error);
    modelPanelState.error = '模型信息读取失败';
  }

  renderGardenModelPanel();
}

function renderGardenModelPanel() {
  const oldPanel = sidebarContent.querySelector('[data-garden-model-panel]');
  oldPanel?.remove();

  const panel = document.createElement('article');
  panel.className = 'today-flower garden-model-panel';
  panel.dataset.gardenModelPanel = 'true';
  panel.innerHTML = `
    <h2>模型预览</h2>

    <section class="flower-card garden-model-card" aria-labelledby="garden-model-status-title">
      <h3 id="garden-model-status-title">模型状态</h3>
      <dl class="garden-model-stats">
        <div>
          <dt>文件</dt>
          <dd>${roseModelPath}</dd>
        </div>
        <div>
          <dt>网格 / 材质</dt>
          <dd>${modelPanelState.loaded ? `${modelPanelState.meshCount} / ${modelPanelState.materialCount}` : '读取中'}</dd>
        </div>
        <div>
          <dt>可识别部件</dt>
          <dd>${getPartSummary()}</dd>
        </div>
      </dl>
      ${getWarningMarkup()}
    </section>

    <section class="flower-card garden-model-card" aria-labelledby="garden-model-mapping-title">
      <h3 id="garden-model-mapping-title">八维映射</h3>
      <div class="garden-mapping-list">
        ${dnaMappings.map(renderMappingRow).join('')}
      </div>
    </section>

  `;

  sidebarContent.append(panel);
}

function renderMappingRow(mapping) {
  const binding = getBindingInfo(mapping.key);

  return `
    <article class="garden-mapping-row">
      <div class="garden-mapping-title">
        <strong>${mapping.label}</strong>
        <span>${mapping.meaning}</span>
      </div>
      <p>${mapping.target}</p>
      <span class="binding-pill ${binding.ok ? 'is-ok' : 'is-limited'}">${binding.text}</span>
    </article>
  `;
}

function getBindingInfo(key) {
  const { partCounts, maxPetalLayer, materialCount } = modelPanelState;
  const bindings = {
    growth: partCounts.petal
      ? { ok: true, text: `已绑定：${maxPetalLayer} 层花瓣 / ${partCounts.petal} 个花瓣` }
      : { ok: false, text: '受限：未找到花瓣' },
    hope: { ok: true, text: '已绑定：整株朝向' },
    connection: partCounts.leaf
      ? { ok: true, text: `已绑定：${partCounts.leaf} 个叶片/叶组` }
      : { ok: false, text: '受限：未找到叶片' },
    resilience: partCounts.stem
      ? { ok: true, text: `已绑定：${partCounts.stem} 个花茎 + 花头上移` }
      : { ok: false, text: '受限：未找到花茎' },
    calm: { ok: true, text: '已绑定：左右摇摆幅度' },
    curiosity: partCounts.petal
      ? { ok: true, text: `已绑定：${partCounts.petal} 个花瓣收拢` }
      : { ok: false, text: '受限：未找到花瓣' },
    acceptance: materialCount
      ? { ok: true, text: `已绑定：${materialCount} 个材质灰度` }
      : { ok: false, text: '受限：未找到材质' },
    doubt: { ok: true, text: '已绑定：整株低头姿态' },
  };

  return bindings[key];
}

function getPartSummary() {
  if (modelPanelState.error) {
    return modelPanelState.error;
  }

  if (!modelPanelState.loaded) {
    return '读取中';
  }

  const { partCounts } = modelPanelState;
  return [
    `花茎 ${partCounts.stem}`,
    `花瓣 ${partCounts.petal}`,
    `叶片 ${partCounts.leaf}`,
    `花托 ${partCounts.sepal}`,
  ].join(' / ');
}

function getWarningMarkup() {
  if (modelPanelState.error) {
    return `<p class="garden-model-warning">${modelPanelState.error}</p>`;
  }

  if (!modelPanelState.loaded) {
    return '';
  }

  const warnings = [];
  const { partCounts } = modelPanelState;

  if (!partCounts.petal) {
    warnings.push('没有识别到花瓣对象，Growth/Curiosity 不能控制花瓣层数和收拢。');
  }

  return warnings.length ? `<p class="garden-model-warning">${warnings.join(' ')}</p>` : '';
}

function classifyObject(object) {
  const ownName = normalizeName(object.name);
  const path = normalizeName(getNamePath(object));

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
  if (includesAny(path, ['sepal', 'calyx', '花托', '萼片'])) {
    return 'sepal';
  }

  return 'unknown';
}

function getPetalLayer(object) {
  const source = `${object.name} ${getNamePath(object)}`;
  const match = source.match(/花瓣第([一二三四五六七八九十0-9]+)层/) ?? source.match(/第([一二三四五六七八九十0-9]+)层/);

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

function getMaterials(material) {
  return Array.isArray(material) ? material : [material];
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

function normalizeName(value) {
  return String(value || '').toLowerCase();
}
