# Phase 3: 智能化增强 - 详细实现规划

**开始时间**: 2025-12-29
**预计工期**: 6-8小时
**目标**: 让系统更智能,提升用户体验到95分以上

---

## 🎯 Phase 3 核心目标

### 当前成熟度
- Phase 1 ✅: 编辑、删除、刷新完全可用
- Phase 2 ✅: 触发器分类和推荐系统完整
- Phase 3 🔄: **现在启动** - 智能化功能

### Phase 3 的4个任务

| 任务 | 目标 | 工时 | 难度 |
|------|------|------|------|
| **3.1** | 创建推荐系统 | 1.5h | 中 |
| **3.2** | 编辑智能提示 | 1.5h | 中 |
| **3.3** | 变更历史记录 | 1.5h | 高 |
| **3.4** | 数据备份恢复 | 1.5h | 高 |

**总计**: 6.0小时

---

## 📋 Task 3.1: 创建推荐系统 (1.5小时)

### 目标
在新建习惯时,推荐用户可能感兴趣的习惯

### 核心功能

**1. 推荐策略**
```javascript
// 基于用户已有习惯推荐新习惯
推荐算法:
  1. 分析用户已有习惯的分类
  2. 找出缺失的分类
  3. 推荐该分类的热门习惯
  4. 显示完成率数据

例:
  用户已有: [晨跑(晨间), 编程(工作)]
  缺失: [晚间, 健康]
  推荐: 睡前冥想(晚间), 做深蹲(健康)
```

**2. 实现文件: `utils/habitRecommend.js`**

```javascript
/**
 * 习惯推荐系统
 */

const habitTemplates = {
  morning: [
    { name: '晨跑', category: 'health', completionRate: 92 },
    { name: '冷水浴', category: 'health', completionRate: 85 },
    { name: '早读', category: 'study', completionRate: 88 }
  ],
  work: [
    { name: '番茄工作法', category: 'efficiency', completionRate: 78 },
    { name: '站立办公', category: 'health', completionRate: 72 },
    { name: '跟进任务', category: 'efficiency', completionRate: 82 }
  ],
  evening: [
    { name: '瑜伽拉伸', category: 'health', completionRate: 75 },
    { name: '睡前冥想', category: 'emotion', completionRate: 80 },
    { name: '日记反思', category: 'emotion', completionRate: 85 }
  ]
};

/**
 * 分析用户已有习惯的分类分布
 * @param {array} userHabits 用户的习惯列表
 * @return {object} 分类统计
 */
function analyzeHabitCategories(userHabits) {
  const categories = {};
  const triggers = {};

  userHabits.forEach(habit => {
    // 统计分类
    if (!categories[habit.category]) {
      categories[habit.category] = 0;
    }
    categories[habit.category]++;

    // 统计触发器分类
    if (!triggers[habit.triggerCategory]) {
      triggers[habit.triggerCategory] = 0;
    }
    triggers[habit.triggerCategory]++;
  });

  return { categories, triggers };
}

/**
 * 推荐新习惯
 * @param {array} userHabits 用户已有习惯
 * @param {number} count 推荐数量
 * @return {array} 推荐的习惯列表
 */
function recommendHabits(userHabits = [], count = 3) {
  const analysis = analyzeHabitCategories(userHabits);
  const recommendations = [];

  // 找出用户缺失最多的分类
  const allCategories = ['morning', 'work', 'evening'];
  const missingCategories = allCategories
    .sort((a, b) => (analysis.triggers[a] || 0) - (analysis.triggers[b] || 0))
    .slice(0, 2); // 缺失最多的2个

  // 从缺失分类中推荐习惯
  missingCategories.forEach(category => {
    const habits = habitTemplates[category];
    if (habits && habits.length > 0) {
      const habit = habits[Math.floor(Math.random() * habits.length)];
      recommendations.push({
        ...habit,
        triggerCategory: category
      });
    }
  });

  return recommendations.slice(0, count);
}

module.exports = {
  recommendHabits,
  analyzeHabitCategories,
  habitTemplates
};
```

**3. 改进 home.js - 显示推荐**

在首页添加推荐卡片:
```javascript
onShow() {
  this.loadTodayHabits();

  // 新增: 加载推荐习惯
  this.loadRecommendedHabits();
}

loadRecommendedHabits() {
  const { habits } = this.data;
  const habitRecommend = require('../../utils/habitRecommend.js');

  const recommended = habitRecommend.recommendHabits(habits, 3);
  this.setData({ recommendedHabits: recommended });
}
```

**4. UI: 首页推荐卡片**

在习惯列表下方添加推荐区域:
```wxml
<!-- 推荐新习惯 -->
<view class="recommended-section" wx:if="{{recommendedHabits && recommendedHabits.length > 0}}">
  <view class="recommended-header">
    <text class="recommended-title">💡 为你推荐</text>
    <text class="recommended-subtitle">{{recommendedHabits.length}}个适合你的微习惯</text>
  </view>

  <view class="recommended-items">
    <view wx:for="{{recommendedHabits}}"
          wx:key="name"
          class="recommended-item"
          bindtap="addRecommendedHabit"
          data-habit="{{item}}">
      <view class="recommended-info">
        <text class="recommended-habit">{{item.name}}</text>
        <text class="recommended-rate">完成率 {{item.completionRate}}%</text>
      </view>
      <view class="recommended-action">
        <text class="add-btn">+</text>
      </view>
    </view>
  </view>
</view>
```

