// pages/settings/settings.js
Page({
  data: {
    reminderEnabled: false,
    reminderTime1: '08:00',
    reminderTime2: '20:00',
    subscribeStatus: {
      daily: false,
      completion: false,
      milestone: false
    }
  },

  onShow () {
    this.loadSettings();
    this.checkSubscribeStatus();
  },

  /**
   * 加载提醒设置
   */
  async loadSettings () {
    try {
      const settings = wx.getStorageSync('reminderSettings');
      if (settings) {
        this.setData({
          reminderEnabled: settings.enabled || false,
          reminderTime1: settings.time1 || '08:00',
          reminderTime2: settings.time2 || '20:00'
        });
      }
    } catch (error) {
      console.error('加载设置失败:', error);
    }
  },

  /**
   * 检查订阅消息状态
   */
  async checkSubscribeStatus () {
    try {
      const res = await wx.getSetting({ withSubscriptions: true });
      const mainSwitch = res.subscriptionsSetting?.mainSwitch;

      this.setData({
        'subscribeStatus.daily': mainSwitch || false,
        'subscribeStatus.completion': mainSwitch || false,
        'subscribeStatus.milestone': mainSwitch || false
      });
    } catch (error) {
      console.log('检查订阅状态失败:', error);
    }
  },

  /**
   * 切换提醒开关
   */
  async toggleReminder (e) {
    const enabled = e.detail.value;

    if (enabled) {
      // 开启提醒，请求订阅权限
      await this.requestSubscribe();
    } else {
      // 关闭提醒
      this.saveSettings({ enabled: false });
    }
  },

  /**
   * 请求订阅消息权限
   */
  async requestSubscribe () {
    try {
      const res = await wx.requestSubscribeMessage({
        tmplIds: [
          // 这里需要替换为实际的模板ID
          'FU13oXF--gvie10WCk7CQ9odtVTHNOjg16j_g65XKOI',      // 每日提醒
          'TEMPLATE_ID_COMPLETION', // 完成庆祝
          'TEMPLATE_ID_MILESTONE'   // 里程碑
        ]
      });

      // 检查授权结果
      const authorized = Object.values(res).some(status => status === 'accept');

      if (authorized) {
        this.setData({ reminderEnabled: true });
        this.saveSettings({ enabled: true });
        wx.showToast({
          title: '提醒已开启',
          icon: 'success'
        });

        // 更新订阅状态
        this.checkSubscribeStatus();
      } else {
        wx.showModal({
          title: '需要授权',
          content: '开启提醒需要允许订阅消息通知',
          showCancel: false
        });
      }
    } catch (error) {
      console.error('请求订阅失败:', error);
      wx.showToast({
        title: '授权失败',
        icon: 'none'
      });
    }
  },

  /**
   * 选择提醒时间1
   */
  selectTime1 (e) {
    const time = e.detail.value;
    this.setData({ reminderTime1: time });
    this.saveSettings({ time1: time });
  },

  /**
   * 选择提醒时间2
   */
  selectTime2 (e) {
    const time = e.detail.value;
    this.setData({ reminderTime2: time });
    this.saveSettings({ time2: time });
  },

  /**
   * 保存设置到本地
   */
  saveSettings (updates) {
    try {
      const current = wx.getStorageSync('reminderSettings') || {};
      const newSettings = {
        ...current,
        ...updates,
        time1: this.data.reminderTime1,
        time2: this.data.reminderTime2
      };

      wx.setStorageSync('reminderSettings', newSettings);

      // 同步到云端
      this.syncToCloud(newSettings);
    } catch (error) {
      console.error('保存设置失败:', error);
    }
  },

  /**
   * 同步设置到云端
   */
  async syncToCloud (settings) {
    try {
      await wx.cloud.callFunction({
        name: 'updateUserSettings',
        data: {
          reminder_settings: settings
        }
      });
    } catch (error) {
      console.log('同步云端失败:', error);
    }
  },

  /**
   * 管理订阅消息
   */
  manageSubscribe () {
    wx.openSetting({
      withSubscriptions: true
    });
  },

  /**
   * 查看提醒说明
   */
  showReminderGuide () {
    wx.showModal({
      title: '提醒功能说明',
      content: '开启后，系统会在设定时间推送消息提醒你完成习惯打卡。\n\n提醒类型：\n• 每日习惯提醒\n• 全部完成庆祝\n• 周期里程碑\n\n你可以随时在设置中调整提醒时间。',
      showCancel: false,
      confirmText: '知道了'
    });
  },

  /**
   * Phase 3.4: 前往已删除习惯页面
   */
  goToDeletedHabits () {
    wx.navigateTo({
      url: '/pages/deleted-habits/deleted-habits',
      fail: (error) => {
        console.error('导航失败', error);
        wx.showToast({ title: '导航失败', icon: 'none' });
      }
    });
  },

  /**
   * Phase 3.4: 前往数据导出页面
   */
  goToDataExport () {
    wx.navigateTo({
      url: '/pages/data-export/data-export',
      fail: (error) => {
        console.error('导航失败', error);
        wx.showToast({ title: '导航失败', icon: 'none' });
      }
    });
  }
});
