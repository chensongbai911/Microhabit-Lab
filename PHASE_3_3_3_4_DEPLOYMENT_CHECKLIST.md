# Phase 3.3 & 3.4 部署清单

## 📋 部署前检查

### 1. 代码完整性检查

- [x] 6个云函数代码完成
  - [x] recordHabitChange
  - [x] getChangeHistory
  - [x] undoHabitChange
  - [x] softDeleteHabit
  - [x] restoreDeletedHabit
  - [x] exportUserData

- [x] 3个新UI页面完成
  - [x] habit-history (4个文件)
  - [x] deleted-habits (4个文件)
  - [x] data-export (4个文件)

- [x] 现有页面集成完成
  - [x] habit-detail.js (3个新方法)
  - [x] habit-detail.wxml (action-buttons区域)
  - [x] habit-detail.wxss (按钮样式)
  - [x] create-habit.js (recordChanges方法)
  - [x] settings.js (2个导航函数)
  - [x] settings.wxml (管理菜单)
  - [x] settings.wxss (arrow样式)

- [x] 应用配置更新
  - [x] app.json (新增3个页面)
  - [x] getMyHabits/index.js (status参数)

### 2. 依赖检查

- [x] wx-server-sdk (云函数运行环境)
- [x] 微信小程序基础库 (最低版本检查)
- [x] 云数据库权限配置

### 3. 代码质量检查

- [x] 无语法错误
- [x] 无console.error 未捕获
- [x] 错误处理完整
- [x] 注释清晰

---

## 🗄️ 数据库准备

### 步骤1: 创建新集合

```javascript
// 进入微信云开发控制台

// 创建集合: habit_change_logs
db.createCollection('habit_change_logs');

// 文档结构
{
  "_id": "ObjectId",
  "user_habit_id": "String",
  "field_changed": "String",      // 'name'|'trigger'|'target_times_per_day'|'undo'
  "old_value": "Mixed",
  "new_value": "Mixed",
  "timestamp": "Number",
  "_openid": "String"
}
```

### 步骤2: 添加字段到user_habits

```javascript
// 编辑 user_habits 集合中的现有文档
// 添加以下字段（如果不存在）

// 字段1: status (String)
// 可选值: 'active' | 'paused' | 'deleted' | 'completed'
// 默认值: 'active'

// 字段2: deleted_at (Date)
// 删除时间，仅当 status='deleted' 时有值

// 字段3: recover_deadline (Number)
// 恢复截止时间戳，仅当 status='deleted' 时有值
// 计算: Date.now() + 30*24*60*60*1000
```

### 步骤3: 创建索引

```javascript
// 在 habit_change_logs 上创建索引
db.collection('habit_change_logs').createIndex({
  user_habit_id: 1,
  timestamp: -1
});

db.collection('habit_change_logs').createIndex({
  _openid: 1
});

// 在 user_habits 上创建索引
db.collection('user_habits').createIndex({
  status: 1
});

db.collection('user_habits').createIndex({
  _openid: 1,
  status: 1
});
```

### 步骤4: 迁移现有数据（可选）

```javascript
// 为所有现有习惯添加 status 字段
// 可在云函数中执行或手动更新

await db.collection('user_habits')
  .where({
    status: db.command.exists(false)
  })
  .update({
    data: {
      status: 'active'
    }
  });
```

---

## ☁️ 云函数部署

### 部署方式1: 使用微信开发者工具

1. **打开开发者工具**
   - 选择项目根目录
   - 进入"云开发"标签页

2. **部署每个云函数**
   ```
   右键点击 cloudfunctions 文件夹
   → 部署: 云函数
   → 选择环境
   → 上传并部署
   ```

3. **逐个部署**
   - recordHabitChange → 上传
   - getChangeHistory → 上传
   - undoHabitChange → 上传
   - softDeleteHabit → 上传
   - restoreDeletedHabit → 上传
   - exportUserData → 上传

4. **验证部署**
   - 每个函数右侧显示"云函数已部署"
   - 显示部署时间和ID

### 部署方式2: 命令行部署

```bash
# 进入项目目录
cd miniprogram

# 使用 wx-cli 工具部署
wx-cli login
wx-cli cloud deploy --functions recordHabitChange,getChangeHistory,undoHabitChange,softDeleteHabit,restoreDeletedHabit,exportUserData
```

