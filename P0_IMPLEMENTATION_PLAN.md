# 微习惯实验室 - P0 缺陷修复实现清单

**目标**: 在 3-5 小时内完成核心缺陷修复,达到上线标准
**当前日期**: 2025年12月30日
**版本目标**: v1.1

---

## 🎯 P0 优先级任务 (按执行顺序)

### Task 1: 21天周期结束弹窗流程实现 ⏱️ 2-3h

#### 1.1 需求分析
**用户场景**:
- 用户创建习惯后 21 天
- 打开首页时检测到周期已结束
- 弹出"实验结束"弹窗
- 用户选择: 继续 / 改小 / 暂停

**涉及页面**:
- `miniprogram/pages/home/home.js` - 检测逻辑 + 弹窗交互
- `miniprogram/pages/home/home.wxml` - 弹窗 UI
- `miniprogram/pages/home/home.wxss` - 弹窗样式
- `cloudfunctions/updateHabitStatus/` - 状态更新 (已存在)

#### 1.2 实现步骤

**Step 1: 在 home.js onShow 添加周期检测**
```javascript
onShow () {
  this.checkFirstCheckinShortcut();
  this.checkJustCreatedHabit();
  this.checkCycleEndedHabits();  // ← 新增
  this.loadTodayHabits();
}

/**
 * 检查是否有完成周期的习惯
 */
async checkCycleEndedHabits () {
  const habits = this.data.habits || [];
  const now = new Date();

  for (const habit of habits) {
    const endDate = new Date(habit.end_date);
    if (now > endDate && habit.status === 'in_progress') {
      // 找到已结束的习惯,弹窗显示
      this.showCycleEndModal(habit);
      break; // 一次只显示一个
    }
  }
}

/**
 * 显示周期结束弹窗
 */
showCycleEndModal (habit) {
  const completedDays = habit.completed_days || 0;
  const totalDays = habit.cycle_days || 21;
  const completionRate = Math.round((completedDays / totalDays) * 100);

  const modalText = `在这 ${totalDays} 天里,你在 ${completedDays}/${totalDays} 天完成了这个微习惯,完成率 ${completionRate}%`;

  this.setData({
    showCycleEndModal: true,
    cycleEndHabit: habit,
    cycleEndModalText: modalText,
    completionRate: completionRate
  });
}
```

**Step 2: 在 home.wxml 添加弹窗 UI**
```xml
<!-- 周期结束弹窗 -->
<view class="cycle-end-modal" wx:if="{{showCycleEndModal}}">
  <view class="modal-overlay" bindtap="closeCycleEndModal"></view>
  <view class="modal-content">
    <view class="modal-header">
      <text class="modal-emoji">🎉</text>
      <text class="modal-title">21 天实验结束</text>
    </view>

    <view class="modal-body">

---

## ✅ 提交、测试与发布操作说明

下面给出一套在 Windows PowerShell 下的常用命令，帮助你把改动提交到 Git 并创建一个用于代码审查的分支/PR。请在提交前先在微信开发者工具中运行并验证所有场景。

PowerShell: 基本操作
```powershell
# 切换到仓库根目录
Set-Location -Path "d:\AABBCC"

# 创建分支并切换（示例分支名）
git checkout -b fix/p0-cycle-end-modal

# 添加变更文件
git add miniprogram/pages/home/home.*

# 提交（写清楚改动要点）
git commit -m "fix(home): add 21-day cycle end modal and checkin debounce; styles"

# 推送到远程
git push -u origin HEAD

# 在 GitHub 上创建 Pull Request（若有 hub 或 gh 客户端）
# gh pr create --title "fix: cycle end modal + checkin debounce" --body "Implements P0 fixes: modal, debounce, styles" --base master
```

验收（QA）清单 - Acceptance Criteria
- 在开发者工具模拟器/真机上，创建一个 end_date 为今天的习惯，打开首页应弹出周期结束弹窗；三按键能完成对应动作。
- 打卡按钮在短时间连续点击只会触发一次云函数（节流生效），UI 显示"打卡中..."状态。
- 模拟网络异常：调用失败时 UI 能回滚并提示“网络异常，数据已保存”。
- 会员本地支付模式能完成会员激活流程，且权限（习惯上限/图表）即时生效。

发布与回滚策略
- 发布: 合并 PR 后，先在灰度环境或小范围真机上验证（2-3 人）24 小时，再全量替换云函数与小程序代码。
- 回滚: 若发现关键问题，回滚步骤为：
  1. 在 GitHub 上 revert 合并的 PR 或重置 master 到上一个稳定提交并 force-push（仅在紧急情况下）。
  2. 将云函数恢复到上一个已知稳定版本（CloudBase 控制台可回滚部署包）。
  3. 通知用户并发布补丁。

发布说明模板（Release Notes）
```
v1.1 - P0 修复 (2025-12-30)
  - 修复: 添加 21 天实验结束弹窗，支持继续/改小/暂停操作
  - 修复: 打卡节流，避免重复提交
  - 新增: 本地模拟会员支付测试模式
  - 优化: 弹窗样式与交互体验
