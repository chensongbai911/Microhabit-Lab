const constants = require('../../utils/constants.js');
const triggerTime = require('../../utils/triggerTime.js');

Page({
  data: {
    habitId: '',
    habit: null,
    categoryName: '',
    stats: {
      completed_days: 0,
      total_days: 21,
      completion_rate: 0,
      max_streak: 0,
      progress: {
        current: 1,
        total: 21,
        percentage: 0
      }
    },
    calendar: [],
    advice: '',
    loading: true,
    selectedDate: null,
    selectedDateData: null,
    showDateModal: false,
    // P0: 编辑功能新增数据
    editMode: false,
    showEditTargetModal: false,
    showEditReminderModal: false,
    editingTargetTimes: 1,
    editingReminder: '',
    isPaused: false
  },

  onLoad (options) {
    const { id } = options;
    if (!id) {
      wx.showToast({ title: '缺少习惯ID', icon: 'none' });
      return;
    }

    this.setData({ habitId: id });
    this.loadDetail();
  },

  onPullDownRefresh () {
    this.loadDetail().finally(() => {
      wx.stopPullDownRefresh();
    });
  },

  async loadDetail () {
    this.setData({ loading: true });
    try {
      const res = await wx.cloud.callFunction({
        name: 'getHabitDetail',
        data: { user_habit_id: this.data.habitId }
      });

      if (res.result.code === 0) {
        const { habit, stats, calendar, advice } = res.result.data;
        const categoryName = this.getCategoryName(habit.category);
        this.setData({
          habit,
          categoryName,
          stats,
          calendar,
          advice,
          loading: false,
          editingTargetTimes: habit.target_times_per_day || 1,
          editingReminder: habit.trigger || habit.default_trigger || '',
          isPaused: habit.status === 'paused' || false
        });
      } else {
        wx.showToast({ title: res.result.message || '获取失败', icon: 'none' });
        this.setData({ loading: false });
      }
    } catch (error) {
      console.error('加载详情失败', error);
      wx.showToast({ title: '加载失败', icon: 'none' });
      this.setData({ loading: false });
    }
  },

  getCategoryName (value) {
    return constants.categoryNames[value] || value || '习惯';
  },

  /**
   * 点击日历日期查看详情
   */
  selectCalendarDay (e) {
    const { date, completed, times } = e.currentTarget.dataset;
    const [year, month, day] = date.split('-');
    const formatDate = `${month}月${day}日`;

    this.setData({
      selectedDate: date,
      selectedDateData: {
        date: formatDate,
        day,
        completed: completed === 'true' || completed === true,
        times: parseInt(times) || 0,
        targetTimes: this.data.habit.target_times_per_day
      },
      showDateModal: true
    });
  },

  /**
   * 关闭日期详情弹窗
   */
  closeDateModal () {
    this.setData({ showDateModal: false });
  },

  /**
   * P0: 暂停/继续习惯
   */
  togglePauseHabit () {
    const newStatus = this.data.isPaused ? 'active' : 'paused';
    const confirmText = this.data.isPaused ? '继续这个习惯？' : '暂停这个习惯？';
    const content = this.data.isPaused
      ? '继续后，您将重新开始计数，坚持完成这个习惯。'
      : '暂停后，这个习惯不会出现在今日列表中，但进度数据会保留。';

    wx.showModal({
      title: confirmText,
      content: content,
      confirmText: '确认',
      cancelText: '取消',
      success: async (res) => {
        if (res.confirm) {
          await this.updateHabitStatus(newStatus);
        }
      }
    });
  },

  /**
   * 更新习惯状态（暂停/继续）
   */
  async updateHabitStatus (status) {
    this.setData({ loading: true });
    try {
      const res = await wx.cloud.callFunction({
        name: 'updateHabit',
        data: {
          user_habit_id: this.data.habitId,
          updates: {
            status: status,
            updated_at: new Date().toISOString()
          }
        }
      });

      if (res.result.code === 0) {
        const isPaused = status === 'paused';
        this.setData({ isPaused });
        wx.showToast({
          title: isPaused ? '已暂停' : '已继续',
          icon: 'success'
        });
        this.loadDetail();
      } else {
        wx.showToast({ title: res.result.message || '更新失败', icon: 'none' });
        this.setData({ loading: false });
      }
    } catch (error) {
      console.error('更新失败', error);
      wx.showToast({ title: '更新失败，请重试', icon: 'none' });
      this.setData({ loading: false });
    }
  },

  /**
   * P0: 打开编辑目标次数弹窗
   */
  showEditTargetModal () {
    this.setData({
      showEditTargetModal: true,
      editingTargetTimes: this.data.habit.target_times_per_day || 1
    });
  },

  /**
   * 关闭目标次数编辑弹窗
   */
  closeEditTargetModal () {
    this.setData({ showEditTargetModal: false });
  },

  /**
   * 更新目标次数（+1/-1按钮处理）
   */
  updateTargetTimes (e) {
    const action = e.currentTarget.dataset.action;
    let newValue = this.data.editingTargetTimes;

    if (action === 'increase') {
      newValue = Math.min(newValue + 1, 10);
    } else if (action === 'decrease') {
      newValue = Math.max(newValue - 1, 1);
    }

    this.setData({ editingTargetTimes: newValue });
  },

  /**
   * 保存目标次数更改
   */
  async saveTargetTimes () {
    const newTargetTimes = this.data.editingTargetTimes;
    if (newTargetTimes === this.data.habit.target_times_per_day) {
      this.setData({ showEditTargetModal: false });
      return;
    }

    this.setData({ loading: true });
    try {
      const res = await wx.cloud.callFunction({
        name: 'updateHabit',
        data: {
          user_habit_id: this.data.habitId,
          updates: {
            target_times_per_day: newTargetTimes,
            updated_at: new Date().toISOString()
          }
        }
      });

      if (res.result.code === 0) {
        wx.showToast({ title: '已更新', icon: 'success' });
        this.setData({ showEditTargetModal: false });
        this.loadDetail();
      } else {
        wx.showToast({ title: res.result.message || '更新失败', icon: 'none' });
        this.setData({ loading: false });
      }
    } catch (error) {
      console.error('更新失败', error);
      wx.showToast({ title: '更新失败，请重试', icon: 'none' });
      this.setData({ loading: false });
    }
  },

  /**
   * P0: 打开编辑提醒时间弹窗
   */
  showEditReminderModal () {
    this.setData({
      showEditReminderModal: true,
      editingReminder: this.data.habit.trigger || this.data.habit.default_trigger || ''
    });
  },

  /**
   * 关闭提醒编辑弹窗
   */
  closeEditReminderModal () {
    this.setData({ showEditReminderModal: false });
  },

  /**
   * 更新提醒输入值
   */
  onReminderInput (e) {
    this.setData({ editingReminder: e.detail.value });
  },

  /**
   * 保存提醒时间更改
   */
  async saveReminder () {
    const newReminder = this.data.editingReminder.trim();
    if (!newReminder) {
      wx.showToast({ title: '提醒时间不能为空', icon: 'none' });
      return;
    }

    if (newReminder === this.data.habit.trigger) {
      this.setData({ showEditReminderModal: false });
      return;
    }

    this.setData({ loading: true });
    try {
      const res = await wx.cloud.callFunction({
        name: 'updateHabit',
        data: {
          user_habit_id: this.data.habitId,
          updates: {
            trigger: newReminder,
            updated_at: new Date().toISOString()
          }
        }
      });

      if (res.result.code === 0) {
        wx.showToast({ title: '已更新', icon: 'success' });
        this.setData({ showEditReminderModal: false });
        this.loadDetail();
      } else {
        wx.showToast({ title: res.result.message || '更新失败', icon: 'none' });
        this.setData({ loading: false });
      }
    } catch (error) {
      console.error('更新失败', error);
      wx.showToast({ title: '更新失败，请重试', icon: 'none' });
      this.setData({ loading: false });
    }
  },

  /**
   * 查看变更历史
   */
  viewHistory () {
    wx.navigateTo({
      url: `/pages/habit-history/habit-history?id=${this.data.habitId}`,
      fail: (error) => {
        console.error('导航失败', error);
        wx.showToast({ title: '导航失败', icon: 'none' });
      }
    });
  },

  /**
   * 编辑习惯
   */
  editHabit () {
    wx.navigateTo({
      url: `/pages/create-habit/create-habit?id=${this.data.habitId}`,
      fail: (error) => {
        console.error('导航失败', error);
        wx.showToast({ title: '导航失败', icon: 'none' });
      }
    });
  },

  /**
   * 删除习惯（软删除）
   */
  deleteHabit () {
    wx.showModal({
      title: '删除确认',
      content: '删除后可在"已删除"页面中的30天内恢复，确定删除吗？',
      confirmText: '删除',
      cancelText: '取消',
      success: async (res) => {
        if (res.confirm) {
          this.setData({ loading: true });
          try {
            const deleteRes = await wx.cloud.callFunction({
              name: 'softDeleteHabit',
              data: { user_habit_id: this.data.habitId }
            });

            if (deleteRes.result.code === 0) {
              wx.showToast({
                title: '已删除，30天内可恢复',
                icon: 'success'
              });
              setTimeout(() => {
                wx.navigateBack();
              }, 1000);
            } else {
              wx.showToast({
                title: deleteRes.result.message || '删除失败',
                icon: 'none'
              });
              this.setData({ loading: false });
            }
          } catch (error) {
            console.error('删除失败', error);
            wx.showToast({ title: '删除失败', icon: 'none' });
            this.setData({ loading: false });
          }
        }
      }
    });
  }
});
