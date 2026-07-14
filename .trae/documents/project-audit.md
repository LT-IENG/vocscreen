# 词映 VocScreen v2 — 项目全面审查报告

> 审查时间：2026-07-13
> 审查范围：全部 src/ 代码 + 配置 + 功能完整性 + UI/UX

---

## 一、项目整体进度

### 已完成功能 ✅

| 模块 | 状态 | 说明 |
|------|------|------|
| 视频播放器 | ✅ 完整 | 支持本地文件 + COS 远程 URL + Demo 模式 |
| Canvas 字幕渲染 | ✅ 完整 | SubtitleRenderer + hitMap 点击检测 + 中英双语 + 字号切换 |
| SRT 字幕解析 | ✅ 完整 | 支持中英双语 SRT、GBK 编码自动检测 |
| 词典查询 | ✅ 完整 | 词书本地查询 + dictionaryapi.dev 在线查询 + 缩略词展开 |
| 词书系统 | ✅ 完整 | CET4/CET6/IELTS/TOEFL 四本词书 + 自动高亮匹配 |
| 生词本管理 | ✅ 完整 | 多生词本 + 默认本 + 移动/重命名/删除 + 导出 JSON |
| 背单词界面 | ✅ 完整 | MemorizeScreen（Learn/Review 双入口 + 卡片翻转 + 艾宾浩斯曲线） |
| 艾宾浩斯复习 | ✅ 完整 | 1→2→4→7→15→30 天间隔 + known/fuzzy/unknown 评分 + 到期词队列 |
| 邮箱验证登录 | ✅ 完整 | Supabase Auth + 邮箱验证 + 重发邮件 + 游客模式 |
| 数据同步 | ⚠️ 部分 | 全量同步已完成，增量同步未接入（见下方 Bug #5） |
| 二维码扫码 | ✅ 完整 | MemorizeScreen 二维码按钮 + ?screen=memorize URL 参数检测 |
| PWA 配置 | ✅ 完整 | vite-plugin-pwa + 图标 + manifest + 离线缓存 |
| 主题切换 | ✅ 完整 | 暗色/浅色主题 + 全组件覆盖 |
| 统计面板 | ✅ 完整 | StatsPanel + 饼图 + 进度条（但入口缺失，见 Bug #3） |

### 未完成功能 ❌

| 模块 | 状态 | 说明 |
|------|------|------|
| 本地 Whisper ASR | ❌ Stub | `WhisperLocal.ts` 仅 throw error |
| 云端 ASR | ❌ Stub | `CloudAsr.ts` 仅 throw error |
| 音频提取 (FFmpeg WASM) | ❌ Stub | `AudioExtractor.ts` 仅 throw error |
| NLLB 本地翻译 | ❌ 未实现 | 当前仅用 MyMemory 免费 API |
| 视频片段截取 | ❌ 未接入 | `ClipCapture.ts` 引擎存在但无 UI 调用 |
| 增量数据同步 | ❌ 未接入 | sync.ts 中 syncCapturedWord 等函数未被调用（见 Bug #5） |

---

## 二、Bug 清单（按严重程度排序）

### 🔴 严重 Bug（必须修复）

#### Bug #1: `usePlayerStore.reset()` 对远程 URL 调用 revokeObjectURL

