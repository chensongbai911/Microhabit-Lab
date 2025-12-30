// pages/stats/stats.js
const permission = require('../../utils/permission.js');

Page({
  data: {
    // Day 6 - 结论优先
    weeklyRate: 0,          // 本周完成率
    bestHabit: '',          // 最好的习惯
    improved: false,        // 是否改进
    improvementPercent: 0,  // 改进百分比
    advice: '',             // 建议文案
    stats: {
      totalHabits: 0,
      inProgress: 0,
      completed: 0,
      maxStreak: 0
    },
    // 新增: 图表数据
    weeklyData: [],        // 7天完成率
    weekDays: ['一', '二', '三', '四', '五', '六', '日'],
    topHabits: [],  // 完成率Top3习惯
    monthlyStats: {
      totalCheckIns: 0,
      avgCheckIns: 0,
      bestDay: '',
      worstDay: ''
    },
    weeklyBars: [],
    // 错误提示
    statsError: '',
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

  // 手动刷新
  onPullDownRefresh () {
    this.loadStats().finally(() => wx.stopPullDownRefresh());
  },
  handleRefreshTap () {
    this.loadStats();
  },

  async loadStats () {
    try {
      const res = await wx.cloud.callFunction({
        name: 'getStats'
      });

      if (res.result?.code === 0 || res.result?.success === true) {
        const data = res.result.data;

        // 处理图表数据
        const weeklyData = Array.isArray(data.weeklyData) ? data.weeklyData : [];
        const weeklyBars = this.buildWeeklyBars(weeklyData);
        const topHabits = this.processTopHabits(data.topHabits || []);
        const monthlyStats = data.monthlyStats || this.data.monthlyStats;

        this.setData({
          weeklyRate: data.weeklyRate || 0,
          bestHabit: data.bestHabit || (data.stats?.inProgress ? '继续坚持' : '暂无数据'),
          improved: data.improved || false,
          improvementPercent: data.improvementPercent || 0,
          advice: data.advice || '开始你的微习惯之旅吧！',
          stats: data.stats || this.data.stats,
          weeklyData: weeklyData,
          weeklyBars: weeklyBars,
          topHabits: topHabits,
          monthlyStats: monthlyStats,
          statsError: ''
        });
      } else {
        console.error('getStats 返回错误:', res.result);
        const msg = res.result?.message || '数据加载失败';
        this.setData({ statsError: `加载失败: ${msg} (code ${res.result?.code ?? ''})` });
        wx.showToast({ title: '数据加载失败', icon: 'none' });
      }
    } catch (error) {
      console.error('加载统计数据失败:', error);
      this.setData({ statsError: '加载失败，请检查网络或后端函数' });
      wx.showToast({ title: '数据加载失败', icon: 'none' });
    }
  },

  /**
   * 处理Top习惯数据 - 取完成率最高的3个
   */
  processTopHabits (habits = []) {
    if (!habits || habits.length === 0) {
      return [];
    }
    return habits
      .sort((a, b) => (b.completion_rate || 0) - (a.completion_rate || 0))
      .slice(0, 3)
      .map((habit, index) => ({
        ...habit,
        rank: index + 1,
        medal: ['🥇', '🥈', '🥉'][index] || ''
      }));
  },

  buildWeeklyBars (weeklyData = []) {
    // 限制高度防止超出：最大 150%，最小 0%，高度系数 1.2
    const MAX_RATE = 150;
    const SCALE = 1.2;
    return weeklyData.map((rate = 0) => {
      const safeRate = Math.max(0, Math.min(Number(rate) || 0, MAX_RATE));
      const height = safeRate * SCALE; // rpx，最终在 wxml 里使用
      return { rate: safeRate, height };
    });
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
  },

  goToSettings () {
    wx.navigateTo({
      url: '/pages/settings/settings'
    });
  }
});
