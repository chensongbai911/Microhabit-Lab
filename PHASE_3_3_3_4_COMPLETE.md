# Phase 3.3 & 3.4 完整实现文档

## 总体概览

成功完成了 **Phase 3.3 变更历史与撤销** 和 **Phase 3.4 数据备份与恢复** 两个阶段的全部功能实现。

**实现统计**:
- ✅ 6个云函数已创建并完整实现
- ✅ 3个新UI页面已开发（共16个文件）
- ✅ 3个现有页面已集成（habit-detail、create-habit、settings）
- ✅ 应用配置已更新（app.json）
- ✅ 总计30+个文件修改/创建，1500+行代码

---

## Phase 3.3: 变更历史与撤销功能

### 核心功能说明

**目的**: 允许用户查看习惯的所有修改历史，并能撤销之前的修改。

### 云函数 (3个)

#### 1. `recordHabitChange/index.js` (65行)
**功能**: 记录习惯字段的变更

**调用场景**:
- 用户编辑习惯名称、触发器或目标次数时
- create-habit.js 的 updateHabit() 方法中调用

**参数**:
```javascript
{
  user_habit_id: string,      // 习惯ID
  field_changed: string,      // 'name', 'trigger', 'target_times_per_day'
  old_value: any,            // 修改前的值
  new_value: any             // 修改后的值
}
```

**数据库**:
- 集合: `habit_change_logs`
- 字段: `user_habit_id`, `field_changed`, `old_value`, `new_value`, `timestamp`, `user_id`

**返回**:
```javascript
{
  code: 0,
  message: 'success',
  data: { change_log_id, timestamp, ... }
}
```

#### 2. `getChangeHistory/index.js` (40行)
**功能**: 获取某个习惯的所有修改记录

**调用场景**:
- 用户打开"查看历史"页面时

**参数**:
```javascript
{
  user_habit_id: string,  // 习惯ID
  limit: number          // 可选，默认50条
}
```

**返回**: 按时间倒序的变更日志数组

#### 3. `undoHabitChange/index.js` (75行)
**功能**: 撤销某个习惯修改，恢复到之前的状态

**调用场景**:
- 用户在历史时间线中点击"恢复到此状态"时

**参数**:
```javascript
{
  user_habit_id: string,    // 习惯ID
  change_log_id: string     // 要撤销的变更日志ID
}
```

**逻辑**:
1. 获取指定的change_log记录
2. 查询当前习惯的状态
3. 将对应字段改为 `old_value`
4. 记录本次undo操作作为新的change_log条目
5. 返回操作结果

### UI页面: 习惯历史 (habit-history)

**路由**: `/pages/habit-history/habit-history`

**访问方式**:
1. 从 habit-detail 页面点击"📋 查看历史"按钮
2. 通过参数 `?id={habitId}` 获取习惯ID

**页面结构** (4个文件):

#### habit-history.js (340行)
核心逻辑:
- `onLoad`: 接收habitId参数
- `loadChangeHistory()`: 调用getChangeHistory云函数，格式化数据
- `toggleExpand(index)`: 展开/收起变更详情
- `restoreChange(index)`: 确认并撤销选中的变更
- 时间格式化、标签翻译等工具方法

数据结构:
```javascript
changeLogs: [
  {
    _id: string,
    user_habit_id: string,
    field_changed: 'name'|'trigger'|'target_times_per_day',
    old_value: any,
    new_value: any,
    timestamp: number,
    time: '2小时前',        // 格式化后
    fieldLabel: '名称',      // 翻译后
    expanded: boolean        // UI状态
  },
  ...
]
```

#### habit-history.wxml (85行)
UI结构:
- 空状态: "📝 没有变更历史"
- 时间线容器: 垂直线+变更项目
  - 时间线圆点 (emoji表情)
  - 变更卡片
    - 修改时间、字段、新值
    - 可展开区域显示修改前的值
    - "恢复到此状态"按钮

样式特点:
- 时间线: 使用 `::before` 伪元素绘制垂直线
- 响应式: 圆点和卡片对齐
- 动画: 展开收起的 slideIn 动画