```

## 🔧 额外建议（上线后 48 小时内）
- 监控日志: 关注 `logHabit` 与 `updateHabit` 云函数的错误率（CloudBase 控制台）。
- 收集用户反馈: 在设置页或弹窗中加入“问题反馈”快捷入口，便于快速修复。
- 如果出现回滚，先暂停推送通知与定时任务，避免重复提醒用户。

---

如果你愿意，我现在可以：
- 1) 帮你把所有修改做一次 git 提交（只要允许我运行 shell 命令），或者
- 2) 直接在仓库中创建 PR（需要远程权限），或者
- 3) 先在本地运行一次功能回归测试脚本（我可以生成测试脚本指令），你选择其中一项即可。

      <view class="habit-name">{{cycleEndHabit.name}}</view>
      <view class="habit-stats">
        <text class="stat-label">完成率</text>
        <text class="stat-value">{{completionRate}}%</text>
      </view>
      <view class="modal-text">{{cycleEndModalText}}</view>
    </view>

    <view class="modal-buttons">
      <button class="btn btn-primary" bindtap="handleContinueNextRound">
        继续下一轮 21 天
      </button>
      <button class="btn btn-secondary" bindtap="handleEditHabit">
        太难了，改小一点
      </button>
      <button class="btn btn-ghost" bindtap="handlePauseHabit">
        先暂停这个习惯
      </button>
    </view>
  </view>
</view>
```

**Step 3: 在 home.wxss 添加样式**
```wxss
.cycle-end-modal {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  z-index: 1000;
  display: flex;
  align-items: flex-end;
  animation: slideUp 0.3s ease-out;
}

.modal-overlay {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.5);
}

.modal-content {
  position: relative;
  background: white;
  border-radius: 20px 20px 0 0;
  padding: 32px 20px;
  width: 100%;
  animation: slideUp 0.3s ease-out;
}

.modal-header {
  text-align: center;
  margin-bottom: 20px;
}

.modal-emoji {
  font-size: 48px;
  display: block;
  margin-bottom: 12px;
}

.modal-title {
  font-size: 24px;
  font-weight: bold;
  color: #333;
}

.modal-body {
  text-align: center;
  margin-bottom: 24px;
}

.habit-name {
  font-size: 18px;
  color: #333;
  margin-bottom: 16px;
  font-weight: 600;
}

.habit-stats {
  display: flex;
  justify-content: center;
  align-items: center;
  margin-bottom: 16px;
}

.stat-label {
  color: #999;
  font-size: 14px;
  margin-right: 8px;
}

.stat-value {
  font-size: 32px;
  color: #07C160;
  font-weight: bold;
}

.modal-text {
  color: #666;
  font-size: 14px;
  line-height: 1.6;
}

.modal-buttons {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.btn {
  padding: 12px;
  border-radius: 8px;
  font-size: 16px;
  border: none;
  cursor: pointer;
}

.btn-primary {
  background: #07C160;
  color: white;
}

.btn-secondary {
  background: #FAAD14;
  color: white;
}

.btn-ghost {
  background: #f5f5f5;
  color: #333;
}
```

