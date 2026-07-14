# VocScreen 背单词系统优化方案 v2

> 参考：不背单词 App 学习流程
> 日期：2026-07-13
> 融合记忆科学、教育心理学与用户体验

---

## 一、设计理念

### 1.1 记忆科学依据

本方案基于以下记忆科学原理：

| 原理 | 应用 |
|------|------|
| **艾宾浩斯遗忘曲线** | 复习间隔 1→2→4→7→15→30 天，遗忘前及时复习 |
| **测试效应（Testing Effect）** | 主动回忆比被动阅读更有效，三阶段都是"先回忆再验证" |
| **认知负荷理论** | 渐进式难度（选义→例句→裸词），避免一次性信息过载 |
| **精细复述（Elaborative Rehearsal）** | 失败后立即展示释义+例句，深度加工强化记忆 |
| **Leitner 卡片盒系统** | 失败的词放回队列末尾重测，通过的词进入更长间隔 |
| **成功体验驱动动机** | 避免重复已通过的阶段，减少挫败感 |

### 1.2 与不背单词的差异

| 方面 | 不背单词 | VocScreen |
|------|----------|-----------|
| 词源 | 内置词书 | **视频匹配词 + 生词本 + 词书**（三源融合） |
| 例句 | 内置例句库 | **视频原声例句**（用户看过的视频，语境更深刻） |
| 视频片段 | 无 | **可播放原片片段**（强化情景记忆） |
| 每日上限 | 严格限制 | **不强制，允许超额** |
| 干扰项 | 内置词库 | **从所有已加载词书随机抽取** |

---

## 二、学习流程（Learn）

### 2.1 三阶段认知链

一个新词必须通过三个阶段才算"初次学习完成"。每个阶段都是"先回忆→再验证"的模式：

```
阶段一：选义（Multiple Choice）
    ↓ 选对 → 进入阶段二
    ↓ 选错 → 显示答案 → 今日队列末尾重学（从阶段一开始）
    
阶段二：例句判断（Context Judgment）
    ↓ 认识 → 进入阶段三
    ↓ 不认识 → 显示释义 → 今日队列末尾重学（从阶段二开始）
    
阶段三：裸词判断（Bare Word Judgment）
    ↓ 认识 → 完成学习 ✅ → 纳入复习队列
    ↓ 不认识 → 显示释义 → 今日队列末尾重学（从阶段三开始）
```

### 2.2 阶段详解

#### 阶段一：选义

**界面**：
```
┌─────────────────────────────────┐
│  ←  1/10    ⚙️    认识 0 · 错 0  │
│                                  │
│  abstract                        │
│  美 /ˈæbstrækt/                  │
│                                  │
│  先回想词义，再选择正确释义       │
│                                  │
│  ┌──────────────────────────┐    │
│  │ A. adj. 基本的，重要的     │    │
│  ├──────────────────────────┤    │
│  │ B. adj. 抽象的；抽象派的   │    │ ← 正确
│  ├──────────────────────────┤    │
│  │ C. n. 皮塔饼；龙舌兰       │    │
│  ├──────────────────────────┤    │
│  │ D. n. 首都；资本           │    │
│  └──────────────────────────┘    │
│                                  │
│           [💡 看答案]             │
└─────────────────────────────────┘
```

**规则**：
- 4 个选项，1 个正确，3 个干扰项
- 干扰项来源：**所有已加载词书**中的随机释义（不限当前词书）
- 优先选取**词性相同**的释义作为干扰项（提升迷惑性）
- "看答案"：直接显示正确答案，标记为选错，进入下一阶段
- 选对：高亮正确项（绿色），1.5 秒后进入阶段二
- 选错：高亮正确项（绿色）+ 用户选择项（红色），2 秒后进入今日队列末尾

#### 阶段二：例句判断

**界面**：
```
┌─────────────────────────────────┐
│  ←  1/10    ⚙️    阶段 2/3       │
│                                  │
│  abstract                        │
│  美 /ˈæbstrækt/                  │
│                                  │
│  ┌──────────────────────────┐    │
│  │ 📺 "She has an abstract    │    │
│  │  notion of justice."      │    │
│  │                           │    │
│  │ 她对正义有一种抽象的概念。  │    │
│  └──────────────────────────┘    │
│                                  │
│           [💡 提示]               │
│                                  │
│      [✓ 认识]    [✗ 不认识]       │
└─────────────────────────────────┘
```

**规则**：
- 例句优先级：**视频原声例句 > 词典 API 例句**
- 视频例句来自 `SubtitleSegment`（用户看过的视频字幕段）
- 词典例句来自 `DictSense.example`
- 两者都没有时，从词典 API 实时查询并缓存
- **不允许跳过此阶段**（用户确认的决策）
- "提示"：显示中文释义（降低难度，但不改变结果）
- 认识：进入阶段三
- 不认识：显示完整释义 + 例句翻译 2 秒，进入今日队列末尾**从阶段二开始**