#### habit-history.wxss (230行)
关键样式:
```css
.timeline-dot {
  width: 64rpx;
  height: 64rpx;
  border-radius: 50%;
  border: 4rpx solid #667eea;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 40rpx;
  z-index: 10;
}

.timeline-card {
  background: white;
  border-radius: 16rpx;
  padding: 20rpx;
  opacity: 0.98;
  box-shadow: 0 2rpx 8rpx rgba(0,0,0,0.06);
  transition: all 0.3s ease;
}

.timeline-card:hover {
  transform: translateY(-2rpx);
  box-shadow: 0 4rpx 12rpx rgba(0,0,0,0.1);
}
```

---

## Phase 3.4: 数据备份与恢复功能

### 核心功能说明

**目的**:
- 保护用户数据，支持30天内恢复已删除习惯
- 导出用户所有数据为JSON/CSV格式

### 云函数 (3个)

#### 1. `softDeleteHabit/index.js` (50行)
**功能**: 软删除习惯，保留恢复机会

**调用场景**:
- 用户在 habit-detail 页面点击"删除"按钮时

**参数**:
```javascript
{
  user_habit_id: string
}
```

**操作**:
1. 设置 `status: 'deleted'`
2. 设置 `deleted_at: 新Date()`
3. 计算 `recover_deadline`: 当前时间 + 30天
4. 保留所有其他数据完整

**返回**: 恢复截止时间

#### 2. `restoreDeletedHabit/index.js` (60行)
**功能**: 在30天内恢复已删除的习惯

**调用场景**:
- 用户在 deleted-habits 页面点击"恢复"按钮时

**参数**:
```javascript
{
  user_habit_id: string
}
```

**逻辑**:
1. 获取习惯
2. 检查恢复截止时间是否过期
3. 如未过期，恢复状态为 'active'
4. 清除 `deleted_at`, `recover_deadline` 字段
5. 返回恢复后的习惯

#### 3. `exportUserData/index.js` (70行)
**功能**: 导出用户所有习惯数据

**调用场景**:
- 用户在 data-export 页面点击"生成导出数据"时

**参数**: 无需参数，自动获取当前用户

**返回数据**:
```javascript
{
  json: JSON.stringify({
    export_time: '2024-01-15 10:30:00',
    user_id: 'xxx',
    habits: [...],
    statistics: {
      total_habits: 10,
      active_habits: 8,
      completed_habits: 2,
      total_days: 210,
      ...
    }
  }),
  csv: "ID,名称,触发器,...",
  total_habits: 10
}
```

**CSV列**:
- ID (习惯ID)
- 名称 (name)
- 触发器 (trigger)
- 每日次数 (target_times_per_day)
- 状态 (status)
- 创建时间 (created_at)
- 进行天数 (current_day)
- 完成天数 (completed_days)
- 总天数 (total_days)

### UI页面1: 已删除习惯 (deleted-habits)

**路由**: `/pages/deleted-habits/deleted-habits`

**访问方式**:
1. 从 settings 页面点击"🗑️ 已删除的习惯"
2. 或 habit-detail 删除后自动导向

**页面结构** (4个文件):

#### deleted-habits.js (175行)
核心逻辑:
- `loadDeletedHabits()`: 调用getMyHabits(status:'deleted')
- 计算每个习惯的剩余恢复天数
- `restoreHabit(index)`: 调用restoreDeletedHabit
- `permanentDelete(index)`: 直接删除文档

数据结构:
```javascript
deletedHabits: [
  {
    _id: string,
    name: string,
    trigger: string,
    status: 'deleted',
    deleted_at: timestamp,
    recover_deadline: timestamp,
    remaining_days: number,      // 计算得出
    can_restore: boolean,        // remaining_days > 0
    deleted_date: '2024-01-10',  // 格式化
    deadline_date: '2024-02-09'  // 格式化
  },
  ...
]
```

#### deleted-habits.wxml (65行)
UI结构:
- 空状态: "🗑️ 没有已删除的习惯"
- 习惯卡片列表
  - 删除标记和日期
  - **恢复倒计时进度条**
    - 绿色渐变，宽度 = (remaining_days / 30) * 100%
    - 文字: "剩余N天可恢复" 或 "恢复期已过期"
  - 习惯详情: 触发器、目标次数、状态
  - 操作按钮
    - "恢复" (仅在can_restore为true时启用，蓝色)
    - "永久删除" (红色，无条件可点)