**代码行数**: +150行

---

## 📋 Task 3.2: 编辑智能提示 (1.5小时)

### 目标
修改参数时显示对完成率的影响预测

### 核心功能

**1. 智能提示逻辑**

```javascript
/**
 * 计算修改对完成率的影响
 * @param {object} changes 修改的字段
 * @param {number} currentRate 当前完成率
 * @return {object} 影响预测
 */
function predictImpact(changes, currentRate = 85) {
  const impacts = {};

  // 修改频次的影响
  if (changes.target_times_per_day) {
    const increase = changes.target_times_per_day - 1; // 假设当前频次为1
    const rateChange = increase * -15; // 每增加1次,完成率下降15%
    impacts.completionRate = Math.max(currentRate + rateChange, 10);
    impacts.message = rateChange < 0
      ? `频次增加,完成率可能↓${Math.abs(rateChange)}%`
      : '保持现有频次';
  }

  // 修改触发器的影响
  if (changes.trigger) {
    const triggerRates = {
      '刷牙后': 94,
      '早餐后': 92,
      '睡前': 65
    };
    impacts.triggerRate = triggerRates[changes.trigger] || 75;
    impacts.triggerMessage = impacts.triggerRate > currentRate
      ? '新触发器更容易完成'
      : '新触发器可能更难完成';
  }

  return impacts;
}
```

**2. UI: 修改预警卡片**

在编辑表单中添加影响提示:
```wxml
<!-- 修改影响提示 -->
<view class="impact-warning" wx:if="{{showImpactWarning}}">
  <text class="impact-icon">⚠️</text>
  <view class="impact-content">
    <text class="impact-title">修改可能的影响</text>
    <text class="impact-text">{{impactMessage}}</text>
    <text class="impact-value">预期完成率: {{predictedRate}}%</text>
  </view>
</view>
```

**3. 实现方式**

在 create-habit.js 中监听表单变化:
```javascript
handleTriggerSelect(e) {
  const value = e.currentTarget.dataset.value;
  this.setData({
    'formData.trigger': value,
    showImpactWarning: true // 显示影响提示
  });

  // 计算影响
  this.predictModificationImpact();
}

predictModificationImpact() {
  const { formData, habitStatus } = this.data;
  const impacts = habitRecommend.predictImpact(
    formData,
    habitStatus?.completionRate || 85
  );

  this.setData({
    impactMessage: impacts.message,
    predictedRate: impacts.completionRate
  });
}
```

**代码行数**: +100行

---

## 📋 Task 3.3: 变更历史记录 (1.5小时)

### 目标
记录所有修改历史,支持撤销功能

### 核心功能

**1. 数据库改动**

在 user_habits collection 中添加字段:
```javascript
{
  _id: '...',
  name: '晨跑',
  trigger: '刷牙后',
  // ... 其他字段

  // 新增: 变更历史
  history: [
    {
      timestamp: 1703384400000,
      action: 'create',
      changes: { name: '晨跑', trigger: '刷牙后' }
    },
    {
      timestamp: 1703385200000,
      action: 'update',
      changes: { trigger: '早餐后' }, // 只记录改变的字段
      before: { trigger: '刷牙后' }
    }
  ]
}
```

**2. 云函数: recordChange**

```javascript
// cloudfunctions/recordChange/index.js
const cloud = require('wx-server-sdk');
cloud.init();
const db = cloud.database();

exports.main = async (event) => {
  const { user_habit_id, action, changes, before } = event;

  const change = {
    timestamp: Date.now(),
    action,
    changes,
    before: before || {}
  };

  await db.collection('user_habits').doc(user_habit_id).update({
    data: {
      history: db.command.push(change)
    }
  });

  return { code: 0, message: '记录成功' };
};
```

**3. 撤销功能**

```javascript
/**
 * 撤销上一次修改
 */
async undoLastChange(habitId) {
  const habit = await wx.cloud.callFunction({
    name: 'getHabitDetail',
    data: { user_habit_id: habitId }
  });

  const history = habit.result.data.habit.history || [];
  if (history.length === 0) {
    util.showToast('没有可撤销的修改');
    return;
  }

  const lastChange = history[history.length - 1];
  if (lastChange.action === 'create') {
    util.showToast('无法撤销创建操作');
    return;
  }

  // 恢复到上一个状态
  const previous = lastChange.before;
  await wx.cloud.callFunction({
    name: 'updateHabitStatus',
    data: {
      user_habit_id: habitId,
      action: 'update',
      updates: previous
    }
  });

  util.showToast('已撤销修改');
}
```

**4. UI: 变更历史查看**

