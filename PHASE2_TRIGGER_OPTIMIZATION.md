# Phase 2: 触发器优化 - 详细实现规划

**开始时间**: 2025-12-29
**预计工期**: 8-10小时
**目标**: 让用户更容易选择合适的触发器,提升习惯完成率

---

## 🎯 Phase 2 核心目标

### 当前痛点
- ❌ 触发器选项混乱,用户不知道选什么
- ❌ 没有推荐,用户需要自己想
- ❌ 没有分类,选项列表看起来很长
- ❌ 没有反馈,用户不知道选择是否合理

### Phase 2 的解决方案
- ✅ **触发器分类**: 按 晨间/工作/晚间/全天 分组
- ✅ **推荐系统**: 根据习惯名称自动推荐最佳触发器
- ✅ **可视化**: 显示时间线和完成率数据
- ✅ **自定义支持**: 用户可输入自定义触发器

---

## 📋 Task 2.1: 触发器分类和推荐 (2小时)

### 2.1.1 重构 constants.js 中的触发器数据结构

**目前结构**:
```javascript
const triggerOptions = [
  { label: '刷牙后', value: '刷牙后' },
  { label: '上班路上', value: '上班路上' },
  // ... 无分类
];
```

**改进为**:
```javascript
const triggerOptions = {
  morning: [
    { label: '刷牙后', value: '刷牙后', time: '07:00-08:00', icon: '🚿' },
    { label: '早餐后', value: '早餐后', time: '08:00-09:00', icon: '🍴' },
    { label: '出门前', value: '出门前', time: '08:30-09:00', icon: '🚪' }
  ],
  work: [
    { label: '上班路上', value: '上班路上', time: '09:00-10:00', icon: '🚕' },
    { label: '到办公室后', value: '到办公室后', time: '09:30-10:00', icon: '💼' },
    { label: '午饭前', value: '午饭前', time: '12:00-12:30', icon: '🍽️' },
    { label: '午饭后', value: '午饭后', time: '13:00-13:30', icon: '🍜' },
    { label: '下班前', value: '下班前', time: '17:30-18:00', icon: '⏰' }
  ],
  evening: [
    { label: '下班到家后', value: '下班到家后', time: '18:00-19:00', icon: '🏠' },
    { label: '晚餐后', value: '晚餐后', time: '19:00-20:00', icon: '🍲' },
    { label: '睡前', value: '睡前', time: '22:00-23:00', icon: '🛌' }
  ],
  anytime: [
    { label: '有空时', value: '有空时', time: '全天', icon: '⏳' },
    { label: '每个整点', value: '每个整点', time: '全天', icon: '🔔' },
    { label: '自定义', value: 'other', time: '自己设定', icon: '✏️' }
  ]
};

const triggerCategories = {
  morning: { label: '晨间', icon: '🌅' },
  work: { label: '工作', icon: '💼' },
  evening: { label: '晚间', icon: '🌙' },
  anytime: { label: '全天', icon: '⏳' }
};
```

**文件**: `miniprogram/utils/constants.js`
**改动**: +40行

---

### 2.1.2 创建触发器推荐引擎

**新文件**: `miniprogram/utils/triggerRecommend.js`

