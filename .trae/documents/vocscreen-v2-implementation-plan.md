# 词映 VocScreen v2 — 完整实施计划

## 背景

v1 代码在 `vocscreen_v1/vocscreen_v1/` 中，存在 9 个明确的 bug 和大量未完成的功能（ASR 引擎、翻译引擎、词形还原匹配、视频片段截取、统计面板等），实质上只是一个 UI 骨架。v2 需要在保留 v1 架构思路的基础上，从零重建一个完整的、可用于比赛的产品。

## 技术栈

| 层级 | 技术 | 版本 |
|------|------|------|
| 框架 | React | ^19.2 |
| 语言 | TypeScript | ~6.0 |
| 构建 | Vite | ^8.1 |
| 样式 | Tailwind CSS | ^4.3 |
| 状态 | Zustand | ^5.0 |
| 持久化 | Dexie.js | ^4.4 |
| 动效 | motion | ^12.4 |
| WebGL | ogl | ^1.0 |
| NLP | compromise | ^14.1 |
| 图标 | Phosphor | ^2.1 |
| PWA | vite-plugin-pwa | ^1.3 |

## 项目结构

```
vocscreen_v2/
├── public/
│   ├── wordbooks/{cet4,cet6,ielts,toefl}.json
│   ├── mock/friends-s01e01/{metadata,subtitles}.json
│   └── models/  (CDN 加载, 不打包)
├── src/
│   ├── types/        (video, subtitle, vocabulary, review, engine)
│   ├── engines/
│   │   ├── asr/      (AsrEngine, WhisperLocal, CloudAsr, AudioExtractor, worker)
│   │   ├── translation/ (TranslateEngine, LocalTranslator, CloudTranslator)
│   │   ├── matching/ (MatcherEngine, Lemmatizer)
│   │   ├── subtitle/ (SubtitleRenderer类, SrtParser, MockLoader)
│   │   ├── review/   (ReviewScheduler 纯函数)
│   │   └── capture/  (ClipCapture)
│   ├── stores/       (5 Zustand stores: Player, UI, Subtitle, Vocab, Review)
│   ├── db/           (Dexie schema + migrations)
│   ├── hooks/        (useKeyboardShortcuts, useDemoTimeline, useAutoCapture, useVideoEndDetection, usePwaNotification, useMediaCapture)
│   ├── components/
│   │   ├── landing/  (StartPage, Plasma, WordBookSelect)
│   │   ├── player/   (VideoPlayer, SubtitleCanvas, VideoControls, VideoDropZone, SubtitleSourceModal)
│   │   ├── toolbar/  (TopToolbar)
│   │   ├── vocab/    (DefinitionCard, FlashCard, LearningModal, ReviewPanel, DashboardPanel, ProfilePanel)
│   │   ├── stats/    (StatsPanel - 全新)
│   │   └── ui/       (Modal, Drawer, Toast, ProgressBar)
│   └── workers/      (asr.worker.ts, ffmpeg.worker.ts)
```

## 核心架构决策

### 1. Canvas 字幕渲染引擎 — 提取为 SubtitleRenderer 类
v1 的渲染逻辑内嵌在 React 组件中，v2 提取为纯 TypeScript 类，通过 RAF 驱动 60fps 渲染，React 组件仅做生命周期管理。修复 hitMap 分隔符 bug（`|` → `\x00`）。

### 2. 词形还原匹配 — Lemmatizer + MatcherEngine
v1 的 `rematchWords` 做的是 naive 字符串分割。v2 使用 `compromise` 库做词形还原（"running"→"run"），词书字典以 lemma 为 key，确保匹配准确。

### 3. 双重 ASR — 外观模式 + Web Worker
`AsrEngine` 作为统一入口，自动检测网络并路由到本地 Whisper WASM 或云端 API。ASR 在 Web Worker 中运行，不阻塞 UI 线程。目前可先用预设字幕，但接口完整保留。

### 4. 翻译双通道 — 云端 API + 本地词典兜底
云端使用 MyMemory 免费 API，本地使用已加载词书的词典定义做逐词翻译。不做 NLLB WASM（模型 600MB+ 太大）。

