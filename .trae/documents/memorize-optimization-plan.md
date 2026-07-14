# VocScreen 背单词系统优化方案

> 参考：不背单词 App 学习流程
> 日期：2026-07-13

---

## 一、不背单词学习流程分析

### 不背单词的三阶段学习流程

不背单词对新词采用**渐进式认知**，一个词必须通过三个关卡才算"初次学习完成"：

| 阶段 | 展示内容 | 用户操作 | 认知难度 |
|------|----------|----------|----------|
| **第一关：选义** | 英文单词 + 4 个中文释义选项 | 从 4 个选项中选出正确释义 | ★★☆☆☆（有提示） |
| **第二关：例句判断** | 英文单词 + 一个含该词的例句 | 判断"认识"或"不认识" | ★★★☆☆（有语境） |
| **第三关：裸词判断** | 仅英文单词（无释义、无例句） | 判断"认识"或"不认识" | ★★★★★（无提示） |

**关键规则**：
- 三关必须全部通过，才算完成初次学习
- 任何一关失败（选错/不认识），该词会重新进入学习队列
- 学习完成后，自动进入复习队列（艾宾浩斯曲线）
- 每日新词池有上限（10/15/20），由用户设置

### 不背单词的复习流程

- 复习时直接展示单词，用户判断"认识/不认识"
- 根据反馈调整下次复习时间
- 连续答对 6 次标记为"已掌握"

---

## 二、VocScreen 现状分析

### 当前 MemorizeScreen 的学习流程

```
Home → 选择词源 → 卡片翻转看释义 → 三选一评分（认识/模糊/不认识）→ 下一词
```

**问题**：
1. **一次性暴露释义**：卡片翻转后直接显示完整释义，用户没有"先回忆再验证"的过程
2. **没有渐进式认知**：缺少从"有提示"到"无提示"的难度递进
3. **评分三档过于复杂**：认识/模糊/不认识三档在快速学习中决策成本高
4. **没有每日新词上限**：用户可以一次性学完所有词，不符合记忆规律
5. **Learn 和 Review 的评分逻辑不统一**：Learn 用三档，Review 也用三档但含义不同

### 当前数据结构

```typescript
// 现有 MasteryResult
type MasteryResult = 'known' | 'fuzzy' | 'unknown'

// 现有 EbbinghausSchedule
interface EbbinghausSchedule {
  intervals: number[]        // [1, 2, 4, 7, 15, 30]
  currentIntervalIndex: number
  consecutivePass: number    // 连续通过次数，≥6 为 mastered
  ease: number               // 难度系数
  status: 'new' | 'active' | 'mastered'
}
```

---

## 三、优化方案

### 3.1 新增：每日新词池设置

**UI 位置**：MemorizeScreen Home 界面的 Learn 卡片上

```
┌─────────────────────────────┐
│  Learn                      │
│  每日新词: [10] [15] [20]   │  ← 新增设置
│  今日剩余: 7/10             │
│  词源: ☑视频 ☑生词本 ☑词书  │
│  [开始学习 →]               │
└─────────────────────────────┘
```

**存储**：`localStorage` 保存 `dailyNewWordLimit`（默认 10）

**逻辑**：
- 从所有词源中取并集，去重后取前 N 个作为今日新词池
- 已学过的词（有 review schedule 的）不计入新词池
- 每日 0 点重置计数（或按自然日判断）

### 3.2 重构：三阶段学习流程

#### 阶段一：选义（Multiple Choice）

```
┌─────────────────────────────┐
│  ← 1/10              ⚙️    │
│                             │
│  abstract                   │
│  美 /ˈæbstrækt/             │
│                             │
│  先回想词义再选择，          │
│  想不起来「看答案」          │
│                             │
│  ┌─────────────────────┐    │
│  │ adj. 被关押的；非自愿的│   │
│  ├─────────────────────┤    │
│  │ adj. 基本的，最重要的│   │
│  ├─────────────────────┤    │
│  │ n. 皮塔饼；龙舌兰    │   │
│  ├─────────────────────┤    │
│  │ n. 首都；资本，资金  │   │ ← 正确答案
│  ─────────────────────┘    │
│                             │
│         [看答案]            │
└─────────────────────────────┘
```

**实现要点**：
- 从词典 API 的 `senses` 中取正确释义
- 干扰项从**同词书其他词**的释义中随机选取（确保词性相近）
- 如果词典只有 1 个释义，从其他词中取 3 个干扰项
- "看答案"按钮：直接显示正确答案并进入下一阶段（但标记为"未通过"）
- 选错：标记为"未通过"，显示正确答案，进入下一阶段

#### 阶段二：例句判断（Context Judgment）

