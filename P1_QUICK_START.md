# P1阶段 - 快速启动指南

**启动时间**: Day 9
**目标**: 实现3个中等优先级功能
**预计完成**: Day 12

---

## 🎯 P1目标概览

### P1 #1: 习惯库搜索优化 🔍
**问题**: 用户难以在大量习惯模板中找到想要的

**解决方案**:
- 搜索框 + 关键词搜索
- 分类筛选 (健康/学习/工作等)
- 搜索历史
- 热门推荐

**影响**: +30% 习惯创建成功率

**估时**: 2-3小时

---

### P1 #2: 设置页增强 ⚙️
**问题**: 用户无法自定义提醒、DND时段等

**解决方案**:
- DND勿扰模式设置 (22:00-08:00)
- 多提醒时间 (早+晚)
- 推送通知开关
- 深色模式 (可选)

**影响**: +20% 用户保留率

**估时**: 3-4小时

---

### P1 #3: 会员转化优化 💎
**问题**: 会员转化率低，用户不了解价值

**解决方案**:
- 实时展示限制 (5/10 习惯)
- 价值对比表
- 7天免费试用
- AI报告展示

**影响**: +15% ARPU

**估时**: 4-5小时

---

## 📂 开发环境准备

### 文件结构检查
```
miniprogram/
├── pages/
│   ├── home/              ✅ (P0完成)
│   ├── stats/             ✅ (P0完成)
│   ├── habit-detail/      ✅ (P0完成)
│   ├── create-habit/      ✅ (前期完成)
│   │
│   ├── habit-library/     ← P1 #1 目标
│   ├── settings/          ← P1 #2 目标
│   └── member/            ← P1 #3 目标
│
└── utils/
    ├── triggerTime.js     ✅ (已有)
    ├── constants.js       ✅ (已有)
    └── ... (其他工具)
```

### 代码风格参考
```javascript
// ✅ 遵循以下规范：
// 1. 方法命名: handleXxx (事件), getXxx (数据), setXxx (设置)
// 2. 数据字段: camelCase，初始化在data中
// 3. 样式: 绿色主题 #07C160，rpx单位，24rpx间距系统
// 4. 注释: JSDoc注释所有公共方法
// 5. 错误处理: try-catch + wx.showToast反馈
```

---

## 🚀 P1 #1: 习惯库搜索 (Day 9-10)

### 开发步骤

#### Step 1: 页面准备 (15分钟)
```javascript
// miniprogram/pages/habit-library/habit-library.js

Page({
  data: {
    // P1: 搜索功能数据
    searchKeyword: '',           // 搜索关键词
    searchCategory: 'all',       // 选中分类: all/health/learning/work/life
    filteredHabits: [],          // 过滤后的习惯
    searchHistory: [],           // 搜索历史
    isSearching: false,          // 搜索状态

    // 原有数据
    habits: [],                  // 所有习惯模板
    recommendedHabits: [],       // 推荐习惯
    categories: [
      { id: 'all', name: '全部', icon: '📋' },
      { id: 'health', name: '健康', icon: '🏃' },
      { id: 'learning', name: '学习', icon: '📚' },
      { id: 'work', name: '工作', icon: '💼' },
      { id: 'life', name: '生活', icon: '🏠' }
    ]
  }
})
```

#### Step 2: UI设计 (20分钟)
```html
<!-- miniprogram/pages/habit-library/habit-library.wxml -->

<!-- 搜索框 -->
<view class="search-bar">
  <input
    class="search-input"
    bindinput="onSearchInput"
    value="{{searchKeyword}}"
    placeholder="搜索习惯"
  />
  <view class="search-clear" wx:if="{{searchKeyword}}" bindtap="clearSearch">✕</view>
</view>

<!-- 分类筛选 -->
<view class="category-filter">
  <view
    class="category-item {{searchCategory === item.id ? 'active' : ''}}"
    wx:for="{{categories}}"
    wx:key="id"
    bindtap="selectCategory"
    data-category="{{item.id}}"
  >
    {{item.icon}} {{item.name}}
  </view>
</view>

<!-- 搜索结果 -->
<view class="habit-list" wx:if="{{isSearching && filteredHabits.length > 0}}">
  <view class="habit-item" wx:for="{{filteredHabits}}" wx:key="_id" bindtap="selectHabit" data-habit="{{item}}">
    <view class="habit-name">{{item.name}}</view>
    <view class="habit-category">{{item.category}}</view>
  </view>
</view>

<!-- 搜索历史 -->
<view class="search-history" wx:elif="{{!isSearching && searchHistory.length > 0}}">
  <view class="history-title">最近搜索</view>
  <view class="history-items">
    <view class="history-item" wx:for="{{searchHistory}}" wx:key="keyword" bindtap="selectHistory" data-keyword="{{item}}">
      🕐 {{item}}
    </view>
  </view>
</view>

<!-- 推荐习惯 -->
<view class="recommended" wx:else>
  <view class="section-title">推荐习惯</view>
  <view class="habit-list">
    <!-- 同上 -->
  </view>
</view>
```