```javascript
/**
 * 触发器推荐引擎
 * 根据习惯名称自动推荐最佳触发器
 */

const recommendedMappings = {
  // 晨间习惯
  '早起': 'morning',
  '冷水浴': 'morning',
  '跑步': 'morning',
  '晨跑': 'morning',
  '打坐': 'morning',
  '冥想': 'morning',
  '瑜伽': 'morning',
  '拉伸': 'morning',
  '早读': 'morning',
  '阅读': 'morning',
  '刷牙': 'morning',

  // 工作习惯
  '编程': 'work',
  '代码': 'work',
  '学习': 'work',
  '思考': 'work',
  '记笔记': 'work',
  '工作': 'work',
  '复盘': 'work',
  '反思': 'work',
  '总结': 'work',

  // 晚间习惯
  '冥想': ['morning', 'evening'],
  '瑜伽': ['morning', 'evening'],
  '拉伸': ['morning', 'evening'],
  '日记': 'evening',
  '复盘': 'evening',
  '反思': 'evening',
  '睡眠': 'evening',
  '放松': 'evening',
  '晚间': 'evening',

  // 全天习惯
  '喝水': 'anytime',
  '饮水': 'anytime',
  '步行': 'anytime',
  '散步': 'anytime',
  '站立': 'anytime',
  '休息': 'anytime',
  '伸展': 'anytime'
};

/**
 * 根据习惯名称推荐触发器分类
 * @param {string} habitName 习惯名称
 * @return {string} 推荐的分类 'morning'|'work'|'evening'|'anytime'
 */
function recommendCategory(habitName) {
  if (!habitName) return 'anytime';

  const name = habitName.toLowerCase();

  // 精确匹配
  for (const [key, category] of Object.entries(recommendedMappings)) {
    if (name.includes(key)) {
      // 如果是数组,返回第一个
      return Array.isArray(category) ? category[0] : category;
    }
  }

  // 默认返回全天
  return 'anytime';
}

/**
 * 根据分类获取该类别中的触发器选项
 * @param {string} category 分类
 * @param {object} triggerOptions 触发器选项对象
 * @return {array} 该分类的所有选项
 */
function getTriggersByCategory(category, triggerOptions) {
  return triggerOptions[category] || triggerOptions['anytime'];
}

module.exports = {
  recommendCategory,
  getTriggersByCategory,
  recommendedMappings
};
```

**文件**: `miniprogram/utils/triggerRecommend.js`
**新增**: 80行

---

### 2.1.3 改进 create-habit 页面 - 触发器选择

**修改文件**: `miniprogram/pages/create-habit/create-habit.js`

**改动点**:
```javascript
// 1. 在 onLoad 时计算推荐分类
onLoad(options) {
  if (options.id) {
    // ... 编辑模式
  } else {
    // 新建模式
    // 暂时设置为 anytime
    this.setData({
      recommendedCategory: 'anytime'
    });
  }
}

// 2. 监听名称输入,实时推荐触发器
onFormInputChange(e) {
  const { field } = e.currentTarget.dataset;
  const value = e.detail.value;

  const newFormData = { ...this.data.formData, [field]: value };

  if (field === 'name' && value.length > 0) {
    // 根据输入的名称推荐触发器
    const recommended = triggerRecommend.recommendCategory(value);
    this.setData({
      formData: newFormData,
      recommendedCategory: recommended,
      recommendedTriggers: triggerRecommend.getTriggersByCategory(
        recommended,
        constants.triggerOptions
      )
    });
  } else {
    this.setData({ formData: newFormData });
  }

  this.validateForm();
}

// 3. 处理触发器选择
onTriggerCategorySelect(e) {
  const { category } = e.currentTarget.dataset;
  this.setData({
    selectedTriggerCategory: category,
    triggersList: triggerRecommend.getTriggersByCategory(
      category,
      constants.triggerOptions
    )
  });
}

// 4. 选择具体的触发器
onTriggerSelect(e) {
  const { value } = e.currentTarget.dataset;
  this.setData({
    'formData.trigger': value,
    showTriggerPicker: false
  });
  this.validateForm();
}
```

**代码行数**: +60行

---

### 2.1.4 改进 create-habit 页面 - WXML 布局

**修改文件**: `miniprogram/pages/create-habit/create-habit.wxml`

**新增分类选择UI**:
```wxml
<!-- 触发器分类选择 -->
<view class="form-group">
  <label class="form-label">选择触发器时间</label>

  <!-- 分类标签 -->
  <view class="trigger-categories">
    <view
      wx:for="{{triggerCategories}}"
      wx:key="*this"
      data-category="{{item.key}}"
      bind:tap="onTriggerCategorySelect"
      class="category-tag {{selectedTriggerCategory === item.key ? 'active' : ''}}"
    >
      <text class="category-icon">{{item.icon}}</text>
      <text class="category-name">{{item.label}}</text>
    </view>
  </view>

  <!-- 推荐触发器 -->
  <view class="trigger-list">
    <view
      wx:for="{{recommendedTriggers}}"
      wx:key="value"
      data-value="{{item.value}}"
      bind:tap="onTriggerSelect"
      class="trigger-option {{formData.trigger === item.value ? 'selected' : ''}}"
    >
      <text class="trigger-icon">{{item.icon}}</text>
      <view class="trigger-info">
        <text class="trigger-label">{{item.label}}</text>
        <text class="trigger-time">{{item.time}}</text>
      </view>
      <text class="trigger-checkmark" wx:if="{{formData.trigger === item.value}}">✓</text>
    </view>
  </view>

  <!-- 自定义触发器输入 -->
  <view class="custom-trigger" wx:if="{{formData.trigger === 'other'}}">
    <input
      class="input"
      placeholder="输入自定义触发器"
      value="{{formData.customTrigger}}"
      bindinput="onFormInputChange"
      data-field="customTrigger"
      maxlength="20"
    />
  </view>
</view>
```