```
┌─────────────────────────────
│  ← 1/10              ️    │
│                             │
│  canteen                    │
│  美 /kænˈtiːn/              │
│                             │
│  ┌─────────────────────┐    │
│  │ Does the canteen     │    │
│  │ open for breakfast?  │    │
│  │                     │    │
│  │ 食堂早上开门吗？      │    │
│  └─────────────────────┘    │
│                             │
│         [💡 提示一下]        │
│                             │
│    [认识]          [不认识]  │
─────────────────────────────┘
```

**实现要点**：
- 例句优先使用 `item.exampleSentence`（来自视频字幕段）
- 如果没有视频例句，使用词典 API 的 `sense.example`
- 如果都没有，跳过此阶段直接进入阶段三
- "提示一下"：显示中文释义（降低难度）
- 认识 → 进入阶段三；不认识 → 显示释义后重新进入阶段二（或跳过）

#### 阶段三：裸词判断（Bare Word Judgment）

```
┌─────────────────────────────┐
│  ← 1/10              ⚙️    │
│                             │
│  abstract                   │
│  美 /ˈæbstrækt/             │
│                             │
│  本词最后一关 🤔：           │
│  请在无提示的情况下判断      │
│                             │
│                             │
│                             │
│                             │
│    [认识]          [不认识]  │
└─────────────────────────────┘
```

**实现要点**：
- 只显示单词和音标，无释义、无例句
- 认识 → 完成初次学习，纳入复习队列
- 不认识 → 显示完整释义（同不背单词的"学习完成"界面），然后纳入复习队列

### 3.3 学习完成界面

```
─────────────────────────────┐
│  ← 1/10              ⚙️    │
│                             │
│  abstract  ✅               │
│                             │
│  adj. 抽象的  抽象派的      │
│  n. 摘要，梗概              │
│  vt. 提取，抽取             │
│                             │
│  ┌─────────────────────┐    │
│  │ Any kind of abstract │    │
│  │ concept was hard for │    │
│  │ me.                  │    │
│  │ 任何抽象的概念都让我  │    │
│  │ 感到难以理解。        │    │
│  └─────────────────────    │
│                             │
│  [词组搭配] [派生] [词根]    │
│                             │
│   [下一词]          [记错了] │
└─────────────────────────────┘
```

**实现要点**：
- 显示完整释义 + 例句 + 视频片段按钮
- "下一词"：进入下一个新词
- "记错了"：该词重新进入今日学习队列（不纳入复习）

### 3.4 复习流程优化

复习时采用**两阶段**：

#### 复习阶段一：裸词判断

```
┌─────────────────────────────┐
│  ← 3/8               ⚙️    │
│                             │
│  abstract                   │
│  美 /ˈæbstrækt/             │
│                             │
│    [认识]          [不认识]  │
└─────────────────────────────┘
```

- 认识 → 艾宾浩斯曲线前进一档
- 不认识 → 显示释义，曲线退回，4 小时后重新复习

#### 复习阶段二（不认识时）：释义展示 + 重新判断

```
─────────────────────────────┐
│  abstract  ← 不认识         │
│                             │
│  adj. 抽象的  抽象派的      │
│  n. 摘要，梗概              │
│                             │
│  ┌─────────────────────┐    │
│  │ Any kind of abstract │    │
│  │ concept was hard...  │    │
│  └─────────────────────┘    │
│                             │
│         [记住了]             │
└─────────────────────────────┘
```

### 3.5 评分逻辑调整

| 场景 | 原逻辑 | 新逻辑 |
|------|--------|--------|
| 选义选对 | — | 进入下一阶段 |
| 选义选错 | — | 标记 failed，显示答案，进入下一阶段 |
| 例句认识 | known | 进入下一阶段 |
| 例句不认识 | unknown | 显示释义，重新判断或跳过 |
| 裸词认识 | known | 完成学习，纳入复习 |
| 裸词不认识 | unknown | 显示释义，纳入复习（但 ease 降低） |
| 复习认识 | known | 曲线前进 |
| 复习不认识 | unknown | 曲线退回，4h 后重测 |

**分档与强度修正**：

```
初次学习通过 → ease = 1.0, interval = 1天
复习连续通过 → ease += 0.15, interval 前进
复习失败 → ease -= 0.3, interval 退回至 0, 4h 后重测
连续通过 6 次 → mastered
```

---

## 四、数据结构变更

### 新增字段

