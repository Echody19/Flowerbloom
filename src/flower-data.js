const flowerStats = [
  ['成长感', 86, '成长感较高，让花茎更高花瓣层次更丰富。'],
  ['希望感', 74, '希望感让花朵更向上，也带来更明显的微光。'],
  ['连接感', 68, '连接感让叶片更舒展，整朵花更有展开感。'],
  ['韧性', 80, '韧性让花茎更加挺拔稳定，支撑感更强。'],
  ['平静感', 48, '平静感较低，让花瓣仍保留一些紧绷感，没有完全舒展。'],
  ['探索欲', 55, '探索欲让花瓣形态产生轻微变化，使花朵不完全对称。'],
  ['自我接纳', 52, '自我接纳让花朵保持半开放状态，花心没有完全显露。'],
  ['自我怀疑', 46, '自我怀疑让花朵微微低头，但没有完全收拢。'],
];

export function getFlowerStatRows(flower) {
  const dimensions = window.EchoBloomFlowerStore?.dimensions;
  const traits = flower?.traits;

  if (!dimensions || !traits) {
    return flowerStats;
  }

  return dimensions.map((dimension) => {
    const value = Math.max(0, Math.min(100, Number(traits[dimension.key]) || 0));
    return [
      dimension.label,
      value,
      typeof dimension.describe === 'function' ? dimension.describe(value) : '',
    ];
  });
}

export function renderStatsRows(flower) {
  const rows = getFlowerStatRows(flower);

  return rows
    .map(([dimension, value, description], index) => `
      <li class="flower-stat" data-description="${escapeHtml(description)}" data-edge="${index >= rows.length - 2 ? 'bottom' : 'middle'}">
        <span class="flower-stat-name">${escapeHtml(dimension)}</span>
        <span class="flower-stat-track" aria-label="${escapeHtml(dimension)}状态 ${value}">
          <span class="flower-stat-fill" style="width: ${value}%"></span>
        </span>
        <span class="flower-stat-value">${value}</span>
      </li>
    `)
    .join('');
}

function escapeHtml(value) {
  return String(value || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}