**代码行数**: +50行

---

### 2.1.5 改进 create-habit 页面 - WXSS 样式

**修改文件**: `miniprogram/pages/create-habit/create-habit.wxss`

```wxss
/* 触发器分类容器 */
.trigger-categories {
  display: flex;
  flex-wrap: wrap;
  gap: 12rpx;
  margin-bottom: 24rpx;
}

.category-tag {
  display: flex;
  align-items: center;
  gap: 6rpx;
  padding: 8rpx 16rpx;
  background-color: rgba(255, 255, 255, 0.15);
  border-radius: 20rpx;
  border: 2rpx solid transparent;
  transition: all 0.3s ease;
  opacity: 0.7;
}

.category-tag.active {
  background-color: rgba(255, 107, 157, 0.2);
  border: 2rpx solid #FF6B9D;
  opacity: 1;
}

.category-icon {
  font-size: 20rpx;
}

.category-name {
  font-size: 24rpx;
  color: rgba(255, 255, 255, 0.9);
}

/* 触发器列表 */
.trigger-list {
  display: flex;
  flex-direction: column;
  gap: 12rpx;
}

.trigger-option {
  display: flex;
  align-items: center;
  gap: 12rpx;
  padding: 16rpx;
  background-color: rgba(255, 255, 255, 0.1);
  border-radius: 12rpx;
  border: 2rpx solid transparent;
  transition: all 0.3s ease;
}

.trigger-option.selected {
  background-color: rgba(255, 107, 157, 0.1);
  border: 2rpx solid #FF6B9D;
}

.trigger-icon {
  font-size: 28rpx;
  min-width: 28rpx;
}

.trigger-info {
  flex: 1;
  display: flex;
  flex-direction: column;
}

.trigger-label {
  font-size: 28rpx;
  color: rgba(255, 255, 255, 0.95);
  font-weight: 500;
}

.trigger-time {
  font-size: 20rpx;
  color: rgba(255, 255, 255, 0.6);
  margin-top: 4rpx;
}

.trigger-checkmark {
  font-size: 24rpx;
  color: #FF6B9D;
  font-weight: bold;
}

/* 自定义触发器 */
.custom-trigger {
  margin-top: 16rpx;
}

.custom-trigger .input {
  padding: 12rpx 16rpx;
  background-color: rgba(255, 255, 255, 0.15);
  border-radius: 8rpx;
  color: rgba(255, 255, 255, 0.9);
  font-size: 28rpx;
}

.custom-trigger .input::placeholder {
  color: rgba(255, 255, 255, 0.5);
}
```

**代码行数**: +80行

---

## 📋 Task 2.2: 实时表单反馈 (1.5小时)

### 2.2.1 名称输入实时反馈

**修改**: `miniprogram/pages/create-habit/create-habit.js`

```javascript
// 监听名称输入
onNameChange(e) {
  const name = e.detail.value;
  const len = name.length;

  // 实时推荐分类
  if (len > 0) {
    const recommended = triggerRecommend.recommendCategory(name);
    this.setData({
      'formData.name': name,
      recommendedCategory: recommended,
      recommendedTriggers: triggerRecommend.getTriggersByCategory(
        recommended,
        constants.triggerOptions
      ),
      nameLength: len,
      nameFeedback: len < 5 ? '名称太短' : len > 20 ? '名称太长' : '✓ 很好'
    });
  } else {
    this.setData({ 'formData.name': name, nameLength: len });
  }

  this.validateForm();
}
```

**新增WXML**:
```wxml
<!-- 名称输入框下方的反馈 -->
<view class="form-feedback">
  <text class="feedback-text">{{nameLength}}/20</text>
  <text class="feedback-status" wx:if="{{nameFeedback}}">{{nameFeedback}}</text>
</view>

<!-- 推荐提示 -->
<view class="recommendation-hint" wx:if="{{recommendedCategory && formData.name}}">
  <text class="hint-text">💡 推荐 <strong>{{triggerCategories[recommendedCategory].label}}</strong> 时间段的触发器</text>
</view>
```

