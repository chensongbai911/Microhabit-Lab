// pages/habits/habits.js
const util = require('../../utils/util.js');
const constants = require('../../utils/constants.js');
const cycleUtil = require('../../utils/cycle.js');
const dateUtil = require('../../utils/date.js');

Page({
  data: {
    currentTab: 0,
    categories: constants.habitCategories,
    selectedCategory: 'all',
    searchQuery: '',
    templates: [],
    filteredTemplates: [],
    loadingTemplates: true,
    loadingMyHabits: false,
    templateError: false,
    myHabitsError: false,
    myHabits: [],
    myHabitsRaw: [],  // 原始数据
    myHabitsFilter: 'all',
    myHabitsSortBy: 'created',
    myHabitsSortOrder: 'desc',
    inProgressCount: 0  // P2: 进行中的习惯数量
  },

  onLoad () {
    this.loadTemplates();
    this.loadInProgressCount();  // P2: 加载进行中习惯数量
  },

  onShow () {
    if (this.data.currentTab === 1) {
      this.loadMyHabits();
    }
    this.loadInProgressCount();  // P2: 刷新进行中习惯数量
  },

  onPullDownRefresh () {
    if (this.data.currentTab === 0) {
      this.loadTemplates().finally(() => wx.stopPullDownRefresh());
    } else {
      this.loadMyHabits().finally(() => wx.stopPullDownRefresh());
    }
  },

  /**
   * 切换Tab
   */
  switchTab (e) {
    const index = typeof e === 'number' ? e : parseInt(e.currentTarget.dataset.index, 10);
    this.setData({ currentTab: index });

    if (index === 1) {
      this.loadMyHabits();
    }
  },

  /**
   * 选择分类
   */
  selectCategory (e) {
    const value = e.currentTarget.dataset.value;
    this.setData({ selectedCategory: value }, () => {
      this.filterTemplates();
    });
  },

  onSearchInput (e) {
    const value = (e.detail.value || '').trim();
    this.setData({ searchQuery: value }, () => {
      this.filterTemplates();
    });
  },

  /**
   * 加载模板
   */
  async loadTemplates () {
    this.setData({ loadingTemplates: true, templateError: false });
    try {
      const db = wx.cloud.database();
      const res = await db.collection('habit_templates')
        .where({ is_active: true })
        .get();

      const templates = res.data.map(item => ({
        ...item,
        category_name: constants.categoryNames[item.category] || item.category
      }));

      this.setData({ templates, loadingTemplates: false }, () => {
        this.filterTemplates();
      });
    } catch (error) {
      console.error('加载模板失败:', error);
      this.setData({ loadingTemplates: false, templateError: true });
    }
  },

  /**
   * 筛选模板
   */
  filterTemplates () {
    const { templates, selectedCategory, searchQuery } = this.data;
    const keyword = searchQuery.toLowerCase();

    const list = templates.filter(t => {
      const matchCategory = selectedCategory === 'all' || t.category === selectedCategory;
      const matchKeyword = !keyword || (t.name && t.name.toLowerCase().includes(keyword)) || (t.description && t.description.toLowerCase().includes(keyword));
      return matchCategory && matchKeyword;
    });

    this.setData({ filteredTemplates: list });
  },

  /**
   * 添加模板
   */
  addTemplate (e) {
    const templateId = e.currentTarget.dataset.id;
    wx.navigateTo({
      url: `/pages/create-habit/create-habit?template_id=${templateId}`
    });
  },

  /**
   * 加载我的习惯
   */
  async loadMyHabits () {
    this.setData({ loadingMyHabits: true, myHabitsError: false });
    try {
      // 使用云函数而不是直接查询，避免权限问题
      const res = await wx.cloud.callFunction({
        name: 'getMyHabits'
      });

      if (res.result.code === 0) {
        const habits = res.result.data.map(habit => {
          const progress = cycleUtil.getCycleProgress(habit);

          // P0-2: 添加温暖的进度文案
          let warmProgressText = '';
          const current = progress.current || 0;
          if (current <= 2) {
            warmProgressText = '刚开始';
          } else if (current <= 10) {
            warmProgressText = '在路上';
          } else {
            warmProgressText = '已经熟悉了';
          }

          // P0-2: 优化状态显示文案
          let statusText = '';
          if (habit.status === 'in_progress') {
            statusText = '正在陪伴';
          } else if (habit.status === 'finished') {
            statusText = '暂时放下';
          } else {
            statusText = habit.status;
          }

          return {
            ...habit,
            progress: progress,
            warmProgressText: warmProgressText,
            statusText: statusText
          };
        });

        this.setData({
          myHabits: habits,
          myHabitsRaw: habits,  // 保存原始数据
          loadingMyHabits: false,
          myHabitsError: false
        }, () => {
          this.filterAndSortMyHabits();  // 应用当前筛选
        });
      } else {
        throw new Error(res.result.message);
      }
    } catch (error) {
      console.error('加载我的习惯失败:', error);
      this.setData({ loadingMyHabits: false, myHabitsError: true });
      // 友好提示：常见为云函数未部署或依赖未安装
      const errMsg = (error && (error.errMsg || error.message)) || '';
      const isDependencyMissing = /Cannot\sfind\smodule\s'wx-server-sdk'/i.test(errMsg);
      wx.showToast({
        title: isDependencyMissing ? '云函数依赖缺失，请重新部署' : '加载失败，请稍后重试',
        icon: 'none',
        duration: 2500
      });
    }
  },

  /**
   * 筛选并排序我的习惯
   */
  filterAndSortMyHabits () {
    const { myHabitsRaw, myHabitsFilter, myHabitsSortBy, myHabitsSortOrder } = this.data;

    // 从原始数据开始筛选
    let filtered = [...myHabitsRaw];  // 创建副本

    // 按状态筛选
    if (myHabitsFilter !== 'all') {
      filtered = filtered.filter(h => h.status === myHabitsFilter);
    }

    // 排序
    filtered.sort((a, b) => {
      let aVal, bVal;
      if (myHabitsSortBy === 'created') {
        aVal = new Date(a.created_at || 0);
        bVal = new Date(b.created_at || 0);
      } else if (myHabitsSortBy === 'progress') {
        aVal = a.progress.percentage || 0;
        bVal = b.progress.percentage || 0;
      } else if (myHabitsSortBy === 'easiest') {
        // P1-2: 按今天最轻排序
        // 规则: 1. 今日未完成 > 已完成  2. 目标次数少的 > 多的
        const aCompleted = a.today_completed || false;
        const bCompleted = b.today_completed || false;
        const aTarget = a.target_times_per_day || 1;
        const bTarget = b.target_times_per_day || 1;

        // 优先显示未完成的
        if (aCompleted !== bCompleted) {
          return aCompleted ? 1 : -1;
        }

        // 其次按目标次数从少到多
        return aTarget - bTarget;
      }

      // 应用排序方向（easiest 模式固定升序）
      if (myHabitsSortBy === 'easiest') {
        return 0;  // 已在上面处理
      } else if (myHabitsSortOrder === 'desc') {
        return bVal - aVal;
      } else {
        return aVal - bVal;
      }
    });

    this.setData({ myHabits: filtered });
  },

  switchMyHabitsFilter (e) {
    const value = e.currentTarget.dataset.value;
    this.setData({ myHabitsFilter: value }, () => {
      this.filterAndSortMyHabits();
    });
  },

  switchMyHabitsSortBy (e) {
    const value = e.currentTarget.dataset.value;
    this.setData({ myHabitsSortBy: value }, () => {
      this.filterAndSortMyHabits();
    });
  },

  retryLoadTemplates () {
    this.loadTemplates();
  },

  retryLoadMyHabits () {
    this.loadMyHabits();
  },

  /**
   * 前往详情页
   */
  goToDetail (e) {
    const id = e.currentTarget.dataset.id;
    wx.navigateTo({
      url: `/pages/habit-detail/habit-detail?id=${id}`
    });
  },

  /**
   * P1-1: 暂停习惯
   */
  pauseHabit (e) {
    const habitId = e.currentTarget.dataset.id;
    const habit = this.data.myHabits.find(h => h._id === habitId);

    wx.showModal({
      title: '暂停一阵',
      content: `暂停"${habit.name}"\n\n暂停不会清零，也不算失败\n随时可以在详情页恢复`,
      confirmText: '暂停',
      cancelText: '取消',
      confirmColor: '#10b981',
      success: (res) => {
        if (res.confirm) {
          this.performPause(habitId);
        }
      }
    });
  },

  /**
   * 执行暂停操作
   */
  async performPause (habitId) {
    wx.showLoading({ title: '暂停中...', mask: true });

    try {
      const res = await wx.cloud.callFunction({
        name: 'updateHabitStatus',
        data: {
          user_habit_id: habitId,
          action: 'pause'
        }
      });

      wx.hideLoading();

      if (res.result.code === 0) {
        wx.showToast({
          title: '已暂停',
          icon: 'success',
          duration: 1500
        });

        // 刷新列表
        setTimeout(() => {
          this.loadMyHabits();
        }, 500);
      } else {
        wx.showToast({
          title: res.result.message || '暂停失败',
          icon: 'none'
        });
      }
    } catch (error) {
      wx.hideLoading();
      console.error('暂停习惯失败:', error);
      wx.showToast({
        title: '操作失败，请重试',
        icon: 'none'
      });
    }
  },

  /**
   * 阻止事件冒泡
   */
  stopPropagation () {
    // 阻止点击按钮时触发goToDetail
  },

  /**
   * P2: 加载进行中习惯数量（用于软限制提示）
   */
  async loadInProgressCount () {
    try {
      const res = await wx.cloud.callFunction({
        name: 'getMyHabits'
      });

      if (res.result.code === 0) {
        const inProgressCount = res.result.data.filter(h => h.status === 'in_progress').length;
        this.setData({ inProgressCount });
      }
    } catch (error) {
      console.error('加载进行中习惯数量失败:', error);
    }
  }
});