#### 阶段三：裸词判断

**界面**：
```
┌─────────────────────────────────┐
│  ←  1/10    ⚙️    阶段 3/3       │
│                                  │
│                                  │
│        abstract                  │
│        美 /ˈæbstrækt/            │
│                                  │
│    无提示，请判断是否认识         │
│                                  │
│                                  │
│      [✓ 认识]    [✗ 不认识]       │
└─────────────────────────────────┘
```

**规则**：
- 仅显示单词和音标，无释义、无例句
- 认识：完成初次学习 ✅，进入"学习完成界面"
- 不认识：显示完整释义 + 例句 2 秒，进入今日队列末尾**从阶段三开始**

### 2.3 学习完成界面

三关全部通过后展示：

```
┌─────────────────────────────────┐
│  ←  1/10    ⚙️    ✅ 已学习       │
│                                  │
│  abstract  🎉                    │
│  美 /ˈæbstrækt/                  │
│                                  │
│  adj. 抽象的；抽象派的            │
│  n. 摘要，梗概                    │
│  vt. 提取，抽取                   │
│                                  │
│  ┌──────────────────────────┐    │
│  │ 📺 "She has an abstract    │    │
│  │  notion of justice."      │    │
│  │ 她对正义有一种抽象的概念。  │    │
│  └──────────────────────────┘    │
│                                  │
│         [▶ 看原片段]              │
│                                  │
│     [下一词 →]                    │
└─────────────────────────────────┘
```

**规则**：
- 展示完整释义 + 例句 + 视频片段按钮（如有）
- "下一词"：进入下一个新词
- 此界面停留时间不限，用户自主控制节奏

### 2.4 "记错了"的处理（记忆科学视角）

**设计原则**：失败后给予再次尝试的机会，但不重复已通过的简单阶段。

| 失败阶段 | 处理方式 | 科学依据 |
|----------|----------|----------|
| 阶段一选义错 | 显示答案 → 今日队列末尾**从阶段一重学** | 词义完全未建立，需完整重建认知链 |
| 阶段二不认识 | 显示释义 → 今日队列末尾**从阶段二开始** | 词义已建立但未与语境关联，无需重做选义 |
| 阶段三不认识 | 显示释义 → 今日队列末尾**从阶段三开始** | 词义+语境已建立但未内化，仅需强化裸词识别 |

**为什么不从阶段一重头开始？**

根据认知负荷理论（Sweller, 1988），让用户重复已通过的简单阶段会增加**外在认知负荷**（extraneous load），浪费工作记忆资源。用户已经证明能选对释义，再让他选一次只是消耗耐心，不会增强记忆。

**为什么放队列末尾而不是立即重试？**

根据间隔重复原理，在队列中间隔几个其他词后再重试，比立即重试更能强化长期记忆。立即重试只是短期记忆在工作，间隔几个词后才需要真正从长期记忆中提取。

---

## 三、复习流程（Review）

### 3.1 复习阶段

```
裸词判断
    ↓ 认识 → 艾宾浩斯曲线前进一档 ✅
    ↓ 不认识 → 显示释义+例句 → 标记"记住了" → 放入当日复习队列末尾重测
```

**界面**：
```
┌─────────────────────────────────┐
│  ←  3/8    ⚙️    复习             │
│                                  │
│        abstract                  │
│        美 /ˈæbstrækt/            │
│                                  │
│    还记得这个词吗？               │
│                                  │
│      [✓ 认识]    [✗ 不认识]       │
└─────────────────────────────────┘
```

### 3.2 复习失败后的处理（记忆科学视角）

**方案**：复习失败 → 立即展示释义+例句 → 放入**当日复习队列末尾**重测

**为什么不等 4 小时？**

| 时间方案 | 问题 |
|----------|------|
| 4 小时后 | ❌ 用户可能已离开应用，该词永远不会被复习到 |
| 立即重测 | ❌ 只是短期记忆在工作，不代表真正掌握 |
| **当日队列末尾** | ✅ 间隔几个词后重测，既测试长期记忆提取，又确保当天完成 |

根据艾宾浩斯曲线，学完后的前 20 分钟遗忘率高达 42%。复习失败意味着记忆已大量遗忘，此时应：
1. **立即精细复述**：展示释义+例句，让用户重新深度加工
2. **当日重测**：放队列末尾，间隔几个词后再次测试，验证是否真正记住
3. **曲线退回**：下次正式复习时间退回一档（不是 4 小时，而是按曲线的上一档间隔）

**分档逻辑**：

