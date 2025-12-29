/**
 * 编辑智能提示系统
 * 显示修改参数对完成率的影响
 */

/**
 * 计算修改对完成率的影响
 * @param {object} changes 修改的字段
 * @param {number} currentRate 当前完成率
 * @param {string} currentFrequency 当前频次
 * @return {object} 影响预测
 */
function predictImpact (changes, currentRate = 85, currentFrequency = 1) {
  const impacts = {
    frequencyImpact: null,
    triggerImpact: null,
    overallMessage: '',
    severity: 'info' // info | warning | danger
  };

  // 频次变化的影响
  if (changes.target_times_per_day !== undefined) {
    const newFrequency = changes.target_times_per_day;
    const frequencyChange = newFrequency - currentFrequency;

    if (frequencyChange > 0) {
      // 频次增加 - 完成率下降
      const rateDecrease = frequencyChange * 15; // 每增加1次,完成率下降15%
      impacts.frequencyImpact = {
        change: -rateDecrease,
        message: `频次增加${frequencyChange}倍,完成率可能↓${rateDecrease}%`,
        newRate: Math.max(currentRate - rateDecrease, 10),
        severity: frequencyChange >= 2 ? 'danger' : 'warning'
      };
    } else if (frequencyChange < 0) {
      // 频次减少 - 完成率上升
      const rateIncrease = Math.abs(frequencyChange) * 10;
      impacts.frequencyImpact = {
        change: rateIncrease,
        message: `频次减少${Math.abs(frequencyChange)}倍,完成率可能↑${rateIncrease}%`,
        newRate: Math.min(currentRate + rateIncrease, 100),
        severity: 'info'
      };
    }
  }

  // 触发器变化的影响
  if (changes.trigger !== undefined) {
    const triggerRates = {
      '刷牙后': 94,
      '早餐后': 92,
      '出门前': 88,
      '上班路上': 85,
      '到办公室后': 82,
      '午饭前': 78,
      '午饭后': 75,
      '下班前': 72,
      '下班到家后': 70,
      '晚餐后': 68,
      '睡前': 65,
      '有空时': 62,
      '每个整点': 60
    };

    const newTriggerRate = triggerRates[changes.trigger] || 75;
    const triggerChange = newTriggerRate - currentRate;

    impacts.triggerImpact = {
      newRate: newTriggerRate,
      change: triggerChange,
      message: triggerChange > 0
        ? `新触发器("${changes.trigger}")更容易完成,完成率可能↑${triggerChange}%`
        : triggerChange < 0
          ? `新触发器("${changes.trigger}")可能更难完成,完成率可能↓${Math.abs(triggerChange)}%`
          : `新触发器与现有水平相当`,
      severity: Math.abs(triggerChange) >= 15 ? 'warning' : 'info'
    };
  }

  // 计算总体影响
  const totalChange = (impacts.frequencyImpact?.change || 0) + (impacts.triggerImpact?.change || 0);
  impacts.overallChange = totalChange;
  impacts.overallMessage = totalChange > 0
    ? `综合来看,完成率可能↑${totalChange}%`
    : totalChange < 0
      ? `综合来看,完成率可能↓${Math.abs(totalChange)}%`
      : `修改对完成率影响不大`;

  // 根据严重程度确定总体 severity
  if (impacts.frequencyImpact?.severity === 'danger' || impacts.triggerImpact?.severity === 'danger') {
    impacts.severity = 'danger';
  } else if (impacts.frequencyImpact?.severity === 'warning' || impacts.triggerImpact?.severity === 'warning') {
    impacts.severity = 'warning';
  }

  return impacts;
}

/**
 * 获取影响警告的颜色
 * @param {string} severity
 * @return {object}
 */
function getImpactColor (severity = 'info') {
  const colors = {
    info: { bg: '#E0E7FF', text: '#667eea', icon: '💡' },
    warning: { bg: '#FEF3C7', text: '#D97706', icon: '⚠️' },
    danger: { bg: '#FEE2E2', text: '#DC2626', icon: '⛔' }
  };
  return colors[severity] || colors.info;
}

/**
 * 获取建议文案
 * @param {object} impacts 影响对象
 * @return {string}
 */
function getRecommendation (impacts) {
  if (impacts.severity === 'danger') {
    return '⚠️ 建议: 这个改变可能会大幅降低完成率,请谨慎调整';
  } else if (impacts.severity === 'warning') {
    return '💡 提示: 考虑更小幅度的改变,以保持完成率';
  } else if (impacts.overallChange > 0) {
    return '✓ 很好! 这个改变可能会提升完成率';
  } else {
    return '💡 修改不会对完成率产生显著影响';
  }
}

module.exports = {
  predictImpact,
  getImpactColor,
  getRecommendation
};
