# 微习惯 - 快速开发指南（Phase 1）

**目标**：2周内完成V1.0版本
**成功指标**：Day 1→3→7 留存率分别 ≥90% / ≥80% / ≥60%

---

## 📋 开发任务分解

### 任务1：首卡激励流程（4h）

**文件**：`pages/onboarding/first-checkin.wxml`

**交付件**：
```
✓ 创建页面骨架
✓ 实现"立即打一次卡"大按钮
✓ 连接到【今日】页面跳转逻辑
✓ 记录用户首卡完成状态（DB）
```

**关键代码片段**：
```javascript
// 记录首卡标记
async function completeFirstCheckin(habitId) {
  await wx.cloud.callFunction({
    name: 'logHabit',
    data: {
      habitId,
      isFirstCheckin: true  // 标记首卡
    }
  });
  // 显示Tier 3反馈（烟花）
  showFireworksAnimation();
  setTimeout(() => navigateTo('home'), 2000);
}
```

---

### 任务2：反馈弹层系统（8h）

**文件**：`components/feedback-modal/index.wxml|js|wxss`

**交付件**：
```
✓ 4个Tier反馈的UI样式（Tier 1/2/3/4）
✓ 动画库集成（Lottie or CSS）
✓ 震动/声音系统集成
✓ 自动隐藏逻辑（2秒 or 点击）
```

**核心逻辑**：
```javascript
// 根据打卡类型展示不同反馈
function showCheckinFeedback(checkType) {
  const feedbackConfig = {
    'regular': { duration: 800, vibrate: [50], sound: 'beep' },
    'day3': { duration: 1000, vibrate: [50, 100, 50], sound: 'star' },
    'day7': { duration: 1500, vibrate: [50, 100, 50, 100, 50], sound: 'victory' },
    'recovery': { duration: 800, vibrate: [25, 50, 25], sound: 'welcome' }
  };

  const config = feedbackConfig[checkType];
  playAnimation(config.animation);
  wx.vibrateLong({ duration: config.vibrate });
  playSound(config.sound);

  setTimeout(() => dismissModal(), config.duration);
}
```

---

### 任务3：关键节点干预（6h）

**文件**：`utils/reminder-logic.js` + `pages/home/index.js`

**交付件**：
```
✓ Day 2-3 未完成→底部浮窗显示
✓ Day 5 特殊提示文案
✓ Day 7 强化弹窗逻辑
✓ 倒计时计算 & 过期判断
```

**触发规则表**：
```javascript
const INTERVENTION_RULES = {
  day_2_3_missed: {
    trigger: 'hour > 20 && !checkinToday && streak >= 1',
    component: 'FloatingTip',
    text: '还有 {hours} 小时就过期了！',
    action: ['quickCheckin', 'remindLater']
  },
  day_5_reminder: {
    trigger: 'checkinCount == 4',
    component: 'LightModal',
    text: '坚持5天就快到了！只需再完成1次…',
    showDelay: 'immediately'
  },
  day_7_celebration: {
    trigger: 'checkinCount == 6',
    component: 'CelebrationModal',
    hasAnimation: true,
    suggestNewHabit: true
  }
};

// 每次打开【今日】页都检查
function checkAndShowIntervention() {
  const streak = calculateCurrentStreak();
  const checkoutCount = getWeekCheckinCount();

  Object.entries(INTERVENTION_RULES).forEach(([rule, config]) => {
    if (eval(config.trigger)) {
      showComponent(config.component, config);
    }
  });
}
```

---

### 任务4：页面一视觉优化（4h）

**文件**：`pages/home/index.wxml|wxss`

**交付件**：
```
✓ 连续天数徽章重设计（用火焰图标）
✓ 进度条布局优化（宽度 > 70% 屏宽）
✓ 习惯卡片排序逻辑（未完成优先）
✓ 打卡按钮尺寸优化（高度 ≥ 48px）
✓ 响应式布局适配（小程序底部栏安全区）
```

**样式参考**：
```wxss
/* 连续天数徽章 */
.streak-badge {
  background: linear-gradient(135deg, #FF6B6B 0%, #FFA500 100%);
  color: white;
  font-size: 16px;
  font-weight: bold;
  padding: 4px 12px;
  border-radius: 20px;
}

/* 打卡按钮 */
.checkin-btn {
  width: 70%;
  height: 56px;
  border-radius: 12px;
  background: #FF6B6B;
  color: white;
  font-size: 18px;
  font-weight: 600;

  /* 按下态 */
  &:active {
    background: #FF5252;
    transform: scale(0.98);
  }
}

/* 进度条容器 */
.progress-card {
  margin: 16px;
  padding: 16px;
  background: white;
  border-radius: 12px;
  box-shadow: 0 2px 8px rgba(0,0,0,0.08);
}
```

