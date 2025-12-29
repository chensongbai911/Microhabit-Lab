/**
 * 云函数API包装与返回字段标准化
 */

/**
 * 标准化 getHabitDetail 返回
 * 兼容不同命名: streakDays | streak_days | streak
 * 恢复标识: isRecovery | is_recovery
 */
async function getHabitDetailStd (habitId) {
  const res = await wx.cloud.callFunction({
    name: 'getHabitDetail',
    data: { habitId, user_habit_id: habitId }
  });

  const raw = res?.result || {};
  // 常见形态: result.data.habit 或 result.data 或直接 result
  const data = raw?.data?.habit || raw?.data || raw || {};

  const streakDays = (
    data.streakDays ?? data.streak_days ?? data.streak ?? data.completed_days ?? 0
  );
  const isRecovery = (
    (data.isRecovery ?? data.is_recovery ?? false) ? true : false
  );

  return { raw, detail: data, streakDays, isRecovery };
}

module.exports = {
  getHabitDetailStd
};
