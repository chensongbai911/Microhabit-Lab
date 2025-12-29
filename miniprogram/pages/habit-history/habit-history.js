// pages/habit-history/habit-history.js
const util = require('../../utils/util.js');

Page({
  data: {
    habitId: '',
    habitName: '',
    changeLogs: [],
    loading: false,
    emptyState: false,
    expanded: {} // 跟踪哪些变更是展开的
  },

  onLoad (options) {
    if (options.id) {
      this.setData({ habitId: options.id });
      this.loadChangeHistory();
    } else {
      util.showToast('缺少习惯ID');
    }
  },

  /**
   * 加载变更历史
   */
  async loadChangeHistory () {
    try {
      this.setData({ loading: true });

      const res = await wx.cloud.callFunction({
        name: 'getChangeHistory',
        data: { user_habit_id: this.data.habitId }
      });

      if (res.result.code === 0) {
        const changeLogs = res.result.data.change_logs || [];

        // 格式化数据
        const formattedLogs = changeLogs.map(log => ({
          ...log,
          time: this.formatTime(log.timestamp),
          fieldLabel: this.getFieldLabel(log.field_changed),
          isUndo: log.field_changed === 'undo'
        }));

        this.setData({
          changeLogs: formattedLogs,
          emptyState: formattedLogs.length === 0,
          loading: false
        });
      } else {
        util.showToast(res.result.message || '加载历史失败');
        this.setData({ loading: false });
      }
    } catch (error) {
      util.showToast('加载历史失败');
      this.setData({ loading: false });
      console.error('加载变更历史失败:', error);
    }
  },

  /**
   * 获取字段标签
   */
  getFieldLabel (field) {
    const labels = {
      name: '习惯名称',
      trigger: '触发器',
      target_times_per_day: '每日次数',
      description: '描述',
      undo: '撤销操作'
    };
    return labels[field] || field;
  },

  /**
   * 格式化时间戳
   */
  formatTime (timestamp) {
    if (!timestamp) return '';

    const date = new Date(timestamp);
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);
    const targetDate = new Date(date.getFullYear(), date.getMonth(), date.getDate());

    let dateStr = '';
    if (targetDate.getTime() === today.getTime()) {
      dateStr = '今天';
    } else if (targetDate.getTime() === yesterday.getTime()) {
      dateStr = '昨天';
    } else {
      dateStr = date.toLocaleDateString('zh-CN', {
        month: '2-digit',
        day: '2-digit'
      });
    }

    const timeStr = date.toLocaleTimeString('zh-CN', {
      hour: '2-digit',
      minute: '2-digit'
    });

    return `${dateStr} ${timeStr}`;
  },

  /**
   * 切换展开/收起
   */
  toggleExpand (e) {
    const index = e.currentTarget.dataset.index;
    const expanded = { ...this.data.expanded };
    expanded[index] = !expanded[index];
    this.setData({ expanded });
  },

  /**
   * 恢复到该状态
   */
  async restoreChange (e) {
    const index = e.currentTarget.dataset.index;
    const changeLog = this.data.changeLogs[index];

    wx.showModal({
      title: '确认恢复',
      content: `确定要恢复 "${changeLog.fieldLabel}" 到之前的值吗?\n\n原值: ${this.formatValue(changeLog.old_value)}`,
      success: async (res) => {
        if (res.confirm) {
          try {
            util.showLoading('恢复中...');

            const undo_res = await wx.cloud.callFunction({
              name: 'undoHabitChange',
              data: {
                user_habit_id: this.data.habitId,
                change_log_id: changeLog._id,
                user_id: wx.getStorageSync('user_id') || ''
              }
            });

            util.hideLoading();

            if (undo_res.result.code === 0) {
              util.showToast('已恢复');
              // 刷新历史记录
              setTimeout(() => {
                this.loadChangeHistory();
              }, 500);
            } else {
              util.showToast(undo_res.result.message || '恢复失败');
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
   * 格式化显示值
   */
  formatValue (value) {
    if (typeof value === 'string') {
      return value.length > 20 ? value.substring(0, 20) + '...' : value;
    }
    return String(value);
  },

  /**
   * 返回到上一页
   */
  handleBack () {
    wx.navigateBack();
  }
});
