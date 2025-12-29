/**
 * 触发器推荐引擎
 * 根据习惯名称自动推荐最佳触发器分类
 */

/**
 * 关键词到分类的映射
 */
const recommendedMappings = {
  // 晨间习惯
  '早起': 'morning',
  '冷水浴': 'morning',
  '冷水': 'morning',
  '跑步': 'morning',
  '晨跑': 'morning',
  '打坐': 'morning',
  '冥想': 'morning',
  '瑜伽': 'morning',
  '拉伸': 'morning',
  '早读': 'morning',
  '阅读': 'morning',
  '刷牙': 'morning',
  '早餐': 'morning',
  '晨间': 'morning',
  '早上': 'morning',

  // 工作习惯
  '编程': 'work',
  '代码': 'work',
  '学习': 'work',
  '思考': 'work',
  '记笔记': 'work',
  '笔记': 'work',
  '工作': 'work',
  '复盘': 'work',
  '反思': 'work',
  '写作': 'work',
  '敲代码': 'work',
  '开会': 'work',
  '办公': 'work',

  // 晚间习惯
  '日记': 'evening',
  '睡眠': 'evening',
  '放松': 'evening',
  '晚间': 'evening',
  '睡前': 'evening',
  '晚上': 'evening',
  '晚餐': 'evening',

  // 全天习惯
  '喝水': 'anytime',
  '饮水': 'anytime',
  '步行': 'anytime',
  '散步': 'anytime',
  '站立': 'anytime',
  '休息': 'anytime',
  '伸展': 'anytime',
  '深呼吸': 'anytime',
  '呼吸': 'anytime'
};

/**
 * 根据习惯名称推荐触发器分类
 * @param {string} habitName 习惯名称
 * @return {string} 推荐的分类 'morning'|'work'|'evening'|'anytime'
 */
function recommendCategory (habitName) {
  if (!habitName || typeof habitName !== 'string') {
    return 'anytime';
  }

  const name = habitName.toLowerCase().trim();
  if (name.length === 0) return 'anytime';

  // 精确匹配关键词
  for (const [keyword, category] of Object.entries(recommendedMappings)) {
    if (name.includes(keyword)) {
      return Array.isArray(category) ? category[0] : category;
    }
  }

  // 默认返回全天
  return 'anytime';
}

/**
 * 根据分类获取该类别中的触发器选项
 * @param {string} category 分类 'morning'|'work'|'evening'|'anytime'
 * @param {object} triggerOptions 触发器选项对象(来自constants)
 * @return {array} 该分类的所有选项
 */
function getTriggersByCategory (category, triggerOptions) {
  if (!triggerOptions || typeof triggerOptions !== 'object') {
    return [];
  }

  return triggerOptions[category] || triggerOptions['anytime'] || [];
}

/**
 * 获取所有分类
 * @param {object} triggerCategories 分类定义(来自constants)
 * @return {array} 分类数组,按order排序
 */
function getAllCategories (triggerCategories) {
  if (!triggerCategories) {
    return [];
  }

  return Object.entries(triggerCategories)
    .map(([key, value]) => ({
      key,
      ...value
    }))
    .sort((a, b) => a.order - b.order);
}

/**
 * 获取推荐的完成率(根据触发器类别)
 * @param {string} category 分类
 * @return {number} 预期完成率百分比
 */
function getExpectedCompletionRate (category) {
  const rates = {
    morning: 90,   // 晨间习惯完成率最高
    work: 75,      // 工作时间较稳定
    evening: 70,   // 晚间容易变动
    anytime: 65    // 全天最容易遗漏
  };

  return rates[category] || 65;
}

module.exports = {
  recommendCategory,
  getTriggersByCategory,
  getAllCategories,
  getExpectedCompletionRate,
  recommendedMappings
};
