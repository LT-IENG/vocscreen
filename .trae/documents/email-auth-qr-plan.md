# 邮箱验证 + 游客模式 + 二维码 + Vercel 部署 实施计划

## 概述

将注册登录改为邮箱验证流程（已完成），保留游客模式，在背单词界面添加二维码供手机扫码直连，并提供 Vercel 环境变量配置指导。

---

## 当前状态分析

### 已完成（上一轮会话）
1. **`src/stores/useAuthStore.ts`** — 已重写
   - `signUp(email, password)`：注册时若 `data.session === null`，返回 `{ needsVerification: true }`，并设置 `pendingEmail`
   - `signIn(email, password)`：映射 "Email not confirmed" → "请先点击邮件中的链接完成验证"
   - `resendVerification(email)`：重发验证邮件
   - `init()`：监听 `onAuthStateChange`，username 从 `email.split('@')[0]` 提取

2. **`src/components/auth/AuthModal.tsx`** — 已重写
   - `email` 输入框（`type="email"`）替代 username
   - `view: 'form' | 'awaiting-verify'` 双视图
   - awaiting-verify 视图：显示"验证邮件已发送至 {pendingEmail}"，含"重新发送"和"已验证，去登录"按钮
   - 底部游客提示："不登录也可使用，数据仅存本地"

### 待办
- **Task #35**：`src/lib/sync.ts` — 添加迁移标记，防止游客数据登录后重复全量 push
- **Task #36a**：`src/components/memorize/MemorizeScreen.tsx` — Home phase 头部添加二维码按钮 + Modal
- **Task #36b**：`src/App.tsx` — 检测 `?screen=memorize` URL 参数，扫码直入背单词界面
- **Task #37**：`.trae/documents/supabase-schema.sql` — 更新底部注释（从"关闭邮箱验证"改为"开启邮箱验证"）
- **Task #38**：Vercel 环境变量配置指导（用户操作）

---

## 具体改动

### Task #35: `src/lib/sync.ts` — 迁移标记

**问题**：游客模式下数据存在 IndexedDB（ID 为 `crypto.randomUUID()`），登录后 `pushLocalToCloud` 会全量上传。但每次刷新页面（已登录状态）都会重复执行全量 push，浪费网络请求。

**方案**：新增 `migrateLocalToCloud(userId)` 包装函数：
```typescript
export async function migrateLocalToCloud(userId: string) {
  const key = 'vocscreen_migrated_' + userId
  if (localStorage.getItem(key)) return  // 已迁移，跳过
  await pushLocalToCloud(userId)
  localStorage.setItem(key, '1')
}
```

**保留** `pushLocalToCloud` 原函数不变（供未来"手动全量同步"使用）。

**修改 `src/App.tsx`**：
- 第 28 行 import：`pullCloudToLocal, pushLocalToCloud` → `pullCloudToLocal, migrateLocalToCloud`
- 第 120 行：`await pushLocalToCloud(user.id)` → `await migrateLocalToCloud(user.id)`
- 第 132 行：`await pushLocalToCloud(state.user.id)` → `await migrateLocalToCloud(state.user.id)`

---

### Task #36a: `src/components/memorize/MemorizeScreen.tsx` — 二维码按钮

**位置**：Home phase 头部（第 380-396 行），在 `<div className="flex-1" />` 和主题按钮之间插入二维码按钮。

**改动**：
1. **import**（第 11 行）：在 phosphor-icons 导入中添加 `QrCode`
   ```typescript
   import {
     ArrowLeft, GraduationCap, Check, X, Repeat, VideoCamera,
     BookOpen, Notebook, Lightning, Clock, Sparkle, Warning, QrCode,
   } from '@phosphor-icons/react'
   ```

2. **新增 state**（第 76 行附近，`showExitConfirm` 后）：
   ```typescript
   const [showQrModal, setShowQrModal] = useState(false)
   ```

3. **Home phase 头部插入按钮**（第 388-389 行之间）：
   ```tsx
   <div className="flex-1" />
   <button
     onClick={() => setShowQrModal(true)}
     className="w-8 h-8 flex items-center justify-center rounded-lg bg-transparent border border-surface-border/40 text-sm hover:border-purple/30 hover:bg-surface-1/50 transition-colors"
     title="手机扫码背单词"
   >
     <QrCode size={16} />
   </button>
   <button onClick={() => setTheme(...)} ...>...</button>
   ```

