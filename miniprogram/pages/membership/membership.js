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
    noMerchantMsg: '未配置商户号，暂不可开通。请在云开发控制台绑定商户号/密钥后重试。',
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
    ]
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
    if (this.data.noMerchant) {
      wx.showToast({ title: '未配置商户号，暂不可开通', icon: 'none' });
      return;
    }

    this.setData({ paying: true });

    try {
      const res = await wx.cloud.callFunction({ name: 'createPayment' });
      if (res.result.code !== 0) {
        wx.showToast({ title: res.result.message || '下单失败', icon: 'none' });
        if (res.result.message && res.result.message.indexOf('商户号') !== -1) {
          this.setData({ noMerchant: true });
        }
        this.setData({ paying: false });
        return;
      }

      const payment = res.result.data;
      await wx.requestPayment({
        ...payment,
        success: async () => {
          await wx.cloud.callFunction({ name: 'activateMembership' });
          await this.refreshUser();
          wx.showToast({ title: '开通成功', icon: 'success' });
        },
        fail: (err) => {
          console.error('支付失败', err);
          wx.showToast({ title: '支付已取消', icon: 'none' });
        },
        complete: () => {
          this.setData({ paying: false });
        }
      });
    } catch (error) {
      console.error('支付异常', error);
      wx.showToast({ title: '支付失败', icon: 'none' });
      this.setData({ paying: false });
    }
  },

  handleTrial () {
    if (this.data.noMerchant) {
      wx.showToast({ title: '配置商户后可开通试用', icon: 'none' });
      return;
    }
    wx.showToast({ title: '试用功能即将上线', icon: 'none' });
  }
});
