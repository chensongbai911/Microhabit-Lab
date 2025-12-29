// pages/create-habit/create-habit.js
const util = require('../../utils/util.js');
const permission = require('../../utils/permission.js');
const constants = require('../../utils/constants.js');
const triggerRecommend = require('../../utils/triggerRecommend.js');
const impactPredictor = require('../../utils/impactPredictor.js');

Page({
  data: {
    mode: 'create', // create | edit
    habitId: '',
    pageTitle: '新建微习惯',
    triggerOptions: constants.triggerOptions,
    triggerCategories: constants.triggerCategories,
    allCategories: [],
    selectedTriggerCategory: 'anytime', // 默认选择全天
    recommendedTriggers: [],
    nameLength: 0,
    nameFeedback: '',
    expectedCompletionRate: 85, // 完成率预测(默认1次/天)
    frequencyImpactTips: '每天1次最容易坚持',
    // 影响分析字段
    impactAnalysis: {
      show: false,
      severity: 'info', // info | warning | danger
      color: '#4FC3F7',
      message: '',
      recommendation: '',
      impacts: []
    },
    formData: {
      name: '',
      trigger: '',
      customTrigger: '',
      target_times_per_day: 1
    },
    canSubmit: false,
    frequencyOptions: [1, 2, 3, 4],
    currentRate: 85 // 当前习惯的完成率(编辑时使用)
  },

  onLoad (options) {
    // 初始化分类列表
    const allCategories = triggerRecommend.getAllCategories(constants.triggerCategories);
    const recommendedTriggers = triggerRecommend.getTriggersByCategory(
      'anytime',
      constants.triggerOptions
    );

    this.setData({
      allCategories,
      recommendedTriggers
    });

    if (options.id) {
      // 编辑模式
      this.setData({
        mode: 'edit',
        habitId: options.id,
        pageTitle: '调整习惯'
      });
      this.loadHabitDetail(options.id);
    } else if (options.template_id) {
      // 从模板创建
      this.loadTemplate(options.template_id);
    }
  },

  /**
   * 加载习惯详情(编辑模式) - Phase 1增强版
   */
  async loadHabitDetail (habitId) {
    try {
      util.showLoading('加载中...');

      const res = await wx.cloud.callFunction({
        name: 'getHabitDetail',
        data: { user_habit_id: habitId }
      });

      util.hideLoading();

      if (res.result.code === 0) {
        const habit = res.result.data.habit;

        // 改进: 计算完成率和进度
        const completionRate = habit.total_days > 0
          ? Math.round((habit.completed_days / habit.total_days) * 100)
          : 0;

        this.setData({
          formData: {
            name: habit.name,
            trigger: habit.trigger,
            customTrigger: '',
            target_times_per_day: habit.target_times_per_day
          },
          // 改进: 显示习惯的当前状态信息
          habitStatus: {
            currentDay: habit.current_day || 1,
            totalDays: habit.total_days || 21,
            completedDays: habit.completed_days || 0,
            completionRate: completionRate,
            lastCompletedAt: habit.last_completed_at ? this.formatDate(habit.last_completed_at) : '未完成',
            status: habit.status // 'active' | 'paused' | 'completed'
          },
          currentRate: completionRate, // 用于影响分析
          oldHabit: { // Phase 3.3: 保存原始数据以记录变更
            name: habit.name,
            trigger: habit.trigger,
            target_times_per_day: habit.target_times_per_day
          }
        }, () => {
          // 保存原始值以检测变化
          this.originalFrequency = habit.target_times_per_day;
          this.originalTrigger = habit.trigger;
          this.validateForm();
        });
      } else {
        util.showToast(res.result.message || '加载失败');
      }
    } catch (error) {
      util.hideLoading();
      util.showToast('加载失败,请检查网络');
      console.error('加载习惯详情失败:', error);
    }
  },

  /**
   * 格式化日期显示
   */
  formatDate (dateStr) {
    if (!dateStr) return '';
    try {
      const date = new Date(dateStr);
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const yesterday = new Date(today);
      yesterday.setDate(yesterday.getDate() - 1);

      date.setHours(0, 0, 0, 0);

      if (date.getTime() === today.getTime()) {
        return '今天';
      } else if (date.getTime() === yesterday.getTime()) {
        return '昨天';
      } else {
        return date.toLocaleDateString('zh-CN', {
          month: '2-digit',
          day: '2-digit'
        });
      }
    } catch (e) {
      return dateStr;
    }
  },

  /**
   * 从模板加载
   */
  async loadTemplate (templateId) {
    try {
      const db = wx.cloud.database();
      const res = await db.collection('habit_templates').doc(templateId).get();

      if (res.data) {
        this.setData({
          formData: {
            name: res.data.name,
            trigger: res.data.default_trigger,
            customTrigger: '',
            target_times_per_day: 1
          }
        }, () => {
          this.validateForm();
        });
      }
    } catch (error) {
      console.error('加载模板失败:', error);
    }
  },

  /**
   * 习惯名称输入 - 改进版(支持实时推荐)
   */
  handleNameInput (e) {
    const name = e.detail.value;
    const len = name.length;

    // 根据名称推荐触发器分类
    if (len > 0) {
      const recommendedCategory = triggerRecommend.recommendCategory(name);
      const recommendedTriggers = triggerRecommend.getTriggersByCategory(
        recommendedCategory,
        constants.triggerOptions
      );

      let nameFeedback = '';
      if (len < 2) {
        nameFeedback = '名称太短';
      } else if (len > 20) {
        nameFeedback = '名称太长';
      } else {
        nameFeedback = '✓ 很好';
      }

      this.setData({
        'formData.name': name,
        nameLength: len,
        nameFeedback: nameFeedback,
        selectedTriggerCategory: recommendedCategory,
        recommendedTriggers: recommendedTriggers
      }, () => {
        this.validateForm();
      });
    } else {
      this.setData({
        'formData.name': name,
        nameLength: len,
        nameFeedback: ''
      }, () => {
        this.validateForm();
      });
    }
  },

  /**
   * 触发器分类选择
   */
  handleTriggerCategorySelect (e) {
    const { category } = e.currentTarget.dataset;
    const recommendedTriggers = triggerRecommend.getTriggersByCategory(
      category,
      constants.triggerOptions
    );

    this.setData({
      selectedTriggerCategory: category,
      recommendedTriggers: recommendedTriggers,
      'formData.trigger': '' // 重置触发器选择
    });
  },

  /**
   * 触发器选择 - 改进版(支持分类和影响分析)
   */
  handleTriggerSelect (e) {
    const value = e.currentTarget.dataset.value;
    this.setData({
      'formData.trigger': value
    }, () => {
      this.validateForm();
      // 分析触发器变化的影响
      this.analyzeImpact();
    });
  },

  /**
   * 自定义触发器输入
   */
  handleCustomTriggerInput (e) {
    this.setData({
      'formData.customTrigger': e.detail.value
    }, () => {
      this.validateForm();
    });
  },

  /**
   * 频次选择 - 改进版(显示完成率预测和影响分析)
   */
  handleFrequencySelect (e) {
    const value = parseInt(e.currentTarget.dataset.value);

    // 根据频次预测完成率
    const completionRates = {
      1: 85,
      2: 70,
      3: 55,
      4: 40
    };

    const expectedRate = completionRates[value] || 50;
    const impactTips = value === 1 ? '每天1次最容易坚持' :
      value === 2 ? '保持在舒适范围' :
        value === 3 ? '需要足够自律' :
          '难度较大,容易放弃';

    this.setData({
      'formData.target_times_per_day': value,
      expectedCompletionRate: expectedRate,
      frequencyImpactTips: impactTips
    }, () => {
      // 分析频次变化的影响
      this.analyzeImpact();
    });
  },

  /**
   * 表单校验
   */
  validateForm () {
    const { name, trigger, customTrigger } = this.data.formData;

    let isValid = false;

    if (name.trim().length > 0) {
      if (trigger === 'other') {
        isValid = customTrigger.trim().length > 0;
      } else {
        isValid = trigger.length > 0;
      }
    }

    this.setData({ canSubmit: isValid });
  },

  /**
   * 分析习惯参数变化的影响
   */
  analyzeImpact () {
    if (this.data.mode !== 'edit') {
      // 创建模式下不显示影响分析
      this.setData({
        'impactAnalysis.show': false
      });
      return;
    }

    const { target_times_per_day, trigger } = this.data.formData;
    const currentRate = this.data.currentRate || 85;

    // 构建变化对象
    const changes = {
      frequencyChanged: this.originalFrequency !== undefined && this.originalFrequency !== target_times_per_day,
      triggerChanged: this.originalTrigger !== undefined && this.originalTrigger !== trigger,
      newFrequency: target_times_per_day,
      oldFrequency: this.originalFrequency,
      newTrigger: trigger,
      oldTrigger: this.originalTrigger
    };

    // 使用 impactPredictor 分析
    const impacts = impactPredictor.predictImpact(changes, currentRate, target_times_per_day);

    if (impacts.impacts && impacts.impacts.length > 0) {
      const severity = impacts.severity;
      const color = impactPredictor.getImpactColor(severity);
      const recommendation = impactPredictor.getRecommendation(impacts);

      this.setData({
        'impactAnalysis.show': true,
        'impactAnalysis.severity': severity,
        'impactAnalysis.color': color,
        'impactAnalysis.message': impacts.message,
        'impactAnalysis.recommendation': recommendation,
        'impactAnalysis.impacts': impacts.impacts
      });
    } else {
      this.setData({
        'impactAnalysis.show': false
      });
    }
  },
  async handleSubmit () {
    if (!this.data.canSubmit) {
      return;
    }

    const { name, trigger, customTrigger, target_times_per_day } = this.data.formData;
    const finalTrigger = trigger === 'other' ? customTrigger : trigger;

    // 编辑模式
    if (this.data.mode === 'edit') {
      await this.updateHabit(finalTrigger);
      return;
    }

    // 创建模式
    try {
      util.showLoading('创建中...');

      const res = await wx.cloud.callFunction({
        name: 'createHabit',
        data: {
          name: name.trim(),
          trigger: finalTrigger,
          target_times_per_day: target_times_per_day
        }
      });

      util.hideLoading();

      if (res.result.code === 0) {
        util.showToast('新习惯已加入今日列表', 'success');

        // 延迟返回,让用户看到成功提示
        setTimeout(() => {
          wx.navigateBack();
        }, 1500);
      } else if (res.result.code === 1001) {
        // 超出习惯数量限制
        permission.showMembershipGuide('habit_limit');
      } else {
        util.showToast(res.result.message);
      }
    } catch (error) {
      util.hideLoading();
      util.showToast('创建失败,请重试');
      console.error('创建习惯失败:', error);
    }
  },

  /**
   * 更新习惯 - Phase 1增强版(改进数据刷新) + Phase 3.3变更记录
   */
  async updateHabit (finalTrigger) {
    const { name, target_times_per_day } = this.data.formData;
    const oldHabit = this.data.oldHabit || {};

    try {
      util.showLoading('保存中...');

      const res = await wx.cloud.callFunction({
        name: 'updateHabitStatus',
        data: {
          user_habit_id: this.data.habitId,
          action: 'update',
          updates: {
            name: name.trim(),
            trigger: finalTrigger,
            target_times_per_day: target_times_per_day
          }
        }
      });

      util.hideLoading();

      if (res.result.code === 0) {
        // Phase 3.3: 记录变更
        await this.recordChanges(oldHabit, {
          name: name.trim(),
          trigger: finalTrigger,
          target_times_per_day: target_times_per_day
        });

        util.showToast('保存成功', 'success');

        // 改进: 返回前刷新父页面数据
        setTimeout(() => {
          // 方案A: 通过页面栈获取父页面并刷新
          const pages = getCurrentPages();
          if (pages.length > 1) {
            const prevPage = pages[pages.length - 2];
            // 如果父页面有loadTodayHabits方法,则调用它
            if (prevPage.loadTodayHabits) {
              prevPage.loadTodayHabits();
            }
          }

          // 返回到父页面
          wx.navigateBack();
        }, 1500);
      } else {
        util.showToast(res.result.message || '保存失败');
      }
    } catch (error) {
      util.hideLoading();
      util.showToast('保存失败,请检查网络');
      console.error('保存习惯失败:', error);
    }
  },

  /**
   * Phase 3.3: 记录字段变更
   */
  async recordChanges (oldHabit, newData) {
    const changes = [];

    // 检查名称变更
    if (oldHabit.name !== newData.name) {
      changes.push({
        field_changed: 'name',
        old_value: oldHabit.name || '',
        new_value: newData.name
      });
    }

    // 检查触发器变更
    if (oldHabit.trigger !== newData.trigger) {
      changes.push({
        field_changed: 'trigger',
        old_value: oldHabit.trigger || '',
        new_value: newData.trigger
      });
    }

    // 检查目标次数变更
    if (oldHabit.target_times_per_day !== newData.target_times_per_day) {
      changes.push({
        field_changed: 'target_times_per_day',
        old_value: oldHabit.target_times_per_day || 1,
        new_value: newData.target_times_per_day
      });
    }

    // 如果有变更，记录到数据库
    if (changes.length > 0) {
      try {
        for (const change of changes) {
          await wx.cloud.callFunction({
            name: 'recordHabitChange',
            data: {
              user_habit_id: this.data.habitId,
              field_changed: change.field_changed,
              old_value: change.old_value,
              new_value: change.new_value
            }
          });
        }
      } catch (error) {
        console.warn('记录变更失败，但不影响保存', error);
      }
    }
  },

  /**
   * 取消
   */
  handleCancel () {
    wx.navigateBack();
  }
});