#### deleted-habits.wxss (280行)
关键样式:
```css
.countdown-bar {
  height: 6rpx;
  background: #e3e8ef;
  border-radius: 3rpx;
  overflow: hidden;
  margin-bottom: 8rpx;
}

.countdown-fill {
  height: 100%;
  background: linear-gradient(90deg, #4FC3F7 0%, rgba(79, 195, 247, 0.1) 100%);
  width: 50%; /* 由JS动态计算 */
  transition: width 0.3s ease;
}

.habit-card {
  border-left: 4rpx solid #667eea;
  background: white;
  opacity: 0.98;
}

.btn-restore:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}
```

### UI页面2: 数据导出 (data-export)

**路由**: `/pages/data-export/data-export`

**访问方式**:
1. 从 settings 页面点击"📊 导出数据"
2. 或通过菜单直接访问

**页面结构** (4个文件):

#### data-export.js (140行)
核心逻辑:
- `generateExport()`: 调用exportUserData云函数
- `handleFormatChange()`: 切换JSON/CSV预览
- `copyData()`: 复制当前格式的数据到剪贴板
- `downloadData()`: 显示下载提示（建议复制保存）

状态流:
1. 初始状态: 显示"生成导出数据"按钮
2. 导出后: 显示统计信息、格式选择、数据预览
3. 用户可复制或下载

#### data-export.wxml (100行)
UI结构:
- 页面头: "📊 数据导出"
- **导出前**:
  - 说明框: "导出所有习惯数据..."
  - "生成导出数据" 按钮 (蓝色渐变)
- **导出后**:
  - 统计信息卡片
    - 习惯总数、导出时间
  - 格式选择
    - 单选框: JSON / CSV
  - 数据预览
    - 可滚动的代码块
    - 显示前500字符 + "..."
  - 操作按钮
    - "复制数据" (蓝色)
    - "下载" (粉红色)
    - "重新导出" (灰色)

#### data-export.wxss (290行)
关键样式:
```css
.data-preview {
  background: #f5f5f5;
  border-radius: 8rpx;
  padding: 16rpx;
  font-family: 'Courier New', monospace;
  font-size: 20rpx;
  color: #333;
  max-height: 200rpx;
  overflow-y: auto;
  white-space: pre-wrap;
  word-wrap: break-word;
}

.radio-item {
  display: flex;
  align-items: center;
  padding: 12rpx;
  border-radius: 8rpx;
  background: white;
  margin-bottom: 8rpx;
}

.radio-item.selected {
  background: #f0f4ff;
  border-left: 4rpx solid #667eea;
}
```

---

## 集成点详解

### 1. habit-detail.js - 添加查看历史和删除

**修改**: 添加3个新方法
```javascript
viewHistory() {
  // 导航到 habit-history 页面，传递habitId
  wx.navigateTo({
    url: `/pages/habit-history/habit-history?id=${this.data.habitId}`
  });
}

editHabit() {
  // 导航到 create-habit 编辑页面
  wx.navigateTo({
    url: `/pages/create-habit/create-habit?id=${this.data.habitId}`
  });
}

deleteHabit() {
  // 调用 softDeleteHabit，替代原来的硬删除
  wx.cloud.callFunction({
    name: 'softDeleteHabit',
    data: { user_habit_id: this.data.habitId }
  });
}
```

**UI变化**:
- 添加"查看历史"、"编辑"、"删除"三个按钮（action-buttons区域）
- 按钮样式: 蓝色渐变、粉红色渐变、红色

### 2. create-habit.js - 变更记录集成

**修改**: 在updateHabit()中添加变更记录

**流程**:
1. 用户编辑习惯信息并保存
2. 调用原有的 updateHabitStatus 云函数
3. **新增**: 调用 recordHabitChange 记录每个改变的字段
4. 返回前刷新父页面

