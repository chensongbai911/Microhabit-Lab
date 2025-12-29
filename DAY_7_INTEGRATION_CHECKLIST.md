# Day 7 - 实现完整性检查 & 集成验证

## 核心组件状态验证

### ✅ 1. response.js - 统一返回格式
**文件**: `cloudfunctions/utils/response.js`
**功能**: 所有云函数的全局响应标准

**实现状态**:
- [x] success(data, message) - 成功响应
- [x] systemError(message, error) - 系统错误（code: -1）
- [x] businessError(code, message, data) - 业务错误（code: 1001+）
- [x] CODES 枚举定义（SUCCESS/SYSTEM_ERROR/EXCEED_LIMIT/ALREADY_DONE等）
- [x] 所有返回值包含 {success, code, message, data}

**关键字段**:
```javascript
{
  success: true/false,           // 全局标识
  code: 0/-1/1001+,              // 错误分类
  message: "用户友好提示",       // 文案
  data: {}                       // 业务数据（可选）
}
```

**使用云函数**:
- logHabit ✅
- getTodayHabits ✅
- getStats ✅
- createHabit ✅
- updateHabitStatus （可用 ⚠️）
- getHabitDetail （可用 ⚠️）

---

### ✅ 2. logHabit - 打卡核心
**文件**: `cloudfunctions/logHabit/index.js`
**功能**: 记录打卡，计算 streak，返回反馈

**Day 4 改造清单**:
- [x] 参数校验（user_habit_id）
- [x] 幂等性检查（今天是否已打卡）
- [x] 创建/更新 habit_logs 记录
- [x] calculateStreak() 后端计算连续天数
- [x] calculateFeedbackTier() 映射 streak → tier（regular/day3/day7/recovery）
- [x] 返回 {streak, feedbackTier, doneTimesToday, targetTimes, isCompleted}
- [x] 使用 response.js 格式

**关键返回结构**:
```javascript
response.success({
  streak: 3,                     // 连续打卡天数
  feedbackTier: 'day3',          // 反馈等级
  doneTimesToday: 1,             // 今日完成次数
  targetTimes: 1,                // 目标次数
  isCompleted: true              // 是否已达成
}, '打卡成功');
```

**验证方式**:
```javascript
// 测试脚本
wx.cloud.callFunction({
  name: 'logHabit',
  data: { user_habit_id: 'xxx' }
}).then(res => {
  console.log('streak:', res.result.data.streak);
  console.log('feedbackTier:', res.result.data.feedbackTier);
  // 预期：streak >= 1，feedbackTier in ['regular','day3','day7','recovery']
});
```

---

### ✅ 3. getTodayHabits - 今日习惯列表
**文件**: `cloudfunctions/getTodayHabits/index.js`
**功能**: 返回今日活跃习惯 + 完成统计（后端计算）

**Day 4 改造清单**:
- [x] 读取 user_habits.status='in_progress' 的习惯
- [x] 计算每个习惯的 streak
- [x] 计算每个习惯的 doneTimesToday（今日完成次数）
- [x] **后端直接返回 completedCount/totalCount/progress**（不让前端算）
- [x] 使用 response.js 格式

**关键返回结构**:
```javascript
response.success({
  habits: [
    {
      habitId: 'id1',
      name: '喝一口水',
      doneTimesToday: 1,
      isCompleted: true,
      streak: 3,
      targetTimes: 1,
      progressCurrent: 1,         // 今日完成数
      progressTotal: 1            // 今日目标数
    }
  ],
  completedCount: 1,              // 完成的习惯个数
  totalCount: 2,                  // 活跃的习惯总数
  progress: 50,                   // 完成率百分比
  today: '2025-12-29'
}, '获取成功');
```

**验证方式**:
```javascript
// 测试脚本
wx.cloud.callFunction({
  name: 'getTodayHabits'
}).then(res => {
  const { completedCount, totalCount, progress } = res.result.data;
  console.assert(progress === Math.round(completedCount/totalCount*100));
  // 验证后端计算的 progress 是否正确
});
```

---