- **文件**：[src/stores/usePlayerStore.ts](file:///e:/ltprogram/P006_TRAE_AI26/vocscreen_v2/src/stores/usePlayerStore.ts) L98-99
- **问题**：`reset()` 函数对所有 `videoBlobUrl` 调用 `URL.revokeObjectURL`，包括远程 COS URL（`https://...`）。虽然浏览器会静默忽略非 `blob:` URL，但这是不规范的行为。
- **对比**：`loadVideoUrl` (L70-75) 已正确处理（只 revoke `blob:` 开头的），但 `reset` 遗漏了。
- **修复**：
```typescript
reset: () => {
  const oldUrl = get().videoBlobUrl
  if (oldUrl && oldUrl.startsWith('blob:')) {
    URL.revokeObjectURL(oldUrl)
  }
  set({ /* ... */ })
}
```

#### Bug #2: `useAutoCapture` 和 `usePwaNotification` 定义但从未使用

- **文件**：[src/hooks/useAutoCapture.ts](file:///e:/ltprogram/P006_TRAE_AI26/vocscreen_v2/src/hooks/useAutoCapture.ts)、[src/hooks/usePwaNotification.ts](file:///e:/ltprogram/P006_TRAE_AI26/vocscreen_v2/src/hooks/usePwaNotification.ts)
- **问题**：两个 hook 定义完整但从未在任何组件中调用：
  - `useAutoCapture`：暂停后点击单词自动加入生词本（省去手动点"加入生词本"按钮）
  - `usePwaNotification`：每 4 小时检查到期复习词并发送 PWA 通知
- **决策需要**：是集成使用还是删除？建议集成 `useAutoCapture`（提升体验），`usePwaNotification` 可选（可能打扰用户）。

#### Bug #3: StatsPanel 和 ReviewPanel 没有按钮入口

- **文件**：[src/components/toolbar/TopToolbar.tsx](file:///e:/ltprogram/P006_TRAE_AI26/vocscreen_v2/src/components/toolbar/TopToolbar.tsx)
- **问题**：TopToolbar 只有"仪表盘"和"我的"两个面板按钮。StatsPanel 和 ReviewPanel 只能通过键盘快捷键（R 键和 S 键）打开。
- **影响**：移动端没有键盘，完全无法访问统计面板和复习面板。
- **修复**：在 TopToolbar 中添加"统计"和"复习"按钮（复习按钮已有 dueCount 徽章逻辑可复用）。

#### Bug #4: COOP/COEP 头部配置导致本地开发跨域资源加载失败

- **文件**：[vite.config.ts](file:///e:/ltprogram/P006_TRAE_AI26/vocscreen_v2/vite.config.ts) L42-47
- **问题**：`Cross-Origin-Embedder-Policy: require-corp` 配置导致本地 dev server 加载跨域资源时要求对方返回 `Cross-Origin-Resource-Policy` 头。这会影响：
  - COS 视频（除非 COS 配置了 CORP 头）
  - 二维码图片 `api.qrserver.com`（不返回 CORP 头）
  - 词典 API 的 fetch（fetch 不受 COEP 影响，但 `<img>` 标签会受影响）
- **注意**：此配置只在 `server` 中，不影响生产环境。但本地开发时会导致二维码图片加载失败。
- **背景**：这个配置是为 FFmpeg WASM 的 SharedArrayBuffer 准备的，但 ASR 引擎目前是 stub，暂时不需要。
- **修复方案**：暂时移除 COOP/COEP 头部，等集成 FFmpeg WASM 时再加（届时需要在 Vercel 也配置相应头部）。

#### Bug #5: 增量数据同步未接入

- **文件**：[src/lib/sync.ts](file:///e:/ltprogram/P006_TRAE_AI26/vocscreen_v2/src/lib/sync.ts) + [src/stores/useVocabStore.ts](file:///e:/ltprogram/P006_TRAE_AI26/vocscreen_v2/src/stores/useVocabStore.ts) + [src/stores/useReviewStore.ts](file:///e:/ltprogram/P006_TRAE_AI26/vocscreen_v2/src/stores/useReviewStore.ts)
- **问题**：`sync.ts` 中定义了 `syncCapturedWord`、`syncNotebook`、`syncReviewSchedule` 三个增量同步函数，但 **从未被调用**。
- `useVocabStore` 的 `captureWord`、`removeCapturedWord`、`markWordAsLearned` 等方法只更新了 IndexedDB，没有同步到 Supabase。
- `useReviewStore` 的 `initializeSchedule`、`recordReview` 同样只更新 IndexedDB。
- **后果**：登录用户在 app 中的操作（加生词、复习评分等）不会实时同步到云端。只有在下次刷新页面时，通过 `migrateLocalToCloud` 全量推送——但迁移标记会阻止重复推送，导致**登录后的新操作永远不会同步到云端**。
- **修复**：在各 store 的写操作后调用对应的 sync 函数（需检查 user 是否存在，游客模式跳过）。

#### Bug #6: DefinitionCard 的例句始终为空

- **文件**：[src/components/vocab/DefinitionCard.tsx](file:///e:/ltprogram/P006_TRAE_AI26/vocscreen_v2/src/components/vocab/DefinitionCard.tsx) L47-54
- **问题**：`handleCapture` 中 `sentenceEn: ''` 和 `sentenceZh: ''` 始终为空字符串，没有从当前字幕段获取例句。
- **影响**：背单词时卡片不显示例句（MemorizeScreen 的 `findExample` 从 segments 中查找，但已捕获的词的 source 里没有例句信息）。
- **修复**：从 `useSubtitleStore` 获取当前段的 `textEn` 和 `textZh`，填入 source 上下文。

### 🟡 中等问题（建议修复）

#### Bug #7: `useVideoEndDetection` 自动弹出旧版 LearningModal

- **文件**：[src/hooks/useVideoEndDetection.ts](file:///e:/ltprogram/P006_TRAE_AI26/vocscreen_v2/src/hooks/useVideoEndDetection.ts) L23
- **问题**：视频结束时自动弹出 `LearningModal`（旧版学习界面），但新的 `MemorizeScreen` 已经替代了它。
- **建议**：改为跳转到 MemorizeScreen，或弹出提示"视频看完啦，去背单词？"。

#### Bug #8: StatsPanel 的"连续天数"是假的

- **文件**：[src/components/stats/StatsPanel.tsx](file:///e:/ltprogram/P006_TRA26/vocscreen_v2/src/components/stats/StatsPanel.tsx) L26
- **问题**：`streak = Math.max(1, Math.floor(totalReviews / 5))` 不是真实的连续学习天数，只是复习次数除以 5。
- **修复**：基于 `reviewSchedules` 表中的 `lastReviewAt` 按日期去重计算连续天数，或在 IndexedDB 中新增 `dailyActivity` 表记录每日学习情况。

#### Bug #9: LearningModal 和 ReviewPanel 使用旧版 FlashCard

- **文件**：[src/components/vocab/LearningModal.tsx](file:///e:/ltprogram/P006_TRAE_AI26/vocscreen_v2/src/components/vocab/LearningModal.tsx)、[src/components/vocab/ReviewPanel.tsx](file:///e:/ltprogram/P006_TRAE_AI26/vocscreen_v2/src/components/vocab/ReviewPanel.tsx)
- **问题**：新的 `MemorizeCardView` 已实现更好的卡片 UI（翻转动画 + 评分按钮），但旧的面板还在用 `FlashCard` 组件。
- **建议**：统一使用 MemorizeScreen 作为唯一学习入口，废弃 LearningModal 和 ReviewPanel，或将其内部替换为 MemorizeCardView。

#### Bug #10: 翻译引擎用免费 API，限频不稳定

- **文件**：[src/engines/subtitle/TranslateEngine.ts](file:///e:/ltprogram/P006_TRAE_AI26/vocscreen_v2/src/engines/subtitle/TranslateEngine.ts)
- **问题**：使用 MyMemory 免费 API（`api.mymemory.translated.net`），每天限额 5000 词，且用 `|||` 分隔批量翻译的方式不可靠（翻译结果可能不按原顺序返回）。
- **影响**：单语 SRT 字幕翻译为双语时可能失败或翻译质量差。
- **建议**：短期可接受，长期需要集成 NLLB WASM 或其他翻译 API。

---

## 三、UI/UX 问题

### 布局问题

1. **TopToolbar 在小屏上拥挤**：有视频时，工具栏同时显示字幕模式切换、字号切换、视频标题、换视频、仪表盘、我的——在手机上会溢出。建议：小屏隐藏字幕模式/字号切换，收入折叠菜单。

2. **VideoControls 触摸区域太小**：播放/暂停按钮 `p-1.5`（约 24px），小于推荐的 44px 最小触摸目标。音量滑块 `w-20` 在手机上太窄。

3. **MemorizeCardView 没有滑动手势**：移动端背单词时，用户期望左右滑动切换卡片。当前只能点击"认识/模糊/不认识"按钮。

4. **DefinitionCard 在移动端可能溢出**：固定宽度 300px，在 320px 宽的手机上边距仅 10px。`position: fixed` 定位在手机上可能挡住字幕。

### 空状态处理

5. **没有到期复习词时**：MemorizeScreen 的 Review 按钮变灰且禁用，但没有解释"为什么没有"和"什么时候会有"。建议加一行"学习新词后，次日自动进入复习队列"。

6. **没有生词时进入 MemorizeScreen**：Learn 按钮可点击但进入 source-select 后三个来源都是 0 词。建议在 Home 界面就判断：如果没有任何词源，显示引导"先去视频中点击单词收集生词"。

### 可访问性

7. **部分按钮缺少 aria-label**：TopToolbar 的字幕模式切换、字号切换按钮有 `title` 但没有 `aria-label`。DefinitionCard 的"加入生词本"按钮缺少无障碍标签。

---

## 四、后续进展安排建议

### P0 — 立即修复（影响核心功能）

1. **Bug #5: 接入增量数据同步** — 登录用户的数据不会同步到云端，这是致命缺陷
2. **Bug #1: 修复 reset() 的 ObjectURL 释放** — 简单修复，1 行代码
3. **Bug #6: DefinitionCard 例句为空** — 影响背单词体验
4. **Bug #3: TopToolbar 添加统计/复习按钮** — 移动端无法访问这两个面板

### P1 — 本周修复（影响体验）

5. **Bug #4: 移除 COOP/COEP 头部** — 本地开发二维码图片加载失败
6. **Bug #2: 集成 useAutoCapture** — 提升生词收集体验
7. **Bug #7: 视频结束弹出改为引导去 MemorizeScreen**
8. **Bug #9: 统一学习入口** — 废弃或升级 LearningModal/ReviewPanel

### P2 — 后续迭代

9. **Bug #8: 真实连续天数计算**
10. **移动端适配优化**（触摸区域、滑动手势、工具栏折叠）
11. **集成 FFmpeg WASM + Whisper ASR**（本地 ASR 引擎）
12. **集成 NLLB WASM 本地翻译**
13. **接入 ClipCapture 视频片段截取**
14. **接入 usePwaNotification 复习通知**

---

## 五、架构评价

### 优点

- **引擎层与组件层分离清晰**：SubtitleRenderer、SrtParser、DictEngine 等独立类，可测试性好
- **Zustand 状态管理合理**：6 个 store 职责分明，没有过度集中
- **IndexedDB + Supabase 双层持久化**：游客模式本地优先，登录后云端同步
- **Canvas 字幕渲染性能好**：hitMap 机制实现了像素级点击检测
- **PWA 配置完整**：离线可用、可安装、自动更新

### 不足

- **两套学习界面并存**：MemorizeScreen（新）和 LearningModal/ReviewPanel（旧）功能重叠
- **增量同步断裂**：sync.ts 的增量函数未被调用，全量同步有迁移标记阻止重复
- **ASR 引擎全 stub**：虽然界面预留了入口，但核心功能未实现
- **移动端适配不足**：多处固定尺寸、缺少触摸优化、缺少手势支持

---

## 六、待用户确认的决策点

1. **useAutoCapture**：是否集成？（暂停点击单词自动加生词本，省去手动点按钮）
2. **usePwaNotification**：是否集成？（每 4 小时检查复习词并发通知）
3. **LearningModal / ReviewPanel**：废弃还是升级内部为 MemorizeCardView？
4. **COOP/COEP 头部**：暂时移除还是保留？（移除会影响未来 FFmpeg WASM，保留影响本地开发）
5. **TopToolbar 移动端方案**：折叠菜单还是隐藏部分按钮？
6. **ASR 引擎**：是否在本阶段集成？还是继续用预设字幕演示？
