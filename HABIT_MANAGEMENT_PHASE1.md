# 习惯管理功能 - Phase 1优化实现方案

## 🎯 Phase 1 目标

在不改变现有架构的基础上,快速修复4个核心问题,使编辑功能完全可用。

**预计工作量**: 4-6小时
**影响范围**: 3个文件修改 + 1个新页面

---

## 1. 问题1: 编辑入口缺失

### 现状
- 首页只有删除菜单,没有编辑按钮
- 列表页无法进入编辑
- 用户无法修改已创建的习惯

### 解决方案

#### 方案A: 首页增加编辑按钮(推荐)

修改 `pages/home/home.wxml`:

```xml
<!-- 习惯卡片长按菜单 -->
<view class="habit-actions" wx:if="{{editingId === item._id}}">
  <view class="action-btn action-edit" bindtap="editHabit" data-id="{{item._id}}">编辑</view>
  <view class="action-btn action-details" bindtap="viewDetail" data-id="{{item._id}}">详情</view>
  <view class="action-btn action-delete" bindtap="deleteHabit" data-id="{{item._id}}">删除</view>
</view>
```

修改 `pages/home/home.js`:

```javascript
/**
 * 编辑习惯
 */
editHabit (e) {
  const habitId = e.currentTarget.dataset.id;
  wx.navigateTo({
    url: `/pages/create-habit/create-habit?id=${habitId}`
  });
},

/**
 * 查看详情
 */
viewDetail (e) {
  const habitId = e.currentTarget.dataset.id;
  wx.navigateTo({
    url: `/pages/habit-detail/habit-detail?id=${habitId}`
  });
},
```

---

## 2. 问题2: 编辑页面数据加载不完整

### 现状
- 编辑时只加载了4个字段
- 没有显示习惯的当前状态
- 没有显示已完成情况

### 解决方案

修改 `pages/create-habit/create-habit.js`:

```javascript
/**
 * 加载习惯详情(编辑模式) - 增强版
 */
async loadHabitDetail (habitId) {
  try {
    util.showLoading('加载中...');

    const res = await wx.cloud.callFunction({
      name: 'getHabitDetail',
      data: { user_habit_id: habitId }
    });

    util.hideLoading();

    if (res.result.code === 0) {
      const habit = res.result.data.habit;

      // 计算完成率
      const completionRate = habit.total_days > 0
        ? Math.round((habit.completed_days / habit.total_days) * 100)
        : 0;

      this.setData({
        formData: {
          name: habit.name,
          trigger: habit.trigger,
          customTrigger: '',
          target_times_per_day: habit.target_times_per_day
        },
        // 新增: 显示习惯的当前状态
        habitStatus: {
          currentDay: habit.current_day || 1,
          totalDays: habit.total_days || 21,
          completedDays: habit.completed_days || 0,
          completionRate: completionRate,
          lastCompletedAt: habit.last_completed_at,
          status: habit.status // 'active' | 'paused' | 'completed'
        }
      }, () => {
        this.validateForm();
      });
    }
  } catch (error) {
    util.hideLoading();
    util.showToast('加载失败');
  }
}
```

修改 `pages/create-habit/create-habit.wxml`:

```xml
<!-- 编辑模式时显示当前状态 -->
<view class="header" wx:if="{{mode === 'edit'}}">
  <view class="title">{{pageTitle}}</view>
  <view class="habit-progress">
    <view class="progress-item">
      <view class="label">已进行</view>
      <view class="value">{{habitStatus.currentDay}}/{{habitStatus.totalDays}} 天</view>
    </view>
    <view class="progress-item">
      <view class="label">完成率</view>
      <view class="value">{{habitStatus.completionRate}}%</view>
    </view>
    <view class="progress-item" wx:if="{{habitStatus.lastCompletedAt}}">
      <view class="label">最后完成</view>
      <view class="value">{{habitStatus.lastCompletedAt}}</view>
    </view>
  </view>
</view>

<!-- 原有的标题(创建模式) -->
<view class="header" wx:else>
  <view class="title">{{pageTitle}}</view>
  <view class="subtitle">写下一个30秒内能完成的小动作</view>
</view>
```

---

## 3. 问题3: 编辑后数据不刷新

### 现状
- 修改习惯后返回首页,数据没有更新
- 需要手动下拉刷新才能看到新数据
- 用户体验差

### 解决方案

修改 `pages/create-habit/create-habit.js`:

