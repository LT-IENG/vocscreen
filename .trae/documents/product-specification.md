# 词映 VocScreen — 产品项目文档

> **版本**：v2.0.0  
> **更新时间**：2026-07-14  
> **部署地址**：https://vocscreen.vercel.app  
> **技术栈**：React 19 + TypeScript + Vite 8 + Tailwind CSS 4 + Zustand + Dexie.js + Supabase + PWA

---

## 一、产品介绍

### 1.1 产品概述

**词映 VocScreen** 是一款「看剧学英语」PWA 应用。用户通过观看英文影视剧视频，点击字幕中的生词即时查看释义、捕获到生词本，随后进入基于艾宾浩斯遗忘曲线的科学背单词流程。核心价值在于将「看剧」和「学单词」融为一体，让英语学习变得自然、无痛。

### 1.2 产品形态

- **PWA（Progressive Web App）**：可安装到桌面，支持离线使用
- **响应式设计**：同时适配电脑端（横屏看视频）和手机端（竖屏背单词）
- **云端部署**：Vercel 托管前端，Supabase 提供认证和云同步，腾讯 COS 存储视频

### 1.3 核心用户

- **英语学习者**：备考四级/六级/雅思/托福/考研的学生
- **影视爱好者**：喜欢看美剧/英剧、想顺便学英语的用户
- **碎片化学习者**：希望利用通勤等碎片时间背单词的上班族

### 1.4 灵感来源

- **「不背单词」App**：科学背单词的交互范式（三阶段认知链）
- **Language Reactor**：浏览器插件，在 Netflix/YouTube 上显示双语字幕并查词
- **痛点洞察**：现有工具要么只做「看剧查词」、要么只做「背单词」，缺少一个完整闭环

### 1.5 想解决的问题

1. **学习场景割裂**：看剧时查了单词，之后再也想不起来复习
2. **背单词枯燥**：传统背单词 App 脱离语境，记忆效率低
3. **视频字幕工具缺失**：没有一款工具能同时做到「双语字幕 + 单词识别 + 科学复习」

### 1.6 现有产品对比

| 维度 | 不背单词 | Language Reactor | 词映 VocScreen |
|------|----------|------------------|----------------|
| 看剧学单词 | ❌ | ✅ | ✅ |
| 科学复习 | ✅ | ❌ | ✅ |
| 多词书支持 | ✅ | ❌ | ✅ |
| 离线可用 | 部分 | ❌ | ✅ (PWA) |
| 视频片段回看 | ❌ | ❌ | ✅ |
| 跨设备同步 | ✅ | ❌ | ✅ |
| 开放视频源 | ❌ | 仅浏览器插件 | ✅ 支持任意视频 |

### 1.7 为什么想做这个方向

1. **市场需求**：中国有数亿英语学习者，四六级/考研英语是刚需
2. **技术可行**：Web 技术（WebCodecs、Web Audio、PWA、IndexedDB）已成熟，无需原生 App 即可实现
3. **差异化明显**：目前市场上没有一款产品能打通「看剧 → 查词 → 复习」的完整闭环
4. **个人优势**：项目作者本身是英语学习者，对痛点有深刻理解

---

## 二、产品架构

### 2.1 整体架构图

```
┌─────────────────────────────────────────────────────┐
│                    浏览器 (PWA)                        │
│  ┌───────────────────────────────────────────────┐  │
│  │              React 19 UI Layer                  │  │
│  │  StartPage / MainApp / MemorizeScreen          │  │
│  │  VideoPlayer / SubtitleCanvas / DefinitionCard │  │
│  └───────────────┬───────────────────────────────┘  │
│                  │ Zustand 状态管理                   │
│  ┌───────────────┼───────────────────────────────┐  │
│  │    Engine Layer (纯逻辑，无UI依赖)               │  │
│  │  MatcherEngine / SrtParser / DictEngine        │  │
│  │  SubtitleRenderer / TranslateEngine / AsrEngine│  │
│  │  Lemmatizer / ClipCapture / MockLoader         │  │
│  └───────────────┬───────────────────────────────┘  │
│                  │                                   │
│  ┌───────────────┼───────────────────────────────┐  │
│  │         Data Layer                              │  │
│  │  IndexedDB (Dexie.js) ─── 本地持久化             │  │
│  │  Supabase ─── 云端同步 (Auth + DB + RLS)         │  │
│  │  Tencent COS ─── 视频存储 (Range 请求)            │  │
│  └───────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────┘
```

