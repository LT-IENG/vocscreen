# 词汇系统优化计划（续）

## 概述

Part 1（词书匹配修复）和 Part 4 数据层（多生词本模型）已完成。本计划覆盖剩余三项任务：
- **Part 2**: 仪表盘统计改造 — "已捕单词"改为"视频中XX词汇"
- **Part 4 UI**: 仪表盘生词本管理界面
- **Part 3**: 背单词界面（参照百词斩/不背单词/墨墨背单词）

## 当前状态分析

### Part 1 验证（已完成）
- `lookupWord` 只做精确匹配 `combinedDict.get(clean)`，不再有 `startsWith` fallback ✓
- `loadBook` 加载词书后调用 `rematchAll` 重新匹配字幕 ✓
- `DefinitionCard.tsx` 只在 `card.level` 有值时显示等级标签，词典查询词（status='api'）无等级标签 ✓
- `SubtitleSourceModal.doLoad` 已使用 `buildWordSet` + `rematchAll` 做匹配 ✓
- **遗留 bug**: `DashboardPanel.tsx` 第88行切换词书时用 `new Set(book.entries.map(e => e.spelling.toLowerCase()))` 而非 `buildWordSet(book)`，不含 lemma，需修复

### Part 4 数据层（已完成）
- `Notebook` 接口已定义，`CapturedWord.notebookId` 已添加 ✓
- Dexie v2 已升级，`notebooks` 表和 `capturedWords.notebookId` 索引已添加 ✓
- Store 方法已实现：`loadNotebooks`, `createNotebook`, `renameNotebook`, `deleteNotebook`, `setDefaultNotebook`, `moveCapturedWord`, `getCapturedWordsForNotebook` ✓
- `App.tsx` 初始化调用 `loadNotebooks()` ✓
- **待验证**: TypeScript 编译

### 词书数据
- 书名: "四级词汇"、"六级词汇"、"托福词汇"、"雅思词汇"
- `matchSummary.bookName` 即为词书名，可直接用于"视频中{bookName}"标签
- `matchSummary.totalMatches` 已按 lemma 去重（`getMatchList` 函数）

---

## 实现步骤

### 步骤 0: TypeScript 编译验证
- 运行 `npx tsc --noEmit` 检查 Part 4 数据层改动是否有类型错误
- 修复所有报错后继续

### 步骤 1: Part 2 — 仪表盘统计改造

**文件**: `src/components/vocab/DashboardPanel.tsx`

改动点：
1. **统计卡片**: 将"已捕获词"改为"视频中{词书名}词汇"
   - 从 `useSubtitleStore` 获取 `matchSummary`
   - 显示 `matchSummary?.totalMatches ?? 0`
   - 标签: `视频中${matchSummary?.bookName ?? '词汇'}`
   - 保留"待复习"卡片不变

2. **修复词书切换 bug**: 第88行 `new Set(book.entries.map(e => e.spelling.toLowerCase()))` 改为 `buildWordSet(book)`
   - 导入 `buildWordSet` from `MatcherEngine`

3. **新增"去背单词"按钮**: 在统计卡片下方添加按钮
   - 点击后 `setAppScreen('memorize')`
   - 样式: 紫色主色调，带图标

### 步骤 2: Part 4 UI — 仪表盘生词本管理

**文件**: `src/components/vocab/DashboardPanel.tsx`

改动点：
1. **生词本选择器**: 替换原来的扁平生词列表
   - 顶部: 水平滚动的生词本标签（Tab 风格）
   - 每个标签显示生词本名称 + 词数
   - 默认生词本带星标
   - 末尾有"+"按钮快速新建
   - 选中态: 紫色底高亮

2. **生词本管理弹窗**: 点击标签旁的齿轮图标打开
   - 使用 `Modal` 组件
   - 列出所有生词本，每行:
     - 名称（可点击编辑）
     - "设为默认"按钮（非默认本显示）
     - "删除"按钮（至少保留1个）
   - 底部: 新建生词本输入框 + "创建"按钮

3. **生词列表按生词本过滤**:
   - 当前选中的生词本 ID 存为组件 local state
   - 列表只显示 `getCapturedWordsForNotebook(selectedNotebookId)` 的词
   - 每个词条增加"移动到"下拉操作（可选其他生词本）

4. **DashboardPanel 中添加 local state**:
   - `selectedNotebookId: string` — 当前查看的生词本
   - `showNotebookManager: boolean` — 管理弹窗开关
   - 初始化时设为 `defaultNotebookId`

### 步骤 3: Part 3 — 背单词界面

#### 3a. 扩展 AppScreen 类型
**文件**: `src/stores/useUIStore.ts`
- `AppScreen` 类型增加 `'memorize'`: `'landing' | 'wordbook-select' | 'app' | 'memorize'`

#### 3b. App.tsx 路由
**文件**: `src/App.tsx`
- 新增 `case 'memorize': return <MemorizeScreen />`
- 导入 `MemorizeScreen`

#### 3c. MemorizeScreen 主组件
**文件**: `src/components/memorize/MemorizeScreen.tsx` (新建)