### ✅ 4. getStats - 统计结论优先（Day 6）
**文件**: `cloudfunctions/getStats/index.js`
**功能**: 返回聚合后的结论而非原始数据

**Day 6 改造清单**:
- [x] 计算本周完成率（weeklyRate）
- [x] 计算上周完成率（用于对比）
- [x] 查找本周最好的习惯（completionRate 最高）
- [x] 计算是否改进（improved = weeklyRate >= lastWeekRate）
- [x] 计算改进百分比（improvementPercent）
- [x] 生成建议文案（基于 weeklyRate 和 streak 的心理驱动）
- [x] 使用 response.js 格式

**关键返回结构**:
```javascript
response.success({
  weeklyRate: 85,                 // 本周完成率（百分比）
  bestHabit: '喝一口水',          // 本周最好习惯名
  improved: true,                 // 是否改进
  improvementPercent: 10,         // 改进百分比
  advice: '坚持得很好...',        // 建议文案
  stats: {
    totalHabits: 5,
    inProgress: 5,
    completed: 2,
    maxStreak: 7
  }
}, '获取成功');
```

**文案生成规则** (generateAdvice):
- weeklyRate >= 90% → "🌟 完成率超棒！..."
- weeklyRate >= 70% + improved → "💪 进步 {n}%！..."
- weeklyRate >= 70% + not improved → "👍 保持得不错..."
- maxStreak >= 3 → "🔥 坚持到第 {n} 天..."
- 其他 → "💡 每个开始都值得..."

**验证方式**:
```javascript
// 测试脚本
wx.cloud.callFunction({
  name: 'getStats'
}).then(res => {
  const { weeklyRate, bestHabit, improved, advice } = res.result.data;
  console.log(`本周完成率: ${weeklyRate}%`);
  console.log(`最好的习惯: ${bestHabit}`);
  console.log(`改进: ${improved}`);
  console.log(`建议: ${advice}`);
  // 验证是否是字符串、emoji、正面文案
  console.assert(!advice.includes('失败'));
  console.assert(!advice.includes('中断'));
});
```

---

### ✅ 5. createHabit - 模板非会员降级（Day 5）
**文件**: `cloudfunctions/createHabit/index.js`
**功能**: 创建习惯，非会员强制降级 targetTimes=1

**Day 5 改造清单**:
- [x] 读取用户会员状态
- [x] 如非会员且 targetTimes > 1，强制设为 1
- [x] 返回 {user_habit_id, habit_id, name}
- [x] 使用 response.js 格式

**关键检查**:
```javascript
if (!isMember && target_times_per_day > 1) {
  target_times_per_day = 1;
  // 记录日志："非会员习惯强制降级"
}
```

**验证方式**:
```javascript
// 测试脚本（非会员）
wx.cloud.callFunction({
  name: 'createHabit',
  data: {
    name: '测试',
    targetTimesPerDay: 5  // 尝试创建 5 次/天
  }
}).then(res => {
  const habit = res.result.data;
  // 验证返回的 targetTimes 是 1
  wx.cloud.callFunction({
    name: 'getHabitDetail',
    data: { user_habit_id: habit.user_habit_id }
  }).then(detailRes => {
    console.assert(detailRes.result.data.target_times_per_day === 1);
  });
});
```

---

### ✅ 6. Home.js - 乐观更新（Day 3）
**文件**: `miniprogram/pages/home/home.js`
**功能**: 打卡立即反馈，异步保存

**Day 3 改造清单**:
- [x] handleCheckIn() 实现乐观更新
  1. 检查 checkingInId 防重复
  2. setData 乐观更新（立即改变 UI）
  3. 本地保存 checkingInId 到 localStorage
  4. 异步调用 logHabit 云函数
  5. 成功后导航到 first-checkin（或不导航）
  6. 失败则恢复本地状态
- [x] loadTodayHabits() 信任后端
  - 直接显示 completedCount/totalCount/progress（不自己算）
- [x] 简化 data 结构（只保留必须项）