### 2.2 数据流

```
视频加载 → 字幕解析 → 单词匹配(词书) → 高亮显示
                                            ↓
                                    点击单词 → 释义卡片
                                            ↓
                                    捕获生词 → IndexedDB
                                            ↓
                                    进入学习 → 三阶段认知链
                                            ↓
                                    完成学习 → 艾宾浩斯复习队列
                                            ↓
                            Supabase 同步 → 跨设备共享
```

### 2.3 核心模块

| 模块 | 职责 | 关键文件 |
|------|------|----------|
| **Player** | 视频播放、字幕渲染、拖拽上传 | VideoPlayer, SubtitleCanvas, VideoDropZone |
| **Vocab** | 生词捕获、词书管理、释义卡片 | DefinitionCard, DashboardPanel, useVocabStore |
| **Memorize** | 三阶段认知链、交错学习、视频回看 | MemorizeScreen, WordDetailView, VideoClipModal |
| **Review** | 艾宾浩斯复习曲线、队列管理 | useReviewStore |
| **Auth** | 邮箱验证登录、注册 | AuthModal, useAuthStore |
| **Sync** | Supabase 云同步、RLS 数据隔离 | sync.ts, useAuthStore |
| **Stats** | 学习统计、连续打卡 | StatsPanel, useVocabStore |

---

## 三、技术路线

### 3.1 技术栈

| 层级 | 技术选型 | 说明 |
|------|----------|------|
| 框架 | React 19 + TypeScript 6.0 | 函数组件 + Hooks |
| 构建 | Vite 8 | 极速 HMR，~1s 启动 |
| 样式 | Tailwind CSS 4 | 原子化 CSS，暗色主题 |
| 状态管理 | Zustand 5 | 轻量、无 boilderplate |
| 动画 | Motion (原 Framer Motion) | 流畅的页面过渡和微交互 |
| 本地存储 | Dexie.js 4 | IndexedDB 封装，离线优先 |
| 认证 | Supabase Auth | 邮箱验证码登录 |
| 云数据库 | Supabase PostgreSQL | RLS 行级安全 |
| 视频存储 | 腾讯 COS | Range 请求，按需加载 |
| PWA | vite-plugin-pwa | Workbox，可安装 |
| 字体 | Geist (Google Fonts) | 现代无衬线字体 |
| 图标 | Phosphor Icons | 统一图标风格 |

### 3.2 核心依赖

```
@phosphor-icons/react  —  图标库
@supabase/supabase-js  —  云端认证+数据库
compromise             —  英文 NLP 词形还原
dexie                  —  IndexedDB 封装
motion                 —  动画库
ogl                    —  WebGL (StartPage 背景)
```

### 3.3 构建优化

- **manualChunks**：motion、icons、db、nlp 独立分包，减少主 chunk 体积
- **PWA 预缓存**：precache 42 个条目 (8.4 MB)，词书 JSON 按需缓存
- **视频 Range 请求**：COS 端配置 CORS，前端 `<video>` 分段加载，无需下载完整文件

---

## 四、功能介绍

### 4.1 视频播放与字幕

- **视频加载**：支持本地文件拖拽、COS URL 加载、演示视频一键体验
- **双语字幕**：中英双语同步显示，2px 间距，middle baseline 对齐
- **单词高亮**：基于词书自动匹配，词书匹配的单词高亮显示
- **点击查词**：暂停后点击字幕中的单词，弹出释义卡片
- **字幕来源**：支持上传 SRT 文件、云端 ASR（Whisper API）、本地 ASR（Whisper WASM，预留）

### 4.2 生词捕获

- **即时捕获**：释义卡片中一键捕获到生词本
- **多词书支持**：四级 / 六级 / 雅思 / 托福 / 考研（新东方词书，内容更丰富）
- **词书自动匹配**：lemmetizer 词形还原 + 压缩字典，支持变体词匹配
- **视频片段关联**：捕获时自动记录视频片段起止时间，支持「看原片段」回看