新页面: `pages/habit-history/habit-history`
```wxml
<!-- 变更历史列表 -->
<view class="history-list">
  <view wx:for="{{history}}" wx:key="timestamp" class="history-item">
    <text class="history-time">{{formatTime(item.timestamp)}}</text>
    <text class="history-action">{{getActionText(item.action)}}</text>
    <view class="history-changes">
      <view wx:for="{{item.changes}}" wx:key="*this">
        {{getFieldLabel(key)}}: {{item.changes[key]}}
      </view>
    </view>
  </view>
</view>

<!-- 撤销按钮 -->
<button class="btn-undo" bindtap="handleUndo">↶ 撤销上一步</button>
```

**代码行数**: +200行

---

## 📋 Task 3.4: 数据备份恢复 (1.5小时)

### 目标
支持删除数据的30天恢复,以及数据备份下载

### 核心功能

**1. 软删除机制**

修改删除逻辑:
```javascript
// 原来: 直接删除
// 改为: 移到回收站(30天后自动删除)

async performDelete(habitId) {
  const deleteDate = Date.now();
  const expireDate = deleteDate + 30 * 24 * 60 * 60 * 1000; // 30天后过期

  await wx.cloud.callFunction({
    name: 'updateHabitStatus',
    data: {
      user_habit_id: habitId,
      action: 'delete',
      deleteDate: deleteDate,
      expireDate: expireDate
    }
  });
}
```

**2. 已删除列表页面**

新页面: `pages/deleted-habits/deleted-habits`
```wxml
<!-- 已删除的习惯列表 -->
<view class="deleted-list">
  <view wx:for="{{deletedHabits}}" wx:key="_id" class="deleted-item">
    <view class="deleted-info">
      <text class="deleted-name">{{item.name}}</text>
      <text class="deleted-trigger">{{item.trigger}}</text>
    </view>

    <view class="deleted-actions">
      <!-- 恢复按钮 -->
      <button class="btn-restore" bindtap="handleRestore" data-id="{{item._id}}">
        ↶ 恢复
      </button>

      <!-- 倒计时 -->
      <text class="delete-countdown">
        {{getDeleteCountdown(item.expireDate)}}天后永久删除
      </text>
    </view>
  </view>
</view>
```

**3. 恢复功能**

```javascript
async handleRestore(habitId) {
  wx.showModal({
    title: '恢复习惯',
    content: '确定要恢复这个习惯吗?\n所有数据都会保留。',
    success: (res) => {
      if (res.confirm) {
        wx.cloud.callFunction({
          name: 'updateHabitStatus',
          data: {
            user_habit_id: habitId,
            action: 'restore'
          }
        }).then(() => {
          util.showToast('恢复成功');
          this.loadDeletedHabits();
        });
      }
    }
  });
}
```

**4. 数据导出**

```javascript
// 导出为 JSON 或 CSV
async exportHabitData() {
  const habits = this.data.habits;
  const csvData = this.convertToCSV(habits);

  // 保存到本地
  wx.saveFile({
    tempFilePath: csvData,
    success: (res) => {
      util.showToast('已保存到相册');
    }
  });
}

convertToCSV(habits) {
  const headers = ['名称', '触发器', '频次', '完成率', '创建日期'];
  const rows = habits.map(h => [
    h.name,
    h.trigger,
    h.target_times_per_day,
    h.completion_rate,
    new Date(h.created_at).toLocaleDateString()
  ]);

  return [headers, ...rows]
    .map(row => row.join(','))
    .join('\n');
}
```

**代码行数**: +180行

---

## 📊 Phase 3 总体代码统计

| Task | 文件数 | 代码行 | 工时 |
|------|--------|--------|------|
| 3.1 推荐系统 | 3 | +150 | 1.5h |
| 3.2 智能提示 | 2 | +100 | 1.5h |
| 3.3 变更历史 | 3 | +200 | 1.5h |
| 3.4 数据恢复 | 3 | +180 | 1.5h |
| **总计** | **11** | **+630** | **6.0h** |

---

## 🎯 实现优先级

### 立即做 (这个小时)
- [ ] Task 3.1: 推荐系统 (高价值,中难度)
- [ ] Task 3.2: 智能提示 (中价值,中难度)

### 这周做
- [ ] Task 3.3: 变更历史 (低-中价值,高难度)
- [ ] Task 3.4: 数据恢复 (中价值,高难度)

---

## 🚀 预期收益

| 功能 | 用户收益 | 业务收益 |
|------|---------|---------|
| 推荐系统 | 发现新习惯 | DAU ↑ 10-15% |
| 智能提示 | 做更好的选择 | 完成率 ↑ 5-10% |
| 变更历史 | 追踪修改过程 | 用户信任 ↑ 15% |
| 数据恢复 | 误删可恢复 | 用户满意度 ↑ 20% |

---

**准备启动 Phase 3 了吗?** 🚀

建议顺序:
1. Task 3.1 (推荐系统) - 高价值
2. Task 3.2 (智能提示) - 快速见效
3. Task 3.3 + 3.4 (历史和恢复) - 完整性

继续吗? 😄
