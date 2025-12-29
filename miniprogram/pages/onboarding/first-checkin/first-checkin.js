const { computeTier } = require('../../utils/tier.js');
const analytics = require('../../utils/analytics.js');
const api = require('../../utils/api.js');

Page({
  data: {
    feedbackVisible: false,
    habitId: null,
    tier: 'regular'
  },

  async onLoad (options) {
    // 从参数或存储中获取首个习惯ID
    const habitId = options?.habitId || null;
    this.setData({ habitId });

    // 若有 habitId，尝试获取详情以计算 tier
    if (habitId) {
      try {
        const { streakDays, isRecovery } = await api.getHabitDetailStd(habitId);
        const tier = computeTier(streakDays, isRecovery);
        this.setData({ tier });
        analytics.firstCheckinDisplay(habitId, tier);
      } catch (e) {
        // 保底为 regular
        this.setData({ tier: 'regular' });
        analytics.firstCheckinDisplay(habitId, 'regular');
      }
    } else {
      analytics.firstCheckinDisplay('', 'regular');
    }
  },

  async onFirstCheckin () {
    wx.vibrateLong();
    try {
      // 打卡逻辑（云函数）
      await wx.cloud.callFunction({
        name: 'logHabit',
        data: {
          habitId: this.data.habitId,
          user_habit_id: this.data.habitId,
          isFirstCheckin: true,
          checkType: this.data.tier
        }
      });
      this.setData({ feedbackVisible: true });
      analytics.firstCheckinCompleted(this.data.habitId, this.data.tier);
    } catch (e) {
      wx.showToast({ title: '网络异常，请稍后重试', icon: 'none' });
    }
  },

  onDismissFeedback () {
    this.setData({ feedbackVisible: false });
    // 返回首页
    wx.navigateBack({ delta: 1 });
    try {
      wx.setStorageSync('first_checkin_pending', false);
      wx.setStorageSync('first_checkin_done', true);
      wx.removeStorageSync('pendingFirstCheckinHabitId');
    } catch (e) { }
  }
});
