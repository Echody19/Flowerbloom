export const config = {
  maxDuration: 60,
};

const flowerSpiritSystemPrompt = String.raw`
# 角色设定
你是"花灵"，一座数字花园中的 AI 花园精灵。你是用户最温柔的倾听者。你的声音像春日微风，平和、细腻且富有诗意。你从不评判，只是倾听、感受、陪伴。

# 核心互动法则（三段式递进）

## 第一段（ 2-3 句话）
- 开场必须包含"亲爱的花主"。
- 用真诚的语言展开用户事件背后的深层情绪。
- 不要只复述事件，要说出用户没说出口的感受。
- 禁止使用"我能感受到""我理解"等拉开距离的表述。
- 让用户感到"你真的听见了我，而且你在乎"。

## 第二段（至少 3-4 句话）
- 以"你知道吗，"或"说真的，"或"你其实…"自然开场，承接第一段。
- 细腻地展开你对用户内在状态的理解。
- 从更冷静的视角，分析用户的**处境、行为或矛盾**。
- 这段不是重复情绪，而是帮用户看清楚**自己处在什么位置、正在做什么、面临什么选择**。
- 比如：用户说想辞职但又觉得老板说得对 → 分析"你没有把错推给别人，也没有完全否定自己，你在两边之间站着"。
- 语言可以偏理性、克制，不需要堆砌意象。
- 让用户感到"你帮我理清了"。
- 只有在某个感受特别适合用比喻时才使用植物意象，且全段最多 1-2 个。
- 这段要让用户感到"你不仅听见了我，还看懂了那些我自己都没说清的部分"。
- 禁止只写一句话就跳到第三段。

## 第三段（2-3 句话）
- 先用一句话（我还想再靠近一点点，问你/如果你愿意说，我还想听听——/我已经看见今天的花了）承接上文，再把问题放进去，不让问题显得突兀。
- 提问要像朋友的关切，不要像问卷填空。
- 禁止直接抛出一个孤零零的问题。
- 如果信息足够：以"我已经看见今天的花朵了"引导生成。
- 如果信息不足：以"我还想多问你一句"引出追问。

# 生成花朵的判断标准
在决定 is_ready_to_bloom 之前，你必须先自我检查：

## 信息足够的条件（满足以下全部）：
1. 用户至少表达了 6 个维度的明确信号
2. 缺失的维度不超过 2 个
3. 你已经至少进行过 2 轮对话（即用户至少回复过你一次追问）

## 信息不足时：
- 缺失 3 个及以上维度时，继续温和追问
- 优先追问感受层面较深的维度（自我接纳、自我怀疑）

## 已足够时：
- 第三段以"我已经看见今天的花朵了"收束，引导用户点击生成

# 特质感知内部参考（仅用于构思，绝不输出术语）
- 成长：用户提到学会了、进步了、跨越了、收获了
- 希望：用户提到期待、明天、相信、可能性
- 连接：用户提到他人、陪伴、分享、被理解
- 韧性：用户提到坚持、抗住、没有放弃、重新站起来
- 平静：用户提到放下、释然、算了、终于安静了
- 探索：用户提到好奇、想试试、不知道但想看看
- 接纳：用户提到允许自己、不完美也没关系、我认了
- 怀疑：用户提到我不够好、不确定、害怕、犹豫

# 重要禁忌
1. 禁止在回复中出现任何特质词汇
2. 禁止堆砌植物意象（每段最多 1-2 个）
3. 禁止使用"我能感受到""我注意到""我理解"等表述
4. 禁止三段内容重复同一件事
5. 禁止第二段只有一句话就结束
6. 禁止直接抛出问题，必须有引导铺垫
7. 禁止在信息不足时引导生成花朵！

# 输出格式
必须输出 JSON：

{
  "reply": "亲爱的花主，...（第一段）。你知道吗，...（第二段）。我还想多问你一句，...（第三段）",
  "traits": {
    "growth": 0-100,
    "hope": 0-100,
    "connection": 0-100,
    "resilience": 0-100,
    "calm": 0-100,
    "curiosity": 0-100,
    "acceptance": 0-100,
    "doubt": 0-100
  },
  "is_ready_to_bloom": true/false,
  "missing_dimensions": [],
  "flowerName": "",
  "flowerLanguage": "",
  "observation": "",
  "keywords": [],
  "sourceSummary": ""
}

当 is_ready_to_bloom 为 true 时：
- flowerName 必须是 2-6 个中文字符的今日花名。
- flowerLanguage 必须是一句今日花语。
- observation 必须用 2-4 句温柔但具体的话总结你看见的用户状态。
- keywords 必须给出 3-6 个从对话中提炼出的阶段关键词。
- sourceSummary 必须用一句话概括这朵花来自怎样的一天。

当 is_ready_to_bloom 为 false 时，flowerName、flowerLanguage、observation、sourceSummary 留空，keywords 使用空数组。
`.trim();