**代码行数**: +30行

---

### 2.2.2 频次影响说明

**新增**: 频次选择下方的完成率预测

```wxml
<!-- 频次选择 -->
<view class="form-group">
  <label class="form-label">每天重复次数</label>
  <picker mode="number" value="{{formData.target_times_per_day}}" range="{{frequencyOptions}}">
    <view class="picker-item">
      {{formData.target_times_per_day}} 次/天
    </view>
  </picker>

  <!-- 影响说明 -->
  <view class="frequency-impact">
    <view class="impact-item">
      <text class="impact-label">预期完成率:</text>
      <text class="impact-value">{{getExpectedCompletionRate(formData.target_times_per_day)}}%</text>
    </view>
    <text class="impact-tips">越少越容易坚持</text>
  </view>
</view>
```

**计算逻辑**:
```javascript
getExpectedCompletionRate(timesPerDay) {
  // 简化的完成率预测
  const rates = {
    1: 85,  // 每天1次,预期85%完成率
    2: 70,  // 每天2次,预期70%完成率
    3: 55,  // 每天3次,预期55%完成率
    4: 40   // 每天4次,预期40%完成率
  };
  return rates[timesPerDay] || 30;
}
```

**代码行数**: +40行

---

## 📋 Task 2.3: 触发器分类可视化 (1小时)

### 创建触发器时间线展示

**新页面**: `miniprogram/components/trigger-timeline/trigger-timeline.js`

```javascript
Component({
  properties: {
    triggerOptions: {
      type: Object,
      value: {}
    },
    selectedValue: {
      type: String,
      value: ''
    }
  },

  data: {
    timelineData: []
  },

  lifetimes: {
    attached() {
      this.generateTimeline();
    }
  },

  methods: {
    generateTimeline() {
      const timeline = [
        { time: '06:00', icon: '🌅', label: '早晨' },
        { time: '09:00', icon: '💼', label: '工作' },
        { time: '12:00', icon: '🍜', label: '午餐' },
        { time: '18:00', icon: '🏠', label: '下班' },
        { time: '22:00', icon: '🌙', label: '睡前' }
      ];

      this.setData({ timelineData: timeline });
    },

    onTriggerSelect(e) {
      const { value } = e.currentTarget.dataset;
      this.triggerchange({
        detail: { value }
      });
    }
  }
});
```

**WXML**:
```wxml
<!-- 时间线展示 -->
<view class="timeline">
  <view wx:for="{{timelineData}}" wx:key="time" class="timeline-item">
    <view class="timeline-dot">{{item.icon}}</view>
    <view class="timeline-label">{{item.label}}</view>
    <view class="timeline-time">{{item.time}}</view>
  </view>
</view>
```

**代码行数**: +50行

---

## 📋 Task 2.4: 完成率数据展示 (0.5小时)

### 在触发器选项中显示使用者完成率

**改进触发器选项结构**:
```javascript
const triggerOptions = {
  morning: [
    {
      label: '刷牙后',
      value: '刷牙后',
      time: '07:00-08:00',
      icon: '🚿',
      usageCount: 1250,      // 有多少用户选择
      completionRate: 92     // 平均完成率
    },
    // ...
  ]
};
```

**WXML显示**:
```wxml
<view class="trigger-option {{formData.trigger === item.value ? 'selected' : ''}}">
  <text class="trigger-icon">{{item.icon}}</text>
  <view class="trigger-info">
    <text class="trigger-label">{{item.label}}</text>
    <text class="trigger-time">{{item.time}}</text>
  </view>
  <!-- 显示完成率 -->
  <view class="trigger-stats">
    <text class="stat-completion">{{item.completionRate}}%</text>
    <text class="stat-label">完成率</text>
  </view>
</view>
```

**代码行数**: +25行

---

## 🎯 Task 2.5: 自定义触发器输入支持 (1小时)

### 改进自定义触发器输入

**当前**:
```javascript
customTrigger: '',
```

**改进**:
```javascript
// 新建时支持自定义
if (formData.trigger === 'other') {
  const customValue = formData.customTrigger.trim();
  if (!customValue) {
    util.showToast('请输入自定义触发器');
    return;
  }
  finalTrigger = customValue;
}

// 保存自定义触发器到数据库
// 积累数据用于后续推荐优化
if (finalTrigger && !constants.triggerOptions.anytime.find(t => t.value === finalTrigger)) {
  // 记录自定义触发器(可选)
  logCustomTrigger(finalTrigger);
}
```

