# 词映 VocScreen 上线 + 跨端同步 + 体验打磨 完整方案

## 总体目标

1. **Vercel 部署上线** — 项目部署到 Vercel，绑定个人域名，HTTPS 可访问
2. **PWA 完善** — 补齐图标，移动端可"添加到主屏幕"作为 App 使用
3. **Supabase 集成** — 账号系统 + 数据跨端同步（PC/手机同账号自动同步）
4. **背单词体验细化** — 记忆曲线可视化、连续打卡、Review 卡片显示下次复习时间
5. **演示模式打磨** — 评委一键体验流程无 bug

---

## 阶段 1：Vercel 部署上线（最快，0 代码改动）

### 1.1 推送代码到 GitHub

**用户操作**：
1. 在 GitHub 创建空仓库（如 `vocscreen`）
2. 本地推送：
   ```bash
   git init
   git add .
   git commit -m "feat: vocscreen v2"
   git branch -M main
   git remote add origin https://github.com/<你的用户名>/vocscreen.git
   git push -u origin main
   ```

**注意**：先检查 `.gitignore` 是否已忽略 `node_modules`、`.env` 等敏感文件。

### 1.2 Vercel 导入项目

**用户操作**：
1. 访问 https://vercel.com，用 GitHub 账号登录
2. 点 "Add New Project" → 选择 `vocscreen` 仓库
3. Framework Preset 自动识别为 Vite，**默认配置即可**：
   - Build Command: `npm run build`
   - Output Directory: `dist`
4. 点 Deploy，等待 1-2 分钟构建完成

**产出**：获得一个 `https://vocscreen-xxx.vercel.app` 临时域名

### 1.3 绑定个人域名

**用户操作**：
1. Vercel 项目 → Settings → Domains → Add Domain
2. 输入你的个人域名（如 `vocscreen.yourdomain.com`）
3. 按提示到域名服务商添加 CNAME 记录：
   - 类型：CNAME
   - 主机记录：`vocscreen`（或你想用的子域名）
   - 记录值：`cname.vercel-dns.com`
4. 等待 DNS 生效（5-30 分钟），Vercel 自动签发 HTTPS 证书

**产出**：可通过 `https://vocscreen.yourdomain.com` 访问

### 1.4 更新 COS CORS 配置

**用户操作**：
- 回到 COS 控制台 → 跨域访问 CORS 设置
- 把 Origin 从 `*` 改为你的 Vercel 域名 + 个人域名：
  ```
  https://vocscreen-xxx.vercel.app
  https://vocscreen.yourdomain.com
  ```
- （保留 `*` 也可以，但正式上线后建议限制）

---

## 阶段 2：PWA 图标补齐

### 2.1 生成图标

**用户操作**（任选一种）：
- **方案 A（推荐）**：用 https://www.pwabuilder.com 或 Figma 设计 512x512 图标，导出 PNG
- **方案 B**：用现成的 VocScreen logo 截图，我用 sharp/PWA 工具自动生成各尺寸

**说明**：需要两个文件放在 `public/` 目录：
- `icon-192.png`（192x192）
- `icon-512.png`（512x512）

### 2.2 代码调整

**助手操作**：确认 `vite.config.ts` 中 PWA manifest 配置正确（已检查，无需改动）

**验证**：部署后用 Chrome 手机模式访问，地址栏应无"添加到主屏幕"提示，且安装后图标正常显示

---

## 阶段 3：Supabase 集成（账号 + 跨端同步）

### 3.1 创建 Supabase 项目

**用户操作**：
1. 访问 https://supabase.com，用 GitHub 登录
2. New Project → 命名 `vocscreen` → 选择离用户最近的区域（如 Northeast Asia - Singapore）
3. 设置数据库密码（**请妥善保存**）
4. 等待 2-3 分钟项目初始化完成

### 3.2 创建数据表

**用户操作**：在 Supabase Dashboard → SQL Editor 执行以下 SQL：