**关键代码验证**:
```javascript
// Home.js handleCheckIn
handleCheckIn (e) {
  const habitId = e.currentTarget.dataset.id;

  // 门控：防重复点击
  if (this.data.checkingInId) return;

  // 乐观更新：立即改变 UI
  this.optimisticCheckIn(habitId);

  // 异步调用
  wx.cloud.callFunction({
    name: 'logHabit',
    data: { user_habit_id: habitId }
  }).then(res => {
    if (res.result.success) {
      // 导航到首卡页
      wx.navigateTo({
        url: `/pages/onboarding/first-checkin/first-checkin?habitId=${habitId}&streak=${res.result.data.streak}&feedbackTier=${res.result.data.feedbackTier}`
      });
    }
  });
}

// 验证
console.log('乐观更新应该在 0.1s 内完成');
console.log('logHabit 异步在后台，不阻塞 UI');
```

---

### ✅ 7. first-checkin.js - 首卡激励（Day 2+）
**文件**: `miniprogram/pages/onboarding/first-checkin/first-checkin.js`
**功能**: 读取 streak/feedbackTier，展示分层反馈

**改造清单**:
- [x] 从 URL 参数读取 streak/feedbackTier
- [x] 调用 api.getHabitDetailStd() 验证最新数据
- [x] 调用 analytics 埋点
- [x] 触发 feedback-modal 的 startConfetti(tier)
- [x] 清理首卡标记

**关键参数流**:
```javascript
// 从 logHabit 返回
{ streak: 3, feedbackTier: 'day3' }

// 导航到首卡页
wx.navigateTo({
  url: `/pages/onboarding/first-checkin/first-checkin?habitId=xxx&streak=3&feedbackTier=day3`
});

// 首卡页 onLoad
onLoad(options) {
  const { habitId, streak, feedbackTier } = options;

  // 验证参数
  console.assert(feedbackTier in ['regular','day3','day7','recovery']);

  // 调用 API 确认
  getHabitDetailStd(habitId).then(habit => {
    // 触发动效
    this.feedback.startConfetti(feedbackTier);
  });
}
```

---

### ✅ 8. feedback-modal.js - Canvas 动效
**文件**: `miniprogram/components/feedback-modal/index.js`
**功能**: Canvas 2D 粒子效果（或降级 CanvasContext）

**改造清单**:
- [x] 尝试创建 Canvas 2D（requestAnimationFrame）
- [x] 降级到 CanvasContext（setInterval 16ms）
- [x] 根据 feedbackTier 选择粒子形状
  - regular → 圆形
  - day3 → 三角形
  - day7 → 星形（密度高）
  - recovery → 圆形（大尺寸）
- [x] 自动振动（根据 feedbackCopy.vibrate）
- [x] 读取 effects_enabled/effects_intensity 进行控制

**关键验证**:
```javascript
// feedback-modal startConfetti
startConfetti(tier) {
  const config = effects.getConfettiConfig(tier);

  // 检查是否启用
  const enabled = cache.get('effects_enabled', true);
  if (!enabled) return;

  const intensity = cache.get('effects_intensity', 100);

  // 绘制
  this._drawConfettiCanvas2D(config, intensity);

  // 振动
  wx.vibrateLong() / wx.vibrateShort() / wx.vibrate();
}

// 验证动效和振动
console.log('Canvas 2D 支持度:', !!wx.createCanvasContext);
console.log('效果强度:', intensity);
console.log('振动类型:', feedbackCopy[tier].vibrate);
```

---

### ✅ 9. Stats 页面 - 结论展示（Day 6）
**文件**: `miniprogram/pages/stats/stats.js/wxml/wxss`
**功能**: 显示 weeklyRate/bestHabit/improved/advice

**改造清单**:
- [x] stats.js: 载入新的 getStats 返回值
- [x] stats.wxml:
  - 主结论卡片置顶（梯度背景）
  - 显示完成率大标题（64px）
  - 显示最好的习惯
  - 显示改进指标
  - 显示建议文案
  - 移除趋势图表
- [x] stats.wxss: 优化样式（大字号、梯度色、高对比）