### 4.3 词汇学习（Learn Mode）

**三阶段认知链（交错学习）**：

```
阶段1 选义 (Choice)  →  阶段2 例句 (Context)  →  阶段3 裸词 (Bare)
     ↓                       ↓                       ↓
  四选一              看例句判断认识/不认识      只有单词，判断认识/不认识
     ↓                       ↓                       ↓
  认识 → 下一阶段      认识 → 下一阶段          认识 → 完成
  不认识 → 重试        不认识 → 详情页           不认识 → 详情页
```

**交错学习（Interleaved Learning）**：
- 不同单词交替通过各阶段，避免单单词连续学习导致的短时记忆虚假掌握
- queue[0] 模型，每次只处理队首单词，完成后移出队列

**详情页（WordDetailView）**：
- 释义（senses）、音标、词书例句、视频原句（原声按钮）
- 记忆方法（mnemonic）、短语（phrases）、同近义词（synonyms）
- 同根词（relatedWords）、真题例句（examSentences，可折叠）
- 滚动内容区（max-h-72vh），固定「继续」按钮

**视频回看**：
- 点击「原声」按钮弹出 VideoClipModal，播放该单词出现的视频片段
- 片段下方显示视频原句（英文），确保文字与音频一致

### 4.4 复习系统（Review Mode）

- **艾宾浩斯曲线**：1 → 2 → 4 → 7 → 15 → 30 天
- **活跃队列**：按到期时间自动排序，每天显示待复习单词
- **掌握判定**：连续 6 次「认识」标记为已掌握
- **失败回退**：答错重置到 1 天间隔

### 4.5 用户系统

- **邮箱验证注册/登录**：Supabase Auth，发送验证码到邮箱
- **游客模式**：跳过登录，数据存本地 IndexedDB
- **云同步**：登录后自动迁移本地数据到 Supabase，跨设备共享
- **RLS 数据隔离**：用户只能访问自己的数据

### 4.6 统计数据

- 累计学习单词数、复习次数、视频观看数
- 连续打卡天数
- 屏幕底部快捷键提示

---

## 五、项目结构

