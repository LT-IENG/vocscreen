# 【学习工作赛道】词映 VocScreen：看剧学英语，不知不觉的那种

---

**【标签】** 学习工作

**【标题】** 【学习工作赛道】词映 VocScreen：看剧学英语，不知不觉的那种

---

## 0. 先和大家打个招呼吧 👋

**你是谁：** 一个总在 abandon 附近就放弃的英语学习者，也是一名独立开发者。

**你是怎么用 TRAE 把 Demo 做出来的：**

说真话，这个项目如果没有 TRAE，大概率只会停留在我的笔记本草稿里。我不是科班前端，React 和 TypeScript 对我来说有门槛。但 TRAE 让我能用中文把脑子里的想法一句句讲出来，它帮我翻译成代码。

最直观的感受是：我描述「三阶段认知链——选义、例句、裸词」这种学习逻辑，TRAE 能直接理解并生成对应的组件代码和状态管理。我不用纠结 Hook 怎么写、Zustand store 怎么组织，我只需要说清楚「用户操作流程」和「数据怎么流转」。

跨过的最大的坎：**视频字幕与词书的深度联动**。我需要把字幕中的单词和四六级/雅思/托福词书做词形还原匹配，还要在 Canvas 上精准高亮。这个涉及 NLP 词形还原、Canvas 坐标映射、状态同步，原本以为搞不定，最终通过和 TRAE 一步步拆解，把 MatcherEngine、SubtitleRenderer、Lemmatizer 拆成独立引擎模块，逐个实现再组装。

踩过的坑也不少：React 渲染时序导致字幕加载失败、IndexedDB 清空触发渲染循环（React error #185）、COS 视频的 CORS 和 Range 请求配置、Supabase 注册 trigger 因缺少 user_metadata 返回 500……每一个都是 TRAE 帮我定位并修复的。整个过程像 pair programming，我负责想清楚要什么，TRAE 负责实现和排查。

---

## 1. Demo 简介

**是什么：** 一个 Web 应用——浏览器打开链接即用，无需下载安装。未来可安装到桌面和手机主屏（PWA），甚至和影视 APP 深度联动，变成看剧时自动学习的隐形外挂。

**面向谁：** 核心用户是中国每年 2500-3000 万英语考试备考群体（四六级、考研、雅思、托福），次要用户包括职场英语提升者和美剧爱好者。

**主要功能：**

### 功能一：看剧 + 双语字幕 + 单词高亮

用户上传任意电视剧视频，或选择预设视频。字幕支持三种来源：用户自己上传 SRT 字幕、云端 ASR API 自动生成、本地 Whisper WASM 模型离线识别（无需联网，隐私保护）。中英双语字幕可自由切换显示模式，基于词书（新东方四级 2607 词 / 六级 2345 词 / 雅思 3575 词 / 托福 4264 词）做词形还原匹配，词书中的单词以淡金色虚线高亮。暂停后点击任意单词即时弹出释义卡片，一键捕获到生词本，同时自动记录该单词出现的视频片段时间戳。

> 📸 截图位置：主界面 - 视频播放 + 字幕高亮 + 释义卡片

### 功能二：三阶段认知链 + 交错学习 + 视频片段回看 + 艾宾浩斯复习

捕获的生词进入深度学习流程，采用三阶段认知链：
- **阶段1 选义**：四选一，从同词性干扰项中选择正确释义
- **阶段2 例句**：看例句判断认识/不认识，优先使用视频原句
- **阶段3 裸词**：只有单词本身，判断是否认识

不同单词**交替通过**各阶段（交错学习），避免单单词连续学习导致的短时记忆虚假掌握。每个阶段完成后进入详情页，展示词书全部内容：释义、音标、记忆方法、短语、同近义词、同根词、真题例句。

学习和复习时点击「原声」按钮，直接跳转到该单词出现的视频片段，画面+声音作为记忆锚点——这是核心差异化功能，让「看过的场景」变成「记住的锚点」。复习按艾宾浩斯遗忘曲线（1→2→4→7→15→30 天）自动安排，连续 6 次「认识」标记为已掌握。

> 📸 截图位置：学习界面 - 三阶段认知链 + 单词详情页 + 视频片段弹窗

### 功能三：多端同时使用，随时随地背单词

电脑端看剧学单词，手机端躺着背单词、走着背单词。同一账号数据自动同步（Supabase 云端），生词本和复习计划跨设备实时一致。PWA 支持安装到手机主屏，像原生 App 一样使用，无需应用商店下载。

> 📸 截图位置：手机端背单词界面 + 电脑端看剧界面

---

## 2. Demo 创作思路

**灵感来源：**

