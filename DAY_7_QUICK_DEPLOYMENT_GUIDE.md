# 微习惯实验室 - Day 7 部署 & 验证快速指南

## 📌 快速导航

| 文档 | 用途 |
|------|------|
| **DAY_7_COMPLETE_SUMMARY.md** | 7 天改造完整总结（设计原理、性能对比、文件清单） |
| **DAY_7_TESTING_SCENARIOS.md** | 8 大测试场景（场景 A-H、执行步骤、验收标准） |
| **DAY_7_INTEGRATION_CHECKLIST.md** | 实现完整性检查（逐个组件验证、集成测试步骤） |
| **本文件** | 部署和验证快速指南（30 分钟快速验证） |

---

## ⚡ 30 分钟快速验证流程

### Step 1：确认云函数部署（5 分钟）

```bash
# 在开发者工具 Console 中执行以下代码

// 1. 测试 response 格式
wx.cloud.callFunction({
  name: 'logHabit',
  data: { user_habit_id: 'test-invalid' }
}).then(res => {
  console.log('✅ response 格式:', Object.keys(res.result));
  // 应输出: success, code, message, data
});

// 2. 测试 getTodayHabits
wx.cloud.callFunction({
  name: 'getTodayHabits'
}).then(res => {
  const { completedCount, totalCount, progress } = res.result.data;
  console.log(`✅ 今日习惯: ${completedCount}/${totalCount}, 进度 ${progress}%`);
});

// 3. 测试 getStats
wx.cloud.callFunction({
  name: 'getStats'
}).then(res => {
  const { weeklyRate, bestHabit, advice } = res.result.data;
  console.log(`✅ 本周完成率: ${weeklyRate}%, 最好习惯: ${bestHabit}`);
  console.log(`💡 建议: ${advice}`);
});
```

**预期输出**:
```
✅ response 格式: success, code, message, data
✅ 今日习惯: 0/0, 进度 0%
✅ 本周完成率: 0%, 最好习惯: 微习惯
💡 建议: 💡 每个开始都值得鼓励...
```

---

### Step 2：新用户完整链路（10 分钟）

```bash
# 1. 清空本地存储
wx.clearStorageSync();
console.log('✅ 已清空本地存储');

# 2. 刷新 Home 页
// 返回 Home 页，应显示"开始微习惯"或"推荐习惯"

# 3. 创建习惯（通过 UI 或代码）
// 通过 UI：点击"推荐习惯"或"创建习惯" → 选择"喝一口水"
// 或代码：
wx.cloud.callFunction({
  name: 'createHabit',
  data: {
    name: '喝一口水',
    targetTimesPerDay: 1
  }
}).then(res => {
  console.log('✅ 习惯创建成功');
  console.log('habitId:', res.result.data.user_habit_id);

  // 自动跳转到 first-checkin
  wx.navigateTo({
    url: `/pages/onboarding/first-checkin/first-checkin?habitId=${res.result.data.user_habit_id}&streak=1&feedbackTier=regular`
  });
});

# 4. 验证 first-checkin 页
// 应显示：✅ emoji + "已完成！" 文案 + Canvas 动效
// 点击"太棒了" → 播放礼花 → 自动关闭 → 返回 Home

# 5. 验证 Home 页
// 应显示：
// - "喝一口水" 在习惯列表中
// - 进度条：1/1 完成（100%）
// - completedCount=1, totalCount=1, progress=100%

# 6. 验证 Stats 页
// 应显示：
// - 大标题：100% 本周完成率
// - 最好的习惯：喝一口水
// - 建议：关于坚持的正面激励
```

**关键验证点**:
- [ ] createHabit 返回 success=true
- [ ] first-checkin 页自动出现（无手动跳转）
- [ ] Canvas 动效播放（或无感降级）
- [ ] Home 进度条正确（100%）
- [ ] Stats 显示结论而非表格

---

### Step 3：打卡反馈速度验证（5 分钟）

