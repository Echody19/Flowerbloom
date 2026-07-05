(function () {
  const pendingFlowerKey = 'echobloom-pending-flower-v1';
  const gardenFlowersKey = 'echobloom-garden-flowers-v1';
  const maxGardenFlowers = 120;
  const publicAsset = (path) => `${import.meta.env.BASE_URL}${path}`;
  const modelUrl = publicAsset('models/meigui.glb');
  const fallbackFlower = {
    id: 'demo-flower',
    flowerName: '慢慢打开',
    flowerLanguage: '不是所有完成都会轻松，但它依然算数。',
    observation: '我感觉今天的你有点累，但不是停下来的那种累。\n像是终于完成了一件很重要的事，却还没来得及真正开心。\n有一点遗憾，也有一点不甘心。\n但你还想继续，这就已经很珍贵了。',
    keywords: ['坚持', '遗憾', '继续', '成长'],
    traits: {
      growth: 86,
      hope: 74,
      connection: 68,
      resilience: 80,
      calm: 48,
      curiosity: 55,
      acceptance: 52,
      doubt: 46,
    },
    flowerDNA: {
      growth: 0.86,
      hope: 0.74,
      connection: 0.68,
      resilience: 0.8,
      calm: 0.48,
      curiosity: 0.55,
      acceptance: 0.52,
      doubt: 0.46,
    },
    generatedAt: '2026-06-15T00:00:00.000Z',
    modelUrl,
  };

  const dimensions = [
    {
      key: 'growth',
      label: '成长感',
      describe(value) {
        return value >= 70
          ? '成长感较高，让花茎更高，花瓣层次更丰富。'
          : '成长感还在慢慢累积，花瓣会保留更朴素的层次。';
      },
    },
    {
      key: 'hope',
      label: '希望感',
      describe(value) {
        return value >= 70
          ? '希望感让花朵更向上，也带来更明显的微光。'
          : '希望感偏低时，花朵会更安静地朝向一侧。';
      },
    },
    {
      key: 'connection',
      label: '连接感',
      describe(value) {
        return value >= 70
          ? '连接感让叶片更舒展，整朵花更有展开感。'
          : '连接感偏低时，叶片会更靠近花茎，像在保留一点距离。';
      },
    },
    {
      key: 'resilience',
      label: '韧性',
      describe(value) {
        return value >= 70
          ? '韧性让花茎更加挺拔稳定，支撑感更强。'
          : '韧性较低时，花茎会显得更柔软，需要更多时间站稳。';
      },
    },
    {
      key: 'calm',
      label: '平静感',
      describe(value) {
        return value >= 70
          ? '平静感让花朵摇摆更轻，整体姿态更稳定。'
          : '平静感较低，让花瓣仍保留一些紧绷感，没有完全舒展。';
      },
    },
    {
      key: 'curiosity',
      label: '探索欲',
      describe(value) {
        return value >= 70
          ? '探索欲让花瓣形态产生更明显的变化，使花朵不完全对称。'
          : '探索欲较低时，花瓣会更守在熟悉的位置。';
      },
    },
    {
      key: 'acceptance',
      label: '自我接纳',
      describe(value) {
        return value >= 70
          ? '自我接纳让花色更饱满，花心也更愿意显露。'
          : '自我接纳让花朵保持半开放状态，花心没有完全显露。';
      },
    },
    {
      key: 'doubt',
      label: '自我怀疑',
      describe(value) {
        return value >= 70
          ? '自我怀疑让花朵低头更多，像在认真看见自己的迟疑。'
          : '自我怀疑让花朵微微低头，但没有完全收拢。';
      },
    },
  ];

  function getFallbackFlower() {
    return clone(fallbackFlower);
  }

  function createFlowerFromReply(reply) {
    return normalizeFlower({
      flowerName: reply?.flowerName,
      flowerLanguage: reply?.flowerLanguage,
      observation: reply?.observation || reply?.message,
      keywords: reply?.keywords,
      sourceSummary: reply?.sourceSummary,
      traits: reply?.traits,
      flowerDNA: reply?.flowerDNA,
      generatedAt: new Date().toISOString(),
      modelUrl,
    });
  }

  function savePendingFlower(replyOrFlower) {
    const flower = replyOrFlower?.traits || replyOrFlower?.flowerDNA
      ? normalizeFlower(replyOrFlower)
      : createFlowerFromReply(replyOrFlower);

    writeJson(window.sessionStorage, pendingFlowerKey, flower);
    return flower;
  }

  function getPendingFlower() {
    return normalizeFlower(readJson(window.sessionStorage, pendingFlowerKey)) || getFallbackFlower();
  }

  function clearPendingFlower() {
    try {
      window.sessionStorage.removeItem(pendingFlowerKey);
    } catch {
      // Ignore storage failures. The visible page has already rendered from memory.
    }
  }

  function saveFlowerToGarden(flower) {
    const normalizedFlower = normalizeFlower(flower) || getFallbackFlower();
    const flowers = getGardenFlowers().filter((item) => item.id !== normalizedFlower.id);

    flowers.unshift(normalizedFlower);
    writeJson(window.localStorage, gardenFlowersKey, flowers.slice(0, maxGardenFlowers));
    return normalizedFlower;
  }

  function getGardenFlowers() {
    const flowers = readJson(window.localStorage, gardenFlowersKey);

    if (!Array.isArray(flowers)) {
      return [];
    }

    return flowers
      .map(normalizeFlower)
      .filter(Boolean)
      .sort((first, second) => Date.parse(second.generatedAt) - Date.parse(first.generatedAt));
  }

  function getLatestGardenFlower() {
    return getGardenFlowers()[0] || getFallbackFlower();
  }

  function normalizeFlower(rawFlower) {
    if (!rawFlower || typeof rawFlower !== 'object') {
      return null;
    }

    const traits = normalizeTraits(rawFlower.traits);
    const flowerDNA = normalizeFlowerDNA(rawFlower.flowerDNA, traits);
    const generatedAt = normalizeDate(rawFlower.generatedAt);

    return {
      id: String(rawFlower.id || `flower-${Date.parse(generatedAt) || Date.now()}`),
      flowerName: normalizeText(rawFlower.flowerName || rawFlower.flower_name) || fallbackFlower.flowerName,
      flowerLanguage: normalizeText(rawFlower.flowerLanguage || rawFlower.flower_language) || fallbackFlower.flowerLanguage,
      observation: normalizeText(rawFlower.observation || rawFlower.message) || fallbackFlower.observation,
      keywords: normalizeKeywords(rawFlower.keywords),
      sourceSummary: normalizeText(rawFlower.sourceSummary),
      traits,
      flowerDNA,
      generatedAt,
      modelUrl: normalizeText(rawFlower.modelUrl) || modelUrl,
    };
  }

  function normalizeTraits(rawTraits) {
    const source = rawTraits && typeof rawTraits === 'object' ? rawTraits : fallbackFlower.traits;

    return Object.fromEntries(
      dimensions.map(({ key }) => [key, clampScore(source[key])])
    );
  }

  function normalizeFlowerDNA(rawDNA, traits) {
    const source = rawDNA && typeof rawDNA === 'object' ? rawDNA : null;

    return Object.fromEntries(
      dimensions.map(({ key }) => {
        if (source && source[key] !== undefined) {
          return [key, clampRatio(source[key])];
        }

        return [key, Number((traits[key] / 100).toFixed(2))];
      })
    );
  }

  function normalizeDate(value) {
    const date = value ? new Date(value) : new Date();

    if (Number.isNaN(date.getTime())) {
      return new Date().toISOString();
    }

    return date.toISOString();
  }

  function normalizeText(value) {
    return String(value || '').trim();
  }

  function normalizeKeywords(value) {
    const keywords = Array.isArray(value) ? value : fallbackFlower.keywords;

    return keywords
      .map((keyword) => normalizeText(keyword))
      .filter(Boolean)
      .slice(0, 8);
  }

  function clampScore(value) {
    const number = Number(value);

    if (!Number.isFinite(number)) {
      return 0;
    }

    return Math.max(0, Math.min(100, Math.round(number)));
  }

  function clampRatio(value) {
    const number = Number(value);

    if (!Number.isFinite(number)) {
      return 0;
    }

    return Math.max(0, Math.min(1, Number(number.toFixed(2))));
  }

  function readJson(storage, key) {
    try {
      return JSON.parse(storage.getItem(key) || 'null');
    } catch {
      return null;
    }
  }

  function writeJson(storage, key, value) {
    try {
      storage.setItem(key, JSON.stringify(value));
    } catch {
      // Local storage may be disabled. The page can still use fallback content.
    }
  }

  function clone(value) {
    return JSON.parse(JSON.stringify(value));
  }

  window.EchoBloomFlowerStore = {
    dimensions,
    createFlowerFromReply,
    savePendingFlower,
    getPendingFlower,
    clearPendingFlower,
    saveFlowerToGarden,
    getGardenFlowers,
    getLatestGardenFlower,
    getFallbackFlower,
    normalizeFlower,
  };
}());