```javascript
/**
 * 更新习惯 - 增强版
 */
async updateHabit (finalTrigger) {
  const { name, target_times_per_day } = this.data.formData;

  try {
    util.showLoading('保存中...');

    const res = await wx.cloud.callFunction({
      name: 'updateHabitStatus',
      data: {
        user_habit_id: this.data.habitId,
        action: 'update',
        updates: {
          name: name.trim(),
          trigger: finalTrigger,
          target_times_per_day: target_times_per_day
        }
      }
    });

    util.hideLoading();

    if (res.result.code === 0) {
      util.showToast('保存成功', 'success');

      // 修改: 返回时刷新父页面数据
      setTimeout(() => {
        // 方案A: 使用事件系统刷新(推荐)
        const pages = getCurrentPages();
        if (pages.length > 0) {
          const prevPage = pages[pages.length - 2];
          // 触发父页面的刷新
          if (prevPage.loadTodayHabits) {
            prevPage.loadTodayHabits();
          }
        }

        // 方案B: 返回前刷新
        wx.navigateBack();
      }, 1500);
    } else {
      util.showToast(res.result.message);
    }
  } catch (error) {
    util.hideLoading();
    util.showToast('保存失败,请重试');
  }
}
```

或者在 `pages/home/home.js` 中添加:

```javascript
onShow () {
  // 每次返回首页都刷新
  this.loadTodayHabits();
}
```

---

## 4. 问题4: 删除无确认提示

### 现状
- 用户长按习惯卡片可以直接删除
- 没有任何确认提示
- 容易误删

### 解决方案

修改 `pages/home/home.js`:

```javascript
/**
 * 删除习惯 - 增强版
 */
deleteHabit (e) {
  const habitId = e.currentTarget.dataset.id;
  const habitName = e.currentTarget.dataset.name;

  // 二次确认
  wx.showModal({
    title: '确定要删除吗?',
    content: `删除"${habitName}"后，已有的打卡记录将保存在「已完成」分区，无法恢复。`,
    confirmText: '确认删除',
    cancelText: '取消',
    confirmColor: '#FF6B9D',
    success: (res) => {
      if (res.confirm) {
        this.confirmDelete(habitId);
      }
    }
  });
},

/**
 * 确认删除
 */
async confirmDelete (habitId) {
  try {
    util.showLoading('删除中...');

    const res = await wx.cloud.callFunction({
      name: 'updateHabitStatus',
      data: {
        user_habit_id: habitId,
        action: 'delete'
      }
    });

    util.hideLoading();

    if (res.result.code === 0) {
      util.showToast('已删除', 'success');

      // 从列表中移除
      setTimeout(() => {
        this.loadTodayHabits();
      }, 1500);
    } else {
      util.showToast(res.result.message);
    }
  } catch (error) {
    util.hideLoading();
    util.showToast('删除失败,请重试');
  }
}
```

修改 `pages/home/home.wxml`:

```xml
<!-- 删除菜单项 - 添加 data-name -->
<view class="action-btn action-delete"
      bindtap="deleteHabit"
      data-id="{{item._id}}"
      data-name="{{item.name}}">
  删除
</view>
```

---

## 5. 额外改进: 触发器优化

### 优化方向

修改 `pages/create-habit/create-habit.wxml`:

```xml
<!-- 优化的触发器选择 -->
<view class="form-item">
  <view class="form-label">选择一个触发场景</view>

  <!-- 推荐触发器 -->
  <view class="recommended-trigger" wx:if="{{recommendedTrigger}}">
    <view class="rec-badge">💡 推荐</view>
    <view class="rec-text">{{recommendedTrigger}}</view>
    <view class="rec-reason">多数用户选择这个时间</view>
  </view>

  <!-- 触发器分类显示 -->
  <view class="trigger-group">
    <view class="group-title">晨间触发</view>
    <view class="trigger-options">
      <view class="trigger-btn" wx:for="{{morningTriggers}}"
            wx:key="value"
            data-value="{{item.value}}"
            bindtap="handleTriggerSelect">
        {{item.label}}
      </view>
    </view>
  </view>

  <view class="trigger-group">
    <view class="group-title">工作触发</view>
    <view class="trigger-options">
      <view class="trigger-btn" wx:for="{{workTriggers}}"
            wx:key="value"
            data-value="{{item.value}}"
            bindtap="handleTriggerSelect">
        {{item.label}}
      </view>
    </view>
  </view>

  <!-- ... 其他分组 -->
</view>
```

修改 `pages/create-habit/create-habit.js`:

```javascript
data: {
  mode: 'create',
  // ... 其他字段

  // 新增: 分类触发器
  morningTriggers: [
    { label: '刷牙后', value: '刷牙后' },
    { label: '早餐后', value: '早餐后' },
    { label: '出门前', value: '出门前' }
  ],
  workTriggers: [
    { label: '工作开始', value: '工作开始' },
    { label: '午餐后', value: '午餐后' },
    { label: '下班前', value: '下班前' }
  ],
  // ... 更多分组

  recommendedTrigger: '' // 根据习惯名称推荐
},

/**
 * 习惯名称输入 - 增强版(添加触发器推荐)
 */
handleNameInput (e) {
  const name = e.detail.value;

  this.setData({
    'formData.name': name
  }, () => {
    // 根据名称推荐触发器
    const recommended = this.recommendTrigger(name);
    if (recommended) {
      this.setData({ recommendedTrigger: recommended });
    }

    this.validateForm();
  });
},

/**
 * 根据习惯名称推荐触发器
 */
recommendTrigger (habitName) {
  // 简单的关键词匹配
  const recommendations = {
    '喝水': '早餐后',
    '运动': '下班后',
    '冥想': '睡前',
    '阅读': '晚餐后',
    '日记': '睡前',
    '伸展': '工作开始'
  };

  for (const [keyword, trigger] of Object.entries(recommendations)) {
    if (habitName.includes(keyword)) {
      return trigger;
    }
  }

  return null;
}
```

