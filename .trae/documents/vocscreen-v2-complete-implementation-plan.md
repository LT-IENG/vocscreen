# 词映 VocScreen v2 — 完整实施计划

## 当前状态

v2 已完成 Phase 0-1（脚手架、类型、数据库、5个Store、UI原语、开始页），但 App.tsx 只是占位符。v1 有完整的 UI 组件但充满 bug 和硬编码。v2 需在已完成基础上，从 v1 移植所有组件并修复所有已知 bug，同时实现 v1 缺失的核心功能。

## 已完成（无需重复）

- `src/types/` — 所有类型定义
- `src/db/database.ts` — Dexie 数据库 schema
- `src/stores/` — 5个 Zustand Store（Player, UI, Subtitle, Vocab, Review）
- `src/components/ui/` — Modal, Drawer, Toast, ProgressBar
- `src/components/landing/` — Plasma, StartPage, WordBookSelect
- `src/components/ErrorBoundary.tsx`
- `src/index.css` — 完整主题系统
- `public/wordbooks/` — cet4/cet6/ielts/toefl JSON
- `public/mock/friends-s01e01/` — 预设字幕数据
- `src/vite-env.d.ts`

---

## Phase 2: 引擎层 + 核心组件（字幕/播放器/工具栏）

### 2.1 引擎层 — 从 v1 移植并修复

**`src/engines/subtitle/SrtParser.ts`**
- 从 v1 直接移植，无需修改。parseSrt 解析双语 SRT，matchWordsAndBuildSegments 构建带高亮的 SubtitleSegment 数组。

**`src/engines/subtitle/TranslateEngine.ts`**
- 从 v1 直接移植。MyMemory 免费 API 批量翻译，fillMissingTranslations 补齐缺失语言。

**`src/engines/subtitle/MockLoader.ts`**
- 从 v1 移植。loadMockSubtitles 从 /mock/ 目录加载预设字幕和元数据。

**`src/engines/subtitle/SubtitleRenderer.ts`** — 全新实现
- 从 v1 SubtitleCanvas.tsx 中提取渲染逻辑为纯 TypeScript 类
- 修复 hitMap 分隔符 bug：`|` → `\x00`（null byte）
- 提供方法：`render(ctx, canvas, segments, currentTime, subtitleDisplay, fontSize)` → 返回 hitMap
- 提供静态方法：`findCurrentSegment(segments, time)` → 二分查找
- provide `wrapText`, `drawWordLine` 为私有方法
- 暴露出 `hitMap` 用于点击检测
- 支持 light/dark 主题色切换（从 CSS 变量读取）

### 2.2 引擎层 — 词书匹配

**`src/engines/matching/Lemmatizer.ts`** — 全新实现
- 封装 `compromise` 库，提供 `lemmatize(word: string): string`
- 对常见不规则动词/名词做硬编码映射（compromise 不完美）
- 导出单例 `lemmatizer`

**`src/engines/matching/MatcherEngine.ts`** — 全新实现
- `buildWordSet(book: WordBook): Set<string>` — 以 lemma 为 key 构建词集
- `matchSegment(segment: SubtitleSegment, wordSet: Set<string>, bookId: string): HighlightedWord[]`
- `rematchAll(segments: SubtitleSegment[], wordSet: Set<string>, bookId: string): SubtitleSegment[]`
- 使用 lemmatizer 先做词形还原再匹配

### 2.3 播放器组件 — 从 v1 移植并修复

**`src/components/player/VideoPlayer.tsx`**
- 从 v1 移植，几乎不变
- 修复：移除 v1 的 `interactMode` 变量命名冲突，改为从 UIStore 读取
- 保留交互模式下的模糊遮罩效果
- 保留 demo 模式占位 UI

**`src/components/player/SubtitleCanvas.tsx`** — 重大重写
- 使用新的 SubtitleRenderer 类替代内嵌渲染逻辑
- React 组件仅做生命周期管理：创建 canvas、resize、调用 renderer.render()
- 点击处理：从 hitMap 中用 `\x00` 分隔符解析，而非 `|`
- 点击词 → pause + setMode('interact') + showDefinition
- 点击空白 → togglePlay

**`src/components/player/VideoControls.tsx`**
- 从 v1 直接移植，基本不变
- 播放/暂停、进度条、音量、全屏控制

**`src/components/player/VideoDropZone.tsx`**
- 从 v1 直接移植，基本不变
- 拖拽/点击上传视频文件
- 加载视频后打开 SubtitleSourceModal

