// 计算反馈等级
function computeTier (streakDays = 0, isRecovery = false) {
  if (isRecovery) return 'recovery';
  if (streakDays >= 7) return 'day7';
  if (streakDays >= 3) return 'day3';
  return 'regular';
}

Page({
  data: {
    feedbackVisible: false,
    habitId: null,
    tier: 'regular',
    loading: true,
    habitInfo: null
  },

  async onLoad (options) {
    // 从参数或存储中获取首个习惯ID
    let habitId = options?.habitId || null;
    if (!habitId) {
      try {
        habitId = wx.getStorageSync('pendingFirstCheckinHabitId');
      } catch (e) {
        console.warn('获取habitId失败:', e);
      }
    }

    this.setData({ habitId, loading: true });

    // 若有 habitId，尝试获取详情
    if (habitId) {
      try {
        const res = await wx.cloud.callFunction({
          name: 'getHabitDetail',
          data: { user_habit_id: habitId }
        });

        if (res.result.code === 0 && res.result.data.habit) {
          const habit = res.result.data.habit;
          const tier = computeTier(habit.streak || 0, false);

          this.setData({
            tier,
            habitInfo: {
              name: habit.name,
              trigger: habit.trigger,
              target_times_per_day: habit.target_times_per_day,
              icon: '✨'
            },
            loading: false
          });
        } else {
          this.setData({ loading: false });
        }
      } catch (e) {
        console.error('获取习惯详情失败:', e);
        this.setData({ loading: false });
      }
    } else {
      this.setData({ loading: false });
    }
  },

  async onFirstCheckin () {
    if (!this.data.habitId) {
      wx.showToast({ title: '习惯信息异常，请重试', icon: 'none' });
      return;
    }

    wx.vibrateLong();
    try {
      // 打卡逻辑
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
    } catch (e) {
      console.error('打卡失败:', e);
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
    } catch (e) {
      console.warn('存储数据失败:', e);
    }
  }
});