```bash
# 打开 Home 页，点击习惯打卡，用 Chrome DevTools 看耗时

// Home.js handleCheckIn 源码中添加耗时日志
handleCheckIn (e) {
  const startTime = Date.now();
  const habitId = e.currentTarget.dataset.id;

  // 乐观更新（应该 < 100ms）
  this.optimisticCheckIn(habitId);
  console.log(`✅ 乐观更新耗时: ${Date.now() - startTime}ms`);

  // 异步调用（后台运行，不阻塞）
  wx.cloud.callFunction({
    name: 'logHabit',
    data: { user_habit_id: habitId }
  }).then(res => {
    console.log(`✅ logHabit 耗时: ${Date.now() - startTime}ms`);
  });
}
```

**预期**:
- 乐观更新：< 100ms（立即响应）
- logHabit：300-800ms（异步，不影响 UI）

---

### Step 4：重复打卡防护验证（5 分钟）

```bash
# 在 Home 页快速点击同一习惯 3 次

// Home.js 中应该有 checkingInId 门控
if (this.data.checkingInId) {
  console.log('⚠️ 已有打卡进行中，忽略此次点击');
  return;  // 防止重复
}

// 预期：第一次打卡成功，第二、三次被忽略
// Console 输出：
// ✅ 打卡成功，streak=1
// ⚠️ 已有打卡进行中，忽略此次点击
// ⚠️ 已有打卡进行中，忽略此次点击
```

---

### Step 5：Day 3 里程碑验证（5 分钟）

```bash
# 前置：习惯已连续打卡 2 天（可通过直接改 habit_logs 表实现快速测试）

# 第 3 天点击打卡
wx.cloud.callFunction({
  name: 'logHabit',
  data: { user_habit_id: 'xxx' }
}).then(res => {
  // 验证返回值
  console.assert(res.result.data.streak === 3, '✅ streak=3');
  console.assert(res.result.data.feedbackTier === 'day3', '✅ feedbackTier=day3');

  // 应自动跳到首卡页
  // 首卡页应显示：
  // - ⭐ emoji（而非 ✅）
  // - "坚持 3 天" 文案（而非"已完成"）
  // - Canvas 三角形粒子（而非圆形）
});
```

**关键验证点**:
- [ ] streak = 3
- [ ] feedbackTier = 'day3'
- [ ] 首卡页显示 ⭐（不是 ✅）
- [ ] Canvas 粒子形状是三角形

---

### Step 6：禁用动效验证（5 分钟）

```bash
# 在 Settings 页禁用动效
// Settings.js 中点击动效开关 OFF

// 再回到 Home 页打卡
// first-checkin 页应该：
// - 直接显示弹窗（无延迟）
// - 没有 Canvas 粒子动画
// - 快速自动关闭

console.log('✅ 禁用动效后，反馈更快（无动效开销）');
```

---

## 🔍 常见问题排查

### 问题 1：getStats 返回 code 不是 0

```javascript
// 排查步骤
if (res.result.code !== 0) {
  console.error('错误码:', res.result.code);
  console.error('错误信息:', res.result.message);

  // 对应检查
  if (res.result.code === -1) {
    console.log('系统错误，检查云函数日志');
  } else if (res.result.code >= 1001) {
    console.log('业务错误:', res.result.message);
  }
}
```

### 问题 2：first-checkin 页没有出现

```javascript
// 检查 logHabit 返回值是否包含 streak/feedbackTier
console.log(res.result.data);

// 检查导航代码
wx.navigateTo({
  url: `/pages/onboarding/first-checkin/first-checkin?habitId=${habitId}&streak=${streak}&feedbackTier=${feedbackTier}`
});

// 检查 first-checkin.js onLoad 是否读取参数
onLoad(options) {
  console.log('参数:', options);
  // 应该能看到 habitId, streak, feedbackTier
}
```

### 问题 3：Canvas 动效不播放

```javascript
// 检查效果是否启用
const enabled = cache.get('effects_enabled', true);
console.log('效果启用:', enabled);

// 检查 Canvas 节点是否存在
wx.createSelectorQuery()
  .select('#confetti')
  .fields({ node: true })
  .exec(res => {
    console.log('Canvas 节点:', res[0]?.node ? '存在' : '不存在');
  });

// 强制启用后重新打卡
cache.set('effects_enabled', true);
```

---

## 📊 性能基准线

部署后应该达到以下指标：