#### Step 3: 搜索逻辑 (30分钟)
```javascript
/**
 * 搜索输入
 */
onSearchInput(e) {
  const keyword = e.detail.value.trim().toLowerCase();

  if (!keyword) {
    this.setData({
      searchKeyword: '',
      filteredHabits: [],
      isSearching: false
    });
    return;
  }

  // 本地搜索：搜索名称和描述
  const filtered = this.data.habits.filter(habit => {
    const matchName = habit.name.toLowerCase().includes(keyword);
    const matchDesc = (habit.description || '').toLowerCase().includes(keyword);
    const matchCategory = this.data.searchCategory === 'all' || habit.category === this.data.searchCategory;

    return (matchName || matchDesc) && matchCategory;
  });

  this.setData({
    searchKeyword: keyword,
    filteredHabits: filtered,
    isSearching: true
  });
},

/**
 * 选择分类
 */
selectCategory(e) {
  const category = e.currentTarget.dataset.category;
  this.setData({ searchCategory: category });
  // 重新过滤
  this.onSearchInput({ detail: { value: this.data.searchKeyword } });
},

/**
 * 清除搜索
 */
clearSearch() {
  this.setData({
    searchKeyword: '',
    filteredHabits: [],
    isSearching: false
  });
},

/**
 * 选择习惯
 */
selectHabit(e) {
  const habit = e.currentTarget.dataset.habit;

  // 记录到搜索历史
  const history = [habit.name, ...this.data.searchHistory.slice(0, 4)];
  wx.setStorageSync('search_history', history);

  // 跳转到创建页面，预填参数
  wx.navigateTo({
    url: `/pages/create-habit/create-habit?preset_name=${encodeURIComponent(habit.name)}&preset_category=${habit.category}`
  });
}
```

#### Step 4: 样式美化 (25分钟)
```css
/* miniprogram/pages/habit-library/habit-library.wxss */

.search-bar {
  display: flex;
  align-items: center;
  padding: 16rpx 32rpx;
  background: white;
  gap: 12rpx;
}

.search-input {
  flex: 1;
  padding: 12rpx 20rpx;
  border: 2rpx solid #e5e8eb;
  border-radius: 20rpx;
  font-size: 28rpx;
}

.search-input:focus {
  border-color: #07C160;
  box-shadow: 0 0 8rpx rgba(7, 193, 96, 0.2);
}

.category-filter {
  display: flex;
  padding: 16rpx 32rpx;
  gap: 12rpx;
  overflow-x: auto;
  background: #f7f8fa;
}

.category-item {
  padding: 8rpx 16rpx;
  border-radius: 20rpx;
  background: white;
  white-space: nowrap;
  transition: all 0.2s;
}

.category-item.active {
  background: #07C160;
  color: white;
}

.habit-item {
  padding: 20rpx 32rpx;
  border-bottom: 1rpx solid #f0f2f5;
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.habit-item:active {
  background: #f7f8fa;
}

.habit-name {
  font-size: 30rpx;
  font-weight: 500;
  color: #000;
}

.habit-category {
  font-size: 22rpx;
  color: #999;
  background: #f0f2f5;
  padding: 4rpx 12rpx;
  border-radius: 12rpx;
}
```

**时间**: ~1.5小时
**难度**: 低-中

---

## 🛠️ P1 #2: 设置页增强 (Day 10-11)

### 核心功能
```javascript
// miniprogram/pages/settings/settings.js

data: {
  // P1: 设置相关数据
  settings: {
    pushEnabled: true,           // 推送通知开关
    dndStart: '22:00',          // DND开始时间
    dndEnd: '08:00',            // DND结束时间
    dndEnabled: true,           // DND启用
    multipleReminders: false,   // 多提醒开关
    reminderTimes: ['09:00', '18:00'],  // 多提醒时间
    darkMode: false             // 深色模式
  }
}

/**
 * 保存设置
 */
async saveSettings() {
  const res = await wx.cloud.callFunction({
    name: 'updateUserSettings',
    data: { settings: this.data.settings }
  });

  if (res.result.code === 0) {
    wx.showToast({ title: '设置已保存', icon: 'success' });
    // 保存到本地
    wx.setStorageSync('user_settings', this.data.settings);
  }
}
```