```typescript
// 新增：学习阶段
type LearnStage = 'choice' | 'context' | 'bare' | 'completed'

// 新增：每日学习记录
interface DailyLearnRecord {
  date: string           // '2026-07-13'
  wordId: string
  stagesPassed: ('choice' | 'context' | 'bare')[]
  choiceCorrect: boolean
  contextResult: 'known' | 'unknown' | 'skipped'
  bareResult: 'known' | 'unknown'
  completedAt: number | null
}

// 修改：EbbinghausSchedule 新增
interface EbbinghausSchedule {
  // ... 现有字段
  learnStage: LearnStage  // 新增：当前学习阶段
  dailyLimit: number      // 新增：每日新词上限
}
```

### IndexedDB 新增表

```typescript
// dailyLearnRecords 表
{
  id: string,            // crypto.randomUUID()
  date: string,          // '2026-07-13'
  wordId: string,        // capturedWordId
  stage: LearnStage,     // 当前通过的阶段
  choiceCorrect: boolean,
  contextResult: string,
  bareResult: string,
  completedAt: number | null,
}
```

---

## 五、文件改动清单

### 新增文件

| 文件 | 说明 |
|------|------|
| `src/components/memorize/LearnChoiceStage.tsx` | 阶段一：四选一选义 |
| `src/components/memorize/LearnContextStage.tsx` | 阶段二：例句判断 |
| `src/components/memorize/LearnBareStage.tsx` | 阶段三：裸词判断 |
| `src/components/memorize/LearnCompleteView.tsx` | 学习完成展示页 |
| `src/components/memorize/ReviewBareStage.tsx` | 复习：裸词判断 |
| `src/components/memorize/ReviewResultView.tsx` | 复习不认识时的释义展示 |

### 修改文件

| 文件 | 改动 |
|------|------|
| `src/types/engine.ts` | 新增 `LearnStage`、`DailyLearnRecord` 类型 |
| `src/db/database.ts` | 新增 `dailyLearnRecords` 表 |
| `src/stores/useReviewStore.ts` | 新增 `learnStage` 管理、每日计数逻辑 |
| `src/stores/useVocabStore.ts` | 新增 `getTodayNewWords(limit)` 方法 |
| `src/components/memorize/MemorizeScreen.tsx` | 重写 Learning phase，根据 `learnStage` 渲染不同子组件 |
| `src/components/memorize/MemorizeCardView.tsx` | 保留作为复习阶段的卡片展示 |

### 可删除文件

| 文件 | 原因 |
|------|------|
| `src/components/vocab/LearningModal.tsx` | 被 MemorizeScreen 替代 |
| `src/components/vocab/ReviewPanel.tsx` | 被 MemorizeScreen 替代 |
| `src/components/vocab/FlashCard.tsx` | 已删除 |

---

## 六、实现优先级

### P0 — 核心流程（必须先做）

1. **每日新词池设置**：Home 界面添加 10/15/20 选择器
2. **三阶段学习流程**：Choice → Context → Bare
3. **学习完成界面**：展示完整释义 + 例句 + 视频片段
4. **"记错了"重新学习**：未通过的词重新进入队列

### P1 — 复习优化

5. **复习裸词判断**：复习时先裸词判断
6. **复习不认识展示释义**：不认识时显示释义 + 例句
7. **分档与强度修正**：根据三阶段表现调整 ease 和 interval

### P2 — 体验优化

8. **干扰项生成算法**：从同词书取词性相近的干扰项
9. **每日学习统计**：今日已学/剩余、连续学习天数
10. **学习进度持久化**：中途退出后恢复学习进度

---

## 七、与现有功能的兼容性

### 保留的功能
- ✅ 视频片段播放（VideoClipModal）
- ✅ 二维码扫码进入
- ✅ 主题切换
- ✅ 词书匹配高亮
- ✅ 生词本管理

### 需要适配的功能
- ⚠️ LearningModal：废弃，功能合并到 MemorizeScreen
- ️ ReviewPanel：废弃，功能合并到 MemorizeScreen
- ⚠️ StatsPanel：需要新增"今日新词学习数"统计
- ⚠️ DashboardPanel：需要显示"今日学习进度"

### 不影响的功能
- ✅ 视频播放 + 字幕渲染
- ✅ 词典查询 + 生词捕获
- ✅ 邮箱验证登录 + 数据同步
- ✅ ASR 字幕生成

---

## 八、待确认的决策点

1. **每日新词上限是否强制**：用户可以超额学习吗？还是不背单词那样严格限制？
2. **阶段二例句缺失时**：直接跳过阶段二进入阶段三，还是用词典 API 的例句？
3. **"记错了"的处理**：重新从阶段一开始，还是从失败的阶段开始？
4. **复习失败后的重测时间**：4 小时后还是当天？
5. **干扰项来源**：仅从当前词书取，还是可以从所有词书取？
6. **是否保留"模糊"档**：三阶段流程中只有"认识/不认识"，是否还需要"模糊"？
