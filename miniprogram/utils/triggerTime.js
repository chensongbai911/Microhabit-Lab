/**
 * 触发器时间映射工具
 * 将用户选择的触发器文案（如"刷牙后"）映射到具体的提醒时间
 * 用于驱动每日定时提醒功能
 */

const constants = require('./constants.js');

/**
 * 根据触发器获取推荐的提醒时间（HHMM格式）
 * @param {string} trigger - 触发器文案（如："刷牙后"、"午饭后"、"有空时"）
 * @returns {string} 推荐的提醒时间，格式：HH:MM
 */
function getTriggerReminderTime (trigger = '') {
  if (!trigger) {
    return '09:00'; // 默认上午9点
  }

  // 触发器到推荐提醒时间的映射表
  const triggerTimeMap = {
    // 晨间触发器
    '刷牙后': '07:30',
    '早餐后': '08:30',
    '出门前': '08:45',

    // 工作时间触发器
    '上班路上': '09:30',
    '到办公室后': '10:00',
    '午饭前': '12:15',
    '午饭后': '13:30',
    '下班前': '17:45',

    // 晚间触发器
    '下班到家后': '18:30',
    '晚餐后': '19:30',
    '睡前': '22:30',

    // 全天触发器
    '有空时': '09:00', // 默认上午9点
    '每个整点': '09:00', // 建议上午9点作为主要提醒
  };

  // 优先使用精确匹配
  if (triggerTimeMap[trigger]) {
    return triggerTimeMap[trigger];
  }

  // 如果是自定义触发器，通过关键词匹配分类
  return getTriggerTimeByCategory(trigger);
}

/**
 * 根据触发器文案推断分类并获取推荐时间
 * @param {string} trigger - 触发器文案
 * @returns {string} 推荐的提醒时间
 */
function getTriggerTimeByCategory (trigger = '') {
  const triggerLower = trigger.toLowerCase();

  // 晨间关键词
  if (['刷牙', '早餐', '出门', '早上', '早起', '起床', '洗脸', '梳头'].some(t => triggerLower.includes(t))) {
    return '07:30'; // 晨间推荐 07:30
  }

  // 工作/中午关键词
  if (['工作', '办公', '上班', '午饭', '中午', '路上', '午餐', '办公室'].some(t => triggerLower.includes(t))) {
    return '12:00'; // 中午推荐 12:00
  }

  // 晚间关键词
  if (['下班', '晚餐', '睡前', '晚上', '回家', '到家', '晚间', '夜间', '睡觉'].some(t => triggerLower.includes(t))) {
    return '19:00'; // 晚间推荐 19:00
  }

  // 默认
  return '09:00'; // 上午9点
}

/**
 * 获取触发器的时间范围（用于UI显示）
 * @param {string} trigger - 触发器文案
 * @returns {string} 时间范围，如 "07:00-08:00"
 */
function getTriggerTimeRange (trigger = '') {
  const { triggerOptions } = constants;

  // 遍历所有分类查找匹配的触发器
  for (const category in triggerOptions) {
    const triggers = triggerOptions[category];
    const matched = triggers.find(t => t.label === trigger || t.value === trigger);
    if (matched) {
      return matched.time;
    }
  }

  return '自己设定'; // 自定义触发器
}

/**
 * 获取触发器分类
 * @param {string} trigger - 触发器文案
 * @returns {string} 分类：'morning'|'work'|'evening'|'anytime'
 */
function getTriggerCategory (trigger = '') {
  if (!trigger) return 'anytime';

  const triggerLower = trigger.toLowerCase();

  // 晨间
  if (['刷牙', '早餐', '出门', '早上', '早起', '起床'].some(t => triggerLower.includes(t))) {
    return 'morning';
  }

  // 工作
  if (['工作', '办公', '上班', '午饭', '中午', '路上', '午餐'].some(t => triggerLower.includes(t))) {
    return 'work';
  }

  // 晚间
  if (['下班', '晚餐', '睡前', '晚上', '回家', '到家'].some(t => triggerLower.includes(t))) {
    return 'evening';
  }

  return 'anytime';
}

/**
 * 根据触发器生成习惯的提醒配置
 * @param {string} trigger - 触发器文案
 * @param {string} habitName - 习惯名称（可选）
 * @returns {object} 提醒配置对象
 */
function generateReminderConfig (trigger = '', habitName = '') {
  const reminderTime = getTriggerReminderTime(trigger);
  const timeRange = getTriggerTimeRange(trigger);
  const category = getTriggerCategory(trigger);

  return {
    enabled: true,
    time: reminderTime,        // 提醒时间 HH:MM
    timeRange: timeRange,      // 时间范围（用于显示）
    category: category,        // 触发器分类
    trigger: trigger,          // 原始触发器文案
    habitName: habitName,      // 关联的习惯名称
    createdAt: new Date().toISOString()
  };
}

module.exports = {
  getTriggerReminderTime,
  getTriggerTimeByCategory,
  getTriggerTimeRange,
  getTriggerCategory,
  generateReminderConfig
};