**时间**: ~1.5小时
**难度**: 中

---

## 💎 P1 #3: 会员转化优化 (Day 11-12)

### 核心改进
```javascript
// miniprogram/pages/member/member.js

// 显示当前限制
getCurrentLimits() {
  const totalHabits = this.data.habits.length;
  const maxHabits = 10;
  const limitPercent = Math.round((totalHabits / maxHabits) * 100);

  return {
    habitLimit: `${totalHabits}/${maxHabits}`,
    percentFull: limitPercent,
    isLimited: totalHabits >= 8  // 接近限制时提醒
  };
}

// 显示AI报告预览
previewReport() {
  const sampleReport = {
    title: '您的21天成长报告',
    completion: '85%',
    insight: '您在坚持方面表现优秀！比82%的用户更好',
    recommendation: '建议下一个周期关注早晨的习惯养成'
  };

  wx.navigateTo({
    url: '/pages/report-preview/report-preview'
  });
}
```

**时间**: ~2小时
**难度**: 中-高

---

## ⚡ 快速模板库

### 云函数模板
```javascript
// cloudfunctions/updateUserSettings/index.js
exports.main = async (event, context) => {
  const wxContext = cloud.getWXContext();
  const { settings } = event;

  // 验证 settings 对象
  const allowedKeys = ['pushEnabled', 'dndStart', 'dndEnd', ...];

  // 保存到数据库
  await db.collection('user_settings').doc(wxContext.OPENID).set({
    data: { settings, updated_at: db.serverDate() }
  });

  return { code: 0, message: '设置已保存' };
};
```

### WXML组件模板
```html
<!-- 开关组件 -->
<view class="setting-item">
  <view class="setting-label">推送通知</view>
  <switch bindchange="togglePush" checked="{{settings.pushEnabled}}" />
</view>

<!-- 时间选择 -->
<view class="setting-item" bindtap="showTimePicker" data-field="dndStart">
  <view class="setting-label">勿扰开始时间</view>
  <view class="setting-value">{{settings.dndStart}}</view>
</view>
```

### CSS模板
```css
.setting-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 20rpx 32rpx;
  border-bottom: 1rpx solid #f0f2f5;
}

.setting-item:active {
  background: #f7f8fa;
}

.setting-label {
  font-size: 30rpx;
  color: #000;
  font-weight: 500;
}

.setting-value {
  font-size: 26rpx;
  color: #07C160;
}
```

---

## 📋 P1阶段检查清单

### 开发前
- [ ] 代码库最新版本拉取
- [ ] 本地环境配置完成
- [ ] 云函数部署权限确认
- [ ] 数据库扩展计划确认

### 开发中
- [ ] 代码每日commit
- [ ] 功能完成后E2E测试
- [ ] 性能监控
- [ ] 代码审查

### 发布前
- [ ] 所有功能E2E通过
- [ ] 性能指标达标
- [ ] 文档更新
- [ ] 部署清单确认

---

## 🎯 成功标准

### P1 #1: 搜索优化
- [ ] 搜索功能可用
- [ ] 分类筛选正常工作
- [ ] 搜索历史保存
- [ ] 性能 < 200ms

### P1 #2: 设置增强
- [ ] DND设置保存
- [ ] 多提醒时间配置
- [ ] 设置实时同步
- [ ] 云函数调用成功

### P1 #3: 会员优化
- [ ] 限制提示显示
- [ ] 价值对比表清晰
- [ ] 试用按钮可点击
- [ ] 转化数据可追踪

---

## 📞 关键联系信息

### 技术参考
- 搜索API: 微信小程序原生
- 时间选择: wx.showDatePicker() 或自定义组件
- 设置存储: wx.setStorageSync()
- 支付集成: 微信支付API (P1后期)

### 常见问题解决
- 搜索性能: 使用云函数分页
- 时间格式: 统一使用24小时制
- 设置同步: 本地storage + 云数据库
- 试用期: 使用云函数验证过期时间

---

## 🚀 发布计划

```
Day 9  09:00 - P1 #1 开发开始
       17:00 - P1 #1 功能完成 + E2E测试

Day 10 09:00 - P1 #2 开发开始
       17:00 - P1 #2 功能完成 + E2E测试

Day 11 09:00 - P1 #3 开发开始
       17:00 - P1 #3 功能完成 + E2E测试

Day 12 09:00 - 整体测试 + bug修复
       14:00 - 最终部署前检查
       15:00 - v1.2.0 发布
```

---

**准备开始P1吗？继续加油！** 💪

**下一个命令**: "开始P1 #1: 习惯库搜索开发"