作为英语学习者，我用过「不背单词」「墨墨背单词」等 App，也用过 Language Reactor 这个 Chrome 插件。但发现一个割裂：背单词 App 脱离语境，记忆效率低；看剧查词工具没有复习体系，查完就忘。没有任何一款产品能打通「看剧 → 查词 → 复习」的完整闭环。

**想解决的问题：**

1. **学习场景割裂**：看剧时查了单词，之后再也想不起来复习
2. **背单词枯燥**：传统 App 脱离语境，「abandon 放弃」式的孤岛记忆
3. **视频字幕工具缺失**：Chrome 插件只能寄生在 Netflix/YouTube，没有词书体系，没有本地 ASR
4. **「知道能学，但学不起来」**：看剧时暂停查词太麻烦，用户行为数据证明几乎没人会主动暂停

**为什么做这个方向：**

- **市场需求刚性**：中国每年 2500-3000 万英语考试备考群体，四六级/考研是刚需
- **技术成熟**：Web 技术已足够强大（PWA、IndexedDB、Canvas、Web Audio），无需原生 App
- **差异化明显**：市场空白——没有产品把「视频场景」作为记忆锚点，串联查词和复习
- **个人优势**：我自己就是用户，对痛点有深刻理解

**与现有产品的对比：**

| 维度 | 不背单词 | Language Reactor | 词映 VocScreen |
|------|----------|------------------|----------------|
| 看剧学单词 | ❌ | ✅（仅 Netflix/YT） | ✅（任意视频） |
| 科学复习 | ✅ | ❌ | ✅（艾宾浩斯） |
| 多词书支持 | ✅ | ❌ | ✅（新东方四六级/雅思/托福） |
| 视频片段回看 | ❌ | ❌ | ✅（核心差异化） |
| 离线可用 | 部分 | ❌ | ✅（PWA） |
| 跨设备同步 | ✅ | ❌ | ✅（Supabase） |
| 本地 ASR | ❌ | ❌ | ✅（预留 Whisper WASM） |

---

## 3. Demo 体验地址

**在线体验链接：** https://vocscreen.vercel.app

**体验指引：**
1. 打开链接，点击「进入应用」选择词书（推荐六级）
2. 点击「加载演示视频」（Friends S01E01，自动加载视频+字幕）
3. 视频播放后，字幕中匹配词书的单词会高亮显示
4. 按 Space 暂停，点击任意单词查看释义，点击「捕获」加入生词本
5. 返回首页，点击「背单词」进入学习流程（三阶段认知链）
6. 学习时点击「原声」按钮可跳转到视频原片段

**支持手机端：** 同一链接在手机浏览器打开，登录同一账号即可同步生词和复习计划，可安装到主屏作为 PWA 使用。

---

## 4. TRAE 实践过程

### 开发流程概览

整个项目从零到部署上线，全程使用 TRAE IDE 完成。主要流程：

1. **需求拆解**：用中文描述产品逻辑，TRAE 拆解为引擎层、组件层、状态层
2. **架构设计**：TRAE 建议分层架构（Engine / Store / Component），我确认后开始实现
3. **逐模块开发**：从核心引擎（SrtParser、MatcherEngine、SubtitleRenderer）到 UI 组件，逐个实现
4. **数据层**：Dexie.js 封装 IndexedDB，Supabase 云同步
5. **调试修复**：多个复杂 bug（渲染时序、IndexedDB 清空、CORS、Supabase trigger）通过 TRAE 排查
6. **部署上线**：Vercel + Supabase + 腾讯 COS，TRAE 协助配置和验证

### 开发关键步骤截图

> 📸 截图1：TRAE 中进行架构设计——引擎层拆分（SubtitleRenderer、MatcherEngine、Lemmatizer 等独立模块）
>
> 📸 截图2：TRAE 中实现三阶段认知链——ChoiceStage / ContextStage / BareStage 组件开发
>
> 📸 截图3：TRAE 中调试视频字幕加载问题——排查 React Strict Mode 双挂载导致的 ERR_ABORTED
>
> 📸 截图4：TRAE 中配置 PWA + Vercel 部署——vite-plugin-pwa 配置和 vercel.json 缓存策略
>
> 📸 截图5：TRAE 中修复 Supabase 注册 500 错误——定位到 trigger 缺少 user_metadata

### 关键任务对话 Session ID

> **Session ID 1：** （请在此处填入架构设计阶段的 Session ID）
>
> **Session ID 2：** （请在此处填入三阶段认知链开发阶段的 Session ID）
>
> **Session ID 3：** （请在此处填入部署调试阶段的 Session ID）

> ⚠️ **说明：** 请在 TRAE 中双击对应对话复制 Session ID，替换上方占位符。至少需要 3 个。

---

## 5. 对应的报名审核通过的帖子链接

> （请在此处填入报名帖链接）

---

## 附：技术架构