---

## 6. 样式优化

在 `pages/create-habit/create-habit.wxss` 中添加:

```css
/* 习惯状态显示 */
.habit-progress {
  display: flex;
  gap: 16rpx;
  margin-top: 16rpx;
}

.progress-item {
  flex: 1;
  background: rgba(76, 184, 165, 0.1);
  border-radius: var(--radius-md);
  padding: 12rpx 16rpx;
  text-align: center;
}

.progress-item .label {
  font-size: 24rpx;
  color: var(--text-tertiary);
  margin-bottom: 4rpx;
}

.progress-item .value {
  font-size: 28rpx;
  font-weight: 700;
  color: var(--primary-color);
}

/* 推荐触发器 */
.recommended-trigger {
  background: linear-gradient(135deg, #FFF9E6 0%, #FFECCC 100%);
  border: 2rpx solid #FFE4A3;
  border-radius: var(--radius-md);
  padding: 16rpx;
  margin-bottom: 16rpx;
  display: flex;
  align-items: center;
  gap: 12rpx;
}

.rec-badge {
  font-size: 28rpx;
}

.rec-text {
  flex: 1;
  font-size: 28rpx;
  font-weight: 600;
  color: #D97706;
}

.rec-reason {
  font-size: 22rpx;
  color: #92400E;
}

/* 触发器分组 */
.trigger-group {
  margin-bottom: 24rpx;
}

.group-title {
  font-size: 26rpx;
  font-weight: 600;
  color: var(--text-secondary);
  margin-bottom: 12rpx;
}
```

---

## 📋 实现检查清单

### Step 1: 编辑入口
- [ ] 修改 home.wxml,添加编辑菜单项
- [ ] 修改 home.js,添加 editHabit() 方法
- [ ] 测试首页长按可以进入编辑

### Step 2: 数据加载
- [ ] 增强 loadHabitDetail() 方法
- [ ] 修改 create-habit.wxml,显示习惯状态
- [ ] 测试编辑页面显示当前进度

### Step 3: 数据刷新
- [ ] 修改 updateHabit() 方法,返回时刷新
- [ ] 修改 home.js,onShow 中刷新数据
- [ ] 测试编辑后自动更新列表

### Step 4: 删除确认
- [ ] 修改 deleteHabit() 方法,添加确认弹窗
- [ ] 修改 home.wxml,删除项添加 data-name
- [ ] 测试删除时显示确认对话框

### Step 5: 触发器推荐(可选)
- [ ] 添加分类触发器数据
- [ ] 实现 recommendTrigger() 算法
- [ ] 修改表单显示推荐触发器

---

## 🧪 测试场景

### 测试场景1: 编辑流程
```
1. 首页显示多个习惯
2. 长按任何习惯 → 显示菜单
3. 点击「编辑」→ 进入编辑页面
4. 页面显示当前进度信息
5. 修改名称或触发器
6. 点击「保存」→ 显示成功提示
7. 返回首页 → 数据自动更新
```

### 测试场景2: 删除流程
```
1. 首页长按习惯 → 显示菜单
2. 点击「删除」→ 弹出确认对话框
3. 显示习惯名称和风险提示
4. 点击「确认删除」→ 删除成功
5. 列表自动更新,习惯消失
```

### 测试场景3: 新建推荐
```
1. 点击创建新习惯
2. 输入"喝水"
3. 推荐触发器显示"早餐后"
4. 用户可以接受推荐或改选
```

---

## 📝 代码修改文件清单

| 文件 | 修改内容 | 行数 |
|------|---------|------|
| pages/home/home.wxml | 添加编辑菜单项 | +3行 |
| pages/home/home.js | editHabit() viewDetail() deleteHabit() confirmDelete() | +40行 |
| pages/create-habit/create-habit.js | 增强 loadHabitDetail() updateHabit() + 推荐 | +50行 |
| pages/create-habit/create-habit.wxml | 显示状态 + 推荐 | +30行 |
| pages/create-habit/create-habit.wxss | 新增样式 | +50行 |

**总计修改**: 5个文件, ~173行代码

---

## ⏱️ 预计工作量

- 编辑入口: 30分钟
- 数据加载: 30分钟
- 数据刷新: 20分钟
- 删除确认: 20分钟
- 触发器推荐: 1小时 (可选)
- 测试和调整: 1小时

**总计**: 4-5小时

---

**建议**: 先完成基础4个功能,然后再添加触发器推荐作为增强。