**`src/components/player/SubtitleSourceModal.tsx`**
- 从 v1 移植，适配新的引擎导入路径
- 上传 SRT → 解析 → 翻译补全 → 加载字幕
- AI 生成按钮暂时显示"即将支持"（接口预留）

### 2.4 工具栏

**`src/components/toolbar/TopToolbar.tsx`** — 从 v1 移植并修复
- 修复"换视频"按钮：从直接 closeVideo 改为触发 `<input type="file">` click
- 添加隐藏的 file input ref
- 保留字幕显示切换、字号切换、仪表盘/个人按钮、复习角标

### 2.5 钩子

**`src/hooks/useKeyboardShortcuts.ts`** — 从 v1 移植并修复
- 修复 Space 键读取过期 isPlaying 状态：在 togglePlay 前读取状态，基于 toggle 前状态设置 mode
- 保留所有快捷键：Space、ArrowLeft/Right、R、S、Escape

**`src/hooks/useDemoTimeline.ts`**
- 从 v1 直接移植，无需修改
- Demo 模式下用 setInterval 模拟播放进度

**`src/hooks/useVideoEndDetection.ts`** — 全新实现
- 从 v1 App.tsx 中提取 video end detection 逻辑
- 检测视频播放结束 → 自动弹出 LearningModal（如果有新词）

**`src/hooks/useAutoCapture.ts`** — 全新实现
- 从 v1 App.tsx 中提取 auto-capture 逻辑
- 当 definitionCard 出现且模式为 interact 时，自动捕获词汇

---

## Phase 3: 词汇交互与学习闭环

### 3.1 释义卡片

**`src/components/vocab/DefinitionCard.tsx`** — 从 v1 移植并修复
- 修复硬编码 videoId：使用 `usePlayerStore.getState().videoId`
- 修复 `handleViewClip`：基于当前视频的 capturedWords 查找，而非错误搜索
- 保留：单词显示、音标、释义、等级标签、加入/移出生词本、看原片段

### 3.2 闪卡

**`src/components/vocab/FlashCard.tsx`** — 从 v1 移植并修复
- 修复硬编码释义 "面对；对抗；直面"：通过 `useVocabStore.getState().lookupWord(word.lemma)` 获取真实释义
- 修复硬编码等级标签 "六级词汇"：从 lookupWord 结果获取 level
- 保留：翻转动画、正面/背面、看原片段、掌握度三按钮

### 3.3 学习弹窗

**`src/components/vocab/LearningModal.tsx`**
- 从 v1 直接移植，基本不变
- 视频播完弹出 → 展示匹配词数和新词数 → 逐词学习 → 标记掌握度 → 排入艾宾浩斯队列

### 3.4 复习面板

**`src/components/vocab/ReviewPanel.tsx`** — 从 v1 移植并修复
- 修复 dueWords 在 recordReview 后不更新的问题：v2 的 useReviewStore 已在 recordReview 中同步更新 reviewQueue
- 使用 Drawer 组件展示
- 逐词复习 → 翻转闪卡 → 标记掌握度

### 3.5 仪表盘

**`src/components/vocab/DashboardPanel.tsx`**
- 从 v1 直接移植，基本不变
- 统计卡片（已捕获词、待复习）、词书切换、生词本列表、导出 JSON

### 3.6 个人面板

**`src/components/vocab/ProfilePanel.tsx`**
- 从 v1 直接移植，基本不变
- 昵称编辑、字幕默认显示、主题切换、QR 码同步、导入/导出/清除数据

---

## Phase 4: 统计面板 + 视频片段截取

### 4.1 统计面板

**`src/components/stats/StatsPanel.tsx`** — 全新实现
- 使用 Drawer 组件展示
- 展示：累计看视频数、累计捕获词数、累计复习次数、连续学习天数
- 词汇增长趋势图（简单柱状图用 div 实现，不引入图表库）
- 词书掌握度分布（饼图用 CSS conic-gradient 实现）
- 从 IndexedDB userStats 和 capturedWords 读取数据

### 4.2 视频片段截取

**`src/engines/capture/ClipCapture.ts`** — 全新实现
- 使用 MediaRecorder + canvas.captureStream() 从 video 元素截取 4-8 秒片段
- `captureClip(videoElement: HTMLVideoElement, startTime: number, duration: number): Promise<Blob>`
- 截取时 seek 到 startTime，播放 duration 秒，录制为 WebM Blob
- 存储到 IndexedDB clips 表

---

## Phase 5: ASR 引擎（接口预留，预设字幕可用）

### 5.1 音频提取