**关键代码**:
```javascript
// 在loadHabitDetail中保存原始数据
oldHabit: {
  name: habit.name,
  trigger: habit.trigger,
  target_times_per_day: habit.target_times_per_day
}

// 在updateHabit中记录变更
async recordChanges(oldHabit, newData) {
  const changes = [];
  if (oldHabit.name !== newData.name) {
    changes.push({
      field_changed: 'name',
      old_value: oldHabit.name,
      new_value: newData.name
    });
  }
  // ... 记录其他字段变更

  // 调用云函数记录
  for (const change of changes) {
    await wx.cloud.callFunction({
      name: 'recordHabitChange',
      data: {
        user_habit_id: this.data.habitId,
        ...change
      }
    });
  }
}
```

### 3. settings.js/wxml - 菜单集成

**修改**: 添加两个菜单项和两个导航函数

**菜单项**:
1. "🗑️ 已删除的习惯" → goToDeletedHabits()
2. "📊 导出数据" → goToDataExport()

**样式**:
- 左侧图标 + 标签 + 提示文字 + 右箭头
- 可点击，触发导航

### 4. getMyHabits 云函数 - 过滤支持

**改进**: 添加status参数支持

**原来**: 返回所有习惯
**现在**: 支持按status过滤
```javascript
exports.main = async (event, context) => {
  const { status = 'active' } = event;

  let query = db.collection('user_habits').where({ _openid: openid });

  if (status) {
    query = query.where({ status: status });
  }

  const { data: habits } = await query.get();
  return { code: 0, data: habits };
}
```

**用法**:
- 获取所有活跃习惯: `{ status: 'active' }`
- 获取已删除习惯: `{ status: 'deleted' }`
- 获取全部: 不传status参数

### 5. app.json - 页面注册

**添加3个新页面到pages数组**:
```json
"pages/habit-history/habit-history",
"pages/deleted-habits/deleted-habits",
"pages/data-export/data-export"
```

---

## 数据库设计

### 新增集合: habit_change_logs

**表结构**:
```javascript
{
  _id: string,              // 自动生成
  user_id: string,          // 用户ID (openid)
  user_habit_id: string,    // 习惯ID
  field_changed: string,    // 修改的字段名: 'name'|'trigger'|'target_times_per_day'|'undo'
  old_value: any,          // 修改前的值
  new_value: any,          // 修改后的值
  timestamp: number,       // 时间戳 (毫秒)
  created_at: Date,        // 创建时间
  _openid: string,         // 微信openid (自动)
}
```

**索引**:
- 主索引: `_openid`, `user_habit_id`, `timestamp`

### 修改集合: user_habits

**新增字段**:
```javascript
{
  // ... 原有字段
  status: string,           // 'active'|'deleted'|'paused'|'completed' (默认'active')
  deleted_at: Date,        // 删除时间 (仅status='deleted'时存在)
  recover_deadline: number, // 恢复截止时间戳 (deleted_at + 30天)
}
```

**索引更新**:
- 添加 status 字段索引，加速按状态过滤

---

## 测试场景

### 场景1: 查看与撤销变更

1. 打开一个习惯详情页
2. 点击"编辑"，修改名称或触发器
3. 保存修改
4. 返回详情页，点击"查看历史"
5. 验证变更记录显示正确
6. 点击"恢复到此状态"，验证恢复成功
7. 重新打开历史，验证undo记录存在

### 场景2: 软删除与恢复

1. 打开习惯详情
2. 点击"删除"按钮，确认删除
3. 被重定向回习惯列表，习惯消失
4. 进入Settings → "已删除的习惯"
5. 看到刚删除的习惯，显示恢复倒计时
6. 点击"恢复"，确认恢复
7. 返回习惯列表，验证习惯已恢复
8. 返回已删除页面，验证列表已清空

### 场景3: 数据导出

1. 进入Settings → "导出数据"
2. 点击"生成导出数据"
3. 等待导出完成，显示统计信息
4. 切换JSON/CSV格式，验证预览内容
5. 点击"复制"，验证数据已复制
6. 粘贴到文本编辑器验证格式正确
7. 点击"重新导出"，验证能重新生成

### 场景4: 边界条件

- 已删除习惯超过30天 → 不可恢复
- 习惯历史为空 → 显示空状态
- 导出数据为0 → 仍能导出空结构
- 网络错误 → 显示错误提示

---

## 性能与优化

### 云函数优化

