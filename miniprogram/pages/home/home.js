// pages/home/home.js
const dateUtil = require('../../utils/date.js');
const util = require('../../utils/util.js');
const constants = require('../../utils/constants.js');

Page({
  data: {
    // 核心数据：只保留必须项
    habits: [],              // 今日习惯列表
    completedCount: 0,       // 完成数（后端直接返回）
    totalCount: 0,           // 总数（后端直接返回）
    progress: 0,             // 完成率百分比（后端直接返回）

    // P1-1: 顶部被肯定文案
    topStatusText: '',       // 顶部状态文案

    // 页面状态
    dateDisplay: '',
    encouragementText: '',
    loading: false,
    loadError: false,
    checkingInId: null,

    // UI 控制
    allCompleted: false,
    showCompletedAnimation: false,
    editingId: null,
    showMenuId: null,

    // 打卡情绪反馈
    showEmotionFeedback: false,
    emotionFeedbackText: '',

    // P0-3: 刚创建习惯的温暖提示
    showJustCreatedHint: false,
    justCreatedHintText: '',

    // 可选：推荐和已结束
    recommendedHabits: [],
    showRecommendation: false,
    endedHabits: [],
    showEndModal: false,
    endedHabit: null
  },

  onLoad () {
    this.initPage();
  },

  onShow () {
    this.checkFirstCheckinShortcut();
    this.checkJustCreatedHabit(); // P0-3: 检测刚创建的习惯
    this.loadTodayHabits();
  },

  onPullDownRefresh () {
    this.loadTodayHabits().then(() => {
      wx.stopPullDownRefresh();
    });
  },

  /**
   * 初始化页面
   */
  initPage () {
    // 设置日期显示
    this.setData({
      dateDisplay: dateUtil.getDateDisplay(),
      encouragementText: util.randomItem(constants.encouragementTexts)
    });
  },

  /**
   * 获取激励文案 - 根据完成情况动态选择
   */
  getEncouragementText () {
    const { completedCount, totalCount } = this.data;

    if (totalCount === 0) {
      return '今天，从小开始';
    } else if (completedCount === totalCount && totalCount > 0) {
      return '太棒了！今天已经完成了';
    } else if (completedCount > 0) {
      return `坚持下去，还有 ${totalCount - completedCount} 个微习惯等你！`;
    } else {
      return '加油！让我们开始今天的微习惯吧';
    }
  },

  /**
   * Phase 3新增: 加载推荐习惯
   */
  loadRecommendedHabits (userHabits = []) {
    const habitRecommend = require('../../utils/habitRecommend.js');
    const recommended = habitRecommend.recommendHabits(userHabits, 3);

    this.setData({
      recommendedHabits: recommended,
      showRecommendation: recommended.length > 0
    });
  },

  /**
   * Phase 3: 添加推荐的习惯
   */
  addRecommendedHabit (e) {
    const habit = e.currentTarget.dataset.habit;

    wx.navigateTo({
      url: `/pages/create-habit/create-habit?preset_name=${encodeURIComponent(habit.name)}&preset_trigger=&preset_category=${habit.category}`
    });
  },

  /**
   * 加载今日习惯 - 优化版（Day 3）
   * 简化数据处理，相信后端返回的计算结果
   */
  async loadTodayHabits () {
    this.setData({ loading: true, loadError: false });

    try {
      const res = await wx.cloud.callFunction({
        name: 'getTodayHabits'
      });

      if (res.result.code === 0) {
        const data = res.result.data || {};
        const { habits = [], ended_habits = [], completedCount = 0, totalCount = 0, progress = 0 } = data;

        // P0-2: 为每个习惯添加温暖文案（替代 Day X/Y）
        const processedHabits = habits.map(habit => {
          const daysPassed = habit.progressCurrent || 1;
          let warmText = '';

          if (daysPassed === 1 || daysPassed === 2) {
            warmText = '今天 · 已开始';
          } else if (daysPassed >= 3 && daysPassed <= 6) {
            warmText = '慢慢来';
          } else if (daysPassed >= 7) {
            warmText = '正在形成';
          }

          // 计算进度百分比
          const progressPercent = Math.round((habit.today_times / habit.target_times_per_day) * 100);

          return {
            ...habit,
            warmProgressText: warmText,
            progressPercent: progressPercent
          };
        });

        // 检查是否全部完成
        const allCompleted = totalCount > 0 && completedCount === totalCount;

        // P1-1: 生成被肯定的顶部文案
        let topStatusText = '';
        if (totalCount === 0) {
          topStatusText = '今天，从小开始';
        } else if (allCompleted) {
          topStatusText = '今天已经对自己交代了';
        } else if (completedCount > 0) {
          topStatusText = `今天，也完成得不错`;
        } else {
          topStatusText = '今天，准备好了吗';
        }

        this.setData({
          habits: processedHabits,
          endedHabits: ended_habits,
          completedCount: completedCount,
          totalCount: totalCount,
          progress: progress,
          topStatusText: topStatusText,
          loading: false,
          allCompleted: allCompleted,
          showCompletedAnimation: allCompleted
        });

        // 更新激励文案
        this.setData({
          encouragementText: this.getEncouragementText()
        });

        // 全部完成动画 3 秒后消失
        if (allCompleted) {
          setTimeout(() => {
            this.setData({ showCompletedAnimation: false });
          }, 3000);
        }

        // 首进策略：无习惯时自动拉起模板创建后直达首卡页（仅触发一次）
        try {
          const autoStarted = wx.getStorageSync('first_run_autostart_done');
          if (!autoStarted && habits.length === 0) {
            this.autoStartWithTemplate();
          }
        } catch (e) { }

        // 如果有结束的习惯，显示弹窗
        if (ended_habits && ended_habits.length > 0) {
          this.showEndedHabitModal(ended_habits[0]);
        }

        // 加载推荐习惯
        this.loadRecommendedHabits(habits);
      } else {
        throw new Error(res.result.message);
      }
    } catch (error) {
      console.error('加载今日习惯失败:', error);
      this.setData({ loading: false, loadError: true });
    }
  },

  /**
   * 自动以模板创建一个习惯并直达首卡页
   */
  async autoStartWithTemplate () {
    try {
      // 从模板库随机选择一个模板
      const db = wx.cloud.database();
      const { data: templates } = await db.collection('habit_templates').where({ is_active: true }).limit(10).get();
      const tpl = (templates && templates.length > 0) ? templates[Math.floor(Math.random() * templates.length)] : null;
      const name = tpl?.name || '喝一口水';
      const trigger = tpl?.default_trigger || '刷牙后';

      const res = await wx.cloud.callFunction({
        name: 'createHabit',
        data: { name, trigger, target_times_per_day: 1 }
      });

      if (res.result && res.result.code === 0) {
        const newHabitId = (res.result?.data?.user_habit_id) || (res.result?.data?.habit_id) || '';
        if (newHabitId) {
          wx.setStorageSync('first_run_autostart_done', true);
          wx.setStorageSync('pendingFirstCheckinHabitId', newHabitId);
          wx.setStorageSync('first_checkin_pending', true);
          wx.navigateTo({ url: `/pages/onboarding/first-checkin/first-checkin?habitId=${newHabitId}` });
        }
      }
    } catch (e) {
      console.error('autoStartWithTemplate failed:', e);
    }
  },

  /**
   * 打卡 - 优化版（Day 3）
   * 乐观更新 → 异步调用云函数 → 打卡成功跳首卡页
   */
  async handleCheckIn (e) {
    const { id, completed } = e.currentTarget.dataset;

    if (completed) {
      return;
    }

    // 防止重复点击
    if (this.data.checkingInId === id) {
      return;
    }

    this.setData({ checkingInId: id });

    try {
      // 乐观更新 UI（立即标记为完成）
      const updatedHabits = this.data.habits.map(habit => {
        if (habit._id === id) {
          return {
            ...habit,
            today_times: habit.today_times + 1,
            is_completed: habit.today_times + 1 >= habit.target_times_per_day
          };
        }
        return habit;
      });

      // 本地记录打卡习惯ID，供首卡页使用
      wx.setStorageSync('lastCheckinHabitId', id);

      // 立即更新 UI（200ms 内反馈）
      this.setData({ habits: updatedHabits });

      // 更新完成数
      const newCompletedCount = updatedHabits.filter(h => h.is_completed).length;
      this.setData({
        completedCount: newCompletedCount,
        encouragementText: this.getEncouragementText()
      });

      // P0-1: 添加情绪反馈（震动 + 浮层文案）
      wx.vibrateShort({ type: 'light' });
      const emotionText = util.randomItem(constants.checkInEmotionTexts);
      this.setData({
        showEmotionFeedback: true,
        emotionFeedbackText: emotionText
      });
      // 0.8s 后自动隐藏
      setTimeout(() => {
        this.setData({ showEmotionFeedback: false });
      }, 800);

      // 异步调用云函数（不等待立即返回）
      wx.cloud.callFunction({
        name: 'logHabit',
        data: {
          user_habit_id: id,
          isFirstCheckin: false,
          checkType: 'home_checkin'
        },
        success: (res) => {
          // 后端返回成功，跳首卡页显示反馈
          if (res.result && res.result.code === 0) {
            const data = res.result.data || {};
            wx.navigateTo({
              url: `/pages/onboarding/first-checkin/first-checkin?habitId=${id}&streak=${data.streak || 0}&feedbackTier=${data.feedbackTier || 'regular'}`
            });
          } else if (res.result && res.result.code === 1002) {
            // 已完成目标
            util.showToast('今日已完成目标次数');
          } else {
            // 其他错误
            util.showToast(res.result?.message || '打卡失败');
            // 回滚 UI
            this.loadTodayHabits();
          }
        },
        fail: (err) => {
          // 网络失败时，本地记录仍有效
          console.error('logHabit 网络错误:', err);
          util.showToast('网络异常，数据已保存');
          // 不回滚 UI，因为本地记录已生效
        }
      });
    } catch (error) {
      console.error('打卡异常:', error);
      util.showToast('操作异常');
      this.setData({ checkingInId: null });
    }
  },

  /**
   * 显示周期结束弹窗
   */
  async showEndedHabitModal (habit) {
    try {
      // 调用云函数获取习惯完成情况
      const res = await wx.cloud.callFunction({
        name: 'getHabitDetail',
        data: { user_habit_id: habit._id }
      });

      if (res.result.code === 0) {
        const { stats } = res.result.data;
        this.setData({
          showEndModal: true,
          endedHabit: {
            ...habit,
            completed_days: stats.completed_days,
            completion_rate: stats.completion_rate
          }
        });
      } else {
        // 如果获取失败，显示默认数据
        this.setData({
          showEndModal: true,
          endedHabit: {
            ...habit,
            completed_days: 0,
            completion_rate: 0
          }
        });
      }
    } catch (error) {
      console.error('获取习惯详情失败:', error);
      // 出错时仍显示弹窗，但使用默认数据
      this.setData({
        showEndModal: true,
        endedHabit: {
          ...habit,
          completed_days: 0,
          completion_rate: 0
        }
      });
    }
  },

  /**
   * 隐藏弹窗
   */
  hideEndModal () {
    this.setData({ showEndModal: false });
  },

  /**
   * 阻止冒泡
   */
  stopPropagation () { },

  /**
   * 继续新一轮
   */
  async continueHabit () {
    const habitId = this.data.endedHabit._id;

    try {
      util.showLoading('处理中...');

      const res = await wx.cloud.callFunction({
        name: 'updateHabitStatus',
        data: {
          user_habit_id: habitId,
          action: 'continue'
        }
      });

      util.hideLoading();

      if (res.result.code === 0) {
        util.showToast('已开启新一轮21天', 'success');
        this.hideEndModal();
        this.loadTodayHabits();
      } else {
        util.showToast(res.result.message);
      }
    } catch (error) {
      util.hideLoading();
      util.showToast('操作失败,请重试');
    }
  },

  /**
   * 调整习惯
   */
  adjustHabit () {
    const habitId = this.data.endedHabit._id;
    this.hideEndModal();
    wx.navigateTo({
      url: `/pages/create-habit/create-habit?id=${habitId}&mode=edit`
    });
  },

  /**
   * 暂停习惯
   */
  async pauseHabit () {
    const confirmed = await util.showConfirm(
      '确认暂停',
      '暂停后该习惯将不再显示在今日列表中'
    );

    if (!confirmed) {
      return;
    }

    const habitId = this.data.endedHabit._id;

    try {
      util.showLoading('处理中...');

      const res = await wx.cloud.callFunction({
        name: 'updateHabitStatus',
        data: {
          user_habit_id: habitId,
          action: 'pause'
        }
      });

      util.hideLoading();

      if (res.result.code === 0) {
        util.showToast('已暂停该习惯', 'success');
        this.hideEndModal();
        this.loadTodayHabits();
      } else {
        util.showToast(res.result.message);
      }
    } catch (error) {
      util.hideLoading();
      util.showToast('操作失败,请重试');
    }
  },

  /**
   * 前往习惯库
   */
  goToHabits () {
    wx.switchTab({
      url: '/pages/habits/habits'
    });
  },

  /**
   * 前往设置页面
   */
  goToSettings () {
    wx.navigateTo({
      url: '/pages/settings/settings'
    });
  },

  /**
   * 前往新建页面
   */
  goToCreate () {
    wx.navigateTo({
      url: '/pages/create-habit/create-habit'
    });
  },

  /**
   * 重试加载
   */
  retryLoadTodayHabits () {
    this.loadTodayHabits();
  },

  /**
   * 首次体验优化：从首页直接跳转首卡页（若存在待引导的首卡）
   */
  checkFirstCheckinShortcut () {
    try {
      const pending = wx.getStorageSync('first_checkin_pending');
      const done = wx.getStorageSync('first_checkin_done');
      const habitId = wx.getStorageSync('pendingFirstCheckinHabitId');
      if (pending && !done && habitId) {
        wx.navigateTo({
          url: `/pages/onboarding/first-checkin/first-checkin?habitId=${habitId}`
        });
      }
    } catch (e) { }
  },

  /**
   * 导航到设置页
   */
  goToSettings () {
    wx.navigateTo({
      url: '/pages/settings/settings'
    });
  },

  /**
   * 返回按钮(如果有上一页就返回，否则跳到习惯库)
   */
  goBack () {
    const pages = getCurrentPages();
    if (pages.length > 1) {
      wx.navigateBack();
    } else {
      this.goToHabits();
    }
  },

  /**
   * 显示更多选项
   */
  showMore () {
    wx.showActionSheet({
      itemList: ['设置', '关于', '反馈'],
      success: (res) => {
        if (res.tapIndex === 0) {
          this.goToSettings();
        } else if (res.tapIndex === 1) {
          wx.navigateTo({
            url: '/pages/about/about'
          });
        } else if (res.tapIndex === 2) {
          wx.navigateTo({
            url: '/pages/feedback/feedback'
          });
        }
      }
    });
  },

  /**
   * P0-3: 检测刚创建的习惯,显示温暖提示(一次性)
   */
  checkJustCreatedHabit () {
    try {
      const justCreated = wx.getStorageSync('just_created_habit');
      if (justCreated) {
        // 显示温暖提示
        this.setData({
          showJustCreatedHint: true,
          justCreatedHintText: '你刚刚为今天留了一件小事'
        });

        // 3秒后自动消失
        setTimeout(() => {
          this.setData({ showJustCreatedHint: false });
        }, 3000);

        // 清除标记(只显示一次)
        wx.removeStorageSync('just_created_habit');
      }
    } catch (e) { }
  },

  /**
   * 显示习惯长按菜单
   */
  showHabitMenu (e) {
    const habitId = e.currentTarget.dataset.id;
    this.setData({
      editingId: habitId,
      showMenuId: habitId
    });
  },

  /**
   * 卡片点击 - 关闭菜单
   */
  handleCardTap (e) {
    // 获取点击目标的习惯ID
    const habitId = e.currentTarget.dataset.id;

    // 如果点击的是编辑/删除按钮,不关闭菜单(让按钮自己的bindtap处理)
    if (e.target.className && e.target.className.includes('action-btn')) {
      return;
    }

    // 否则关闭菜单
    if (this.data.editingId) {
      this.setData({
        editingId: null,
        showMenuId: null
      });
    }
  },

  /**
   * 编辑习惯 - Phase 1改进版
   */
  editHabit (e) {
    const habitId = e.currentTarget.dataset.id;
    this.setData({
      editingId: null,
      showMenuId: null
    });
    // 改进: 导航到create-habit页面(编辑模式)
    wx.navigateTo({
      url: `/pages/create-habit/create-habit?id=${habitId}`
    });
  },

  /**
   * 删除习惯 - Phase 1改进版(二次确认+详细提示)
   */
  deleteHabit (e) {
    const habitId = e.currentTarget.dataset.id;
    const habit = this.data.habits.find(h => h._id === habitId);
    const habitName = habit?.name || '该习惯';

    // 改进: 更详细的提示和数据保留说明
    const completedDays = habit?.completed_days || 0;
    const totalDays = habit?.total_days || 21;

    wx.showModal({
      title: '确定要删除吗?',
      content: `删除"${habitName}"\n已进行${completedDays}/${totalDays}天\n\n数据将保存在「已完成」分区,无法恢复`,
      confirmText: '确认删除',
      cancelText: '取消',
      confirmColor: '#07C160',
      success: (res) => {
        if (res.confirm) {
          this.performDelete(habitId);
        } else {
          this.setData({
            editingId: null,
            showMenuId: null
          });
        }
      }
    });
  },

  /**
   * 执行删除操作 - Phase 1改进版
   */
  performDelete (habitId) {
    util.showLoading('删除中...');

    wx.cloud.callFunction({
      name: 'updateHabitStatus',
      data: {
        user_habit_id: habitId,  // 修正: 使用正确的参数名
        action: 'delete'         // 修正: 使用正确的action
      },
      success: (res) => {
        util.hideLoading();

        if (res.result.code === 0) {
          util.showToast('已删除习惯', 'success');
          this.setData({
            editingId: null,
            showMenuId: null
          });

          // 改进: 使用setTimeout确保UI更新完成后再刷新
          setTimeout(() => {
            this.loadTodayHabits();
          }, 500);
        } else {
          util.showToast(res.result.message || '删除失败,请重试');
        }
      },
      fail: (err) => {
        util.hideLoading();
        util.showToast('删除失败,请检查网络');
        console.error('删除习惯失败:', err);
      }
    });
  }
});
