const flowerStats = [
  ['成长感', 86],
  ['希望感', 74],
  ['连接感', 68],
  ['韧性', 80],
  ['平静感', 48],
  ['探索欲', 55],
  ['自我接纳', 52],
  ['自我怀疑', 46],
];

function renderStatsRows() {
  return flowerStats
    .map(([dimension, value]) => `
      <li class="flower-stat">
        <span class="flower-stat-name">${dimension}</span>
        <span class="flower-stat-track" aria-label="${dimension}状态 ${value}">
          <span class="flower-stat-fill" style="width: ${value}%"></span>
        </span>
        <span class="flower-stat-value">${value}</span>
      </li>
    `)
    .join('');
}
