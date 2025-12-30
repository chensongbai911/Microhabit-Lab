const constants = require('../../utils/constants.js');
const app = getApp();

Page({
  data: {
    price: 6.6,
    benefits: constants.memberBenefits,
    isMember: false,
    statusText: '免费用户',
    expireText: '',
    paying: false,
    noMerchant: false,
    noMerchantMsg: '💡 当前为演示模式（本地模拟支付）。配置真实商户号后可启用真实支付。',
    habitCount: 0,
    maxFreeHabits: 3,
    memberLimit: 20,
    reportTier: '基础版',
    retentionDays: '90天',
    currentLimits: [],
    upgradeHighlights: [
      '无限创建习惯 (上限20)',
      'AI智能报告',
      '永久数据保留',
      '高级分析工具'
    ],
    comparisonTable: [
      { feature: '创建习惯数量', free: '最多3个', member: '无限' },
      { feature: '21天打卡记录', free: '仅7天', member: '完整21天' },
      { feature: '数据统计趋势', free: '基础', member: '详细周/月分析' },
      { feature: '完成建议', free: '模板式', member: '个性化' },
      { feature: '自我备注', free: '-', member: '√ 支持' },
      { feature: '优先客服', free: '-', member: '√ 优先支持' }
    ],
    // 使用本地模拟支付（development mode）
    useLocalPayment: true,
    localPaymentEnabled: true
  },

  onShow () {
    this.refreshUser();
  },

  async refreshUser () {
    try {
      // 复用全局 initUser 以刷新会员状态
      if (app.initUser) {
        await app.initUser();
      }
      const { memberStatus, memberExpireTime } = app.globalData;

      let expireText = '';
      if (memberStatus === 1 && memberExpireTime) {
        const date = new Date(memberExpireTime);
        const y = date.getFullYear();
        const m = String(date.getMonth() + 1).padStart(2, '0');
        const d = String(date.getDate()).padStart(2, '0');
        expireText = `有效期至 ${y}-${m}-${d}`;
      }

      this.setData({
        isMember: memberStatus === 1,
        statusText: memberStatus === 1 ? '已开通会员' : '免费用户',
        expireText
      });
      this.loadUsage();
    } catch (error) {
      console.error('刷新用户信息失败', error);
    }
  },

  async loadUsage () {
    try {
      const res = await wx.cloud.callFunction({ name: 'getMyHabits' });
      const count = (res && res.result && Array.isArray(res.result.data)) ? res.result.data.length : 0;
      this.setData({ habitCount: count }, () => {
        this.updateValueBlocks();
      });
    } catch (error) {
      console.log('获取习惯数失败', error);
      this.updateValueBlocks();
    }
  },

  updateValueBlocks () {
    const { habitCount, maxFreeHabits, memberLimit, isMember, reportTier, retentionDays } = this.data;
    const currentLimits = [
      {
        label: '习惯数量',
        value: `${habitCount}/${isMember ? memberLimit : maxFreeHabits}`,
        tip: isMember ? '会员上限20个同时进行' : '免费版上限3个，升级后解锁到20个',
        warn: !isMember && habitCount >= maxFreeHabits
      },
      {
        label: '报告级别',
        value: isMember ? '高级报告' : reportTier,
        tip: isMember ? '可查看完整趋势与建议' : '当前为基础版，升级解锁高级分析'
      },
      {
        label: '数据保留',
        value: isMember ? '永久保留' : retentionDays,
        tip: isMember ? '会员数据长期可查' : '升级后不再自动清理历史数据'
      }
    ];

    this.setData({ currentLimits });
  },

  async handlePay () {
    if (this.data.paying) return;
    this.setData({ paying: true });

    try {
      // 优先使用本地模拟支付（开发模式）
      if (this.data.useLocalPayment && this.data.localPaymentEnabled) {
        await this.handleLocalPayment();
      } else {
        // 使用真实支付
        await this.handleRealPayment();
      }
    } catch (error) {
      console.error('支付异常', error);
      wx.showToast({ title: '支付失败', icon: 'none' });
    } finally {
      this.setData({ paying: false });
    }
  },

  /**
   * 本地模拟支付（开发/测试模式）
   * 直接激活会员，不调用真实支付接口
   */
  async handleLocalPayment () {
    // 显示支付确认对话框
    return new Promise((resolve, reject) => {
      wx.showModal({
        title: '开通会员',
        content: `确认支付 ￥${this.data.price}？\n\n当前为演示模式（本地模拟支付）`,
        confirmText: '确认支付',
        cancelText: '取消',
        success: async (res) => {
          if (res.confirm) {
            try {
              // 直接激活会员
              await this.activateMembership();
              wx.showToast({ title: '会员已开通', icon: 'success' });
              await this.refreshUser();
              resolve();
            } catch (e) {
              console.error('激活会员失败', e);
              wx.showToast({ title: '开通失败，请重试', icon: 'none' });
              reject(e);
            }
          } else {
            reject(new Error('用户取消支付'));
          }
        },
        fail: reject
      });
    });
  },

  /**
   * 真实支付（需配置商户号）
   */
  async handleRealPayment () {
    const res = await wx.cloud.callFunction({ name: 'createPayment' });
    if (res.result.code !== 0) {
      wx.showToast({ title: res.result.message || '下单失败', icon: 'none' });
      if (res.result.message && res.result.message.indexOf('商户号') !== -1) {
        // 如果是商户号缺失，切换为本地模式
        this.setData({ useLocalPayment: true });
        wx.showToast({ title: '未检测到商户号，已切换为演示模式', icon: 'none' });
      }
      throw new Error(res.result.message);
    }

    const payment = res.result.data;
    return new Promise((resolve, reject) => {
      wx.requestPayment({
        ...payment,
        success: async () => {
          try {
            await wx.cloud.callFunction({ name: 'activateMembership' });
            await this.refreshUser();
            wx.showToast({ title: '开通成功', icon: 'success' });
            resolve();
          } catch (e) {
            reject(e);
          }
        },
        fail: (err) => {
          console.error('支付失败', err);
          reject(err);
        }
      });
    });
  },

  /**
   * 激活会员（云函数调用）
   */
  async activateMembership () {
    const res = await wx.cloud.callFunction({ name: 'activateMembership' });
    if (res.result.code !== 0) {
      throw new Error(res.result.message || '激活失败');
    }
    return res.result;
  },

  handleTrial () {
    wx.showToast({ title: '试用功能即将上线', icon: 'none' });
  }
});