4. **在 Home phase 的 JSX 末尾（`</div>` 闭合前，第 469 行前）添加 QR Modal**：
   ```tsx
   <Modal isOpen={showQrModal} onClose={() => setShowQrModal(false)}>
     <div className="w-[300px] max-w-[90vw] p-6 space-y-4 text-center">
       <h3 className="text-base font-semibold text-ink">手机扫码背单词</h3>
       <p className="text-xs text-ink-muted">用手机扫描下方二维码，直接进入背单词界面</p>
       <div className="w-40 h-40 mx-auto bg-white rounded-lg flex items-center justify-center p-2">
         <img
           src={`https://api.qrserver.com/v1/create-qr-code/?size=160x160&data=${encodeURIComponent(window.location.origin + '/?screen=memorize')}`}
           alt="QR Code"
           className="w-full h-full"
           loading="lazy"
         />
       </div>
       <p className="text-[10px] text-ink-muted/70">登录同一账号即可同步进度</p>
     </div>
   </Modal>
   ```

**参考**：`src/components/vocab/ProfilePanel.tsx` 第 105-112 行已有相同 `api.qrserver.com` 模式。

---

### Task #36b: `src/App.tsx` — URL 参数检测

**改动**：在 `useEffect`（第 99 行）开头、`initialized.current = true` 之后，添加 URL 参数检测：

```typescript
useEffect(() => {
  if (initialized.current) return
  initialized.current = true

  // 检测 ?screen=memorize 参数（手机扫码直入）
  const params = new URLSearchParams(window.location.search)
  if (params.get('screen') === 'memorize') {
    useUIStore.getState().setAppScreen('memorize')
    history.replaceState({}, '', window.location.pathname)  // 清理 URL
  }

  // ... 其余 init 逻辑不变
```

**说明**：`history.replaceState` 清除 URL 中的 `?screen=memorize`，避免刷新时重复跳转。

---

### Task #37: `.trae/documents/supabase-schema.sql` — 更新注释

**改动**：第 108-112 行，将"关闭邮箱验证"注释改为"开启邮箱验证"：

```sql
-- ============================================
-- 6. 开启邮箱验证（Dashboard 操作）
-- ============================================
-- 这一步需要在 Dashboard 操作：
-- Authentication → Providers → Email → 开启 "Confirm email"
-- 注册后用户会收到验证邮件，点击链接后才能登录
```

---

### Task #38: Vercel 环境变量配置（用户操作指导）

部署前需在 Vercel 项目设置中添加两个环境变量：

| Key | Value |
|-----|-------|
| `VITE_SUPABASE_URL` | `https://vkgysxgqtjxmepglefpc.supabase.co` |
| `VITE_SUPABASE_ANON_KEY` | `sb_publishable_oOpSoY7yGOLrK0V1nNzpKQ_oIOlZ9LL` |

**路径**：Vercel 项目 → Settings → Environment Variables → 添加上述两项 → Production/Preview/Development 全选 → Save。

**部署方式**：推送代码到 GitHub `main` 分支后，Vercel 自动触发部署；或在 Vercel Dashboard → Deployments → 点击最新部署的 "Redeploy"。

---

### Supabase 后端配置（用户操作）

1. **开启邮箱验证**：Supabase Dashboard → Authentication → Providers → Email → 确认 "Confirm email" 已开启（默认开启）
2. **配置重定向 URL**：Authentication → URL Configuration → Site URL 设为 `https://你的域名`，Redirect URLs 添加 `https://你的域名`
3. **执行 SQL**：SQL Editor → New Query → 粘贴 `.trae/documents/supabase-schema.sql` 内容 → Run
   - 若之前已执行过旧版 SQL，本次只需执行第 108-112 行的注释更新部分（实际为说明性注释，无需重新执行）

---

## 假设与决策

1. **QR 码生成**：复用 `api.qrserver.com` 外部 API（与 ProfilePanel 一致），不引入 npm 依赖
2. **迁移标记存储**：使用 `localStorage`（key 为 `vocscreen_migrated_<userId>`），简单可靠
3. **URL 参数**：仅支持 `?screen=memorize` 一种，扫码后直达背单词界面，`history.replaceState` 清理 URL
4. **游客模式数据**：登录后通过 `pullCloudToLocal → migrateLocalToCloud` 合并到云端，游客数据 ID（UUID）不与云端冲突
5. **邮箱验证流程**：`signUp` 后 `session` 为 `null`，用户需点击邮件链接，链接点击后 Supabase 重定向回站点，`detectSessionInUrl: true` 自动建立会话

---

## 验证步骤

### 代码验证
1. 运行 `npx tsc -b` 确认无 TypeScript 编译错误
2. 运行 `npm run build` 确认 Vite 构建成功

### 功能验证（本地 dev）
1. **邮箱注册**：打开 AuthModal → 切换到注册 → 输入邮箱密码 → 提交 → 显示"验证邮件已发送"视图
2. **重发验证**：点击"重新发送验证邮件" → 按钮变为"已重新发送"
3. **游客模式**：关闭 AuthModal → 提示"不登录也可使用" → 正常使用所有功能
4. **二维码**：进入背单词界面 → 点击头部二维码图标 → 弹出 Modal 显示二维码图片
5. **扫码直入**：用手机扫描二维码 → 手机浏览器打开 `?screen=memorize` → 自动进入背单词界面
6. **URL 清理**：进入后 URL 不再包含 `?screen=memorize` 参数

### 部署后验证
1. 在 Vercel 配置环境变量后重新部署
2. 访问线上地址，确认 Supabase 连接正常（控制台无 placeholder 警告）
3. 完整走通：注册 → 收到验证邮件 → 点击链接 → 自动登录 → 数据同步

---

## 实施顺序

1. ✅ Task #35: sync.ts 添加 `migrateLocalToCloud` + App.tsx 替换调用
2. ✅ Task #36a: MemorizeScreen.tsx 添加二维码按钮 + Modal
3. ✅ Task #36b: App.tsx 添加 URL 参数检测
4. ✅ Task #37: supabase-schema.sql 更新注释
5. ✅ TypeScript 编译验证
6. ✅ Git commit & push
7. ⏳ Task #38: 用户配置 Vercel 环境变量（提供指导）
8. ⏳ 用户在 Supabase 开启邮箱验证 + 执行 SQL
