// pages/home/home.js
const dateUtil = require('../../utils/date.js');
const util = require('../../utils/util.js');
const constants = require('../../utils/constants.js');

Page({
  data: {
    habits: [],
    dateDisplay: '',
    encouragementText: '',
    loading: false,
    showEndModal: false,
    endedHabit: null,
    endedHabits: [],
    checkingInId: null,
    allCompleted: false,
    showCompletedAnimation: false,
    loadError: false,
    completionRate: 0,
    editingId: null,
    showMenuId: null
  },

  onLoad () {
    this.initPage();
  },

  onShow () {
    this.loadTodayHabits();
  },

  onPullDownRefresh () {
    this.loadTodayHabits().then(() => {
      wx.stopPullDownRefresh();
    });
  },

  /**
   * 初始化页面
   */
  initPage () {
    // 设置日期显示
    this.setData({
      dateDisplay: dateUtil.getDateDisplay(),
      encouragementText: util.randomItem(constants.encouragementTexts)
    });
  },

  /**
   * 加载今日习惯
   */
  async loadTodayHabits () {
    this.setData({ loading: true, loadError: false });

    try {
      const res = await wx.cloud.callFunction({
        name: 'getTodayHabits'
      });

      if (res.result.code === 0) {
        const { habits, ended_habits } = res.result.data;
        const habitsData = habits || [];

        // 检查是否全部完成
        const allCompleted = habitsData.length > 0 && habitsData.every(h => h.is_completed);

        // 计算完成率
        let completionRate = 0;
        if (habitsData.length > 0) {
          const completedCount = habitsData.filter(h => h.is_completed).length;
          completionRate = Math.round((completedCount / habitsData.length) * 100);
        }

        // 为每个习惯计算当前周期天数
        const today = dateUtil.getToday();
        const habitsWithPeriod = habitsData.map(habit => {
          const daysDiff = dateUtil.getDaysBetween(habit.start_date, today);
          const currentDay = (daysDiff % habit.cycle_days) + 1;
          return {
            ...habit,
            current_day: currentDay
          };
        });

        this.setData({
          habits: habitsWithPeriod,
          endedHabits: ended_habits || [],
          loading: false,
          allCompleted: allCompleted,
          showCompletedAnimation: allCompleted,
          completionRate: completionRate
        });

        // 如果有结束的习惯,显示弹窗
        if (ended_habits && ended_habits.length > 0) {
          this.showEndedHabitModal(ended_habits[0]);
        }

        // 全部完成动画 3 秒后消失
        if (allCompleted) {
          setTimeout(() => {
            this.setData({ showCompletedAnimation: false });
          }, 3000);
        }
      } else {
        throw new Error(res.result.message);
      }
    } catch (error) {
      console.error('加载今日习惯失败:', error);
      this.setData({ loading: false, loadError: true });
    }
  },

  /**
   * 打卡
   */
  async handleCheckIn (e) {
    const { id, completed } = e.currentTarget.dataset;

    if (completed) {
      return;
    }

    // 防止重复打卡
    if (this.data.checkingInId === id) {
      return;
    }

    this.setData({ checkingInId: id });

    try {
      // 乐观更新UI
      const habits = this.data.habits.map(habit => {
        if (habit._id === id) {
          return {
            ...habit,
            today_times: habit.today_times + 1,
            is_completed: habit.today_times + 1 >= habit.target_times_per_day
          };
        }
        return habit;
      });

      // 计算新的完成率
      const completedCount = habits.filter(h => h.is_completed).length;
      const completionRate = Math.round((completedCount / habits.length) * 100);

      this.setData({ habits, completionRate });

      // 调用云函数
      const res = await wx.cloud.callFunction({
        name: 'logHabit',
        data: { user_habit_id: id }
      });

      if (res.result.code === 0) {
        // 显示成功提示
        const successText = util.randomItem(constants.checkInSuccessTexts);
        util.showToast(successText, 'success');

        // 检查是否全部完成
        const allCompleted = habits.every(h => h.is_completed);
        if (allCompleted) {
          this.setData({
            allCompleted: true,
            showCompletedAnimation: true
          });
          setTimeout(() => {
            this.setData({ showCompletedAnimation: false });
          }, 3000);
        }
      } else if (res.result.code === 1002) {
        // 已达到今日目标
        util.showToast(res.result.message);
      } else {
        // 失败,回滚 UI,给出重试提示
        this.loadTodayHabits();
        wx.showModal({
          title: '打卡失败',
          content: res.result.message || '网络错误，请重试',
          showCancel: true,
          confirmText: '重试',
          cancelText: '取消',
          success: (result) => {
            if (result.confirm) {
              this.handleCheckIn(e);
            }
          }
        });
      }
    } catch (error) {
      console.error('打卡失败:', error);
      // 回滚 UI
      this.loadTodayHabits();
      wx.showModal({
        title: '网络错误',
        content: '打卡失败，请检查网络后重试',
        showCancel: true,
        confirmText: '重试',
        cancelText: '取消',
        success: (result) => {
          if (result.confirm) {
            this.handleCheckIn(e);
          }
        }
      });
    } finally {
      this.setData({ checkingInId: null });
    }
  },

  /**
   * 显示周期结束弹窗
   */
  showEndedHabitModal (habit) {
    // TODO: 调用云函数获取习惯完成情况
    this.setData({
      showEndModal: true,
      endedHabit: {
        ...habit,
        completed_days: 15,  // 临时数据
        completion_rate: 71   // 临时数据
      }
    });
  },

  /**
   * 隐藏弹窗
   */
  hideEndModal () {
    this.setData({ showEndModal: false });
  },

  /**
   * 阻止冒泡
   */
  stopPropagation () { },

  /**
   * 继续新一轮
   */
  async continueHabit () {
    const habitId = this.data.endedHabit._id;

    try {
      util.showLoading('处理中...');

      const res = await wx.cloud.callFunction({
        name: 'updateHabitStatus',
        data: {
          user_habit_id: habitId,
          action: 'continue'
        }
      });

      util.hideLoading();

      if (res.result.code === 0) {
        util.showToast('已开启新一轮21天', 'success');
        this.hideEndModal();
        this.loadTodayHabits();
      } else {
        util.showToast(res.result.message);
      }
    } catch (error) {
      util.hideLoading();
      util.showToast('操作失败,请重试');
    }
  },

  /**
   * 调整习惯
   */
  adjustHabit () {
    const habitId = this.data.endedHabit._id;
    this.hideEndModal();
    wx.navigateTo({
      url: `/pages/create-habit/create-habit?id=${habitId}&mode=edit`
    });
  },

  /**
   * 暂停习惯
   */
  async pauseHabit () {
    const confirmed = await util.showConfirm(
      '确认暂停',
      '暂停后该习惯将不再显示在今日列表中'
    );

    if (!confirmed) {
      return;
    }

    const habitId = this.data.endedHabit._id;

    try {
      util.showLoading('处理中...');

      const res = await wx.cloud.callFunction({
        name: 'updateHabitStatus',
        data: {
          user_habit_id: habitId,
          action: 'pause'
        }
      });

      util.hideLoading();

      if (res.result.code === 0) {
        util.showToast('已暂停该习惯', 'success');
        this.hideEndModal();
        this.loadTodayHabits();
      } else {
        util.showToast(res.result.message);
      }
    } catch (error) {
      util.hideLoading();
      util.showToast('操作失败,请重试');
    }
  },

  /**
   * 前往习惯库
   */
  goToHabits () {
    wx.switchTab({
      url: '/pages/habits/habits'
    });
  },

  /**
   * 前往新建页面
   */
  goToCreate () {
    wx.navigateTo({
      url: '/pages/create-habit/create-habit'
    });
  },

  /**
   * 重试加载
   */
  retryLoadTodayHabits () {
    this.loadTodayHabits();
  },

  /**
   * 显示习惯长按菜单
   */
  showHabitMenu (e) {
    const habitId = e.currentTarget.dataset.id;
    this.setData({
      editingId: habitId,
      showMenuId: habitId
    });
  },

  /**
   * 卡片点击 - 关闭菜单
   */
  handleCardTap (e) {
    // 获取点击目标的习惯ID
    const habitId = e.currentTarget.dataset.id;

    // 如果点击的是编辑/删除按钮,不关闭菜单(让按钮自己的bindtap处理)
    if (e.target.className && e.target.className.includes('action-btn')) {
      return;
    }

    // 否则关闭菜单
    if (this.data.editingId) {
      this.setData({
        editingId: null,
        showMenuId: null
      });
    }
  },

  /**
   * 编辑习惯
   */
  editHabit (e) {
    const habitId = e.currentTarget.dataset.id;
    this.setData({
      editingId: null,
      showMenuId: null
    });
    wx.navigateTo({
      url: `/pages/habit-detail/habit-detail?id=${habitId}&mode=edit`
    });
  },

  /**
   * 删除习惯
   */
  deleteHabit (e) {
    const habitId = e.currentTarget.dataset.id;
    const habitName = this.data.habits.find(h => h._id === habitId)?.name || '该习惯';

    wx.showModal({
      title: '确认删除',
      content: `确定要删除"${habitName}"吗?`,
      confirmText: '删除',
      cancelText: '取消',
      success: (res) => {
        if (res.confirm) {
          this.performDelete(habitId);
        } else {
          this.setData({
            editingId: null,
            showMenuId: null
          });
        }
      }
    });
  },

  /**
   * 执行删除操作
   */
  performDelete (habitId) {
    wx.showLoading({ title: '删除中...' });

    wx.cloud.callFunction({
      name: 'updateHabitStatus',
      data: {
        habit_id: habitId,
        status: 'deleted'
      },
      success: (res) => {
        wx.hideLoading();
        wx.showToast({
          title: '已删除',
          icon: 'success',
          duration: 2000
        });
        this.setData({
          editingId: null,
          showMenuId: null
        });
        this.loadTodayHabits();
      },
      fail: (err) => {
        wx.hideLoading();
        wx.showToast({
          title: '删除失败,请重试',
          icon: 'error',
          duration: 2000
        });
        console.error('删除习惯失败:', err);
      }
    });
  }
});