### 技术栈

| 层级 | 技术 | 说明 |
|------|------|------|
| 前端框架 | React 19 + TypeScript | 函数组件 + Hooks |
| 构建工具 | Vite 8 | 极速 HMR |
| 样式 | Tailwind CSS 4 | 原子化 CSS，暗色主题 |
| 状态管理 | Zustand 5 | 轻量，6 个独立 store |
| 动画 | Motion (Framer Motion) | 页面过渡和微交互 |
| 本地存储 | Dexie.js 4 (IndexedDB) | 离线优先，9 张表 |
| 云端认证 | Supabase Auth | 邮箱验证登录 |
| 云数据库 | Supabase PostgreSQL | RLS 行级安全，数据隔离 |
| 视频存储 | 腾讯 COS | Range 请求，分段加载 |
| PWA | vite-plugin-pwa | Workbox，可安装，离线可用 |

### 项目结构

```
src/
├── components/        # UI 组件层
│   ├── auth/          # 登录注册
│   ├── landing/       # 启动页（WebGL Plasma 背景）
│   ├── memorize/      # 学习屏幕（三阶段认知链）
│   │   └── stages/    # ChoiceStage / ContextStage / BareStage / WordDetailView
│   ├── player/        # 视频播放器（Canvas 字幕渲染）
│   ├── vocab/         # 词汇组件
│   └── ui/            # 基础 UI 组件
├── engines/           # 引擎层（纯逻辑，无 UI 依赖）
│   ├── asr/           # ASR 引擎（本地 Whisper + 云端 API）
│   ├── capture/       # 视频片段捕获
│   ├── dict/          # 词典 API
│   ├── matching/      # 单词匹配（词形还原 + 词书匹配）
│   └── subtitle/      # 字幕处理（SRT 解析 + Canvas 渲染 + 翻译）
├── stores/            # Zustand 状态管理（6 个 store）
├── db/                # Dexie.js 数据库（9 张表）
├── lib/               # 工具库（Supabase 客户端、云同步）
└── types/             # TypeScript 类型定义
```

### 核心数据流

```
视频加载 → 字幕解析 → 单词匹配(词书) → 高亮显示
                                        ↓
                                点击单词 → 释义卡片
                                        ↓
                                捕获生词 → IndexedDB → Supabase 同步
                                        ↓
                                三阶段认知链（交错学习）
                                        ↓
                                视频片段回看（原声按钮）
                                        ↓
                                艾宾浩斯复习队列
```

---

## 附：踩坑复盘

### 坑1：React 渲染时序导致字幕加载失败

**现象：** 点击「加载演示视频」，视频加载了但字幕没加载。

**根因：** `handleLoadDemo` 中先调用 `loadVideoUrl`（设置 `hasVideo: true`）→ React 重渲染 → `VideoDropZone` 组件卸载 → 后续 `await loadMockSubtitles` 虽然执行了，但 Zustand store 更新与 React 渲染时序产生竞态。

**修复：** 把字幕加载移到视频加载之前，确保字幕数据先写入 store。

### 坑2：IndexedDB 清空触发 React error #185

**现象：** 点击「清空本地数据」后页面黑屏，报 React error #185（渲染过程中调用 setState）。

**根因：** 逐表 `await db.xxx.clear()` 会触发 Dexie 的变化通知，在 `await` 期间 React 重渲染并读取已清空的 db，导致状态不一致和无限循环。

**修复：** 改为「标记 → 刷新页面 → 启动时删除整个数据库」模式，避免在 React 运行时操作 db。

### 坑3：视频 ERR_ABORTED（React Strict Mode）

**现象：** 演示视频加载报 `net::ERR_ABORTED`。

**根因：** React Strict Mode 开发模式下双挂载组件，第一次 video 请求被卸载中止，`onError` 触发后调用 `video.load()` 反而中止了第二次成功加载。

**修复：** `onError` 中不调用 `video.load()`，改为 3 秒后检查 `readyState`，避免 Strict Mode 误报。

### 坑4：Supabase 注册 500 错误

**现象：** 注册时返回 500 Internal Server Error。

**根因：** 数据库 trigger `handle_new_user` 从 `raw_user_meta_data->>'username'` 取用户名，但 `signUp` 没传 `data: { username }`，导致 NULL 插入 NOT NULL 字段失败。

**修复：** 在 `signUp` 的 options 中添加 `data: { username: email.split('@')[0] }`。

### 坑5：COS 视频 Content-Disposition: attachment

**现象：** 视频加载后浏览器提示下载而非播放。

**根因：** 腾讯 COS 存储桶默认设置 `Content-Disposition: attachment` 和 `x-cos-force-download: true`。

**修复：** 在对象自定义 Headers 中设置 `Content-Disposition: inline`。