### 5. 视频片段截取 — MediaRecorder + captureStream
用户点词时自动截取该句 4-8 秒短视频片段，存为 Blob 到 IndexedDB。复习时不依赖原视频。

### 6. 5 个 Zustand Store — 保持 v1 的领域划分
Player / UI / Subtitle / Vocab / Review 各司其职，通过 `getState()` 跨 store 通信。

## v1 Bug 修复清单

| # | Bug | v2 修复方案 |
|---|-----|------------|
| 1 | `App.tsx` videoId 硬编码 `'friends-s01e01'` | `usePlayerStore.loadVideo` 中生成 UUID |
| 2 | `useKeyboardShortcuts` Space 读取过期 isPlaying 状态 | 在 `togglePlay` 前读取 `isPlaying`，基于 toggle 前状态设置 mode |
| 3 | `SubtitleCanvas` hitMap 用 `\|` 分隔符 | 改用 `\x00` (null byte) |
| 4 | `DefinitionCard` videoId 硬编码 + 错误搜索字段 | 使用 store 中的动态 videoId；修复 `handleViewClip` 搜索逻辑 |
| 5 | `FlashCard` 释义硬编码 "面对；对抗；直面" | 通过 `lookupWord` 从词书获取真实释义 |
| 6 | `ReviewPanel` dueWords 在 recordReview 后不更新 | 订阅 `reviewQueue` 和 `schedules`，`getDueWords()` 同步更新 |
| 7 | `useVocabStore.lookupWord` 做 naive 字符串匹配 | 输入词先做词形还原，再查 lemma-keyed 字典 |
| 8 | `useSubtitleStore.rematchWords` naive 分词 | 使用 `MatcherEngine.rematchAll` + lemmatization |
| 9 | `TopToolbar` "换视频" 按钮不打开文件选择器 | 改为触发 `<input type="file">` click |

## 实施阶段

### Phase 0: 项目脚手架（脚手架 + 依赖 + 类型 + 数据库）
- 初始化 Vite + React + TypeScript + Tailwind 项目
- 安装所有依赖，配置 vite.config.ts / tsconfig / PWA
- 移植 v1 的 index.css（完整紫色主题 + 暗/亮模式）
- 创建所有类型定义文件
- 创建 Dexie 数据库 schema（新增 clips 表）

### Phase 1: 核心基础设施（Store + Hooks + UI 原语 + 开始页）
- 实现 5 个 Zustand store（移植 v1 并修复 bug）
- 实现 UI 原语：Modal, Drawer, Toast, ProgressBar
- 移植开始页：Plasma WebGL + StartPage + WordBookSelect
- 实现 ErrorBoundary

### Phase 2: 字幕引擎与 Canvas 渲染
- 实现 `SubtitleRenderer` 类（从 v1 SubtitleCanvas 提取并重构）
- 移植 SrtParser, MockLoader, TranslateEngine
- 重写 SubtitleCanvas.tsx（薄 React 包装）
- 移植 VideoPlayer, VideoControls, VideoDropZone, SubtitleSourceModal

### Phase 3: 词书匹配引擎
- 实现 Lemmatizer（compromise 封装）
- 实现 MatcherEngine（buildWordSet, matchSegment, rematchAll）
- 重写 useVocabStore.lookupWord（词形还原后查字典）
- 重写 useSubtitleStore.rematchWords（使用 MatcherEngine）
- 移植词书 JSON 文件

### Phase 4: 词汇交互与学习闭环
- 移植 DefinitionCard（修复所有 bug）
- 移植 FlashCard（修复硬编码释义、添加视频片段回放）
- 移植 LearningModal
- 重写 ReviewPanel（修复 dueWords 更新 bug）
- 实现 useAutoCapture 和 useVideoEndDetection hooks
- 实现 ClipCapture 引擎（MediaRecorder 截取视频片段）
- 移植 DashboardPanel, ProfilePanel