```sql
-- 生词本表（跨端同步）
create table notebooks (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade,
  name text not null,
  is_default boolean default false,
  created_at timestamptz default now()
);

-- 生词表
create table captured_words (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade,
  notebook_id uuid references notebooks(id) on delete set null,
  spelling text not null,
  lemma text not null,
  status text default 'new',
  source jsonb,
  captured_at timestamptz default now(),
  learned_at timestamptz
);

-- 复习计划表
create table review_schedules (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade,
  captured_word_id uuid references captured_words(id) on delete cascade,
  intervals jsonb,
  current_interval_index int default 0,
  last_review_at timestamptz,
  next_review_at timestamptz,
  review_count int default 0,
  consecutive_pass int default 0,
  ease float default 1.0,
  status text default 'active'
);

-- 用户学习统计
create table user_stats (
  user_id uuid primary key references auth.users(id) on delete cascade,
  streak int default 0,
  last_active_date date,
  total_learned int default 0,
  total_mastered int default 0
);

-- 启用行级安全（RLS）—— 每个用户只能访问自己的数据
alter table notebooks enable row level security;
alter table captured_words enable row level security;
alter table review_schedules enable row level security;
alter table user_stats enable row level security;

-- RLS 策略：用户只能 CRUD 自己的数据
create policy "用户管理自己的生词本" on notebooks for all using (auth.uid() = user_id);
create policy "用户管理自己的生词" on captured_words for all using (auth.uid() = user_id);
create policy "用户管理自己的复习计划" on review_schedules for all using (auth.uid() = user_id);
create policy "用户管理自己的统计" on user_stats for all using (auth.uid() = user_id);
```

### 3.3 获取 API 密钥

**用户操作**：在 Supabase Dashboard → Settings → API：
- 记下 **Project URL**（形如 `https://xxx.supabase.co`）
- 记下 **anon public key**（一长串 JWT）

### 3.4 配置环境变量

**用户操作**：在 Vercel 项目 → Settings → Environment Variables 添加：
- `VITE_SUPABASE_URL` = 你的 Project URL
- `VITE_SUPABASE_ANON_KEY` = 你的 anon key

**本地开发**：在项目根目录创建 `.env.local` 文件（已被 gitignore）：
```
VITE_SUPABASE_URL=https://xxx.supabase.co
VITE_SUPABASE_ANON_KEY=eyJxxx...
```

### 3.5 代码实现（助手操作）

**新增文件**：
- `src/lib/supabase.ts` — Supabase 客户端初始化
- `src/stores/useAuthStore.ts` — 登录/注册/登出状态管理
- `src/components/auth/AuthModal.tsx` — 登录/注册弹窗（邮箱密码登录）
- `src/lib/sync.ts` — 数据同步层（本地 IndexedDB ↔ Supabase 双向同步）

**改造文件**：
- `src/stores/useVocabStore.ts` — captureWord / createNotebook 等方法加云端同步
- `src/stores/useReviewStore.ts` — recordReview 加云端同步
- `src/components/toolbar/TopToolbar.tsx` — 加登录/用户头像按钮
- `src/App.tsx` — 初始化时检测登录状态

**同步策略**：
- 写操作：本地先写 IndexedDB（即时反馈），后台异步推送 Supabase
- 读操作：登录时从 Supabase 拉取最新数据合并到本地
- 冲突解决：以 `captured_at` / `last_review_at` 时间戳为准，新覆盖旧

**登录流程**：
1. 用户点"登录"按钮 → 弹窗显示邮箱密码表单
2. 注册：Supabase auth.signUp，自动创建默认生词本
3. 登录：auth.signInWithPassword，拉取云端数据合并到本地
4. 未登录用户：纯本地使用，数据不丢失，登录后自动同步

### 3.6 Supabase Auth 配置

**用户操作**：在 Supabase Dashboard → Authentication → Providers：
- 确认 Email 已启用
- 关闭 "Confirm email"（参赛演示无需邮箱验证，方便评委快速注册）
- 可选：启用 GitHub OAuth（更方便评委登录）

---