**Step 4: 添加按钮点击处理器**
```javascript
/**
 * 继续下一轮 21 天
 */
async handleContinueNextRound () {
  const habit = this.data.cycleEndHabit;
  if (!habit) return;

  wx.showLoading({ title: '更新中...' });

  try {
    const today = new Date().toISOString().split('T')[0];

    // 更新习惯状态: 重置 start_date, 保持 status = in_progress
    await wx.cloud.callFunction({
      name: 'updateHabit',
      data: {
        habitId: habit._id,
        updateData: {
          start_date: today,
          updated_at: new Date().toISOString()
        }
      }
    });

    wx.showToast({ title: '继续加油！', icon: 'success' });
    this.setData({ showCycleEndModal: false });

    // 刷新列表
    setTimeout(() => {
      this.loadTodayHabits();
    }, 1000);
  } catch (error) {
    console.error('更新习惯失败', error);
    wx.showToast({ title: '更新失败,请重试', icon: 'none' });
  } finally {
    wx.hideLoading();
  }
}

/**
 * 编辑后重新开始
 */
async handleEditHabit () {
  const habit = this.data.cycleEndHabit;
  if (!habit) return;

  this.setData({ showCycleEndModal: false });

  // 导航到编辑页,并传递 habitId
  wx.navigateTo({
    url: `/pages/create-habit/create-habit?habitId=${habit._id}&isEdit=true`,
    fail: (err) => {
      console.error('导航失败', err);
    }
  });
}

/**
 * 暂停这个习惯
 */
async handlePauseHabit () {
  const habit = this.data.cycleEndHabit;
  if (!habit) return;

  wx.showLoading({ title: '更新中...' });

  try {
    // 更新习惯状态: status = finished
    await wx.cloud.callFunction({
      name: 'updateHabit',
      data: {
        habitId: habit._id,
        updateData: {
          status: 'finished',
          updated_at: new Date().toISOString()
        }
      }
    });

    wx.showToast({ title: '已暂停', icon: 'success' });
    this.setData({ showCycleEndModal: false });

    // 刷新列表
    setTimeout(() => {
      this.loadTodayHabits();
    }, 1000);
  } catch (error) {
    console.error('暂停失败', error);
    wx.showToast({ title: '操作失败,请重试', icon: 'none' });
  } finally {
    wx.hideLoading();
  }
}

closeCycleEndModal () {
  this.setData({ showCycleEndModal: false });
}
```

#### 1.3 数据结构检查
- ✅ home.data 需要添加:
  - `showCycleEndModal`: false
  - `cycleEndHabit`: {}
  - `cycleEndModalText`: ''
  - `completionRate`: 0

#### 1.4 测试场景
```
测试 1.1: 周期正好到期
- 创建习惯,start_date = 今天 - 20 天
- end_date = start_date + 20 天 = 今天
- 打开首页 → 应该出现弹窗 ✓

测试 1.2: 点击"继续下一轮"
- 点击按钮 → start_date 更新为今天
- 习惯状态仍为 in_progress ✓

测试 1.3: 点击"改小一点"
- 点击按钮 → 导航到编辑页
- 编辑后保存 → start_date 更新为今天 ✓

测试 1.4: 点击"先暂停"
- 点击按钮 → status 更新为 finished
- 习惯不再显示在今日列表 ✓
```

---

### Task 2: 打卡按钮节流处理 ⏱️ 1h

#### 2.1 问题描述
目前打卡按钮可以快速多次点击,导致可能的重复提交

#### 2.2 解决方案

**在 home.js 的 logHabit 方法中添加节流**:
```javascript
/**
 * 打卡习惯 (带节流)
 */
async logHabit (habitId) {
  // 节流检查
  if (this.data.checkingInId === habitId) {
    console.warn('正在处理中,请稍候');
    return;
  }

  this.setData({ checkingInId: habitId });

  try {
    wx.showLoading({ title: '打卡中...' });

    const res = await wx.cloud.callFunction({
      name: 'logHabit',
      data: { habitId }
    });

    if (res.result.code === 0) {
      wx.showToast({ title: '打卡成功！', icon: 'success' });
      // 更新本地数据
      const habits = this.data.habits.map(h => {
        if (h._id === habitId) {
          h.today_times = res.result.data.times;
        }
        return h;
      });
      this.setData({ habits });
    } else {
      wx.showToast({ title: res.result.message || '打卡失败', icon: 'none' });
    }
  } catch (error) {
    console.error('打卡错误', error);
    wx.showToast({ title: '网络异常,请重试', icon: 'none' });
  } finally {
    wx.hideLoading();
    // 1 秒后解除节流
    setTimeout(() => {
      this.setData({ checkingInId: null });
    }, 1000);
  }
}
```

**在 home.wxml 中绑定点击事件**:
```xml
<!-- 习惯卡片中的打卡按钮 -->
<view class="checkin-btn-container">
  <button
    class="checkin-btn {{checkingInId === item._id ? 'disabled' : ''}}"
    bindtap="onHabitCheckin"
    data-id="{{item._id}}"
    disabled="{{checkingInId === item._id}}"
  >
    {{checkingInId === item._id ? '打卡中...' : '打卡'}}
  </button>
</view>
```