```
复习认识：
  - interval 前进一档（1→2→4→7→15→30 天）
  - ease += 0.15（上限 2.5）
  - consecutivePass += 1
  - consecutivePass >= 6 → mastered

复习不认识：
  - interval 退回至 0 档（1 天后复习）
  - ease -= 0.2（下限 0.5）
  - consecutivePass = 0
  - 当日队列末尾重测
  - 当日重测通过 → interval 前进一档（修复）
  - 当日重测失败 → 继续 queue 末尾，直到通过或队列结束
```

### 3.3 复习完成界面（不认识时）

```
┌─────────────────────────────────┐
│  ←  3/8    ⚙️    复习 · 不认识    │
│                                  │
│  abstract  ← 再看一眼             │
│  美 /ˈæbstrækt/                  │
│                                  │
│  adj. 抽象的；抽象派的            │
│  n. 摘要，梗概                    │
│                                  │
│  ┌──────────────────────────┐    │
│  │ 📺 "She has an abstract    │    │
│  │  notion of justice."      │    │
│  │ 她对正义有一种抽象的概念。  │    │
│  └──────────────────────────┘    │
│                                  │
│         [▶ 看原片段]              │
│                                  │
│         [✓ 记住了]                │
└─────────────────────────────────┘
```

---

## 四、每日新词池

### 4.1 设置

```
┌─────────────────────────────┐
│  Learn                      │
│                             │
│  每日目标: (10) [15] (20)   │  ← 可切换，不强制
│  今日已学: 3/15             │  ← 可超额
│  剩余新词: 47 个            │  ← 词源总计
│                             │
│  词源:                      │
│  ☑ 视频匹配 (12 个)         │
│  ☑ 生词本 (8 个)            │
│  ☑ 词书 (27 个)             │
│                             │
│  [开始学习 →]               │
└─────────────────────────────┘
```

### 4.2 逻辑

- 每日目标默认 15，用户可切换 10/15/20，存储于 `localStorage`
- **不强制**：用户可以超额学习，学完目标后提示"已完成今日目标，继续学习吗？"
- 新词池构建：
  1. 从视频匹配词 + 生词本 + 词书中取并集
  2. 去除已有 review schedule 的词（已学过）
  3. 按频率排序（视频匹配词优先 > 词书高频词）
  4. 取前 N 个作为今日新词池
- 每日 0 点重置计数（按自然日判断）

---

## 五、数据结构变更

### 5.1 新增类型

```typescript
// 学习阶段
type LearnStage = 'choice' | 'context' | 'bare' | 'completed'

// 学习项的扩展
interface MemorizeItem {
  // ... 现有字段
  learnStage: LearnStage        // 当前学习阶段
  choiceCorrect?: boolean       // 阶段一是否选对
  contextResult?: 'known' | 'unknown'
  bareResult?: 'known' | 'unknown'
}

// 每日学习记录
interface DailyLearnRecord {
  id: string
  date: string                  // '2026-07-13'
  wordId: string                // capturedWordId
  stagesPassed: LearnStage[]    // 已通过的阶段
  choiceCorrect: boolean
  contextResult: 'known' | 'unknown' | 'skipped'
  bareResult: 'known' | 'unknown'
  completedAt: number | null    // 完成时间戳
}
```

### 5.2 EbbinghausSchedule 修改

```typescript
interface EbbinghausSchedule {
  // ... 现有字段保留
  // 移除：consecutivePass 改为 reviewPassCount（语义更清晰）
  reviewPassCount: number       // 复习连续通过次数
  lastChoiceCorrect: boolean    // 最近一次选义是否正确（用于调整 ease）
}
```

### 5.3 IndexedDB 新增表

```typescript
// database.ts version(3)
dailyLearnRecords: 'id, date, wordId, completedAt'
```

### 5.4 MasteryResult 简化

```typescript
// 原：'known' | 'fuzzy' | 'unknown'
// 新：'known' | 'unknown'  （移除 fuzzy）
```

---

## 六、文件改动清单

### 新增文件

| 文件 | 说明 |
|------|------|
| `src/components/memorize/stages/ChoiceStage.tsx` | 阶段一：四选一选义 |
| `src/components/memorize/stages/ContextStage.tsx` | 阶段二：例句判断 |
| `src/components/memorize/stages/BareStage.tsx` | 阶段三：裸词判断 |
| `src/components/memorize/stages/LearnCompleteView.tsx` | 学习完成展示 |
| `src/components/memorize/stages/ReviewFailView.tsx` | 复习不认识时展示 |
| `src/lib/distractors.ts` | 干扰项生成器 |

### 修改文件