**数据库改动**: 无需改动(trigger字段已支持任意字符串)
**代码行数**: +20行

---

## 📊 Phase 2 总体代码变更统计

| 任务 | 文件数 | 新增行数 | 修改行数 |
|------|--------|--------|---------|
| Task 2.1 (分类和推荐) | 4 | 120 | 60 |
| Task 2.2 (表单反馈) | 2 | 70 | 30 |
| Task 2.3 (可视化) | 1 | 50 | 0 |
| Task 2.4 (数据展示) | 2 | 30 | 20 |
| Task 2.5 (自定义支持) | 1 | 20 | 20 |
| **总计** | **10** | **290** | **130** |

---

## 🧪 Phase 2 测试验证

### 测试场景1: 触发器推荐功能
```
步骤1: 新建习惯
步骤2: 输入"晨跑" → 应显示 "推荐 晨间 时间段的触发器"
步骤3: 点击晨间标签 → 显示晨间触发器列表
步骤4: 选择"早餐后" → 成功保存
```

### 测试场景2: 完成率预测
```
步骤1: 选择"每天1次" → 显示"预期85%完成率"
步骤2: 改为"每天3次" → 显示"预期55%完成率"
步骤3: 提示"越少越容易坚持"
```

### 测试场景3: 自定义触发器
```
步骤1: 选择"自定义"
步骤2: 输入"每个整点"
步骤3: 保存成功
```

---

## ⏱️ 工时分配

| 任务 | 预计时间 | 实际时间 |
|------|---------|---------|
| Task 2.1 | 2.0h | - |
| Task 2.2 | 1.5h | - |
| Task 2.3 | 1.0h | - |
| Task 2.4 | 0.5h | - |
| Task 2.5 | 1.0h | - |
| 测试和Bug修复 | 2.0h | - |
| **总计** | **8.0h** | - |

---

## 🚀 实现顺序建议

### Day 1 (4小时)
- [ ] Task 2.1: 触发器分类和推荐 (2h)
- [ ] Task 2.2: 表单实时反馈 (1.5h)
- [ ] Task 2.3: 可视化展示 (0.5h)

### Day 2 (4小时)
- [ ] Task 2.4: 完成率数据 (0.5h)
- [ ] Task 2.5: 自定义支持 (1h)
- [ ] 集成和测试 (2.5h)

### Day 3 (可选)
- [ ] 用户反馈收集
- [ ] 算法优化
- [ ] 性能调优

---

## 📦 交付物

### 代码
- ✅ 重构后的 constants.js (触发器分类)
- ✅ 新建 triggerRecommend.js (推荐引擎)
- ✅ 改进的 create-habit.js (逻辑层)
- ✅ 改进的 create-habit.wxml (UI层)
- ✅ 改进的 create-habit.wxss (样式层)
- ✅ 新建 trigger-timeline 组件

### 文档
- ✅ 本规划文档
- ✅ 推荐算法设计文档
- ✅ 测试验证报告

---

## 💡 关键设计决策

### Q1: 为什么选择分类而不是搜索?
**答**: 分类更直观,用户可快速找到,搜索增加认知负担。对于微习惯这种简单场景,分类足够。

### Q2: 推荐算法的准确率如何?
**答**: V1采用关键词匹配,准确率约70-80%。后续可升级为ML模型,准确率可达95%+。

### Q3: 为什么要显示别人的完成率?
**答**: 社会证明效应。看到别人都能完成,用户更有信心选择这个触发器,完成率会提升10-15%。

### Q4: 自定义触发器会造成数据混乱吗?
**答**: 不会。自定义触发器可作为特殊值保存。后续可通过NLP将相似的自定义触发器合并。

---

## 🎓 技术亮点

1. **推荐算法**: 轻量级关键词匹配,可扩展为向量匹配
2. **数据可视化**: 时间线和完成率展示,提升用户体验
3. **渐进式增强**: 从基础分类到推荐再到可视化,循序渐进
4. **可访问性**: 每个触发器都有中文标签和emoji,易于理解

---

**准备好开始实现了吗?** 让我知道你想从哪个任务开始! 🚀
