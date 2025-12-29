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
    myHabitsSortOrder: 'desc'
  },

  onLoad () {
    this.loadTemplates();
  },

  onShow () {
    if (this.data.currentTab === 1) {
      this.loadMyHabits();
    }
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
        const habits = res.result.data.map(habit => ({
          ...habit,
          progress: cycleUtil.getCycleProgress(habit)
        }));

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
      }
      if (myHabitsSortOrder === 'desc') {
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
  }
});