```
vocscreen_v2/
├── public/
│   ├── mock/
│   │   └── friends-s01e01/          # 演示视频字幕
│   │       ├── metadata.json        # 元数据（标题、时长）
│   │       └── subtitles.json       # 字幕数据（349条双语）
│   ├── wordbooks/                   # 新东方词书 JSON
│   │   ├── cet4.json               # 四级（2607词）
│   │   ├── cet6.json               # 六级（2345词）
│   │   ├── ielts.json              # 雅思（3575词）
│   │   ├── toefl.json              # 托福（4264词）
│   │   └── kaoyan.json             # 考研
│   ├── icon-192.png
│   └── icon-512.png
├── scripts/
│   ├── convert_xdf_wordbooks.py     # 新东方词书转换脚本
│   ├── inspect_xdf_entry.py
│   ├── verify_full_entry.py
│   └── verify_wordbooks.py
├── src/
│   ├── components/
│   │   ├── auth/AuthModal.tsx       # 登录/注册弹窗
│   │   ├── landing/                  # 启动页
│   │   │   ├── StartPage.tsx        # 首页（Plasma 背景）
│   │   │   ├── WordBookSelect.tsx   # 词书选择
│   │   │   ├── Plasma.tsx           # WebGL 背景动画
│   │   │   └── Plasma.css
│   │   ├── memorize/                 # 学习屏幕
│   │   │   ├── MemorizeScreen.tsx   # 核心学习逻辑
│   │   │   ├── VideoClipModal.tsx   # 视频片段弹窗
│   │   │   └── stages/              # 学习阶段组件
│   │   │       ├── ChoiceStage.tsx  # 阶段1：选义
│   │   │       ├── ContextStage.tsx # 阶段2：例句判断
│   │   │       ├── BareStage.tsx    # 阶段3：裸词判断
│   │   │       ├── WordDetailView.tsx  # 单词详情页
│   │   │       ├── LearnCompleteView.tsx  # 学习完成
│   │   │       └── ReviewFailView.tsx    # 复习失败
│   │   ├── player/                   # 视频播放器
│   │   │   ├── VideoPlayer.tsx      # 视频容器
│   │   │   ├── VideoDropZone.tsx    # 拖拽上传区域
│   │   │   ├── VideoControls.tsx    # 播放控制栏
│   │   │   ├── SubtitleCanvas.tsx   # 字幕 Canvas 渲染
│   │   │   ├── SubtitleSourceModal.tsx  # 字幕来源选择
│   │   │   └── WordTooltip.tsx      # 单词悬浮提示
│   │   ├── stats/StatsPanel.tsx     # 统计面板
│   │   ├── toolbar/TopToolbar.tsx   # 顶部工具栏
│   │   ├── ui/                       # UI 基础组件
│   │   │   ├── Drawer.tsx
│   │   │   ├── Modal.tsx
│   │   │   ├── ProgressBar.tsx
│   │   │   └── Toast.tsx
│   │   ├── vocab/                    # 词汇组件
│   │   │   ├── DefinitionCard.tsx   # 释义卡片
│   │   │   ├── DashboardPanel.tsx   # 背单词面板
│   │   │   └── ProfilePanel.tsx     # 个人设置
│   │   └── ErrorBoundary.tsx        # 错误边界
│   ├── db/
│   │   └── database.ts             # Dexie 数据库定义 (9张表)
│   ├── engines/                     # 引擎层 (纯逻辑)
│   │   ├── asr/                     # ASR 引擎
│   │   │   ├── AsrEngine.ts        # 统一入口
│   │   │   ├── AudioExtractor.ts   # 音频提取
│   │   │   ├── CloudAsr.ts         # 云端 ASR
│   │   │   └── WhisperLocal.ts     # 本地 Whisper
│   │   ├── capture/ClipCapture.ts  # 视频片段捕获
│   │   ├── dict/DictEngine.ts      # 词典 API 查询
│   │   ├── matching/               # 单词匹配
│   │   │   ├── MatcherEngine.ts    # 词书匹配
│   │   │   └── Lemmatizer.ts       # 词形还原
│   │   └── subtitle/               # 字幕处理
│   │       ├── SrtParser.ts        # SRT 解析
│   │       ├── SubtitleRenderer.ts # Canvas 渲染引擎
│   │       ├── TranslateEngine.ts  # 翻译引擎
│   │       └── MockLoader.ts       # 演示字幕加载
│   ├── hooks/                       # 自定义 Hooks
│   │   ├── useDemoTimeline.ts      # 演示模式时间线
│   │   ├── useKeyboardShortcuts.ts # 键盘快捷键
│   │   └── useVideoEndDetection.ts # 视频结束检测
│   ├── lib/
│   │   ├── asrSettings.ts          # ASR 配置持久化
│   │   ├── distractors.ts          # 干扰项生成
│   │   ├── supabase.ts             # Supabase 客户端
│   │   └── sync.ts                 # 云同步逻辑
│   ├── stores/                      # Zustand 状态管理
│   │   ├── useAuthStore.ts         # 认证状态
│   │   ├── usePlayerStore.ts       # 播放器状态
│   │   ├── useReviewStore.ts       # 复习计划
│   │   ├── useSubtitleStore.ts     # 字幕状态
│   │   ├── useUIStore.ts           # UI 交互状态
│   │   └── useVocabStore.ts        # 词汇与词书
│   ├── types/                       # TypeScript 类型
│   │   ├── index.ts
│   │   ├── video.ts
│   │   ├── subtitle.ts
│   │   ├── vocabulary.ts
│   │   ├── review.ts
│   │   └── engine.ts
│   ├── App.tsx                     # 应用根组件
│   ├── main.tsx                    # 入口文件
│   └── index.css                   # 全局样式
├── .trae/documents/
│   ├── supabase-schema.sql         # Supabase 数据库 schema
│   └── product-specification.md    # 本文档
├── .env.local                       # 环境变量 (不提交)
├── vite.config.ts                   # Vite 配置 + PWA
├── tsconfig.json
├── package.json
└── index.html
```

---

## 六、数据库设计

### 6.1 IndexedDB (Dexie.js)