### 部署后验证

```javascript
// 在小程序中测试调用
wx.cloud.callFunction({
  name: 'recordHabitChange',
  data: {
    user_habit_id: 'test_habit',
    field_changed: 'name',
    old_value: 'old',
    new_value: 'new'
  },
  success: res => {
    console.log('部署成功:', res);
  },
  fail: err => {
    console.error('部署失败:', err);
  }
});
```

---

## 📱 小程序端更新

### 步骤1: 上传新页面文件

```
miniprogram/pages/
├── habit-history/
│   ├── habit-history.js
│   ├── habit-history.wxml
│   ├── habit-history.wxss
│   └── habit-history.json
├── deleted-habits/
│   ├── deleted-habits.js
│   ├── deleted-habits.wxml
│   ├── deleted-habits.wxss
│   └── deleted-habits.json
├── data-export/
│   ├── data-export.js
│   ├── data-export.wxml
│   ├── data-export.wxss
│   └── data-export.json
```

**提交到版本控制**:
```bash
git add miniprogram/pages/habit-history/
git add miniprogram/pages/deleted-habits/
git add miniprogram/pages/data-export/
git commit -m "feat: Phase 3.3-3.4 add history, soft-delete, export"
```

### 步骤2: 确认app.json更新

```json
{
  "pages": [
    "pages/home/home",
    "pages/habits/habits",
    "pages/stats/stats",
    "pages/create-habit/create-habit",
    "pages/habit-detail/habit-detail",
    "pages/habit-history/habit-history",        // ✅ 新增
    "pages/deleted-habits/deleted-habits",      // ✅ 新增
    "pages/data-export/data-export",            // ✅ 新增
    "pages/membership/membership",
    "pages/settings/settings"
  ],
  // ... 其他配置
}
```

### 步骤3: 验证现有页面修改

检查以下文件已修改:
- [x] habit-detail.js - viewHistory, editHabit, deleteHabit
- [x] habit-detail.wxml - action-buttons区域
- [x] habit-detail.wxss - 按钮样式
- [x] create-habit.js - recordChanges方法
- [x] settings.js - goToDeletedHabits, goToDataExport
- [x] settings.wxml - 管理菜单
- [x] getMyHabits/index.js - status参数

### 步骤4: 编译和上传

```bash
# 在微信开发者工具中

# 1. 编译
Ctrl+Shift+B (或菜单 工具 > 编译)

# 2. 上传代码
Ctrl+U (或菜单 工具 > 上传代码)
  版本号: x.y.z (例如 3.4.0)
  项目备注: Phase 3.3-3.4 Add Change History and Data Export

# 3. 设置为体验版或发布
微信公众平台 → 版本管理 → 选择提交的版本
```

---

## 🧪 本地测试清单

### 测试1: 变更历史功能

```javascript
// 1. 编辑一个习惯
打开习惯详情
点击"✏️ 编辑"
修改"名称"或"触发器"
保存修改

// 2. 查看历史
返回详情页
点击"📋 查看历史"
验证: 显示刚才修改的记录

// 3. 撤销修改
在历史页点击修改项展开
点击"恢复到此状态"
验证: 习惯恢复到修改前

// 4. 查看撤销记录
返回历史页
验证: 显示新的 "撤销修改" 记录
```

### 测试2: 软删除与恢复

```javascript
// 1. 软删除
打开习惯详情
点击"🗑️ 删除"
确认删除
验证: 习惯从列表消失

// 2. 查看已删除
进入 Settings
点击"🗑️ 已删除的习惯"
验证: 看到刚删除的习惯
验证: 显示恢复倒计时进度条（绿色）

// 3. 恢复
点击"恢复"按钮
验证: 习惯重新出现在列表中

// 4. 永久删除
重新进入"已删除的习惯"
点击"永久删除"
验证: 习惯彻底消失
```

### 测试3: 数据导出

```javascript
// 1. 导出
进入 Settings
点击"📊 导出数据"
点击"生成导出数据"
等待加载完成
验证: 显示习惯总数和导出时间

// 2. 格式切换
选择"JSON"或"CSV"单选
验证: 数据预览相应变化

// 3. 复制
点击"复制数据"
验证: 弹出提示"已复制"

// 4. 验证内容
打开文本编辑器
粘贴数据
验证: JSON或CSV格式正确
```