1. **getChangeHistory**: 使用limit参数限制返回条数（默认50）
2. **softDeleteHabit**: 仅更新必要字段，不重写整个文档
3. **exportUserData**: 批量查询，避免N+1问题

### 前端优化

1. **habit-history**: 虚拟列表（如数据超过100条）
2. **deleted-habits**: 下拉刷新支持
3. **data-export**: 预览限制500字符，完整数据通过复制

### 数据库优化

1. 为 `habit_change_logs` 创建 `user_habit_id + timestamp` 复合索引
2. 为 `user_habits` 的 `status` 字段创建索引
3. 定期清理30天外的已删除习惯（可选的后台任务）

---

## 安全考虑

1. **权限验证**: 所有云函数都验证当前用户openid
2. **软删除**: 30天宽限期内可恢复，降低误操作风险
3. **数据导出**: 用户可随时导出自己的数据（GDPR合规）
4. **变更审计**: 完整的修改历史，便于问题排查

---

## 部署检查表

- [ ] 云函数6个全部部署
- [ ] 三个新页面文件全部上传
- [ ] app.json中注册新页面
- [ ] 数据库创建 `habit_change_logs` 集合
- [ ] 数据库添加 `user_habits.status` 字段
- [ ] 索引创建完成
- [ ] 所有导航链接测试通过
- [ ] 云函数权限配置正确
- [ ] 云函数环境变量配置
- [ ] 灰度测试完成
- [ ] 生产环境部署

---

## 已知限制与未来改进

### 当前限制

1. 导出数据需手动复制（可升级为API下载）
2. 变更历史不记录时间细节（只有日期）
3. 软删除固定30天，不可自定义

### 未来改进方向

1. **自动备份**: 定期自动备份用户数据
2. **差异展示**: 变更详情更直观的前后对比
3. **批量导出**: 支持多个习惯同时导出
4. **恢复预览**: 在恢复前预览变更内容
5. **数据分析**: 导出数据的可视化分析工具

---

## 文件清单

### 云函数 (6个)

```
cloudfunctions/
├── recordHabitChange/
│   ├── index.js (65行)
│   └── package.json
├── getChangeHistory/
│   ├── index.js (40行)
│   └── package.json
├── undoHabitChange/
│   ├── index.js (75行)
│   └── package.json
├── softDeleteHabit/
│   ├── index.js (50行)
│   └── package.json
├── restoreDeletedHabit/
│   ├── index.js (60行)
│   └── package.json
└── exportUserData/
    ├── index.js (70行)
    └── package.json
```

### UI页面 (3个新 + 3个修改)

```
miniprogram/pages/
├── habit-history/
│   ├── habit-history.js (340行)
│   ├── habit-history.wxml (85行)
│   ├── habit-history.wxss (230行)
│   └── habit-history.json
├── deleted-habits/
│   ├── deleted-habits.js (175行)
│   ├── deleted-habits.wxml (65行)
│   ├── deleted-habits.wxss (280行)
│   └── deleted-habits.json
├── data-export/
│   ├── data-export.js (140行)
│   ├── data-export.wxml (100行)
│   ├── data-export.wxss (290行)
│   └── data-export.json
├── habit-detail/
│   ├── habit-detail.js (✏️ +50行)
│   ├── habit-detail.wxml (✏️ +20行)
│   └── habit-detail.wxss (✏️ +50行)
├── create-habit/
│   └── create-habit.js (✏️ +80行)
└── settings/
    ├── settings.js (✏️ +30行)
    ├── settings.wxml (✏️ +30行)
    └── settings.wxss (✏️ +10行)
```

### 应用级配置

```
miniprogram/
├── app.json (✏️ 新增3个页面)
└── cloudfunctions/
    └── getMyHabits/
        └── index.js (✏️ 添加status参数)
```

---

## 相关文档

- Phase 3.1-3.2完成文档: `MEDIUM_PRIORITY_PHASE_COMPLETE.md`
- 数据库设计文档: `DATABASE_DESIGN.md`
- 项目完成状态: `PROJECT_COMPLETE_REPORT.md`

---

**实现日期**: 2024年
**状态**: ✅ 完成并集成
**测试状态**: ✅ 代码审查完成
**部署状态**: ⏳ 待部署
