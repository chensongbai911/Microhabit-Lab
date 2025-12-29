/**
 * 习惯推荐系统
 * 基于用户已有习惯推荐新习惯
 */

/**
 * 推荐的习惯模板库
 * 按触发器分类组织
 */
const habitTemplates = {
  morning: [
    { name: '晨跑', category: 'health', completionRate: 92, description: '早起锻炼身体' },
    { name: '冷水浴', category: 'health', completionRate: 85, description: '冰水刺激神经' },
    { name: '早读30分钟', category: 'study', completionRate: 88, description: '每天学习新知识' },
    { name: '打坐冥想', category: 'emotion', completionRate: 86, description: '安定心神开启一天' },
    { name: '喝温水', category: 'health', completionRate: 94, description: '清晨温水养胃' }
  ],
  work: [
    { name: '番茄工作法', category: 'efficiency', completionRate: 78, description: '25分钟专注工作' },
    { name: '站立办公', category: 'health', completionRate: 72, description: '每小时站立10分钟' },
    { name: '任务清单', category: 'efficiency', completionRate: 82, description: '每天列出3个重要任务' },
    { name: '深呼吸调整', category: 'emotion', completionRate: 75, description: '工作间隙深呼吸' },
    { name: '喝水补充', category: 'health', completionRate: 81, description: '每个小时喝一杯水' }
  ],
  evening: [
    { name: '瑜伽拉伸', category: 'health', completionRate: 75, description: '晚间放松肌肉' },
    { name: '睡前冥想', category: 'emotion', completionRate: 80, description: '10分钟平静身心' },
    { name: '日记反思', category: 'emotion', completionRate: 85, description: '记录今天的收获' },
    { name: '感恩练习', category: 'emotion', completionRate: 83, description: '写下3件感恩的事' },
    { name: '阅读放松', category: 'study', completionRate: 79, description: '睡前读书30分钟' }
  ]
};

/**
 * 习惯分类列表
 */
const habitCategories = [
  { value: 'health', label: '健康', icon: '💚' },
  { value: 'study', label: '学习', icon: '📚' },
  { value: 'emotion', label: '情绪', icon: '😊' },
  { value: 'efficiency', label: '效率', icon: '⚡' }
];

/**
 * 分析用户已有习惯的分类分布
 * @param {array} userHabits 用户的习惯列表
 * @return {object} 分类统计
 */
function analyzeHabitCategories (userHabits = []) {
  const categories = {};
  const triggers = {};

  userHabits.forEach(habit => {
    // 统计分类
    if (!categories[habit.category]) {
      categories[habit.category] = [];
    }
    categories[habit.category].push(habit.name);

    // 统计触发器分类 (morning/work/evening/anytime)
    // 根据触发器时间判断属于哪个时间段
    const triggerCategory = getTriggerCategory(habit.trigger);
    if (!triggers[triggerCategory]) {
      triggers[triggerCategory] = [];
    }
    triggers[triggerCategory].push(habit.name);
  });

  return { categories, triggers };
}

/**
 * 根据触发器文本判断时间分类
 * @param {string} trigger 触发器文本
 * @return {string} 时间分类
 */
function getTriggerCategory (trigger = '') {
  if (!trigger) return 'anytime';

  const trigger_ = trigger.toLowerCase();

  // 晨间
  if (['刷牙', '早餐', '出门', '早上', '早起', '起床'].some(t => trigger_.includes(t))) {
    return 'morning';
  }

  // 工作
  if (['工作', '办公', '上班', '午饭', '中午', '路上'].some(t => trigger_.includes(t))) {
    return 'work';
  }

  // 晚间
  if (['下班', '晚餐', '睡前', '晚上', '回家', '到家'].some(t => trigger_.includes(t))) {
    return 'evening';
  }

  return 'anytime';
}

/**
 * 推荐新习惯
 * 优先推荐用户缺失类别的习惯
 * @param {array} userHabits 用户已有习惯
 * @param {number} count 推荐数量
 * @return {array} 推荐的习惯列表
 */
function recommendHabits (userHabits = [], count = 3) {
  if (!userHabits || userHabits.length === 0) {
    // 新用户: 推荐热门习惯组合
    return getHotHabits(count);
  }

  const analysis = analyzeHabitCategories(userHabits);
  const recommendations = [];

  // 找出用户缺失最多的时间段
  const allTriggers = ['morning', 'work', 'evening'];
  const missingTriggers = allTriggers
    .sort((a, b) => {
      const aCount = (analysis.triggers[a] || []).length;
      const bCount = (analysis.triggers[b] || []).length;
      return aCount - bCount; // 缺少的多的排在前面
    })
    .slice(0, 2); // 缺失最多的2个时间段

  // 从缺失时间段中推荐习惯
  const usedNames = userHabits.map(h => h.name);

  missingTriggers.forEach(triggerCategory => {
    const candidates = habitTemplates[triggerCategory] || [];

    // 过滤出用户还没有的习惯
    const available = candidates.filter(h => !usedNames.includes(h.name));

    if (available.length > 0) {
      // 随机选择一个
      const habit = available[Math.floor(Math.random() * available.length)];
      recommendations.push({
        ...habit,
        triggerCategory,
        reason: `补充${getTriggerLabel(triggerCategory)}时间的习惯`
      });
    }
  });

  return recommendations.slice(0, count);
}

/**
 * 获取热门习惯(新用户推荐)
 * @param {number} count 数量
 * @return {array}
 */
function getHotHabits (count = 3) {
  const hotHabits = [];
  const allHabits = [
    ...habitTemplates.morning,
    ...habitTemplates.work,
    ...habitTemplates.evening
  ];

  // 按完成率排序,取top
  const sorted = allHabits
    .sort((a, b) => b.completionRate - a.completionRate)
    .slice(0, count);

  return sorted.map((h, i) => ({
    ...h,
    reason: `热门习惯 #${i + 1}`
  }));
}

/**
 * 获取时间段标签
 * @param {string} category
 * @return {string}
 */
function getTriggerLabel (category) {
  const labels = {
    morning: '晨间',
    work: '工作',
    evening: '晚间',
    anytime: '全天'
  };
  return labels[category] || '其他';
}

/**
 * 获取推荐理由
 * @param {object} recommendation 推荐项
 * @return {string}
 */
function getRecommendationReason (recommendation) {
  return recommendation.reason || '推荐给你';
}

/**
 * 检查习惯是否已存在
 * @param {string} habitName 习惯名称
 * @param {array} userHabits 用户已有习惯
 * @return {boolean}
 */
function habitExists (habitName, userHabits = []) {
  return userHabits.some(h => h.name === habitName);
}

module.exports = {
  habitTemplates,
  habitCategories,
  recommendHabits,
  getHotHabits,
  analyzeHabitCategories,
  getTriggerCategory,
  getTriggerLabel,
  getRecommendationReason,
  habitExists
};