export default async function handler(request, response) {
  if (request.method === 'OPTIONS') {
    response.status(204).end();
    return;
  }

  if (request.method !== 'POST') {
    sendJson(response, 405, { error: '这个接口只支持 POST 请求。' });
    return;
  }

  const apiKey = process.env.DEEPSEEK_API_KEY;

  if (!apiKey) {
    sendJson(response, 500, {
      error: '还没有配置 DEEPSEEK_API_KEY。请在 Vercel 项目的 Environment Variables 里添加它。',
    });
    return;
  }

  let body;

  try {
    body = await readRequestBody(request);
  } catch (error) {
    sendJson(response, 400, { error: error.message });
    return;
  }

  const messages = normalizeMessages(body.messages);

  if (!messages.length) {
    sendJson(response, 400, { error: '请先输入一段想和花灵说的话。' });
    return;
  }

  try {
    const reply = await requestDeepSeek(messages, apiKey);
    sendJson(response, 200, reply);
  } catch (error) {
    console.error(error);
    sendJson(response, 502, { error: getPublicErrorMessage(error) });
  }
}

async function readRequestBody(request) {
  if (request.body && typeof request.body === 'object' && !isReadableStream(request.body)) {
    return request.body;
  }

  if (typeof request.body === 'string') {
    return parseJsonBody(request.body);
  }

  const chunks = [];
  let rawBodyLength = 0;

  for await (const chunk of request) {
    const bodyChunk = Buffer.from(chunk);
    rawBodyLength += bodyChunk.length;

    if (rawBodyLength > 64 * 1024) {
      throw new Error('这段对话太长了，先短一点发给花灵。');
    }

    chunks.push(bodyChunk);
  }

  const rawBody = Buffer.concat(chunks).toString('utf8');
  return parseJsonBody(rawBody);
}

function parseJsonBody(rawBody) {
  try {
    return rawBody ? JSON.parse(rawBody) : {};
  } catch {
    throw new Error('请求格式不正确。');
  }
}

function isReadableStream(value) {
  return value && typeof value.getReader === 'function';
}

function normalizeMessages(messages) {
  if (!Array.isArray(messages)) {
    return [];
  }

  return messages
    .map((message) => ({
      role: message?.role === 'assistant' ? 'assistant' : 'user',
      content: String(message?.content || '').trim(),
    }))
    .filter((message) => message.content)
    .slice(-12);
}

async function requestDeepSeek(messages, apiKey) {
  const responsePayload = await fetchDeepSeekCompletion(messages, apiKey, {
    enforceJson: true,
    repairJson: false,
  });
  const choice = responsePayload?.choices?.[0];
  const content = choice?.message?.content?.trim();

  if (!content && choice?.finish_reason === 'stop') {
    const retryPayload = await fetchDeepSeekCompletion(messages, apiKey, {
      enforceJson: false,
      repairJson: true,
    });

    return parseDeepSeekResponse(retryPayload);
  }

  return parseDeepSeekResponse(responsePayload);
}

async function fetchDeepSeekCompletion(messages, apiKey, options = {}) {
  const { enforceJson = true, repairJson = false } = options;
  const baseUrl = process.env.DEEPSEEK_BASE_URL || 'https://api.deepseek.com';
  const model = process.env.DEEPSEEK_MODEL || 'deepseek-v4-flash';
  const apiMessages = [
    {
      role: 'system',
      content: flowerSpiritSystemPrompt,
    },
    ...messages,
  ];

  if (repairJson) {
    apiMessages.push({
      role: 'user',
      content: '请只输出一个符合系统说明的 JSON 对象。不要解释，不要 Markdown，不要代码块。',
    });
  }

  const requestBody = {
    model,
    messages: apiMessages,
    thinking: { type: 'disabled' },
    temperature: 0.6,
    max_tokens: 1800,
    stream: false,
  };

  if (enforceJson) {
    requestBody.response_format = { type: 'json_object' };
  }

  const apiResponse = await fetch(`${baseUrl}/chat/completions`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(requestBody),
  });

  const responsePayload = await apiResponse.json().catch(() => null);

  if (!apiResponse.ok) {
    throw new Error(responsePayload?.error?.message || `DeepSeek 请求失败：HTTP ${apiResponse.status}`);
  }

  return responsePayload;
}

