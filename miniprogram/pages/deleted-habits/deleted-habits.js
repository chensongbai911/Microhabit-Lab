// pages/deleted-habits/deleted-habits.js
const util = require('../../utils/util.js');

Page({
  data: {
    deletedHabits: [],
    loading: false,
    emptyState: false
  },

  onLoad () {
    this.loadDeletedHabits();
  },

  /**
   * 加载已删除的习惯
   */
  async loadDeletedHabits () {
    try {
      this.setData({ loading: true });

      const res = await wx.cloud.callFunction({
        name: 'getMyHabits',
        data: { status: 'deleted' }
      });

      if (res.result.code === 0) {
        const habits = res.result.data.habits || [];

        // 计算剩余恢复时间
        const formattedHabits = habits.map(habit => {
          const now = new Date().getTime();
          const deadline = habit.recover_deadline || 0;
          const remaining = Math.max(0, Math.floor((deadline - now) / (24 * 60 * 60 * 1000)));

          return {
            ...habit,
            remaining_days: remaining,
            can_restore: remaining > 0,
            deleted_date: this.formatDate(habit.deleted_at),
            deadline_date: this.formatDate(new Date(deadline))
          };
        });

        this.setData({
          deletedHabits: formattedHabits.sort((a, b) => b.deleted_timestamp - a.deleted_timestamp),
          emptyState: formattedHabits.length === 0,
          loading: false
        });
      } else {
        util.showToast('加载失败');
        this.setData({ loading: false });
      }
    } catch (error) {
      util.showToast('加载失败');
      this.setData({ loading: false });
      console.error('加载已删除习惯失败:', error);
    }
  },

  /**
   * 格式化日期
   */
  formatDate (date) {
    if (!date) return '';
    const d = new Date(typeof date === 'string' ? Date.parse(date) : date);
    return d.toLocaleDateString('zh-CN');
  },

  /**
   * 恢复习惯
   */
  async restoreHabit (e) {
    const habitId = e.currentTarget.dataset.id;
    const habitName = e.currentTarget.dataset.name;

    wx.showModal({
      title: '恢复习惯',
      content: `确定要恢复"${habitName}"吗?`,
      success: async (res) => {
        if (res.confirm) {
          try {
            util.showLoading('恢复中...');

            const restore_res = await wx.cloud.callFunction({
              name: 'restoreDeletedHabit',
              data: {
                user_habit_id: habitId,
                user_id: wx.getStorageSync('user_id') || ''
              }
            });

            util.hideLoading();

            if (restore_res.result.code === 0) {
              util.showToast('已恢复');
              setTimeout(() => {
                this.loadDeletedHabits();
              }, 500);
            } else {
              util.showToast(restore_res.result.message || '恢复失败');
            }
          } catch (error) {
            util.hideLoading();
            util.showToast('恢复失败');
            console.error('恢复失败:', error);
          }
        }
      }
    });
  },

  /**
   * 永久删除习惯
   */
  async permanentDelete (e) {
    const habitId = e.currentTarget.dataset.id;
    const habitName = e.currentTarget.dataset.name;

    wx.showModal({
      title: '永久删除',
      content: `确定要永久删除"${habitName}"吗?\n此操作无法撤销!`,
      cancelText: '取消',
      confirmText: '确定删除',
      confirmColor: '#EF5350',
      success: async (res) => {
        if (res.confirm) {
          try {
            util.showLoading('删除中...');

            // 直接删除文档
            const db = wx.cloud.database();
            await db.collection('user_habits').doc(habitId).remove();

            util.hideLoading();
            util.showToast('已永久删除');

            setTimeout(() => {
              this.loadDeletedHabits();
            }, 500);
          } catch (error) {
            util.hideLoading();
            util.showToast('删除失败');
            console.error('删除失败:', error);
          }
        }
      }
    });
  }
});
