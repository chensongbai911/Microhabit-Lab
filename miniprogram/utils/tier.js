// 计算反馈等级（Tier）
// 输入：连续天数 streakDays，是否从中断恢复 isRecovery
// 输出：'regular' | 'day3' | 'day7' | 'recovery'
function computeTier (streakDays, isRecovery) {
  if (isRecovery) return 'recovery';
  if (streakDays >= 7) return 'day7';
  if (streakDays >= 3) return 'day3';
  return 'regular';
}

module.exports = {
  computeTier
};