**`src/engines/asr/AudioExtractor.ts`** — 全新实现（接口层）
- 定义接口：`extractAudio(videoFile: File): Promise<AudioBuffer>`
- 当前实现：返回 mock 数据或抛出"即将支持"
- 预留 FFmpeg WASM 集成点（Web Worker 中运行）

### 5.2 ASR 引擎

**`src/engines/asr/AsrEngine.ts`** — 全新实现（接口层）
- 外观模式统一入口
- `transcribe(audio: AudioBuffer, config: AsrEngineConfig): Promise<RawTranscriptionSegment[]>`
- 当前实现：返回空数组 + 提示"即将支持"
- 预留本地 Whisper WASM 和云端 API 两个通道

**`src/engines/asr/WhisperLocal.ts`** — 接口桩
- 预留 whisper-tiny WASM 加载和推理接口

**`src/engines/asr/CloudAsr.ts`** — 接口桩
- 预留 OpenAI Whisper API 调用接口

---

## Phase 6: App.tsx 主应用组装

**`src/App.tsx`** — 完全重写
- 基于 v1 App.tsx 结构，使用 v2 已完成的所有组件
- 屏幕路由：landing → wordbook-select → app
- MainApp 组件：
  - 初始化数据（loadPersistedWords, loadPersistedSchedules, getDueWords, 加载默认词书）
  - 使用 useKeyboardShortcuts, useDemoTimeline, useAutoCapture, useVideoEndDetection
  - 渲染：TopToolbar + VideoPlayer/VideoDropZone + VideoControls + DefinitionCard + ReviewPanel + LearningModal + DashboardPanel + ProfilePanel + SubtitleSourceModal
- 修复 v1 的 videoId 硬编码：使用 usePlayerStore 的动态 videoId

---

## Phase 7: PWA 与打磨

### 7.1 PWA 配置
- 确保 vite-plugin-pwa 配置正确
- 在 public/ 添加 icon-192.png 和 icon-512.png（从 v1 复制或生成简单 SVG）
- 注册 Service Worker 更新提示

### 7.2 复习提醒
**`src/hooks/usePwaNotification.ts`** — 全新实现
- 检查 Notification API 权限
- 每天定时检查待复习词汇数
- 如有待复习词，发送浏览器通知

### 7.3 最终打磨
- 所有组件适配 light/dark 主题
- 响应式适配（桌面端为主，横屏优先）
- 键盘快捷键覆盖所有主要操作
- Toast 提示集成到关键操作（捕获词、切换词书、导入导出等）

---

## 实施顺序

1. **Phase 2.1** — 引擎层移植（SrtParser, TranslateEngine, MockLoader, SubtitleRenderer）
2. **Phase 2.2** — 词书匹配引擎（Lemmatizer, MatcherEngine）
3. **Phase 2.3** — 播放器组件（VideoPlayer, SubtitleCanvas, VideoControls, VideoDropZone, SubtitleSourceModal）
4. **Phase 2.4-2.5** — 工具栏 + 钩子（TopToolbar, useKeyboardShortcuts, useDemoTimeline, useVideoEndDetection, useAutoCapture）
5. **Phase 3** — 词汇交互组件（DefinitionCard, FlashCard, LearningModal, ReviewPanel, DashboardPanel, ProfilePanel）
6. **Phase 4** — 统计面板 + 片段截取（StatsPanel, ClipCapture）
7. **Phase 5** — ASR 引擎接口层（桩实现，接口预留）
8. **Phase 6** — App.tsx 组装所有组件
9. **Phase 7** — PWA 打磨 + 通知 + 测试

## 验证方法

每个 Phase 完成后验证：
1. TypeScript 编译无错误：`npx tsc --noEmit`
2. 开发服务器启动正常：`npm run dev`
3. 对应功能可交互

全流程验证：
1. 开始页 → Plasma 动画 → 点击"开始使用" → 词书选择 → 选择四级 → 进入主应用
2. Demo 模式 → 字幕在 Canvas 渲染 → 双语/仅英/仅中切换 → 词书词高亮
3. 空格暂停 → 画面模糊 → 点击高亮词 → 释义卡片弹出 → 点击"加入生词本"
4. 视频播完 → 学习弹窗 → 逐词学习 → 标记掌握度
5. 工具栏角标 → 复习面板 → 卡片翻转 → 标记掌握度
6. 仪表盘 → 切换词书 → 高亮实时刷新
7. 拖入视频 → 字幕来源选择 → 上传 SRT → 解析加载
8. 个人面板 → 主题切换 → 导入导出
9. PWA → 离线可用