**关键验证**:
```javascript
// Stats.js loadStats
loadStats() {
  wx.cloud.callFunction({ name: 'getStats' })
    .then(res => {
      const { weeklyRate, bestHabit, improved, advice } = res.result.data;

      // 验证字段
      console.assert(typeof weeklyRate === 'number');
      console.assert(typeof bestHabit === 'string');
      console.assert(typeof improved === 'boolean');
      console.assert(typeof advice === 'string');

      // 显示
      this.setData({ weeklyRate, bestHabit, improved, advice });
    });
}
```

---

### ✅ 10. Settings 页面 - 效果控制（Day 3+）
**文件**: `miniprogram/pages/settings/settings.js`
**功能**: 动效开关和强度滑块

**改造清单**:
- [x] onShow 时调用 resourceCache.initEffectsResources()
- [x] 动效开关（toggle）
- [x] 强度滑块（0-100）
- [x] 保存到 localStorage

**关键验证**:
```javascript
// Settings.js
toggleEffects(e) {
  const enabled = e.detail.value;
  resourceCache.setEffectsEnabled(enabled);
  console.log('动效已', enabled ? '启用' : '禁用');
}

setEffectsIntensity(e) {
  const intensity = e.detail.value;
  resourceCache.setEffectsIntensity(intensity);
  console.log('动效强度已设置为', intensity + '%');
}

// 验证缓存
const saved = cache.get('effects_intensity', 100);
console.assert(saved === intensity);
```

---

## 集成测试步骤

### 第 1 步：云函数层测试
```javascript
// 在开发者工具 Console 中运行

// 测试 response.js 格式
wx.cloud.callFunction({ name: 'logHabit', data: { user_habit_id: 'test' } })
  .then(res => {
    console.assert(res.result.success !== undefined);
    console.assert(res.result.code !== undefined);
    console.assert(res.result.message !== undefined);
    console.log('✅ response 格式检查通过');
  });

// 测试 getTodayHabits
wx.cloud.callFunction({ name: 'getTodayHabits' })
  .then(res => {
    const { completedCount, totalCount, progress } = res.result.data;
    console.assert(progress === Math.round(completedCount/totalCount*100) || totalCount === 0);
    console.log('✅ getTodayHabits progress 计算正确');
  });

// 测试 getStats
wx.cloud.callFunction({ name: 'getStats' })
  .then(res => {
    const { weeklyRate, bestHabit, advice } = res.result.data;
    console.assert(!advice.includes('失败'));
    console.log('✅ getStats 返回正面文案');
  });
```

### 第 2 步：前端链路测试
```javascript
// 新建一个习惯，验证完整链路
const app = getApp();

// 1. 创建习惯
wx.cloud.callFunction({
  name: 'createHabit',
  data: { name: '测试习惯', targetTimesPerDay: 1 }
}).then(res => {
  const habitId = res.result.data.user_habit_id;
  console.log('✅ 习惯创建成功:', habitId);

  // 2. 打卡
  return wx.cloud.callFunction({
    name: 'logHabit',
    data: { user_habit_id: habitId }
  });
}).then(res => {
  console.log('✅ 打卡成功，streak:', res.result.data.streak);

  // 3. 查询今日习惯
  return wx.cloud.callFunction({ name: 'getTodayHabits' });
}).then(res => {
  console.log('✅ 今日习惯查询成功，完成率:', res.result.data.progress);

  // 4. 查询统计
  return wx.cloud.callFunction({ name: 'getStats' });
}).then(res => {
  console.log('✅ 统计查询成功，建议:', res.result.data.advice);
  console.log('\n🎉 完整链路测试通过！');
});
```

### 第 3 步：UI 层面测试
1. **打开 Home 页** → 显示习惯列表和完成率进度条
2. **点击打卡** →
   - UI 立即反馈（< 100ms）
   - 自动跳转到首卡页
   - 观察 Canvas 动效
3. **打开 Settings 页** →
   - 修改动效强度
   - 禁用动效开关
4. **再次打卡** →
   - 动效应按新设置显示
5. **打开 Stats 页** →
   - 显示大标题完成率
   - 显示最好的习惯和建议

---

## 问题排查

