# 花园回响 EchoBloom

花园回响是一个以情绪记录为入口的 3D 数字花园原型。用户可以和「花灵」对话，把一天里的事件、感受和迟疑慢慢说出来；系统会通过 DeepSeek 生成一段温柔的回应，并在信息足够时整理出今日花名、花语、花灵观察、关键词和八维情绪特质，再把这些数据映射成一朵可查看、可收藏到花园里的 3D 花。

## 功能概览

- 首页入口：从 `index.html` 进入花园或打开花灵聊天。
- 花灵聊天：`chat.html` 调用本地 `/api/chat` 接口，与 DeepSeek 对话并生成今日花数据。
- 今日花朵：`flower.html` 展示花名、花语、特征条、花灵观察和 3D 花朵模型。
- 我的花园：`garden.html` 展示 3D 花园场景、今日花事、阶段关键词和花园回响。

## 技术栈

- Vite 多页面应用
- Three.js、GLTFLoader、OrbitControls
- Node.js HTTP 服务
- DeepSeek Chat Completions API
- `sessionStorage` 和 `localStorage` 保存聊天、待生成花朵与花园花朵数据

## 项目结构

```text
.
├── index.html                # 首页
├── chat.html                 # 花灵聊天页
├── flower.html               # 今日花朵页
├── garden.html               # 我的花园页
├── public/models/            # 3D 模型资源
├── scripts/dev-server.js     # 本地 Vite 中间件 + /api/chat 代理
├── src/
│   ├── chat.js               # 聊天请求、会话缓存、生成入口
│   ├── flower-store.js       # 花朵数据归一化与本地存储
│   ├── flower.js             # 今日花朵信息渲染与入园操作
│   ├── flower-viewer.js      # 单朵花 3D 预览
│   ├── garden.js             # 花园侧栏、今日花事、花园回响
│   ├── garden-stage-model.js # 花园主场景模型
│   └── main.css              # 主样式
└── tools/                    # 模型转换等辅助脚本
```

## 本地运行

安装依赖：

```bash
npm install
```

复制环境变量文件：

```bash
cp .env.example .env
```

填写 `.env` 里的 DeepSeek 配置：

```env
DEEPSEEK_API_KEY=sk-your-deepseek-api-key
DEEPSEEK_MODEL=deepseek-v4-flash
DEEPSEEK_BASE_URL=https://api.deepseek.com
PORT=5173
```

启动开发服务：

```bash
npm run dev
```

打开：

```text
http://127.0.0.1:5173/
```

## 可用脚本

```bash
npm run dev       # 启动 Node 服务，并挂载 Vite 中间件与 /api/chat
npm run dev:vite  # 仅启动 Vite 开发服务，不包含 DeepSeek 代理接口
npm run preview   # 预览已构建产物
```

如果要测试花灵聊天，请使用 `npm run dev`，因为聊天页需要本地服务端代理 DeepSeek 请求，不能只用静态文件打开。

## Vercel 部署

Vercel 会执行 `npm run build`，并发布 `dist` 目录。`/api/chat` 会作为 Serverless Function 部署，不需要把本地开发用的 `scripts/dev-server.js` 作为生产入口。

部署前需要在 Vercel 项目的 Environment Variables 里配置：

```env
DEEPSEEK_API_KEY=sk-your-deepseek-api-key
DEEPSEEK_MODEL=deepseek-v4-flash
DEEPSEEK_BASE_URL=https://api.deepseek.com
```

## 页面流程

1. 在首页点击「与花灵聊天」，进入 `chat.html`。
2. 输入当天的故事或感受，前端会把最近 12 条对话发送给 `/api/chat`。
3. 服务端把系统提示词和用户消息转发给 DeepSeek，并要求模型返回结构化 JSON。
4. 当 `is_ready_to_bloom` 为 `true` 时，聊天页会出现「生成今日花朵」按钮。
5. 点击按钮进入 `flower.html`，页面读取 `sessionStorage` 中的待生成花朵数据。
6. 点击「放入花园」后，花朵会保存到 `localStorage`，并跳转到 `garden.html`。
7. 花园页根据历史花朵生成今日花事、阶段关键词和花园回响。

## 花朵数据

花灵返回的数据会被归一化为一朵花，核心字段包括：

```js
{
  flowerName: '慢慢打开',
  flowerLanguage: '不是所有完成都会轻松，但它依然算数。',
  observation: '花灵对今天状态的观察',
  keywords: ['坚持', '遗憾', '继续', '成长'],
  traits: {
    growth: 86,
    hope: 74,
    connection: 68,
    resilience: 80,
    calm: 48,
    curiosity: 55,
    acceptance: 52,
    doubt: 46
  },
  flowerDNA: {
    growth: 0.86,
    hope: 0.74,
    connection: 0.68,
    resilience: 0.8,
    calm: 0.48,
    curiosity: 0.55,
    acceptance: 0.52,
    doubt: 0.46
  }
}
```

八维特质会影响 3D 花朵的层数、朝向、叶片展开、茎干高度、摆动稳定性、花瓣收拢、颜色饱和度和低头姿态。

## 本地存储

- `echobloom-chat-history-v1`：当前聊天会话，保存在 `sessionStorage`。
- `echobloom-pending-flower-v1`：等待进入今日花朵页的花，保存在 `sessionStorage`。
- `echobloom-garden-flowers-v1`：已经放入花园的花，保存在 `localStorage`。
- `garden-username`：花园用户名，保存在 `localStorage`。
- `garden-sidebar-width`：花园侧栏宽度，保存在 `localStorage`。

## 开发备注

- 不要把 DeepSeek API Key 写进前端文件，统一放在 `.env` 或 `.env.local`。
- `/api/chat` 只接受 `POST` 请求，服务端会限制请求体大小并裁剪最近 12 条消息。
- `/models/meigui.glb` 是今日花朵使用的主要模型，`/models/hua.glb` 是花园主场景模型。