---

### 任务5：测试 + Bug修复（4h）

**测试清单**：
```
□ 首卡流程：从引导页→第一次打卡→反馈→【今日】
□ Day 3提示：第3天20:00后检查浮窗显示
□ Day 7庆祝：第7天打卡后检查弹窗 + 文案
□ 跨日逻辑：23:59:59打卡 vs 00:00:01打卡
□ 连续天数计算：中断1天后重新开始
□ 响应速度：打卡→反馈 < 200ms
□ 性能：页面加载 < 500ms，列表滑动 > 60fps
```

**预期Bug类型**：
- 时区问题（服务器时间 vs 用户本地时间）
- 动画帧率（iOS低端机型）
- 通知权限（Android）

---

## 🔄 工作流建议

### Sprint计划（2周）

**Week 1**：
- Day 1-2：完成任务1+2（首卡+反馈）
- Day 3-4：完成任务3（干预逻辑）
- Day 5：完成任务4（页面优化）
- 代码审查 + 冒烟测试

**Week 2**：
- Day 1-3：集成测试 + Bug修复
- Day 4：灰度发布（10%用户）
- Day 5：全量发布 + 监控数据

---

## 📊 质量检查点

### Code Review关键检查项

```javascript
□ 首卡标记是否正确保存到DB？
□ 时间计算是否使用UTC时间（避免时区问题）？
□ 反馈动画是否会导致内存泄漏？
□ 关键节点的触发条件是否逻辑清晰？
□ 错误处理：网络超时/云函数异常？
□ 日志上报：关键路径都有埋点？
```

### 测试数据

```
测试账号应该创建这些习惯：
1. 超微级：喝一杯水（已持续3天）
2. 微级：拉伸1分钟（已持续7天）
3. 轻级：跑步10分钟（已持续1天，即将第2天）
4. 某个习惯中断5天，今天要恢复

这样能全覆盖 Tier 1/2/3/4 的反馈场景
```

---

## 🎯 成功标准

### 功能标准
- ✅ 首卡完成后显示烟花反馈
- ✅ 第3天自动出现特殊文案
- ✅ 第5-7天的提示准时出现
- ✅ 连续天数准确计算
- ✅ 页面加载速度 > 80 分（Lighthouse）

### 用户体验标准
- ✅ 打卡流程 ≤ 30 秒
- ✅ 反馈延迟 < 100ms
- ✅ 没有明显卡顿（60fps）
- ✅ 文案温暖、可理解

### 数据标准
- ✅ 灰度期 Day 1→3 留存率 ≥ 85%
- ✅ Day 3→7 留存率 ≥ 75%
- ✅ 首卡完成率 ≥ 85%
- ✅ 反馈点击率（分享、下一个目标）≥ 40%

---

## 🚨 常见坑点

### 坑1：时区问题
**问题**：用户在北京，云函数是UTC时间
**解决**：
```javascript
// ❌ 错误
const today = new Date().toDateString();

// ✅ 正确
const today = new Date(new Date().getTime() + 8*60*60*1000).toDateString();
// 或使用服务器时间
```

### 坑2：动画帧率
**问题**：低端Android手机上动画卡顿
**解决**：
```javascript
// 使用 requestAnimationFrame 而不是 setInterval
// 或采用 Lottie 的硬件加速版本
```

### 坑3：多页面状态同步
**问题**：A页面完成打卡，B页面的进度条没更新
**解决**：
```javascript
// 使用全局状态管理或 EventBus
eventBus.emit('habitCheckinCompleted', { habitId, newStreak });

// 在【统计】页监听
eventBus.on('habitCheckinCompleted', () => {
  this.refreshStats();
});
```

---

## 📞 审批清单

**设计稿审批**：
- [ ] 反馈弹层的4个Tier设计
- [ ] 页面一的布局调整
- [ ] 色彩和动画规范

**需求澄清**：
- [ ] 连续天数的"中断规则"：隔日算中断吗？
- [ ] 周一重置后，上周的连续数据怎么处理？
- [ ] 过期时间的灰度处理（早上5点还是晚上12点？）

---

**下一步**：确认此文档后即可开始编码，预期2周交付V1.0。