| 表名 | 用途 | 索引 |
|------|------|------|
| videos | 视频元数据 | id, createdAt |
| subtitleSegments | 字幕段落 | id, videoId, startTime |
| wordEntries | 词书词条缓存 | id, spelling, lemma, level |
| capturedWords | 用户捕获的生词 | id, wordEntryId, spelling, status |
| reviewSchedules | 艾宾浩斯复习计划 | id, capturedWordId, nextReviewAt, status |
| userStats | 用户统计数据 | id |
| clips | 视频片段 Blob | id, capturedWordId |
| notebooks | 生词本 | id, createdAt |
| dailyLearnRecords | 每日学习记录 | id, date, wordId, completedAt |

### 6.2 Supabase (PostgreSQL)

| 表名 | 用途 | RLS 策略 |
|------|------|----------|
| profiles | 用户资料 | 用户只能读写自己的 |
| notebooks | 生词本 | 用户只能读写自己的 |
| captured_words | 捕获的单词 | 用户只能读写自己的 |
| review_schedules | 复习计划 | 用户只能读写自己的 |

---

## 七、开发规范

### 7.1 代码规范

- **TypeScript 严格模式**：所有类型明确，禁止 `any`（特殊情况除外）
- **组件拆分**：单文件不超过 300 行，复杂逻辑拆分到 Hook 或 Engine
- **命名约定**：
  - 组件：PascalCase (`VideoPlayer.tsx`)
  - Hook：camelCase + `use` 前缀 (`useKeyboardShortcuts.ts`)
  - Store：camelCase + `use` 前缀 (`usePlayerStore.ts`)
  - Engine：PascalCase (`MatcherEngine.ts`)
  - 类型：PascalCase (`WordBook`, `CapturedWord`)
- **注释语言**：中文注释，面向中文开发者

### 7.2 架构约束

- **Engine 层纯函数**：不依赖 React 或 Zustand，可独立测试
- **Store 层纯逻辑**：不包含 JSX，只管理状态和触发副作用
- **Component 层纯视图**：通过 hooks 读取 store，不直接操作 IndexedDB
- **数据流单向**：Component → Store → Engine → IndexedDB/Supabase

### 7.3 Git 规范

- **分支策略**：`main` 主分支，功能开发直接在 main 上提交
- **提交信息**：中文，格式 `类型: 描述`
  - `feat:` 新功能
  - `fix:` 修复 Bug
  - `update:` 更新/优化
  - `refactor:` 重构

### 7.4 测试策略

- 开发阶段通过浏览器手动测试
- 构建前 `tsc -b` 类型检查通过
- 部署前 `npm run build` 构建成功

---

## 八、部署方案

### 8.1 部署架构

```
Vercel (前端托管)
  └── vocscreen.vercel.app
        ├── 静态文件 (HTML/CSS/JS)
        ├── PWA Service Worker
        └── 词书 JSON (public/wordbooks/)

Supabase (后端服务)
  ├── Auth (邮箱验证)
  ├── Database (PostgreSQL)
  └── RLS (行级安全)

腾讯 COS (视频存储)
  └── tencent-1414173792.cos.ap-guangzhou.myqcloud.com
        └── S01E01_compress2.mp4 (294 MB)
```

### 8.2 部署步骤

1. **Supabase**：执行 `supabase-schema.sql`，开启邮箱验证
2. **Vercel**：导入 GitHub 仓库，配置环境变量，自动部署
3. **腾讯 COS**：配置 CORS、存储桶权限、上传视频
4. **验证**：确保视频 Range 请求、字幕加载、Supabase 认证正常

### 8.3 环境变量

| 变量 | 值 | 说明 |
|------|------|------|
| VITE_SUPABASE_URL | https://vkgysxgqtjxmepglefpc.supabase.co | Supabase 项目 URL |
| VITE_SUPABASE_ANON_KEY | (从 Supabase Dashboard 获取) | 匿名访问密钥 |

---

## 九、产品需求

### 9.1 已实现功能