| 指标 | 基准 | 检验方法 |
|------|------|---------|
| 乐观更新 | < 100ms | Home 点击打卡，看 UI 响应速度 |
| logHabit | 300-800ms | Console 记录调用耗时 |
| getTodayHabits | 300-800ms | Console 记录调用耗时 |
| getStats | 500-1500ms | Console 记录调用耗时（涉及多周期计算） |
| Canvas 帧率 | ≥30fps | 首卡页点击打卡，观看动效是否流畅 |
| Stats 理解时间 | < 3s | 进入 Stats 页，3 秒内是否理解完成率和建议 |

---

## ✅ 部署前检查清单

### 云函数检查
- [ ] response.js 已部署
- [ ] logHabit 已改造（返回 streak + feedbackTier）
- [ ] getTodayHabits 已改造（返回 completedCount + totalCount + progress）
- [ ] getStats 已改造（返回 weeklyRate + bestHabit + improved + advice）
- [ ] createHabit 已改造（非会员强制 targetTimes=1）
- [ ] 所有云函数都使用 response.js 格式

### 前端检查
- [ ] Home.js 实现乐观更新 + checkingInId 门控
- [ ] first-checkin.js 读取 streak/feedbackTier URL 参数
- [ ] feedback-modal.js Canvas 2D + 降级方案
- [ ] Settings.js 效果控制（开关 + 强度）
- [ ] Stats.js 显示 weeklyRate/bestHabit/improved/advice
- [ ] 所有路径正确（../../../components/feedback-modal/index）

### 配置检查
- [ ] cache.js TTL 缓存能工作
- [ ] effects.js 动效配置按 tier 区分（regular/day3/day7/recovery）
- [ ] feedbackCopy.js 文案避免负面词汇
- [ ] analytics.js 埋点能记录 firstCheckinDisplay/Completed

### 数据库检查
- [ ] user_habits 表有正确的字段（status, start_date, cycle_days, target_times_per_day）
- [ ] habit_logs 表记录正确（date, times, user_habit_id）
- [ ] users 表有 is_member 字段（用于判断是否降级）

---

## 🚀 部署步骤

### 1. 上传云函数
```bash
# 使用微信开发者工具
右键 cloudfunctions 文件夹 → 上传并部署
# 确保以下文件已上传：
# - utils/response.js
# - logHabit/index.js
# - getTodayHabits/index.js
# - getStats/index.js
# - createHabit/index.js
```

### 2. 上传小程序代码
```bash
# 微信开发者工具
上传 → 输入版本号和描述 → 提交
# 预期：版本号 > 之前的版本
```

### 3. 云端验证
```bash
# 在真实小程序中测试
扫码进入小程序 → 清空存储 → 执行快速验证流程
```

### 4. 灰度发布（可选）
```bash
# 如果要 AB 测试新旧版本
# 使用微信后台的灰度发布功能
# 初期：5% 用户 → 10% → 25% → 50% → 100%
```

---

## 📈 监控指标

部署后应该监控以下指标，判断是否成功：

| 指标 | 预期 | 说明 |
|------|------|------|
| 新用户 Day 3 完成率 | > 70% | 原来 60%，通过动效激励提升到 70%+ |
| 平均打卡耗时 | < 1s | 乐观更新 + 异步调用的效果 |
| 首卡页点击率 | > 80% | 用户愿意点击"太棒了"看动效 |
| Stats 页访问率 | 提升 | 结论优先，用户更愿意查看 |
| 崩溃率 | < 0.5% | 容错能力检验 |

---

## 📞 支持联系

如有问题，请参考：

1. **DAY_7_INTEGRATION_CHECKLIST.md** - 逐个组件验证
2. **DAY_7_TESTING_SCENARIOS.md** - 具体场景测试步骤
3. **DAY_7_COMPLETE_SUMMARY.md** - 设计原理和文件清单
4. **开发者工具 Console** - 查看实时日志和错误

---

## ⏱️ 预计耗时

| 阶段 | 耗时 |
|------|------|
| 快速验证（本指南）| 30 分钟 |
| 全场景测试（8 个）| 2 小时 |
| 灰度部署 | 1 周 |
| 数据监测和优化 | 持续 |

---

**祝部署顺利！🚀**

*有任何问题，参考三份详细文档，或查看代码注释。*