### Phase 5: ASR 引擎（双通道）
- 实现 AudioExtractor（FFmpeg WASM 音频提取）
- 实现 WhisperLocal（Web Worker 中加载 whisper-tiny.wasm）
- 实现 CloudAsr（OpenAI Whisper API）
- 实现 AsrEngine（外观模式，自动切换）
- 集成到应用流程（SubtitleSourceModal → ASR 流水线 → 字幕加载）

### Phase 6: 翻译引擎
- 移植 TranslateEngine（MyMemory API）
- 实现 LocalTranslator（词典回退）
- 集成到 ASR 流水线（ASR 生成英文 → 翻译填充中文）

### Phase 7: 工具栏、导航、键盘
- 重写 TopToolbar（修复"换视频"按钮）
- 重写 useKeyboardShortcuts（修复过期状态 bug）
- 实现 App.tsx（修复 videoId 硬编码，提取 hooks）

### Phase 8: 统计与复习打磨
- 实现 StatsPanel（词汇增长可视化）
- 实现 usePwaNotification（复习提醒）
- 实现 ReviewScheduler 纯函数模块
- 打磨 ReviewPanel 和 LearningModal

### Phase 9: 部署与测试
- PWA 配置验证（图标、离线、添加到主屏幕）
- 部署到 Vercel/Cloudflare Pages
- 端到端测试全流程
- Bug 修复和边缘情况处理

## 关键文件

**从 v1 直接移植（改动最小）：**
- `Plasma.tsx` + `Plasma.css` + `StartPage.tsx` + `WordBookSelect.tsx`
- `Modal.tsx`, `Drawer.tsx`, `ErrorBoundary.tsx`
- `VideoControls.tsx`, `VideoDropZone.tsx`
- `SrtParser.ts`, `MockLoader.ts`, `TranslateEngine.ts`
- `index.css`（完整主题系统）
- `vite.config.ts`, `index.html`, `database.ts`
- 词书 JSON + Mock 字幕数据

**需要重大重写：**
- `SubtitleCanvas.tsx` → 提取 `SubtitleRenderer` 类
- `useVocabStore.ts` → 词形还原匹配
- `useSubtitleStore.ts` → MatcherEngine 集成
- `useReviewStore.ts` → 修复队列更新
- `useKeyboardShortcuts.ts` → 修复过期状态
- `DefinitionCard.tsx` → 修复硬编码
- `FlashCard.tsx` → 修复硬编码 + 视频片段
- `ReviewPanel.tsx` → 修复响应式
- `TopToolbar.tsx` → 修复换视频按钮
- `App.tsx` → 提取 hooks

**全新实现：**
- `SubtitleRenderer` 类、`Lemmatizer`、`MatcherEngine`
- `AsrEngine`、`WhisperLocal`、`CloudAsr`、`AudioExtractor`
- `ClipCapture`、`ReviewScheduler`
- `StatsPanel`、`usePwaNotification`、`useAutoCapture`、`useVideoEndDetection`
- `Toast`、`ProgressBar`
- Web Worker 文件

## 验证方法

1. **开始页**：打开链接 → Plasma 动画播放 → 品牌文字动画 → 点击"开始使用" → 词书选择页 → 选择词书 → 进入主应用
2. **预设视频播放**：Demo 模式 → 字幕在 Canvas 渲染 → 双语/仅英/仅中切换 → 词书词高亮
3. **互动模式**：空格暂停 → 画面模糊 → 点击高亮词 → 释义卡片弹出 → 自动收入生词本
4. **学习闭环**：视频播完 → 学习弹窗 → 逐词学习 → 标记掌握度 → 排入艾宾浩斯队列
5. **复习**：工具栏角标提示 → 打开复习面板 → 卡片翻转 → 视频片段回放 → 标记掌握度
6. **词书切换**：切换词书 → 高亮实时刷新
7. **SRT 导入**：拖入视频 + SRT → 字幕加载 → 词书匹配
8. **ASR 流程**：拖入视频 → 选择 AI 生成字幕 → 进度条 → 字幕生成完成
9. **PWA**：HTTPS 部署 → 离线可用 → 添加到主屏幕