三阶段流程，用 local state 管理:
```
phase: 'source-select' → 'learning' → 'results'
```

**阶段 1: 来源选择 (SourceSelect)**
- 三个复选框（多选）:
  - ☑ 视频中词汇（默认勾选）— 来源: `matchSummary.matchList` → `combinedDict` 查释义
  - ☐ 生词本 — 来源: `capturedWords`（去重按 lemma）
  - ☐ 整本词书 — 来源: `loadedBooks.get(selectedBookId).entries`，按 frequency 降序取前 50
- 每项显示可背词数
- "开始背单词"按钮（至少选1项才可用）
- "返回"按钮 → `setAppScreen('app')`

**数据构建**:
```typescript
interface MemorizeItem {
  spelling: string
  lemma: string
  phonetics: string
  definition: string
  senses?: DictSense[]
  level?: string
  exampleSentence?: string  // 视频字幕例句
  exampleTranslation?: string
  source: 'video' | 'captured' | 'wordbook'
}
```
- 合并去重: 按 lemma 去重，视频词优先（有例句），其次生词本，最后词书
- 打乱顺序

**阶段 2: 学习 (Learning)**
- 顶部: 返回按钮 + 进度条 + "第 X / N 词"
- 中间: 卡片
  - 正面: 单词拼写（大字号）+ 音标 + "点击查看释义"提示
  - 背面: 单词 + 音标 + 释义（分段，参照 DefinitionCard 的 senses 展示）+ 例句（如有）
- 翻转: 点击卡片翻转，使用 CSS 3D transform（不用 motion/react，避免黑屏）
- 底部: 翻转后显示三个按钮
  - 认识（绿色）/ 模糊（黄色）/ 不认识（红色）
- 不认识的词加入队尾，本轮结束时再次出现
- 全部过完后进入结果阶段

**阶段 3: 结果 (MemorizeResults)**
- 统计: 总词数、认识数、模糊数、不认识数
- 进度环或进度条
- "再背不认识的"按钮 → 只背不认识的词，重置阶段2
- "完成"按钮 → `setAppScreen('app')`，回到主界面

#### 3d. MemorizeCardView 卡片组件
**文件**: `src/components/memorize/MemorizeCardView.tsx` (新建)

- Props: `item: MemorizeItem`, `onAssess: (result: MasteryResult) => void`
- CSS 3D 翻转动画:
  ```css
  .card-inner { transform-style: preserve-3d; transition: transform 0.5s; }
  .card-flipped .card-inner { transform: rotateY(180deg); }
  .card-front, .card-back { backface-visibility: hidden; position: absolute; }
  .card-back { transform: rotateY(180deg); }
  ```
- 正面: 单词 + 音标 + "点击查看释义"
- 背面: 单词 + 音标 + 分段释义 + 例句
- 翻转后显示评估按钮

#### 3e. 背单词样式文件
**文件**: `src/components/memorize/MemorizeScreen.css` (新建)
- 3D 翻转动画 CSS
- 卡片样式
- 进度条样式

---

## 文件变更清单

| 文件 | 操作 | 说明 |
|------|------|------|
| `src/stores/useUIStore.ts` | 修改 | AppScreen 增加 'memorize' |
| `src/components/vocab/DashboardPanel.tsx` | 修改 | 统计改造 + 生词本管理 UI + 去背单词按钮 |
| `src/App.tsx` | 修改 | 增加 memorize 路由 |
| `src/components/memorize/MemorizeScreen.tsx` | 新建 | 背单词主界面 |
| `src/components/memorize/MemorizeCardView.tsx` | 新建 | 翻转卡片组件 |
| `src/components/memorize/MemorizeScreen.css` | 新建 | 3D 翻转动画样式 |

## 设计决策

1. **不使用 motion/react**: 之前 motion/react 导致过黑屏问题，背单词卡片用纯 CSS 3D transform
2. **生词本管理用 Modal**: 380px 侧栏空间有限，管理操作放 Modal 弹窗
3. **不认识的词循环**: 本轮内循环（队尾重排），不做跨日间隔重复（那是复习面板的职责）
4. **词典查询词不标注等级**: Part 1 已修复，维持现状
5. **视频词优先**: 合并去重时，视频词（有例句）优先于生词本和词书词
6. **词书词限量**: 整本词书只取前50（按 frequency 降序），避免背词列表过长

## 验证步骤

1. `npx tsc --noEmit` — 无类型错误
2. `npm run dev` — 开发服务器正常启动
3. 加载视频+字幕 → 仪表盘显示"视频中六级词汇: N"（N > 0）
4. 仪表盘 → 切换词书 → 统计数字刷新
5. 仪表盘 → 新建生词本 → 切换查看 → 重命名/删除/设默认
6. 仪表盘 → 点"去背单词" → 进入背单词界面
7. 背单词 → 选来源 → 翻卡 → 认识/不认识 → 不认识的循环 → 结果统计
8. 背单词 → 完成 → 回到主界面
9. DefinitionCard → 加入生词本 → 在仪表盘默认生词本中可见