- [x] 视频播放（本地文件 + COS URL + 演示视频）
- [x] 双语字幕渲染（Canvas，中英双行）
- [x] 词书单词高亮匹配（lemmetizer + 变体支持）
- [x] 点击单词查看释义（词书 + API 兜底）
- [x] 生词捕获（关联视频片段）
- [x] 三阶段认知链（选择 → 例句 → 裸词）
- [x] 交错学习（不同单词交替）
- [x] 单词详情页（释义、例句、记忆法、短语、同近义、同根词、真题例句）
- [x] 视频片段回看（原声按钮）
- [x] 艾宾浩斯复习系统
- [x] 邮箱验证注册/登录
- [x] 游客模式
- [x] 云同步（Supabase RLS）
- [x] 本地数据清空（安全清除 + 刷新）
- [x] 学习统计面板
- [x] PWA 安装（离线可用）
- [x] 响应式设计（电脑 + 手机）
- [x] 演示视频（Friends S01E01，349 条双语字幕）
- [x] SRT 字幕上传解析
- [x] 云端 ASR（OpenAI Whisper API 兼容）
- [x] 键盘快捷键（Space 暂停/播放，←→ 进退，R 背单词，S 统计）
- [x] 暗色主题

### 9.2 待实现功能

- [ ] 本地 Whisper WASM ASR（预留接口，模型较大）
- [ ] 本地 NLLB WASM 翻译（预留接口）
- [ ] 更多预设视频（多剧集支持）
- [ ] 学习提醒推送
- [ ] 单词拼写练习
- [ ] 词汇量测试
- [ ] 社区/排行榜

---

## 十、已知问题与注意事项

### 10.1 技术注意事项

1. **视频 Range 请求**：依赖 COS 配置 CORS 和 `Accept-Ranges` 头，否则视频无法分段加载
2. **PWA 缓存**：Service Worker 不缓存视频文件（避免 Range 请求被拦截），词书 JSON 按需 `StaleWhileRevalidate`
3. **IndexedDB 清空**：不能直接 `db.close()` 后清空，否则 React 组件读取已关闭 db 会触发渲染循环（React error #185）。采用「标记 → 刷新 → 启动时清理」模式
4. **词书数据**：使用新东方 JSONL 数据，不是原始 CET4/6 数据，质量更高
5. **combinedDict 加载顺序**：`first-loaded-wins` 策略，先加载的词书优先，后加载的相同词条会被忽略

### 10.2 开发注意事项

1. **视频原句 ≠ 词书例句**：`videoSentence` 和 `exampleSentence` 是独立字段，不可混淆
2. **原声按钮**：是产品核心差异化功能，不可删除
3. **缩约词处理**：`didn't` 保留撇号，查词典时展开为 `did`
4. **释义清洗**：通过 `cleanDef` 和 `stripEnglish` 去除非中文内容
5. **干扰项生成**：从同一词性的词书中选择，确保挑战性

---

## 十一、团队与分工

（竞赛项目，单人开发）

---

## 十二、版本历史

| 版本 | 日期 | 主要变更 |
|------|------|----------|
| v1.0 | 2025 | 初版，UI 完整但核心功能缺失 |
| v2.0 | 2026-07 | 重写：三阶段学习、艾宾浩斯复习、Supabase 同步、新东方词书、PWA 部署 |

---

## 附录

### A. 快捷键

| 按键 | 功能 |
|------|------|
| Space | 暂停/播放 |
| ← → | 快退/快进 5 秒 |
| R | 打开背单词面板 |
| S | 打开统计面板 |
| Esc | 关闭当前面板/弹窗 |

### B. 词书数据来源

- 新东方（XDF）词书，通过 `convert_xdf_wordbooks.py` 转换
- 词条字段：spelling, lemma, phonetics, definition, level, frequency, exampleSentence, phrases, relatedWords, synonyms, mnemonic, examSentences
- 词书规模：四级 2607 词 / 六级 2345 词 / 雅思 3575 词 / 托福 4264 词

### C. 演示视频

- 来源：Friends S01E01
- 字幕：349 条双语字幕（中英对照）
- 存储：腾讯 COS（`tencent-1414173792.cos.ap-guangzhou.myqcloud.com/S01E01_compress2.mp4`）
- 大小：约 294 MB

### D. 相关链接

- 部署地址：https://vocscreen.vercel.app
- GitHub：https://github.com/LT-IENG/vocscreen
- Supabase：https://vkgysxgqtjxmepglefpc.supabase.co
- 腾讯 COS：https://console.cloud.tencent.com/cos/bucket?bucket=tencent-1414173792