### 测试4: 边界情况

```javascript
// 1. 超期恢复
创建一个习惯
删除它
修改本地时间到30天后 (测试用)
打开"已删除的习惯"
验证: "恢复"按钮禁用，显示"恢复期已过期"

// 2. 历史为空
新建习惯，不做任何修改
点击"查看历史"
验证: 显示"没有变更历史"空状态

// 3. 网络错误
关闭网络
点击某个操作
验证: 显示"网络错误"提示

// 4. 并发操作
快速编辑和删除
验证: 不出现数据不一致
```

---

## 🚀 灰度发布方案

### 第一阶段: Beta测试 (5-10% 用户)

1. **上传体验版**
   - 微信公众平台 → 开发 → 版本管理
   - 提交新版本代码
   - 选择"体验版"

2. **邀请测试用户**
   - 扫描体验版二维码
   - 10-20个内部测试用户

3. **收集反馈**
   - 监控错误日志
   - 统计用户反馈
   - 记录bug并修复

4. **监控指标**
   ```
   - 云函数调用成功率 > 99%
   - 平均响应时间 < 2000ms
   - 页面加载时间 < 3000ms
   - 错误率 < 0.1%
   ```

### 第二阶段: 小范围发布 (20-30% 用户)

1. **验证完成**
   - Beta阶段无严重bug
   - 性能指标达标

2. **发布到线上**
   ```
   微信公众平台
   → 开发版本发布
   → 输入版本号
   → 发布到30%用户
   ```

3. **继续监控**
   - 性能数据
   - 错误日志
   - 用户反馈

### 第三阶段: 全量发布 (100% 用户)

1. **确认无问题**
   - 30% 用户测试24小时
   - 无严重反馈

2. **全量发布**
   ```
   微信公众平台
   → 发布到全部用户
   → 30秒左右自动推送
   ```

3. **发布后监控** (24小时)
   - 实时监控各项指标
   - 如有异常准备回滚方案

---

## 🔄 回滚方案

### 如需紧急回滚

```javascript
// 方案1: 版本回滚
微信公众平台
→ 版本管理
→ 找到上一个稳定版本
→ 点击"设为线上版"
→ 确认

// 时间: 30秒内生效
// 注意: 不会影响已生成的change_logs数据
```

### 数据恢复

```javascript
// 如果需要恢复被软删除的习惯
// (超过30天自动无法恢复，需手动干预)

// 在云开发控制台执行:
db.collection('user_habits')
  .where({ _id: 'habit_id' })
  .update({
    data: {
      status: 'active',
      deleted_at: db.command.remove(),
      recover_deadline: db.command.remove()
    }
  });
```

---

## 📊 性能基准

### 云函数响应时间目标

| 函数 | 目标时间 | 实测 |
|-----|--------|------|
| recordHabitChange | < 500ms | ? |
| getChangeHistory | < 1000ms | ? |
| undoHabitChange | < 1500ms | ? |
| softDeleteHabit | < 500ms | ? |
| restoreDeletedHabit | < 500ms | ? |
| exportUserData | < 2000ms | ? |

### 页面加载时间目标

| 页面 | 目标时间 | 实测 |
|-----|--------|------|
| habit-history | < 2000ms | ? |
| deleted-habits | < 2000ms | ? |
| data-export | < 1500ms | ? |

---

## 📋 发布前最终检查

- [ ] 所有云函数已部署
- [ ] 数据库集合和字段已创建
- [ ] 所有新页面可正常访问
- [ ] 所有导航链接正常工作
- [ ] 变更历史功能测试通过
- [ ] 软删除和恢复功能测试通过
- [ ] 数据导出功能测试通过
- [ ] 网络错误处理已验证
- [ ] 性能指标达标
- [ ] 代码提交到版本控制
- [ ] 更新日志已准备
- [ ] 用户文档已准备

---

## 📞 部署支持

- 技术文档: `PHASE_3_3_3_4_COMPLETE.md`
- 快速开始: `PHASE_3_3_3_4_QUICK_START.md`
- 数据库设计: `DATABASE_DESIGN.md`

---

**部署日期**: [请填入实际部署日期]
**负责人**: [请填入负责人]
**状态**: ⏳ 待部署