### 问题 1：logHabit 返回 code 不是 0
**可能原因**:
- [ ] 参数 user_habit_id 为空或不存在
- [ ] 习惯已结束（status !== 'in_progress'）
- [ ] 今天已完成且 targetTimes=1（返回 ALREADY_DONE）

**解决**:
```javascript
// 检查返回值
if (res.result.code !== 0) {
  console.error('错误码:', res.result.code);
  console.error('错误信息:', res.result.message);
  // 参考 response.js 的 CODES 定义查找错误原因
}
```

### 问题 2：getStats 返回空的 weeklyRate
**可能原因**:
- [ ] user_habits 表中没有数据
- [ ] 计算 buildTrend 时出错
- [ ] weeklyRate 被默认值 0 覆盖

**解决**:
```javascript
// 检查数据库
db.collection('user_habits').where({ _openid: openid }).get()
  .then(res => {
    console.log('user_habits 数据量:', res.data.length);
    // 至少应该有一个
  });

// 检查 buildTrend 计算
// 在 getStats 中添加日志
console.log('weeklyData:', weeklyData);
console.log('weeklyRate:', weeklyData.avgRate);
```

### 问题 3：首卡页动效不播放
**可能原因**:
- [ ] effects_enabled 被禁用
- [ ] Canvas 创建失败（两层降级都失败）
- [ ] startConfetti 没有被调用

**解决**:
```javascript
// 检查 effects 状态
const enabled = cache.get('effects_enabled', true);
console.log('效果启用:', enabled);

// 检查 Canvas
wx.createSelectorQuery()
  .select('#confetti')
  .fields({ node: true, size: true })
  .exec(res => {
    console.log('Canvas 节点:', res[0]?.node ? '存在' : '不存在');
  });

// 强制启用后重新打卡
cache.set('effects_enabled', true);
```

---

## 性能检查清单

- [ ] logHabit 云函数执行时间 < 500ms
- [ ] getTodayHabits 云函数执行时间 < 500ms
- [ ] getStats 云函数执行时间 < 1000ms（涉及多周期计算）
- [ ] first-checkin Canvas 动效帧率 > 30fps（不卡顿）
- [ ] Home 页面 loadTodayHabits 调用 < 1000ms
- [ ] 乐观更新立即生效（< 100ms）
- [ ] Stats 页面加载 < 1000ms

---

## 最终验收标准

**所有以下项都通过**，则 Day 7 完成：

- [ ] ✅ response.js 格式在所有云函数中一致
- [ ] ✅ logHabit 返回 streak/feedbackTier
- [ ] ✅ getTodayHabits 返回 completedCount/totalCount/progress
- [ ] ✅ getStats 返回 weeklyRate/bestHabit/improved/advice
- [ ] ✅ createHabit 非会员强制 targetTimes=1
- [ ] ✅ Home 乐观更新 + checkingInId 门控
- [ ] ✅ first-checkin 正确读取 streak/feedbackTier
- [ ] ✅ feedback-modal Canvas 动效正常（或降级）
- [ ] ✅ Settings 效果控制工作
- [ ] ✅ Stats 显示结论而非原始数据
- [ ] ✅ feedbackCopy 避免负面文案
- [ ] ✅ 完整链路无 bug：create → first-checkin → home → stats

**场景测试**:
- [ ] 场景 A：新用户首进 ✅
- [ ] 场景 B：网络断线恢复 ✅
- [ ] 场景 C：重复打卡防护 ✅
- [ ] 场景 D：Day 3 里程碑 ✅
- [ ] 场景 E：Day 7 庆祝 ✅
- [ ] 场景 F：恢复流程 ✅
- [ ] 场景 G：缓存预加载 ✅
- [ ] 场景 H：多习惯统计 ✅

**交付物**:
- [ ] 所有云函数使用 response.js 格式
- [ ] 所有页面流程测试无误
- [ ] 埋点和日志健全
- [ ] 文案避免负面表述
- [ ] 性能满足预期（< 1s 响应）

---

**当所有项都勾选后，微习惯核心产品改造完成！🎉**
