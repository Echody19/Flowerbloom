const sidebarContent = document.querySelector('#garden-sidebar-content');
const echoButton = document.querySelector('[data-garden-view="echo"]');
const todayButton = document.querySelector('[data-garden-view="today"]');

const stageKeywords = ['坚持', '比赛', '遗憾', '继续', '朋友', '练习', '成长', '调整'];

function renderKeywordChips() {
  return stageKeywords
    .map((keyword) => `<li>${keyword}</li>`)
    .join('');
}

function renderTodayFlower() {
  setCurrentGardenView(todayButton);
  sidebarContent.innerHTML = `
    <article class="today-flower" aria-labelledby="today-flower-heading">
      <h2 id="today-flower-heading">今日花事</h2>

      <section class="flower-card" aria-labelledby="flower-name-title">
        <h3 id="flower-name-title">今日花名</h3>
        <p>慢慢打开</p>
      </section>

      <section class="flower-card" aria-labelledby="flower-date-title">
        <h3 id="flower-date-title">生成日期</h3>
        <p>2026.06.15</p>
      </section>

      <section class="flower-card" aria-labelledby="flower-language-title">
        <h3 id="flower-language-title">今日花语</h3>
        <p>不是所有完成都会轻松，但它依然算数。</p>
      </section>

      <section class="flower-card" aria-labelledby="flower-stats-title">
        <h3 id="flower-stats-title">花朵特征</h3>
        <ul class="flower-stats">
          ${renderStatsRows()}
        </ul>
      </section>

      <section class="flower-card" aria-labelledby="flower-observation-title">
        <h3 id="flower-observation-title">花灵观察</h3>
        <p>我感觉今天的你有点累，但不是停下来的那种累。</p>
        <p>像是终于完成了一件很重要的事，却还没来得及真正开心。</p>
        <p>有一点遗憾，也有一点不甘心。</p>
        <p>但你还想继续，这就已经很珍贵了。</p>
      </section>

      <section class="flower-card" aria-labelledby="flower-download-title">
        <h3 id="flower-download-title">模型下载</h3>
        <p>格式：STL</p>
        <button type="button">下载 STL</button>
      </section>
    </article>
  `;
}

function renderGardenEcho() {
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
        <p>这段时间的花园没有特别剧烈的变化，但一直在缓慢生长。</p>
        <p>有一些花带着轻微的犹豫，但它们都没有停止开放。</p>
      </section>

      <section class="flower-card" aria-labelledby="stage-keywords-title">
        <h3 id="stage-keywords-title">阶段关键词</h3>
        <ul class="keyword-list">
          ${renderKeywordChips()}
        </ul>
      </section>

      <section class="flower-card" aria-labelledby="garden-spirit-echo-title">
        <h3 id="garden-spirit-echo-title">花灵回响</h3>
        <p>这一段时间，你并不是一直在变好，但你一直在往前。</p>
        <p>有一些时刻你会怀疑自己，也有一些时刻你重新找回力量。</p>
        <p>你的变化不是突然发生的，而是慢慢累积的。</p>
      </section>
    </article>
  `;
}

function setCurrentGardenView(currentButton) {
  [echoButton, todayButton].forEach((button) => {
    button.toggleAttribute('aria-current', button === currentButton);
  });
}

echoButton.addEventListener('click', renderGardenEcho);
todayButton.addEventListener('click', renderTodayFlower);
renderTodayFlower();