| 文件 | 改动 |
|------|------|
| `src/types/vocabulary.ts` | 新增 `LearnStage`、`DailyLearnRecord` 类型 |
| `src/db/database.ts` | version(3)：新增 `dailyLearnRecords` 表 |
| `src/stores/useReviewStore.ts` | 重构复习逻辑，简化为 known/unknown，新增当日重测队列 |
| `src/stores/useVocabStore.ts` | 新增 `getTodayNewWords(limit)` |
| `src/components/memorize/MemorizeScreen.tsx` | 重写 Learning phase，根据 `learnStage` 渲染不同子组件 |
| `src/components/memorize/MemorizeCardView.tsx` | 保留，用于复习阶段卡片 |
| `src/types/engine.ts` | `MasteryResult` 简化为 `'known' \| 'unknown'` |

### 可删除文件

| 文件 | 原因 |
|------|------|
| `src/components/vocab/LearningModal.tsx` | 被 MemorizeScreen 替代 |
| `src/components/vocab/ReviewPanel.tsx` | 被 MemorizeScreen 替代 |

---

## 七、干扰项生成算法

### 7.1 算法设计

```typescript
function generateDistractors(
  correctEntry: WordEntry,
  allBooks: Map<WordBookId, WordBook>,
  count: number = 3
): string[] {
  // 1. 收集所有词书的释义
  const allDefinitions: { text: string; pos: string }[] = []
  for (const book of allBooks.values()) {
    for (const entry of book.entries) {
      if (entry.lemma === correctEntry.lemma) continue
      allDefinitions.push({
        text: entry.definition,
        pos: extractPos(entry.definition),  // 提取词性
      })
    }
  }

  // 2. 优先选取词性相同的释义
  const correctPos = extractPos(correctEntry.definition)
  const samePos = allDefinitions.filter(d => d.pos === correctPos)
  const otherPos = allDefinitions.filter(d => d.pos !== correctPos)

  // 3. 随机抽取
  const distractors: string[] = []
  const pool = [...shuffle(samePos), ...shuffle(otherPos)]
  for (const d of pool) {
    if (distractors.length >= count) break
    if (!distractors.includes(d.text)) {
      distractors.push(d.text)
    }
  }

  // 4. 不够时用通用释义补充
  while (distractors.length < count) {
    distractors.push(GENERIC_DISTRACTORS[distractors.length])
  }

  return distractors
}
```

### 7.2 词性提取

```typescript
function extractPos(definition: string): string {
  // 中文词典释义格式：'adj. 抽象的' / 'n. 摘要' / 'v. 提取'
  const match = definition.match(/^(n\.|v\.|vt\.|vi\.|adj\.|adv\.|prep\.|conj\.|pron\.)/)
  return match ? match[1] : 'other'
}
```

---

## 八、实现优先级

### P0 — 核心流程

1. 数据结构变更（类型 + DB version 3）
2. 干扰项生成器
3. 三阶段学习组件（ChoiceStage / ContextStage / BareStage）
4. 学习完成界面
5. MemorizeScreen 重写 Learning phase

### P1 — 复习优化

6. 复习流程简化为 known/unknown
7. 复习失败当日重测逻辑
8. useReviewStore 重构

### P2 — 体验优化

9. 每日新词池设置 UI
10. 每日学习统计
11. 学习进度持久化（中途退出恢复）
12. 废弃 LearningModal / ReviewPanel

---

## 九、与现有功能的兼容性

### 保留的功能
- ✅ 视频片段播放（VideoClipModal）— 在学习完成界面和复习失败界面中复用
- ✅ 二维码扫码进入
- ✅ 主题切换
- ✅ 词书匹配高亮
- ✅ 生词本管理
- ✅ 增量数据同步

### 需要适配的功能
- ⚠️ StatsPanel：新增"今日新词学习数"统计
- ⚠️ DashboardPanel：显示"今日学习进度"
- ⚠️ TopToolbar：复习按钮的 dueCount 逻辑需适配

### 不影响的功能
- ✅ 视频播放 + 字幕渲染
- ✅ 词典查询 + 生词捕获
- ✅ 邮箱验证登录
- ✅ ASR 字幕生成

---

## 十、总结

本方案在上一版基础上的关键改进：

1. **"记错了"不重头开始**：根据失败阶段决定从哪个阶段重学，避免重复已通过的简单阶段（认知负荷理论）
2. **复习失败当日重测**：不等 4 小时，放队列末尾当日重测（精细复述 + 间隔提取）
3. **干扰项从所有词书抽取**：不限当前词书，提升迷惑性
4. **移除"模糊"档**：简化为 known/unknown 二元判断，降低决策成本
5. **每日上限不强制**：允许超额学习，学完目标后提示继续
6. **例句缺失用词典 API**：不跳过阶段二，确保三阶段完整
