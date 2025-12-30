// pages/settings/settings.js
const resourceCache = require('../../utils/resourceCache.js');

Page({
  data: {
    reminderEnabled: false,
    reminderTime1: '08:00',
    reminderTime2: '20:00',
    multipleReminders: true,
    dndEnabled: false,
    dndStart: '22:00',
    dndEnd: '08:00',
    subscribeStatus: {
      daily: false,
      completion: false,
      milestone: false
    },
    darkMode: false,
    effectsEnabled: true,
    effectsIntensity: 2
  },

  onShow () {
    // 初始化效果资源
    resourceCache.initEffectsResources();

    this.loadSettings();
    this.loadAppSettings();
    this.checkSubscribeStatus();
    this.loadEffectsSettings();
  },

  /**
   * 加载动效设置
   */
  loadEffectsSettings () {
    try {
      const effectsEnabled = wx.getStorageSync('effects_enabled') !== false;
      const effectsIntensity = wx.getStorageSync('effects_intensity') || 2;
      this.setData({ effectsEnabled, effectsIntensity });
    } catch (e) { }
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
          reminderTime2: settings.time2 || '20:00',
          multipleReminders: settings.multipleReminders !== false,
          dndEnabled: settings.dndEnabled || false,
          dndStart: settings.dndStart || '22:00',
          dndEnd: settings.dndEnd || '08:00'
        });
      }
    } catch (error) {
      console.error('加载设置失败:', error);
    }
  },

  /**
   * 加载应用偏好设置
   */
  loadAppSettings () {
    try {
      const appSettings = wx.getStorageSync('appSettings');
      if (appSettings) {
        this.setData({
          darkMode: !!appSettings.darkMode
        });
      }
    } catch (error) {
      console.error('加载偏好设置失败:', error);
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
      this.saveReminderSettings({ enabled: false });
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
        this.saveReminderSettings({ enabled: true });
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
    this.saveReminderSettings({ time1: time });
  },

  /**
   * 选择提醒时间2
   */
  selectTime2 (e) {
    const time = e.detail.value;
    this.setData({ reminderTime2: time });
    this.saveReminderSettings({ time2: time });
  },

  /**
   * 切换多提醒
   */
  toggleMultipleReminders (e) {
    const enabled = e.detail.value;
    this.setData({ multipleReminders: enabled });
    this.saveReminderSettings({ multipleReminders: enabled });
  },

  /**
   * 切换勿扰模式
   */
  toggleDnd (e) {
    const enabled = e.detail.value;
    this.setData({ dndEnabled: enabled });
    this.saveReminderSettings({ dndEnabled: enabled });
  },

  /**
   * 选择勿扰开始时间
   */
  selectDndStart (e) {
    const time = e.detail.value;
    this.setData({ dndStart: time });
    this.saveReminderSettings({ dndStart: time });
  },

  /**
   * 选择勿扰结束时间
   */
  selectDndEnd (e) {
    const time = e.detail.value;
    this.setData({ dndEnd: time });
    this.saveReminderSettings({ dndEnd: time });
  },

  /**
   * 切换深色模式
   */
  toggleDarkMode (e) {
    const enabled = e.detail.value;
    this.setData({ darkMode: enabled });
    this.saveAppSettings({ darkMode: enabled });
  },

  /**
   * 保存设置到本地
   */
  saveReminderSettings (updates) {
    try {
      const current = wx.getStorageSync('reminderSettings') || {};
      const newSettings = {
        ...current,
        ...updates,
        time1: this.data.reminderTime1,
        time2: this.data.reminderTime2,
        multipleReminders: this.data.multipleReminders,
        dndEnabled: this.data.dndEnabled,
        dndStart: this.data.dndStart,
        dndEnd: this.data.dndEnd
      };

      wx.setStorageSync('reminderSettings', newSettings);

      // 同步到云端
      this.syncToCloud(newSettings, null);
    } catch (error) {
      console.error('保存设置失败:', error);
    }
  },

  /**
   * 保存应用偏好设置
   */
  saveAppSettings (updates) {
    try {
      const current = wx.getStorageSync('appSettings') || {};
      const newSettings = { ...current, ...updates };
      wx.setStorageSync('appSettings', newSettings);
      this.syncToCloud(null, newSettings);
    } catch (error) {
      console.error('保存偏好设置失败:', error);
    }
  },

  /**
   * 同步设置到云端
   */
  async syncToCloud (reminderSettings, appSettings) {
    try {
      const data = {};
      if (reminderSettings) {
        data.reminder_settings = reminderSettings;
      }
      if (appSettings) {
        data.app_settings = appSettings;
      }
      if (Object.keys(data).length === 0) return;

      await wx.cloud.callFunction({
        name: 'updateUserSettings',
        data
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
   * 切换动效开关
   */
  toggleEffects (e) {
    const enabled = e.detail.value;
    try {
      wx.setStorageSync('effects_enabled', enabled);
      this.setData({ effectsEnabled: enabled });
      resourceCache.setEffectsEnabled(enabled);
      wx.showToast({ title: enabled ? '已开启动效' : '已关闭动效', icon: 'success' });
    } catch (e) { }
  },

  /**
   * 调整动效强度
   */
  setEffectsIntensity (e) {
    const intensity = parseInt(e.detail.value) + 1; // picker value是0-2，转为1-3
    try {
      wx.setStorageSync('effects_intensity', intensity);
      this.setData({ effectsIntensity: intensity });
      resourceCache.setEffectsIntensity(intensity);
      const label = ['低', '中', '高'][intensity - 1] || '中';
      wx.showToast({ title: `动效强度: ${label}`, icon: 'success' });
    } catch (e) { }
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
  },

  /**
   * 前往隐私政策页面
   */
  goToPrivacyPolicy () {
    wx.navigateTo({
      url: '/pages/settings/privacy',
      fail: (error) => {
        console.error('导航到隐私政策失败', error);
        wx.showToast({ title: '无法打开隐私政策', icon: 'none' });
      }
    });
  },
});
