import { renderStatsRows } from './flower-data.js';

const sidebarContent = document.querySelector('#garden-sidebar-content');
const echoButton = document.querySelector('[data-garden-view="echo"]');
const todayButton = document.querySelector('[data-garden-view="today"]');
const gardenBrand = document.querySelector('#garden-brand');
const gardenWelcome = document.querySelector('#garden-welcome');
const backHomeButton = document.querySelector('#back-home-button');
const gardenLayout = document.querySelector('.garden-layout');
const gardenSidebar = document.querySelector('.garden-sidebar');
const sidebarToggleButton = document.querySelector('#garden-sidebar-toggle');
const sidebarResizer = document.querySelector('#garden-sidebar-resizer');

const savedGardenUsername = window.localStorage.getItem('garden-username');
let gardenUsername = savedGardenUsername || 'Echody';
const savedSidebarWidthValue = window.localStorage.getItem('garden-sidebar-width');
const savedSidebarWidth = savedSidebarWidthValue === null ? null : Number(savedSidebarWidthValue);

const stageKeywords = ['坚持', '比赛', '遗憾', '继续', '朋友', '练习', '成长', '调整'];

if (savedSidebarWidth !== null && Number.isFinite(savedSidebarWidth)) {
  setSidebarWidth(savedSidebarWidth);
}

function renderKeywordChips(keywords = stageKeywords) {
  return keywords
    .map((keyword) => `<li>${escapeHtml(keyword)}</li>`)
    .join('');
}

function updateGardenWelcome() {
  const prefix = document.createElement('span');
  const name = document.createElement('span');
  const suffix = document.createElement('span');

  prefix.textContent = '欢迎来到';
  name.className = 'garden-username';
  name.textContent = gardenUsername;
  suffix.textContent = '的花园';

  gardenWelcome.replaceChildren(prefix, name, suffix);
}

function renderTodayFlower() {
  const flower = getLatestFlower();

  setSidebarContentCollapsed(false);
  setCurrentGardenView(todayButton);
  sidebarContent.innerHTML = `
    <article class="today-flower" aria-labelledby="today-flower-heading">
      <h2 id="today-flower-heading">今日花事</h2>

      <section class="flower-card" aria-labelledby="flower-name-title">
        <h3 id="flower-name-title">今日花名</h3>
        <p>${escapeHtml(flower.flowerName)}</p>
      </section>

      <section class="flower-card" aria-labelledby="flower-date-title">
        <h3 id="flower-date-title">生成日期</h3>
        <p>${formatFlowerDate(flower.generatedAt)}</p>
      </section>

      <section class="flower-card" aria-labelledby="flower-language-title">
        <h3 id="flower-language-title">今日花语</h3>
        <p>${escapeHtml(flower.flowerLanguage)}</p>
      </section>

      <section class="flower-card" aria-labelledby="flower-stats-title">
        <h3 id="flower-stats-title">花朵特征</h3>
        <ul class="flower-stats">
          ${renderStatsRows(flower)}
        </ul>
      </section>

      <section class="flower-card" aria-labelledby="flower-observation-title">
        <h3 id="flower-observation-title">花灵观察</h3>
        ${renderParagraphs(flower.observation)}
      </section>

      <section class="flower-card" aria-labelledby="flower-download-title">
        <h3 id="flower-download-title">模型下载</h3>
        <button type="button">下载 STL</button>
      </section>
    </article>
  `;
}

function renderGardenEcho() {
  const flowers = getGardenFlowers();
  const displayFlowers = flowers.length ? flowers : [getLatestFlower()];
  const keywords = getGardenKeywords(displayFlowers);
  const impression = getGardenImpression(flowers, displayFlowers);
  const spiritEcho = getGardenSpiritEcho(flowers, displayFlowers);

  setSidebarContentCollapsed(false);
  setCurrentGardenView(echoButton);
  sidebarContent.innerHTML = `
    <article class="today-flower" aria-labelledby="garden-echo-heading">
      <h2 id="garden-echo-heading">花园回响</h2>

      <section class="flower-card" aria-labelledby="time-range-title">
        <h3 id="time-range-title">时间切换</h3>
        <label class="time-select">
          <span>查看范围</span>
          <select name="time-range">
            <option>本周</option>
            <option>本月</option>
            <option>本季</option>
            <option>本年</option>
          </select>
        </label>
      </section>

      <section class="flower-card" aria-labelledby="garden-impression-title">
        <h3 id="garden-impression-title">花园印象</h3>
        ${renderParagraphs(impression)}
      </section>

      <section class="flower-card" aria-labelledby="stage-keywords-title">
        <h3 id="stage-keywords-title">阶段关键词</h3>
        <ul class="keyword-list">
          ${renderKeywordChips(keywords)}
        </ul>
      </section>

      <section class="flower-card" aria-labelledby="garden-spirit-echo-title">
        <h3 id="garden-spirit-echo-title">花灵回响</h3>
        ${renderParagraphs(spiritEcho)}
      </section>
    </article>
  `;
}

function getLatestFlower() {
  return window.EchoBloomFlowerStore?.getLatestGardenFlower() ||
    window.EchoBloomFlowerStore?.getFallbackFlower();
}

function getGardenFlowers() {
  return window.EchoBloomFlowerStore?.getGardenFlowers() || [];
}