## 阶段 4：背单词体验细化

### 4.1 Review 卡片增强

**改造文件**：`src/components/memorize/MemorizeCardView.tsx`
- 翻面后显示：当前词在第几轮复习、下次复习时间（如"明天复习"）、累计复习次数
- 用进度环显示该词的掌握进度（6 次认识 = 100%）

### 4.2 记忆曲线可视化

**新增文件**：`src/components/memorize/EbbinghausChart.tsx`
- 在背单词主页显示一条 7 天/30 天的复习日历条
- 每天显示到期词数（柱状图）
- 点某天查看具体复习词列表

### 4.3 连续打卡天数

**改造文件**：
- `src/stores/useReviewStore.ts` — 加 streak 计算（连续 N 天有学习/复习记录）
- `src/components/memorize/MemorizeScreen.tsx` — 主页顶部显示"🔥 连续打卡 X 天"

### 4.4 演示模式打磨

**改造文件**：`src/components/player/VideoDropZone.tsx`
- "加载演示视频"按钮加 loading 进度提示
- 视频加载失败时显示友好错误（如 COS 流量超限）

---

## 阶段 5：测试与上线

### 5.1 本地测试清单

**用户操作**：
- [ ] `npm run dev` 启动本地，测试所有功能
- [ ] 拖入视频 → 字幕加载 → 点词查义 → 加入生词本
- [ ] 切换词书 → 字幕高亮刷新
- [ ] 背单词 Learn → 翻卡 → 不认识循环 → 结果统计
- [ ] 背单词 Review → 到期词复习（需要先 Learn 一些词）
- [ ] 多生词本：新建/重命名/删除/设默认/移动单词
- [ ] 登录/注册 → 数据同步

### 5.2 部署测试清单

**用户操作**（Vercel 部署后）：
- [ ] PC 浏览器访问线上域名，全流程测试
- [ ] 手机浏览器访问，测试 PWA 安装
- [ ] 手机安装到主屏幕后，作为 App 使用
- [ ] PC 登录后加生词，手机登录查看是否同步

### 5.3 评委演示路径

**建议演示流程**：
1. 打开网站 → 点"加载演示视频" → Friends 视频 2 秒内开播
2. 暂停 → 点击字幕单词 → 查看释义卡片 → 加入生词本
3. 切换词书（六级 → 托福）→ 字幕高亮实时刷新
4. 进入"背单词" → Learn → 学习视频中词汇
5. 退出 → 重新进入 → Review（如果有到期词）
6. 手机扫码访问 → 安装 PWA → 同账号登录 → 查看生词同步

---

## 执行顺序与配合点

| 步骤 | 操作方 | 任务 |
|------|--------|------|
| 1 | 用户 | 推送代码到 GitHub |
| 2 | 用户 | Vercel 导入项目部署 |
| 3 | 用户 | 绑定个人域名 |
| 4 | 用户 | 更新 COS CORS Origin 为真实域名 |
| 5 | 用户 | 准备 PWA 图标（512x512 PNG）或让助手生成 |
| 6 | 助手 | 检查 PWA 配置，必要时调整 |
| 7 | 用户 | 注册 Supabase，执行 SQL 建表 |
| 8 | 用户 | 获取 Supabase API 密钥，配置 Vercel 环境变量 |
| 9 | 助手 | 实现 Supabase 集成代码（auth + 同步） |
| 10 | 助手 | 实现背单词体验细化 |
| 11 | 用户 | 本地 + 线上全流程测试 |
| 12 | 助手 | 修复测试中发现的问题 |

## 当前立即可以开始

**先做阶段 1（Vercel 部署）**：
1. 你先把代码推到 GitHub
2. 在 Vercel 部署
3. 拿到临时域名后告诉我，我们继续后续步骤

**同时可以并行**：
- 你准备 PWA 图标（512x512 的 VocScreen logo PNG）
- 我开始写 Supabase 集成代码（不依赖你的 Supabase 项目，先写代码框架，等你建好项目填入密钥即可）
