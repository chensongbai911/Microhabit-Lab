// pages/stats/stats.js
const permission = require('../../utils/permission.js');

Page({
  data: {
    // Day 6 - 结论优先
    weeklyRate: 0,          // 本周完成率
    bestHabit: '微习惯',    // 最好的习惯
    improved: false,        // 是否改进
    improvementPercent: 0,  // 改进百分比
    advice: '',             // 建议文案
    stats: {
      totalHabits: 0,
      inProgress: 0,
      completed: 0,
      maxStreak: 0
    },
    memberInfo: {
      isMember: false,
      title: '解锁微习惯会员',
      desc: '无限习惯 · 完整数据 · 详细报告'
    }
  },

  onShow () {
    this.loadStats();
    this.updateMemberInfo();
  },

  async loadStats () {
    try {
      const res = await wx.cloud.callFunction({
        name: 'getStats'
      });

      if (res.result?.code === 0 || res.result?.success === true) {
        const data = res.result.data;
        this.setData({
          weeklyRate: data.weeklyRate || 0,
          bestHabit: data.bestHabit || '微习惯',
          improved: data.improved || false,
          improvementPercent: data.improvementPercent || 0,
          advice: data.advice || '开始你的微习惯之旅吧！',
          stats: data.stats || this.data.stats
        });
      } else {
        console.error('getStats 返回错误:', res.result);
      }
    } catch (error) {
      console.error('加载统计数据失败:', error);
    }
  },


  updateMemberInfo () {
    const isMember = permission.isMember();
    const statusText = permission.getMemberStatusText();

    this.setData({
      'memberInfo.isMember': isMember,
      'memberInfo.title': isMember ? '会员特权' : '解锁微习惯会员',
      'memberInfo.desc': isMember ? statusText : '无限习惯 · 完整数据 · 详细报告'
    });
  },

  goToMembership () {
    wx.navigateTo({
      url: '/pages/membership/membership'
    });
  }
});