function getGardenKeywords(flowers) {
  const keywords = flowers
    .flatMap((flower) => flower.keywords || [])
    .map((keyword) => String(keyword || '').trim())
    .filter(Boolean);

  if (!keywords.length) {
    return stageKeywords;
  }

  const counts = new Map();
  keywords.forEach((keyword) => {
    counts.set(keyword, (counts.get(keyword) || 0) + 1);
  });

  return [...counts.entries()]
    .sort((first, second) => second[1] - first[1])
    .map(([keyword]) => keyword)
    .slice(0, 8);
}

function getGardenImpression(realFlowers, displayFlowers) {
  if (!realFlowers.length) {
    return [
      '这段时间的花园还在等待新的花朵。',
      '和花灵聊完后，把今日花朵放进花园，这里就会开始记录你的变化。',
    ];
  }

  const leadingTrait = getLeadingTrait(displayFlowers);
  const flowerCountText = realFlowers.length === 1 ? '1 朵花' : `${realFlowers.length} 朵花`;

  return [
    `这段时间，花园里已经留下 ${flowerCountText}。`,
    `${leadingTrait.label}最明显，平均值是 ${leadingTrait.value}，它正在成为这片花园当前最清晰的底色。`,
  ];
}

function getGardenSpiritEcho(realFlowers, displayFlowers) {
  const latestFlower = displayFlowers[0];

  if (!realFlowers.length) {
    return [
      '第一朵真正放入花园的花，会成为这里的起点。',
      '它不需要很完美，只需要诚实地记录今天的你。',
    ];
  }

  const latestObservation = getFirstParagraph(latestFlower.observation);

  return [
    `最近开放的是「${latestFlower.flowerName}」。`,
    latestObservation || '花灵已经把最近的心事收进了花里，等你慢慢回看。',
  ];
}

function getLeadingTrait(flowers) {
  const dimensions = window.EchoBloomFlowerStore?.dimensions || [];
  const fallback = { label: '成长感', value: 0 };

  if (!dimensions.length || !flowers.length) {
    return fallback;
  }

  return dimensions
    .map((dimension) => ({
      label: dimension.label,
      value: Math.round(
        flowers.reduce((sum, flower) => sum + (Number(flower.traits?.[dimension.key]) || 0), 0) / flowers.length
      ),
    }))
    .sort((first, second) => second.value - first.value)[0] || fallback;
}

function renderParagraphs(value) {
  return getParagraphs(value)
    .map((paragraph) => `<p>${escapeHtml(paragraph)}</p>`)
    .join('');
}

function getParagraphs(value) {
  const paragraphs = Array.isArray(value) ? value : String(value || '').split(/\n+/);

  return paragraphs
    .map((paragraph) => paragraph.trim())
    .filter(Boolean)
    .slice(0, 4);
}

function getFirstParagraph(value) {
  return getParagraphs(value)[0] || '';
}

function formatFlowerDate(value) {
  const date = value ? new Date(value) : new Date();

  if (Number.isNaN(date.getTime())) {
    return new Date().toLocaleDateString('zh-CN');
  }

  return date.toLocaleDateString('zh-CN', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  });
}

function escapeHtml(value) {
  return String(value || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function setCurrentGardenView(currentButton) {
  [echoButton, todayButton].forEach((button) => {
    button.toggleAttribute('aria-current', button === currentButton);
  });
}

function renameGarden() {
  const nextName = window.prompt('请输入新的用户名', gardenUsername);

  if (!nextName) {
    return;
  }

  const trimmedName = nextName.trim();
  if (!trimmedName) {
    return;
  }

  gardenUsername = trimmedName;
  window.localStorage.setItem('garden-username', gardenUsername);
  updateGardenWelcome();
}

function goHome() {
  window.location.href = 'index.html';
}

function setSidebarWidth(width) {
  const clampedWidth = Math.min(Math.max(width, 340), 840);
  gardenLayout.style.setProperty('--garden-sidebar-width', `${clampedWidth}px`);
  window.localStorage.setItem('garden-sidebar-width', String(clampedWidth));
}

function setSidebarContentCollapsed(isCollapsed) {
  gardenLayout.classList.toggle('is-sidebar-content-collapsed', isCollapsed);
  sidebarToggleButton.textContent = '\u00d7';
  sidebarToggleButton.setAttribute('aria-label', isCollapsed ? '展开侧栏内容' : '收起侧栏内容');
  sidebarContent.toggleAttribute('hidden', isCollapsed);
}

function toggleSidebarContent() {
  setSidebarContentCollapsed(!gardenLayout.classList.contains('is-sidebar-content-collapsed'));
}

function startSidebarResize(event) {
  const startX = event.clientX;
  const startWidth = gardenSidebar.getBoundingClientRect().width;

  function handlePointerMove(moveEvent) {
    setSidebarWidth(startWidth + moveEvent.clientX - startX);
  }

  function handlePointerUp() {
    document.body.classList.remove('is-resizing-sidebar');
    window.removeEventListener('pointermove', handlePointerMove);
    window.removeEventListener('pointerup', handlePointerUp);
  }

  document.body.classList.add('is-resizing-sidebar');
  window.addEventListener('pointermove', handlePointerMove);
  window.addEventListener('pointerup', handlePointerUp);
  event.preventDefault();
}

echoButton.addEventListener('click', renderGardenEcho);
todayButton.addEventListener('click', renderTodayFlower);
gardenBrand.addEventListener('dblclick', renameGarden);
backHomeButton.addEventListener('click', goHome);
sidebarToggleButton.addEventListener('click', toggleSidebarContent);
sidebarResizer.addEventListener('pointerdown', startSidebarResize);
updateGardenWelcome();
renderTodayFlower();
