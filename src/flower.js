import { renderStatsRows } from './flower-data.js';

const generatedStats = document.querySelector('#generated-stats');
const putIntoGardenButton = document.querySelector('[data-action="put-into-garden"]');
const generatedName = document.querySelector('[aria-labelledby="generated-flower-name"] p');
const generatedDate = document.querySelector('[aria-labelledby="generated-flower-date"] p');
const generatedLanguage = document.querySelector('[aria-labelledby="generated-flower-language"] p');
const generatedDetails = document.querySelector('.flower-generate-details');
const modelDownloadLink = document.querySelector('.flower-action-stack a[download]');
const currentFlower = window.EchoBloomFlowerStore?.getPendingFlower();

renderGeneratedFlower(currentFlower);

putIntoGardenButton.addEventListener('click', () => {
  window.EchoBloomFlowerStore?.saveFlowerToGarden(currentFlower);
  window.location.href = 'garden.html';
});

function renderGeneratedFlower(flower) {
  if (generatedName) {
    generatedName.textContent = flower?.flowerName || '慢慢打开';
  }

  if (generatedDate) {
    generatedDate.textContent = formatFlowerDate(flower?.generatedAt);
  }

  if (generatedLanguage) {
    generatedLanguage.textContent = flower?.flowerLanguage || '不是所有完成都会轻松，但它依然算数。';
  }

  if (generatedStats) {
    generatedStats.innerHTML = renderStatsRows(flower);
  }

  if (modelDownloadLink && flower?.modelUrl) {
    modelDownloadLink.href = flower.modelUrl;
  }

  renderObservation(flower);
}

function renderObservation(flower) {
  if (!generatedDetails || !flower?.observation) {
    return;
  }

  const oldObservation = generatedDetails.querySelector('[data-generated-observation]');
  oldObservation?.remove();

  const section = document.createElement('section');
  section.dataset.generatedObservation = 'true';
  section.setAttribute('aria-labelledby', 'generated-flower-observation');

  const title = document.createElement('h2');
  title.id = 'generated-flower-observation';
  title.textContent = '花灵观察';
  section.append(title);

  getObservationParagraphs(flower.observation).forEach((paragraph) => {
    const node = document.createElement('p');
    node.textContent = paragraph;
    section.append(node);
  });

  generatedDetails.append(section);
}

function getObservationParagraphs(observation) {
  return String(observation || '')
    .split(/\n+/)
    .map((paragraph) => paragraph.trim())
    .filter(Boolean)
    .slice(0, 4);
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