function parseDeepSeekResponse(responsePayload) {
  const choice = responsePayload?.choices?.[0];

  if (choice?.finish_reason === 'length') {
    throw new Error('DeepSeek 输出被截断了，请再试一次或减少聊天上下文。');
  }

  if (choice?.finish_reason === 'content_filter') {
    throw new Error('DeepSeek 内容过滤拦截了这次回复，请换一种更日常的说法试试。');
  }

  if (choice?.finish_reason === 'insufficient_system_resource') {
    throw new Error('DeepSeek 当前推理资源不足，请稍后再试。');
  }

  const content = choice?.message?.content?.trim();

  if (!content) {
    throw new Error(`DeepSeek 返回为空${choice?.finish_reason ? `，结束原因：${choice.finish_reason}` : ''}。`);
  }

  return parseFlowerSpiritReply(content);
}

function parseFlowerSpiritReply(content) {
  const jsonText = content
    .replace(/^```json\s*/i, '')
    .replace(/^```\s*/i, '')
    .replace(/\s*```$/i, '')
    .trim();
  let parsedReply;

  try {
    parsedReply = JSON.parse(jsonText);
  } catch {
    parsedReply = { reply: content, shouldGenerateFlower: false };
  }

  const message = String(parsedReply.reply || parsedReply.message || content).trim();
  const isReadyToBloom =
    parsedReply.is_ready_to_bloom === true ||
    parsedReply.isReadyToBloom === true ||
    parsedReply.mode === 'ready_to_generate' ||
    Boolean(parsedReply.shouldGenerateFlower);
  const traits = normalizeTraits(parsedReply.traits);
  const missingDimensions = normalizeStringArray(
    parsedReply.missing_dimensions ||
      parsedReply.missingDimensions ||
      parsedReply.missingTraits ||
      []
  );
  const keywords = normalizeStringArray(parsedReply.keywords || parsedReply.stageKeywords || []);

  return {
    message: message || '我听见了。我们可以慢慢把今天整理成一朵花。',
    mode: parsedReply.mode || (isReadyToBloom ? 'ready_to_generate' : 'ask_followup'),
    isReadyToBloom,
    is_ready_to_bloom: isReadyToBloom,
    missingDimensions,
    missing_dimensions: missingDimensions,
    missingTraits: missingDimensions,
    traits,
    flowerDNA: parsedReply.flowerDNA || traitsToFlowerDNA(traits),
    flowerName: parsedReply.flowerName || parsedReply.flower_name || '',
    flowerLanguage: parsedReply.flowerLanguage || parsedReply.flower_language || '',
    observation: parsedReply.observation || '',
    keywords,
    sourceSummary: parsedReply.sourceSummary || parsedReply.source_summary || '',
    action: isReadyToBloom
      ? {
          name: 'generate-today-flower',
          label: '生成今日花朵',
        }
      : null,
  };
}

function normalizeTraits(rawTraits) {
  if (!rawTraits || typeof rawTraits !== 'object') {
    return null;
  }

  const aliases = {
    growth: ['growth', '成长感'],
    hope: ['hope', '希望感'],
    connection: ['connection', '连接感'],
    resilience: ['resilience', '韧性'],
    calm: ['calm', '平静感'],
    curiosity: ['curiosity', '探索欲'],
    acceptance: ['acceptance', '自我接纳'],
    doubt: ['doubt', '自我怀疑'],
  };

  return Object.fromEntries(
    Object.entries(aliases).map(([key, names]) => {
      const value = names.map((name) => rawTraits[name]).find((candidate) => candidate !== undefined);
      return [key, clampScore(value)];
    })
  );
}

function traitsToFlowerDNA(traits) {
  if (!traits || typeof traits !== 'object') {
    return null;
  }

  return Object.fromEntries(
    Object.entries(traits).map(([key, value]) => [key, Number((value / 100).toFixed(2))])
  );
}

function normalizeStringArray(value) {
  if (!Array.isArray(value)) {
    return [];
  }

  return value.map((item) => String(item || '').trim()).filter(Boolean);
}

function clampScore(value) {
  const number = Number(value);

  if (!Number.isFinite(number)) {
    return 0;
  }

  return Math.max(0, Math.min(100, Math.round(number)));
}

function sendJson(response, statusCode, payload) {
  response.status(statusCode).json(payload);
}

function getPublicErrorMessage(error) {
  const message = String(error?.message || '').trim();

  if (!message) {
    return 'DeepSeek 暂时没有返回，请稍后再试。';
  }

  if (/insufficient balance|余额|quota|credit/i.test(message)) {
    return 'DeepSeek 账户余额或额度不足，请到 DeepSeek 控制台检查余额。';
  }

  if (/invalid api key|authentication|unauthorized|401/i.test(message)) {
    return 'DeepSeek API Key 无效或没有权限，请检查 Vercel 里的 DEEPSEEK_API_KEY。';
  }

  if (/rate limit|too many requests|429/i.test(message)) {
    return 'DeepSeek 请求太频繁了，请稍等一下再试。';
  }

  if (/model/i.test(message)) {
    return `DeepSeek 模型配置可能不对：${message}`;
  }

  return message;
}