**在 home.wxss 中添加样式**:
```wxss
.checkin-btn.disabled {
  opacity: 0.6;
  pointer-events: none;
}

.checkin-btn:active:not(.disabled) {
  transform: scale(0.95);
}
```

#### 2.3 验证清单
- [ ] 单次点击正常打卡
- [ ] 快速连续点击只打卡一次
- [ ] 打卡中显示"打卡中..."文本
- [ ] 按钮禁用状态生效

---

### Task 3: 会员支付本地模式测试 ⏱️ 1h

#### 3.1 已完成内容
✅ membership.js 已实现 useLocalPayment 模式
✅ handleLocalPayment() 方法已实现
✅ 支持切换 useLocalPayment: true/false

#### 3.2 测试步骤

```
测试 3.1: 开启本地模式
- 打开 membership 页面
- 点击"升级到会员" 按钮
- 应该显示"当前为演示模式"的确认框 ✓

测试 3.2: 模拟支付成功
- 在弹出的对话框中点击"确认支付"
- 应该直接调用 activateMembership
- 应该显示"会员已开通" toast ✓
- 页面应该刷新,显示"已开通会员" ✓
- 有效期应该显示为 30 天后 ✓

测试 3.3: 用户取消
- 点击"升级到会员"
- 在对话框中点击"取消"
- 应该无任何变化 ✓

测试 3.4: 验证会员权限
- 开通会员后
- 创建第 4、5 个习惯时应该不再提示限制 ✓
- 数据页应该显示完整 21 天图表 ✓

测试 3.5: 会员过期检查
- 手动修改 member_expire_time 为昨天
- 重新进入应用
- 应该自动降为免费版 ✓
```

#### 3.3 配置检查
```javascript
// miniprogram/pages/membership/membership.js 第 27-29 行
data: {
  ...
  useLocalPayment: true,      // ← 确保为 true
  localPaymentEnabled: true   // ← 确保为 true
  ...
}
```

#### 3.4 后续配置 (真实支付时)
当获得商户号后,修改:
```javascript
data: {
  ...
  useLocalPayment: false,     // ← 改为 false 启用真实支付
  localPaymentEnabled: true
  ...
}
```

---

## 📋 执行检查清单

### 实现阶段
- [ ] Task 1: 周期结束弹窗 (2-3h)
  - [ ] 1.1 检测逻辑
  - [ ] 1.2 弹窗 UI
  - [ ] 1.3 按钮处理
  - [ ] 1.4 云函数调用

- [ ] Task 2: 打卡节流 (1h)
  - [ ] 2.1 节流逻辑
  - [ ] 2.2 UI 反馈
  - [ ] 2.3 样式

- [ ] Task 3: 支付测试 (1h)
  - [ ] 3.1 配置检查
  - [ ] 3.2 功能测试
  - [ ] 3.3 权限验证

### 测试阶段
- [ ] 完整功能测试 (3-5 个小时)
- [ ] 8 大场景验证:
  - [ ] A: 新用户完整首进
  - [ ] B: 网络断线恢复
  - [ ] C: 重复快速打卡
  - [ ] D: 周期结束处理 ← 新增
  - [ ] E: 会员开通激活
  - [ ] F: 恢复流程
  - [ ] G: 多习惯并行
  - [ ] H: 数据一致性

### 部署阶段
- [ ] 代码审查
- [ ] 性能检查
- [ ] 上线前清单
  - [ ] 所有 console.log 移除 (仅保留 error)
  - [ ] 所有错误情况有处理
  - [ ] 所有动效性能正常
  - [ ] 隐私政策已集成

---

## 🎯 预期结果

完成以上三个任务后:

✅ **功能完成度**: 90% → 98%
✅ **上线就绪度**: 良好
✅ **用户体验**: 核心流程完整
✅ **数据准确性**: 保证

**版本**: v1.1 ready
**预计发布**: 3-5 天内

---

## 💡 快速参考命令

```bash
# 查看当前 home.js 行数
wc -l miniprogram/pages/home/home.js

# 查看需要修改的文件
ls -la miniprogram/pages/home/

# 检查云函数是否部署
ls cloudfunctions/updateHabit/
```

